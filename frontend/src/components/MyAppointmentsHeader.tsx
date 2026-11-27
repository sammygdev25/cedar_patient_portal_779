import { PageHeader, Button } from '../components/ui';
import { Icon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

interface MyAppointmentsHeaderProps {
  section?: string;
  page?: string;
  userName?: string;
  userEmail?: string;
  upcomingCount?: number;
  onBook?: () => void;
}

function readText(source: Record<string, unknown> | null, key: string): string {
  if (!source) return '';
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

export default function MyAppointmentsHeader({
  userName,
  userEmail,
  upcomingCount,
  onBook,
}: MyAppointmentsHeaderProps) {
  const { user } = useAuth();
  const record = (user as unknown as Record<string, unknown> | null) ?? null;

  const fullName = [readText(record, 'first_name'), readText(record, 'last_name')]
    .filter(Boolean)
    .join(' ');
  const displayName =
    userName || fullName || readText(record, 'username') || '';
  const displayEmail = userEmail || readText(record, 'email');
  const who = displayName || displayEmail;

  let subtitle =
    'Every visit with Cedar Hollow Health in one place: review upcoming appointments, reschedule, or cancel.';
  if (who) {
    subtitle = `Signed in as ${who}. Review your upcoming visits at Cedar Hollow Health, reschedule, or cancel.`;
  }
  if (typeof upcomingCount === 'number' && upcomingCount > 0) {
    const noun = upcomingCount === 1 ? 'visit' : 'visits';
    subtitle = `${subtitle} You have ${upcomingCount} upcoming ${noun}.`;
  }

  const bookAction = onBook ? (
    <Button variant="primary" onClick={onBook}>
      <Icon name="plus" size={16} /> Book a visit
    </Button>
  ) : (
    <Button variant="primary" to="/patient/book">
      <Icon name="plus" size={16} /> Book a visit
    </Button>
  );

  return (
    <PageHeader
      eyebrow="Patient portal"
      title="My appointments"
      subtitle={subtitle}
      actions={
        <div className="ds-cluster">
          {bookAction}
          <Button variant="secondary" to="/patient">
            <Icon name="home" size={16} /> Back to home
          </Button>
        </div>
      }
    />
  );
}