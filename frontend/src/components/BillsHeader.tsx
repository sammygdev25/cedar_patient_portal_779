import { PageHeader, Button, Badge, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface BillsHeaderProps {
  unpaidCount?: number;
  totalDue?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function BillsHeader({ unpaidCount = 0, totalDue = 0, loading = false, onRefresh }: BillsHeaderProps) {
  const hasBalance = unpaidCount > 0;

  const subtitle = hasBalance
    ? `You have ${unpaidCount} unpaid ${unpaidCount === 1 ? 'bill' : 'bills'} from Cedar Hollow Health. Pay securely with Stripe and your receipt is recorded as soon as the payment succeeds.`
    : 'Charges for your visits at Cedar Hollow Health appear here. Pay securely with Stripe and a bill is marked paid as soon as the payment succeeds.';

  return (
    <PageHeader
      eyebrow="Billing"
      title="Your bills"
      subtitle={subtitle}
      actions={
        <Stack gap="sm" align="end">
          <Cluster gap="sm">
            {hasBalance ? (
              <Badge tone="danger">
                <Icon name="dollar" size={14} /> {currency.format(totalDue)} due
              </Badge>
            ) : (
              <Badge tone="success">
                <Icon name="check" size={14} /> All paid up
              </Badge>
            )}
          </Cluster>
          <Cluster gap="sm">
            {onRefresh && (
              <Button variant="ghost" onClick={onRefresh} disabled={loading}>
                <Icon name="refresh" size={16} /> {loading ? 'Refreshing' : 'Refresh'}
              </Button>
            )}
            <Button variant="secondary" to="/patient/appointments">
              <Icon name="calendar" size={16} /> My appointments
            </Button>
          </Cluster>
        </Stack>
      }
    />
  );
}

export default BillsHeader;