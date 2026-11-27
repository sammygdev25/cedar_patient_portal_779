import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import ResetPasswordForm from '../components/ResetPasswordForm';

interface ApiErrorShape {
  response?: {
    data?: Record<string, unknown> | string;
  };
  message?: string;
}

function extractError(err: unknown): string {
  const e = err as ApiErrorShape;
  const data = e?.response?.data;
  if (typeof data === 'string' && data.length < 300) return data;
  if (data && typeof data === 'object') {
    const preferred = ['detail', 'error', 'message', 'new_password', 'password', 'token', 'uid', 'non_field_errors'];
    for (const key of preferred) {
      const value = data[key];
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string') return value;
    }
    const first = Object.values(data)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'This reset link is invalid or has expired. Please request a new one.';
}

function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('This reset link is incomplete. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: password,
        password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-stack-lg">
      <ResetPasswordForm
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        submitting={submitting}
        success={success}
        error={error}
      />
    </div>
  );
}

export default ResetPasswordPage;