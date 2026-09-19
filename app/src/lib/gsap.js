import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registered once, here, so every component can just `import { gsap, ScrollTrigger } from '../../lib/gsap'`
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

// Small shared helper: fade+rise the direct children of a container, staggered.
// Used by every "reveal on becoming active" moment across the app.
export function revealChildren(container, { stagger = 0.08, y = 16, duration = 0.6 } = {}) {
  if (!container) return;
  const children = Array.from(container.children);
  if (!children.length) return;
  gsap.fromTo(children, { opacity: 0, y }, { opacity: 1, y: 0, duration, stagger, ease: 'power2.out' });
}
