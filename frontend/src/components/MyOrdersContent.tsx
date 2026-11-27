import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { Badge, Button, EmptyState, LoadingBlock, Price, Section } from '../components/ui';
import { Icon } from '../components/icons';

interface MyOrdersContentProps {
  orders: Order[];
  loading?: boolean;
  cancellingId?: number | null;
  onCancel?: (orderId: number) => void;
  onSelect?: (order: Order) => void;
}

interface OrderLine {
  product_name?: string;
  medicine_name?: string;
  quantity?: number;
}

type BadgeTone = 'neutral' | 'primary' | 'soft' | 'success' | 'danger';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending payment',
  received: 'Received',
  approved: 'Approved',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

function toneFor(status: string): BadgeTone {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'rejected') return 'danger';
  if (status === 'pending_payment') return 'neutral';
  return 'primary';
}

function linesOf(order: Order): OrderLine[] {
  const items = (order as unknown as { items?: OrderLine[] }).items;
  return Array.isArray(items) ? items : [];
}

function stepsOf(order: Order): string[] {
  const steps = (order as unknown as { allowed_steps?: string[] }).allowed_steps;
  return Array.isArray(steps) ? steps : [];
}

function formatPlaced(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function itemSummary(order: Order): string {
  const lines = linesOf(order);
  if (lines.length === 0) return 'No items';
  const first = lines[0];
  const name = first.product_name || first.medicine_name || 'Item';
  const firstText = `${name} x${first.quantity ?? 1}`;
  return lines.length > 1 ? `${firstText} +${lines.length - 1} more` : firstText;
}

function MyOrdersContent({ orders, loading = false, cancellingId = null, onCancel, onSelect }: MyOrdersContentProps) {
  const list: Order[] = Array.isArray(orders) ? orders : [];

  if (loading) {
    return (
      <Section>
        <LoadingBlock label="Loading your pharmacy orders" />
      </Section>
    );
  }

  if (list.length === 0) {
    return (
      <Section>
        <EmptyState
          icon="package"
          title="No pharmacy orders yet"
          text="Over-the-counter items and prescription refills from the Cedar Hollow pharmacy will appear here once you place an order."
          action={<Button to="/patient/pharmacy">Browse the pharmacy</Button>}
        />
      </Section>
    );
  }

  return (
    <Section
      eyebrow="Pharmacy"
      title="Your orders"
      subtitle="Track pickup and home delivery orders from placement to hand-off."
    >
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Placed</th>
              <th>Items</th>
              <th>Fulfillment</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => {
              const canCancel = stepsOf(order).includes('cancelled') && !!onCancel;
              const needsPayment = order.status === 'pending_payment' && !order.paid_at;
              return (
                <tr key={order.id}>
                  <td>
                    <strong>#{order.id}</strong>
                    {order.is_prescription_order && (
                      <div className="ds-small ds-muted">
                        <Icon name="shield" size={14} /> Prescription
                      </div>
                    )}
                  </td>
                  <td>{formatPlaced(order.created_at)}</td>
                  <td>{itemSummary(order)}</td>
                  <td>{order.fulfillment === 'delivery' ? 'Home delivery' : 'Pickup'}</td>
                  <td>
                    <Price value={Number(order.total_amount)} />
                  </td>
                  <td>
                    <Badge tone={toneFor(order.status)}>{STATUS_LABELS[order.status] || order.status}</Badge>
                  </td>
                  <td>
                    <div className="ds-cluster">
                      {needsPayment && (
                        <Link className="btn btn-primary" to={`/order-pay?order=${order.id}`}>
                          Pay now
                        </Link>
                      )}
                      {onSelect && (
                        <Button variant="ghost" onClick={() => onSelect(order)}>
                          Details
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          variant="danger"
                          disabled={cancellingId === order.id}
                          onClick={() => onCancel && onCancel(order.id)}
                        >
                          {cancellingId === order.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default MyOrdersContent;