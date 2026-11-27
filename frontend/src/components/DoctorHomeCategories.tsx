import type { ReactNode } from 'react';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorHomeCategoriesProps {
  section?: string;
  page?: string;
  todayCount?: number;
  pendingApprovals?: number;
  patientCount?: number;
}

interface WorkflowStep {
  key: string;
  step: string;
  icon: 'calendar' | 'edit' | 'check';
  title: string;
  text: string;
  to?: string;
  action?: string;
  badge?: ReactNode;
}

function DoctorHomeCategories({
  todayCount = 0,
  pendingApprovals = 0,
  patientCount = 0,
}: DoctorHomeCategoriesProps) {
  const steps: WorkflowStep[] = [
    {
      key: 'schedule',
      step: 'Step 1',
      icon: 'calendar',
      title: 'Review your schedule',
      text: 'Your day at Cedar Hollow Health updates live as the front desk checks patients in, so you always know who is waiting.',
      badge: <Badge tone="soft">{todayCount} today</Badge>,
    },
    {
      key: 'notes',
      step: 'Step 2',
      icon: 'edit',
      title: 'Write visit notes and prescriptions',
      text: 'After each visit, record the diagnosis, summary and follow-up instructions. Patients see them in their portal records.',
      to: '/staff/doctor/patients',
      action: 'Open patient list',
      badge: <Badge tone="neutral">{patientCount} patients</Badge>,
    },
    {
      key: 'approvals',
      step: 'Step 3',
      icon: 'check',
      title: 'Approve pharmacy orders',
      text: 'Prescription orders from our in-house pharmacy wait for the prescribing doctor. Approve or reject them before they are packed.',
      to: '/staff/doctor/approvals',
      action: 'Review approvals',
      badge: (
        <Badge tone={pendingApprovals > 0 ? 'primary' : 'success'}>
          {pendingApprovals > 0 ? `${pendingApprovals} waiting` : 'All clear'}
        </Badge>
      ),
    },
  ];

  return (
    <Section
      eyebrow="How your day works"
      title="From check-in to prescription"
      subtitle="Three steps cover most of a clinic day for doctors at Cedar Hollow Health."
    >
      <Grid size="sm">
        {(Array.isArray(steps) ? steps : []).map((s) => (
          <Card key={s.key} to={s.to}>
            <CardBody>
              <div className="ds-between">
                <span className="ds-eyebrow">{s.step}</span>
                <Icon name={s.icon} size={24} />
              </div>
              <CardTitle>{s.title}</CardTitle>
              <CardMeta>{s.text}</CardMeta>
            </CardBody>
            <CardFooter>
              {s.badge}
              {s.to && s.action ? (
                <span className="ds-cluster ds-small">
                  {s.action}
                  <Icon name="arrow-right" size={16} />
                </span>
              ) : null}
            </CardFooter>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default DoctorHomeCategories;