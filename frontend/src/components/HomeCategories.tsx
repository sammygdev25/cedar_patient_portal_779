import type { ComponentProps } from 'react';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge } from '../components/ui';
import { Icon } from '../components/icons';

type StepIcon = ComponentProps<typeof Icon>['name'];

interface HomeCategoriesProps {
  isAuthenticated?: boolean;
}

interface CareStep {
  number: string;
  icon: StepIcon;
  title: string;
  text: string;
  to: string;
  action: string;
}

const STEPS: CareStep[] = [
  {
    number: 'Step 1',
    icon: 'calendar',
    title: 'Book your appointment',
    text: 'Choose a service and a Cedar Hollow doctor, then pick a time that suits you. Reception can also book on your behalf by phone.',
    to: '/patient/book',
    action: 'Book a visit',
  },
  {
    number: 'Step 2',
    icon: 'book',
    title: 'See your doctor and read your notes',
    text: 'After each visit your doctor writes up a visit note with the diagnosis and follow-up instructions, kept safely in your records.',
    to: '/patient/records',
    action: 'View my records',
  },
  {
    number: 'Step 3',
    icon: 'package',
    title: 'Collect or receive your prescription',
    text: 'Order prescribed medicines from our in-house pharmacy and pay online, then pick them up at the clinic or have them delivered.',
    to: '/patient/pharmacy',
    action: 'Visit the pharmacy',
  },
];

function HomeCategories({ isAuthenticated = false }: HomeCategoriesProps) {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Your care at Cedar Hollow Health, in three steps"
      subtitle={
        isAuthenticated
          ? 'Pick up where you left off: everything below is one tap from your patient portal.'
          : 'Create a free patient account to book visits, read your notes and order from our pharmacy.'
      }
    >
      <Grid size="sm" cols={3}>
        {STEPS.map((step) => (
          <Card key={step.title} to={step.to}>
            <CardBody>
              <Badge tone="soft">{step.number}</Badge>
              <Icon name={step.icon} size={32} />
              <CardTitle>{step.title}</CardTitle>
              <CardMeta>{step.text}</CardMeta>
            </CardBody>
            <CardFooter>
              <span>{step.action}</span>
              <Icon name="arrow-right" size={18} />
            </CardFooter>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default HomeCategories;