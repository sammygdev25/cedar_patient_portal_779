import type { User } from '../types';
import { Badge, Card, CardBody, CardTitle, CardMeta, CardFooter, Cluster, EmptyState, Stack } from '../components/ui';
import { Icon } from '../components/icons';

type PatientRecord = User & {
  first_name?: string;
  last_name?: string;
  username?: string;
};

interface PatientSummaryCardProps {
  patient?: PatientRecord | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDateParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function formatBirthDate(value: string | null | undefined): string {
  const parts = parseDateParts(value);
  if (!parts) return 'Not on file';
  return `${MONTHS[parts.m - 1] || ''} ${parts.d}, ${parts.y}`;
}

function calculateAge(value: string | null | undefined): number | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  const today = new Date();
  let age = today.getFullYear() - parts.y;
  const beforeBirthday =
    today.getMonth() + 1 < parts.m || (today.getMonth() + 1 === parts.m && today.getDate() < parts.d);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function displayName(patient: PatientRecord): string {
  const full = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
  if (full) return full;
  if (patient.username) return patient.username;
  return patient.email;
}

function PatientSummaryCard({ patient }: PatientSummaryCardProps) {
  if (!patient) {
    return (
      <EmptyState
        icon="user"
        title="No patient selected"
        text="Choose a patient from the list to see their contact details and record summary."
      />
    );
  }

  const age = calculateAge(patient.date_of_birth);
  const memberSince = parseDateParts(patient.created_at);

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Cluster justify="between" align="center">
            <CardTitle>{displayName(patient)}</CardTitle>
            <Badge tone="soft">Patient</Badge>
          </Cluster>

          <CardMeta>
            {age !== null ? `${age} years old` : 'Age not on file'}
          </CardMeta>

          <Stack gap="sm">
            <Cluster gap="sm" align="center">
              <Icon name="mail" size={16} title="Email" />
              <span>{patient.email}</span>
            </Cluster>
            <Cluster gap="sm" align="center">
              <Icon name="phone" size={16} title="Phone" />
              <span>{patient.phone ? patient.phone : 'No phone number on file'}</span>
            </Cluster>
            <Cluster gap="sm" align="center">
              <Icon name="calendar" size={16} title="Date of birth" />
              <span>Born {formatBirthDate(patient.date_of_birth)}</span>
            </Cluster>
          </Stack>
        </Stack>
      </CardBody>
      <CardFooter>
        <Cluster gap="sm" align="center">
          <Icon name="clock" size={16} title="Registered" />
          <span className="ds-small ds-muted">
            {memberSince
              ? `Registered with Cedar Hollow Health in ${MONTHS[memberSince.m - 1]} ${memberSince.y}`
              : 'Registered with Cedar Hollow Health'}
          </span>
        </Cluster>
      </CardFooter>
    </Card>
  );
}

export default PatientSummaryCard;