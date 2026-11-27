import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAppointmentList,
  getServiceList,
  getOrderList,
  getDoctorProfileList,
} from '../api';
import type { Appointment, Service, Order, DoctorProfile } from '../types';
import { Section, Alert } from '../components/ui';
import DoctorHomeHero from '../components/DoctorHomeHero';
import DoctorHomeFeatured from '../components/DoctorHomeFeatured';
import DoctorHomeCategories from '../components/DoctorHomeCategories';
import DoctorHomeAbout from '../components/DoctorHomeAbout';
import DoctorHomeCta from '../components/DoctorHomeCta';
import DoctorScheduleList from '../components/DoctorScheduleList';
import TodayStats from '../components/TodayStats';

const POLL_INTERVAL_MS = 20000;

function isToday(value: string): boolean {
  return new Date(value).toDateString() === new Date().toDateString();
}

function DoctorHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<DoctorProfile[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(true);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadSchedule = useCallback(async () => {
    try {
      const list = await getAppointmentList();
      setAppointments(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError('We could not refresh your schedule. Retrying shortly.');
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
    const timer = window.setInterval(loadSchedule, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadSchedule]);

  useEffect(() => {
    let active = true;
    async function loadSideData() {
      try {
        const list = await getServiceList();
        if (active) setServices(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setServices([]);
      } finally {
        if (active) setLoadingServices(false);
      }
      try {
        const list = await getOrderList();
        if (active) setOrders(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setOrders([]);
      }
      try {
        const list = await getDoctorProfileList();
        if (active) setProfiles(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setProfiles([]);
      }
    }
    loadSideData();
    return () => {
      active = false;
    };
  }, []);

  const myAppointments = useMemo(
    () =>
      (Array.isArray(appointments) ? appointments : []).filter(
        (a) => !user || a.doctor === user.id
      ),
    [appointments, user]
  );

  const todayAppointments = useMemo(
    () =>
      myAppointments
        .filter((a) => isToday(a.start_time) && a.status !== 'cancelled')
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ),
    [myAppointments]
  );

  const patientCount = useMemo(
    () => new Set(myAppointments.map((a) => a.patient)).size,
    [myAppointments]
  );

  const pendingApprovals = useMemo(
    () =>
      (Array.isArray(orders) ? orders : []).filter(
        (o) => o.is_prescription_order && o.approval_status === 'pending'
      ).length,
    [orders]
  );

  const doctorName = useMemo(() => {
    const mine = (Array.isArray(profiles) ? profiles : []).find(
      (p) => user && p.user === user.id
    );
    return mine ? mine.display_name : '';
  }, [profiles, user]);

  const activeServices = useMemo(
    () => (Array.isArray(services) ? services : []).filter((s) => s.is_active).slice(0, 8),
    [services]
  );

  const scrollToSchedule = () => {
    const el = document.getElementById('todays-schedule');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="ds-stack-lg">
      <DoctorHomeHero
        doctorName={doctorName}
        todayCount={todayAppointments.length}
        onViewSchedule={scrollToSchedule}
      />

      <Section
        id="todays-schedule"
        eyebrow="Live schedule"
        title="Today's appointments"
        subtitle="Your day at Cedar Hollow Health, refreshed automatically as patients check in."
      >
        {error && <Alert tone="danger">{error}</Alert>}
        <TodayStats appointments={todayAppointments} />
        <DoctorScheduleList
          appointments={todayAppointments}
          loading={loadingSchedule}
        />
      </Section>

      <DoctorHomeFeatured services={activeServices} loading={loadingServices} />

      <DoctorHomeCategories
        todayCount={todayAppointments.length}
        pendingApprovals={pendingApprovals}
        patientCount={patientCount}
      />

      <DoctorHomeAbout clinicName="Cedar Hollow Health" doctorName={doctorName} />

      <DoctorHomeCta
        doctorName={doctorName}
        pendingApprovals={pendingApprovals}
        onReviewPatients={() => navigate('/staff/doctor/patients')}
        onOpenApprovals={() => navigate('/staff/doctor/approvals')}
      />
    </div>
  );
}

export default DoctorHomePage;