import type { ReactNode } from 'react';
import { Badge, Button, EmptyState, Media, Price, Section, Stack, Cluster, WithSidebar } from '../components/ui';
import { Icon } from '../components/icons';
import type { CartItem } from '../contexts/CartContext';

interface CartItemsProps {
  items?: CartItem[];
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  sidebar?: ReactNode;
}

const MAX_QUANTITY = 99;

function CartItems({ items = [], onQuantityChange, onRemove, sidebar }: CartItemsProps) {
  const lines = Array.isArray(items) ? items : [];

  if (lines.length === 0) {
    return (
      <Section title="Your pharmacy basket" subtitle="Over-the-counter medicines from the Cedar Hollow Health pharmacy.">
        <EmptyState
          icon="cart"
          title="Your basket is empty"
          text="Add pain relief, allergy, cold and vitamin products from our in-house pharmacy for pickup or home delivery."
          action={
            <Button variant="primary" to="/patient/pharmacy">
              Browse the pharmacy
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      title="Your pharmacy basket"
      subtitle={`${lines.length} ${lines.length === 1 ? 'product' : 'products'} ready for pickup or delivery.`}
    >
      <WithSidebar sidebar={sidebar}>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>
                  <span className="ds-small">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ product, quantity }) => {
                const unit = Number(product.price) || 0;
                return (
                  <tr key={product.id}>
                    <td>
                      <Cluster gap="sm" align="center">
                        <div className="ds-media-square">
                          <Media src={product.image || undefined} alt={product.name} ratio="square" />
                        </div>
                        <Stack gap="xs">
                          <strong>{product.name}</strong>
                          {!product.in_stock && <Badge tone="danger">Out of stock</Badge>}
                        </Stack>
                      </Cluster>
                    </td>
                    <td>
                      <Price value={unit} />
                    </td>
                    <td>
                      <Cluster gap="xs" align="center">
                        <Button
                          variant="secondary"
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          disabled={quantity <= 1}
                          onClick={() => onQuantityChange(product.id, quantity - 1)}
                        >
                          <Icon name="minus" size={16} />
                        </Button>
                        <span className="ds-small">{quantity}</span>
                        <Button
                          variant="secondary"
                          type="button"
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={quantity >= MAX_QUANTITY}
                          onClick={() => onQuantityChange(product.id, quantity + 1)}
                        >
                          <Icon name="plus" size={16} />
                        </Button>
                      </Cluster>
                    </td>
                    <td>
                      <Price value={unit * quantity} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        type="button"
                        aria-label={`Remove ${product.name} from basket`}
                        onClick={() => onRemove(product.id)}
                      >
                        <Icon name="trash" size={18} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WithSidebar>
    </Section>
  );
}

export default CartItems;