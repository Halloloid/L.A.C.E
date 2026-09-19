export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`chart-card ${className}`.trim()}>
      <div className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}
