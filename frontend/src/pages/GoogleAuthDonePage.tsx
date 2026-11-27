import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const REASONS: Record<string, string> = {
  denied: 'Google sign-in was cancelled.',
  expired: 'The sign-in took too long. Please try again.',
  state: 'The sign-in could not be confirmed. Please try again.',
  unverified: 'Your Google account has no verified email.',
  conflict: 'This email cannot be linked to your Google account.',
  staff: 'Staff accounts sign in with their password.',
  inactive: 'This account is disabled.',
  not_configured: 'Google sign-in is not set up for this app yet.',
  google: 'Google sign-in failed. Please try again.',
};

// Scaffold-owned (Shikshya): the end of Google sign-in. The backend puts a one-use code, valid for two minutes, after
// the last '#', which no server receives; it is cleared from the address at once and swapped for a sign-in token, and
// the app reloads signed in.
export default function GoogleAuthDonePage() {
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const raw = window.location.hash;
    const params = new URLSearchParams(raw.slice(raw.lastIndexOf('#') + 1));
    const here = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', here + '#/auth/google/done');
    const code = params.get('code');
    if (!code) {
      setError(REASONS[params.get('error') || ''] || REASONS.google);
      return;
    }
    api.post('/auth/google/exchange/', { code })
      .then((res) => {
        localStorage.setItem('token', res.data.token);
        window.location.replace(here);
      })
      .catch(() => setError(REASONS.expired));
  }, []);
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 'var(--space-lg)', textAlign: 'center' }}>
      {error ? (
        <>
          <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>{error}</p>
          <Link to="/login">Back to sign in</Link>
        </>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)' }}>Signing you in...</p>
      )}
    </div>
  );
}
