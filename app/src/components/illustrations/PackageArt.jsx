// A single illustrated package is reused everywhere a product image would appear —
// the hero, the signature story, the scan flow, and the evidence lens all render the
// same template, parameterised by the declarations text and a category tint. This
// keeps "the same package" flowing through the whole story (per the wireframe) without
// needing real product photography, which we deliberately avoid for a mock frontend.

export const VIEW_BOX = { width: 400, height: 560 };

// Bounding boxes for the five OCR'd declarations, in the SVG's own coordinate space.
// fontSize is intentionally absent — it's derived from the calibrated scale, not read
// off a single region.
export const LABEL_REGIONS = [
  { id: 'manufacturer', label: 'Manufacturer', x: 76, y: 364, width: 248, height: 20 },
  { id: 'netQuantity', label: 'Net Quantity', x: 76, y: 390, width: 118, height: 20 },
  { id: 'mrp', label: 'MRP', x: 206, y: 390, width: 118, height: 20 },
  { id: 'mfgDate', label: 'Manufacture Date', x: 76, y: 416, width: 110, height: 20 },
  { id: 'consumerCare', label: 'Consumer Care', x: 76, y: 442, width: 230, height: 20 },
];

export function getRegion(id) {
  return LABEL_REGIONS.find((r) => r.id === id);
}

const STATUS_COLOR = {
  pass: 'var(--pass)',
  warning: 'var(--warning)',
  fail: 'var(--fail)',
};

// The brand band can be any category tint, from a pale gold to a deep slate, so the
// band's own text picks its ink from the band's luminance rather than assuming one.
function bandInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return { strong: '#fffdf7', soft: '#f7f2e6' };
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? { strong: '#1c1a16', soft: '#3a362d' } : { strong: '#fffdf7', soft: '#f7f2e6' };
}

/**
 * The package artwork's inner marks, with no wrapping <svg>. Used standalone via
 * <PackageArt/> below, or embedded inside a parent-controlled <svg> (e.g.
 * MeasurementTool) so pointer math and overlays share one coordinate system.
 *
 * Props:
 *  - declarations: { brand, productName, tagline, manufacturer, netQuantity, mrp, mfgDate, consumerCare, batch }
 *  - bandColor: hex string for the brand band (defaults to the LACE label gold)
 *  - visibleRegionIds: 'all' | string[] | null — which OCR boxes to draw
 *  - regionStatuses: { [regionId]: 'pass'|'warning'|'fail' } — colors the boxes once verified
 *  - highlightRegionId: string | null — draws one region with a heavier, pulsing outline
 *  - callout: { regionId, text, status } | null — a leader-line label pointing at one region
 */
