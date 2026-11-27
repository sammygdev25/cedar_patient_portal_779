import { PageHeader, Badge, Button } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorApprovalsHeaderProps {
  section?: string;
  page?: string;
  pendingCount?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function DoctorApprovalsHeader({
  pendingCount = 0,
  refreshing = false,
  onRefresh,
}: DoctorApprovalsHeaderProps) {
  const count = Number.isFinite(pendingCount) ? Math.max(0, pendingCount) : 0;
  const waitingLabel =
    count === 0
      ? 'Nothing waiting'
      : count === 1
        ? '1 order waiting'
        : `${count} orders waiting`;

  return (
    <PageHeader
      eyebrow="Pharmacy approvals"
      title="Prescription approvals"
      subtitle="Review prescription orders that patients of Cedar Hollow Health have placed under your name. Approve to release the order to the pharmacy desk for packing, or reject it before it is approved."
      actions={
        <div className="ds-cluster">
          <Badge tone={count > 0 ? 'primary' : 'neutral'}>
            <Icon name="clock" size={14} /> {waitingLabel}
          </Badge>
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
              <Icon name="refresh" size={16} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      }
    />
  );
}