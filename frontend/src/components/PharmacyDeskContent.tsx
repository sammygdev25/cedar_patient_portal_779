import { useMemo, useState } from 'react';
import type { Order } from '../types';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Price, Section, SkeletonCards, Stack, Cluster, Stat, Grid } from '../components/ui';
import { Icon } from '../components/icons';

interface DeskItem {
  id: number;
  medicine_name?: string;
  product_name?: string;
  quantity?: number;
  is_out_of_stock?: boolean;
}

type DeskOrder = Omit<Order, 'items'> & {
  items?: DeskItem[];
  allowed_steps?: string[];
  stock_short?: boolean;
};

interface PharmacyDeskContentProps {
  orders?: DeskOrder[];
  loading?: boolean;
  error?: string;
  onChangeStatus?: (orderId: number, status: string) => void;
  onToggleOutOfStock?: (orderId: number, itemId: number, value: boolean) => void;
  onRefresh?: () => void;
}

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

const FILTERS = ['all', 'received', 'approved', 'packed', 'out_for_delivery', 'delivered'];

function statusTone(status: string): 'neutral' | 'primary' | 'soft' | 'success' | 'danger' {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'rejected') return 'danger';
  if (status === 'pending_payment') return 'neutral';
  return 'primary';
}

function PharmacyDeskContent({
  orders = [],
  loading = false,
  error = '',
  onChangeStatus,
  onToggleOutOfStock,
  onRefresh,
}: PharmacyDeskContentProps) {
  const [filter, setFilter] = useState<string>('all');
  const list = Array.isArray(orders) ? orders : [];
  const visible = useMemo(
    () => (filter === 'all' ? list : list.filter((o) => o.status === filter)),
    [list, filter]
  );
  const toPack = list.filter((o) => o.status === 'received' || o.status === 'approved').length;
  const shortCount = list.filter((o) => o.stock_short).length;
  const outForDelivery = list.filter((o) => o.status === 'out_for_delivery').length;

  return (
    <Section
      eyebrow="Pharmacy desk"
      title="Order queue"
      subtitle="Pack paid OTC and prescription orders, flag items that are out of stock and move each order to pickup or delivery."
      actions={onRefresh ? <Button variant="secondary" onClick={onRefresh}><Icon name="refresh" /> Refresh</Button> : undefined}
    >
      <Stack gap="lg">
        <Grid size="sm">
          <Stat value={toPack} label="Ready to pack" icon="package" />
          <Stat value={outForDelivery} label="Out for delivery" icon="truck" />
          <Stat value={shortCount} label="Stock shortages" icon="alert" />
        </Grid>
        <Cluster gap="sm">
          {FILTERS.map((f) => (
            <Button key={f} size="md" variant={filter === f ? 'primary' : 'ghost'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All orders' : STATUS_LABELS[f]}
            </Button>
          ))}
        </Cluster>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {loading ? (
          <SkeletonCards count={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="package"
            title="No orders in this queue"
            text="Paid pharmacy orders from patients will appear here as soon as they check out."
            action={filter !== 'all' ? <Button variant="secondary" onClick={() => setFilter('all')}>Show all orders</Button> : undefined}
          />
        ) : (
          <Grid size="lg">
            {visible.map((order) => (
              <Card key={order.id}>
                <CardBody>
                  <Stack gap="sm">
                    <Cluster justify="between">
                      <CardTitle>Order #{order.id}</CardTitle>
                      <Badge tone={statusTone(order.status)}>{STATUS_LABELS[order.status] || order.status}</Badge>
                    </Cluster>
                    <CardMeta>
                      {order.fulfillment === 'delivery' ? 'Home delivery' : 'Clinic pickup'}
                      {order.is_prescription_order ? ' · Prescription order' : ' · Over the counter'}
                    </CardMeta>
                    {order.fulfillment === 'delivery' && order.delivery_address ? (
                      <p className="ds-small ds-muted">{order.delivery_address}</p>
                    ) : null}
                    {order.stock_short ? (
                      <Alert tone="danger">Stock ran out after payment. Check the items below before packing.</Alert>
                    ) : null}
                    {(Array.isArray(order.items) ? order.items : []).map((item) => (
                      <Cluster key={item.id} justify="between">
                        <span>
                          {item.quantity ?? 1} × {item.product_name || item.medicine_name}
                        </span>
                        <Button
                          size="md"
                          variant={item.is_out_of_stock ? 'danger' : 'ghost'}
                          onClick={() => onToggleOutOfStock?.(order.id, item.id, !item.is_out_of_stock)}
                        >
                          {item.is_out_of_stock ? 'Out of stock' : 'Mark out of stock'}
                        </Button>
                      </Cluster>
                    ))}
                  </Stack>
                </CardBody>
                <CardFooter>
                  <Cluster justify="between">
                    <Price value={Number(order.total_amount) || 0} />
                    <Cluster gap="sm">
                      {(Array.isArray(order.allowed_steps) ? order.allowed_steps : []).map((step) => (
                        <Button
                          key={step}
                          size="md"
                          variant={step === 'cancelled' || step === 'rejected' ? 'danger' : 'primary'}
                          onClick={() => onChangeStatus?.(order.id, step)}
                        >
                          {STATUS_LABELS[step] || step}
                        </Button>
                      ))}
                    </Cluster>
                  </Cluster>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </Stack>
    </Section>
  );
}

export default PharmacyDeskContent;