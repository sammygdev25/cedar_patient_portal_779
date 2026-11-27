import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getAppointment,
  getVisitNoteList,
  getPrescriptionList,
  getProductList,
  getServiceList,
} from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, EmptyState, LoadingBlock, Section } from '../components/ui';
import VisitNoteMedia from '../components/VisitNoteMedia';
import VisitNoteFacts from '../components/VisitNoteFacts';
import VisitNoteRelated from '../components/VisitNoteRelated';
import VisitNoteForm from '../components/VisitNoteForm';
import PrescriptionForm from '../components/PrescriptionForm';
import type { Appointment, Prescription, Product, Service, VisitNote } from '../types';

function pickName(source: unknown, keys: string[]): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

function VisitNotePage() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement | null>(null);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [note, setNote] = useState<VisitNote | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadPrescriptions = useCallback(async () => {
    try {
      const all = await getPrescriptionList();
      const list = Array.isArray(all) ? all : [];
      setPrescriptions(list.filter((p: Prescription) => Number(p.appointment) === appointmentId));
    } catch {
      setPrescriptions([]);
    }
  }, [appointmentId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isFinite(appointmentId)) {
        setError('This appointment link is not valid.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const appt = await getAppointment(appointmentId);
        if (cancelled) return;
        setAppointment(appt);
        const [notes, prods, servs] = await Promise.all([
          getVisitNoteList().catch(() => [] as VisitNote[]),
          getProductList().catch(() => [] as Product[]),
          getServiceList().catch(() => [] as Service[]),
        ]);
        if (cancelled) return;
        const noteList = Array.isArray(notes) ? notes : [];
        setNote(noteList.find((n: VisitNote) => Number(n.appointment) === appointmentId) || null);
        setProducts(Array.isArray(prods) ? prods : []);
        setServices(Array.isArray(servs) ? servs : []);
        await loadPrescriptions();
      } catch {
        if (!cancelled) setError('We could not load this appointment. It may have been removed, or it is not on your schedule.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, loadPrescriptions]);

  const scrollToForm = () => {
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <Section>
        <LoadingBlock label="Loading appointment..." />
      </Section>
    );
  }

  if (error || !appointment) {
    return (
      <Section>
        <Alert tone="danger">{error || 'Appointment not found.'}</Alert>
        <EmptyState
          icon="calendar"
          title="No appointment to show"
          text="Return to your schedule and open the visit again."
          action={<Button to="/staff/doctor" variant="secondary">Back to doctor home</Button>}
        />
      </Section>
    );
  }

  const patientName = pickName(appointment, ['patient_name', 'patient_email']);
  const doctorName =
    pickName(appointment, ['doctor_name', 'doctor_email']) || pickName(user, ['email', 'username']);
  const serviceName = pickName(appointment, ['service_name']);
  const currentService = services.find((s: Service) => s.id === appointment.service) || null;
  const resolvedServiceName = serviceName || (currentService ? currentService.name : undefined);

  return (
    <div className="ds-stack-lg">
      <VisitNoteMedia
        appointment={appointment}
        note={note}
        patientName={patientName}
        doctorName={doctorName}
        serviceName={resolvedServiceName}
        onPrimaryAction={scrollToForm}
      />

      <div ref={formRef}>
        <Section
          eyebrow="Clinical record"
          title={note ? 'Update visit note' : 'Write visit note'}
          subtitle="Only the patient and you can read this note. Reception cannot see it."
        >
          <VisitNoteForm appointmentId={appointmentId} onSaved={(saved: VisitNote) => setNote(saved)} />
        </Section>

        <Section
          eyebrow="Prescriptions"
          title="Prescribe medicine"
          subtitle="Link a pharmacy product so the patient can order it straight from their records."
        >
          <PrescriptionForm
            appointmentId={appointmentId}
            patientId={appointment.patient}
            products={products}
            onSaved={() => {
              loadPrescriptions();
            }}
          />
        </Section>
      </div>

      <VisitNoteFacts appointment={appointment} note={note} prescriptions={prescriptions} />

      <VisitNoteRelated services={services} currentServiceId={appointment.service ?? null} />
    </div>
  );
}

export default VisitNotePage;