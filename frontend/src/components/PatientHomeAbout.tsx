import { Section, Split, Card, CardBody, CardTitle, Stack, Cluster, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface PatientHomeAboutProps {
  clinicName?: string;
  story?: string[];
}

interface ValuePoint {
  icon: 'shield' | 'clock' | 'heart';
  title: string;
  text: string;
}

const VALUES: ValuePoint[] = [
  {
    icon: 'clock',
    title: 'Book in under a minute',
    text: 'Pick your doctor and an open slot. Reschedule or cancel from My appointments whenever plans change.',
  },
  {
    icon: 'shield',
    title: 'Your records stay in one place',
    text: 'Visit notes, prescriptions and documents are kept together and visible only to you and your care team.',
  },
  {
    icon: 'heart',
    title: 'Care that follows you home',
    text: 'Pay invoices securely online and collect prescriptions from our in-house pharmacy, or have them delivered.',
  },
];

const DEFAULT_STORY: string[] = [
  'Cedar Hollow Health is a neighbourhood clinic built around the idea that looking after your health should not mean chasing paperwork.',
  'Your patient portal brings appointments, visit notes, prescriptions, documents, billing and our pharmacy into one calm, simple place, so you spend less time on admin and more time getting better.',
];

function PatientHomeAbout({ clinicName = 'Cedar Hollow Health', story = DEFAULT_STORY }: PatientHomeAboutProps) {
  return (
    <Section
      eyebrow="About the clinic"
      title={`Why patients choose ${clinicName}`}
      subtitle="Doctors, reception and pharmacy working from the same page, for you."
    >
      <Split>
        <Stack gap="md">
          {(Array.isArray(story) ? story : []).map((paragraph, index) => (
            <p key={index} className="ds-lead">
              {paragraph}
            </p>
          ))}
          <Cluster gap="sm">
            <Badge tone="soft">Doctors</Badge>
            <Badge tone="soft">Reception</Badge>
            <Badge tone="soft">In-house pharmacy</Badge>
          </Cluster>
        </Stack>

        <Stack gap="md">
          {VALUES.map((value) => (
            <Card key={value.title}>
              <CardBody>
                <Cluster gap="md" align="center">
                  <Icon name={value.icon} size={28} title={value.title} />
                  <CardTitle>{value.title}</CardTitle>
                </Cluster>
                <p className="ds-muted">{value.text}</p>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </Split>
    </Section>
  );
}

export default PatientHomeAbout;