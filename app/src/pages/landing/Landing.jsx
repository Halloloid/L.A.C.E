import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicNavbar, PublicFooter } from '../../components/layout/PublicChrome';
import { Hero } from './sections/Hero';
import { SignatureStory } from './sections/SignatureStory';

const PROMISE_ITEMS = [
  { title: 'Rule-based', detail: 'Clear validation' },
  { title: 'Fast', detail: 'Field inspection' },
  { title: 'Evidence-backed', detail: 'Traceable results' },
];

export default function Landing() {
  return (
    <>
      <PublicNavbar />
      <main>
        <Hero />

        <section className="promise container" id="technology">
          <ul className="promise__list">
            {PROMISE_ITEMS.map((item) => (
              <li key={item.title}>
                <span className="promise__title">{item.title}</span>
                <span className="promise__detail">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <SignatureStory />

        <section className="closing container" id="reports">
          <h2>Compliance made simpler.</h2>
          <p>From the package image to the inspection report, every step is designed for clarity.</p>
          <Link to="/scan" className="btn btn--primary btn--lg">
            Start Inspection <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
