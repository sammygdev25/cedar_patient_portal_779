import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Section, SkeletonCards, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { User } from '../types';

interface DoctorPatientsContentProps {
  section?: string;
  page?: string;
  patients?: User[];
  loading?: boolean;
  error?: string;
  selectedId?: number | null;
  onSelect?: (patient: User) => void;
}

function formatBirthDate(value: string | null | undefined): string {
  if (!value) return 'Date of birth not on file';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date of birth not on file';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DoctorPatientsContent({
  patients = [],
  loading = false,
  error = '',
  selectedId = null,
  onSelect,
}: DoctorPatientsContentProps) {
  const [query, setQuery] = useState<string>('');

  const list: User[] = Array.isArray(patients) ? patients : [];

  const visible = useMemo<User[]>(() => {
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) =>
      `${p.email || ''} ${p.phone || ''}`.toLowerCase().includes(term)
    );
  }, [list, query]);

  return (
    <Section
      eyebrow="Your panel"
      title="Patients under your care"
      subtitle="Everyone who has booked a visit with you at Cedar Hollow Health. Open a patient to review their visits, notes and prescriptions."
    >
      <Stack gap="md">
        <div className="ds-filters">
          <div className="ds-field">
            <label className="ds-label" htmlFor="doctor-patient-search">
              Find a patient
            </label>
            <input
              id="doctor-patient-search"
              className="input"
              type="search"
              placeholder="Search by email or phone"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {loading ? (
          <SkeletonCards count={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="users"
            title={list.length === 0 ? 'No patients yet' : 'No patients match your search'}
            text={
              list.length === 0
                ? 'Patients appear here once they have an appointment booked with you.'
                : 'Try a different email address or phone number.'
            }
            action={
              query ? (
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Grid size="md">
            {visible.map((patient) => (
              <Card key={patient.id}>
                <CardBody>
                  <Stack gap="sm">
                    <CardTitle>{patient.email}</CardTitle>
                    {selectedId === patient.id && <Badge tone="primary">Selected</Badge>}
                    <CardMeta>
                      <Icon name="phone" size={16} /> {patient.phone || 'No phone on file'}
                    </CardMeta>
                    <CardMeta>
                      <Icon name="calendar" size={16} /> {formatBirthDate(patient.date_of_birth)}
                    </CardMeta>
                  </Stack>
                </CardBody>
                <CardFooter>
                  <Button
                    variant={selectedId === patient.id ? 'secondary' : 'primary'}
                    onClick={() => onSelect && onSelect(patient)}
                  >
                    View patient <Icon name="arrow-right" size={16} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </Stack>
    </Section>
  );
}