import type { Appointment, VisitNote } from '../types';
import { Section, Split, Media, Badge, Button, Stack, Cluster, CardMeta } from '../components/ui';
import { Icon } from '../components/icons';

interface VisitNoteMediaProps {
  appointment: Appointment | null;
  note?: VisitNote | null;
  patientName?: string;
  doctorName?: string;
  serviceName?: string;
  onPrimaryAction?: () => void;
}

type BadgeTone = 'neutral' | 'primary' | 'soft' | 'success' | 'danger';

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  booked: 'soft',
  checked_in: 'primary',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
};

function formatDay(value: unknown): string {
  if (!value) return 'Time to be confirmed';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Time to be confirmed';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function VisitNoteMedia({
  appointment,
  note = null,
  patientName = 'Patient',
  doctorName = '',
  serviceName = '',
  onPrimaryAction,
}: VisitNoteMediaProps) {
  const status = appointment ? String(appointment.status) : 'booked';
  const statusLabel = STATUS_LABELS[status] || status;
  const statusTone: BadgeTone = STATUS_TONES[status] || 'neutral';
  const startTime = appointment ? formatTime(appointment.start_time) : '';
  const reason = appointment && appointment.reason ? String(appointment.reason) : '';
  const hasNote = Boolean(note);

  return (
    <Section tight>
      <Split>
        <Media alt={`Visit with ${patientName}`} ratio="wide" badge={statusLabel} />
        <Stack gap="md">
          <span className="ds-eyebrow">
            {hasNote ? 'Visit note on file' : 'Visit note not written yet'}
          </span>
          <h1>{patientName}</h1>
          <CardMeta>
            <Cluster gap="sm">
              <Icon name="calendar" size={16} />
              <span>{appointment ? formatDay(appointment.start_time) : 'Loading appointment'}</span>
              {startTime && (
                <>
                  <Icon name="clock" size={16} />
                  <span>{startTime}</span>
                </>
              )}
            </Cluster>
          </CardMeta>
          <Cluster gap="sm">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            {serviceName && <Badge tone="neutral">{serviceName}</Badge>}
            {doctorName && <Badge tone="soft">{doctorName}</Badge>}
          </Cluster>
          <p className="ds-lead">
            {reason
              ? `Reason for visit: ${reason}.`
              : 'Record the diagnosis and follow-up instructions for this visit.'}{' '}
            Only the patient and you can read this note; reception cannot see it.
          </p>
          <Cluster gap="sm">
            {onPrimaryAction && (
              <Button variant="primary" size="lg" onClick={onPrimaryAction}>
                <Icon name={hasNote ? 'edit' : 'plus'} size={18} />
                {hasNote ? 'Edit visit note' : 'Write visit note'}
              </Button>
            )}
            <Button variant="ghost" to="/staff/doctor">
              <Icon name="arrow-left" size={16} />
              Back to today&apos;s schedule
            </Button>
          </Cluster>
        </Stack>
      </Split>
    </Section>
  );
}

export default VisitNoteMedia;