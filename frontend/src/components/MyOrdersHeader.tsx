import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

interface MyOrdersHeaderUser {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

interface MyOrdersHeaderProps {
  user?: MyOrdersHeaderUser | null;
  userName?: string;
  userEmail?: string;
  orderCount?: number;
  openCount?: number;
}

function MyOrdersHeader({ user, userName, userEmail, orderCount, openCount }: MyOrdersHeaderProps) {
  const auth = useAuth();
  const account = (user ?? (auth.user as unknown as MyOrdersHeaderUser | null)) || null;

  const fullName = account ? `${account.first_name || ''} ${account.last_name || ''}`.trim() : '';
  const email = userEmail || account?.email || '';
  const name = userName || fullName || account?.username || email;

  const subtitle = name
    ? `Pharmacy orders for ${name}${email && email !== name ? ` (${email})` : ''}. Track each order from payment to pickup or home delivery at Cedar Hollow Health.`
    : 'Track each pharmacy order from payment to pickup or home delivery at Cedar Hollow Health.';

  const hasCounts = typeof orderCount === 'number';

  return (
    <PageHeader
      eyebrow="Cedar Hollow Pharmacy"
      title="My orders"
      subtitle={subtitle}
      actions={
        <Cluster gap="sm">
          {hasCounts && (
            <Badge tone="soft">
              <Icon name="package" size={14} /> {orderCount} {orderCount === 1 ? 'order' : 'orders'}
            </Badge>
          )}
          {typeof openCount === 'number' && openCount > 0 && (
            <Badge tone="primary">{openCount} in progress</Badge>
          )}
          <Button variant="secondary" to="/patient/prescription-order">
            <Icon name="plus" size={16} /> Order a prescription
          </Button>
          <Button variant="primary" to="/patient/pharmacy">
            Shop the pharmacy <Icon name="arrow-right" size={16} />
          </Button>
        </Cluster>
      }
    />
  );
}

export default MyOrdersHeader;