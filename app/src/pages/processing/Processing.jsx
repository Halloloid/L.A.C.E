import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '../../lib/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ProcessingTimeline } from '../../components/processing/ProcessingTimeline';
import PackageArt from '../../components/illustrations/PackageArt';
import { DEMO_DECLARATIONS, getInspection } from '../../data/mockData';

const STAGES = [
  { title: 'Upload', description: 'Receiving the captured image.' },
  { title: 'Image Quality', description: 'Checking focus, glare and lighting.' },
  { title: 'OCR', description: 'Reading text from every panel.' },
  { title: 'Text Ordering', description: 'Grouping text into declarations.' },
  { title: 'Rule Validation', description: 'Checking each declaration against the rules.' },
  { title: 'Legibility', description: 'Verifying the calibrated character height.' },
  { title: 'Verdict', description: 'Compiling the compliance result.' },
];

const DEMO_ID = 'INSP-1042';
const STAGE_DURATION = 750;

export default function Processing() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const artRef = useRef(null);

  useEffect(() => {
    if (activeIndex >= STAGES.length) {
      const demo = getInspection(DEMO_ID);
      const t = setTimeout(() => navigate(`/verdict/${demo.id}`), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), STAGE_DURATION);
    return () => clearTimeout(t);
  }, [activeIndex, navigate]);

  useEffect(() => {
    if (reducedMotion || !artRef.current) return;
    gsap.fromTo(
      artRef.current,
      { opacity: 0.5 },
      { opacity: 1, duration: 0.4, ease: 'power2.out', yoyo: true, repeat: 1 }
    );
  }, [activeIndex, reducedMotion]);

  const done = activeIndex >= STAGES.length;

  return (
    <div className="page processing-page">
      <div className="page__head">
        <h1>Processing</h1>
        <p className="page__subtitle">
          {done ? 'Inspection complete — preparing the verdict…' : 'Running the automated inspection pipeline.'}
        </p>
      </div>

      <div className="processing-page__grid">
        <div className="processing-page__art" ref={artRef}>
          <PackageArt
            declarations={DEMO_DECLARATIONS}
            visibleRegionIds={activeIndex >= 2 ? 'all' : null}
          />
        </div>
        <ProcessingTimeline stages={STAGES} activeIndex={activeIndex} />
      </div>
    </div>
  );
}
