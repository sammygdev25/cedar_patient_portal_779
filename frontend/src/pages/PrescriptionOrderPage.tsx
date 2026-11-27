import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getPrescriptionList } from '../api';
import type { Prescription } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button, Stack, Cluster } from '../components/ui';
import PrescriptionOrderHeader from '../components/PrescriptionOrderHeader';
import PrescriptionOrderContent from '../components/PrescriptionOrderContent';
import DeliveryDetailsForm from '../components/DeliveryDetailsForm';

type DeliveryDetailsValue = ComponentProps<typeof DeliveryDetailsForm>['value'];

const EMPTY_DETAILS = {
  delivery_address: '',
  phone: '',
  notes: '',
} as unknown as DeliveryDetailsValue;

function readField(details: DeliveryDetailsValue, keys: string[]): string {
  const record = details as unknown as Record<string, unknown>;
  for (const key of keys) {
    const found = record[key];
    if (typeof found === 'string' && found.trim()) return found.trim();
  }
  return '';
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const first = record.detail ?? record.error ?? record.items ?? Object.values(record)[0];
    if (Array.isArray(first) && first.length > 0) {
      const head = first[0];
      if (typeof head === 'string') return head;
      if (head && typeof head === 'object') {
        const inner = Object.values(head as Record<string, unknown>)[0];
        if (Array.isArray(inner) && typeof inner[0] === 'string') return inner[0];
        if (typeof inner === 'string') return inner;
      }
    }
    if (typeof first === 'string') return first;
  }
  return 'We could not place your prescription order. Please try again.';
}

function PrescriptionOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fulfillment, setFulfillment] = useState<string>('pickup');
  const [details, setDetails] = useState<DeliveryDetailsValue>(EMPTY_DETAILS);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPrescriptionList();
      const safe = Array.isArray(list) ? list : [];
      setPrescriptions(safe.filter((p) => p.is_active && p.product !== null && p.product !== undefined));
    } catch (err) {
      setPrescriptions([]);
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadPrescriptions();
  }, [user, loadPrescriptions]);

  const selected = useMemo(
    () => prescriptions.find((p) => p.id === selectedId) || null,
    [prescriptions, selectedId]
  );

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setError('');
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError('Choose one of your prescriptions to order.');
      return;
    }
    const address = readField(details, ['delivery_address', 'address']);
    const phone = readField(details, ['phone']);
    const notes = readField(details, ['notes']);
    if (fulfillment === 'delivery' && !address) {
      setError('Enter a delivery address, or switch to pickup at the clinic pharmacy.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        items: [{ prescription: selected.id }],
        fulfillment,
        delivery_address: fulfillment === 'delivery' ? address : '',
        phone,
        notes,
      } as unknown as Parameters<typeof createOrder>[0];
      const order = await createOrder(payload);
      const orderId = (order as unknown as { id?: number })?.id;
      navigate(orderId ? `/order-pay?order=${orderId}` : '/patient/orders');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-stack-lg">
      <PrescriptionOrderHeader
        prescriptionCount={prescriptions.length}
        loading={loading}
        onViewOrders={() => navigate('/patient/orders')}
      />
      <PrescriptionOrderContent
        prescriptions={prescriptions}
        loading={loading}
        selectedId={selectedId}
        onSelect={handleSelect}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      >
        <Stack gap="md">
          <Cluster gap="sm">
            <Button
              type="button"
              variant={fulfillment === 'pickup' ? 'primary' : 'secondary'}
              onClick={() => setFulfillment('pickup')}
            >
              Pickup at the clinic
            </Button>
            <Button
              type="button"
              variant={fulfillment === 'delivery' ? 'primary' : 'secondary'}
              onClick={() => setFulfillment('delivery')}
            >
              Home delivery
            </Button>
          </Cluster>
          <DeliveryDetailsForm value={details} onChange={setDetails} fulfillment={fulfillment} />
        </Stack>
      </PrescriptionOrderContent>
    </div>
  );
}

export default PrescriptionOrderPage;