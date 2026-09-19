import { Check } from 'lucide-react';

export function ProcessingTimeline({ stages, activeIndex }) {
  return (
    <ol className="processing-timeline">
      {stages.map((stage, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'waiting';
        return (
          <li key={stage.title} className={`processing-stage processing-stage--${state}`}>
            <span className="processing-stage__rail" aria-hidden="true">
              <span className="processing-stage__dot">{state === 'done' && <Check size={12} strokeWidth={3} />}</span>
            </span>
            <span className="processing-stage__body">
              <span className="processing-stage__title mono-label">{stage.title}</span>
              <span className="processing-stage__status">
                {state === 'done' ? 'Ready' : state === 'active' ? 'Processing…' : 'Waiting'}
              </span>
              <span className="processing-stage__desc">{stage.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
