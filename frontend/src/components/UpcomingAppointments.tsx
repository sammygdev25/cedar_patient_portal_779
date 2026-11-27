import { useMemo } from 'react';
import type { Appointment } from '../types';
import { Button, Card, CardBody, CardTitle, CardMeta, Cluster, EmptyState, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import AppointmentStatusBadge from './AppointmentStatusBadge';

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
}

const MAX_VISIBLE = 5;
const ACTIVE_STATUSES = ['booked', 'checked_in'];

function readText(appointment: Appointment, key: string): string {
  const value = (appointment as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  const upcoming = useMemo(() => {
    const list = Array.isArray(appointments) ? appointments : [];
    const now = Date.now();
    return list
      .filter((a) => ACTIVE_STATUSES.includes(a.status) && new Date(a.end_time).getTime() >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [appointments]);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No upcoming visits"
        text="You have nothing scheduled at Cedar Hollow Health. Pick a doctor and a time that suits you."
        action={<Button to="/patient/book">Book an appointment</Button>}
      />
    );
  }

  const visible = upcoming.slice(0, MAX_VISIBLE);
  const hiddenCount = upcoming.length - visible.length;

  return (
    <Stack gap="md">
      <Cluster justify="between" align="center">
        <h3 className="ds-card-title">Upcoming appointments</h3>
        <Button variant="ghost" to="/patient/appointments">
          View all
          <Icon name="arrow-right" size={16} />
        </Button>
      </Cluster>

      {visible.map((appointment) => {
        const doctorName =
          readText(appointment, 'doctor_name') ||
          readText(appointment, 'doctor_display_name') ||
          'Your doctor';
        const serviceName = readText(appointment, 'service_name');
        const title = serviceName || appointment.reason || 'Clinic visit';

        return (
          <Card key={appointment.id} to="/patient/appointments">
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
              <CardMeta>
                <Cluster gap="sm" align="center">
                  <Icon name="user" size={16} />
                  <span>{doctorName}</span>
                </Cluster>
              </CardMeta>
              {appointment.reason && serviceName ? (
                <p className="ds-small ds-muted">{appointment.reason}</p>
              ) : null}
            </CardBody>
          </Card>
        );
      })}

      {hiddenCount > 0 ? (
        <p className="ds-small ds-muted">
          {hiddenCount} more upcoming {hiddenCount === 1 ? 'appointment' : 'appointments'} on your appointments page.
        </p>
      ) : null}
    </Stack>
  );
}

export default UpcomingAppointments;