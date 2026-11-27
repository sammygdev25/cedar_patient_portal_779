import { Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface AppointmentStatusBadgeProps {
  status: string;
}

type BadgeTone = 'neutral' | 'primary' | 'soft' | 'success' | 'danger';

interface StatusConfig {
  label: string;
  tone: BadgeTone;
  icon: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  booked: { label: 'Booked', tone: 'primary', icon: 'calendar' },
  checked_in: { label: 'Checked in', tone: 'soft', icon: 'clock' },
  completed: { label: 'Completed', tone: 'success', icon: 'check' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: 'close' },
  no_show: { label: 'No show', tone: 'neutral', icon: 'alert' },
};

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  if (!text) return 'Unknown';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const key = (status || '').toLowerCase();
  const config: StatusConfig = STATUS_CONFIG[key] || {
    label: humanize(status || ''),
    tone: 'neutral',
    icon: 'info',
  };

  return (
    <Badge tone={config.tone}>
      <Icon name={config.icon as any} size={12} />
      {config.label}
    </Badge>
  );
}

export default AppointmentStatusBadge;