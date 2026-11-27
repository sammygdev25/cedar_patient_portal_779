import { Section, Grid, Card, CardBody, CardTitle, CardMeta, Badge, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { Service } from '../types';

interface PatientHomeCategoriesProps {
  section?: string;
  page?: string;
  services?: Service[];
}

interface PortalArea {
  to: string;
  icon: 'calendar' | 'book' | 'upload' | 'credit-card' | 'package' | 'clock';
  title: string;
  text: string;
}

const AREAS: PortalArea[] = [
  {
    to: '/patient/book',
    icon: 'calendar',
    title: 'Book a visit',
    text: 'Pick a Cedar Hollow doctor and an open time. Slots are held for you, so there is no double booking.',
  },
  {
    to: '/patient/appointments',
    icon: 'clock',
    title: 'My appointments',
    text: 'Reschedule or cancel upcoming visits and check in when you arrive at the clinic.',
  },
  {
    to: '/patient/records',
    icon: 'book',
    title: 'Visit notes and prescriptions',
    text: 'Read the summary your doctor wrote after each visit and review active prescriptions.',
  },
  {
    to: '/patient/documents',
    icon: 'upload',
    title: 'Documents',
    text: 'Keep lab results, referral letters and insurance cards together in one secure place.',
  },
  {
    to: '/patient/bills',
    icon: 'credit-card',
    title: 'Bills and payments',
    text: 'See what you owe and pay an invoice securely online with Stripe.',
  },
  {
    to: '/patient/pharmacy',
    icon: 'package',
    title: 'Clinic pharmacy',
    text: 'Order medicine and refills from our in-house pharmacy for pickup or delivery.',
  },
];

function PatientHomeCategories({ services = [] }: PatientHomeCategoriesProps) {
  const activeServices = (Array.isArray(services) ? services : [])
    .filter((s) => s.is_active !== false)
    .slice(0, 6);

  return (
    <>
      <Section
        eyebrow="Your portal"
        title="Browse by category"
        subtitle="Everything you need from Cedar Hollow Health, from booking a visit to collecting your prescription."
      >
        <Grid size="sm">
          {AREAS.map((area) => (
            <Card key={area.to} to={area.to}>
              <CardBody>
                <Stack gap="sm">
                  <Icon name={area.icon} size={28} />
                  <CardTitle>{area.title}</CardTitle>
                  <CardMeta>{area.text}</CardMeta>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      </Section>

      {activeServices.length > 0 && (
        <Section
          eyebrow="Care we offer"
          title="Book by service"
          subtitle="Choose the kind of visit you need and we will show you the doctors and times available."
        >
          <Grid size="sm">
            {activeServices.map((service) => (
              <Card key={service.id} to={`/patient/book?service=${service.id}`}>
                <CardBody>
                  <Stack gap="sm">
                    <Badge tone="soft">{service.duration_minutes} min</Badge>
                    <CardTitle>{service.name}</CardTitle>
                    <CardMeta>{service.description}</CardMeta>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Section>
      )}
    </>
  );
}

export default PatientHomeCategories;