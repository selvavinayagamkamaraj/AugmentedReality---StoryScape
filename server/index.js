import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'node:os';
import { SYSTEM_PROMPT, buildStoryPrompt, DEFAULT_DEMO_STORY } from './storyPrompt.js';
import { parseStory, normalizeStory, coverageProblems } from '../src/ai/semanticStory.ts';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';
app.use(cors()); app.use(express.json({ limit: '256kb' }));
let latestActiveStory = normalizeStory(DEFAULT_DEMO_STORY);
app.get('/api/network', (_req, res) => {
  const interfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses || []).filter(a => a.family === 'IPv4' && !a.internal).map(a => ({ name, address: a.address })));
  interfaces.sort((a, b) => Number(/virtual|vbox|vmware|ethernet 2/i.test(a.name)) - Number(/virtual|vbox|vmware|ethernet 2/i.test(b.name)));
  res.json({ address: process.env.PUBLIC_HOST || interfaces[0]?.address || 'localhost', addresses: interfaces.map(a => a.address) });
});
app.get('/api/health', async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (response.ok) {
      const data = await response.json();
      return res.json({ status: 'online', currentModel: DEFAULT_MODEL, availableModels: (data.models || []).map(m => m.name), backend: 'express', nlp: 'ollama' });
    }
  } catch { /* Offline generation remains available. */ }
  res.json({ status: 'offline', currentModel: DEFAULT_MODEL, backend: 'express', nlp: 'rules', message: 'Local model unavailable. Prompt-derived rule parser active.' });
});
app.get('/api/default-story', (_req, res) => res.json({ success: true, story: normalizeStory(DEFAULT_DEMO_STORY), source: 'fallback' }));
app.get('/api/active-story', (_req, res) => res.json({ success: true, story: latestActiveStory, source: latestActiveStory.nlpSource === 'ollama' ? 'ollama' : 'fallback' }));
app.post('/api/active-story', (req, res) => {
  if (!req.body?.story || !Array.isArray(req.body.story.scenes)) return res.status(400).json({ error: 'A story with scenes is required.' });
  latestActiveStory = normalizeStory(req.body.story);
  res.json({ success: true, story: latestActiveStory });
});
app.post('/api/generate-story', async (req, res) => {
  const { story: prompt, model = DEFAULT_MODEL } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) return res.status(400).json({ error: 'Enter 1–12,000 characters.' });
  if (typeof model !== 'string' || model.length > 120) return res.status(400).json({ error: 'Invalid model.' });
  try {
    let parsed;
    if (process.env.PYTHON_NLP_URL) {
      const response = await fetch(`${process.env.PYTHON_NLP_URL}/parse`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, system: SYSTEM_PROMPT }), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Python NLP unavailable');
      parsed = await response.json();
    } else {
      const response = await fetch(`${OLLAMA_HOST}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, system: SYSTEM_PROMPT, prompt: buildStoryPrompt(prompt), stream: false, format: 'json',
          options: { temperature: 0.2, num_predict: 4096 } }), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = await response.json();
      const raw = String(data.response || '').replace(/^```(?:json)?\s*|\s*```$/g, '');
      parsed = JSON.parse(raw);
    }
    if (!Array.isArray(parsed?.characters) || !parsed.characters.length || !Array.isArray(parsed?.scenes) || !parsed.scenes.length) throw new Error('Model returned an incomplete scene');
    const story = normalizeStory(parsed, prompt);
    const coverage = coverageProblems(story, prompt);
    if (coverage.length) throw new Error(`Model scene did not preserve the prompt: ${coverage.join('; ')}`);
    story.nlpSource = process.env.PYTHON_NLP_URL ? 'python/ollama' : 'ollama';
    // Preserve fallback-detected nouns that a model omitted instead of silently dropping them.
    const fallback = parseStory(prompt);
    const described = [...story.characters, ...(story.objects || [])].map(o => `${o.name} ${o.appearance}`.toLowerCase()).join(' ');
    for (const object of fallback.objects || []) {
      if (!described.includes(object.name.split(' ').at(-1))) {
        object.id = `retained_${object.id}`; story.objects.push(object);
        story.warnings.push(`Retained omitted noun: ${object.name}; review its placement.`);
      }
    }
    latestActiveStory = story;
    res.json({ success: true, story, source: 'ollama', modelUsed: model });
  } catch (error) {
    const story = parseStory(prompt); latestActiveStory = story;
    res.json({ success: true, story, source: 'fallback', warning: `Local inference unavailable (${error.message}). Using your prompt with approximate English parsing.` });
  }
});
app.listen(PORT, '0.0.0.0', () => console.log(`StoryAR API: http://localhost:${PORT}`));
