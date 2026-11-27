import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppointmentList, updateAppointment } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/ui';
import MyAppointmentsHeader from '../components/MyAppointmentsHeader';
import MyAppointmentsContent from '../components/MyAppointmentsContent';
import MyAppointmentsDetails from '../components/MyAppointmentsDetails';
import RescheduleModal from '../components/RescheduleModal';
import type { Appointment, User } from '../types';

function readString(source: Record<string, unknown> | null, key: string): string {
  const value = source ? source[key] : undefined;
  return typeof value === 'string' ? value : '';
}

function MyAppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const list = await getAppointmentList();
      setAppointments(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError('We could not load your appointments. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleCancel = async (appointment: Appointment) => {
    if (!window.confirm('Cancel this appointment? The time will be released for other patients.')) {
      return;
    }
    try {
      await updateAppointment(appointment.id, { status: 'cancelled' });
      setNotice('Appointment cancelled');
      setError('');
      await loadAppointments();
    } catch (err) {
      setError('The appointment could not be cancelled. Please try again or call the clinic.');
    }
  };

  const handleRescheduled = async () => {
    setRescheduling(null);
    setNotice('Appointment rescheduled');
    await loadAppointments();
  };

  const account = user as unknown as Record<string, unknown> | null;
  const userEmail = readString(account, 'email');
  const fullName = `${readString(account, 'first_name')} ${readString(account, 'last_name')}`.trim();
  const userName = fullName || readString(account, 'username') || userEmail;

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return appointments.filter(
      (a) =>
        (a.status === 'booked' || a.status === 'checked_in') &&
        new Date(a.start_time).getTime() >= now
    ).length;
  }, [appointments]);

  return (
    <div className="ds-stack-lg">
      <MyAppointmentsHeader
        userName={userName}
        userEmail={userEmail}
        upcomingCount={upcomingCount}
        onBook={() => navigate('/patient/book')}
      />
      {notice && (
        <div className="ds-container">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      <MyAppointmentsContent
        appointments={appointments}
        loading={loading}
        error={error}
        onCancel={handleCancel}
        onReschedule={(appointment: Appointment) => setRescheduling(appointment)}
      />
      <MyAppointmentsDetails user={user as unknown as Partial<User> | null} />
      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </div>
  );
}

export default MyAppointmentsPage;