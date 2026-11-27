import type { Prescription } from '../types';
import { Badge, EmptyState, Grid } from './ui';
import { Icon } from './icons';

interface PrescriptionPickerProps {
  prescriptions: Prescription[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function formatIssued(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function unavailableReason(rx: Prescription): string {
  if (!rx.is_active) return 'This prescription is no longer active.';
  if (!rx.product) return 'Not stocked by the Cedar Hollow pharmacy. Ask the front desk for help.';
  return '';
}

function PrescriptionPicker({ prescriptions, selectedId, onSelect }: PrescriptionPickerProps) {
  const list: Prescription[] = Array.isArray(prescriptions) ? prescriptions : [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="No prescriptions on file"
        text="When your Cedar Hollow doctor prescribes a medicine, it will appear here so you can order it for pickup or delivery."
      />
    );
  }

  return (
    <div role="radiogroup" aria-label="Choose a prescription to order">
      <Grid size="md">
        {list.map((rx) => {
          const reason = unavailableReason(rx);
          const disabled = reason !== '';
          const selected = selectedId === rx.id;
          const issued = formatIssued(rx.created_at);

          return (
            <button
              key={rx.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onSelect(rx.id)}
              className="ds-card"
              style={{
                textAlign: 'left',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                borderColor: selected ? 'var(--color-primary)' : undefined,
                borderWidth: selected ? 2 : undefined,
                borderStyle: selected ? 'solid' : undefined,
              }}
            >
              <div className="ds-card-body">
                <div className="ds-between">
                  <h3 className="ds-card-title">{rx.medicine_name}</h3>
                  {selected ? (
                    <Badge tone="primary">
                      <Icon name="check" size={14} /> Selected
                    </Badge>
                  ) : disabled ? (
                    <Badge tone="neutral">Unavailable</Badge>
                  ) : (
                    <Badge tone="soft">Ready to order</Badge>
                  )}
                </div>
                <p className="ds-card-meta">{rx.dosage}</p>
                {rx.instructions ? <p className="ds-small ds-muted">{rx.instructions}</p> : null}
                <div className="ds-cluster ds-small ds-muted">
                  {issued ? (
                    <span className="ds-cluster">
                      <Icon name="calendar" size={14} /> Issued {issued}
                    </span>
                  ) : null}
                  <span className="ds-cluster">
                    <Icon name="refresh" size={14} /> {rx.refills_allowed}{' '}
                    {rx.refills_allowed === 1 ? 'refill' : 'refills'} allowed
                  </span>
                </div>
                {disabled ? (
                  <p className="ds-small ds-muted">
                    <Icon name="info" size={14} /> {reason}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </Grid>
    </div>
  );
}

export default PrescriptionPicker;