import { Link } from 'react-router-dom';
import { Check, AlertTriangle, X, TrendingUp, TrendingDown, Search } from 'lucide-react';

export function Button({
  as,
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'right',
  className = '',
  children,
  ...rest
}) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim();
  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon size={16} strokeWidth={2} aria-hidden="true" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon size={16} strokeWidth={2} aria-hidden="true" />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={rest.type || 'button'} className={classes} {...rest}>
      {content}
    </button>
  );
}

const STATUS_CONFIG = {
  pass: { icon: Check, label: 'Pass', tone: 'pass' },
  warning: { icon: AlertTriangle, label: 'Warning', tone: 'warning' },
  fail: { icon: X, label: 'Fail', tone: 'fail' },
  compliant: { icon: Check, label: 'Compliant', tone: 'pass' },
  noncompliant: { icon: X, label: 'Non-Compliant', tone: 'fail' },
};

export function StatusBadge({ status, label, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pass;
  const Icon = cfg.icon;
  return (
    <span className={`status-badge status-badge--${cfg.tone} status-badge--${size}`}>
      <Icon size={size === 'lg' ? 17 : 13} strokeWidth={2.75} aria-hidden="true" />
      {label ?? cfg.label}
    </span>
  );
}

export function Metric({ label, value, deltaPct, direction }) {
  return (
    <div className="metric">
      <div className="metric__label mono-label">{label}</div>
      <div className="metric__value">{value}</div>
      {deltaPct != null && (
        <div className={`metric__delta metric__delta--${direction}`}>
          {direction === 'up' ? (
            <TrendingUp size={13} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <TrendingDown size={13} strokeWidth={2.5} aria-hidden="true" />
          )}
          {deltaPct}%
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={30} strokeWidth={1.4} className="empty-state__icon" aria-hidden="true" />}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <label className={`search-bar ${className}`.trim()}>
      <Search size={16} className="search-bar__icon" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="toggle">
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {description && <span className="toggle__description">{description}</span>}
      </span>
      <span className="toggle__control">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="visually-hidden"
        />
        <span className={`toggle__track ${checked ? 'is-checked' : ''}`} aria-hidden="true">
          <span className="toggle__thumb" />
        </span>
      </span>
    </label>
  );
}
