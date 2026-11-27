import type { Service } from '../types';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Media, Badge, EmptyState, SkeletonCards } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorHomeFeaturedProps {
  services?: Service[];
  loading?: boolean;
  onSelectService?: (service: Service) => void;
}

function describe(text: string): string {
  const clean = (text || '').trim();
  if (clean.length <= 110) return clean;
  return `${clean.slice(0, 107).trimEnd()}...`;
}

export default function DoctorHomeFeatured({
  services = [],
  loading = false,
  onSelectService,
}: DoctorHomeFeaturedProps) {
  const list = Array.isArray(services) ? services : [];
  const featured = list.filter((s) => s.is_active).slice(0, 8);

  return (
    <Section
      eyebrow="Cedar Hollow Health"
      title="Services your patients book with you"
      subtitle="The visit types offered at the clinic, with the time each one holds in your schedule."
    >
      {loading ? (
        <SkeletonCards count={6} />
      ) : featured.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No services listed yet"
          text="Once the front desk adds visit types, they will appear here for quick reference."
        />
      ) : (
        <Grid size="md">
          {featured.map((service) => (
            <Card
              key={service.id}
              onClick={onSelectService ? () => onSelectService(service) : undefined}
            >
              <Media
                alt={service.name}
                ratio="wide"
                badge={`${service.duration_minutes} min`}
              />
              <CardBody>
                <CardTitle>{service.name}</CardTitle>
                <CardMeta>{describe(service.description)}</CardMeta>
              </CardBody>
              <CardFooter>
                <Badge tone="soft">
                  <Icon name="clock" size={14} /> {service.duration_minutes} min visit
                </Badge>
                {onSelectService && <Icon name="arrow-right" size={16} title="View service" />}
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Section>
  );
}