import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getVisitNoteList, createVisitNote, updateVisitNote } from '../api';
import type { VisitNote } from '../types';
import { Alert, Button, LoadingBlock } from '../components/ui';
import { Icon } from '../components/icons';

interface VisitNoteFormProps {
  appointmentId: number;
  onSaved?: (note: VisitNote) => void;
}

interface FormState {
  diagnosis: string;
  summary: string;
  follow_up_instructions: string;
}

const EMPTY_FORM: FormState = {
  diagnosis: '',
  summary: '',
  follow_up_instructions: '',
};

function readError(err: unknown): string {
  const e = err as { response?: { data?: unknown }; message?: string };
  const data = e?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return e?.message || 'The visit note could not be saved. Please try again.';
}

export default function VisitNoteForm({ appointmentId, onSaved }: VisitNoteFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      setLoading(true);
      setError('');
      setSaved(false);
      try {
        const result = await getVisitNoteList();
        const notes: VisitNote[] = Array.isArray(result) ? result : [];
        const match = notes.find((n) => Number(n.appointment) === Number(appointmentId));
        if (cancelled) return;
        if (match) {
          setExistingId(match.id);
          setForm({
            diagnosis: match.diagnosis || '',
            summary: match.summary || '',
            follow_up_instructions: match.follow_up_instructions || '',
          });
        } else {
          setExistingId(null);
          setForm(EMPTY_FORM);
        }
      } catch (err) {
        if (!cancelled) setError(readError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.diagnosis.trim() || !form.summary.trim()) {
      setError('A diagnosis and a visit summary are required before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        diagnosis: form.diagnosis.trim(),
        summary: form.summary.trim(),
        follow_up_instructions: form.follow_up_instructions.trim(),
      };
      const note: VisitNote = existingId
        ? await updateVisitNote(existingId, payload)
        : await createVisitNote({ appointment: appointmentId, ...payload });
      setExistingId(note.id);
      setSaved(true);
      if (onSaved) onSaved(note);
    } catch (err) {
      setError(readError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading visit note" />;
  }

  return (
    <form className="ds-form" onSubmit={handleSubmit}>
      <p className="ds-help">
        Only the patient and you can read this note. Reception staff cannot see it.
      </p>

      {error && <Alert tone="danger">{error}</Alert>}
      {saved && (
        <Alert tone="success">
          <Icon name="check" size={16} /> Visit note saved. The patient can now read it in their records.
        </Alert>
      )}

      <div className="ds-field">
        <label className="ds-label" htmlFor="visit-note-diagnosis">
          Diagnosis
        </label>
        <input
          id="visit-note-diagnosis"
          name="diagnosis"
          type="text"
          className="input"
          maxLength={255}
          placeholder="e.g. Seasonal allergic rhinitis"
          value={form.diagnosis}
          onChange={handleChange}
          required
        />
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="visit-note-summary">
          Visit summary
        </label>
        <textarea
          id="visit-note-summary"
          name="summary"
          className="input"
          rows={6}
          placeholder="Findings, examination results and what was discussed during the visit."
          value={form.summary}
          onChange={handleChange}
          required
        />
        <span className="ds-help">Write in plain language; the patient reads this.</span>
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="visit-note-follow-up">
          Follow-up instructions
        </label>
        <textarea
          id="visit-note-follow-up"
          name="follow_up_instructions"
          className="input"
          rows={4}
          placeholder="Rest, fluids, when to return, or warning signs to watch for."
          value={form.follow_up_instructions}
          onChange={handleChange}
        />
      </div>

      <div className="ds-form-actions">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving...' : existingId ? 'Update visit note' : 'Save visit note'}
        </Button>
      </div>
    </form>
  );
}