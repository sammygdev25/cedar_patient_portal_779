import type { Service } from '../types';
import {
  Section,
  Grid,
  Card,
  CardBody,
  CardTitle,
  CardMeta,
  CardFooter,
  Media,
  Badge,
  Button,
  EmptyState,
  SkeletonCards,
} from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionHomeFeaturedProps {
  services: Service[];
  loading: boolean;
  onBookService?: (service: Service) => void;
}

export default function ReceptionHomeFeatured({
  services,
  loading,
  onBookService,
}: ReceptionHomeFeaturedProps) {
  const list = Array.isArray(services) ? services : [];
  const featured = list
    .filter((service) => service.is_active)
    .slice(0, 8);

  return (
    <Section
      id="featured-services"
      eyebrow="Front desk"
      title="Services patients book most"
      subtitle="Cedar Hollow Health appointment types you can book on a patient's behalf, with the time each visit holds on the doctor's schedule."
      actions={
        <Button variant="secondary" to="/staff/reception/book">
          <Icon name="calendar" size={16} /> Book an appointment
        </Button>
      }
    >
      {loading ? (
        <SkeletonCards count={6} />
      ) : featured.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No services are listed yet"
          text="Once the clinic adds its appointment types they will show up here, ready to book for walk-in and phone patients."
          action={
            <Button variant="primary" to="/staff/reception/book">
              Go to booking
            </Button>
          }
        />
      ) : (
        <Grid size="md">
          {featured.map((service) => (
            <Card key={service.id}>
              <Media alt={service.name} ratio="wide" badge={`${service.duration_minutes} min`} />
              <CardBody>
                <CardTitle>{service.name}</CardTitle>
                <CardMeta>
                  <Icon name="clock" size={14} /> {service.duration_minutes} minute visit
                </CardMeta>
                <p className="ds-small ds-muted">{service.description}</p>
              </CardBody>
              <CardFooter>
                <Badge tone="soft">Bookable today</Badge>
                {onBookService ? (
                  <Button variant="primary" onClick={() => onBookService(service)}>
                    Book <Icon name="arrow-right" size={14} />
                  </Button>
                ) : (
                  <Button variant="primary" to="/staff/reception/book">
                    Book <Icon name="arrow-right" size={14} />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Section>
  );
}