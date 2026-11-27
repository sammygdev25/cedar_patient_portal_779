import { Hero, Button, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorHomeHeroProps {
  doctorName?: string;
  todayCount?: number;
  imageUrl?: string;
  imageAlt?: string;
  onViewSchedule?: () => void;
}

export default function DoctorHomeHero({
  doctorName = '',
  todayCount = 0,
  imageUrl = '',
  imageAlt = 'Cedar Hollow Health clinic',
  onViewSchedule,
}: DoctorHomeHeroProps) {
  const greeting = doctorName ? `Welcome back, ${doctorName}` : 'Welcome back to your clinic day';
  const countText =
    todayCount === 0
      ? 'Your schedule is clear for now.'
      : todayCount === 1
        ? 'You have 1 appointment on your schedule today.'
        : `You have ${todayCount} appointments on your schedule today.`;

  const media = imageUrl ? <Media src={imageUrl} alt={imageAlt} ratio="wide" /> : undefined;

  const heroProps = media ? { media } : {};

  return (
    <Hero
      eyebrow="Cedar Hollow Health · Doctor portal"
      title={greeting}
      text={`${countText} Review who is checked in, open visit notes and approve prescription orders from one place, with the schedule refreshing as reception checks patients in.`}
      actions={
        <>
          <Button variant="primary" size="lg" to="/staff/doctor/patients">
            <Icon name="users" size={18} />
            View my patients
          </Button>
          {onViewSchedule ? (
            <Button variant="ghost" size="lg" onClick={onViewSchedule}>
              <Icon name="calendar" size={18} />
              Today&apos;s schedule
            </Button>
          ) : (
            <Button variant="ghost" size="lg" to="/staff/doctor/approvals">
              <Icon name="check" size={18} />
              Pending approvals
            </Button>
          )}
        </>
      }
      {...heroProps}
    />
  );
}