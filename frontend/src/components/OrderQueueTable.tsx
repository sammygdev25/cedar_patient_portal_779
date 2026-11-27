import type { Order, OrderItem } from '../types';
import { Alert, Badge, Button, EmptyState } from './ui';
import { Icon } from './icons';
import OrderItemStockToggle from './OrderItemStockToggle';

type QueueItem = OrderItem & { product_name?: string };

type QueueOrder = Order & {
  items?: QueueItem[];
  allowed_steps?: string[];
  stock_short?: boolean;
};

interface OrderQueueTableProps {
  orders: QueueOrder[];
  onChangeStatus: (orderId: number, status: string) => void;
  onToggleOutOfStock: (itemId: number, isOutOfStock: boolean) => void;
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

const STATUS_TONES: Record<string, BadgeTone> = {
  pending_payment: 'neutral',
  received: 'soft',
  approved: 'primary',
  packed: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'danger',
  rejected: 'danger',
};

const STEP_LABELS: Record<string, string> = {
  received: 'Mark received',
  approved: 'Approve',
  packed: 'Mark packed',
  out_for_delivery: 'Send out for delivery',
  delivered: 'Mark delivered',
  cancelled: 'Cancel order',
  rejected: 'Reject',
};

function formatMoney(value: unknown): string {
  const amount = Number(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function formatPlaced(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function OrderQueueTable({ orders, onChangeStatus, onToggleOutOfStock }: OrderQueueTableProps) {
  const rows: QueueOrder[] = Array.isArray(orders) ? orders : [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="The pharmacy queue is clear"
        text="Paid orders from patients will appear here as soon as they come in, ready to be packed for pickup or delivery."
      />
    );
  }

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Fulfillment</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => {
            const items: QueueItem[] = Array.isArray(order.items) ? order.items : [];
            const steps: string[] = Array.isArray(order.allowed_steps) ? order.allowed_steps : [];
            const isDelivery = order.fulfillment === 'delivery';
            const status = String(order.status);

            return (
              <tr key={order.id}>
                <td>
                  <div className="ds-stack" data-gap="xs">
                    <strong>Order #{order.id}</strong>
                    <span className="ds-small ds-muted">{formatPlaced(order.created_at)}</span>
                    {order.is_prescription_order && <Badge tone="soft">Prescription</Badge>}
                  </div>
                </td>
                <td>
                  <div className="ds-stack" data-gap="xs">
                    <span className="ds-cluster">
                      <Icon name={isDelivery ? 'truck' : 'map-pin'} size={16} />
                      {isDelivery ? 'Home delivery' : 'Clinic pickup'}
                    </span>
                    {isDelivery && order.delivery_address && (
                      <span className="ds-small ds-muted">{order.delivery_address}</span>
                    )}
                    {order.phone && (
                      <span className="ds-small ds-muted ds-cluster">
                        <Icon name="phone" size={14} />
                        {order.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {items.length === 0 ? (
                    <span className="ds-small ds-muted">No lines</span>
                  ) : (
                    <div className="ds-stack" data-gap="sm">
                      {items.map((item) => (
                        <div key={item.id} className="ds-between">
                          <span className="ds-small">
                            {item.quantity} × {item.product_name || item.medicine_name}
                          </span>
                          <OrderItemStockToggle
                            item={item}
                            onToggle={() => onToggleOutOfStock(item.id, !item.is_out_of_stock)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {order.stock_short && (
                    <Alert tone="danger">
                      Stock ran short on this paid order. Check the lines marked out of stock before packing.
                    </Alert>
                  )}
                </td>
                <td>
                  <strong>{formatMoney(order.total_amount)}</strong>
                  {Number(order.delivery_fee) > 0 && (
                    <div className="ds-small ds-muted">incl. {formatMoney(order.delivery_fee)} delivery</div>
                  )}
                </td>
                <td>
                  <Badge tone={STATUS_TONES[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>
                </td>
                <td>
                  {steps.length === 0 ? (
                    <span className="ds-small ds-muted">No actions</span>
                  ) : (
                    <div className="ds-cluster">
                      {steps.map((step, index) => (
                        <Button
                          key={step}
                          type="button"
                          variant={step === 'cancelled' || step === 'rejected' ? 'danger' : index === 0 ? 'primary' : 'secondary'}
                          onClick={() => onChangeStatus(order.id, step)}
                        >
                          {STEP_LABELS[step] || STATUS_LABELS[step] || step}
                        </Button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default OrderQueueTable;