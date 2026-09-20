import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { gsap } from '../../lib/gsap';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * The physical ruler. This is where the inspector tells L.A.C.E. the REAL printed
 * length of the barcode, so it reads as a measuring instrument rather than a slider:
 * a milled edge, engraved ticks, and a machined indicator that rides the scale.
 *
 * Vertical (desktop/tablet): the largest value sits at the top, like a real rule
 * stood on end. Horizontal (narrow screens): values run left to right.
 */
export default function ScaleRuler({
  value,
  onChange,
  min = 10,
  max = 120,
  step = 0.1,
  majorEvery = 10,
  orientation = 'vertical',
  label = 'Barcode length',
}) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const valueRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const vertical = orientation === 'vertical';
  const ratio = (clamp(value, min, max) - min) / (max - min);

  const ticks = useMemo(() => {
    const out = [];
    const minor = majorEvery / 5; // 5 divisions between labelled marks
    for (let mm = min; mm <= max + 1e-6; mm += minor) {
      const mmRounded = +mm.toFixed(2);
      const isMajor = Math.abs(mmRounded % majorEvery) < 1e-6;
      const isMid = !isMajor && Math.abs(mmRounded % (majorEvery / 2)) < 1e-6;
      out.push({
        mm: mmRounded,
        pct: ((mmRounded - min) / (max - min)) * 100,
        kind: isMajor ? 'major' : isMid ? 'mid' : 'minor',
      });
    }
    return out;
  }, [min, max, majorEvery]);

  const quantise = useCallback(
    (raw) => {
      const snapped = Math.round(raw / step) * step;
      return +clamp(snapped, min, max).toFixed(2);
    },
    [min, max, step]
  );

  const valueFromPointer = useCallback(
    (clientX, clientY) => {
      const track = trackRef.current;
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      const r = vertical
        ? 1 - clamp((clientY - rect.top) / rect.height, 0, 1) // top = max
        : clamp((clientX - rect.left) / rect.width, 0, 1);
      return quantise(min + r * (max - min));
    },
    [vertical, min, max, quantise]
  );

  const handlePointerDown = useCallback(
    (e) => {
      const track = trackRef.current;
      if (!track) return;
      e.preventDefault();
      track.setPointerCapture?.(e.pointerId);
      draggingRef.current = true;
      setDragging(true);
      const next = valueFromPointer(e.clientX, e.clientY);
      if (next != null) onChange(next);
    },
    [valueFromPointer, onChange]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      const next = valueFromPointer(e.clientX, e.clientY);
      if (next != null) onChange(next);
    },
    [valueFromPointer, onChange]
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  }, []);

  function handleKeyDown(e) {
    const coarse = e.shiftKey ? 5 : 1;
    const fine = step;
    const map = {
      ArrowUp: vertical ? fine : fine,
      ArrowRight: fine,
      ArrowDown: -fine,
      ArrowLeft: -fine,
      PageUp: coarse,
      PageDown: -coarse,
    };
    if (e.key in map) {
      e.preventDefault();
      onChange(quantise(value + map[e.key]));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  }

  // Ruler activation: the indicator swells the moment it is grabbed, then relaxes.
  useLayoutEffect(() => {
    if (!thumbRef.current) return;
    const anim = gsap.to(thumbRef.current, {
      scale: dragging ? 1.12 : 1,
      duration: 0.25,
      ease: dragging ? 'back.out(2.2)' : 'power2.out',
      overwrite: true,
    });
    return () => anim.kill();
  }, [dragging]);

  // A small tick of life on the readout whenever the measurement changes.
  useEffect(() => {
    if (!valueRef.current) return;
    const anim = gsap.fromTo(
      valueRef.current,
      { opacity: 0.55, y: vertical ? -3 : 0 },
      { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', overwrite: true }
    );
    return () => anim.kill();
  }, [value, vertical]);

  const thumbStyle = vertical ? { bottom: `${ratio * 100}%` } : { left: `${ratio * 100}%` };

  return (
    <div className={`scale-ruler scale-ruler--${orientation} ${dragging ? 'is-dragging' : ''}`.trim()}>
      <div className="scale-ruler__readout">
        <span className="mono-label">{label}</span>
        <div className="scale-ruler__value" ref={valueRef}>
          <strong>{value.toFixed(1)}</strong>
          <span>mm</span>
        </div>
      </div>

      <div
        className="scale-ruler__track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={0}
        aria-label={`${label} in millimetres`}
        aria-orientation={orientation}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value.toFixed(1)} millimetres`}
      >
        <div className="scale-ruler__ticks" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t.mm}
              className={`scale-ruler__tick scale-ruler__tick--${t.kind}`}
              style={vertical ? { bottom: `${t.pct}%` } : { left: `${t.pct}%` }}
            >
              {t.kind === 'major' && <i className="scale-ruler__tick-label">{t.mm}</i>}
            </span>
          ))}
        </div>

        <div className="scale-ruler__fill" style={vertical ? { height: `${ratio * 100}%` } : { width: `${ratio * 100}%` }} aria-hidden="true" />

        <div className="scale-ruler__thumb" ref={thumbRef} style={thumbStyle} aria-hidden="true">
          <span className="scale-ruler__thumb-edge" />
          <span className="scale-ruler__thumb-grip" />
        </div>
      </div>

      <div className="scale-ruler__stepper">
        <button type="button" onClick={() => onChange(quantise(value - step))} aria-label="Decrease by 0.1 millimetres">
          <Minus size={14} aria-hidden="true" />
        </button>
        <span className="scale-ruler__stepper-hint">fine</span>
        <button type="button" onClick={() => onChange(quantise(value + step))} aria-label="Increase by 0.1 millimetres">
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
