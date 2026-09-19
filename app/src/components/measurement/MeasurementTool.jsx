import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';
import { gsap, revealChildren } from '../../lib/gsap';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { PackageArtMarks, VIEW_BOX } from '../illustrations/PackageArt';
import { DEMO_DECLARATIONS } from '../../data/mockData';
import ScaleRuler from './ScaleRuler';

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

// Barcodes are usually printed low on a face, so the line starts there — but it is only
// a starting point. Nothing about the barcode's type, size or orientation is assumed.
const DEFAULT_POINTS = {
  a: { x: 0.28, y: 0.74 },
  b: { x: 0.72, y: 0.74 },
};

const DEFAULT_LENGTH_MM = 37.3;

/**
 * Barcode measurement.
 *
 * The inspector drags two handles onto the ends of the printed barcode, then dials in its
 * real physical length on the ruler. Pixel length is measured in the source image's own
 * resolution, so the resulting scale is independent of how large the image is displayed.
 *
 *   scale (mm/px) = physical barcode length (mm) / barcode length (px)
 *
 * Props:
 *  - imageSrc: the actual scanned/uploaded image. When absent the component falls back to
 *    the illustrated package (used by the read-only inspection view).
 *  - onApply({ barcodeLengthMm, pixelLength, scaleMmPerPx })
 */
