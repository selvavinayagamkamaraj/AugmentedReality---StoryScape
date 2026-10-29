import React from 'react';
import { Target, User, Table } from 'lucide-react';

interface PlacementGuideProps {
  onTap: (screenX?: number, screenY?: number) => void;
}

export const PlacementGuide: React.FC<PlacementGuideProps> = ({ onTap }) => {
  return (
    <div 
      className="placement-guide-overlay" 
      onClick={(e) => {
        onTap(e.clientX, e.clientY);
      }}
    >
      <div className="placement-card" onClick={(e) => e.stopPropagation()}>
        <div className="reticle-icon-wrapper">
          <Target size={44} className="text-sky-400 animate-spin-slow" />
          <div className="flex gap-1 absolute bottom-0">
            <User size={20} className="text-emerald-400" />
            <Table size={20} className="text-amber-400" />
          </div>
        </div>
        <h3 className="placement-title">Subject & Surface AR</h3>
        <p className="placement-subtitle">
          Point camera at a <strong>Person</strong> or <strong>Table</strong>. The characters will automatically augment onto them, or tap anywhere to place!
        </p>
        <button 
          className="placement-btn"
          onClick={(e) => {
            e.stopPropagation();
            onTap();
          }}
        >
          Place Characters Here
        </button>
      </div>
    </div>
  );
};
