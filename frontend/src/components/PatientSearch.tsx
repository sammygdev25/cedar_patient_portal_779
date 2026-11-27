import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { User } from '../types';
import { Badge, Card, CardBody, CardMeta, CardTitle, EmptyState, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface PatientSearchProps {
  patients: User[];
  onSelect: (patient: User) => void;
}

function formatBirthDate(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PatientSearch({ patients, onSelect }: PatientSearchProps) {
  const [query, setQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const safePatients: User[] = Array.isArray(patients) ? patients : [];

  const matches = useMemo<User[]>(() => {
    const term = query.trim().toLowerCase();
    if (!term) return safePatients;
    return safePatients.filter((patient) => {
      const email = (patient.email || '').toLowerCase();
      const phone = (patient.phone || '').toLowerCase();
      return email.includes(term) || phone.includes(term);
    });
  }, [safePatients, query]);

  const handleSelect = (patient: User) => {
    setSelectedId(patient.id);
    onSelect(patient);
  };

  return (
    <Stack gap="md">
      <div className="ds-field">
        <label className="ds-label" htmlFor="patient-search-input">
          Find a patient
        </label>
        <input
          id="patient-search-input"
          type="search"
          className="input"
          placeholder="Search by email or phone number"
          value={query}
          autoComplete="off"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        />
        <span className="ds-help">
          {matches.length} of {safePatients.length} patients shown
        </span>
      </div>

      {safePatients.length === 0 ? (
        <EmptyState
          icon="users"
          title="No patients registered yet"
          text="Patients appear here once they create a Cedar Hollow Health account."
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon="search"
          title="No patients match your search"
          text="Check the spelling of the email address or try the phone number instead."
        />
      ) : (
        <Stack gap="sm">
          {matches.map((patient) => {
            const birthDate = formatBirthDate(patient.date_of_birth);
            const isSelected = selectedId === patient.id;
            return (
              <Card key={patient.id} onClick={() => handleSelect(patient)}>
                <CardBody>
                  <Cluster justify="between" align="center">
                    <Stack gap="xs">
                      <CardTitle>
                        <Cluster gap="sm" align="center">
                          <Icon name="user" size={18} />
                          <span>{patient.email}</span>
                        </Cluster>
                      </CardTitle>
                      <CardMeta>
                        {patient.phone ? patient.phone : 'No phone on file'}
                        {birthDate ? ` · Born ${birthDate}` : ''}
                      </CardMeta>
                    </Stack>
                    {isSelected ? (
                      <Badge tone="success">Selected</Badge>
                    ) : (
                      <Badge tone="soft">Select</Badge>
                    )}
                  </Cluster>
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

export default PatientSearch;