import type { Service } from '../types';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Media, Badge, Button, EmptyState, SkeletonCards } from '../components/ui';
import { Icon } from '../components/icons';

interface HomeFeaturedProps {
  services: Service[];
  loading?: boolean;
}

function summarize(text: string, limit = 110): string {
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

export default function HomeFeatured({ services, loading = false }: HomeFeaturedProps) {
  const list = Array.isArray(services) ? services : [];
  const featured = list.filter((service) => service.is_active).slice(0, 8);

  return (
    <Section
      id="services"
      eyebrow="What we treat"
      title="Care for every stage of life"
      subtitle="From routine check-ups to follow-up visits, Cedar Hollow Health offers the services families in our community rely on."
      actions={
        <Button variant="secondary" to="/patient/book">
          Book a visit
          <Icon name="arrow-right" size={16} />
        </Button>
      }
    >
      {loading ? (
        <SkeletonCards count={6} />
      ) : featured.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Our service list is being updated"
          text="Check back soon, or call the clinic and our reception team will help you find the right appointment."
          action={
            <Button variant="primary" to="/patient/book">
              Book an appointment
            </Button>
          }
        />
      ) : (
        <Grid size="md">
          {featured.map((service) => (
            <Card key={service.id} to="/patient/book">
              <Media alt={service.name} ratio="wide" />
              <CardBody>
                <CardTitle>{service.name}</CardTitle>
                <CardMeta>{summarize(service.description)}</CardMeta>
              </CardBody>
              <CardFooter>
                <Badge tone="soft">
                  <Icon name="clock" size={14} />
                  {service.duration_minutes} min
                </Badge>
                <Badge tone="primary">Book now</Badge>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Section>
  );
}