export function MeasurementTool({
  imageSrc,
  imageAlt = 'Scanned product label',
  declarations = DEMO_DECLARATIONS,
  bandColor,
  onApply,
  onRetake,
}) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const overlayRef = useRef(null);
  const successRef = useRef(null);
  const dragRef = useRef(null);
  // Matches the grid breakpoint below, so the ruler only lies down once the
  // column layout has actually collapsed.
  const sideBySide = useMediaQuery('(min-width: 900px)');

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [natural, setNatural] = useState({ w: VIEW_BOX.width, h: VIEW_BOX.height });
  const [barcodeLengthMm, setBarcodeLengthMm] = useState(DEFAULT_LENGTH_MM);
  const [applied, setApplied] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);

  /* ---------- geometry ---------- */

  const pixelLength = useMemo(() => {
    const dx = (points.b.x - points.a.x) * natural.w;
    const dy = (points.b.y - points.a.y) * natural.h;
    return Math.max(Math.hypot(dx, dy), 1);
  }, [points, natural]);

  const scaleMmPerPx = barcodeLengthMm / pixelLength;

  /* ---------- the overlay tracks the rendered media box ---------- */

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageSrc]);

  /* ---------- pointer interaction ---------- */

  const pointFromEvent = useCallback((e) => {
    const el = overlayRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  }, []);

  const beginDrag = useCallback((which, e) => {
    overlayRef.current?.setPointerCapture?.(e.pointerId);
    dragRef.current = which;
    setActiveHandle(which);
  }, []);

  // Pressing anywhere on the image grabs the nearer handle, so a single tap both
  // selects and positions — no hunting for a small target on a phone.
  const handleStagePointerDown = useCallback(
    (e) => {
      if (applied) return;
      const p = pointFromEvent(e);
      if (!p) return;
      const da = Math.hypot(p.x - points.a.x, p.y - points.a.y);
      const db = Math.hypot(p.x - points.b.x, p.y - points.b.y);
      const which = da <= db ? 'a' : 'b';
      e.preventDefault();
      beginDrag(which, e);
      setPoints((prev) => ({ ...prev, [which]: p }));
    },
    [applied, pointFromEvent, points, beginDrag]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const p = pointFromEvent(e);
      if (!p) return;
      setPoints((prev) => ({ ...prev, [dragRef.current]: p }));
    },
    [pointFromEvent]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setActiveHandle(null);
  }, []);

  function handleHandleKeyDown(which, e) {
    const stepPct = e.shiftKey ? 0.02 : 0.004;
    const deltas = {
      ArrowLeft: { x: -stepPct, y: 0 },
      ArrowRight: { x: stepPct, y: 0 },
      ArrowUp: { x: 0, y: -stepPct },
      ArrowDown: { x: 0, y: stepPct },
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    setPoints((prev) => ({
      ...prev,
      [which]: { x: clamp01(prev[which].x + d.x), y: clamp01(prev[which].y + d.y) },
    }));
  }

  /* ---------- motion ---------- */

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    revealChildren(rootRef.current, { y: 14, stagger: 0.09, duration: 0.55 });
  }, []);

  useLayoutEffect(() => {
    if (applied && successRef.current) {
      gsap.fromTo(
        successRef.current,
        { opacity: 0, y: 10, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, [applied]);

  /* ---------- actions ---------- */

  function handleApply() {
    setApplied(true);
    onApply?.({
      barcodeLengthMm: +barcodeLengthMm.toFixed(1),
      pixelLength: Math.round(pixelLength),
      scaleMmPerPx,
    });
  }

  function handleReset() {
    setPoints(DEFAULT_POINTS);
    setBarcodeLengthMm(DEFAULT_LENGTH_MM);
  }

  /* ---------- render ---------- */

  const vb = box.w > 0 && box.h > 0 ? `0 0 ${box.w} ${box.h}` : '0 0 100 100';
  const A = { x: points.a.x * box.w, y: points.a.y * box.h };
  const B = { x: points.b.x * box.w, y: points.b.y * box.h };
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const angle = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
  const capAngle = angle + 90;

  return (
    <div className="measurement-tool" ref={rootRef}>
      <div className="measurement-tool__stage-wrap">
        <p className="measurement-tool__instruction">Align the handles with the barcode.</p>

        <div className="measurement-tool__stage" ref={stageRef}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt}
              className="measurement-tool__image"
              draggable="false"
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth || VIEW_BOX.width,
                  h: e.currentTarget.naturalHeight || VIEW_BOX.height,
                })
              }
            />
          ) : (
            <svg
              viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
              className="package-art measurement-tool__image"
              role="img"
              aria-label="Illustrated package"
            >
              <PackageArtMarks declarations={declarations} bandColor={bandColor} />
            </svg>
          )}

          <svg
            ref={overlayRef}
            className="measurement-tool__overlay"
            viewBox={vb}
            preserveAspectRatio="none"
            onPointerDown={handleStagePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-hidden={applied ? 'true' : undefined}
          >
            {/* the span itself */}
            <line className="measure-line__halo" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
            <line className="measure-line" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />

            {/* end caps, square to the span */}
            {[A, B].map((p, i) => (
              <line
                key={i}
                className="measure-line__cap"
                x1={p.x}
                y1={p.y - 11}
                x2={p.x}
                y2={p.y + 11}
                transform={`rotate(${capAngle} ${p.x} ${p.y})`}
              />
            ))}

            {/* pixel readout riding the midpoint */}
            {box.w > 0 && (
              <g transform={`translate(${mid.x} ${mid.y})`} className="measure-line__badge">
                <rect x="-34" y="-30" width="68" height="20" rx="10" />
                <text x="0" y="-16">{Math.round(pixelLength)} px</text>
              </g>
            )}

            {['a', 'b'].map((which) => {
              const p = which === 'a' ? A : B;
              return (
                <g
                  key={which}
                  className={`measure-handle ${activeHandle === which ? 'is-active' : ''}`.trim()}
                  transform={`translate(${p.x} ${p.y})`}
                  tabIndex={applied ? -1 : 0}
                  role="button"
                  aria-label={`${which === 'a' ? 'Start' : 'End'} of the barcode span`}
                  onPointerDown={(e) => {
                    if (applied) return;
                    e.stopPropagation();
                    e.preventDefault();
                    beginDrag(which, e);
                  }}
                  onKeyDown={(e) => handleHandleKeyDown(which, e)}
                >
                  <circle className="measure-handle__hit" r="22" />
                  <circle className="measure-handle__ring" r="13" />
                  <circle className="measure-handle__core" r="6" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="measurement-tool__panel">
        <p className="measurement-tool__instruction measurement-tool__instruction--panel">
          Set the barcode&rsquo;s physical length using the ruler.
        </p>

        <ScaleRuler
          value={barcodeLengthMm}
          onChange={setBarcodeLengthMm}
          orientation={sideBySide ? 'vertical' : 'horizontal'}
        />

        <div className="measurement-tool__readouts">
          <div>
            <span className="mono-label">Barcode length</span>
            <strong>{barcodeLengthMm.toFixed(1)} mm</strong>
          </div>
          <div>
            <span className="mono-label">Image length</span>
            <strong>{Math.round(pixelLength)} px</strong>
          </div>
          <div>
            <span className="mono-label">Scale</span>
            <strong>{scaleMmPerPx.toFixed(3)} mm/px</strong>
          </div>
        </div>

        {!applied ? (
          <div className="measurement-tool__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleReset}>
              <RotateCcw size={14} aria-hidden="true" /> Reset
            </button>
            <button type="button" className="btn btn--primary btn--md measurement-tool__apply" onClick={handleApply}>
              Apply Measurement <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div ref={successRef} className="measurement-tool__success">
            <Check size={16} aria-hidden="true" />
            <div>
              <div className="measurement-tool__success-title">Measurement applied</div>
              <div className="measurement-tool__success-detail">
                {barcodeLengthMm.toFixed(1)} mm · {scaleMmPerPx.toFixed(3)} mm/px
              </div>
            </div>
          </div>
        )}

        {onRetake && !applied && (
          <button type="button" className="measurement-tool__retake" onClick={onRetake}>
            Use a different image
          </button>
        )}
      </div>
    </div>
  );
}

export default MeasurementTool;
