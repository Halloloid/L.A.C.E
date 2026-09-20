// The signature story now runs on a real photographed back-panel instead of the
// illustrated PackageArt. Every overlay is positioned in PERCENTAGES of the photo,
// so the boxes stay locked to the printed declarations at any panel width.
//
// Source photo: 1239 x 1270 — a wafer-biscuit back panel carrying the full set of
// LMPC declarations (net weight, MRP, packed date, batch, manufacturer, FSSAI licence,
// barcode). Purely presentational: nothing here is clickable or draggable.

import labelPhoto from '../../assets/label-photo.png';

export const PHOTO_REGIONS = [
  { id: 'netQuantity', label: 'Net Quantity', left: 55.8, top: 19.2, width: 29.8, height: 2.9 },
  { id: 'mrp', label: 'MRP', left: 52.9, top: 22.6, width: 33.2, height: 5.9 },
  { id: 'mfgDate', label: 'Packed Date', left: 61.8, top: 28.2, width: 13.0, height: 2.9 },
  { id: 'batch', label: 'Batch Number', left: 61.8, top: 32.3, width: 13.0, height: 3.0 },
  { id: 'manufacturer', label: 'Manufacturer', left: 59.3, top: 41.5, width: 26.6, height: 5.9 },
  { id: 'fssai', label: 'FSSAI Licence', left: 41.5, top: 42.1, width: 17.3, height: 5.4 },
  { id: 'ingredients', label: 'Ingredients & Allergens', left: 14.2, top: 19.4, width: 38.6, height: 28.2 },
  { id: 'barcode', label: 'Barcode', left: 59.4, top: 60.0, width: 24.4, height: 10.0 },
];

export function getPhotoRegion(id) {
  return PHOTO_REGIONS.find((r) => r.id === id);
}

const STATUS_CLASS = {
  pass: 'is-pass',
  warning: 'is-warning',
  fail: 'is-fail',
};

/**
 * Props:
 *  - visibleRegionIds: 'all' | string[] | null — which declaration boxes to draw
 *  - regionStatuses: { [id]: 'pass' | 'warning' | 'fail' } — tints a box once verified
 *  - showLabels: boolean — prints the region name above each box
 *  - frameGuide: boolean — camera-style corner brackets (scan stage)
 *  - sweep: boolean — animated scan line running down the photo
 *  - children: any extra overlay (e.g. the measurement rule)
 */
export function LabelPhoto({
  visibleRegionIds = null,
  regionStatuses = {},
  showLabels = false,
  frameGuide = false,
  sweep = false,
  className = '',
  children,
}) {
  const regions =
    visibleRegionIds === 'all'
      ? PHOTO_REGIONS
      : PHOTO_REGIONS.filter((r) => visibleRegionIds?.includes(r.id));

  return (
    <figure className={`label-photo ${className}`.trim()}>
      <img
        src={labelPhoto}
        alt="Back panel of a wafer biscuit pack showing the printed statutory declarations"
        className="label-photo__img"
        draggable="false"
      />

      {frameGuide && <span className="label-photo__frame" aria-hidden="true" />}
      {sweep && <span className="label-photo__sweep" aria-hidden="true" />}

      {regions.map((r) => (
        <span
          key={r.id}
          className={`label-photo__box ${STATUS_CLASS[regionStatuses[r.id]] ?? ''}`.trim()}
          data-region-id={r.id}
          style={{
            left: `${r.left}%`,
            top: `${r.top}%`,
            width: `${r.width}%`,
            height: `${r.height}%`,
          }}
          aria-hidden="true"
        >
          {showLabels && <span className="label-photo__box-label">{r.label}</span>}
        </span>
      ))}

      {children}
    </figure>
  );
}

export default LabelPhoto;
