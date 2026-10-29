import type { StoryData, OllamaHealthStatus } from '../types/story';

export interface StoryAI {
  /**
   * Generates a structured story from a parent's text input.
   */
  generateStory(prompt: string, model?: string): Promise<{
    story: StoryData;
    source: 'ollama' | 'fallback';
    warning?: string;
  }>;

  /**
   * Checks the health and connection status of the AI provider.
   */
  checkHealth(): Promise<OllamaHealthStatus>;

  /**
   * Returns the default ready-to-run demo story.
   */
  getDefaultDemoStory(): Promise<StoryData>;
}
