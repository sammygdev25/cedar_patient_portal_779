import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Grid,
  Section,
  SkeletonCards,
  Stack,
  Stat,
} from '../components/ui';
import { Icon } from '../components/icons';
import type { Invoice } from '../types';

interface ReceptionBillingContentProps {
  invoices?: Invoice[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onVoid?: (invoiceId: number) => void;
}

type StatusFilter = 'all' | 'unpaid' | 'paid' | 'void';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All bills' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

const money = (value: number | string): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

const day = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const tone = (status: string): 'success' | 'danger' | 'neutral' | 'primary' => {
  if (status === 'paid') return 'success';
  if (status === 'void') return 'neutral';
  return 'primary';
};

function ReceptionBillingContent({
  invoices = [],
  loading = false,
  error = '',
  onRefresh,
  onVoid,
}: ReceptionBillingContentProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const list = Array.isArray(invoices) ? invoices : [];

  const totals = useMemo(() => {
    const sum = (status: string) =>
      list.filter((i) => i.status === status).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    return {
      outstanding: sum('unpaid'),
      collected: sum('paid'),
      openCount: list.filter((i) => i.status === 'unpaid').length,
    };
  }, [list]);

  const visible = filter === 'all' ? list : list.filter((i) => i.status === filter);

  return (
    <Section
      eyebrow="Front desk"
      title="Patient bills"
      subtitle="Bills you create appear here until the patient pays through Stripe; a bill turns paid the moment the payment succeeds."
      actions={
        onRefresh ? (
          <Button variant="secondary" onClick={onRefresh}>
            <Icon name="refresh" size={16} /> Refresh
          </Button>
        ) : undefined
      }
    >
      <Stack gap="lg">
        {error && <Alert tone="danger">{error}</Alert>}

        <Grid size="sm">
          <Stat value={money(totals.outstanding)} label="Awaiting payment" icon="clock" />
          <Stat value={money(totals.collected)} label="Collected via Stripe" icon="dollar" />
          <Stat value={totals.openCount} label="Open bills" icon="credit-card" />
        </Grid>

        <div className="ds-filters">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'primary' : 'ghost'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <SkeletonCards count={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="credit-card"
            title={filter === 'all' ? 'No bills yet' : `No ${filter} bills`}
            text="Create a bill for a patient after their visit and it will show up in their portal ready to pay."
          />
        ) : (
          <Card>
            <CardBody>
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Paid</th>
                      <th>Status</th>
                      {onVoid && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.description}</td>
                        <td>Patient #{String(invoice.user)}</td>
                        <td>{money(invoice.amount)}</td>
                        <td>{day(invoice.due_date)}</td>
                        <td>{day(invoice.paid_at)}</td>
                        <td>
                          <Badge tone={tone(invoice.status)}>{invoice.status}</Badge>
                        </td>
                        {onVoid && (
                          <td>
                            {invoice.status === 'unpaid' && (
                              <Button variant="danger" onClick={() => onVoid(invoice.id)}>
                                <Icon name="close" size={14} /> Void
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </Stack>
    </Section>
  );
}

export default ReceptionBillingContent;