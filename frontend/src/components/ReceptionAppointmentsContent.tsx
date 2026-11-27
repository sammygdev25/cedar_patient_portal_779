import { Section, Badge, Button, EmptyState, LoadingBlock } from '../components/ui';
import { Icon } from '../components/icons';
import type { Appointment } from '../types';

interface ReceptionAppointmentsContentProps {
  appointments: Appointment[];
  loading?: boolean;
  onCheckIn?: (appointmentId: number) => void;
  onCancel?: (appointmentId: number) => void;
  onReschedule?: (appointment: Appointment) => void;
}

type Tone = 'neutral' | 'primary' | 'soft' | 'success' | 'danger';

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

const STATUS_TONES: Record<string, Tone> = {
  booked: 'primary',
  checked_in: 'soft',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'neutral',
};

function refLabel(value: unknown, prefix: string): string {
  if (value && typeof value === 'object' && 'id' in value) {
    return `${prefix} #${String((value as { id: unknown }).id)}`;
  }
  return `${prefix} #${String(value)}`;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ReceptionAppointmentsContent({
  appointments,
  loading = false,
  onCheckIn,
  onCancel,
  onReschedule,
}: ReceptionAppointmentsContentProps) {
  const rows = Array.isArray(appointments) ? appointments : [];

  if (loading) {
    return (
      <Section title="Clinic appointments" subtitle="Loading the Cedar Hollow Health schedule">
        <LoadingBlock label="Loading appointments" />
      </Section>
    );
  }

  if (rows.length === 0) {
    return (
      <Section title="Clinic appointments">
        <EmptyState
          icon="calendar"
          title="No appointments on the schedule"
          text="Nothing is booked yet. Book a visit for a patient and it will appear here for check-in, rescheduling or cancelling."
          action={
            <Button to="/staff/reception/book" variant="primary">
              Book an appointment
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      title="Clinic appointments"
      subtitle="Check patients in, reschedule or cancel visits across every doctor."
      actions={
        <Button to="/staff/reception/book" variant="primary">
          <Icon name="plus" size={16} /> New booking
        </Button>
      }
    >
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((appointment) => {
              const status = String(appointment.status);
              const isOpen = status === 'booked' || status === 'checked_in';
              return (
                <tr key={appointment.id}>
                  <td>
                    <span className="ds-cluster">
                      <Icon name="clock" size={16} />
                      {formatWhen(String(appointment.start_time))}
                    </span>
                  </td>
                  <td>{refLabel(appointment.patient, 'Patient')}</td>
                  <td>{refLabel(appointment.doctor, 'Doctor')}</td>
                  <td>{appointment.reason || 'General visit'}</td>
                  <td>
                    <Badge tone={STATUS_TONES[status] || 'neutral'}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                  </td>
                  <td>
                    <div className="ds-cluster">
                      {status === 'booked' && onCheckIn && (
                        <Button
                          variant="secondary"
                          onClick={() => onCheckIn(appointment.id)}
                        >
                          <Icon name="check" size={16} /> Check in
                        </Button>
                      )}
                      {isOpen && onReschedule && (
                        <Button
                          variant="ghost"
                          onClick={() => onReschedule(appointment)}
                        >
                          <Icon name="edit" size={16} /> Reschedule
                        </Button>
                      )}
                      {isOpen && onCancel && (
                        <Button
                          variant="danger"
                          onClick={() => onCancel(appointment.id)}
                        >
                          <Icon name="close" size={16} /> Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default ReceptionAppointmentsContent;