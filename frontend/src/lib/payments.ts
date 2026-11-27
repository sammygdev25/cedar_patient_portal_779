import api from '../api';

// kind: what the row is (a bill, a pharmacy order) when the app charges more than one model; omitted for the main one.
export async function startCheckout(orderId: number, kind?: string): Promise<{ url: string; sessionId: string }> {
  const res = await api.post('/payments/checkout/', kind ? { orderId, kind } : { orderId });
  return res.data as { url: string; sessionId: string };
}

export async function paymentStatus(sessionId: string): Promise<{ orderId: number; paid: boolean }> {
  const res = await api.get('/payments/status/', { params: { session_id: sessionId } });
  return res.data as { orderId: number; paid: boolean };
}

export type PayableOrder = { id: number; amount: number; paid: boolean; kind?: string; label?: string };

// The pay page's read: one order of the caller, served by the payments router itself.
export async function payableOrder(id: number, kind?: string): Promise<PayableOrder> {
  const res = await api.get('/payments/order/', { params: kind ? { order: id, kind } : { order: id } });
  return res.data as PayableOrder;
}

export type UnpaidOrder = { id: number; amount: number; kind?: string; label?: string };

// The caller's unpaid orders, for the notice above every page (PX.151).
export async function unpaidOrders(): Promise<UnpaidOrder[]> {
  const res = await api.get('/payments/unpaid/');
  return Array.isArray(res.data) ? (res.data as UnpaidOrder[]) : [];
}
