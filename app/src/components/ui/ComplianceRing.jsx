import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function ComplianceRing({ passed = 0, warnings = 0, failed = 0, size = 160, label, sublabel, animate = true }) {
  const total = Math.max(passed + warnings + failed, 1);
  const strokeWidth = size < 100 ? 7 : 10;
  const r = (size - strokeWidth * 1.6) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { key: 'pass', value: passed, color: 'var(--pass)' },
    { key: 'warning', value: warnings, color: 'var(--warning)' },
    { key: 'fail', value: failed, color: 'var(--fail)' },
  ].filter((s) => s.value > 0);

  let offsetAccum = 0;
  const arcData = segments.map((s) => {
    const len = (s.value / total) * circumference;
    const dashoffset = -offsetAccum;
    offsetAccum += len;
    return { ...s, dasharray: `${len} ${circumference - len}`, dashoffset };
  });

  const groupRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!animate || reducedMotion || !groupRef.current) return;
    const arcs = groupRef.current.querySelectorAll('.ring-arc');
    gsap.fromTo(
      arcs,
      { strokeDashoffset: circumference },
      {
        strokeDashoffset: (_, target) => parseFloat(target.dataset.finalOffset),
        duration: 1,
        ease: 'power2.out',
        stagger: 0.08,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, reducedMotion, passed, warnings, failed]);

  return (
    <div className="compliance-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
        <g ref={groupRef} transform={`rotate(-90 ${cx} ${cy})`}>
          {arcData.map((s) => (
            <circle
              key={s.key}
              className="ring-arc"
              data-final-offset={s.dashoffset}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
      </svg>
      {(label || sublabel) && (
        <div className="compliance-ring__center">
          {label && <div className="compliance-ring__label">{label}</div>}
          {sublabel && <div className="compliance-ring__sublabel">{sublabel}</div>}
        </div>
      )}
    </div>
  );
}
