import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { getAppointmentList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import DoctorPatientsHeader from '../components/DoctorPatientsHeader';
import DoctorPatientsContent from '../components/DoctorPatientsContent';
import { Card, CardBody, CardTitle, CardMeta, Section } from '../components/ui';

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const box = data as { results?: unknown; data?: unknown; items?: unknown };
    const inner = box.results ?? box.data ?? box.items;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

function DoctorPatientsPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<User[]>([]);
  const [patientIds, setPatientIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [peopleRes, appointments] = await Promise.all([
        api.get('/people/', { params: { role: 'patient' } }),
        getAppointmentList(),
      ]);
      setPeople(toArray<User>(peopleRes.data));
      const ids = (Array.isArray(appointments) ? appointments : []).map((a) =>
        Number((a as unknown as { patient: unknown }).patient)
      );
      setPatientIds(ids.filter((id) => Number.isFinite(id)));
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'We could not load your patients. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patients = useMemo<User[]>(() => {
    if (patientIds.length === 0) return people;
    const wanted = new Set(patientIds);
    return people.filter((p) => wanted.has(Number(p.id)));
  }, [people, patientIds]);

  const selected = useMemo<User | null>(
    () => patients.find((p) => Number(p.id) === selectedId) || null,
    [patients, selectedId]
  );

  const doctorName =
    (user as unknown as { first_name?: string; email?: string } | null)?.first_name ||
    (user as unknown as { email?: string } | null)?.email ||
    '';

  return (
    <div className="ds-stack-lg">
      <DoctorPatientsHeader
        patientCount={patients.length}
        doctorName={doctorName}
        onRefresh={load}
      />
      <DoctorPatientsContent
        patients={patients}
        loading={loading}
        error={error}
        selectedId={selectedId}
        onSelect={(patient: User) => setSelectedId(Number(patient.id))}
      />
      {selected && (
        <Section title="Selected patient" subtitle="Contact details on file at Cedar Hollow Health" narrow>
          <Card>
            <CardBody>
              <CardTitle>{selected.email}</CardTitle>
              <CardMeta>Phone: {selected.phone || 'Not provided'}</CardMeta>
              <CardMeta>Date of birth: {selected.date_of_birth || 'Not provided'}</CardMeta>
            </CardBody>
          </Card>
        </Section>
      )}
    </div>
  );
}

export default DoctorPatientsPage;