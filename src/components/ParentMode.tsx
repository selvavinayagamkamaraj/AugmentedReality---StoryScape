import React, { useState, useEffect } from 'react';
import type { StoryData, OllamaHealthStatus } from '../types/story';
import { defaultStoryAI } from '../ai/OllamaStoryAI';
import QRCode from 'qrcode';
import { FALLBACK_DEMO_STORY } from '../ai/mockStoryAI';
import { normalizeStory, parseStory } from '../ai/semanticStory';
import { cacheValue } from '../storage/storyStore';
import { 
  Sparkles, 
  Smartphone, 
  Play, 
  Layers, 
  Users, 
  AlertCircle, 
  Wifi, 
  RefreshCw, 
  BookOpen, 
  ArrowRight,
  QrCode,
  Copy,
  Check,
  Camera
} from 'lucide-react';

interface ParentModeProps {
  onStartStory: (story: StoryData) => void;
  localIp: string;
}

const PRESET_STORIES = [
  {
    title: 'Orange Cat & Blue Bird (Spatial acceptance)',
    prompt: "A small orange cat walks across the floor, jumps onto the wooden table, sees a red apple, walks toward it, eats it and says 'This is delicious!' Then a blue bird flies into the room and sits on the chair."
  },
  {
    title: "Leo & The Friendly Alien (Default)",
    prompt: "A little astronaut named Leo discovers a friendly alien hiding behind a chair. Leo talks to the alien and helps him find his spaceship."
  },
  {
    title: "The Fluffy Bunny & The Magic Butterfly",
    prompt: "A fluffy white rabbit hops across the garden and meets a glowing magical butterfly who shows him where the sweet golden carrots grow."
  },
  {
    title: "Bleep the Robot Learns to Dance",
    prompt: "A shy robot named Bleep watches a playful puppy dance in the living room and joins in with funny robot moves."
  }
];

