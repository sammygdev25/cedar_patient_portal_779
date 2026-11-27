import './App.css';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { Footer } from './components/ui';
import VerifyEmailBanner from './components/VerifyEmailBanner';
import { STAFF_ROLES, homeFor } from './lib/roles';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PatientHomePage from './pages/PatientHomePage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import MyRecordsPage from './pages/MyRecordsPage';
import DocumentsPage from './pages/DocumentsPage';
import BillsPage from './pages/BillsPage';
import PharmacyPage from './pages/PharmacyPage';
import CartPage from './pages/CartPage';
import MyOrdersPage from './pages/MyOrdersPage';
import PrescriptionOrderPage from './pages/PrescriptionOrderPage';
import DoctorHomePage from './pages/DoctorHomePage';
import DoctorPatientsPage from './pages/DoctorPatientsPage';
import VisitNotePage from './pages/VisitNotePage';
import DoctorApprovalsPage from './pages/DoctorApprovalsPage';
import ReceptionHomePage from './pages/ReceptionHomePage';
import ReceptionBookingPage from './pages/ReceptionBookingPage';
import ReceptionAppointmentsPage from './pages/ReceptionAppointmentsPage';
import ReceptionBillingPage from './pages/ReceptionBillingPage';
import PharmacyDeskPage from './pages/PharmacyDeskPage';
import PharmacyInventoryPage from './pages/PharmacyInventoryPage';
import ReportsPage from './pages/ReportsPage';
import GoogleAuthDonePage from './pages/GoogleAuthDonePage';
import OrderPayPage from './pages/OrderPayPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ProfilePage from './pages/ProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UnpaidNotice from './components/UnpaidNotice';

interface RequireAuthProps { children: ReactNode }

function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuth() as { isAuthenticated?: boolean; loading?: boolean };
  if (auth && auth.loading) {
    return null;
  }
  const authed = auth && typeof auth.isAuthenticated === 'boolean' ? auth.isAuthenticated : Boolean(localStorage.getItem('token'));
  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

interface RequireRoleProps { roles: readonly string[]; children: ReactNode }

function RequireRole({ roles, children }: RequireRoleProps) {
  const auth = useAuth() as { isAuthenticated?: boolean; loading?: boolean; user?: { role?: string } | null };
  if (auth && auth.loading) {
    return null;
  }
  if (auth == null || auth.isAuthenticated !== true) {
    return <Navigate to="/login" replace />;
  }
  const role = (auth.user && auth.user?.role) || '';
  if (roles.indexOf(role) < 0) {
    return <Navigate to={homeFor(role)} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ErrorBoundary>
          <div className="ds-page">
            <Navbar />
            <VerifyEmailBanner />
            <main className="ds-page-main">
              <UnpaidNotice />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
                <Route path="/patient" element={<RequireRole roles={['patient']}><PatientHomePage /></RequireRole>} />
                <Route path="/patient/book" element={<RequireRole roles={['patient']}><BookAppointmentPage /></RequireRole>} />
                <Route path="/patient/appointments" element={<RequireRole roles={['patient']}><MyAppointmentsPage /></RequireRole>} />
                <Route path="/patient/records" element={<RequireRole roles={['patient']}><MyRecordsPage /></RequireRole>} />
                <Route path="/patient/documents" element={<RequireRole roles={['patient']}><DocumentsPage /></RequireRole>} />
                <Route path="/patient/bills" element={<RequireRole roles={['patient']}><BillsPage /></RequireRole>} />
                <Route path="/patient/pharmacy" element={<RequireRole roles={['patient']}><PharmacyPage /></RequireRole>} />
                <Route path="/patient/cart" element={<RequireRole roles={['patient']}><CartPage /></RequireRole>} />
                <Route path="/patient/orders" element={<RequireRole roles={['patient']}><MyOrdersPage /></RequireRole>} />
                <Route path="/patient/prescription-order" element={<RequireRole roles={['patient']}><PrescriptionOrderPage /></RequireRole>} />
                <Route path="/staff/doctor" element={<RequireRole roles={['doctor']}><DoctorHomePage /></RequireRole>} />
                <Route path="/staff/doctor/patients" element={<RequireRole roles={['doctor']}><DoctorPatientsPage /></RequireRole>} />
                <Route path="/staff/doctor/appointments/:id/notes" element={<RequireRole roles={['doctor']}><VisitNotePage /></RequireRole>} />
                <Route path="/staff/doctor/approvals" element={<RequireRole roles={['doctor']}><DoctorApprovalsPage /></RequireRole>} />
                <Route path="/staff/reception" element={<RequireRole roles={STAFF_ROLES}><ReceptionHomePage /></RequireRole>} />
                <Route path="/staff/reception/book" element={<RequireRole roles={STAFF_ROLES}><ReceptionBookingPage /></RequireRole>} />
                <Route path="/staff/reception/appointments" element={<RequireRole roles={STAFF_ROLES}><ReceptionAppointmentsPage /></RequireRole>} />
                <Route path="/staff/reception/billing" element={<RequireRole roles={STAFF_ROLES}><ReceptionBillingPage /></RequireRole>} />
                <Route path="/staff/reception/pharmacy" element={<RequireRole roles={STAFF_ROLES}><PharmacyDeskPage /></RequireRole>} />
                <Route path="/staff/reception/inventory" element={<RequireRole roles={STAFF_ROLES}><PharmacyInventoryPage /></RequireRole>} />
                <Route path="/staff/reception/reports" element={<RequireRole roles={STAFF_ROLES}><ReportsPage /></RequireRole>} />
                <Route path="/auth/google/done" element={<GoogleAuthDonePage />} />
                <Route path="/order-pay" element={<RequireAuth><OrderPayPage /></RequireAuth>} />
                <Route path="/payment-cancel" element={<PaymentCancelPage />} />
                <Route path="/payment-success" element={<RequireAuth><PaymentSuccessPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/dashboard" element={<HomePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer brand="Cedar Patient Portal 779" columns={[{ title: 'Explore', links: [{ label: 'Home', to: '/' }] }]} />
          </div>
        </ErrorBoundary>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
