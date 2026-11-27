import type { Appointment, Prescription, VisitNote } from '../types';
import { Badge, Card, CardBody, CardMeta, CardTitle, EmptyState, Grid, Section, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface VisitNoteFactsProps {
  appointment?: Appointment | null;
  note?: VisitNote | null;
  prescriptions?: Prescription[];
}

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTone(status: string): 'neutral' | 'primary' | 'soft' | 'success' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  if (status === 'checked_in') return 'primary';
  return 'soft';
}

export default function VisitNoteFacts({ appointment, note, prescriptions }: VisitNoteFactsProps) {
  const rx: Prescription[] = Array.isArray(prescriptions) ? prescriptions : [];

  if (!appointment && !note) {
    return (
      <Section title="Visit details" subtitle="Appointment facts and clinical record">
        <EmptyState
          icon="info"
          title="No visit details yet"
          text="Details appear here once the appointment is loaded. Notes you save stay visible only to the patient and their doctor."
        />
      </Section>
    );
  }

  const status = appointment ? String(appointment.status) : '';

  return (
    <Section
      title="Visit details"
      subtitle="Appointment facts and clinical record. Reception staff cannot see visit notes."
    >
      <Grid cols={2}>
        {appointment && (
          <Card>
            <CardBody>
              <CardMeta>
                <Icon name="calendar" size={16} /> Appointment
              </CardMeta>
              <CardTitle>{formatDateTime(appointment.start_time)}</CardTitle>
              <Stack gap="xs">
                <span className="ds-small ds-muted">Ends {formatDateTime(appointment.end_time)}</span>
                <span className="ds-small ds-muted">
                  Reason: {appointment.reason ? appointment.reason : 'No reason given'}
                </span>
                <span className="ds-small ds-muted">
                  Checked in: {formatDateTime(appointment.checked_in_at)}
                </span>
                <div>
                  <Badge tone={statusTone(status)}>{STATUS_LABELS[status] || status}</Badge>
                </div>
              </Stack>
            </CardBody>
          </Card>
        )}

        {note ? (
          <Card>
            <CardBody>
              <CardMeta>
                <Icon name="book" size={16} /> Diagnosis
              </CardMeta>
              <CardTitle>{note.diagnosis}</CardTitle>
              <Stack gap="xs">
                <span className="ds-small ds-muted">Written {formatDateTime(note.created_at)}</span>
                <span className="ds-small ds-muted">Last updated {formatDateTime(note.updated_at)}</span>
              </Stack>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <CardMeta>
                <Icon name="edit" size={16} /> Visit note
              </CardMeta>
              <CardTitle>Not written yet</CardTitle>
              <p className="ds-muted">Use the form on this page to record the diagnosis and summary for this visit.</p>
            </CardBody>
          </Card>
        )}

        {note && (
          <Card>
            <CardBody>
              <CardMeta>
                <Icon name="message" size={16} /> Summary
              </CardMeta>
              <p>{note.summary}</p>
            </CardBody>
          </Card>
        )}

        {note && (
          <Card>
            <CardBody>
              <CardMeta>
                <Icon name="check" size={16} /> Follow-up instructions
              </CardMeta>
              <p className="ds-muted">
                {note.follow_up_instructions ? note.follow_up_instructions : 'No follow-up instructions were given.'}
              </p>
            </CardBody>
          </Card>
        )}
      </Grid>

      {rx.length > 0 && (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Instructions</th>
                <th>Refills</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rx.map((p) => (
                <tr key={p.id}>
                  <td>{p.medicine_name}</td>
                  <td>{p.dosage}</td>
                  <td>{p.instructions}</td>
                  <td>{p.refills_allowed}</td>
                  <td>
                    <Badge tone={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}