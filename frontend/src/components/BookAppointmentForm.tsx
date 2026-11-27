import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section, Button, Alert, EmptyState, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import DoctorPicker from './DoctorPicker';
import SlotPicker from './SlotPicker';
import { createAppointment } from '../api';
import type { Service, DoctorProfile } from '../types';

export interface BookingSlot {
  start_time: string;
  end_time?: string;
}

interface BookAppointmentFormProps {
  doctors: DoctorProfile[];
  services: Service[];
  slots: BookingSlot[];
  slotsLoading: boolean;
  selectedDoctorId: number;
  selectedSlot: BookingSlot | null;
  date: string;
  onDoctorSelect: (id: number) => void;
  onSlotSelect: (slot: BookingSlot) => void;
  onDateChange: (date: string) => void;
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    const text = Array.isArray(first) ? first[0] : first;
    if (typeof text === 'string') return text;
  }
  return 'We could not book this appointment. The time may have just been taken, so please pick another slot.';
}

function BookAppointmentForm({
  doctors, services, slots, slotsLoading, selectedDoctorId, selectedSlot, date,
  onDoctorSelect, onSlotSelect, onDateChange,
}: BookAppointmentFormProps) {
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedDoctorId) { setError('Please choose a doctor.'); return; }
    if (!selectedSlot) { setError('Please choose a date and an available time.'); return; }
    const service = services.find((s) => s.id === serviceId);
    const start = new Date(selectedSlot.start_time);
    const end = selectedSlot.end_time
      ? selectedSlot.end_time
      : new Date(start.getTime() + (service?.duration_minutes ?? 30) * 60000).toISOString();
    const payload: Record<string, unknown> = {
      doctor: selectedDoctorId,
      start_time: selectedSlot.start_time,
      end_time: end,
      reason: reason.trim(),
    };
    if (service) payload.service = service.id;
    setSubmitting(true);
    try {
      const created = await createAppointment(payload as Parameters<typeof createAppointment>[0]);
      const record = created as unknown as Record<string, unknown>;
      if (record && (record.amount || record.total_amount)) {
        navigate(`/order-pay?order=${record.id}`);
      } else {
        setBooked(true);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <Section narrow>
        <EmptyState
          icon="check"
          title="Your appointment is booked"
          text="We have reserved your time at Cedar Hollow Health. You can check in at the front desk when you arrive, or reschedule from your appointments."
          action={<Button variant="primary" to="/patient/appointments">View my appointments</Button>}
        />
      </Section>
    );
  }

  return (
    <Section narrow eyebrow="Appointment details" title="Choose your doctor and time">
      <form className="ds-form" onSubmit={handleSubmit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="ds-field">
          <label className="ds-label" htmlFor="book-service">Type of visit</label>
          <select id="book-service" className="input" value={serviceId}
            onChange={(e) => setServiceId(Number(e.target.value))}>
            <option value={0}>General consultation</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
            ))}
          </select>
          <span className="ds-help">Pick the service that best matches why you are coming in.</span>
        </div>
        <div className="ds-field">
          <span className="ds-label">Doctor</span>
          <DoctorPicker doctors={doctors} selectedId={selectedDoctorId} onSelect={onDoctorSelect} />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="book-date">Date</label>
          <input id="book-date" type="date" className="input" min={today} value={date}
            onChange={(e) => onDateChange(e.target.value)} />
          <span className="ds-help">Available times update when you change the doctor or date.</span>
        </div>
        <div className="ds-field">
          <span className="ds-label">Available times</span>
          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={(slot) => {
              const start = slot.start_time || slot.start;
              if (!start) return;
              onSlotSelect({ start_time: start, end_time: slot.end_time || slot.end });
            }}
            loading={slotsLoading}
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="book-reason">Reason for visit</label>
          <input id="book-reason" className="input" maxLength={255} value={reason}
            placeholder="e.g. Persistent cough, annual check-up, prescription review"
            onChange={(e) => setReason(e.target.value)} />
          <span className="ds-help">Optional. Your doctor will see this before the visit.</span>
        </div>
        <Stack gap="sm">
          <div className="ds-form-actions">
            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              <Icon name="calendar" size={18} />
              {submitting ? 'Booking...' : 'Confirm appointment'}
            </Button>
            <Button variant="secondary" size="lg" to="/patient">Cancel</Button>
          </div>
        </Stack>
      </form>
    </Section>
  );
}

export default BookAppointmentForm;
