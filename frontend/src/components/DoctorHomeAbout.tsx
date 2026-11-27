import { Section, Split, Stack, Card, CardBody, CardTitle, CardMeta } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorHomeAboutProps {
  clinicName?: string;
  doctorName?: string;
}

interface ValuePoint {
  icon: 'clock' | 'book' | 'shield';
  title: string;
  text: string;
}

const VALUE_POINTS: ValuePoint[] = [
  {
    icon: 'clock',
    title: 'A schedule that stays current',
    text: 'Check-ins from the front desk appear on your day list within moments, so you always know who is waiting and who is next.',
  },
  {
    icon: 'book',
    title: 'Notes and prescriptions in one place',
    text: 'Write the visit note, issue the prescription and send the patient their follow-up instructions without leaving the visit.',
  },
  {
    icon: 'shield',
    title: 'Private by design',
    text: 'Records, documents and prescriptions are visible only to the patient and the care team responsible for them.',
  },
];

function DoctorHomeAbout({ clinicName = 'Cedar Hollow Health', doctorName }: DoctorHomeAboutProps) {
  const greeting = doctorName ? `Welcome back, ${doctorName}` : 'Built around the way you practise';

  return (
    <Section
      id="about"
      eyebrow={`About ${clinicName}`}
      title={greeting}
      subtitle="The Cedar Hollow Health portal keeps patients, reception and doctors working from the same page."
    >
      <Split>
        <Stack gap="md">
          <p className="ds-lead">
            Cedar Hollow Health is a neighbourhood clinic that wanted booking, records and
            billing to feel as calm as the visit itself. The portal brings the public site,
            appointment booking, visit notes, prescriptions, documents, Stripe billing and
            our in-house pharmacy into a single secure home for each role.
          </p>
          <p className="ds-muted">
            Patients book and reschedule on their own, receptionists check people in and
            manage the day, and doctors see a live schedule with no double booking. Less
            time on admin means more time with the person in front of you.
          </p>
        </Stack>
        <Stack gap="sm">
          {VALUE_POINTS.map((point) => (
            <Card key={point.title}>
              <CardBody>
                <Stack gap="xs">
                  <Icon name={point.icon} size={24} />
                  <CardTitle>{point.title}</CardTitle>
                  <CardMeta>{point.text}</CardMeta>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </Split>
    </Section>
  );
}

export default DoctorHomeAbout;