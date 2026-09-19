import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { signIn, saveAccountName, ROLES } from '../../lib/auth';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // Demo only — creates a consumer session directly. The real backend
    // will persist the account and send a verification email first.
    const fullName = name.trim();
    saveAccountName(email, fullName); // so signing in later shows the same name
    signIn(ROLES.CONSUMER, fullName);
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="login">
      <Link to="/" className="login__mark" aria-label="L.A.C.E. home">
        <ShieldCheck size={20} aria-hidden="true" />
      </Link>

      <div className="login__card">
        <div className="login__hero login__hero--sm">
          <div className="login__hero-copy">
            <span className="login__hero-brand">L.A.C.E.</span>
            <h1>Create your account</h1>
            <p>Free for shoppers — start scanning labels in minutes.</p>
          </div>
        </div>

        <div className="login__body">
          <form className="login__form" onSubmit={handleSubmit}>
            <label className="pill-field">
              <User size={16} className="pill-field__icon" aria-hidden="true" />
              <span className="visually-hidden">Full name</span>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </label>
            <label className="pill-field">
              <Mail size={16} className="pill-field__icon" aria-hidden="true" />
              <span className="visually-hidden">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="Create a password"
              />
            </label>

            <button type="submit" className="btn btn--primary btn--lg login__submit">
              Create account <ArrowRight size={16} aria-hidden="true" />
            </button>

            <p className="login__foot">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
            <p className="login__foot">
              Inspection officer? <Link to="/login">Sign in on the officer portal</Link>
            </p>
          </form>
        </div>
      </div>

      <p className="login__credit">Department of Consumer Affairs · Legal Metrology Division</p>
    </div>
  );
}
