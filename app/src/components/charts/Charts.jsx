import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function LineChart({ data, height = 220, color = 'var(--forest)' }) {
  const width = 560;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const denom = Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: padding.left + (i / denom) * innerW,
    y: padding.top + innerH - ((d.value - min) / range) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const floor = padding.top + innerH;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${floor} L ${points[0].x.toFixed(1)} ${floor} Z`;

  const pathRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    if (reducedMotion) return;
    gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, data]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id="line-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#line-chart-fill)" stroke="none" />
      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 8} textAnchor="middle" className="chart-axis-label">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export function DonutChart({ data, size = 180, centerLabel, centerSublabel }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const strokeWidth = 22;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offsetAccum = 0;
  const arcs = data.map((d) => {
    const len = (d.value / total) * circumference;
    const dashoffset = -offsetAccum;
    offsetAccum += len;
    return { ...d, dasharray: `${len} ${circumference - len}`, dashoffset };
  });

  return (
    <div className="donut-chart">
      <div className="donut-chart__ring-wrap" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((a) => (
              <circle
                key={a.category ?? a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={strokeWidth}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
              />
            ))}
          </g>
        </svg>
        {(centerLabel || centerSublabel) && (
          <div className="donut-chart__center">
            {centerLabel && <div className="donut-chart__label">{centerLabel}</div>}
            {centerSublabel && <div className="donut-chart__sublabel">{centerSublabel}</div>}
          </div>
        )}
      </div>
      <ul className="donut-chart__legend">
        {data.map((d) => (
          <li key={d.category ?? d.label}>
            <span className="donut-chart__swatch" style={{ background: d.color }} aria-hidden="true" />
            <span>{d.category ?? d.label}</span>
            <span className="donut-chart__legend-value">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
