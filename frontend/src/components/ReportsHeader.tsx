import { PageHeader, Button, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface ReportsHeaderProps {
  monthLabel?: string;
  onPrint?: () => void;
}

export default function ReportsHeader({ monthLabel, onPrint }: ReportsHeaderProps) {
  const subtitle = monthLabel
    ? `Appointments and bills for ${monthLabel} at Cedar Hollow Health, ready to download as a CSV file for the front desk and billing records.`
    : 'Download a monthly CSV of Cedar Hollow Health appointments and bills for the front desk and billing records.';

  return (
    <PageHeader
      eyebrow="Reception"
      title="Monthly reports"
      subtitle={subtitle}
      actions={
        <div className="ds-cluster">
          {monthLabel && (
            <Badge tone="soft">
              <Icon name="calendar" size={14} /> {monthLabel}
            </Badge>
          )}
          {onPrint && (
            <Button variant="secondary" onClick={onPrint}>
              <Icon name="download" size={16} /> Print summary
            </Button>
          )}
          <Button variant="ghost" to="/staff/reception">
            <Icon name="arrow-left" size={16} /> Back to reception
          </Button>
        </div>
      }
    />
  );
}