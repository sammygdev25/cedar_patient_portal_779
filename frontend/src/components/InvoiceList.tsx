import type { Invoice } from '../types';
import { Badge, Button, EmptyState, Price } from './ui';
import { Icon } from './icons';

interface InvoiceListProps {
  invoices: Invoice[];
  onPay?: (id: number) => void;
  role: string;
}

type Tone = 'neutral' | 'primary' | 'soft' | 'success' | 'danger';

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  void: 'Void',
};

function toDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(invoice: Invoice): boolean {
  if (invoice.status !== 'unpaid' || !invoice.due_date) return false;
  const due = toDate(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function statusTone(invoice: Invoice): Tone {
  if (invoice.status === 'paid') return 'success';
  if (invoice.status === 'void') return 'neutral';
  return isOverdue(invoice) ? 'danger' : 'primary';
}

function statusLabel(invoice: Invoice): string {
  if (isOverdue(invoice)) return 'Overdue';
  return STATUS_LABELS[invoice.status] || String(invoice.status);
}

function InvoiceList({ invoices, onPay, role }: InvoiceListProps) {
  const list: Invoice[] = Array.isArray(invoices) ? invoices : [];
  const isPatient = role === 'patient';

  if (list.length === 0) {
    return (
      <EmptyState
        icon="dollar"
        title={isPatient ? 'No bills right now' : 'No bills created yet'}
        text={
          isPatient
            ? 'When Cedar Hollow Health issues a bill for a visit, it will appear here and you can pay it securely online.'
            : 'Bills you create for patients will be listed here with their payment status.'
        }
      />
    );
  }

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Due</th>
            <th>Paid on</th>
            {isPatient && onPay ? <th aria-label="Actions" /> : null}
          </tr>
        </thead>
        <tbody>
          {list.map((invoice) => {
            const canPay = isPatient && invoice.status === 'unpaid' && !invoice.paid_at && !!onPay;
            return (
              <tr key={invoice.id}>
                <td>
                  <strong>{invoice.description}</strong>
                  <div className="ds-small ds-muted">Issued {formatDate(invoice.created_at)}</div>
                </td>
                <td>
                  <Price value={Number(invoice.amount)} />
                </td>
                <td>
                  <Badge tone={statusTone(invoice)}>{statusLabel(invoice)}</Badge>
                </td>
                <td>{formatDate(invoice.due_date)}</td>
                <td>{formatDate(invoice.paid_at)}</td>
                {isPatient && onPay ? (
                  <td>
                    {canPay ? (
                      <Button variant="primary" onClick={() => onPay(invoice.id)}>
                        <Icon name="credit-card" size={16} /> Pay now
                      </Button>
                    ) : invoice.status === 'paid' ? (
                      <span className="ds-small ds-muted">
                        <Icon name="check" size={16} /> Settled
                      </span>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceList;