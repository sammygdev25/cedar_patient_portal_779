import type { Appointment } from '../types';
import { Section, Badge, Button, EmptyState, LoadingBlock, Alert } from '../components/ui';
import { Icon } from '../components/icons';

type AppointmentRow = Appointment & {
  service_name?: string | null;
  doctor_name?: string | null;
};

interface MyAppointmentsContentProps {
  appointments?: Appointment[];
  loading?: boolean;
  error?: string;
  onCancel?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  section?: string;
  page?: string;
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
  no_show: 'danger',
};

function formatWhen(value: string): { date: string; time: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: value, time: '' };
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function MyAppointmentsContent({
  appointments = [],
  loading = false,
  error = '',
  onCancel,
  onReschedule,
}: MyAppointmentsContentProps) {
  const rows = (Array.isArray(appointments) ? appointments : []) as AppointmentRow[];

  if (loading) {
    return (
      <Section tight>
        <LoadingBlock label="Loading your appointments" />
      </Section>
    );
  }

  return (
    <Section tight>
      {error && <Alert tone="danger">{error}</Alert>}
      {rows.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No appointments yet"
          text="Book a visit with one of the Cedar Hollow Health doctors and it will show up here."
          action={<Button variant="primary" to="/patient/book">Book an appointment</Button>}
        />
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Visit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((appt) => {
                const when = formatWhen(appt.start_time);
                const canChange = appt.status === 'booked';
                return (
                  <tr key={appt.id}>
                    <td>
                      <div className="ds-cluster">
                        <Icon name="calendar" size={16} />
                        <strong>{when.date}</strong>
                      </div>
                      <div className="ds-cluster ds-muted ds-small">
                        <Icon name="clock" size={14} />
                        <span>{when.time}</span>
                      </div>
                    </td>
                    <td>
                      <div>{appt.service_name || appt.reason || 'Clinic visit'}</div>
                      {appt.doctor_name && <div className="ds-muted ds-small">with {appt.doctor_name}</div>}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONES[appt.status] || 'neutral'}>
                        {STATUS_LABELS[appt.status] || appt.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="ds-cluster">
                        {canChange && onReschedule && (
                          <Button variant="secondary" onClick={() => onReschedule(appt)}>
                            <Icon name="edit" size={16} /> Reschedule
                          </Button>
                        )}
                        {canChange && onCancel && (
                          <Button variant="danger" onClick={() => onCancel(appt)}>
                            <Icon name="trash" size={16} /> Cancel
                          </Button>
                        )}
                        {appt.status === 'completed' && (
                          <Button variant="ghost" to="/patient/records">
                            <Icon name="book" size={16} /> View visit notes
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
      )}
    </Section>
  );
}