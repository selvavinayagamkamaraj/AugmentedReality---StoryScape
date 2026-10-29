import type { StoryData, OllamaHealthStatus } from '../types/story';
import type { StoryAI } from './StoryAI';
import { FALLBACK_DEMO_STORY } from './mockStoryAI';
import { normalizeStory, parseStory } from './semanticStory';

export class OllamaStoryAI implements StoryAI {
  private apiBase: string;

  constructor(apiBase: string = '') {
    this.apiBase = apiBase;
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    try {
      const res = await fetch(`${this.apiBase}/api/health`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // API or Ollama unreachable
    }

    return {
      status: 'offline',
      ollamaHost: 'http://localhost:11434',
      currentModel: 'llama3.2:latest',
      message: 'Local Ollama API is not reachable. Using fallback story engine.'
    };
  }

  async getDefaultDemoStory(): Promise<StoryData> {
    try {
      const res = await fetch(`${this.apiBase}/api/default-story`);
      if (res.ok) {
        const data = await res.json();
        if (data.story) return data.story;
      }
    } catch {
      // Network failure, use embedded fallback
    }
    return FALLBACK_DEMO_STORY;
  }

  async generateStory(prompt: string, model?: string): Promise<{
    story: StoryData;
    source: 'ollama' | 'fallback';
    warning?: string;
  }> {
    try {
      const res = await fetch(`${this.apiBase}/api/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: prompt, model }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success && data.story) {
        return {
          story: normalizeStory(data.story, prompt),
          source: data.source || 'ollama',
          warning: data.warning
        };
      }
    } catch (err: unknown) {
      console.warn('Ollama API generation failed, falling back:', err);
      return {
        story: parseStory(prompt),
        source: 'fallback',
        warning: `AI generation note: ${(err as Error)?.message || 'Timeout'}. Loaded responsive fallback.`
      };
    }

    return {
      story: parseStory(prompt),
      source: 'fallback'
    };
  }
}

export const defaultStoryAI = new OllamaStoryAI();
