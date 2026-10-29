import type { CharacterType, VoiceProfile } from '../types/story';
export interface SpeechCallbacks { onStart?: () => void; onEnd?: () => void; onError?: (err: unknown) => void; }
/** One cancellable voice channel, stable voice assignment per character. */
export class VoiceManager {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  private profiles = new Map<string, VoiceProfile>();
  private assigned = new Map<string, SpeechSynthesisVoice>();
  private active: SpeechSynthesisUtterance | null = null;
  private callbacks: SpeechCallbacks | null = null;
  private remaining = 0;
  private paused = false;
  private muted = false;
  private token = 0;
  getOrCreateVoiceProfile(id: string, type: CharacterType | 'narrator'): VoiceProfile {
    let profile = this.profiles.get(id);
    if (!profile) {
      const pitch = ({ cat: 1.55, bird: 1.75, robot: 0.75, dragon: 0.7, alien: 1.6, rabbit: 1.4 } as Record<string, number>)[type]
        || (/wizard/i.test(id) ? 0.7 : 1);
      profile = { gender: type === 'narrator' ? 'female' : 'creature', pitch, speed: type === 'bird' ? 1.15 : 0.98 };
      this.profiles.set(id, profile);
    }
    return profile;
  }
  registerCustomVoice(id: string, profile: VoiceProfile) { this.profiles.set(id, profile); }
  unlockAudio() {
    if (this.synth) {
      try {
        this.synth.resume();
      } catch {
        // ignore
      }
    }
  }
  speak(text: string, id: string, type: CharacterType | 'narrator', callbacks: SpeechCallbacks = {}) {
    this.stop(); this.paused = false; this.callbacks = callbacks;
    this.remaining = Math.max(2, text.length * 0.065);
    const token = this.token;
    callbacks.onStart?.();
    if (!this.synth || this.muted || typeof SpeechSynthesisUtterance === 'undefined') return;
    const profile = this.getOrCreateVoiceProfile(id, type);
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.synth.getVoices();
    if (!this.assigned.has(id) && voices.length) {
      const preferred = voices.find(v => v.name === profile.preferredVoice) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      this.assigned.set(id, preferred);
    }
    utterance.voice = this.assigned.get(id) || null;
    utterance.pitch = profile.pitch; utterance.rate = profile.speed;
    this.active = utterance;
    // Watchdog also handles browsers that never dispatch speech end/error.
    this.remaining = Math.max(8, text.length * 0.16);
    utterance.onend = () => { if (token === this.token) this.finish(); };
    utterance.onerror = error => {
      if (token !== this.token) return;
      this.active = null; this.remaining = Math.max(2, text.length * 0.065); callbacks.onError?.(error);
    };
    try { this.synth.speak(utterance); } catch { this.active = null; this.remaining = Math.max(2, text.length * 0.065); }
  }
  update(delta: number) {
    if (!this.callbacks || this.paused) return;
    this.remaining -= delta; if (this.remaining <= 0) this.finish();
  }
  private finish() {
    const callbacks = this.callbacks; this.stop(); callbacks?.onEnd?.();
  }
  stop() {
    this.token++;
    if (this.active) { this.active.onend = null; this.active.onerror = null; }
    this.active = null; this.callbacks = null; this.remaining = 0; this.synth?.cancel();
  }
  pause() { this.paused = true; this.synth?.pause(); }
  resume() { this.paused = false; this.synth?.resume(); }
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.active) {
      this.active.onend = null; this.active.onerror = null; this.active = null; this.synth?.cancel();
      this.remaining = Math.min(this.remaining, 3);
    }
    return this.muted;
  }
  getMuted() { return this.muted; }
  isSpeaking() { return this.callbacks !== null; }
  dispose() { this.stop(); this.assigned.clear(); }
}
