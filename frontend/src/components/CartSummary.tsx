import { Badge, Button, Card, CardBody, CardMeta, CardTitle, Cluster, Price, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { CartItem } from '../contexts/CartContext';

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  fulfillment: string;
  onCheckout?: () => void;
  checkoutLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function CartSummary({
  items,
  subtotal,
  deliveryFee,
  fulfillment,
  onCheckout,
  checkoutLabel,
  submitting = false,
  disabled = false,
}: CartSummaryProps) {
  const lines = Array.isArray(items) ? items : [];
  const isDelivery = fulfillment === 'delivery';
  const safeSubtotal = toNumber(subtotal);
  const safeFee = isDelivery ? toNumber(deliveryFee) : 0;
  const estimatedTotal = safeSubtotal + safeFee;
  const unitCount = lines.reduce((sum, line) => sum + toNumber(line.quantity), 0);
  const isEmpty = lines.length === 0;

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Cluster justify="between" align="center">
            <CardTitle>Order summary</CardTitle>
            <Badge tone="soft">
              {unitCount} {unitCount === 1 ? 'item' : 'items'}
            </Badge>
          </Cluster>

          {isEmpty ? (
            <CardMeta>Your pharmacy cart is empty. Add over-the-counter products to get started.</CardMeta>
          ) : (
            <Stack gap="xs">
              {lines.map((line) => (
                <Cluster key={line.product.id} justify="between" align="center">
                  <span className="ds-small">
                    {line.product.name} × {line.quantity}
                  </span>
                  <span className="ds-small ds-muted">
                    <Price value={toNumber(line.product.price) * toNumber(line.quantity)} />
                  </span>
                </Cluster>
              ))}
            </Stack>
          )}

          <Stack gap="xs">
            <Cluster justify="between" align="center">
              <span className="ds-muted">Subtotal</span>
              <Price value={safeSubtotal} />
            </Cluster>
            <Cluster justify="between" align="center">
              <span className="ds-muted">
                <Icon name={isDelivery ? 'truck' : 'map-pin'} size={16} />{' '}
                {isDelivery ? 'Home delivery' : 'Clinic pickup'}
              </span>
              {isDelivery && safeFee > 0 ? <Price value={safeFee} /> : <Badge tone="success">Free</Badge>}
            </Cluster>
            <Cluster justify="between" align="center">
              <strong>Estimated total</strong>
              <Price value={estimatedTotal} />
            </Cluster>
          </Stack>

          <p className="ds-help">
            {isDelivery
              ? 'Cedar Hollow Health pharmacy delivers to your address once your order is packed.'
              : 'Collect your order from the Cedar Hollow Health pharmacy desk once it is packed.'}{' '}
            The final total is confirmed when you place the order.
          </p>

          {onCheckout && (
            <Button
              variant="primary"
              size="lg"
              onClick={onCheckout}
              disabled={disabled || isEmpty || submitting}
            >
              <Icon name="credit-card" size={18} />{' '}
              {submitting ? 'Placing order…' : checkoutLabel || 'Place order'}
            </Button>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}

export default CartSummary;