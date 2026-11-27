import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionBillingHeaderProps {
  unpaidCount?: number;
  outstandingTotal?: number;
  onNewInvoice?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function ReceptionBillingHeader({
  unpaidCount,
  outstandingTotal,
  onNewInvoice,
  onRefresh,
  refreshing = false,
}: ReceptionBillingHeaderProps) {
  const hasUnpaid = typeof unpaidCount === 'number';
  const hasTotal = typeof outstandingTotal === 'number';

  const actions = (
    <Cluster gap="sm" align="center">
      {hasUnpaid && (
        <Badge tone={unpaidCount > 0 ? 'primary' : 'success'}>
          {unpaidCount} unpaid
        </Badge>
      )}
      {hasTotal && (
        <Badge tone="soft">
          <Icon name="dollar" size={14} />
          {' '}
          {outstandingTotal.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}{' '}
          outstanding
        </Badge>
      )}
      {onRefresh && (
        <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
          <Icon name="refresh" size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
      {onNewInvoice && (
        <Button variant="primary" onClick={onNewInvoice}>
          <Icon name="plus" size={16} />
          New bill
        </Button>
      )}
    </Cluster>
  );

  return (
    <PageHeader
      eyebrow="Reception"
      title="Patient billing"
      subtitle="Create bills for Cedar Hollow Health visits and services, then track which ones patients have paid through Stripe. A bill is marked paid as soon as the payment succeeds."
      actions={actions}
    />
  );
}