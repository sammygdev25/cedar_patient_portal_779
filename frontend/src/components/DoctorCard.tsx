import { Card, CardBody, CardTitle, CardMeta, CardFooter, Media, Badge, Button, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';
import type { DoctorProfile } from '../types';

interface DoctorCardProps {
  doctor: DoctorProfile;
}

const BIO_LIMIT = 170;

function shortBio(bio: string): string {
  const text = (bio || '').trim();
  if (text.length <= BIO_LIMIT) return text;
  return text.slice(0, BIO_LIMIT).replace(/\s+\S*$/, '') + '…';
}

function DoctorCard({ doctor }: DoctorCardProps) {
  const accepting = doctor.is_accepting_patients;

  return (
    <Card>
      <Media
        src={doctor.photo || undefined}
        alt={`Portrait of ${doctor.display_name}`}
        ratio="portrait"
      />
      <CardBody>
        <Stack gap="sm">
          <CardTitle>{doctor.display_name}</CardTitle>
          <Cluster gap="sm">
            <Badge tone="soft">{doctor.specialty}</Badge>
            <Badge tone={accepting ? 'success' : 'neutral'}>
              {accepting ? 'Accepting new patients' : 'Not accepting patients'}
            </Badge>
          </Cluster>
          <p className="ds-small ds-muted">{shortBio(doctor.bio)}</p>
          <CardMeta>
            <Cluster gap="xs" align="center">
              <Icon name="clock" size={16} />
              <span>{doctor.consultation_minutes}-minute consultations</span>
            </Cluster>
          </CardMeta>
        </Stack>
      </CardBody>
      <CardFooter>
        {accepting ? (
          <Button to="/patient/book" variant="primary">
            Book with {doctor.display_name}
          </Button>
        ) : (
          <Button to="/patient/book" variant="ghost">
            See other doctors
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default DoctorCard;