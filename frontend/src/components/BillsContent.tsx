import type { Invoice } from '../types';
import { Section, Grid, Stat, Card, CardBody, Badge, Button, EmptyState, SkeletonCards, Alert, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface BillsContentProps {
  invoices?: Invoice[];
  loading?: boolean;
  error?: string;
  onPay?: (id: number) => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusTone(status: string): 'success' | 'danger' | 'primary' | 'neutral' {
  if (status === 'paid') return 'success';
  if (status === 'void') return 'neutral';
  return 'danger';
}

function statusLabel(status: string): string {
  if (status === 'paid') return 'Paid';
  if (status === 'void') return 'Void';
  return 'Unpaid';
}

function BillsContent({ invoices = [], loading = false, error = '', onPay }: BillsContentProps) {
  const list: Invoice[] = Array.isArray(invoices) ? invoices : [];
  const unpaid = list.filter((inv) => inv.status === 'unpaid');
  const outstanding = unpaid.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const paidCount = list.filter((inv) => inv.status === 'paid').length;

  if (loading) {
    return (
      <Section title="Your bills" subtitle="Loading your statements from Cedar Hollow Health">
        <SkeletonCards count={3} />
      </Section>
    );
  }

  return (
    <Section
      title="Your bills"
      subtitle="Consultation and treatment charges from Cedar Hollow Health. Pay securely online with Stripe."
    >
      <Stack gap="lg">
        {error && <Alert tone="danger">{error}</Alert>}

        {list.length > 0 && (
          <Grid size="sm">
            <Stat value={money.format(outstanding)} label="Outstanding balance" icon="dollar" />
            <Stat value={String(unpaid.length)} label="Bills awaiting payment" icon="clock" />
            <Stat value={String(paidCount)} label="Bills paid" icon="check" />
          </Grid>
        )}

        {list.length === 0 && !error ? (
          <EmptyState
            icon="credit-card"
            title="No bills yet"
            text="When the front desk bills a visit, it will appear here and you can pay it online."
            action={<Button to="/patient/appointments" variant="secondary">View my appointments</Button>}
          />
        ) : (
          <Card>
            <CardBody>
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.description}</td>
                        <td>{formatDate(inv.created_at)}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td>{money.format(Number(inv.amount || 0))}</td>
                        <td>
                          <Badge tone={statusTone(inv.status)}>{statusLabel(inv.status)}</Badge>
                          {inv.status === 'paid' && inv.paid_at && (
                            <div className="ds-small ds-muted">on {formatDate(inv.paid_at)}</div>
                          )}
                        </td>
                        <td>
                          {inv.status === 'unpaid' && onPay && (
                            <Button variant="primary" onClick={() => onPay(inv.id)}>
                              <Icon name="credit-card" size={16} /> Pay now
                            </Button>
                          )}
                        </td>
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

export default BillsContent;