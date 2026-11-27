import { useMemo } from 'react';
import type { Appointment } from '../types';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import { EmptyState, SkeletonCards } from './ui';
import { Icon } from './icons';

interface DoctorScheduleListProps {
  appointments: Appointment[];
  loading?: boolean;
}

interface DayGroup {
  key: string;
  label: string;
  items: Appointment[];
}

// Serializer-added display fields are read defensively; the model fields are used directly.
function extraText(appointment: Appointment, key: string): string {
  const value = (appointment as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(value) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(value) === dayKey(tomorrow.toISOString())) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function DoctorScheduleList({ appointments, loading = false }: DoctorScheduleListProps) {
  const groups = useMemo<DayGroup[]>(() => {
    const list = Array.isArray(appointments) ? appointments : [];
    const sorted = [...list].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const map = new Map<string, DayGroup>();
    sorted.forEach((appointment) => {
      const key = dayKey(appointment.start_time);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(appointment);
      } else {
        map.set(key, { key, label: dayLabel(appointment.start_time), items: [appointment] });
      }
    });
    return Array.from(map.values());
  }, [appointments]);

  if (loading) {
    return <SkeletonCards count={3} />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No appointments on your schedule"
        text="Booked and checked-in visits will appear here as the front desk confirms them. This list refreshes automatically."
      />
    );
  }

  return (
    <div className="ds-stack">
      {groups.map((group) => (
        <section key={group.key} className="ds-stack">
          <div className="ds-between">
            <h3 className="ds-card-title">{group.label}</h3>
            <span className="ds-small ds-muted">
              {group.items.length} {group.items.length === 1 ? 'visit' : 'visits'}
            </span>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Visit</th>
                  <th>Arrival</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((appointment) => {
                  const patientName = extraText(appointment, 'patient_name') || `Patient #${appointment.patient}`;
                  const serviceName = extraText(appointment, 'service_name');
                  return (
                    <tr key={appointment.id}>
                      <td>
                        <strong>{formatTime(appointment.start_time)}</strong>
                        <div className="ds-small ds-muted">until {formatTime(appointment.end_time)}</div>
                      </td>
                      <td>{patientName}</td>
                      <td>
                        {serviceName && <div>{serviceName}</div>}
                        <div className="ds-small ds-muted">
                          {appointment.reason || 'No reason given'}
                        </div>
                      </td>
                      <td>
                        {appointment.checked_in_at ? (
                          <span className="ds-cluster ds-small">
                            <Icon name="check" size={16} />
                            Arrived {formatTime(appointment.checked_in_at)}
                          </span>
                        ) : (
                          <span className="ds-small ds-muted">Not yet arrived</span>
                        )}
                      </td>
                      <td>
                        <AppointmentStatusBadge status={appointment.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default DoctorScheduleList;