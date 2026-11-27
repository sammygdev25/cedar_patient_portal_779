import { Badge, Card, CardBody, CardTitle, EmptyState } from './ui';
import { Icon } from './icons';
import type { OpeningHours } from '../types';

interface OpeningHoursPanelProps {
  hours: OpeningHours[];
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const [hourPart, minutePart] = value.split(':');
  const hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart || '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function isToday(entry: OpeningHours): boolean {
  const now = new Date().getDay();
  const label = (entry.label || '').trim().toLowerCase();
  const labelIndex = DAY_NAMES.findIndex((name) => label.startsWith(name));
  if (labelIndex >= 0) return labelIndex === now;
  // Fallback: weekday is stored Monday = 0 ... Sunday = 6
  return entry.weekday === (now + 6) % 7;
}

function OpeningHoursPanel({ hours }: OpeningHoursPanelProps) {
  const rows: OpeningHours[] = Array.isArray(hours)
    ? [...hours].sort((a, b) => a.weekday - b.weekday)
    : [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title="Opening hours coming soon"
        text="Call the Cedar Hollow Health front desk and we will gladly confirm when we are open."
      />
    );
  }

  return (
    <Card>
      <CardBody>
        <CardTitle>
          <span className="ds-cluster">
            <Icon name="clock" size={20} title="Opening hours" />
            <span>Clinic opening hours</span>
          </span>
        </CardTitle>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const today = isToday(entry);
                const closed = entry.is_closed || !entry.open_time || !entry.close_time;
                return (
                  <tr key={entry.id}>
                    <td>
                      <span className="ds-cluster">
                        <strong>{entry.label}</strong>
                        {today && <Badge tone="primary">Today</Badge>}
                      </span>
                    </td>
                    <td>
                      {closed ? (
                        <Badge tone="danger">Closed</Badge>
                      ) : (
                        <span>
                          {formatTime(entry.open_time)} – {formatTime(entry.close_time)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ds-small ds-muted">
          Need to be seen outside these hours? Contact the front desk and we will help you find the next available appointment.
        </p>
      </CardBody>
    </Card>
  );
}

export default OpeningHoursPanel;