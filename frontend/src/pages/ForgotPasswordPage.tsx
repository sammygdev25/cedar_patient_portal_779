import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

function extractError(err: unknown): string {
  const fallback = 'We could not send the reset link right now. Please try again in a moment.';
  if (typeof err !== 'object' || err === null) return fallback;
  const response = (err as { response?: { data?: unknown; status?: number } }).response;
  if (!response) return 'Cannot reach the Cedar Hollow Health server. Check your connection and try again.';
  const data = response.data;
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    const detail = record.detail ?? record.error ?? record.message ?? record.email;
    if (Array.isArray(detail) && detail.length > 0) return String(detail[0]);
    if (typeof detail === 'string' && detail) return detail;
  }
  return fallback;
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email address you used to register.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/password-reset/', { email: trimmed });
      setSent(true);
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  const handleReset = () => {
    setSent(false);
    setError('');
  };

  return (
    <div className="ds-stack-lg">
      <ForgotPasswordForm
        email={email}
        submitting={submitting}
        sent={sent}
        error={error}
        onEmailChange={handleEmailChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />
    </div>
  );
}

export default ForgotPasswordPage;