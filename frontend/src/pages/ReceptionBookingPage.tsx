import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getDoctorProfileList, getServiceList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { DoctorProfile, Service, User } from '../types';
import { Alert, LoadingBlock } from '../components/ui';
import ReceptionBookingHeader from '../components/ReceptionBookingHeader';
import ReceptionBookingForm from '../components/ReceptionBookingForm';
import ReceptionBookingInfo from '../components/ReceptionBookingInfo';
import PatientSearch from '../components/PatientSearch';
import DoctorPicker from '../components/DoctorPicker';
import SlotPicker from '../components/SlotPicker';

type SlotItem = ComponentProps<typeof SlotPicker>['slots'][number];

function toList<T>(data: unknown, key = 'slots'): T[] {
  if (Array.isArray(data)) return data as T[];
  const obj = (data || {}) as Record<string, unknown>;
  const found = obj.results ?? obj[key] ?? obj.data ?? obj.items;
  return Array.isArray(found) ? (found as T[]) : [];
}

function todayString(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function ReceptionBookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(todayString());
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [slotsVersion, setSlotsVersion] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [doctorList, serviceList, peopleRes] = await Promise.all([
          getDoctorProfileList(),
          getServiceList(),
          api.get('/people/', { params: { role: 'patient' } }),
        ]);
        if (!active) return;
        setDoctors(Array.isArray(doctorList) ? doctorList : []);
        setServices(Array.isArray(serviceList) ? serviceList : []);
        setPatients(toList<User>(peopleRes.data, 'people'));
      } catch (err) {
        if (active) setError('We could not load patients and doctors. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedSlot(null);
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    api
      .get('/availability/', { params: { doctor: doctorId, date } })
      .then((res) => {
        if (active) setSlots(toList<SlotItem>(res.data));
      })
      .catch(() => {
        if (active) {
          setSlots([]);
          setError('We could not load open times for this doctor.');
        }
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [doctorId, date, slotsVersion]);

  const acceptingDoctors = useMemo(
    () => doctors.filter((d) => d.is_accepting_patients !== false),
    [doctors]
  );

  const handleBooked = () => {
    setSlotsVersion((v) => v + 1);
    navigate('/staff/reception/appointments');
  };

  if (loading) return <LoadingBlock label="Loading the front desk booking tools..." />;

  const notStaff = user && user.role === 'patient';

  return (
    <div className="ds-stack-lg">
      <ReceptionBookingHeader
        eyebrow="Front desk"
        title="Book an appointment for a patient"
        subtitle="Choose the patient, a doctor and an open time. The slot is held for that doctor the moment you confirm."
      />
      {error && (
        <div className="ds-container">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      {notStaff && (
        <div className="ds-container">
          <Alert tone="danger">Only Cedar Hollow reception and clinical staff can book on behalf of patients.</Alert>
        </div>
      )}
      <ReceptionBookingForm
        patientId={patientId}
        doctorId={doctorId}
        slot={selectedSlot}
        services={services}
        onBooked={handleBooked}
      >
        <div className="ds-field">
          <span className="ds-label">Patient</span>
          <PatientSearch
            patients={patients}
            onSelect={(patient: User) => setPatientId(patient.id)}
          />
          <span className="ds-help">
            {patientId ? 'Patient selected.' : 'Search by name, email or phone number.'}
          </span>
        </div>
        <div className="ds-field">
          <span className="ds-label">Doctor</span>
          <DoctorPicker
            doctors={acceptingDoctors}
            selectedId={doctorId}
            onSelect={(doctorUserId: number) => setDoctorId(doctorUserId)}
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="reception-booking-date">Date</label>
          <input
            id="reception-booking-date"
            className="input"
            type="date"
            min={todayString()}
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          />
          <span className="ds-help">Open times are shown for the chosen doctor on this day.</span>
        </div>
        <div className="ds-field">
          <span className="ds-label">Open times</span>
          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={(slot: SlotItem) => setSelectedSlot(slot)}
            loading={slotsLoading}
          />
        </div>
      </ReceptionBookingForm>
      <ReceptionBookingInfo onViewSchedule={() => navigate('/staff/reception/appointments')} />
    </div>
  );
}

export default ReceptionBookingPage;