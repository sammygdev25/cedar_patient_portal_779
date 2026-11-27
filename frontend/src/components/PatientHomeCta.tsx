import { Section, Button, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface PatientHomeCtaProps {
  title?: string;
  text?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function PatientHomeCta({
  title = 'Ready for your next visit?',
  text = 'Book a time with a Cedar Hollow Health doctor in a couple of minutes, or refill a prescription from our in-house pharmacy.',
  primaryLabel = 'Book an appointment',
  secondaryLabel = 'Visit the pharmacy',
}: PatientHomeCtaProps) {
  return (
    <Section
      tight
      narrow
      eyebrow="Your care, your schedule"
      title={title}
      subtitle={text}
    >
      <Stack gap="md" align="center">
        <div className="ds-cluster">
          <Button variant="primary" size="lg" to="/patient/book">
            {primaryLabel}
            <Icon name="arrow-right" size={18} />
          </Button>
          <Button variant="secondary" size="lg" to="/patient/pharmacy">
            <Icon name="package" size={18} />
            {secondaryLabel}
          </Button>
        </div>
        <p className="ds-small ds-muted">
          Need to change plans? You can reschedule or cancel from your appointments at any time.
        </p>
      </Stack>
    </Section>
  );
}