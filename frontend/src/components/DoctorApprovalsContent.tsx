import Icon from '../components/icons';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Section, SkeletonCards, Stack } from '../components/ui';
import OrderStatusTracker from './OrderStatusTracker';
import type { Order } from '../types';

interface ApprovalLine {
  id?: number;
  product_name?: string;
  medicine_name?: string;
  quantity?: number;
}

interface ApprovalExtras {
  items?: ApprovalLine[];
  allowed_steps?: string[];
}

interface DoctorApprovalsContentProps {
  orders: Order[];
  loading: boolean;
  error?: string;
  busyId?: number | null;
  onApprove: (orderId: number) => void;
  onReject: (orderId: number) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${Number(amount || 0).toFixed(2)}` : '';
}

function DoctorApprovalsContent({ orders, loading, error, busyId = null, onApprove, onReject }: DoctorApprovalsContentProps) {
  const list: Order[] = Array.isArray(orders) ? orders : [];

  return (
    <Section
      eyebrow="Pharmacy"
      title="Prescription orders awaiting your sign-off"
      subtitle="Review each request from your Cedar Hollow Health patients, then approve it for packing or reject it before it is dispensed."
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading ? (
        <SkeletonCards count={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="check"
          title="No prescription orders to review"
          text="When a patient orders one of your prescriptions from the pharmacy, it will appear here for approval."
        />
      ) : (
        <Grid size="lg">
          {list.map((order) => {
            const extras = order as unknown as ApprovalExtras;
            const lines: ApprovalLine[] = Array.isArray(extras.items) ? extras.items : [];
            const steps: string[] = Array.isArray(extras.allowed_steps) ? extras.allowed_steps : [];
            const canApprove = steps.includes('approved');
            const canReject = steps.includes('rejected');
            const busy = busyId === order.id;

            return (
              <Card key={order.id}>
                <CardBody>
                  <Stack gap="sm">
                    <CardTitle>Order #{order.id}</CardTitle>
                    <CardMeta>
                      Placed {formatDate(order.created_at)} · {order.fulfillment === 'delivery' ? 'Home delivery' : 'Pickup at the clinic'}
                    </CardMeta>
                    <OrderStatusTracker
                      status={order.status}
                      fulfillment={order.fulfillment}
                      approvalStatus={order.approval_status}
                    />
                    <ul className="ds-stack">
                      {lines.map((line, index) => (
                        <li key={line.id ?? index} className="ds-between">
                          <span>{line.product_name || line.medicine_name || 'Prescribed medicine'}</span>
                          <Badge tone="soft">× {line.quantity ?? 1}</Badge>
                        </li>
                      ))}
                    </ul>
                    <p className="ds-small ds-muted">Order total {formatMoney(order.total_amount)}</p>
                  </Stack>
                </CardBody>
                <CardFooter>
                  {canApprove || canReject ? (
                    <Stack gap="sm" justify="end">
                      {canReject ? (
                        <Button variant="danger" disabled={busy} onClick={() => onReject(order.id)}>
                          <Icon name="close" size={16} /> Reject
                        </Button>
                      ) : null}
                      {canApprove ? (
                        <Button variant="primary" disabled={busy} onClick={() => onApprove(order.id)}>
                          <Icon name="check" size={16} /> {busy ? 'Saving...' : 'Approve'}
                        </Button>
                      ) : null}
                    </Stack>
                  ) : (
                    <span className="ds-small ds-muted">No action available for this order.</span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </Grid>
      )}
    </Section>
  );
}

export default DoctorApprovalsContent;