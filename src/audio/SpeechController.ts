import type { CharacterType } from '../types/story';

export interface SpeechEventCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export class SpeechController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isAvailable: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private isMuted: boolean = false;

  public isSpeakingNow(): boolean {
    return this.currentUtterance !== null;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isAvailable = true;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  public speak(
    text: string,
    characterType?: CharacterType | 'narrator',
    callbacks?: SpeechEventCallbacks
  ) {
    if (!this.isAvailable || !this.synth || this.isMuted) {
      // Fallback: simulate speech timing via timeout so subtitles stay visible for reading
      const readingDurationMs = Math.max(2500, text.length * 70);
      callbacks?.onStart?.();
      setTimeout(() => {
        callbacks?.onEnd?.();
      }, readingDurationMs);
      return;
    }

    // Cancel any active utterance
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Pitch and rate customization per character type
    switch (characterType) {
      case 'alien':
        utterance.pitch = 1.6;
        utterance.rate = 1.1;
        break;
      case 'robot':
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
        break;
      case 'rabbit':
      case 'cat':
      case 'butterfly':
        utterance.pitch = 1.35;
        utterance.rate = 1.05;
        break;
      case 'dog':
        utterance.pitch = 0.9;
        utterance.rate = 1.0;
        break;
      case 'human':
        utterance.pitch = 1.15;
        utterance.rate = 1.0;
        break;
      case 'narrator':
      default:
        utterance.pitch = 1.0;
        utterance.rate = 0.95;
        break;
    }

    // Pick an expressive English voice if available
    if (this.voices.length > 0) {
      const preferred = this.voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferred) {
        utterance.voice = preferred;
      }
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtterance = null;
      callbacks?.onError?.();
      callbacks?.onEnd?.();
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Failed to invoke synth.speak:', e);
      callbacks?.onEnd?.();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
