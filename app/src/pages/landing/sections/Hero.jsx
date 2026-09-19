import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { gsap } from '../../../lib/gsap';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { isSignedIn, getUserName, getRole, resolveAccountName } from '../../../lib/auth';
import packImg from '../../../assets/product-pack.webp';

// Boxes drawn over the real label regions of the product photo. Coordinates are
// x / y / width / height in the photo's own 1000 x 790 space, converted to % below.
const IMG_W = 1000;
const IMG_H = 790;
const REGIONS = [
  { label: 'NET QUANTITY', box: [563, 74, 274, 28], tag: 'above' },
  { label: 'MRP', box: [632, 135, 184, 30] },
  { label: 'DATE', box: [632, 168, 106, 44] },
  { label: 'BATCH', box: [632, 214, 106, 24] },
  { label: 'MANUFACTURER', box: [592, 320, 248, 28], tag: 'above' },
];
const pct = (v, total) => `${(v / total) * 100}%`;

export function Hero() {
  const rootRef = useRef(null);
  const eyebrowRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const copyRef = useRef(null);
  const ctaRef = useRef(null);
  const imageRef = useRef(null);
  const markersWrapRef = useRef(null);
  const cardRef = useRef(null);
  const verticalRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const signedIn = isSignedIn();
  const accountName = signedIn ? getUserName() || resolveAccountName('', getRole()) : '';

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      const markers = markersWrapRef.current?.querySelectorAll('.hero__marker') ?? [];
      gsap.set(
        [eyebrowRef.current, line1Ref.current, line2Ref.current, copyRef.current, ctaRef.current, verticalRef.current],
        { opacity: 0, y: 18 }
      );
      gsap.set(imageRef.current, { opacity: 0, y: 24, scale: 0.98 });
      gsap.set(markers, { opacity: 0, y: 10 });
      gsap.set(cardRef.current, { opacity: 0, y: 14, scale: 0.96 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.7 } });
      tl.to(eyebrowRef.current, { opacity: 1, y: 0 })
        .to(line1Ref.current, { opacity: 1, y: 0 }, '-=0.45')
        .to(line2Ref.current, { opacity: 1, y: 0 }, '-=0.5')
        .to(copyRef.current, { opacity: 1, y: 0 }, '-=0.4')
        .to(ctaRef.current, { opacity: 1, y: 0 }, '-=0.4')
        .to(imageRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.9 }, '-=0.5')
        .to(markers, { opacity: 1, y: 0, stagger: 0.1 }, '-=0.5')
        .to(verticalRef.current, { opacity: 1, y: 0 }, '-=0.6')
        .to(cardRef.current, { opacity: 1, y: 0, scale: 1 }, '-=0.15');
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const root = rootRef.current;
    function onMove(e) {
      const rect = root.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(imageRef.current, { x: relX * 12, y: relY * 12, duration: 0.6, ease: 'power2.out' });
    }
    root.addEventListener('mousemove', onMove);
    return () => root.removeEventListener('mousemove', onMove);
  }, [reducedMotion]);

  return (
    <section className="hero" id="product" ref={rootRef}>
      <div className="container hero__inner">
        <div className="hero__copy">
          {signedIn && (
            <span className="hero__welcome">
              <span className="hero__welcome-dot" aria-hidden="true" />
              Signed in as <strong>{accountName}</strong>
            </span>
          )}
          <span className="eyebrow" ref={eyebrowRef}>
            Legal Automated Compliance Engine
          </span>
          <h1 className="hero__heading">
            <span ref={line1Ref}>SCAN THE LABEL.</span>
            <span ref={line2Ref}>KNOW THE RULE.</span>
          </h1>
          <p className="hero__lead" ref={copyRef}>
            Inspect packaged commodities and verify mandatory declarations from a single image.
          </p>
          <div className="hero__cta" ref={ctaRef}>
            <Link to="/scan" className="btn btn--primary btn--lg">
              Start Inspection <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              Explore the process ↓
            </a>
          </div>
          {signedIn ? (
            <p className="hero__audience">
              <Link to="/dashboard">Open your dashboard <span aria-hidden="true">→</span></Link>
            </p>
          ) : (
            <p className="hero__audience">
              For shoppers and officers alike — <Link to="/login">sign in as a consumer</Link> or{' '}
              <Link to="/login">as an inspection officer</Link>.
            </p>
          )}
        </div>

        <div className="hero__art">
          <div className="hero__art-frame" ref={imageRef}>
            <img
              className="hero__photo"
              src={packImg}
              width={IMG_W}
              height={IMG_H}
              alt="Back of a packaged wafer biscuit showing net weight, MRP, packing date and manufacturer declarations"
            />
            <div className="hero__markers" ref={markersWrapRef}>
              {REGIONS.map(({ label, box: [x, y, w, h], tag }) => (
                <span
                  key={label}
                  className="hero__marker"
                  style={{ left: pct(x, IMG_W), top: pct(y, IMG_H), width: pct(w, IMG_W), height: pct(h, IMG_H) }}
                >
                  <span className={`hero__marker-tag mono-label ${tag === 'above' ? 'hero__marker-tag--above' : ''}`.trim()}>{label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="hero__card" ref={cardRef}>
            <span className="mono-label">Label Detected</span>
            <strong>5 declarations found</strong>
            <span className="hero__card-ready">
              <Check size={14} aria-hidden="true" /> Ready for inspection
            </span>
          </div>
          <div className="hero__vertical" ref={verticalRef} aria-hidden="true">
            <span>SCAN</span>
            <span>VERIFY</span>
            <span>REPORT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
