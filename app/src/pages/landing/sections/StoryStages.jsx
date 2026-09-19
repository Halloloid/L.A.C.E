import { useRef, useEffect } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { gsap, revealChildren } from '../../../lib/gsap';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { LabelPhoto } from '../../../components/illustrations/LabelPhoto';
import { ComplianceRing } from '../../../components/ui/ComplianceRing';
import { StatusBadge } from '../../../components/ui/Basics';

// ---------------------------------------------------------------------------
// The landing story is a DEMONSTRATION, not a working tool. Every stage below is
// display-only — no uploads, no drag handles, no steppers, no navigation. The real
// controls live in /scan and /inspection. What stays here is the motion: each panel
// still reveals, draws and counts up as it becomes active.
//
// The five beats mirror the product flow: Scan -> Measure -> Extract -> Verify -> Report.
// ---------------------------------------------------------------------------

// Read off the pack shown in the photo, so the story stays internally consistent.
const EXTRACTED = [
  { id: 'mrp', label: 'MRP', value: '₹10.00 (incl. of all taxes)' },
  { id: 'netQuantity', label: 'Net Quantity', value: '32 g + 2 g extra = 34 g' },
  { id: 'manufacturer', label: 'Manufacturer', value: 'Priyagold Industries Ltd., Nuh, Haryana 122107' },
  { id: 'mfgDate', label: 'Packed Date', value: '16/06/25' },
  { id: 'batch', label: 'Batch Number', value: 'B062506' },
  { id: 'fssai', label: 'FSSAI Licence', value: '10012031000112' },
];

const VERIFIED = [
  { id: 'mrp', label: 'MRP', status: 'pass', note: 'Printed with the "incl. of all taxes" qualifier.' },
  { id: 'netQuantity', label: 'Net Quantity', status: 'pass', note: 'Declared in grams, a standard metric unit.' },
  { id: 'manufacturer', label: 'Manufacturer', status: 'pass', note: 'Name with complete postal address.' },
  { id: 'mfgDate', label: 'Packed Date', status: 'pass', note: 'Day, month and year all present.' },
  { id: 'batch', label: 'Batch Number', status: 'pass', note: 'Traceable batch identifier found.' },
  { id: 'fssai', label: 'FSSAI Licence', status: 'pass', note: 'Fourteen-digit licence number.' },
  { id: 'fontSize', label: 'Font Size', status: 'warning', note: '1.3 mm, just under the 1.5 mm minimum.' },
];

const SUMMARY = {
  passed: VERIFIED.filter((r) => r.status === 'pass').length,
  warnings: VERIFIED.filter((r) => r.status === 'warning').length,
  failed: VERIFIED.filter((r) => r.status === 'fail').length,
};

/** Shared lead-in block: number, title, the one-line promise, then the short explanation. */
function StageCopy({ innerRef, step, kicker, title, lead, explain, children }) {
  return (
    <div className="story-stage__copy" ref={innerRef}>
      <span className="mono-label">
        {step} · {kicker}
      </span>
      <h3>{title}</h3>
      <p className="story-stage__lead">{lead}</p>
      <p className="story-stage__explain">{explain}</p>
      {children}
    </div>
  );
}

/* -------------------------------------------------- 01 · SCAN ------------- */

export function StageScan({ active }) {
  const copyRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (active && !reducedMotion) revealChildren(copyRef.current);
  }, [active, reducedMotion]);

  return (
    <div className="story-stage story-stage--scan">
      <div className="story-stage__art">
        <LabelPhoto frameGuide sweep={active && !reducedMotion} />
      </div>
      <StageCopy
        innerRef={copyRef}
        step="01"
        kicker="Scan"
        title="Scan the Package"
        lead="Upload a clear photo of the product label."
        explain="One straight-on shot of the panel carrying the declarations is enough. The frame is deskewed and de-glared first, so faint print near the seams and folds still reads cleanly."
      >
        <ul className="story-stage__tags">
          <li>Front, back or side</li>
          <li>Whole panel in frame</li>
          <li>No crop, no filter</li>
        </ul>
      </StageCopy>
    </div>
  );
}

/* ----------------------------------------------- 02 · MEASURE ------------- */

export function StageMeasure({ active }) {
  const copyRef = useRef(null);
  const ruleRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;
    revealChildren(copyRef.current);
    const line = ruleRef.current?.querySelector('.measure-overlay__line');
    const pill = ruleRef.current?.querySelector('.measure-overlay__pill');
    if (line) {
      gsap.fromTo(
        line,
        { scaleX: 0, transformOrigin: '0% 50%' },
        { scaleX: 1, duration: 0.7, ease: 'power2.out' }
      );
    }
    if (pill) {
      gsap.fromTo(pill, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.55, ease: 'power2.out' });
    }
  }, [active, reducedMotion]);

  return (
    <div className="story-stage story-stage--measure">
      <StageCopy
        innerRef={copyRef}
        step="02"
        kicker="Measure"
        title="Measure the Barcode"
        lead="An on-image ruler is set against the barcode on the label."
        explain="The barcode is the one element on the pack with a known printed width, so measuring it turns image pixels into real millimetres. That single scale is what later makes it possible to judge whether the declarations are printed large enough."
      >
        <dl className="story-stage__readouts">
          <div>
            <dt className="mono-label">Reference</dt>
            <dd>Barcode · 3.2 cm</dd>
          </div>
          <div>
            <dt className="mono-label">Scale</dt>
            <dd>0.107 mm / px</dd>
          </div>
          <div>
            <dt className="mono-label">Text height</dt>
            <dd>1.30 mm</dd>
          </div>
        </dl>
      </StageCopy>

      <div className="story-stage__art" ref={ruleRef}>
        <LabelPhoto visibleRegionIds={['barcode']}>
          <span className="measure-overlay" aria-hidden="true">
            <span className="measure-overlay__line" />
            <span className="measure-overlay__pill">3.2 cm</span>
          </span>
        </LabelPhoto>
      </div>
    </div>
  );
}

