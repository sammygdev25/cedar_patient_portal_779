import { Section, Grid, Card, CardBody, CardTitle, CardMeta, Stat, Badge, Alert, Button, EmptyState, SkeletonCards } from '../components/ui';
import { Icon } from '../components/icons';

interface ReportsContentProps {
  loading?: boolean;
  error?: string;
  monthLabel?: string;
  filename?: string | null;
  appointmentCount?: number | null;
  invoiceCount?: number | null;
  onDownload?: () => void;
}

interface ColumnGroup {
  key: string;
  title: string;
  icon: 'calendar' | 'dollar';
  summary: string;
  columns: { name: string; detail: string }[];
}

const GROUPS: ColumnGroup[] = [
  {
    key: 'appointments',
    title: 'Appointments',
    icon: 'calendar',
    summary: 'Every visit booked at Cedar Hollow Health during the month, including cancellations and no-shows.',
    columns: [
      { name: 'Start time', detail: 'Scheduled start of the visit' },
      { name: 'Patient', detail: 'Patient the appointment belongs to' },
      { name: 'Doctor', detail: 'Doctor seeing the patient' },
      { name: 'Service', detail: 'Consultation or service booked' },
      { name: 'Status', detail: 'Booked, checked in, completed, cancelled or no show' },
      { name: 'Checked in at', detail: 'Front desk check-in time, when recorded' },
    ],
  },
  {
    key: 'bills',
    title: 'Bills',
    icon: 'dollar',
    summary: 'Every invoice raised in the month, with its Stripe payment outcome.',
    columns: [
      { name: 'Description', detail: 'What the patient was billed for' },
      { name: 'Patient', detail: 'Patient the invoice was issued to' },
      { name: 'Amount', detail: 'Invoice total in dollars' },
      { name: 'Status', detail: 'Unpaid, paid or void' },
      { name: 'Due date', detail: 'Payment deadline, when set' },
      { name: 'Paid at', detail: 'Time the Stripe payment was confirmed' },
    ],
  },
];

function ReportsContent({
  loading = false,
  error = '',
  monthLabel = '',
  filename = null,
  appointmentCount = null,
  invoiceCount = null,
  onDownload,
}: ReportsContentProps) {
  if (loading) {
    return (
      <Section title="Preparing your report" subtitle="Collecting appointments and bills for the selected month.">
        <SkeletonCards count={2} />
      </Section>
    );
  }

  const generated = Boolean(filename);
  const nothingFound = generated && appointmentCount === 0 && invoiceCount === 0;

  return (
    <Section
      eyebrow="Monthly CSV report"
      title="What the report contains"
      subtitle="One download per month with appointments and bills, ready for the practice's books."
    >
      {error && <Alert tone="danger">{error}</Alert>}

      {generated && (
        <Alert tone="success">
          <Icon name="check" size={16} /> {filename} downloaded{monthLabel ? ` for ${monthLabel}` : ''}.
        </Alert>
      )}

      {nothingFound && (
        <EmptyState
          icon="calendar"
          title="No activity in this month"
          text="There were no appointments or bills for the month you chose. Try a different month."
          action={onDownload ? <Button variant="secondary" onClick={onDownload}>Download again</Button> : undefined}
        />
      )}

      {generated && !nothingFound && (appointmentCount !== null || invoiceCount !== null) && (
        <Grid size="sm">
          {appointmentCount !== null && <Stat value={appointmentCount} label="Appointments in report" icon="calendar" />}
          {invoiceCount !== null && <Stat value={invoiceCount} label="Bills in report" icon="dollar" />}
        </Grid>
      )}

      <Grid size="lg">
        {GROUPS.map((group) => (
          <Card key={group.key}>
            <CardBody>
              <CardTitle>
                <Icon name={group.icon} size={18} /> {group.title}
              </CardTitle>
              <CardMeta>{group.summary}</CardMeta>
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(group.columns) ? group.columns : []).map((col) => (
                      <tr key={col.name}>
                        <td><Badge tone="soft">{col.name}</Badge></td>
                        <td className="ds-small ds-muted">{col.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <p className="ds-small ds-muted">
        <Icon name="info" size={14} /> Reports are for reception staff only and contain patient details. Store the file securely and delete it once reconciled.
      </p>
    </Section>
  );
}

export default ReportsContent;