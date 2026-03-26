// virtual-speaker-web\apps\web\src\App.tsx

import { useState, useCallback } from 'react';
import ThreeScene from './ThreeScene';
import type { PlayAnimationFn, StopAnimationFn, FocusCameraFn, SpeakFn } from './ThreeScene';

// All VRMA animations available in /animations/
const ACTIONS = [
  { id: 'Angry', label: 'Angry', emoji: '😠' },
  { id: 'Blush', label: 'Blush', emoji: '😊' },
  { id: 'Clapping', label: 'Clapping', emoji: '👏' },
  { id: 'Goodbye', label: 'Goodbye', emoji: '👋' },
  { id: 'Jump', label: 'Jump', emoji: '🦘' },
  { id: 'LookAround', label: 'Look Around', emoji: '👀' },
  { id: 'Relax', label: 'Relax', emoji: '😌' },
  { id: 'Sad', label: 'Sad', emoji: '😢' },
  { id: 'Sleepy', label: 'Sleepy', emoji: '😴' },
  { id: 'Surprised', label: 'Surprised', emoji: '😲' },
  { id: 'Thinking', label: 'Thinking', emoji: '🤔' },
] as const;

export default function App() {
  const [playAnimation, setPlayAnimation] = useState<PlayAnimationFn | null>(null);
  const [stopAnimation, setStopAnimation] = useState<StopAnimationFn | null>(null);

  // State cho Camera và Âm thanh
  const [focusCamera, setFocusCamera] = useState<FocusCameraFn | null>(null);
  const [speak, setSpeak] = useState<SpeakFn | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState("Xin chào! Tôi là trợ lý ảo của bạn.");

  // State cho việc chọn giọng đọc
  const [selectedVoice, setSelectedVoice] = useState('banmai');
  const FPT_VOICES = [
    { id: 'banmai', name: 'Ban Mai (Nữ Bắc)' },
    { id: 'thuminh', name: 'Thu Minh (Nữ Bắc)' },
    { id: 'leminh', name: 'Lê Minh (Nam Bắc)' },
    { id: 'giahuy', name: 'Gia Huy (Nam Trung)' },
    { id: 'myan', name: 'Mỹ An (Nữ Trung)' },
    { id: 'lannhi', name: 'Lan Nhi (Nữ Nam)' }
  ];

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(
    (playFn: PlayAnimationFn, stopFn: StopAnimationFn, focusFn: FocusCameraFn, speakFn: SpeakFn) => {
      setPlayAnimation(() => playFn);
      setStopAnimation(() => stopFn);
      setFocusCamera(() => focusFn);
      setSpeak(() => speakFn);
      setReady(true);
    },
    []
  );

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

  // ── Xử lý Thu/Phóng Camera ───────────────────────────────────────────────
  const handleToggleFocus = () => {
    if (!focusCamera) return;
    const newFocusState = !isFocused;
    setIsFocused(newFocusState);
    focusCamera(newFocusState);
  };

  // ── Xử lý Phát âm thanh ──────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!speak) return;
    speak(textToSpeak, selectedVoice); // Truyền text và giọng đọc đã chọn
  };

  return (
    <main className="container">
      <div className="scene-wrapper">
        <ThreeScene onReady={handleReady} />
      </div>

      <div className="card">
        <div className="icon">🎙️</div>
        <h1>Virtual Speaker</h1>
        <p className="subtitle">Your AI-powered presentation companion</p>
      </div>

      <div className="action-panel">

        {/* ── Khu vực Giao tiếp (Text-to-Speech) ────────────────────────────── */}
        <div className="action-panel-header" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
          <span className="action-panel-title">Giao tiếp</span>
          {!ready && <span className="action-panel-loading">Loading model…</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

          {/* Ô chọn giọng đọc */}
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={!ready}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              cursor: ready ? 'pointer' : 'not-allowed',
              backgroundColor: 'white'
            }}
          >
            {FPT_VOICES.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>

          {/* Ô nhập văn bản */}
          <input
            type="text"
            value={textToSpeak}
            onChange={(e) => setTextToSpeak(e.target.value)}
            disabled={!ready}
            placeholder="Nhập câu bạn muốn nói..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc'
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleToggleFocus}
              disabled={!ready}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: isFocused ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: ready ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              {isFocused ? "Lùi Camera" : "Phóng to Camera"}
            </button>

            <button
              onClick={handleSpeak}
              disabled={!ready}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: ready ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              Nói
            </button>
          </div>
        </div>
        {/* ──────────────────────────────────────────────────────────────────── */}

        <div className="action-panel-header">
          <span className="action-panel-title">Actions</span>
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