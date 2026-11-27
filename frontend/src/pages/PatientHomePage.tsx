import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAppointmentList, getInvoiceList, getOrderList, getServiceList } from '../api';
import type { Appointment, Invoice, Order, Service } from '../types';
import { Alert, Button, EmptyState, LoadingBlock, Section, Grid } from '../components/ui';
import UpcomingAppointments from '../components/UpcomingAppointments';
import InvoiceList from '../components/InvoiceList';
import OrderCard from '../components/OrderCard';
import PatientHomeHero from '../components/PatientHomeHero';
import PatientHomeFeatured from '../components/PatientHomeFeatured';
import PatientHomeCategories from '../components/PatientHomeCategories';
import PatientHomeAbout from '../components/PatientHomeAbout';
import PatientHomeCta from '../components/PatientHomeCta';

const ACTIVE_STATUSES = ['booked', 'checked_in'];

function formatVisit(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PatientHomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled([
        getAppointmentList(),
        getInvoiceList(),
        getOrderList(),
        getServiceList(),
      ]);
      if (cancelled) return;
      const [apptRes, invRes, orderRes, svcRes] = results;
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value);
      if (orderRes.status === 'fulfilled') setOrders(orderRes.value);
      if (svcRes.status === 'fulfilled') setServices(svcRes.value);
      if (results.some((r) => r.status === 'rejected')) {
        setError('Some of your clinic information could not be loaded. Please refresh to try again.');
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const upcoming = useMemo<Appointment[]>(() => {
    const now = Date.now();
    return appointments
      .filter((a) => ACTIVE_STATUSES.includes(a.status) && new Date(a.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [appointments]);

  const unpaidInvoices = useMemo<Invoice[]>(
    () => (Array.isArray(invoices) ? invoices : []).filter((inv) => !inv.paid_at && inv.status !== 'paid' && inv.status !== 'cancelled'),
    [invoices],
  );

  const recentOrders = useMemo<Order[]>(() => orders.slice(0, 3), [orders]);

  const activeServices = useMemo<Service[]>(() => (Array.isArray(services) ? services : []).filter((s) => s.is_active), [services]);

  const firstName = user?.email ? user.email.split('@')[0] : undefined;
  const nextLabel = upcoming.length > 0 ? formatVisit(upcoming[0].start_time) : undefined;

  const handleSelectService = (service: Service) => {
    navigate(`/patient/book?service=${service.id}`);
  };

  const handlePayInvoice = () => {
    navigate('/patient/bills');
  };

  return (
    <div className="ds-stack-lg">
      <PatientHomeHero
        firstName={firstName}
        nextAppointmentLabel={nextLabel}
        onViewAppointments={() => navigate('/patient/appointments')}
      />

      {error && (
        <Section tight>
          <Alert tone="danger">{error}</Alert>
        </Section>
      )}

      <Section
        eyebrow="Your visits"
        title="Upcoming appointments"
        subtitle="Your next scheduled visits at Cedar Hollow Health."
        actions={
          <Button variant="ghost" to="/patient/appointments">
            Manage appointments
          </Button>
        }
      >
        {loading ? (
          <LoadingBlock label="Loading your appointments..." />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming appointments"
            text="Book a visit with one of our doctors and it will appear here."
            action={
              <Button variant="primary" to="/patient/book">
                Book an appointment
              </Button>
            }
          />
        ) : (
          <UpcomingAppointments appointments={upcoming.slice(0, 5)} />
        )}
      </Section>

      <Section
        eyebrow="Billing"
        title="Bills awaiting payment"
        subtitle="Settle outstanding invoices securely online."
        actions={
          <Button variant="ghost" to="/patient/bills">
            All bills
          </Button>
        }
      >
        {loading ? (
          <LoadingBlock label="Loading your bills..." />
        ) : unpaidInvoices.length === 0 ? (
          <EmptyState
            icon="credit-card"
            title="You are all paid up"
            text="Invoices from your visits will show here until they are paid."
          />
        ) : (
          <InvoiceList invoices={unpaidInvoices.slice(0, 3)} onPay={handlePayInvoice} role="patient" />
        )}
      </Section>

      <Section
        eyebrow="Pharmacy"
        title="Recent pharmacy orders"
        subtitle="Follow your medicines from payment to delivery."
        actions={
          <Button variant="ghost" to="/patient/orders">
            All orders
          </Button>
        }
      >
        {loading ? (
          <LoadingBlock label="Loading your orders..." />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon="package"
            title="No pharmacy orders yet"
            text="Order over-the-counter items or refill a prescription from our in-house pharmacy."
            action={
              <Button variant="primary" to="/patient/pharmacy">
                Visit the pharmacy
              </Button>
            }
          />
        ) : (
          <Grid size="lg">
            {(Array.isArray(recentOrders) ? recentOrders : []).map((order) => (
              <OrderCard key={order.id} order={order} role="patient" />
            ))}
          </Grid>
        )}
      </Section>

      <PatientHomeFeatured
        services={activeServices.slice(0, 8)}
        loading={loading}
        onSelectService={handleSelectService}
      />
      <PatientHomeCategories services={activeServices} />
      <PatientHomeAbout />
      <PatientHomeCta />
    </div>
  );
}

export default PatientHomePage;