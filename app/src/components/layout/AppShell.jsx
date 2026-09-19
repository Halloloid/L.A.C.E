import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  Package,
  History,
  FileText,
  ShieldAlert,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
} from 'lucide-react';
import { getCurrentUser } from '../../data/mockData';
import { getRole, isInspector, signOut, ROLES } from '../../lib/auth';

const INSPECTOR_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan Product', icon: ScanLine, emphasize: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/history', label: 'History', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/violations', label: 'Violations', icon: ShieldAlert },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const CONSUMER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan Product', icon: ScanLine, emphasize: true },
  { to: '/history', label: 'My Scans', icon: History },
  { to: '/report-issue', label: 'Report an Issue', icon: ShieldAlert },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const INSPECTOR_BOTTOM = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan', icon: ScanLine, dominant: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Profile', icon: Settings, isProfile: true },
];

const CONSUMER_BOTTOM = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan', icon: ScanLine, dominant: true },
  { to: '/history', label: 'My Scans', icon: History },
  { to: '/report-issue', label: 'Report', icon: ShieldAlert },
  { to: '/settings', label: 'Profile', icon: Settings, isProfile: true },
];

function useLogout() {
  const navigate = useNavigate();
  return () => {
    signOut();
    navigate('/', { replace: true });
  };
}

function Sidebar({ links, currentUser }) {
  const logout = useLogout();
  return (
    <aside className="app-shell__sidebar">
      <Link to="/" className="app-shell__brand">
        L.A.C.E.
      </Link>
      <nav className="app-shell__nav" aria-label="Application">
        {links.map(({ to, label, icon: Icon, emphasize }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `app-shell__nav-link ${emphasize ? 'app-shell__nav-link--emphasize' : ''} ${isActive ? 'is-active' : ''}`.trim()
            }
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Link to="/settings" className="app-shell__profile">
        <span className="app-shell__avatar">{currentUser.initials}</span>
        <span>
          <span className="app-shell__profile-name">{currentUser.name}</span>
          <span className="app-shell__profile-role">{currentUser.role}</span>
        </span>
      </Link>
      <button type="button" className="app-shell__logout" onClick={logout}>
        <LogOut size={16} strokeWidth={2} aria-hidden="true" />
        Log out
      </button>
    </aside>
  );
}

function TopBar({ currentUser }) {
  const logout = useLogout();
  return (
    <header className="app-shell__topbar">
      <label className="search-bar app-shell__search">
        <Search size={16} className="search-bar__icon" aria-hidden="true" />
        <input type="search" placeholder="Search products, batches, report IDs…" />
      </label>
      <button className="app-shell__icon-btn" aria-label="Notifications">
        <Bell size={19} strokeWidth={1.8} />
        <span className="app-shell__notif-dot" aria-hidden="true" />
      </button>
      <Link to="/settings" className="app-shell__avatar app-shell__avatar--sm" aria-label="Profile & settings">
        {currentUser.initials}
      </Link>
      <button className="app-shell__icon-btn" aria-label="Log out" title="Log out" onClick={logout}>
        <LogOut size={18} strokeWidth={1.8} />
      </button>
    </header>
  );
}

function MobileHeader({ currentUser }) {
  const logout = useLogout();
  return (
    <header className="app-shell__mobile-header">
      <Link to="/dashboard" className="app-shell__brand app-shell__brand--sm">
        L.A.C.E.
      </Link>
      <div className="app-shell__mobile-header-actions">
        <button className="app-shell__icon-btn" aria-label="Notifications">
          <Bell size={19} strokeWidth={1.8} />
          <span className="app-shell__notif-dot" aria-hidden="true" />
        </button>
        <Link to="/settings" className="app-shell__avatar app-shell__avatar--sm" aria-label="Profile & settings">
          {currentUser.initials}
        </Link>
        <button className="app-shell__icon-btn" aria-label="Log out" title="Log out" onClick={logout}>
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ links }) {
  return (
    <nav className="app-shell__bottomnav" aria-label="Application">
      {links.map(({ to, label, icon: Icon, dominant }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `app-shell__bottom-link ${dominant ? 'app-shell__bottom-link--dominant' : ''} ${isActive ? 'is-active' : ''}`.trim()
          }
        >
          <span className="app-shell__bottom-icon" aria-hidden="true">
            <Icon size={dominant ? 22 : 19} strokeWidth={dominant ? 2.25 : 1.9} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const inspector = isInspector();
  const currentUser = getCurrentUser(getRole());
  const links = inspector ? INSPECTOR_LINKS : CONSUMER_LINKS;
  const bottomLinks = inspector ? INSPECTOR_BOTTOM : CONSUMER_BOTTOM;

  return (
    <div className="app-shell">
      <Sidebar links={links} currentUser={currentUser} />
      <div className="app-shell__main">
        <TopBar currentUser={currentUser} />
        <MobileHeader currentUser={currentUser} />
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
      <BottomNav links={bottomLinks} />
    </div>
  );
}

export { ROLES };
