import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getVisitNoteList, getPrescriptionList } from '../api';
import type { VisitNote, Prescription } from '../types';
import MyRecordsHeader from '../components/MyRecordsHeader';
import MyRecordsContent from '../components/MyRecordsContent';

function MyRecordsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [noteList, prescriptionList] = await Promise.all([
        getVisitNoteList(),
        getPrescriptionList(),
      ]);
      setNotes(Array.isArray(noteList) ? noteList : []);
      setPrescriptions(Array.isArray(prescriptionList) ? prescriptionList : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message || 'We could not load your records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const patientName = useMemo(() => {
    const profile = (user || {}) as Record<string, unknown>;
    const first = typeof profile.first_name === 'string' ? profile.first_name : '';
    const last = typeof profile.last_name === 'string' ? profile.last_name : '';
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (typeof profile.username === 'string' && profile.username) return profile.username;
    if (typeof profile.email === 'string') return profile.email;
    return '';
  }, [user]);

  const activePrescriptionCount = useMemo(
    () => prescriptions.filter((p) => p.is_active).length,
    [prescriptions]
  );

  const handleOrder = (prescription: Prescription) => {
    navigate(`/patient/prescription-order?prescription=${prescription.id}`);
  };

  return (
    <div className="ds-stack-lg">
      <MyRecordsHeader
        patientName={patientName}
        noteCount={notes.length}
        prescriptionCount={prescriptions.length}
        activePrescriptionCount={activePrescriptionCount}
        onRefresh={loadRecords}
      />
      <MyRecordsContent
        notes={notes}
        prescriptions={prescriptions}
        loading={loading}
        error={error}
        onOrder={handleOrder}
      />
    </div>
  );
}

export default MyRecordsPage;