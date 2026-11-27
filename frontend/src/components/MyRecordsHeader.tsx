import type { ReactNode } from 'react';
import { PageHeader, Button, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface MyRecordsHeaderProps {
  patientName?: string;
  noteCount?: number;
  prescriptionCount?: number;
  activePrescriptionCount?: number;
  onRefresh?: () => void;
  actions?: ReactNode;
}

export default function MyRecordsHeader({
  patientName = '',
  noteCount = 0,
  prescriptionCount = 0,
  activePrescriptionCount = 0,
  onRefresh,
  actions,
}: MyRecordsHeaderProps) {
  const greeting = patientName ? `${patientName}, your health records` : 'Your health records';

  return (
    <PageHeader
      eyebrow="Cedar Hollow Health"
      title={greeting}
      subtitle="Visit notes and prescriptions written by your doctors. Only you can read them; our reception team cannot see this page."
      actions={
        <div className="ds-cluster">
          <Badge tone="soft">
            <Icon name="book" size={14} title="Visit notes" /> {noteCount} visit {noteCount === 1 ? 'note' : 'notes'}
          </Badge>
          <Badge tone="primary">
            <Icon name="package" size={14} title="Prescriptions" /> {activePrescriptionCount} of {prescriptionCount} prescriptions active
          </Badge>
          <Badge tone="neutral">
            <Icon name="shield" size={14} title="Private" /> Private to you
          </Badge>
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh}>
              <Icon name="refresh" size={16} /> Refresh
            </Button>
          )}
          {actions}
        </div>
      }
    />
  );
}