import { Section, Grid, Card, CardBody, CardTitle, CardMeta, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface BookAppointmentInfoProps {
  section?: string;
  page?: string;
}

interface InfoCard {
  icon: 'clock' | 'check' | 'info';
  title: string;
  lines: string[];
}

const INFO_CARDS: InfoCard[] = [
  {
    icon: 'clock',
    title: 'Arrive a few minutes early',
    lines: [
      'Please check in at the Cedar Hollow Health front desk about ten minutes before your visit.',
      'Bring a photo ID and any medicines you are currently taking.',
    ],
  },
  {
    icon: 'check',
    title: 'One doctor, one slot',
    lines: [
      'Each time slot belongs to a single doctor, so a booked time is yours and no one else can take it.',
      'Only the open times for your chosen doctor and visit type are shown.',
    ],
  },
  {
    icon: 'info',
    title: 'Plans change, and that is fine',
    lines: [
      'You can reschedule or cancel from My appointments before your visit.',
      'After the visit, your notes, prescriptions and bill appear in your portal.',
    ],
  },
];

function BookAppointmentInfo(_props: BookAppointmentInfoProps) {
  return (
    <Section tight eyebrow="Good to know" title="Before you book">
      <Grid size="sm">
        {INFO_CARDS.map((card) => (
          <Card key={card.title}>
            <CardBody>
              <Stack gap="sm">
                <Cluster gap="sm" align="center">
                  <Icon name={card.icon} size={20} />
                  <CardTitle>{card.title}</CardTitle>
                </Cluster>
                {(Array.isArray(card.lines) ? card.lines : []).map((line) => (
                  <CardMeta key={line}>{line}</CardMeta>
                ))}
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default BookAppointmentInfo;