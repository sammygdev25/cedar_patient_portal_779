import type { Service } from '../types';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface VisitNoteRelatedProps {
  services: Service[];
  currentServiceId?: number | null;
  onSelect?: (service: Service) => void;
}

function VisitNoteRelated({ services, currentServiceId = null, onSelect }: VisitNoteRelatedProps) {
  const list = Array.isArray(services) ? services : [];
  const related = list
    .filter((service) => service.is_active && service.id !== currentServiceId)
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 6);

  if (related.length === 0) {
    return null;
  }

  return (
    <Section
      eyebrow="Care pathway"
      title="Related services"
      subtitle="Other Cedar Hollow Health services this patient may need after today's visit, such as follow-ups, screenings and reviews."
    >
      <Grid size="sm">
        {related.map((service) => (
          <Card
            key={service.id}
            onClick={onSelect ? () => onSelect(service) : undefined}
          >
            <CardBody>
              <CardTitle>{service.name}</CardTitle>
              <CardMeta>
                <Icon name="clock" size={16} title="Duration" /> {service.duration_minutes} min appointment
              </CardMeta>
              <p className="ds-small ds-muted">{service.description}</p>
            </CardBody>
            <CardFooter>
              <Badge tone="soft">Follow-up option</Badge>
              {onSelect && (
                <span className="ds-small">
                  View service <Icon name="arrow-right" size={16} />
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default VisitNoteRelated;