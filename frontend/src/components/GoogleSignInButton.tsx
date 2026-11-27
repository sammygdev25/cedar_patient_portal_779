import { useEffect, useState } from 'react';
import api from '../api';

// Scaffold-owned (Shikshya): a full-page visit to the backend, which sends the browser on to Google
// (backend/google_auth/views.py). The button reads whether Google sign-in is set up for this app.
export default function GoogleSignInButton() {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    api.get('/auth/google/status/')
      .then((res) => setReady(Boolean(res.data && res.data.configured)))
      .catch(() => setReady(false));
  }, []);
  const start = () => {
    window.location.href = (api.defaults.baseURL || '/api') + '/auth/google/';
  };
  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <button type="button" className="btn" disabled={!ready} onClick={start}
        style={{ width: '100%', border: '1px solid var(--color-border)', cursor: ready ? 'pointer' : 'not-allowed' }}>
        Sign in with Google
      </button>
      {ready === false && (
        <p style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Google sign-in is not set up for this app yet.
        </p>
      )}
    </div>
  );
}
