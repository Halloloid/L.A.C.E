import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, User, Lock, ShieldCheck, ScanLine } from 'lucide-react';
import { signIn, resolveAccountName, ROLES } from '../../lib/auth';

const ROLE_COPY = {
  [ROLES.CONSUMER]: {
    tabLabel: 'Consumer',
    heading: 'Welcome back, shopper',
    sub: 'Sign in to scan products and check their labels for yourself.',
    idLabel: 'Email or phone',
    idPlaceholder: 'you@example.com',
    note: 'Please sign in to start scanning a product.',
  },
  [ROLES.INSPECTOR]: {
    tabLabel: 'Inspection Officer',
    heading: 'Welcome back, officer',
    sub: 'Sign in with your official credentials to run a field inspection.',
    idLabel: 'Official email',
    idPlaceholder: 'inspector@dept.gov.in',
    note: 'Please verify your identity to start an inspection.',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // where the person was trying to go before we sent them here (like /scan)
  const cameFrom = location.state?.from;

  const [role, setRole] = useState(ROLES.CONSUMER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const copy = ROLE_COPY[role];

  function handleSubmit(e) {
    e.preventDefault();
    // the account name shown around the app comes from what was typed here
    signIn(role, resolveAccountName(email, role));
    // go back to where they were headed, otherwise the dashboard
    navigate(cameFrom || '/dashboard', { replace: true });
  }

  return (
    <div className="login">
      <Link to="/" className="login__mark" aria-label="L.A.C.E. home">
        <ShieldCheck size={20} aria-hidden="true" />
      </Link>

      <div className="login__card">
        <div className="login__hero">
          <TwilightScene />
          <div className="login__hero-copy">
            <span className="login__hero-brand">L.A.C.E.</span>
            <h1>Welcome to L.A.C.E.</h1>
            <p>Scan a label. Know the rule. Trust the pack.</p>
          </div>
        </div>

        <div className="login__body">
          <div className="login__roletabs" role="tablist" aria-label="Choose portal">
            {Object.entries(ROLE_COPY).map(([key, val]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={role === key}
                className={`login__roletab ${role === key ? 'is-active' : ''}`.trim()}
                onClick={() => setRole(key)}
              >
                {key === ROLES.INSPECTOR ? <ShieldCheck size={14} aria-hidden="true" /> : <ScanLine size={14} aria-hidden="true" />}
                {val.tabLabel}
              </button>
            ))}
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            <h2>{copy.heading}</h2>
            <p className="login__sub">{copy.sub}</p>
            {cameFrom && <p className="login__note">{copy.note}</p>}

            <label className="pill-field">
              <User size={16} className="pill-field__icon" aria-hidden="true" />
              <span className="visually-hidden">{copy.idLabel}</span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.idPlaceholder}
              />
            </label>
            <label className="pill-field">
              <Lock size={16} className="pill-field__icon" aria-hidden="true" />
              <span className="visually-hidden">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            <div className="login__row">
              <label className="login__remember">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#forgot">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn--primary btn--lg login__submit">
              Sign in <ArrowRight size={16} aria-hidden="true" />
            </button>

            {role === ROLES.CONSUMER ? (
              <p className="login__foot">
                New here? <Link to="/register">Create a free account</Link>
              </p>
            ) : (
              <p className="login__foot">
                Need access? <a href="#request-access">Request an officer account</a>
              </p>
            )}
          </form>
        </div>
      </div>

      <p className="login__credit">Department of Consumer Affairs · Legal Metrology Division</p>
    </div>
  );
}

// A small dusk mountain-and-forest scene in the LACE green palette:
// deep forest sky, a pale moon, layered ridges, a treeline and a winding path.
function TwilightScene() {
  return (
    <svg viewBox="0 0 400 190" className="login__scene" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d2720" />
          <stop offset="55%" stopColor="#173e31" />
          <stop offset="100%" stopColor="#3a7d5f" />
        </linearGradient>
        <radialGradient id="moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffef2" />
          <stop offset="100%" stopColor="#fdf0b8" />
        </radialGradient>
      </defs>
      <rect width="400" height="190" fill="url(#sky)" />
      {[...Array(18)].map((_, i) => (
        <circle key={i} cx={(i * 53 + 20) % 400} cy={(i * 37) % 80} r={i % 3 === 0 ? 1.4 : 0.8} fill="#ffffff" opacity="0.7" />
      ))}
      <circle cx="340" cy="46" r="20" fill="url(#moon)" opacity="0.95" />
      <path d="M0 130 L40 95 L80 125 L120 85 L165 130 L210 90 L255 128 L300 100 L340 128 L400 105 L400 190 L0 190 Z" fill="#0d2720" opacity="0.55" />
      <path d="M0 150 L60 115 L110 145 L170 108 L230 148 L290 118 L340 150 L400 130 L400 190 L0 190 Z" fill="#174534" opacity="0.75" />
      <path d="M170 190 C175 150 195 150 200 190 Z" fill="#0d2720" opacity="0.4" />
      <path d="M150 172 C220 150 220 190 320 168 L320 190 L150 190 Z" fill="#2f6b52" />
      {[35, 60, 95, 250, 290, 320, 350].map((x, i) => (
        <g key={x} transform={`translate(${x} ${168 - (i % 2) * 10})`}>
          <rect x="-1.5" y="10" width="3" height="12" fill="#0d2720" />
          <path d="M0 -14 L11 12 L-11 12 Z" fill={i % 2 ? '#2f7d5f' : '#1d5240'} />
          <path d="M0 -4 L8 12 L-8 12 Z" fill={i % 2 ? '#1d5240' : '#2f7d5f'} />
        </g>
      ))}
    </svg>
  );
}
