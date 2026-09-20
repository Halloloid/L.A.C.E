import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { isSignedIn, getUserName, getRole, resolveAccountName, getInitials } from '../../lib/auth';

// Who is signed in right now, for showing their account name in the navbar.
function useAccount() {
  if (!isSignedIn()) return null;
  const name = getUserName() || resolveAccountName('', getRole());
  return { name, initials: getInitials(name) };
}

function AccountChip({ account, onClick }) {
  return (
    <Link to="/dashboard" className="public-nav__account" onClick={onClick} title="Go to your dashboard">
      <span className="app-shell__avatar app-shell__avatar--sm" aria-hidden="true">{account.initials}</span>
      <span className="public-nav__account-name">{account.name}</span>
    </Link>
  );
}

const DESKTOP_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Technology', href: '#technology' },
  { label: 'Reports', href: '#reports' },
];

const MOBILE_LINKS = [
  { label: 'Home', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Technology', href: '#technology' },
];

export function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const account = useAccount();

  return (
    <>
      <header className="public-nav">
        <div className="container public-nav__inner">
          <Link to="/" className="public-nav__logo">
            L.A.C.E.
          </Link>

          <nav className="public-nav__links show-desktop" aria-label="Primary">
            {DESKTOP_LINKS.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="public-nav__actions show-desktop">
            {account ? (
              <AccountChip account={account} />
            ) : (
              <Link to="/login" className="btn btn--ghost btn--sm">
                Login
              </Link>
            )}
            <Link to="/scan" className="btn btn--primary btn--sm">
              Start Inspection <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <button
            className="public-nav__menu-btn hide-desktop"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mobile-menu__head container">
            <span className="public-nav__logo">L.A.C.E.</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <nav className="mobile-menu__links container" aria-label="Primary">
            {MOBILE_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            {account ? (
              <AccountChip account={account} onClick={() => setMenuOpen(false)} />
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            )}
          </nav>
          <div className="mobile-menu__cta container">
            <Link to="/scan" className="btn btn--primary btn--md" onClick={() => setMenuOpen(false)}>
              Start Inspection <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container public-footer__inner">
        <div>
          <div className="public-footer__logo">L.A.C.E.</div>
          <p className="public-footer__tagline">Legal Automated Compliance Engine</p>
        </div>
        <p className="public-footer__motto">Scan. Verify. Ensure Fair Trade.</p>
      </div>
    </footer>
  );
}
