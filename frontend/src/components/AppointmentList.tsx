import type { Appointment } from '../types';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import { Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Cluster, Stack } from './ui';
import { Icon } from './icons';

interface AppointmentListProps {
  appointments: Appointment[];
  role: string;
  onCancel?: (id: number) => void;
  onReschedule?: (appointment: Appointment) => void;
}

function extraText(appointment: Appointment, key: string): string {
  const value = (appointment as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function AppointmentList({ appointments, role, onCancel, onReschedule }: AppointmentListProps) {
  const items: Appointment[] = Array.isArray(appointments) ? appointments : [];
  const isPatient = role === 'patient';
  const bookingPath = role === 'receptionist' ? '/staff/reception/book' : '/patient/book';
  const canBook = role === 'patient' || role === 'receptionist';

  if (items.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No appointments to show"
        text={
          isPatient
            ? 'You have nothing scheduled with Cedar Hollow Health yet. Book a visit with one of our doctors.'
            : 'There are no appointments matching this view right now.'
        }
        action={canBook ? <Button to={bookingPath}>Book an appointment</Button> : undefined}
      />
    );
  }

  const handleCancel = (appointment: Appointment) => {
    if (!onCancel) return;
    if (window.confirm('Cancel this appointment? The time slot will be released for other patients.')) {
      onCancel(appointment.id);
    }
  };

  return (
    <Stack gap="md">
      {items.map((appointment) => {
        const doctorName = extraText(appointment, 'doctor_name') || `Doctor #${appointment.doctor}`;
        const patientName = extraText(appointment, 'patient_name') || `Patient #${appointment.patient}`;
        const serviceName = extraText(appointment, 'service_name');
        const isFuture = new Date(appointment.start_time).getTime() > Date.now();
        const canModify = appointment.status === 'booked' && isFuture;
        const title = isPatient ? doctorName : patientName;
        const subtitle = isPatient ? serviceName : `with ${doctorName}${serviceName ? ` · ${serviceName}` : ''}`;

        return (
          <Card key={appointment.id}>
            <CardBody>
              <Cluster justify="between" align="center">
                <CardTitle>{title}</CardTitle>
                <AppointmentStatusBadge status={appointment.status} />
              </Cluster>
              <CardMeta>
                <Cluster gap="sm" align="center">
                  <Icon name="calendar" size={16} />
                  <span>{formatDay(appointment.start_time)}</span>
                  <Icon name="clock" size={16} />
                  <span>
                    {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
                  </span>
                </Cluster>
              </CardMeta>
              {subtitle ? <p className="ds-muted">{subtitle}</p> : null}
              {appointment.reason ? <p className="ds-small">Reason: {appointment.reason}</p> : null}
              {appointment.checked_in_at ? (
                <p className="ds-small">Checked in at {formatTime(appointment.checked_in_at)}</p>
              ) : null}
            </CardBody>
            {canModify && (onReschedule || onCancel) ? (
              <CardFooter>
                <Cluster gap="sm">
                  {onReschedule ? (
                    <Button variant="secondary" onClick={() => onReschedule(appointment)}>
                      <Icon name="refresh" size={16} /> Reschedule
                    </Button>
                  ) : null}
                  {onCancel ? (
                    <Button variant="danger" onClick={() => handleCancel(appointment)}>
                      <Icon name="close" size={16} /> Cancel
                    </Button>
                  ) : null}
                </Cluster>
              </CardFooter>
            ) : null}
          </Card>
        );
      })}
    </Stack>
  );
}

export default AppointmentList;