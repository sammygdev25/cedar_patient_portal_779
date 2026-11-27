import { Badge, Button, PageHeader } from '../components/ui';
import { Icon } from '../components/icons';

interface CartHeaderProps {
  itemCount?: number;
  onClear?: () => void;
}

export default function CartHeader({ itemCount = 0, onClear }: CartHeaderProps) {
  const count = Number.isFinite(itemCount) ? Math.max(0, itemCount) : 0;
  const countLabel = count === 1 ? '1 item' : `${count} items`;

  const subtitle =
    count > 0
      ? `${countLabel} from the Cedar Hollow Health pharmacy. Choose pickup at the clinic or home delivery at checkout.`
      : 'Your cart is empty. Browse over-the-counter medicines from the Cedar Hollow Health pharmacy.';

  return (
    <PageHeader
      eyebrow="Pharmacy"
      title="Your cart"
      subtitle={subtitle}
      actions={
        <div className="ds-cluster">
          <Badge tone="soft">
            <Icon name="cart" size={16} /> {countLabel}
          </Badge>
          <Button variant="secondary" to="/patient/pharmacy">
            <Icon name="arrow-left" size={16} /> Continue shopping
          </Button>
          {count > 0 && onClear && (
            <Button variant="ghost" onClick={onClear}>
              <Icon name="trash" size={16} /> Clear cart
            </Button>
          )}
        </div>
      }
    />
  );
}