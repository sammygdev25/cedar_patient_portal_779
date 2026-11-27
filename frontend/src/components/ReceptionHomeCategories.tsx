import type { ReactNode } from 'react';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge } from '../components/ui';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';

interface ReceptionHomeCategoriesProps {
  appointmentsToday?: number;
  waitingCount?: number;
  unpaidCount?: number;
}

interface DeskStep {
  step: number;
  title: string;
  text: string;
  to: string;
  icon: IconName;
  cta: string;
  badge?: ReactNode;
}

function ReceptionHomeCategories({
  appointmentsToday = 0,
  waitingCount = 0,
  unpaidCount = 0,
}: ReceptionHomeCategoriesProps) {
  const steps: DeskStep[] = [
    {
      step: 1,
      title: 'Book for a patient',
      text: 'Find the patient, choose a doctor and pick an open slot. A doctor can never be double booked, so only free times are offered.',
      to: '/staff/reception/book',
      icon: 'calendar',
      cta: 'Open booking',
      badge: <Badge tone="soft">{appointmentsToday} today</Badge>,
    },
    {
      step: 2,
      title: 'Check patients in',
      text: 'Mark each arrival as checked in so the doctor sees them on the live schedule within seconds. Reschedule or cancel from the same list.',
      to: '/staff/reception/appointments',
      icon: 'check',
      cta: 'Open appointments',
      badge: <Badge tone="primary">{waitingCount} waiting</Badge>,
    },
    {
      step: 3,
      title: 'Bill the visit',
      text: 'Raise an invoice once the visit is complete. Patients pay securely online with Stripe, and paid invoices update here automatically.',
      to: '/staff/reception/billing',
      icon: 'credit-card',
      cta: 'Open billing',
      badge: <Badge tone={unpaidCount > 0 ? 'danger' : 'success'}>{unpaidCount} unpaid</Badge>,
    },
  ];

  return (
    <Section
      id="how-the-desk-works"
      eyebrow="How it works"
      title="Your front desk, step by step"
      subtitle="From the first phone call to the final invoice, every Cedar Hollow Health visit follows the same three steps."
    >
      <Grid size="sm">
        {(Array.isArray(steps) ? steps : []).map((s) => (
          <Card key={s.step} to={s.to}>
            <CardBody>
              <Icon name={s.icon} size={28} />
              <CardMeta>Step {s.step}</CardMeta>
              <CardTitle>{s.title}</CardTitle>
              <p className="ds-muted">{s.text}</p>
            </CardBody>
            <CardFooter>
              {s.badge}
              <span className="ds-small">
                {s.cta} <Icon name="arrow-right" size={14} />
              </span>
            </CardFooter>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default ReceptionHomeCategories;