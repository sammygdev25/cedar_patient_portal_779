import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import CartHeader from '../components/CartHeader';
import CartItems from '../components/CartItems';
import CartSummary from '../components/CartSummary';
import DeliveryDetailsForm from '../components/DeliveryDetailsForm';
import { Alert, Button, Card, CardBody, CardTitle, Cluster, Stack } from '../components/ui';
import { Icon } from '../components/icons';

type DeliveryDetailsValue = ComponentProps<typeof DeliveryDetailsForm>['value'];
type CreateOrderPayload = Parameters<typeof createOrder>[0];

const EMPTY_DETAILS = { delivery_address: '', phone: '', notes: '' } as unknown as DeliveryDetailsValue;

function describeError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const parts: string[] = [];
    Object.values(data as Record<string, unknown>).forEach((entry) => {
      if (Array.isArray(entry)) parts.push(entry.map(String).join(' '));
      else if (entry) parts.push(String(entry));
    });
    if (parts.length > 0) return parts.join(' ');
  }
  return 'We could not place your order. Please try again.';
}

function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCart();

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [details, setDetails] = useState<DeliveryDetailsValue>(EMPTY_DETAILS);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const phone = (user as unknown as { phone?: string } | null)?.phone;
    if (phone) {
      setDetails((prev) => {
        const current = prev as unknown as Record<string, string>;
        if (current.phone) return prev;
        return { ...current, phone } as unknown as DeliveryDetailsValue;
      });
    }
  }, [user]);

  const prescriptionOnly = useMemo(
    () => items.filter((entry) => entry.product.is_prescription_only),
    [items]
  );

  const addressMissing =
    fulfillment === 'delivery' &&
    !String((details as unknown as Record<string, string>).delivery_address || '').trim();

  const blocked = items.length === 0 || prescriptionOnly.length > 0 || addressMissing;

  const handleCheckout = async () => {
    if (blocked || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const form = details as unknown as Record<string, string>;
      const payload = {
        items: items.map((entry) => ({ product: entry.product.id, quantity: entry.quantity })),
        fulfillment,
        phone: form.phone || '',
        notes: form.notes || '',
        delivery_address: fulfillment === 'delivery' ? form.delivery_address || '' : '',
      };
      const order = await createOrder(payload as unknown as CreateOrderPayload);
      clearCart();
      navigate(`/order-pay?order=${(order as unknown as { id: number }).id}`);
    } catch (err) {
      setError(describeError(err));
      setSubmitting(false);
    }
  };

  const sidebar = (
    <Stack gap="md">
      <Card>
        <CardBody>
          <CardTitle>How would you like to receive it?</CardTitle>
          <Cluster gap="sm">
            <Button
              type="button"
              variant={fulfillment === 'pickup' ? 'primary' : 'secondary'}
              onClick={() => setFulfillment('pickup')}
            >
              <Icon name="home" size={16} /> Pickup at clinic
            </Button>
            <Button
              type="button"
              variant={fulfillment === 'delivery' ? 'primary' : 'secondary'}
              onClick={() => setFulfillment('delivery')}
            >
              <Icon name="truck" size={16} /> Home delivery
            </Button>
          </Cluster>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <DeliveryDetailsForm value={details} onChange={setDetails} fulfillment={fulfillment} />
        </CardBody>
      </Card>

      {prescriptionOnly.length > 0 && (
        <Alert tone="danger">
          {prescriptionOnly.map((entry) => entry.product.name).join(', ')} can only be ordered from a
          prescription. Remove it from your cart or{' '}
          <Link to="/patient/prescription-order">start a prescription order</Link>.
        </Alert>
      )}

      {addressMissing && prescriptionOnly.length === 0 && (
        <Alert tone="neutral">Enter a delivery address to place a home delivery order.</Alert>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <CartSummary
        items={items}
        subtotal={subtotal}
        deliveryFee={0}
        fulfillment={fulfillment}
        onCheckout={handleCheckout}
        checkoutLabel={submitting ? 'Placing order...' : 'Place order and pay'}
        submitting={submitting}
        disabled={blocked}
      />
    </Stack>
  );

  return (
    <div className="ds-stack-lg">
      <CartHeader itemCount={itemCount} onClear={items.length > 0 ? clearCart : undefined} />
      <CartItems
        items={items}
        onQuantityChange={updateQuantity}
        onRemove={removeItem}
        sidebar={items.length > 0 ? sidebar : undefined}
      />
    </div>
  );
}

export default CartPage;