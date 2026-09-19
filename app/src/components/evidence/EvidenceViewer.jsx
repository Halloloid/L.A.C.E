import { ZoomIn, ZoomOut, MousePointerClick } from 'lucide-react';
import { useState } from 'react';
import PackageArt from '../illustrations/PackageArt';

const LEGEND = [
  { status: 'pass', label: 'Pass' },
  { status: 'warning', label: 'Warning' },
  { status: 'fail', label: 'Fail' },
];

/**
 * The package viewer half of the inspection workstation. Draws every OCR region
 * colored by its rule's verdict, and — when a rule is selected in the accordion —
 * a leader line + callout pointing straight at the evidence for it. Selecting a
 * region on the image is the mirror action of selecting a rule in the list.
 */
export function EvidenceViewer({
  declarations,
  bandColor,
  regionStatuses = {},
  highlightRegionId = null,
  callout = null,
  onSelectRegion,
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="evidence-viewer">
      <div className="evidence-viewer__toolbar">
        <span className="evidence-viewer__hint">
          <MousePointerClick size={14} aria-hidden="true" /> Select a rule to see its evidence
        </span>
        <div className="evidence-viewer__zoom">
          <button type="button" onClick={() => setZoomed(false)} aria-label="Zoom out" disabled={!zoomed}>
            <ZoomOut size={15} />
          </button>
          <button type="button" onClick={() => setZoomed(true)} aria-label="Zoom in" disabled={zoomed}>
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      <div className={`evidence-viewer__stage ${zoomed ? 'is-zoomed' : ''}`.trim()}>
        <PackageArt
          declarations={declarations}
          bandColor={bandColor}
          visibleRegionIds="all"
          regionStatuses={regionStatuses}
          highlightRegionId={highlightRegionId}
          callout={callout}
          onClick={(e) => {
            const id = e.target?.dataset?.regionId;
            if (id && onSelectRegion) onSelectRegion(id);
          }}
        />
      </div>

      <ul className="evidence-viewer__legend">
        {LEGEND.map((l) => (
          <li key={l.status}>
            <span className={`evidence-viewer__swatch evidence-viewer__swatch--${l.status}`} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
