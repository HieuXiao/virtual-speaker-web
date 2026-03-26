import ThreeScene from './ThreeScene';

function App() {
  return (
    <main className="container">
      <div className="scene-wrapper">
        <ThreeScene />
      </div>
      <div className="card">
        <div className="icon">🎙️</div>
        <h1>Virtual Speaker</h1>
        <p className="subtitle">Your AI-powered presentation companion</p>
      </div>
    </main>
  );
}

export default App;
