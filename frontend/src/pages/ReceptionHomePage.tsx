import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Section } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getAppointmentList, getServiceList, updateAppointment } from '../api';
import type { Appointment, Service } from '../types';
import ReceptionHomeHero from '../components/ReceptionHomeHero';
import ReceptionHomeFeatured from '../components/ReceptionHomeFeatured';
import ReceptionHomeCategories from '../components/ReceptionHomeCategories';
import ReceptionHomeAbout from '../components/ReceptionHomeAbout';
import ReceptionHomeCta from '../components/ReceptionHomeCta';
import CheckInList from '../components/CheckInList';
import TodayStats from '../components/TodayStats';

const POLL_INTERVAL_MS = 15000;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail || e?.message || fallback;
}

function ReceptionHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const list = await getAppointmentList();
      setAppointments(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not refresh the live schedule.'));
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    const timer = setInterval(loadAppointments, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  useEffect(() => {
    let active = true;
    getServiceList()
      .then((list) => {
        if (active) setServices(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (active) setServices([]);
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const todayAppointments = useMemo(
    () =>
      (Array.isArray(appointments) ? appointments : [])
        .filter((a) => isToday(a.start_time))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [appointments]
  );

  const activeToday = useMemo(
    () => todayAppointments.filter((a) => a.status !== 'cancelled'),
    [todayAppointments]
  );

  const waitingCount = useMemo(
    () => todayAppointments.filter((a) => a.status === 'checked_in').length,
    [todayAppointments]
  );

  const featuredServices = useMemo(
    () => services.filter((s) => s.is_active).slice(0, 8),
    [services]
  );

  const handleCheckIn = async (id: number): Promise<void> => {
    setError('');
    try {
      await updateAppointment(id, { status: 'checked_in' });
      await loadAppointments();
      setNotice('Patient checked in');
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), 2000);
    } catch (err) {
      setError(errorMessage(err, 'Check-in failed. That appointment may have changed.'));
    }
  };

  const goBook = () => navigate('/staff/reception/book');
  const goAppointments = () => navigate('/staff/reception/appointments');
  const goBilling = () => navigate('/staff/reception/billing');

  return (
    <div className="ds-stack">
      <ReceptionHomeHero onOpenSchedule={goAppointments} />

      <Section
        eyebrow="Front desk"
        title={user?.email ? `Today at the desk, ${user.email}` : 'Today at the desk'}
        subtitle="Live schedule for Cedar Hollow Health. It refreshes every few seconds, so arrivals and cancellations show up without a reload."
      >
        <div className="ds-stack">
          {error && <Alert tone="danger">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          <TodayStats appointments={todayAppointments} />
          <CheckInList appointments={activeToday} onCheckIn={handleCheckIn} />
        </div>
      </Section>

      <ReceptionHomeFeatured
        services={featuredServices}
        loading={servicesLoading}
        onBookService={goBook}
      />

      <ReceptionHomeCategories
        appointmentsToday={activeToday.length}
        waitingCount={waitingCount}
      />

      <ReceptionHomeAbout clinicName="Cedar Hollow Health" onContact={goAppointments} />

      <ReceptionHomeCta
        onBookAppointment={goBook}
        onOpenBilling={goBilling}
        bookTo="/staff/reception/book"
        appointmentsTo="/staff/reception/appointments"
      />
    </div>
  );
}

export default ReceptionHomePage;