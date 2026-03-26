import { useState, useCallback } from 'react';
import ThreeScene from './ThreeScene';
import type { PlayAnimationFn, StopAnimationFn } from './ThreeScene';

// All VRMA animations available in /animations/
const ACTIONS = [
  { id: 'Angry',       label: 'Angry',       emoji: '😠' },
  { id: 'Blush',       label: 'Blush',       emoji: '😊' },
  { id: 'Clapping',    label: 'Clapping',    emoji: '👏' },
  { id: 'Goodbye',     label: 'Goodbye',     emoji: '👋' },
  { id: 'Jump',        label: 'Jump',        emoji: '🦘' },
  { id: 'LookAround',  label: 'Look Around', emoji: '👀' },
  { id: 'Relax',       label: 'Relax',       emoji: '😌' },
  { id: 'Sad',         label: 'Sad',         emoji: '😢' },
  { id: 'Sleepy',      label: 'Sleepy',      emoji: '😴' },
  { id: 'Surprised',   label: 'Surprised',   emoji: '😲' },
  { id: 'Thinking',    label: 'Thinking',    emoji: '🤔' },
] as const;

export default function App() {
  const [playAnimation, setPlayAnimation] = useState<PlayAnimationFn | null>(null);
  const [stopAnimation, setStopAnimation] = useState<StopAnimationFn | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleReady = useCallback((playFn: PlayAnimationFn, stopFn: StopAnimationFn) => {
    setPlayAnimation(() => playFn);
    setStopAnimation(() => stopFn);
    setReady(true);
  }, []);

  const handleAction = (id: string) => {
    if (!playAnimation) return;
    setActiveAction(id);
    playAnimation(`/animations/${id}.vrma`);
  };

  const handleCancelAction = () => {
    if (!stopAnimation) return;
    stopAnimation();
    setActiveAction(null);
  };

  return (
    <main className="container">
      <div className="scene-wrapper">
        <ThreeScene onReady={handleReady} />
      </div>

      {/* Title card */}
      <div className="card">
        <div className="icon">🎙️</div>
        <h1>Virtual Speaker</h1>
        <p className="subtitle">Your AI-powered presentation companion</p>
      </div>

      {/* Animation Control Panel */}
      <div className="action-panel">
        <div className="action-panel-header">
          <span className="action-panel-title">Actions</span>
          {!ready && <span className="action-panel-loading">Loading model…</span>}
        </div>
        
        <div className="action-grid">
          {ACTIONS.map(({ id, label, emoji }) => (
            <button
              key={id}
              id={`action-${id.toLowerCase()}`}
              className={`action-btn${activeAction === id ? ' active' : ''}${!ready ? ' disabled' : ''}`}
              onClick={() => handleAction(id)}
              disabled={!ready}
              title={label}
            >
              <span className="action-emoji">{emoji}</span>
              <span className="action-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Footer with cancel control */}
        <div className="action-panel-footer">
          <button
            className={`cancel-btn${!activeAction ? ' disabled' : ''}`}
            onClick={handleCancelAction}
            disabled={!activeAction}
          >
            <span>Stop Current Action</span>
          </button>
        </div>
      </div>
    </main>
  );
}
