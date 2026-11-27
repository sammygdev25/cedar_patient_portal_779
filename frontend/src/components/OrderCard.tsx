import { Link } from 'react-router-dom';
import type { Order } from '../types';
import OrderStatusTracker from './OrderStatusTracker';
import { Alert, Badge, Card, CardBody, CardFooter, CardMeta, CardTitle, Price } from './ui';
import { Icon } from './icons';

interface OrderLine {
  id?: number;
  product?: number | null;
  product_name?: string;
  medicine_name?: string;
  quantity?: number;
  unit_price?: number | string;
  is_out_of_stock?: boolean;
}

interface OrderExtras {
  items?: OrderLine[];
  allowed_steps?: string[];
  stock_short?: boolean;
}

interface OrderCardProps {
  order: Order;
  role: string;
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

const APPROVAL_LABELS: Record<string, string> = {
  pending: 'Awaiting doctor approval',
  approved: 'Doctor approved',
  rejected: 'Doctor declined',
};

function statusTone(status: string): BadgeTone {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'rejected') return 'danger';
  if (status === 'pending_payment') return 'neutral';
  return 'primary';
}

function formatMoney(value: number | string | undefined | null): string {
  const amount = Number(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function formatPlacedOn(value: string | undefined | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function OrderCard({ order, role }: OrderCardProps) {
  const extras = order as unknown as OrderExtras;
  const items: OrderLine[] = Array.isArray(extras.items) ? extras.items : [];
  const isStaff = role === 'doctor' || role === 'receptionist';
  const isDelivery = order.fulfillment === 'delivery';
  const status = String(order.status);
  const approvalStatus = String(order.approval_status);
  const total = Number(order.total_amount) || 0;
  const deliveryFee = Number(order.delivery_fee) || 0;
  const placedOn = formatPlacedOn(order.created_at);
  const needsPayment =
    !isStaff && !order.paid_at && status === 'pending_payment';
  const showApproval = !!order.is_prescription_order && approvalStatus !== 'not_required';

  return (
    <Card>
      <CardBody>
        <div className="ds-stack">
          <div className="ds-between">
            <div>
              <CardTitle>Order #{order.id}</CardTitle>
              <CardMeta>
                {placedOn ? `Placed ${placedOn}` : 'Cedar Hollow Pharmacy'}
                {order.is_prescription_order ? ' · Prescription order' : ''}
              </CardMeta>
            </div>
            <div className="ds-cluster">
              {showApproval && (
                <Badge tone={approvalStatus === 'rejected' ? 'danger' : approvalStatus === 'approved' ? 'success' : 'soft'}>
                  {APPROVAL_LABELS[approvalStatus] || approvalStatus}
                </Badge>
              )}
              <Badge tone={statusTone(status)}>{STATUS_LABELS[status] || status}</Badge>
            </div>
          </div>

          {isStaff && extras.stock_short && (
            <Alert tone="danger">
              <span className="ds-cluster">
                <Icon name="alert" size={16} />
                Stock ran out after payment. Check the items below before packing.
              </span>
            </Alert>
          )}

          <OrderStatusTracker
            status={status}
            fulfillment={String(order.fulfillment)}
            approvalStatus={approvalStatus}
          />

          <div className="ds-stack">
            {items.length === 0 ? (
              <span className="ds-small ds-muted">No items on this order.</span>
            ) : (
              items.map((item, index) => {
                const quantity = Number(item.quantity) || 1;
                const unit = Number(item.unit_price) || 0;
                return (
                  <div className="ds-between" key={item.id ?? index}>
                    <span className="ds-cluster">
                      <Icon name="package" size={16} />
                      <span>
                        {item.product_name || item.medicine_name || 'Medicine'}
                        <span className="ds-muted"> × {quantity}</span>
                      </span>
                      {item.is_out_of_stock && <Badge tone="danger">Out of stock</Badge>}
                    </span>
                    <span className="ds-small">{formatMoney(unit * quantity)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="ds-stack">
            <span className="ds-small ds-muted ds-cluster">
              <Icon name={isDelivery ? 'truck' : 'map-pin'} size={16} />
              {isDelivery
                ? `Home delivery${order.delivery_address ? ` to ${order.delivery_address}` : ''}`
                : 'Pickup at the Cedar Hollow Health pharmacy desk'}
            </span>
            {order.phone ? (
              <span className="ds-small ds-muted ds-cluster">
                <Icon name="phone" size={16} />
                {order.phone}
              </span>
            ) : null}
            {order.notes ? (
              <span className="ds-small ds-muted ds-cluster">
                <Icon name="info" size={16} />
                {order.notes}
              </span>
            ) : null}
          </div>
        </div>
      </CardBody>
      <CardFooter>
        <div className="ds-between">
          <div className="ds-stack">
            {deliveryFee > 0 && (
              <span className="ds-small ds-muted">Includes {formatMoney(deliveryFee)} delivery</span>
            )}
            <span className="ds-cluster">
              <span className="ds-muted">Total</span>
              <Price value={total} />
            </span>
          </div>
          {needsPayment && (
            <Link className="btn btn-primary" to={`/order-pay?order=${order.id}`}>
              Pay now
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default OrderCard;