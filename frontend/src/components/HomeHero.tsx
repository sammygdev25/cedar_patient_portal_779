import { Button, Hero, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface HomeHeroProps {
  imageUrl?: string;
  isAuthenticated?: boolean;
}

export default function HomeHero({ imageUrl = '/img/brand/hero.jpg', isAuthenticated = false }: HomeHeroProps) {
  const media = imageUrl ? (
    <Media src={imageUrl} alt="Cedar Hollow Health clinic" ratio="wide" />
  ) : undefined;

  const actions = (
    <>
      <Button variant="primary" size="lg" to="/patient/book">
        Book an appointment
        <Icon name="arrow-right" size={18} />
      </Button>
      <Button variant="ghost" size="lg" to={isAuthenticated ? '/patient' : '/login'}>
        <Icon name="user" size={18} />
        {isAuthenticated ? 'Open my portal' : 'Patient sign in'}
      </Button>
    </>
  );

  return (
    <Hero
      eyebrow="Cedar Hollow Health"
      title="Care that fits around your life"
      text="Book visits with our doctors online, read your visit notes and prescriptions, and keep your documents and bills in one secure place. Order your medicines from our in-house pharmacy and pick them up or have them delivered."
      actions={actions}
      media={media}
    />
  );
}