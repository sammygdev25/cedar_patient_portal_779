import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { getOrderList, updateOrder, updateOrderItem } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PharmacyDeskHeader from '../components/PharmacyDeskHeader';
import PharmacyDeskContent from '../components/PharmacyDeskContent';
import { Alert, Section } from '../components/ui';

type DeskOrders = NonNullable<ComponentProps<typeof PharmacyDeskContent>['orders']>;

interface OrderFlags {
  status?: string;
  stock_short?: boolean;
}

const CLOSED_STATUSES = ['delivered', 'cancelled', 'rejected', 'pending_payment'];

function errorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof response === 'string' && response) return response;
  if (response && typeof response === 'object') {
    const data = response as Record<string, unknown>;
    if (typeof data.detail === 'string') return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function PharmacyDeskPage() {
  const { user } = useAuth();
  const role = (user as unknown as { role?: string } | null)?.role;
  const isStaff = role === 'receptionist' || role === 'doctor';

  const [orders, setOrders] = useState<DeskOrders>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadOrders = useCallback(async (silent: boolean) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await getOrderList();
      const all = (Array.isArray(list) ? list : []) as unknown as DeskOrders;
      const visible = all.filter((order) => {
        const status = (order as unknown as OrderFlags).status ?? '';
        return !(status === 'pending_payment');
      });
      setOrders(visible);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'We could not load the pharmacy queue. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) {
      loadOrders(false);
    } else {
      setLoading(false);
    }
  }, [isStaff, loadOrders]);

  const handleChangeStatus = useCallback(
    async (orderId: number, status: string) => {
      try {
        await updateOrder(orderId, { status });
        setError('');
        await loadOrders(true);
      } catch (err) {
        setError(errorMessage(err, 'That order could not be moved to the next step.'));
      }
    },
    [loadOrders]
  );

  const handleToggleOutOfStock = useCallback(
    async (_orderId: number, itemId: number, value: boolean) => {
      try {
        await updateOrderItem(itemId, { is_out_of_stock: value });
        setError('');
        await loadOrders(true);
      } catch (err) {
        setError(errorMessage(err, 'The stock flag could not be updated.'));
      }
    },
    [loadOrders]
  );

  const handleRefresh = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const openOrderCount = useMemo(
    () =>
      orders.filter((order) => !CLOSED_STATUSES.includes((order as unknown as OrderFlags).status ?? '')).length,
    [orders]
  );

  const stockShortCount = useMemo(
    () => orders.filter((order) => (order as unknown as OrderFlags).stock_short === true).length,
    [orders]
  );

  if (!isStaff && !loading) {
    return (
      <Section narrow title="Pharmacy desk">
        <Alert tone="danger">
          The pharmacy desk is for Cedar Hollow Health reception and clinical staff. Please sign in with a staff account.
        </Alert>
      </Section>
    );
  }

  return (
    <div className="ds-stack-lg">
      <PharmacyDeskHeader
        openOrderCount={openOrderCount}
        stockShortCount={stockShortCount}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <PharmacyDeskContent
        orders={orders}
        loading={loading}
        error={error}
        onChangeStatus={handleChangeStatus}
        onToggleOutOfStock={handleToggleOutOfStock}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export default PharmacyDeskPage;