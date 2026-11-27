import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface PharmacyDeskHeaderProps {
  openOrderCount?: number;
  stockShortCount?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function PharmacyDeskHeader({
  openOrderCount,
  stockShortCount,
  refreshing = false,
  onRefresh,
}: PharmacyDeskHeaderProps) {
  const hasOpen = typeof openOrderCount === 'number';
  const hasShort = typeof stockShortCount === 'number' && stockShortCount > 0;

  return (
    <>
      <PageHeader
        eyebrow="Reception · Pharmacy desk"
        title="Pharmacy desk"
        subtitle="Work the Cedar Hollow Health pharmacy queue: confirm paid orders, pack them, and hand them over for pickup or send them out for home delivery."
        actions={
          <Cluster gap="sm">
            {onRefresh && (
              <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
                <Icon name="refresh" size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh queue'}
              </Button>
            )}
            <Button variant="primary" to="/staff/reception/inventory">
              <Icon name="package" size={16} />
              Inventory
            </Button>
          </Cluster>
        }
      />
      {(hasOpen || hasShort) && (
        <Cluster gap="sm">
          {hasOpen && (
            <Badge tone="soft">
              {openOrderCount} open {openOrderCount === 1 ? 'order' : 'orders'}
            </Badge>
          )}
          {hasShort && (
            <Badge tone="danger">
              {stockShortCount} {stockShortCount === 1 ? 'order' : 'orders'} short on stock
            </Badge>
          )}
        </Cluster>
      )}
    </>
  );
}