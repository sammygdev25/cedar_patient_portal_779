import type { Service } from '../types';
import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, Cluster, EmptyState, Grid } from './ui';
import { Icon } from './icons';

interface ServiceListProps {
  services: Service[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

function ServiceList({ services }: ServiceListProps) {
  const visible = (Array.isArray(services) ? services : [])
    .filter((service) => service.is_active)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Our services are being updated"
        text="Cedar Hollow Health is refreshing its service list. Please check back shortly or contact the front desk to ask about an appointment."
      />
    );
  }

  return (
    <Grid size="md">
      {visible.map((service) => (
        <Card key={service.id}>
          <CardBody>
            <Cluster gap="sm" align="center">
              <Badge tone="soft">
                <Icon name="clock" size={14} /> {formatDuration(service.duration_minutes)}
              </Badge>
            </Cluster>
            <CardTitle>{service.name}</CardTitle>
            <CardMeta>{service.description}</CardMeta>
          </CardBody>
          <CardFooter>
            <Button variant="ghost" to="/patient/book">
              Book this service <Icon name="arrow-right" size={16} />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </Grid>
  );
}

export default ServiceList;