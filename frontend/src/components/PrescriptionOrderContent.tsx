import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Section, SkeletonCards, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { Prescription } from '../types';

interface PrescriptionOrderContentProps {
  prescriptions?: Prescription[];
  loading?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  error?: string;
  children?: ReactNode;
}

export default function PrescriptionOrderContent({
  prescriptions = [],
  loading = false,
  selectedId = null,
  onSelect,
  onSubmit,
  submitting = false,
  error = '',
  children,
}: PrescriptionOrderContentProps) {
  const list = Array.isArray(prescriptions) ? prescriptions.filter((p) => p.is_active !== false) : [];
  const selected = list.find((p) => p.id === selectedId);

  if (loading) {
    return (
      <Section title="Your prescriptions" subtitle="Loading what your Cedar Hollow doctors have prescribed.">
        <SkeletonCards count={3} />
      </Section>
    );
  }

  if (list.length === 0) {
    return (
      <Section title="Your prescriptions">
        <EmptyState
          icon="book"
          title="No active prescriptions on file"
          text="When a Cedar Hollow doctor prescribes a medicine after your visit, it will appear here ready to order from our in-house pharmacy."
          action={<Button to="/patient/pharmacy" variant="secondary">Browse the pharmacy</Button>}
        />
      </Section>
    );
  }

  return (
    <Section
      title="Choose a prescription to fill"
      subtitle="Pick the medicine you want from our in-house pharmacy. Your prescribing doctor reviews the order before it is packed."
    >
      <Stack gap="lg">
        <Grid size="md">
          {list.map((p) => {
            const orderable = !!p.product;
            const isSelected = p.id === selectedId;
            return (
              <Card key={p.id}>
                <CardBody>
                  <Stack gap="sm">
                    <CardTitle>{p.medicine_name}</CardTitle>
                    <CardMeta>{p.dosage}</CardMeta>
                    <p className="ds-small ds-muted">{p.instructions}</p>
                    <div className="ds-cluster">
                      <Badge tone="soft">{p.refills_allowed} refills allowed</Badge>
                      {!orderable && <Badge tone="danger">Not stocked in pharmacy</Badge>}
                      {isSelected && <Badge tone="success">Selected</Badge>}
                    </div>
                  </Stack>
                </CardBody>
                <CardFooter>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    disabled={!orderable}
                    onClick={() => onSelect && onSelect(p.id)}
                  >
                    <Icon name="check" size={16} />
                    {isSelected ? 'Selected' : 'Select'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </Grid>

        {children}

        {error && <Alert tone="danger">{error}</Alert>}

        <div className="ds-form-actions">
          <Button variant="primary" size="lg" disabled={!selected || submitting} onClick={() => onSubmit && onSubmit()}>
            <Icon name="package" size={18} />
            {submitting ? 'Placing order…' : selected ? `Order ${selected.medicine_name}` : 'Select a prescription'}
          </Button>
        </div>
      </Stack>
    </Section>
  );
}