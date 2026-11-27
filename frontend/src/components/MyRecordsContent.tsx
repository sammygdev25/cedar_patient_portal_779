import type { VisitNote, Prescription } from '../types';
import { Section, Grid, Stack, Cluster, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge, Button, EmptyState, SkeletonCards, Alert } from '../components/ui';
import { Icon } from '../components/icons';

interface MyRecordsContentProps {
  notes?: VisitNote[];
  prescriptions?: Prescription[];
  loading?: boolean;
  error?: string;
  onOrder?: (prescription: Prescription) => void;
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyRecordsContent({
  notes = [],
  prescriptions = [],
  loading = false,
  error = '',
  onOrder,
}: MyRecordsContentProps) {
  const noteList = Array.isArray(notes) ? notes : [];
  const prescriptionList = Array.isArray(prescriptions) ? prescriptions : [];

  return (
    <>
      {error && (
        <Section tight>
          <Alert tone="danger">{error}</Alert>
        </Section>
      )}

      <Section
        eyebrow="Visit notes"
        title="What your doctor wrote down"
        subtitle="Diagnoses, summaries and follow-up instructions from your visits at Cedar Hollow Health. Only you can read these."
      >
        {loading ? (
          <SkeletonCards count={3} />
        ) : noteList.length === 0 ? (
          <EmptyState
            icon="book"
            title="No visit notes yet"
            text="After your next appointment your doctor's notes will appear here."
            action={<Button to="/patient/book" variant="primary">Book an appointment</Button>}
          />
        ) : (
          <Grid size="lg">
            {noteList.map((note) => (
              <Card key={note.id}>
                <CardBody>
                  <Stack gap="sm">
                    <CardMeta>
                      <Icon name="calendar" size={16} /> {formatDay(note.created_at)}
                    </CardMeta>
                    <CardTitle>{note.diagnosis}</CardTitle>
                    <p>{note.summary}</p>
                  </Stack>
                </CardBody>
                {note.follow_up_instructions && (
                  <CardFooter>
                    <Cluster gap="sm" align="center">
                      <Icon name="info" size={16} />
                      <span className="ds-small">Follow-up: {note.follow_up_instructions}</span>
                    </Cluster>
                  </CardFooter>
                )}
              </Card>
            ))}
          </Grid>
        )}
      </Section>

      <Section
        eyebrow="Prescriptions"
        title="Your prescriptions"
        subtitle="Medicines prescribed to you. Order an active prescription from our in-house pharmacy."
      >
        {loading ? (
          <SkeletonCards count={3} />
        ) : prescriptionList.length === 0 ? (
          <EmptyState
            icon="package"
            title="No prescriptions on file"
            text="When a doctor prescribes a medicine it will be listed here, ready to order."
          />
        ) : (
          <Grid size="lg">
            {prescriptionList.map((rx) => (
              <Card key={rx.id}>
                <CardBody>
                  <Stack gap="sm">
                    <Cluster gap="sm" align="center" justify="between">
                      <CardTitle>{rx.medicine_name}</CardTitle>
                      <Badge tone={rx.is_active ? 'success' : 'neutral'}>
                        {rx.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Cluster>
                    <CardMeta>
                      {rx.dosage} · {rx.refills_allowed} refill{rx.refills_allowed === 1 ? '' : 's'} allowed · {formatDay(rx.created_at)}
                    </CardMeta>
                    <p>{rx.instructions}</p>
                    {rx.notes && <p className="ds-muted ds-small">{rx.notes}</p>}
                  </Stack>
                </CardBody>
                {onOrder && rx.is_active && rx.product && (
                  <CardFooter>
                    <Button variant="secondary" onClick={() => onOrder(rx)}>
                      <Icon name="cart" size={16} /> Order from pharmacy
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </Grid>
        )}
      </Section>
    </>
  );
}