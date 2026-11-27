import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { Prescription } from '../types';

interface PrescriptionListProps {
  prescriptions: Prescription[];
  onOrder?: (prescriptionId: number) => void;
}

function formatIssued(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function refillLabel(count: number): string {
  if (count === 0) return 'No refills';
  return count === 1 ? '1 refill allowed' : `${count} refills allowed`;
}

function PrescriptionList({ prescriptions, onOrder }: PrescriptionListProps) {
  const items: Prescription[] = Array.isArray(prescriptions) ? prescriptions : [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="No prescriptions yet"
        text="When a Cedar Hollow Health doctor prescribes a medicine after your visit, it will appear here and you can order it from our pharmacy."
      />
    );
  }

  return (
    <Grid size="md">
      {items.map((prescription) => {
        const canOrder = Boolean(onOrder) && prescription.is_active && Boolean(prescription.product);
        return (
          <Card key={prescription.id}>
            <CardBody>
              <Stack gap="sm">
                <CardTitle>{prescription.medicine_name}</CardTitle>
                <CardMeta>
                  {prescription.dosage}
                  {prescription.created_at ? ` · Issued ${formatIssued(prescription.created_at)}` : ''}
                </CardMeta>
                <div>
                  <Badge tone={prescription.is_active ? 'success' : 'neutral'}>
                    {prescription.is_active ? 'Active' : 'Inactive'}
                  </Badge>{' '}
                  <Badge tone="soft">{refillLabel(prescription.refills_allowed)}</Badge>
                </div>
                <p className="ds-small">{prescription.instructions}</p>
                {prescription.notes ? (
                  <p className="ds-small ds-muted">Doctor's note: {prescription.notes}</p>
                ) : null}
              </Stack>
            </CardBody>
            <CardFooter>
              {canOrder ? (
                <Button variant="primary" onClick={() => onOrder && onOrder(prescription.id)}>
                  <Icon name="cart" size={16} /> Order from pharmacy
                </Button>
              ) : (
                <span className="ds-small ds-muted">
                  {prescription.is_active
                    ? 'Not available in our pharmacy'
                    : 'This prescription is no longer active'}
                </span>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </Grid>
  );
}

export default PrescriptionList;