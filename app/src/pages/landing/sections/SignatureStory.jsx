import { useLayoutEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { StageScan, StageMeasure, StageExtract, StageVerify, StageReport } from './StoryStages';

// Order matches the five-step product flow shown on the marketing diagram.
const STAGES = [StageScan, StageMeasure, StageExtract, StageVerify, StageReport];

export function SignatureStory() {
  const pinAreaRef = useRef(null);
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion) return; // static, stacked, nothing to wire up
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', () => {
      const track = trackRef.current;
      const panels = gsap.utils.toArray(track.children);
      const tween = gsap.to(track, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: pinAreaRef.current,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => '+=' + (track.scrollWidth - window.innerWidth),
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (panels.length - 1));
            setActiveIndex((prev) => (prev === idx ? prev : idx));
          },
        },
      });
      return () => tween.scrollTrigger?.kill();
    });

    mm.add('(max-width: 1023.98px)', () => {
      const panels = gsap.utils.toArray(trackRef.current.children);
      const triggers = panels.map((panel, i) =>
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 72%',
          end: 'bottom 28%',
          onEnter: () => setActiveIndex(i),
          onEnterBack: () => setActiveIndex(i),
        })
      );
      return () => triggers.forEach((t) => t.kill());
    });

    return () => mm.revert();
  }, [reducedMotion]);

  return (
    <section className={`signature-story ${reducedMotion ? 'is-static' : ''}`.trim()} id="how-it-works">
      <div className="signature-story__intro container">
        <span className="eyebrow">How It Works</span>
        <h2>From package to verdict.</h2>
        <p>One image. A complete inspection.</p>
      </div>
      <div className="signature-story__pin-area" ref={pinAreaRef}>
        <div className="signature-story__track" ref={trackRef}>
          {STAGES.map((Stage, i) => (
            <div className="signature-story__panel" key={i}>
              <Stage active={activeIndex === i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
