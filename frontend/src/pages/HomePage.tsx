import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getServiceList, getDoctorProfileList, getOpeningHoursList } from '../api';
import type { Service, DoctorProfile, OpeningHours } from '../types';
import { Alert, EmptyState, Section } from '../components/ui';
import HomeHero from '../components/HomeHero';
import HomeFeatured from '../components/HomeFeatured';
import HomeCategories from '../components/HomeCategories';
import HomeAbout from '../components/HomeAbout';
import HomeCta from '../components/HomeCta';
import ServiceList from '../components/ServiceList';
import DoctorCard from '../components/DoctorCard';
import OpeningHoursPanel from '../components/OpeningHoursPanel';
import ContactSection from '../components/ContactSection';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [serviceRows, doctorRows, hourRows] = await Promise.all([
          getServiceList(),
          getDoctorProfileList(),
          getOpeningHoursList(),
        ]);
        if (cancelled) return;
        setServices(Array.isArray(serviceRows) ? serviceRows : []);
        setDoctors(Array.isArray(doctorRows) ? doctorRows : []);
        setHours(Array.isArray(hourRows) ? hourRows : []);
      } catch (err) {
        if (!cancelled) {
          setError('We could not load the latest clinic information. Please refresh the page to try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeServices = services.filter((service) => service.is_active !== false);
  const heroImage = '/img/brand/hero.jpg';

  return (
    <div className="ds-stack-lg">
      <HomeHero imageUrl={heroImage} isAuthenticated={isAuthenticated} />

      {error && (
        <Section tight>
          <Alert tone="danger">{error}</Alert>
        </Section>
      )}

      {(loading || activeServices.length > 0) && (
        <HomeFeatured services={activeServices.slice(0, 8)} loading={loading} />
      )}

      <HomeCategories isAuthenticated={isAuthenticated} />

      <HomeAbout
        doctorCount={doctors.length}
        serviceCount={activeServices.length}
      />

      {!loading && activeServices.length > 0 && (
        <Section
          id="services"
          eyebrow="Services"
          title="Everything we offer at Cedar Hollow Health"
          subtitle="From routine check-ups to follow-up care, every visit is booked online and documented in your portal."
        >
          <ServiceList services={activeServices} />
        </Section>
      )}

      <Section
        id="doctors"
        eyebrow="Our doctors"
        title="Meet the clinicians behind your care"
        subtitle="Read about each doctor's specialty and background before you book."
      >
        {!loading && doctors.length === 0 ? (
          <EmptyState
            icon="users"
            title="Our doctor profiles are coming soon"
            text="Check back shortly, or contact the front desk to ask about availability."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'stretch',
            }}
          >
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="hours"
        eyebrow="Visit us"
        title="Opening hours"
        subtitle="Walk-ins are welcome at the front desk during these times; appointments can be booked any hour."
        narrow
      >
        <OpeningHoursPanel hours={hours} />
      </Section>

      <ContactSection />

      <HomeCta isAuthenticated={isAuthenticated} />
    </div>
  );
}

export default HomePage;