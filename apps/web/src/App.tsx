import { useEffect, useState } from 'react';
import type { HelloResponse } from '@virtual-speaker/shared';

function App() {
  const [greeting, setGreeting] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data: HelloResponse) => setGreeting(data))
      .catch(() => setError('Could not connect to server'));
  }, []);

  return (
    <main className="container">
      <div className="card">
        <div className="icon">🎙️</div>
        <h1>Virtual Speaker</h1>
        <p className="subtitle">Your AI-powered presentation companion</p>

        <div className="status-box">
          {error ? (
            <p className="error">⚠️ {error}</p>
          ) : greeting ? (
            <>
              <p className="success">✅ Server connected</p>
              <p className="message">{greeting.message}</p>
              <p className="meta">
                {greeting.service} · {new Date(greeting.timestamp).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="loading">Connecting to server…</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
