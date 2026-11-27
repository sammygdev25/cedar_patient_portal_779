import { Section, Split, Stack, Card, CardBody, CardTitle, CardMeta, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionHomeAboutProps {
  clinicName?: string;
  onContact?: () => void;
}

interface ValuePoint {
  icon: 'calendar' | 'shield' | 'clock';
  title: string;
  text: string;
}

const VALUE_POINTS: ValuePoint[] = [
  {
    icon: 'calendar',
    title: 'One schedule, no double booking',
    text: 'Every doctor has a single live calendar. A slot taken at the desk is gone from the patient portal at once, so two people never hold the same time.',
  },
  {
    icon: 'clock',
    title: 'Check-in in a single tap',
    text: 'Mark a patient as arrived and the doctor sees it on their schedule within moments. No paper lists, no walking notes down the corridor.',
  },
  {
    icon: 'shield',
    title: 'Records stay private',
    text: 'Visit notes, prescriptions and documents are visible only to the patient and their own care team. Desk staff see what they need to book and bill.',
  },
];

function ReceptionHomeAbout({ clinicName = 'Cedar Hollow Health', onContact }: ReceptionHomeAboutProps) {
  return (
    <Section
      id="about"
      eyebrow="About the front desk"
      title={`How ${clinicName} keeps the day running`}
      subtitle="The reception tools are built so the desk can book, check in and bill without leaving one screen."
    >
      <Split>
        <Stack gap="md">
          <p className="ds-lead">
            {clinicName} brings appointments, visit notes, prescriptions, documents, Stripe billing and an in-house pharmacy
            into one portal for patients, doctors and the reception team.
          </p>
          <p className="ds-muted">
            As a receptionist you book on behalf of walk-in and phone patients, move or cancel visits, check people in as
            they arrive, take payment on invoices and hand over pharmacy orders. Patients see the same appointments you do,
            so what you change at the desk is what they read at home.
          </p>
          <div className="ds-cluster">
            <Badge tone="soft">Patients</Badge>
            <Badge tone="soft">Doctors</Badge>
            <Badge tone="soft">Reception</Badge>
            <Badge tone="soft">Pharmacy</Badge>
          </div>
          {onContact && (
            <div>
              <button type="button" className="btn btn-secondary" onClick={onContact}>
                <Icon name="message" size={16} /> Talk to the clinic manager
              </button>
            </div>
          )}
        </Stack>
        <Stack gap="md">
          {VALUE_POINTS.map((point) => (
            <Card key={point.title}>
              <CardBody>
                <Stack gap="sm">
                  <div className="ds-cluster">
                    <Icon name={point.icon} size={22} />
                    <CardTitle>{point.title}</CardTitle>
                  </div>
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

export default ReceptionHomeAbout;