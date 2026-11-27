import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

type Step = 'working' | 'done' | 'bad' | 'ask';

// Scaffold-owned (Shikshya, PX.303): the mailed link opens this page with a one-use token after the last '#', which
// no server receives; it is cleared from the address at once and sent to the backend. Without a token, a signed-in
// user can ask for a new link here.
export default function VerifyEmailPage() {
  const [step, setStep] = useState<Step>('working');
  const [note, setNote] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const raw = window.location.hash;
    const token = new URLSearchParams(raw.slice(raw.lastIndexOf('#') + 1)).get('t');
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/verify-email');
    if (token === null) {
      setStep('ask');
      return;
    }
    api.post('/auth/verify/confirm/', { token })
      .then(() => setStep('done'))
      .catch(() => setStep('bad'));
  }, []);
  const resend = () => {
    api.post('/auth/verify/resend/')
      .then((res) => setNote(res.data.detail))
      .catch(() => setNote('Please sign in first, then ask for a new link.'));
  };
  return (
    <div style={{ maxWidth: 440, margin: '80px auto', padding: 'var(--space-lg)', textAlign: 'center' }}>
      {step === 'working' && <p style={{ color: 'var(--color-text-secondary)' }}>Confirming your email...</p>}
      {step === 'done' && (
        <>
          <p style={{ marginBottom: 'var(--space-md)' }}>Your email is confirmed. Thank you.</p>
          <Link to="/">Continue</Link>
        </>
      )}
      {(step === 'bad' || step === 'ask') && (
        <>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            {step === 'bad' ? 'This link is invalid, used or expired.'
              : 'Confirm your email with the link we sent you.'}
          </p>
          <button type="button" className="btn" onClick={resend}>Send me a new link</button>
          {note && <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>{note}</p>}
        </>
      )}
    </div>
  );
}
