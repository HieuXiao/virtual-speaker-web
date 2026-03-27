import { useState, useCallback, useEffect, useRef } from 'react';
import ThreeScene from './ThreeScene';
import type { PlayAnimationFn, StopAnimationFn, FocusCameraFn, SpeakFn } from './ThreeScene';

// Models available in /models/
const MODELS = [
  { id: 'model', name: 'Mặc định', path: '/models/model.vrm', icon: '👤' },
  { id: 'boyGlass', name: 'Boy Glass', path: '/models/boyGlass.vrm', icon: '🕶️' },
  { id: 'lady', name: 'Lady', path: '/models/lady.vrm', icon: '💃' },
  { id: 'mewMew', name: 'Mew Mew', path: '/models/mewMew.vrm', icon: '🐱' },
];

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
    { id: 'banmai', name: 'Ban Mai (Nữ Bắc)', short: 'BM' },
    { id: 'thuminh', name: 'Thu Minh (Nữ Bắc)', short: 'TM' },
    { id: 'leminh', name: 'Lê Minh (Nam Bắc)', short: 'LM' },
    { id: 'giahuy', name: 'Gia Huy (Nam Trung)', short: 'GH' },
    { id: 'myan', name: 'Mỹ An (Nữ Trung)', short: 'MA' },
    { id: 'lannhi', name: 'Lan Nhi (Nữ Nam)', short: 'LN' }
  ];

  // State cho việc chọn nhân vật
  const [selectedModel, setSelectedModel] = useState(MODELS[0].path);

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ── UI States for Redesign ──────────────────────────────────────────────
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isEmotionPickerOpen, setIsEmotionPickerOpen] = useState(false);
  
  const voicePickerRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const emotionPickerRef = useRef<HTMLDivElement>(null);

  // Click outside logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (voicePickerRef.current && !voicePickerRef.current.contains(event.target as Node)) {
        setIsVoicePickerOpen(false);
      }
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setIsModelPickerOpen(false);
      }
      if (emotionPickerRef.current && !emotionPickerRef.current.contains(event.target as Node)) {
        setIsEmotionPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setIsEmotionPickerOpen(false); // Close drawer after selection
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
    if (!speak || !textToSpeak.trim()) return;
    speak(textToSpeak, selectedVoice);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSpeak();
    }
  };

  const currentVoiceShort = FPT_VOICES.find(v => v.id === selectedVoice)?.short || 'VN';
  const currentModelIcon = MODELS.find(m => m.path === selectedModel)?.icon || '👤';

  return (
    <main className="container">
      <div className="scene-wrapper">
        <ThreeScene onReady={handleReady} modelUrl={selectedModel} />
      </div>

      <button 
        className={`camera-fab${isFocused ? ' active' : ''}`}
        onClick={handleToggleFocus}
        disabled={!ready}
        title={isFocused ? "Lùi Camera" : "Phóng to Camera"}
      >
        {isFocused ? "🔍-" : "🔍+"}
      </button>

      <div className="input-bar-container">
        <div className="input-pill">
          {/* Voice Selector */}
          <div className="voice-selector-wrapper" ref={voicePickerRef}>
            <button 
              className="voice-btn-trigger"
              onClick={() => setIsVoicePickerOpen(!isVoicePickerOpen)}
              disabled={!ready}
              title="Chọn giọng nói"
            >
              {currentVoiceShort}
            </button>
            
            {isVoicePickerOpen && (
              <div className="voice-popover">
                {FPT_VOICES.map(voice => (
                  <button
                    key={voice.id}
                    className={`voice-option${selectedVoice === voice.id ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      setIsVoicePickerOpen(false);
                    }}
                  >
                    {voice.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Model Selector */}
          <div className="voice-selector-wrapper" ref={modelPickerRef}>
            <button 
              className="voice-btn-trigger"
              onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
              disabled={!ready}
              title="Chọn nhân vật"
            >
              {currentModelIcon}
            </button>
            
            {isModelPickerOpen && (
              <div className="voice-popover">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    className={`voice-option${selectedModel === model.path ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedModel(model.path);
                      setIsModelPickerOpen(false);
                      setReady(false); // Reset ready state while loading new model
                    }}
                  >
                    {model.icon} {model.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            className="pill-input"
            value={textToSpeak}
            onChange={(e) => setTextToSpeak(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!ready}
            placeholder={ready ? "Nhập văn bản..." : "Đang tải..."}
          />

          {/* Action Buttons */}
          <div className="pill-actions">
            <div style={{ position: 'relative' }} ref={emotionPickerRef}>
              <button 
                className={`icon-btn${isEmotionPickerOpen ? ' active' : ''}`}
                onClick={() => setIsEmotionPickerOpen(!isEmotionPickerOpen)}
                disabled={!ready}
                title="Cảm xúc"
              >
                😊
              </button>

              {isEmotionPickerOpen && (
                <div className="emotion-drawer">
                  <div className="drawer-header">
                    <span>Cảm xúc & Hành động</span>
                    {activeAction && (
                      <button 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.6rem' }}
                        onClick={handleCancelAction}
                      >
                        Dừng lại
                      </button>
                    )}
                  </div>
                  <div className="emotion-grid">
                    {ACTIONS.map(({ id, label, emoji }) => (
                      <button
                        key={id}
                        className={`emotion-item${activeAction === id ? ' active' : ''}`}
                        onClick={() => handleAction(id)}
                        title={label}
                      >
                        <span className="emotion-emoji">{emoji}</span>
                        <span className="emotion-label">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              className="icon-btn send-btn"
              onClick={handleSpeak}
              disabled={!ready || !textToSpeak.trim()}
              title="Gửi"
            >
              🚀
            </button>
          </div>
        </div>

        <div className="enter-helper">
          Nhấn <span className="enter-key">Enter</span> để gửi
        </div>
      </div>
    </main>
  );
}