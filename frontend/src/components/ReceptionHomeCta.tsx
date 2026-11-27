import { Section, Button, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionHomeCtaProps {
  onBookAppointment?: () => void;
  onOpenBilling?: () => void;
  bookTo?: string;
  appointmentsTo?: string;
}

export default function ReceptionHomeCta({
  onBookAppointment,
  onOpenBilling,
  bookTo = '/staff/reception/book',
  appointmentsTo = '/staff/reception/appointments',
}: ReceptionHomeCtaProps) {
  return (
    <Section tight>
      <div className="ds-card">
        <div className="ds-card-body">
          <Stack gap="md" align="center">
            <span className="ds-eyebrow">Front desk at Cedar Hollow Health</span>
            <h2 className="ds-card-title">A patient is at the desk. What do they need?</h2>
            <p className="ds-lead ds-muted">
              Book a visit for a walk-in or a caller, find an existing appointment to reschedule or cancel,
              and keep the doctors' schedules free of double bookings.
            </p>
            <Cluster gap="sm" justify="center">
              {onBookAppointment ? (
                <Button variant="primary" size="lg" onClick={onBookAppointment}>
                  <Icon name="calendar" size={18} /> Book an appointment
                </Button>
              ) : (
                <Button variant="primary" size="lg" to={bookTo}>
                  <Icon name="calendar" size={18} /> Book an appointment
                </Button>
              )}
              <Button variant="secondary" size="lg" to={appointmentsTo}>
                <Icon name="list" size={18} /> View all appointments
              </Button>
              {onOpenBilling && (
                <Button variant="ghost" size="lg" onClick={onOpenBilling}>
                  <Icon name="credit-card" size={18} /> Open billing
                </Button>
              )}
            </Cluster>
          </Stack>
        </div>
      </div>
    </Section>
  );
}