export const ParentMode: React.FC<ParentModeProps> = ({ onStartStory, localIp }) => {
  const [prompt, setPrompt] = useState<string>(PRESET_STORIES[0].prompt);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [generatedStory, setGeneratedStory] = useState<StoryData | null>(FALLBACK_DEMO_STORY);
  const [sourceUsed, setSourceUsed] = useState<'ollama' | 'fallback' | null>('fallback');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<OllamaHealthStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2:latest');
  const [showHandoverModal, setShowHandoverModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const address = new URL(window.location.href);
  if (['localhost', '127.0.0.1'].includes(address.hostname) && localIp) address.hostname = localIp;
  address.pathname = '/'; address.search = '?mode=child'; address.hash = '';
  const mobileUrl = address.toString();

  // Check Ollama health and load active story on mount
  useEffect(() => {
    void defaultStoryAI.checkHealth().then(status => { setHealthStatus(status); if (status.currentModel) setSelectedModel(status.currentModel); });
    // Check if there is already an active story on the server
    fetch('/api/active-story')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.story) {
          setGeneratedStory(normalizeStory(data.story));
          setSourceUsed(data.source === 'ollama' ? 'ollama' : 'fallback');
        }
      })
      .catch(() => {});
  }, []);

  // Timer for generation feedback
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isGenerating) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Generate QR code when handover modal is opened
  useEffect(() => {
    if (showHandoverModal) {
      QRCode.toDataURL(mobileUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Failed to generate QR:', err));
    }
  }, [showHandoverModal, mobileUrl]);

  const syncActiveStory = async (story: StoryData) => {
    void cacheValue('stories', 'active', story);
    try {
      await fetch('/api/active-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story })
      });
    } catch (e) {
      console.warn('Could not sync active story:', e);
    }
  };

  const handleGenerate = async (storyText?: string) => {
    const textToUse = storyText || prompt;
    if (!textToUse.trim()) return;

    setIsGenerating(true);
    setElapsedTime(0);
    setWarningMessage(null);

    try {
      const result = await defaultStoryAI.generateStory(textToUse, selectedModel);
      setGeneratedStory(result.story);
      setSourceUsed(result.source);
      await syncActiveStory(result.story);
      if (result.warning) {
        setWarningMessage(result.warning);
      }
    } catch (err: unknown) {
      console.error('Error generating story:', err);
      const fallback = parseStory(textToUse);
      setGeneratedStory(fallback);
      setSourceUsed('fallback');
      await syncActiveStory(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetSelect = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    const instant = parseStory(presetPrompt);
    setGeneratedStory(instant);
    setSourceUsed('fallback');
    void syncActiveStory(instant);
  };

  const handleInstantParse = () => {
    if (!prompt.trim()) return;
    const instant = parseStory(prompt.trim());
    setGeneratedStory(instant);
    setSourceUsed('fallback');
    void syncActiveStory(instant);
  };

  const getPreparedStory = (): StoryData => {
    if (prompt.trim() && (!generatedStory || generatedStory.originalPrompt !== prompt.trim())) {
      const fresh = parseStory(prompt.trim());
      void syncActiveStory(fresh);
      return fresh;
    }
    return generatedStory || parseStory(prompt.trim() || PRESET_STORIES[0].prompt);
  };

  const handleStartARClick = () => {
    const story = getPreparedStory();
    const isMobile = typeof window !== 'undefined' && (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768);
    if (isMobile) {
      onStartStory(story);
    } else {
      setShowHandoverModal(true);
    }
  };

  const handleConfirmHandover = () => {
    setShowHandoverModal(false);
    onStartStory(getPreparedStory());
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(mobileUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setWarningMessage('Clipboard unavailable. Select and copy the displayed link.'); }
  };

  return (
    <div className="parent-mode-layout">
      {/* Header */}
      <header className="parent-header">
        <div className="logo-brand">
          <div className="logo-badge">
            <Sparkles size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="brand-title">StoryAR</h1>
            <p className="brand-tagline">AI to Augmented Reality Storyteller for Kids</p>
          </div>
        </div>

        {/* Status & Network Badges */}
        <div className="header-badges">
          {healthStatus && (
            <div className={`status-pill ${healthStatus.status === 'online' ? 'online' : 'offline'}`}>
              <span className="dot" />
              <span>Ollama: {healthStatus.status === 'online' ? healthStatus.currentModel : 'Fallback Engine'}</span>
            </div>
          )}

          {localIp && (
            <div className="wifi-pill" title="Open this URL on your phone's browser!">
              <Wifi size={14} className="text-emerald-400 inline mr-1" />
              <span>{mobileUrl}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="parent-main">
        {/* Quick Launch Banner */}
        <div className="quick-launch-banner">
          <div className="flex items-center gap-3">
            <div className="quick-camera-icon">
              <Camera size={24} />
            </div>
            <div>
              <h3 className="quick-title">AR Room Experience Ready</h3>
              <p className="quick-subtitle">"{generatedStory?.title || 'Leo & The Friendly Alien'}"</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onStartStory(getPreparedStory())}
              className="start-camera-now-btn"
            >
              <span>Open AR / 3D Scene</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setShowHandoverModal(true)}
              className="secondary-btn"
              title="Pair with Mobile Device via QR Code"
            >
              <QrCode size={18} />
              <span>Mobile QR</span>
            </button>
          </div>
        </div>

        {/* Story Input Card */}
        <div className="card story-input-card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-sky-400" />
              <h2 className="card-title">Tell me your story...</h2>
            </div>
            {healthStatus?.availableModels && healthStatus.availableModels.length > 1 && (
              <div className="model-selector-wrapper">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-select"
                >
                  {healthStatus.availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type or paste any story here... e.g. A brave little astronaut meets a friendly alien!"
            rows={4}
            className="story-textarea"
            disabled={isGenerating}
          />

          {/* Quick presets */}
          <div className="presets-wrapper">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Prompts:</span>
            <div className="preset-chips">
              {PRESET_STORIES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePresetSelect(p.prompt)}
                  className="preset-chip"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="generate-action-bar flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="primary-btn generate-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Converting Story with AI ({elapsedTime}s)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Create Story with AI</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleInstantParse}
              disabled={isGenerating || !prompt.trim()}
              className="secondary-btn"
              title="Instantly parse into 3D spatial scenes using local engine (0ms delay)"
            >
              <Check size={18} className="text-emerald-400" />
              <span>Instant Create (0ms)</span>
            </button>
          </div>

          {warningMessage && (
            <div className="warning-notice">
              <AlertCircle size={16} />
              <span>{warningMessage}</span>
            </div>
          )}
        </div>

        {/* Story Generated Result */}
        {generatedStory && (
          <div className="card generated-story-card animate-fade-in">
            <div className="card-header border-b border-slate-700/60 pb-3">
              <div>
                <span className="source-tag">
                  {sourceUsed === 'ollama' ? 'Generated by Ollama Local AI' : 'Demo Fallback Engine'}
                </span>
                <h2 className="story-result-title">{generatedStory.title}</h2>
                <p className="story-result-summary">{generatedStory.summary}</p>
              </div>

              {/* Characters & Scenes Badges */}
              <div className="stats-badges">
                <div className="stat-pill">
                  <Users size={16} className="text-sky-400" />
                  <span>Characters: <strong>{generatedStory.characters.length}</strong></span>
                </div>
                <div className="stat-pill">
                  <Layers size={16} className="text-purple-400" />
                  <span>Scenes: <strong>{generatedStory.scenes.length}</strong></span>
                </div>
              </div>
            </div>

            {/* Characters Preview Grid */}
            <div className="section-block">
              <h3 className="section-label">Cast of Characters</h3>
              <div className="characters-preview-grid">
                {generatedStory.characters.map((char) => (
                  <div key={char.id} className="character-preview-card">
                    <div 
                      className="character-avatar-dot"
                      style={{ backgroundColor: char.color || '#38bdf8' }}
                    />
                    <div className="character-info">
                      <h4 className="char-name">{char.name}</h4>
                      <div className="char-meta">
                        <span className="type-badge">{char.type}</span>
                        <span className="char-desc">{char.appearance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!!generatedStory.objects?.length && <div className="section-block">
              <h3 className="section-label">Separate story objects</h3>
              {generatedStory.objects.map(object => <p key={object.id} className="scene-narration">
                {object.name} · {object.scale ? `${object.scale} m` : 'approximate size'} · {object.surfaceAnchor || 'floor'}
                {object.placeholder ? ' · labelled placeholder' : ''}
              </p>)}
            </div>}
            {!!generatedStory.warnings?.length && <details className="section-block">
              <summary>Interpretation notes</summary>{generatedStory.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </details>}
            {/* Scenes Timeline Preview */}
            <div className="section-block">
              <h3 className="section-label">Scene Timeline</h3>
              <div className="scenes-preview-list">
                {generatedStory.scenes.map((scene, idx) => (
                  <div key={idx} className="scene-preview-row">
                    <div className="scene-number-circle">{scene.scene_number || idx + 1}</div>
                    <div className="scene-details">
                      <div className="flex justify-between items-center">
                        <h4 className="scene-title">{scene.title}</h4>
                        <span className="scene-duration">{scene.duration}s</span>
                      </div>
                      {scene.narration && (
                        <p className="scene-narration">"{scene.narration}"</p>
                      )}
                      {scene.dialogue && scene.dialogue.length > 0 && (
                        <div className="scene-dialogue-chips">
                          {scene.dialogue.map((d, dIdx) => (
                            <span key={dIdx} className="dialogue-chip">
                              🗣️ "{d.text}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start AR Action */}
            <div className="start-ar-section">
              <button
                onClick={handleStartARClick}
                className="start-ar-btn"
              >
                <Play size={24} />
                <span>Start AR Story</span>
                <ArrowRight size={20} className="ml-auto" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Handover & Mobile QR Modal */}
      {showHandoverModal && (
        <div className="modal-backdrop" onClick={() => setShowHandoverModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper">
              <Smartphone size={44} className="text-sky-400 animate-bounce" />
            </div>
            <h2 className="modal-title">Open AR on Your Phone!</h2>
            <p className="modal-description">
              Scan this QR code with your phone's camera to launch <strong>"{generatedStory?.title}"</strong> directly in mobile AR:
            </p>

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="qr-code-container my-3 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                  <img src={qrCodeDataUrl} alt="Scan to open on phone" className="w-48 h-48 block" />
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  <QrCode size={14} className="text-sky-400" />
                  <span>Scan with Phone Camera (Same Wi-Fi)</span>
                </div>
              </div>
            )}

            {/* Direct Link */}
            <div className="mobile-link-box my-3 p-2 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
              <span className="font-mono text-sky-300 truncate max-w-[280px]">{mobileUrl}</span>
              <button 
                onClick={handleCopyLink} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                title="Copy link"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="modal-actions mt-4 flex flex-col gap-2">
              <button 
                onClick={handleConfirmHandover}
                className="secondary-btn w-full py-2.5 text-sm"
              >
                Or Play on this Computer (Webcam)
              </button>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 mt-1 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


