import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createInvoice } from '../api';
import type { Invoice } from '../types';
import { Alert, Button } from './ui';
import { Icon } from './icons';

interface PatientOption {
  id: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  full_name?: string;
}

interface InvoiceFormProps {
  patients: PatientOption[];
  onCreated: (invoice?: Invoice) => void;
}

function patientLabel(p: PatientOption): string {
  const full =
    p.full_name || p.name || [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  const contact = p.email || p.username || '';
  if (full && contact) return `${full} (${contact})`;
  return full || contact || `Patient #${p.id}`;
}

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const parts: string[] = [];
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      parts.push(key === 'detail' || key === 'non_field_errors' ? text : `${key}: ${text}`);
    });
    if (parts.length > 0) return parts.join(' ');
  }
  if (err instanceof Error && err.message) return err.message;
  return 'The bill could not be created. Please try again.';
}

function InvoiceForm({ patients, onCreated }: InvoiceFormProps) {
  const [patientId, setPatientId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const patientList: PatientOption[] = Array.isArray(patients) ? patients : [];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);
    if (!patientId) {
      setError('Choose the patient this bill is for.');
      return;
    }
    if (!description.trim()) {
      setError('Add a short description, for example "Consultation fee".');
      return;
    }
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    const payload: Record<string, unknown> = {
      user: Number(patientId),
      description: description.trim(),
      amount: Number(numericAmount || 0).toFixed(2),
    };
    if (dueDate) payload.due_date = dueDate;

    setSubmitting(true);
    try {
      const created = await createInvoice(
        payload as unknown as Parameters<typeof createInvoice>[0]
      );
      setSuccess('Bill created. The patient can now pay it online.');
      setPatientId('');
      setDescription('');
      setAmount('');
      setDueDate('');
      onCreated(created as Invoice);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="ds-form" onSubmit={handleSubmit} noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="ds-field">
        <label className="ds-label" htmlFor="invoice-patient">
          Patient
        </label>
        <select
          id="invoice-patient"
          className="input"
          value={patientId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPatientId(e.target.value)}
          disabled={submitting}
          required
        >
          <option value="">Select a patient</option>
          {patientList.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {patientLabel(p)}
            </option>
          ))}
        </select>
        {patientList.length === 0 && (
          <span className="ds-help">No patients are registered yet.</span>
        )}
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="invoice-description">
          Description
        </label>
        <input
          id="invoice-description"
          className="input"
          type="text"
          maxLength={255}
          placeholder="Consultation fee, lab work, vaccination..."
          value={description}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="ds-form-row">
        <div className="ds-field">
          <label className="ds-label" htmlFor="invoice-amount">
            Amount (USD)
          </label>
          <input
            id="invoice-amount"
            className="input"
            type="number"
            min="0.01"
            max="999999.99"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="ds-field">
          <label className="ds-label" htmlFor="invoice-due-date">
            Due date
          </label>
          <input
            id="invoice-due-date"
            className="input"
            type="date"
            value={dueDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
            disabled={submitting}
          />
          <span className="ds-help">Optional</span>
        </div>
      </div>

      <div className="ds-form-actions">
        <Button type="submit" variant="primary" disabled={submitting}>
          <Icon name="plus" size={16} />
          {submitting ? 'Creating bill...' : 'Create bill'}
        </Button>
      </div>
    </form>
  );
}

export default InvoiceForm;