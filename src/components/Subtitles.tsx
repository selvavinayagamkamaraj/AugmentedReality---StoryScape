import React from 'react';

interface SubtitlesProps {
  subtitle: {
    speaker: string;
    text: string;
    characterId?: string;
    isDialogue: boolean;
  } | null;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ subtitle }) => {
  if (!subtitle || !subtitle.text) return null;

  return (
    <div className="subtitles-container">
      <div className={`subtitle-line ${subtitle.isDialogue ? 'dialogue' : 'narration'}`}>
        <span className="subtitle-speaker">{subtitle.speaker}:</span>
        <span className="subtitle-text">{subtitle.text}</span>
      </div>
    </div>
  );
};

