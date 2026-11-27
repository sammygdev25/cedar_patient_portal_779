import type { ReactNode } from 'react';
import { Section, Split, Stack, Card, CardBody, CardTitle, CardMeta, Cluster, Button, Stat } from '../components/ui';
import { Icon } from '../components/icons';

interface HomeAboutProps {
  section?: string;
  page?: string;
  doctorCount?: number;
  serviceCount?: number;
}

interface ValuePoint {
  icon: 'shield' | 'clock' | 'message';
  title: string;
  text: string;
}

const VALUES: ValuePoint[] = [
  {
    icon: 'shield',
    title: 'Your records stay yours',
    text: 'Visit notes, prescriptions and documents live in one secure portal that only you and your care team can open.',
  },
  {
    icon: 'clock',
    title: 'Booking without the phone queue',
    text: 'Pick a doctor and a time that suits you, or let our reception desk book on your behalf. Same schedule, either way.',
  },
  {
    icon: 'message',
    title: 'One place for care and pharmacy',
    text: 'Pay invoices online and order medicines from our in-house pharmacy, collected at the clinic or delivered to your door.',
  },
];

function HomeAbout({ doctorCount = 0, serviceCount = 0 }: HomeAboutProps) {
  const stats: ReactNode =
    doctorCount > 0 || serviceCount > 0 ? (
      <Cluster gap="md">
        {doctorCount > 0 && <Stat value={doctorCount} label="Doctors accepting patients" icon="users" />}
        {serviceCount > 0 && <Stat value={serviceCount} label="Clinic services" icon="award" />}
      </Cluster>
    ) : null;

  return (
    <Section
      id="about"
      eyebrow="About Cedar Hollow Health"
      title="A neighbourhood clinic with a modern front door"
      subtitle="Care that feels personal, with the paperwork handled online."
    >
      <Split>
        <Stack gap="md">
          <p className="ds-lead">
            Cedar Hollow Health has looked after local families for years. Our patient portal brings the whole
            visit together: booking, notes from your doctor, prescriptions, documents, billing and pharmacy.
          </p>
          <p className="ds-muted">
            Patients manage their own care, doctors write visit notes and approve prescription orders, and our
            receptionists keep the day running smoothly, all from the same system so nothing gets lost between
            the waiting room and the pharmacy counter.
          </p>
          {stats}
          <Cluster gap="sm">
            <Button variant="primary" to="/register">
              Create your account
            </Button>
            <Button variant="ghost" to="/patient/book">
              Book an appointment
            </Button>
          </Cluster>
        </Stack>

        <Stack gap="md">
          {VALUES.map((value) => (
            <Card key={value.title}>
              <CardBody>
                <Cluster gap="md" align="start">
                  <Icon name={value.icon} size={28} />
                  <Stack gap="xs">
                    <CardTitle>{value.title}</CardTitle>
                    <CardMeta>{value.text}</CardMeta>
                  </Stack>
                </Cluster>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </Split>
    </Section>
  );
}

export default HomeAbout;