import type { ReactNode } from 'react';
import { PageHeader, Button } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionBookingHeaderProps {
  section?: string;
  page?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: ReactNode;
}

function ReceptionBookingHeader({
  eyebrow = 'Front desk',
  title = 'Book an appointment for a patient',
  subtitle = 'Find the patient, choose a doctor and an open slot, and confirm. Cedar Hollow Health never double books a doctor, so only free times are offered.',
}: ReceptionBookingHeaderProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Button variant="secondary" to="/staff/reception/appointments">
            <Icon name="calendar" size={18} />
            View appointments
          </Button>
          <Button variant="ghost" to="/staff/reception">
            <Icon name="arrow-left" size={18} />
            Back to front desk
          </Button>
        </>
      }
    />
  );
}

export default ReceptionBookingHeader;