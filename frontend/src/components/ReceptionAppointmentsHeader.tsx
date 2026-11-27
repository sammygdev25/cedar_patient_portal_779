import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

interface ReceptionAppointmentsHeaderProps {
  userName?: string;
  userEmail?: string;
  totalCount?: number;
  todayCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function readString(source: unknown, key: string): string {
  if (!source || typeof source !== 'object') return '';
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function ReceptionAppointmentsHeader({
  userName,
  userEmail,
  totalCount,
  todayCount,
  onRefresh,
  refreshing = false,
}: ReceptionAppointmentsHeaderProps) {
  const { user } = useAuth();

  const fullName = [readString(user, 'first_name'), readString(user, 'last_name')]
    .filter(Boolean)
    .join(' ');
  const displayName =
    userName || fullName || readString(user, 'username') || userEmail || readString(user, 'email');

  const subtitle = displayName
    ? `Signed in as ${displayName}. Review, reschedule, check in and cancel appointments for every Cedar Hollow Health doctor.`
    : 'Review, reschedule, check in and cancel appointments for every Cedar Hollow Health doctor.';

  const actions = (
    <Cluster gap="sm" align="center">
      {typeof todayCount === 'number' && (
        <Badge tone="primary">{todayCount} today</Badge>
      )}
      {typeof totalCount === 'number' && (
        <Badge tone="soft">{totalCount} total</Badge>
      )}
      {onRefresh && (
        <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
          <Icon name="refresh" size={16} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </Button>
      )}
      <Button variant="primary" to="/staff/reception/book">
        <Icon name="plus" size={16} />
        Book appointment
      </Button>
    </Cluster>
  );

  return (
    <PageHeader
      eyebrow="Reception desk"
      title="Clinic appointments"
      subtitle={subtitle}
      actions={actions}
    />
  );
}

export default ReceptionAppointmentsHeader;