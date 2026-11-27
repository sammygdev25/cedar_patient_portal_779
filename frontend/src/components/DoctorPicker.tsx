import type { DoctorProfile } from '../types';
import { Badge, Card, CardBody, CardMeta, CardTitle, EmptyState, Grid, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface DoctorPickerProps {
  doctors: DoctorProfile[];
  selectedId: number | null;
  onSelect: (doctorUserId: number, doctor: DoctorProfile) => void;
}

function DoctorPicker({ doctors, selectedId, onSelect }: DoctorPickerProps) {
  const list: DoctorProfile[] = Array.isArray(doctors) ? doctors : [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No doctors available right now"
        text="Our care team schedule is being updated. Please check back shortly or call the Cedar Hollow Health front desk."
      />
    );
  }

  return (
    <Grid size="sm">
      {list.map((doctor) => {
        const isSelected = selectedId !== null && selectedId !== undefined && selectedId === doctor.user;
        const available = doctor.is_accepting_patients;

        return (
          <Card
            key={doctor.user}
            onClick={available ? () => onSelect(doctor.user, doctor) : undefined}
            className={isSelected ? 'is-selected' : undefined}
          >
            <div
              style={{
                outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                outlineOffset: '-2px',
                borderRadius: 'var(--radius-md)',
                opacity: available ? 1 : 0.6,
              }}
            >
              <Media src={doctor.photo || undefined} alt={doctor.display_name} ratio="square" />
              <CardBody>
                <CardTitle>{doctor.display_name}</CardTitle>
                <CardMeta>{doctor.specialty}</CardMeta>
                <CardMeta>
                  <Icon name="clock" size={14} /> {doctor.consultation_minutes} min consultation
                </CardMeta>
                <div className="ds-cluster">
                  {available ? (
                    <Badge tone="success">Accepting patients</Badge>
                  ) : (
                    <Badge tone="danger">Not accepting patients</Badge>
                  )}
                  {isSelected && (
                    <Badge tone="primary">
                      <Icon name="check" size={14} /> Selected
                    </Badge>
                  )}
                </div>
              </CardBody>
            </div>
          </Card>
        );
      })}
    </Grid>
  );
}

export default DoctorPicker;