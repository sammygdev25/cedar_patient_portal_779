import React from 'react';
import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface BookAppointmentHeaderProps {
  section?: string;
  page?: string;
  patientName?: string;
  upcomingCount?: number;
  onViewAppointments?: () => void;
}

function BookAppointmentHeader({
  patientName = '',
  upcomingCount = 0,
  onViewAppointments,
}: BookAppointmentHeaderProps) {
  const eyebrow = patientName
    ? `Cedar Hollow Health · ${patientName}`
    : 'Cedar Hollow Health';

  const actions = (
    <Cluster gap="sm" align="center">
      {upcomingCount > 0 && (
        <Badge tone="soft">
          {upcomingCount} upcoming {upcomingCount === 1 ? 'visit' : 'visits'}
        </Badge>
      )}
      {onViewAppointments ? (
        <Button variant="secondary" onClick={onViewAppointments}>
          <Icon name="calendar" size={16} />
          My appointments
        </Button>
      ) : (
        <Button variant="secondary" to="/patient/appointments">
          <Icon name="calendar" size={16} />
          My appointments
        </Button>
      )}
    </Cluster>
  );

  return (
    <PageHeader
      eyebrow={eyebrow}
      title="Book an appointment"
      subtitle="Choose a service and a doctor, pick an open time and tell us why you are coming in. Your visit is confirmed as soon as you book."
      actions={actions}
    />
  );
}

export default BookAppointmentHeader;