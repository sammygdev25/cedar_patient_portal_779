import { Hero, Button, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface PatientHomeHeroProps {
  firstName?: string;
  imageUrl?: string;
  nextAppointmentLabel?: string;
  onViewAppointments?: () => void;
}

export default function PatientHomeHero({
  firstName,
  imageUrl = '/img/brand/hero.jpg',
  nextAppointmentLabel,
  onViewAppointments,
}: PatientHomeHeroProps) {
  const title = firstName
    ? `Welcome back, ${firstName}. Your care at Cedar Hollow Health.`
    : 'Your care at Cedar Hollow Health, all in one place.';

  const text = nextAppointmentLabel
    ? `Your next visit is ${nextAppointmentLabel}. Book, reschedule or cancel appointments, and read your visit notes and prescriptions whenever you need them.`
    : 'Book appointments with our doctors, read your visit notes and prescriptions, and keep your documents together. Pay bills securely and order from our in-house pharmacy without leaving the portal.';

  return (
    <Hero
      eyebrow="Patient portal"
      title={title}
      text={text}
      actions={
        <>
          <Button variant="primary" size="lg" to="/patient/book">
            <Icon name="calendar" size={18} />
            Book an appointment
          </Button>
          {onViewAppointments ? (
            <Button variant="ghost" size="lg" onClick={onViewAppointments}>
              <Icon name="clock" size={18} />
              My appointments
            </Button>
          ) : (
            <Button variant="ghost" size="lg" to="/patient/appointments">
              <Icon name="clock" size={18} />
              My appointments
            </Button>
          )}
        </>
      }
      media={
        imageUrl ? (
          <Media src={imageUrl} alt="Cedar Hollow Health clinic" ratio="wide" />
        ) : undefined
      }
    />
  );
}