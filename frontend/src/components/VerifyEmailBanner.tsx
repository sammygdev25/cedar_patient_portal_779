import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

// Scaffold-owned (Shikshya, PX.303): a signed-in user whose email is not confirmed sees this under the navbar, with a
// button for a new link. Until they open it the app refuses their bookings and payments with a plain 403.
export default function VerifyEmailBanner() {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (localStorage.getItem('token') === null) {
      setShow(false);
      return;
    }
    api.get('/auth/verify/status/')
      .then((res) => setShow(Boolean(res.data && res.data.on && res.data.verified === false)))
      .catch(() => setShow(false));
  }, [location.pathname]);
  if (show === false) return null;
  const resend = () => {
    api.post('/auth/verify/resend/')
      .then((res) => setNote(res.data.detail))
      .catch(() => setNote('A new link could not be sent. Please try again later.'));
  };
  return (
    <div role="status" style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
      <span>Please confirm your email to book or pay. Check your inbox for our link. </span>
      <button type="button" className="btn" onClick={resend}>Send a new link</button>
      {note && <span style={{ marginLeft: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>{note}</span>}
    </div>
  );
}
