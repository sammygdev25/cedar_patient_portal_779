import { PageHeader, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorPatientsHeaderProps {
  title?: string;
  subtitle?: string;
  patientCount?: number;
  doctorName?: string;
  onRefresh?: () => void;
}

export default function DoctorPatientsHeader({
  title = 'My patients',
  subtitle = 'Everyone you have seen or are scheduled to see at Cedar Hollow Health. Open a patient to review their visit history before the next appointment.',
  patientCount = 0,
  doctorName = '',
  onRefresh,
}: DoctorPatientsHeaderProps) {
  const eyebrow = doctorName ? `Care team · ${doctorName}` : 'Care team';

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={
        <Cluster gap="sm" align="center">
          <Badge tone="soft">
            <Icon name="users" size={14} />
            {' '}
            {patientCount} {patientCount === 1 ? 'patient' : 'patients'}
          </Badge>
          {onRefresh && (
            <button type="button" className="btn btn-secondary" onClick={onRefresh}>
              <Icon name="refresh" size={16} />
              {' '}
              Refresh
            </button>
          )}
        </Cluster>
      }
    />
  );
}