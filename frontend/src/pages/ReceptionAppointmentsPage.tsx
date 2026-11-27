import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getAppointmentList, updateAppointment } from '../api';
import type { Appointment } from '../types';
import ReceptionAppointmentsHeader from '../components/ReceptionAppointmentsHeader';
import ReceptionAppointmentsContent from '../components/ReceptionAppointmentsContent';
import RescheduleModal from '../components/RescheduleModal';

const POLL_INTERVAL_MS = 15000;

interface DisplayUser {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

function isSameDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function ReceptionAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2000);
  }, []);

  const loadAppointments = useCallback(async (silent: boolean) => {
    if (!silent) setRefreshing(true);
    try {
      const list = await getAppointmentList();
      const sorted = [...(Array.isArray(list) ? list : [])].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setAppointments(sorted);
      setError('');
    } catch (err) {
      if (!silent) {
        setError('We could not load the appointment schedule. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments(true);
    const timer = setInterval(() => loadAppointments(true), POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [loadAppointments]);

  const changeStatus = useCallback(
    async (id: number, status: 'checked_in' | 'cancelled', doneLabel: string) => {
      setError('');
      try {
        await updateAppointment(id, { status });
        showNotice(doneLabel);
        await loadAppointments(true);
      } catch (err) {
        setError(
          status === 'checked_in'
            ? 'The patient could not be checked in. Please refresh and try again.'
            : 'The appointment could not be cancelled. Please refresh and try again.'
        );
      }
    },
    [loadAppointments, showNotice]
  );

  const handleCheckIn = useCallback(
    (id: number) => {
      changeStatus(id, 'checked_in', 'Patient checked in');
    },
    [changeStatus]
  );

  const handleCancel = useCallback(
    (id: number) => {
      changeStatus(id, 'cancelled', 'Appointment cancelled');
    },
    [changeStatus]
  );

  const handleRescheduled = useCallback(() => {
    setRescheduling(null);
    showNotice('Appointment rescheduled');
    loadAppointments(true);
  }, [loadAppointments, showNotice]);

  const displayUser = user as DisplayUser | null;
  const fullName = [displayUser?.first_name, displayUser?.last_name].filter(Boolean).join(' ');
  const userName = fullName || displayUser?.username || '';

  const todayCount = useMemo(() => {
    const now = new Date();
    return appointments.filter(
      (a) => a.status !== 'cancelled' && isSameDay(a.start_time, now)
    ).length;
  }, [appointments]);

  return (
    <div className="ds-stack-lg">
      <ReceptionAppointmentsHeader
        userName={userName}
        userEmail={displayUser?.email || ''}
        totalCount={appointments.length}
        todayCount={todayCount}
        onRefresh={() => loadAppointments(false)}
        refreshing={refreshing}
      />
      {error && (
        <div className="ds-container">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="ds-container">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      <ReceptionAppointmentsContent
        appointments={appointments}
        loading={loading}
        onCheckIn={handleCheckIn}
        onCancel={handleCancel}
        onReschedule={(appointment: Appointment) => setRescheduling(appointment)}
      />
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

export default ReceptionAppointmentsPage;