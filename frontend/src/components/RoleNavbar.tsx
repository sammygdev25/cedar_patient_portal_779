import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Badge, Button, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface CartShape {
  items?: unknown[];
  itemCount?: number;
  count?: number;
  totalItems?: number;
}

const PATIENT_LINKS: NavItem[] = [
  { to: '/patient', label: 'Overview', end: true },
  { to: '/patient/book', label: 'Book visit' },
  { to: '/patient/appointments', label: 'Appointments' },
  { to: '/patient/records', label: 'Records' },
  { to: '/patient/documents', label: 'Documents' },
  { to: '/patient/bills', label: 'Bills' },
  { to: '/patient/pharmacy', label: 'Pharmacy' },
  { to: '/patient/orders', label: 'Orders' },
];

const DOCTOR_LINKS: NavItem[] = [
  { to: '/staff/doctor', label: 'Today', end: true },
  { to: '/staff/doctor/patients', label: 'Patients' },
  { to: '/staff/doctor/approvals', label: 'Prescription approvals' },
];

const RECEPTION_LINKS: NavItem[] = [
  { to: '/staff/reception', label: 'Front desk', end: true },
  { to: '/staff/reception/book', label: 'Book for patient' },
  { to: '/staff/reception/appointments', label: 'Appointments' },
  { to: '/staff/reception/billing', label: 'Billing' },
  { to: '/staff/reception/pharmacy', label: 'Pharmacy desk' },
  { to: '/staff/reception/inventory', label: 'Inventory' },
  { to: '/staff/reception/reports', label: 'Reports' },
];

const PUBLIC_LINKS: NavItem[] = [{ to: '/', label: 'Home', end: true }];

function linksForRole(role: string, signedIn: boolean): NavItem[] {
  if (!signedIn) return PUBLIC_LINKS;
  if (role === 'doctor') return DOCTOR_LINKS;
  if (role === 'receptionist') return RECEPTION_LINKS;
  return PATIENT_LINKS;
}

function RoleNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const cart = useCart() as unknown as CartShape | null;
  const navigate = useNavigate();

  const role = (user as unknown as { role?: string } | null)?.role || 'patient';
  const links = linksForRole(role, isAuthenticated);
  const isPatient = isAuthenticated && role === 'patient';

  const cartCount = cart
    ? cart.itemCount ??
      cart.totalItems ??
      cart.count ??
      (Array.isArray(cart.items) ? cart.items.length : 0)
    : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const homeTarget = !isAuthenticated
    ? '/'
    : role === 'doctor'
      ? '/staff/doctor'
      : role === 'receptionist'
        ? '/staff/reception'
        : '/patient';

  return (
    <header className="ds-nav">
      <div className="ds-container ds-between">
        <Link to={homeTarget} className="ds-cluster" aria-label="Cedar Hollow Health home">
          <Icon name="shield" size={22} />
          <strong>Cedar Hollow Health</strong>
        </Link>

        <nav aria-label="Main navigation">
          <Cluster gap="sm" align="center">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }: { isActive: boolean }) =>
                  isActive ? 'ds-small nav-link active' : 'ds-small nav-link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </Cluster>
        </nav>

        <Cluster gap="sm" align="center">
          {isPatient && (
            <Link to="/patient/cart" className="ds-cluster" aria-label="Pharmacy cart">
              <Icon name="cart" size={20} />
              {cartCount > 0 && <Badge tone="primary">{cartCount}</Badge>}
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="ds-cluster ds-small">
                <Icon name="user" size={18} />
                <span>{user?.username || 'Profile'}</span>
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                <Icon name="logout" size={16} /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" to="/login">
                Sign in
              </Button>
              <Button variant="primary" to="/register">
                Create account
              </Button>
            </>
          )}
        </Cluster>
      </div>
    </header>
  );
}

export default RoleNavbar;