import { Card, CardBody, CardTitle, CardMeta, Cluster, Stack, Media, Price, Button, Badge } from './ui';
import { Icon } from './icons';
import type { CartItem } from '../contexts/CartContext';

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

const MAX_QUANTITY = 99;

function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  const { product, quantity } = item;
  const unitPrice = Number(product.price) || 0;
  const lineTotal = unitPrice * quantity;
  const stockLimit =
    typeof product.stock_quantity === 'number' && product.stock_quantity > 0
      ? Math.min(MAX_QUANTITY, product.stock_quantity)
      : MAX_QUANTITY;
  const lowStock = typeof product.stock_quantity === 'number' && product.stock_quantity > 0 && quantity >= product.stock_quantity;

  const decrease = () => {
    if (quantity <= 1) {
      onRemove(product.id);
      return;
    }
    onQuantityChange(product.id, quantity - 1);
  };

  const increase = () => {
    if (quantity >= stockLimit) return;
    onQuantityChange(product.id, quantity + 1);
  };

  return (
    <Card>
      <CardBody>
        <Cluster gap="md" align="center" justify="between">
          <Cluster gap="md" align="center">
            <div style={{ width: 88, flexShrink: 0 }}>
              <Media src={product.image || ''} alt={product.name} ratio="square" />
            </div>
            <Stack gap="xs">
              <CardTitle>{product.name}</CardTitle>
              <CardMeta>
                <Price value={unitPrice} /> each
              </CardMeta>
              {lowStock && <Badge tone="soft">Maximum available in stock</Badge>}
            </Stack>
          </Cluster>

          <Cluster gap="md" align="center">
            <Cluster gap="xs" align="center">
              <Button
                variant="secondary"
                aria-label={quantity <= 1 ? `Remove ${product.name} from cart` : `Decrease quantity of ${product.name}`}
                onClick={decrease}
              >
                <Icon name="minus" size={16} />
              </Button>
              <strong aria-live="polite" style={{ minWidth: 28, textAlign: 'center' }}>
                {quantity}
              </strong>
              <Button
                variant="secondary"
                aria-label={`Increase quantity of ${product.name}`}
                onClick={increase}
                disabled={quantity >= stockLimit}
              >
                <Icon name="plus" size={16} />
              </Button>
            </Cluster>

            <strong>
              <Price value={lineTotal} />
            </strong>

            <Button variant="ghost" aria-label={`Remove ${product.name} from cart`} onClick={() => onRemove(product.id)}>
              <Icon name="trash" size={18} />
            </Button>
          </Cluster>
        </Cluster>
      </CardBody>
    </Card>
  );
}

export default CartItemRow;