export function PackageArtMarks({
  declarations,
  bandColor = '#e9ca34', // the label gold; band text contrast is derived, not assumed
  visibleRegionIds = null,
  regionStatuses = {},
  highlightRegionId = null,
  callout = null,
}) {
  const d = declarations;
  const ink = bandInk(bandColor);
  const regionsToShow =
    visibleRegionIds === 'all' ? LABEL_REGIONS : LABEL_REGIONS.filter((r) => visibleRegionIds?.includes(r.id));

  return (
    <g>
      <defs>
        <clipPath id="pkg-clip">
          <rect x="48" y="36" width="304" height="488" rx="20" />
        </clipPath>
      </defs>

      <g clipPath="url(#pkg-clip)">
        {/* body */}
        <rect x="48" y="36" width="304" height="488" fill="#f3ede0" />
        {/* brand band */}
        <rect x="48" y="36" width="304" height="156" fill={bandColor} />
        {/* soft decorative ring on the body — abstract, not literal product art */}
        <circle cx="200" cy="270" r="86" fill="none" stroke="#e7ddc7" strokeWidth="2" />

        {/* emblem */}
        <circle cx="98" cy="96" r="25" fill="none" stroke={ink.soft} strokeWidth="2" opacity="0.9" />
        <path
          d="M88 100c4-14 16-20 24-20-2 10-8 20-24 20z"
          fill={ink.soft}
          opacity="0.9"
        />

        <text x="140" y="90" fontFamily="var(--font-mono)" fontWeight="600" fontSize="14" letterSpacing="1.5" fill={ink.soft}>
          {d.brand}
        </text>
        <text x="140" y="118" fontFamily="var(--font-sans)" fontWeight="700" fontSize="23" fill={ink.strong}>
          {d.productName}
        </text>
        <text x="140" y="141" fontFamily="var(--font-sans)" fontWeight="500" fontSize="14" fill={ink.strong} opacity="0.85">
          {d.tagline}
        </text>

        {/* label panel */}
        <rect x="64" y="350" width="272" height="150" rx="8" fill="#fffcf5" stroke="#e4ddcb" />
        <text x="76" y="378" fontFamily="var(--font-mono)" fontSize="11" fill="#3a362d">
          {d.manufacturer}
        </text>
        <text x="76" y="404" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600" fill="#1c1a16">
          {d.netQuantity}
        </text>
        <text x="206" y="404" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600" fill="#1c1a16">
          {d.mrp}
        </text>
        <text x="76" y="430" fontFamily="var(--font-mono)" fontSize="11" fill="#3a362d">
          {d.mfgDate}
        </text>
        <text x="76" y="456" fontFamily="var(--font-mono)" fontSize="11" fill="#3a362d">
          {d.consumerCare}
        </text>
        <text x="76" y="478" fontFamily="var(--font-mono)" fontSize="10" fill="#736c5e">
          {d.batch}
        </text>
        <text x="76" y="494" fontFamily="var(--font-sans)" fontSize="8" fill="#a39c8c">
          *incl. of all taxes
        </text>
      </g>

      {/* package outline */}
      <rect x="48" y="36" width="304" height="488" rx="20" fill="none" stroke="#d3c9ae" strokeWidth="1.5" />

      {/* OCR / evidence boxes */}
      {regionsToShow.map((r) => {
        const status = regionStatuses[r.id];
        const isHighlighted = highlightRegionId === r.id;
        const color = status ? STATUS_COLOR[status] : 'var(--forest)';
        return (
          <rect
            key={r.id}
            data-region-id={r.id}
            className={isHighlighted ? 'pkgart-box pkgart-box--highlight' : 'pkgart-box'}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx="3"
            fill="none"
            stroke={color}
            strokeWidth={isHighlighted ? 2.5 : 1.5}
          />
        );
      })}

      {callout &&
        (() => {
          const region = getRegion(callout.regionId);
          if (!region) return null;
          const boxCenterX = region.x + region.width / 2;
          const bubbleY = region.y - 34;
          const bubbleColor = STATUS_COLOR[callout.status] || 'var(--forest)';
          return (
            <g className="pkgart-callout">
              <line
                x1={boxCenterX}
                y1={region.y}
                x2={boxCenterX}
                y2={bubbleY + 22}
                stroke={bubbleColor}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect
                x={Math.max(8, Math.min(boxCenterX - 70, 400 - 148))}
                y={Math.max(4, bubbleY - 6)}
                width="140"
                height="24"
                rx="12"
                fill={bubbleColor}
              />
              <text
                x={Math.max(8, Math.min(boxCenterX - 70, 400 - 148)) + 70}
                y={Math.max(4, bubbleY - 6) + 16}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="10.5"
                fontWeight="600"
                fill="#fffcf5"
              >
                {callout.text}
              </text>
            </g>
          );
        })()}
    </g>
  );
}

export default function PackageArt({ className = '', onClick, ...marksProps }) {
  return (
    <svg
      className={`package-art ${className}`}
      viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      role="img"
      onClick={onClick}
      aria-label={`${marksProps.declarations?.productName ?? 'Product'} package, front panel`}
    >
      <PackageArtMarks {...marksProps} />
    </svg>
  );
}
