import { PageHeader, Button, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface PharmacyHeaderProps {
  itemCount?: number;
  title?: string;
  subtitle?: string;
}

export default function PharmacyHeader({
  itemCount = 0,
  title = 'Cedar Hollow Pharmacy',
  subtitle = 'Order over-the-counter medicines and health essentials from our in-house pharmacy. Pick up at the clinic or have them delivered to your door. Prescription items are ordered from your doctor-approved prescriptions.',
}: PharmacyHeaderProps) {
  const count = Number.isFinite(itemCount) && itemCount > 0 ? Math.floor(itemCount) : 0;

  return (
    <PageHeader
      eyebrow="Patient pharmacy"
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Button to="/patient/prescription-order" variant="secondary">
            <Icon name="book" size={18} />
            Order a prescription
          </Button>
          <Button to="/patient/orders" variant="ghost">
            <Icon name="package" size={18} />
            My orders
          </Button>
          <Button to="/patient/cart" variant="primary">
            <Icon name="cart" size={18} />
            View cart
            {count > 0 && <Badge tone="soft">{count}</Badge>}
          </Button>
        </>
      }
    />
  );
}