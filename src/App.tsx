import { useState, useEffect, lazy, Suspense } from 'react';
import type { StoryData } from './types/story';
import { FALLBACK_DEMO_STORY } from './ai/mockStoryAI';
import { ParentMode } from './components/ParentMode';
import { normalizeStory } from './ai/semanticStory';
import { cacheValue } from './storage/storyStore';
const ChildMode = lazy(() => import('./components/ChildMode').then(module => ({ default: module.ChildMode })));
import './App.css';

export function App() {
  const [mode, setMode] = useState<'parent' | 'child'>('parent');
  const [activeStory, setActiveStory] = useState<StoryData>(FALLBACK_DEMO_STORY);
  const [localIp, setLocalIp] = useState<string>('');

  useEffect(() => {
    fetch('/api/network').then(r => r.json()).then(data => setLocalIp(data.address || window.location.hostname)).catch(() => setLocalIp(window.location.hostname));

    const params = new URLSearchParams(window.location.search);
    const requestedMode = location.pathname === '/debug' ? 'child' : params.get('mode');

    // Fetch active story from server
    fetch('/api/active-story')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.story) {
          setActiveStory(normalizeStory(data.story));
          void cacheValue('stories', 'active', data.story);
          if (requestedMode === 'child') {
            setMode('child');
          }
        }
      })
      .catch(async () => {
        const cached = await cacheValue('stories', 'active');
        if (cached) setActiveStory(normalizeStory(cached));
        if (requestedMode === 'child') {
          setMode('child');
        }
      });
  }, []);

  const handleStartStory = (story: StoryData) => {
    const normalized = normalizeStory(story);
    setActiveStory(normalized);
    void cacheValue('stories', 'active', normalized);
    setMode('child');
  };

  const handleExitChildMode = () => {
    setMode('parent');
  };

  return (
    <div className="storyar-app">
      {mode === 'parent' ? (
        <ParentMode 
          onStartStory={handleStartStory} 
          localIp={localIp}
        />
      ) : (
        <Suspense fallback={<p>Loading spatial player...</p>}><ChildMode 
          story={activeStory} 
          onExit={handleExitChildMode} 
        /></Suspense>
      )}
    </div>
  );
}

export default App;


