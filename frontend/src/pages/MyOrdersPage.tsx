import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getOrderList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { Order } from '../types';
import { Alert, Button, Section, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import MyOrdersHeader from '../components/MyOrdersHeader';
import MyOrdersContent from '../components/MyOrdersContent';
import OrderCard from '../components/OrderCard';
import OrderStatusTracker from '../components/OrderStatusTracker';

type OrderWithSteps = Order & { allowed_steps?: string[] };

const CLOSED_STATUSES = ['delivered', 'cancelled', 'rejected'];

interface AccountShape {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
}

function MyOrdersPage() {
  const { user } = useAuth();
  const account = (user || {}) as unknown as AccountShape;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const list = await getOrderList();
      setOrders(Array.isArray(list) ? list : []);
      setError('');
    } catch {
      setError('We could not load your pharmacy orders. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleCancel = async (orderId: number) => {
    const target = orders.find((o) => o.id === orderId) as OrderWithSteps | undefined;
    if (target && Array.isArray(target.allowed_steps) && !target.allowed_steps.includes('cancelled')) {
      setError('This order can no longer be cancelled online. Please call the pharmacy desk.');
      return;
    }
    setCancellingId(orderId);
    setError('');
    try {
      await api.patch(`/orders/${orderId}/`, { status: 'cancelled' });
      setNotice(`Order #${orderId} was cancelled.`);
      await loadOrders();
    } catch {
      setError(`Order #${orderId} could not be cancelled. It may already be in progress.`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleSelect = (order: Order) => {
    setSelectedId((current) => (current === order.id ? null : order.id));
  };

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId]
  );

  const openCount = useMemo(
    () => orders.filter((o) => !CLOSED_STATUSES.includes(String(o.status))).length,
    [orders]
  );

  const fullName = [account.first_name, account.last_name].filter(Boolean).join(' ').trim();
  const userName = fullName || account.username || '';
  const role = account.role || 'patient';

  return (
    <div className="ds-stack-lg">
      <MyOrdersHeader
        userName={userName}
        userEmail={account.email || ''}
        orderCount={orders.length}
        openCount={openCount}
      />

      {(error || notice) && (
        <Section tight>
          {error && <Alert tone="danger">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
        </Section>
      )}

      <MyOrdersContent
        orders={orders}
        loading={loading}
        cancellingId={cancellingId}
        onCancel={handleCancel}
        onSelect={handleSelect}
      />

      {selected && (
        <Section
          eyebrow="Order details"
          title={`Order #${selected.id}`}
          subtitle="Follow your prescription or over-the-counter order from payment to pickup or delivery."
          actions={
            <Button variant="ghost" onClick={() => setSelectedId(null)}>
              <Icon name="close" size={16} /> Close
            </Button>
          }
          tight
        >
          <Stack gap="md">
            <OrderStatusTracker
              status={String(selected.status)}
              fulfillment={String(selected.fulfillment)}
              approvalStatus={String(selected.approval_status)}
            />
            <OrderCard order={selected} role={role} />
            {!selected.paid_at && selected.status !== 'cancelled' && selected.status !== 'rejected' && (
              <div>
                <Button variant="primary" to={`/order-pay?order=${selected.id}`}>
                  <Icon name="credit-card" size={16} /> Pay now
                </Button>
              </div>
            )}
          </Stack>
        </Section>
      )}
    </div>
  );
}

export default MyOrdersPage;