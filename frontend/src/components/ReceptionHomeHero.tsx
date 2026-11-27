import { Hero, Button, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionHomeHeroProps {
  imageUrl?: string;
  imageAlt?: string;
  onOpenSchedule?: () => void;
}

export default function ReceptionHomeHero({
  imageUrl = '/img/brand/hero.jpg',
  imageAlt = 'Front desk at Cedar Hollow Health',
  onOpenSchedule,
}: ReceptionHomeHeroProps) {
  const mediaProps = imageUrl
    ? { media: <Media src={imageUrl} alt={imageAlt} ratio="wide" /> }
    : {};

  return (
    <Hero
      eyebrow="Cedar Hollow Health front desk"
      title="Run today's clinic from one live schedule"
      text="See every doctor's day as it changes, check patients in as they arrive and book walk-ins without ever double booking a slot. Pharmacy orders, billing and reports are one click away so the front desk never has to switch tools."
      actions={
        <>
          <Button variant="primary" size="lg" to="/staff/reception/appointments" onClick={onOpenSchedule}>
            <Icon name="calendar" size={18} />
            Open today's appointments
          </Button>
          <Button variant="ghost" size="lg" to="/staff/reception/book">
            <Icon name="plus" size={18} />
            Book a patient
          </Button>
        </>
      }
      {...mediaProps}
    />
  );
}