import { useState } from 'react';
import type { Appointment } from '../types';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import { Button, EmptyState } from '../components/ui';
import { Icon } from '../components/icons';

interface CheckInListProps {
  appointments: Appointment[];
  onCheckIn: (id: number) => void | Promise<void>;
}

interface AppointmentExtras {
  patient_name?: string;
  doctor_name?: string;
  service_name?: string;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CheckInList({ appointments, onCheckIn }: CheckInListProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);

  const rows: Appointment[] = (Array.isArray(appointments) ? [...appointments] : []).sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const handleCheckIn = async (id: number) => {
    setPendingId(id);
    try {
      await onCheckIn(id);
    } finally {
      setPendingId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No arrivals expected"
        text="There are no appointments waiting for check-in right now. New bookings will appear here as they come in."
      />
    );
  }

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Check-in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((appointment) => {
            const extra = appointment as unknown as AppointmentExtras;
            const patientLabel = extra.patient_name || `Patient #${appointment.patient}`;
            const doctorLabel = extra.doctor_name || `Doctor #${appointment.doctor}`;
            const reasonLabel = appointment.reason || extra.service_name || 'General visit';
            const canCheckIn = appointment.status === 'booked';
            const isPending = pendingId === appointment.id;

            return (
              <tr key={appointment.id}>
                <td>
                  <strong>{formatTime(appointment.start_time)}</strong>
                  <div className="ds-small ds-muted">{formatDay(appointment.start_time)}</div>
                </td>
                <td>{patientLabel}</td>
                <td>{doctorLabel}</td>
                <td className="ds-muted">{reasonLabel}</td>
                <td>
                  <AppointmentStatusBadge status={appointment.status} />
                </td>
                <td>
                  {canCheckIn ? (
                    <Button
                      variant="primary"
                      onClick={() => handleCheckIn(appointment.id)}
                      disabled={isPending}
                    >
                      <Icon name="check" size={16} />
                      {isPending ? 'Checking in...' : 'Check in'}
                    </Button>
                  ) : appointment.status === 'checked_in' ? (
                    <span className="ds-small ds-muted">
                      <Icon name="clock" size={14} /> Arrived {formatTime(appointment.checked_in_at)}
                    </span>
                  ) : (
                    <span className="ds-small ds-muted">No action needed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CheckInList;