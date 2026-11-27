import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getAppointmentList, getDoctorProfileList, getServiceList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Alert, LoadingBlock } from '../components/ui';
import BookAppointmentHeader from '../components/BookAppointmentHeader';
import BookAppointmentForm from '../components/BookAppointmentForm';
import BookAppointmentInfo from '../components/BookAppointmentInfo';

type FormProps = ComponentProps<typeof BookAppointmentForm>;
type Slot = FormProps['slots'][number];
type Doctor = FormProps['doctors'][number];
type ServiceItem = FormProps['services'][number];

function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toSlotList(data: unknown): Slot[] {
  if (Array.isArray(data)) return data as Slot[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const inner = record.slots ?? record.results ?? record.data;
    if (Array.isArray(inner)) return inner as Slot[];
  }
  return [];
}

function BookAppointmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(0);
  const [date, setDate] = useState<string>(todayString());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const patientName = useMemo<string>(() => {
    const record = (user || {}) as unknown as Record<string, unknown>;
    const first = typeof record.first_name === 'string' ? record.first_name : '';
    const username = typeof record.username === 'string' ? record.username : '';
    return first || username;
  }, [user]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [doctorList, serviceList, appointmentList] = await Promise.all([
          getDoctorProfileList(),
          getServiceList(),
          getAppointmentList(),
        ]);
        if (!active) return;
        const acceptingDoctors = (doctorList as Doctor[]).filter(
          (d) => (d as unknown as { is_accepting_patients?: boolean }).is_accepting_patients !== false,
        );
        setDoctors(acceptingDoctors);
        setServices(
          (serviceList as ServiceItem[]).filter(
            (s) => (s as unknown as { is_active?: boolean }).is_active !== false,
          ),
        );
        const now = Date.now();
        const upcoming = (appointmentList as Array<{ status: string; start_time: string }>).filter(
          (a) =>
            (a.status === 'booked' || a.status === 'checked_in') &&
            new Date(a.start_time).getTime() >= now,
        );
        setUpcomingCount(upcoming.length);
      } catch (err) {
        if (active) setError('We could not load doctors and services. Please refresh the page and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const loadSlots = useCallback(async (doctorId: number, day: string, isActive: () => boolean) => {
    if (!doctorId || !day) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const response = await api.get('/availability/', { params: { doctor: doctorId, date: day } });
      if (isActive()) setSlots(toSlotList(response.data));
    } catch (err) {
      if (isActive()) {
        setSlots([]);
        setError('We could not load available times for that day. Please pick another date or doctor.');
      }
    } finally {
      if (isActive()) setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedSlot(null);
    loadSlots(selectedDoctorId, date, () => active);
    return () => {
      active = false;
    };
  }, [selectedDoctorId, date, loadSlots]);

  const handleDoctorSelect = (id: number) => {
    setError('');
    setSelectedDoctorId(id);
  };

  const handleDateChange = (value: string) => {
    setError('');
    setDate(value);
  };

  if (loading) {
    return <LoadingBlock label="Loading Cedar Hollow Health doctors and services..." />;
  }

  return (
    <div className="ds-stack-lg">
      <BookAppointmentHeader
        patientName={patientName}
        upcomingCount={upcomingCount}
        onViewAppointments={() => navigate('/patient/appointments')}
      />
      {error && (
        <div className="ds-container">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <BookAppointmentForm
        doctors={doctors}
        services={services}
        slots={slots}
        slotsLoading={slotsLoading}
        selectedDoctorId={selectedDoctorId}
        selectedSlot={selectedSlot}
        date={date}
        onDoctorSelect={handleDoctorSelect}
        onSlotSelect={setSelectedSlot}
        onDateChange={handleDateChange}
      />
      <BookAppointmentInfo />
    </div>
  );
}

export default BookAppointmentPage;