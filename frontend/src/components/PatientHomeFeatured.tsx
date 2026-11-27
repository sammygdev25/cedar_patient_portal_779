import type { Service } from '../types';
import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Media, Section, SkeletonCards } from '../components/ui';
import { Icon } from '../components/icons';

interface PatientHomeFeaturedProps {
  services: Service[];
  loading?: boolean;
  onSelectService?: (service: Service) => void;
}

export default function PatientHomeFeatured({ services, loading = false, onSelectService }: PatientHomeFeaturedProps) {
  const list: Service[] = Array.isArray(services) ? services : [];
  const featured = list.filter((service) => service.is_active).slice(0, 8);

  const bookAction = (
    <Button variant="secondary" to="/patient/book">
      Book a visit
      <Icon name="arrow-right" size={16} />
    </Button>
  );

  return (
    <Section
      id="featured-services"
      eyebrow="Care at Cedar Hollow"
      title="Featured services"
      subtitle="From routine check-ups to follow-up care, choose the visit that fits and book it in a few taps."
      actions={bookAction}
    >
      {loading ? (
        <SkeletonCards count={6} />
      ) : featured.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Services are being updated"
          text="Our clinic team is refreshing the list of visit types. You can still book an appointment with any of our doctors."
          action={
            <Button variant="primary" to="/patient/book">
              Book an appointment
            </Button>
          }
        />
      ) : (
        <Grid size="md">
          {featured.map((service) => (
            <Card key={service.id} onClick={onSelectService ? () => onSelectService(service) : undefined}>
              <Media alt={service.name} ratio="wide" />
              <CardBody>
                <CardTitle>{service.name}</CardTitle>
                <CardMeta>{service.description}</CardMeta>
              </CardBody>
              <CardFooter>
                <Badge tone="soft">
                  <Icon name="clock" size={14} /> {service.duration_minutes} min
                </Badge>
                <Button variant="ghost" to="/patient/book">
                  Book
                  <Icon name="chevron-right" size={16} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Section>
  );
}