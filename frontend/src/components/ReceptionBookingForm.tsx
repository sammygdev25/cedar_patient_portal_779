import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, EmptyState, Section } from '../components/ui';
import { Icon } from '../components/icons';
import { createAppointment } from '../api';
import type { Service } from '../types';

interface SlotLike {
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
}

interface ReceptionBookingFormProps {
  patientId: number | null;
  doctorId: number | null;
  slot: SlotLike | null;
  services?: Service[];
  children?: ReactNode;
  onBooked?: (appointment: unknown) => void;
}

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>).flat();
    if (values.length > 0) return (Array.isArray(values) ? values : []).map(String).join(' ');
  }
  return 'We could not book this appointment. The slot may have just been taken, so please pick another time.';
}

function ReceptionBookingForm({ patientId, doctorId, slot, services = [], children, onBooked }: ReceptionBookingFormProps) {
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(false);

  const start = slot?.start_time || slot?.start || '';
  const end = slot?.end_time || slot?.end || '';
  const slotLabel = start ? new Date(start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) return setError('Find and select the patient this visit is for.');
    if (!doctorId) return setError('Choose a doctor at Cedar Hollow Health.');
    if (!start || !end) return setError('Pick an open time slot for the visit.');
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        patient: patientId,
        doctor: doctorId,
        service: serviceId ? Number(serviceId) : null,
        start_time: start,
        end_time: end,
        reason: reason.trim(),
      } as unknown as Parameters<typeof createAppointment>[0];
      const created = await createAppointment(payload);
      const record = created as unknown as Record<string, unknown>;
      onBooked?.(created);
      if (record && (record.amount || record.total_amount)) {
        navigate(`/order-pay?order=${record.id}`);
        return;
      }
      setBooked(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <Section narrow>
        <EmptyState
          icon="check"
          title="Appointment booked"
          text={`The visit is confirmed${slotLabel ? ` for ${slotLabel}` : ''}. The patient will see it in their portal.`}
          action={<Button to="/staff/reception/appointments">View all appointments</Button>}
        />
      </Section>
    );
  }

  return (
    <Section narrow eyebrow="Book for a patient" title="Appointment details" subtitle="Choose the patient, doctor and time, then confirm the booking.">
      <form className="ds-form" onSubmit={handleSubmit}>
        {error && <Alert tone="danger">{error}</Alert>}
        {children}
        <div className="ds-field">
          <label className="ds-label" htmlFor="reception-service">Service</label>
          <select id="reception-service" className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">General consultation</option>
            {(Array.isArray(services) ? services : []).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
            ))}
          </select>
          <span className="ds-help">Optional. The service sets how long the doctor is held for.</span>
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="reception-reason">Reason for visit</label>
          <input
            id="reception-reason"
            className="input"
            type="text"
            maxLength={255}
            value={reason}
            placeholder="e.g. Annual physical, follow-up on blood pressure"
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="ds-help">Shown to the doctor on their schedule.</span>
        </div>
        {slotLabel && (
          <Alert tone="success">
            <Icon name="calendar" size={16} /> Selected time: {slotLabel}
          </Alert>
        )}
        <div className="ds-form-actions">
          <Button type="button" variant="ghost" onClick={() => navigate('/staff/reception')}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm booking'}
          </Button>
        </div>
      </form>
    </Section>
  );
}

export default ReceptionBookingForm;