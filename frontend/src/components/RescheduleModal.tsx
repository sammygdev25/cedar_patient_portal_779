import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, ComponentProps } from 'react';
import api from '../api';
import type { Appointment } from '../types';
import SlotPicker from './SlotPicker';
import { Alert, Button, Stack } from './ui';
import { Icon } from './icons';

type Slot = ComponentProps<typeof SlotPicker>['slots'][number];

interface RescheduleModalProps {
  appointment: Appointment;
  onClose: () => void;
  onRescheduled: (appointment?: Appointment) => void;
}

function toDateInput(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function extractSlots(data: unknown): Slot[] {
  if (Array.isArray(data)) return data as Slot[];
  const obj = data as { slots?: Slot[]; results?: Slot[] } | null;
  if (obj && Array.isArray(obj.slots)) return obj.slots;
  if (obj && Array.isArray(obj.results)) return obj.results;
  return [];
}

function extractError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.length < 200) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const first = record.detail ?? record.non_field_errors ?? record.start_time ?? Object.values(record)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return fallback;
}

function RescheduleModal({ appointment, onClose, onRescheduled }: RescheduleModalProps) {
  const [date, setDate] = useState<string>(toDateInput(appointment.start_time));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectedSlot(null);
    try {
      const params: Record<string, string | number> = {
        doctor: appointment.doctor as unknown as number,
        date,
      };
      if (appointment.service) params.service = appointment.service as unknown as number;
      const response = await api.get('/availability/', { params });
      setSlots(extractSlots(response.data));
    } catch (err) {
      setSlots([]);
      setError(extractError(err, 'We could not load open times for that day. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [appointment.doctor, appointment.service, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.patch(`/appointments/${appointment.id}/`, {
        start_time: selectedSlot.start_time || selectedSlot.start || '',
        end_time: selectedSlot.end_time || selectedSlot.end || '',
      });
      onRescheduled(response.data as Appointment);
      onClose();
    } catch (err) {
      setError(
        extractError(err, 'That time is no longer available. Please choose another slot.')
      );
      loadSlots();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        zIndex: 1000,
      }}
    >
      <div
        className="card modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--color-surface)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <Stack gap="md">
          <div className="ds-between">
            <h2 id="reschedule-title">Reschedule appointment</h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </Button>
          </div>

          <p className="ds-muted">
            Currently booked for <strong>{formatWhen(appointment.start_time)}</strong>. Pick a new
            day and an open time with the same doctor at Cedar Hollow Health.
          </p>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="ds-field">
            <label className="ds-label" htmlFor="reschedule-date">
              New date
            </label>
            <input
              id="reschedule-date"
              type="date"
              className="input"
              value={date}
              min={toDateInput(new Date())}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            />
            <span className="ds-help">Open times update when you change the day.</span>
          </div>

          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={(slot: Slot) => setSelectedSlot(slot)}
            loading={loading}
          />

          <div className="ds-form-actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Keep current time
            </Button>
            <Button variant="primary" onClick={handleConfirm} disabled={!selectedSlot || saving}>
              {saving ? 'Rescheduling...' : 'Confirm new time'}
            </Button>
          </div>
        </Stack>
      </div>
    </div>
  );
}

export default RescheduleModal;