/* ----------------------------------------------- 03 · EXTRACT ------------- */

export function StageExtract({ active }) {
  const artRef = useRef(null);
  const copyRef = useRef(null);
  const listRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;
    const boxes = artRef.current?.querySelectorAll('.label-photo__box') ?? [];
    gsap.fromTo(
      boxes,
      { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' },
      { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(1.6)' }
    );
    revealChildren(copyRef.current);
    revealChildren(listRef.current, { stagger: 0.07 });
  }, [active, reducedMotion]);

  return (
    <div className="story-stage story-stage--extract">
      <div className="story-stage__art" ref={artRef}>
        <LabelPhoto visibleRegionIds={EXTRACTED.map((item) => item.id)} />
      </div>
      <StageCopy
        innerRef={copyRef}
        step="03"
        kicker="Extract"
        title="Extract the Declarations"
        lead="LACE reads and organises the label information."
        explain="Text is lifted off the panel and each line is sorted into the declaration it belongs to — price here, quantity there — instead of being left as one loose block of characters. Every value keeps its box on the image, so it can be traced back to where it was printed."
      >
        <ul className="story-stage__extracted" ref={listRef}>
          {EXTRACTED.map((item) => (
            <li key={item.id}>
              <span className="mono-label">{item.label}</span>
              <span className="story-stage__extracted-value">{item.value}</span>
            </li>
          ))}
        </ul>
      </StageCopy>
    </div>
  );
}

/* ------------------------------------------------ 04 · VERIFY ------------- */

export function StageVerify({ active }) {
  const copyRef = useRef(null);
  const listRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;
    revealChildren(copyRef.current);
    revealChildren(listRef.current, { stagger: 0.09 });
  }, [active, reducedMotion]);

  return (
    <div className="story-stage story-stage--verify">
      <StageCopy
        innerRef={copyRef}
        step="04"
        kicker="Verify"
        title="Check Against the Rules"
        lead="Required declarations are checked against LMPC rules."
        explain="Each extracted value faces the same set of questions: is it present, is it written in the prescribed form, is it complete, and is it printed at the required size. A rule that is met passes; one that sits on the borderline is flagged rather than quietly let through."
      >
        <p className="story-stage__checks">Presence · Format · Completeness · Readability · Size</p>
      </StageCopy>

      <ul className="story-stage__rule-list" ref={listRef}>
        {VERIFIED.map((rule) => (
          <li key={rule.id}>
            <span className="story-stage__rule-name">
              {rule.label}
              <small>{rule.note}</small>
            </span>
            <StatusBadge status={rule.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------ 05 · REPORT ------------- */

export function StageReport({ active }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const verdict = SUMMARY.failed > 0 ? 'NON-COMPLIANT' : SUMMARY.warnings > 0 ? 'REVIEW NEEDED' : 'COMPLIANT';
  const verdictClass = SUMMARY.failed > 0 ? 'is-fail' : SUMMARY.warnings > 0 ? 'is-warning' : 'is-pass';

  useEffect(() => {
    if (active && !reducedMotion) revealChildren(ref.current, { stagger: 0.12 });
  }, [active, reducedMotion]);

  return (
    <div className="story-stage story-stage--report" ref={ref}>
      <span className="mono-label">05 · Report</span>
      <ComplianceRing
        passed={SUMMARY.passed}
        warnings={SUMMARY.warnings}
        failed={SUMMARY.failed}
        size={168}
        animate={active}
      />
      <h3 className={verdictClass}>{verdict}</h3>
      <p className="story-stage__lead">Get a clear compliance result with Pass, Warning, or Fail.</p>
      <p className="story-stage__explain story-stage__explain--center">
        The verdict arrives with its working attached — which rule produced it, the value that was read, and the
        spot on the package it came from. A warning like the one here points straight at the fix: reprint that
        declaration slightly larger.
      </p>
      <ul className="story-stage__legend">
        <li className="is-pass">
          <Check size={13} strokeWidth={3} aria-hidden="true" /> Pass
        </li>
        <li className="is-warning">
          <AlertTriangle size={13} strokeWidth={3} aria-hidden="true" /> Warning
        </li>
        <li className="is-fail">
          <X size={13} strokeWidth={3} aria-hidden="true" /> Fail
        </li>
      </ul>
    </div>
  );
}
