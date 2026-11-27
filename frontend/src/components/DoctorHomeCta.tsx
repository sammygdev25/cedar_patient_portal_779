import { Section, Stack, Cluster, Button } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorHomeCtaProps {
  section?: string;
  page?: string;
  doctorName?: string;
  pendingApprovals?: number;
  onReviewPatients?: () => void;
  onOpenApprovals?: () => void;
}

export default function DoctorHomeCta({
  doctorName = '',
  pendingApprovals = 0,
  onReviewPatients,
  onOpenApprovals,
}: DoctorHomeCtaProps) {
  const greeting = doctorName
    ? `Ready for the next patient, ${doctorName}?`
    : 'Ready for the next patient?';

  const approvalsLabel =
    pendingApprovals > 0
      ? `Prescription approvals (${pendingApprovals})`
      : 'Prescription approvals';

  return (
    <Section tight narrow>
      <Stack gap="md" align="center">
        <h2 className="ds-card-title">{greeting}</h2>
        <p className="ds-lead ds-muted">
          Open your patient list to review histories, write visit notes and prescriptions, or clear
          the pharmacy orders waiting on your sign-off.
        </p>
        <Cluster gap="sm" justify="center">
          <Button
            variant="primary"
            size="lg"
            to="/staff/doctor/patients"
            onClick={onReviewPatients}
          >
            <Icon name="users" size={18} />
            Review my patients
          </Button>
          <Button
            variant="secondary"
            size="lg"
            to="/staff/doctor/approvals"
            onClick={onOpenApprovals}
          >
            <Icon name="shield" size={18} />
            {approvalsLabel}
          </Button>
        </Cluster>
      </Stack>
    </Section>
  );
}