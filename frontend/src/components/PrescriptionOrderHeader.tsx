import { PageHeader, Button, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface PrescriptionOrderHeaderProps {
  prescriptionCount?: number;
  loading?: boolean;
  onViewOrders?: () => void;
}

export default function PrescriptionOrderHeader({
  prescriptionCount,
  loading = false,
  onViewOrders,
}: PrescriptionOrderHeaderProps) {
  const hasCount = typeof prescriptionCount === 'number' && !loading;

  const subtitle = hasCount
    ? prescriptionCount === 0
      ? 'You have no active prescriptions on file yet. Once your doctor writes one at a visit, it will appear here ready to order.'
      : `Choose from your ${prescriptionCount} active ${prescriptionCount === 1 ? 'prescription' : 'prescriptions'} from Cedar Hollow Health. Your prescribing doctor approves the order, then our in-house pharmacy packs it for pickup or delivery.`
    : 'Order the medicines your Cedar Hollow doctor has prescribed. Your prescribing doctor approves the order, then our in-house pharmacy packs it for pickup or delivery.';

  return (
    <div className="ds-stack">
      <PageHeader
        eyebrow="Pharmacy"
        title="Order from a prescription"
        subtitle={subtitle}
        actions={
          <div className="ds-cluster">
            <Button variant="secondary" to="/patient/pharmacy">
              <Icon name="package" size={16} />
              Browse over-the-counter
            </Button>
            {onViewOrders ? (
              <Button variant="ghost" onClick={onViewOrders}>
                <Icon name="list" size={16} />
                My orders
              </Button>
            ) : (
              <Button variant="ghost" to="/patient/orders">
                <Icon name="list" size={16} />
                My orders
              </Button>
            )}
          </div>
        }
      />
      <div className="ds-cluster">
        <Badge tone="soft">
          <Icon name="shield" size={14} /> Doctor approval required
        </Badge>
        <Badge tone="neutral">
          <Icon name="truck" size={14} /> Pickup or home delivery
        </Badge>
        <Badge tone="neutral">
          <Icon name="credit-card" size={14} /> Pay securely after approval
        </Badge>
      </div>
    </div>
  );
}