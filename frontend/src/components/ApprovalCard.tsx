import { useState } from 'react';
import type { Order } from '../types';
import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, Stack, Cluster } from './ui';
import { Icon } from './icons';

interface ApprovalLine {
  id?: number;
  product_name?: string;
  medicine_name?: string;
  quantity?: number;
  unit_price?: string | number;
}

interface ApprovalOrderView {
  items?: ApprovalLine[];
  allowed_steps?: string[];
  stock_short?: boolean;
}

interface ApprovalCardProps {
  order: Order;
  onApprove: (orderId: number) => void | Promise<unknown>;
  onReject: (orderId: number) => void | Promise<unknown>;
}

function formatMoney(value: string | number | null | undefined): string {
  const amount = Number(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ApprovalCard({ order, onApprove, onReject }: ApprovalCardProps) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const view = order as unknown as ApprovalOrderView;
  const items: ApprovalLine[] = Array.isArray(view.items) ? view.items : [];
  const steps: string[] = Array.isArray(view.allowed_steps) ? view.allowed_steps : [];
  const canApprove = steps.includes('approved');
  const canReject = steps.includes('rejected');
  const orderId = order.id as number;

  const run = async (kind: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(kind);
    try {
      await Promise.resolve(kind === 'approve' ? onApprove(orderId) : onReject(orderId));
    } finally {
      setBusy(null);
    }
  };

  const isDelivery = order.fulfillment === 'delivery';

  return (
    <Card>
      <CardBody>
        <Stack gap="sm">
          <Cluster justify="between" align="center">
            <CardTitle>Prescription order #{orderId}</CardTitle>
            <Badge tone="soft">{String(order.approval_status || 'pending').replace(/_/g, ' ')}</Badge>
          </Cluster>
          <CardMeta>
            Placed {formatDate(order.created_at as string)} &middot;{' '}
            {isDelivery ? 'Home delivery' : 'Clinic pickup'}
          </CardMeta>

          {view.stock_short && (
            <Badge tone="danger">
              <Icon name="alert" size={14} /> Some items are low on stock
            </Badge>
          )}

          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="ds-muted">
                      No medicines listed on this order.
                    </td>
                  </tr>
                ) : (
                  items.map((line, index) => (
                    <tr key={line.id ?? index}>
                      <td>{line.product_name || line.medicine_name || 'Medicine'}</td>
                      <td>{line.quantity ?? 1}</td>
                      <td>{formatMoney(line.unit_price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isDelivery && order.delivery_address ? (
            <p className="ds-small ds-muted">
              <Icon name="map-pin" size={14} /> Deliver to: {order.delivery_address}
            </p>
          ) : null}
          {order.notes ? (
            <p className="ds-small ds-muted">
              <Icon name="message" size={14} /> Patient note: {order.notes}
            </p>
          ) : null}

          <Cluster justify="between" align="center">
            <span className="ds-muted ds-small">Order total</span>
            <strong>{formatMoney(order.total_amount as string | number)}</strong>
          </Cluster>
        </Stack>
      </CardBody>
      <CardFooter>
        <Cluster justify="end">
          {canReject && (
            <Button variant="danger" onClick={() => run('reject')} disabled={busy !== null}>
              <Icon name="close" size={16} /> {busy === 'reject' ? 'Rejecting...' : 'Reject'}
            </Button>
          )}
          {canApprove && (
            <Button variant="primary" onClick={() => run('approve')} disabled={busy !== null}>
              <Icon name="check" size={16} /> {busy === 'approve' ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {!canApprove && !canReject && (
            <span className="ds-muted ds-small">No action available for this order right now.</span>
          )}
        </Cluster>
      </CardFooter>
    </Card>
  );
}

export default ApprovalCard;