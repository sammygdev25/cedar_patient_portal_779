import { Section, Stack, Cluster, Button } from '../components/ui';
import { Icon } from '../components/icons';

interface HomeCtaProps {
  isAuthenticated?: boolean;
}

export default function HomeCta({ isAuthenticated = false }: HomeCtaProps) {
  return (
    <Section tight narrow>
      <div className="ds-card">
        <div className="ds-card-body">
          <Stack gap="md" align="center">
            <span className="ds-eyebrow">Cedar Hollow Health</span>
            <h2 className="ds-card-title">
              {isAuthenticated
                ? 'Ready for your next visit?'
                : 'Care that fits your week, one portal for all of it'}
            </h2>
            <p className="ds-lead ds-muted">
              {isAuthenticated
                ? 'Book with one of our doctors, check your visit notes, or refill a prescription at our in-house pharmacy.'
                : 'Create a free patient account to book appointments, read visit notes, keep your documents, pay bills online and order from our pharmacy.'}
            </p>
            <Cluster gap="sm" justify="center">
              {isAuthenticated ? (
                <>
                  <Button to="/patient/book" variant="primary" size="lg">
                    <Icon name="calendar" size={18} />
                    Book an appointment
                  </Button>
                  <Button to="/patient/pharmacy" variant="secondary" size="lg">
                    <Icon name="package" size={18} />
                    Visit the pharmacy
                  </Button>
                </>
              ) : (
                <>
                  <Button to="/register" variant="primary" size="lg">
                    Create your account
                    <Icon name="arrow-right" size={18} />
                  </Button>
                  <Button to="/login" variant="ghost" size="lg">
                    <Icon name="login" size={18} />
                    Sign in
                  </Button>
                </>
              )}
            </Cluster>
          </Stack>
        </div>
      </div>
    </Section>
  );
}