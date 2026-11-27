import { useMemo, useState } from 'react';
import type { User } from '../types';
import { Badge, Card, CardBody, CardFooter, CardMeta, CardTitle, Cluster, EmptyState, Grid, Stack } from './ui';
import { Icon } from './icons';

interface PatientListProps {
  patients: User[];
  onSelect?: (patient: User) => void;
}

type NamedUser = User & { first_name?: string; last_name?: string };

function displayName(patient: User): string {
  const named = patient as NamedUser;
  const full = `${named.first_name || ''} ${named.last_name || ''}`.trim();
  if (full) return full;
  const local = (patient.email || '').split('@')[0];
  return local || 'Unnamed patient';
}

function ageFrom(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function formatDob(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return 'Date of birth not on file';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'Date of birth not on file';
  return dob.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PatientList({ patients, onSelect }: PatientListProps) {
  const [query, setQuery] = useState<string>('');
  const list: User[] = Array.isArray(patients) ? patients : [];

  const filtered = useMemo<User[]>(() => {
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => {
      const haystack = `${displayName(p)} ${p.email || ''} ${p.phone || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [list, query]);

  if (list.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No patients yet"
        text="Patients who book a visit with you at Cedar Hollow Health will appear here."
      />
    );
  }

  return (
    <Stack gap="md">
      <div className="ds-filters">
        <div className="ds-field">
          <label className="ds-label" htmlFor="patient-list-search">
            Search your patients
          </label>
          <input
            id="patient-list-search"
            type="search"
            className="input"
            placeholder="Name, email or phone"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching patients"
          text="Try a different name, email address or phone number."
        />
      ) : (
        <Grid size="md">
          {filtered.map((patient) => {
            const age = ageFrom(patient.date_of_birth);
            return (
              <Card key={patient.id} onClick={onSelect ? () => onSelect(patient) : undefined}>
                <CardBody>
                  <Cluster gap="sm" align="center">
                    <Icon name="user" size={20} />
                    <CardTitle>{displayName(patient)}</CardTitle>
                  </Cluster>
                  <CardMeta>{patient.email}</CardMeta>
                  <Stack gap="xs">
                    <Cluster gap="xs" align="center">
                      <Icon name="phone" size={16} />
                      <span className="ds-small">{patient.phone || 'No phone on file'}</span>
                    </Cluster>
                    <Cluster gap="xs" align="center">
                      <Icon name="calendar" size={16} />
                      <span className="ds-small">{formatDob(patient.date_of_birth)}</span>
                      {age !== null && <Badge tone="soft">{age} yrs</Badge>}
                    </Cluster>
                  </Stack>
                </CardBody>
                {onSelect && (
                  <CardFooter>
                    <Cluster gap="xs" align="center">
                      <span className="ds-small">View summary</span>
                      <Icon name="arrow-right" size={16} />
                    </Cluster>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}

export default PatientList;