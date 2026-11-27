import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getOrderList } from '../api';
import type { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/ui';
import DoctorApprovalsHeader from '../components/DoctorApprovalsHeader';
import DoctorApprovalsContent from '../components/DoctorApprovalsContent';

type OrderWithSteps = Order & { allowed_steps?: string[] };

function needsDecision(order: Order): boolean {
  const o = order as OrderWithSteps;
  if (!o.is_prescription_order || o.approval_status !== 'pending') return false;
  if (o.status === 'cancelled' || o.status === 'rejected') return false;
  if (Array.isArray(o.allowed_steps)) {
    return o.allowed_steps.includes('approved') || o.allowed_steps.includes('rejected');
  }
  return true;
}

function readError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.length < 300) return data;
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    const first = body.detail ?? body.status ?? body.error ?? Object.values(body)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return fallback;
}

function DoctorApprovalsPage() {
  const { user } = useAuth();
  const role = (user as unknown as { role?: string } | null)?.role;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async (silent: boolean) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await getOrderList();
      setOrders(Array.isArray(list) ? list.filter(needsDecision) : []);
      setError('');
    } catch (err) {
      setError(readError(err, 'We could not load the prescription orders waiting for your review.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, [load]);

  const flash = (message: string) => {
    setSuccess(message);
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSuccess(''), 2000);
  };

  const decide = async (orderId: number, status: 'approved' | 'rejected') => {
    setBusyId(orderId);
    setError('');
    try {
      await api.patch(`/orders/${orderId}/`, { status });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      flash(status === 'approved' ? `Order #${orderId} approved for the pharmacy` : `Order #${orderId} rejected`);
    } catch (err) {
      setError(readError(err, `Order #${orderId} could not be updated. Please try again.`));
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (orderId: number) => {
    void decide(orderId, 'approved');
  };

  const handleReject = (orderId: number) => {
    void decide(orderId, 'rejected');
  };

  return (
    <>
      <DoctorApprovalsHeader
        pendingCount={orders.length}
        refreshing={refreshing}
        onRefresh={() => {
          void load(true);
        }}
      />
      {role && role !== 'doctor' && (
        <div className="ds-container">
          <Alert tone="danger">Only doctors can approve or reject prescription orders.</Alert>
        </div>
      )}
      {success && (
        <div className="ds-container">
          <Alert tone="success">{success}</Alert>
        </div>
      )}
      <DoctorApprovalsContent
        orders={orders}
        loading={loading}
        error={error}
        busyId={busyId}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}

export default DoctorApprovalsPage;