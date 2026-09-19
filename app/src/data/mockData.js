import { getUserName, getInitials } from '../lib/auth';
// All data in this file is MOCK DATA standing in for the real API — see README.
// Wire this up to the Rust/Axum backend by replacing these exports with fetch calls
// that return the same shapes.

export const CATEGORIES = [
  'Food & Beverages',
  'Personal Care',
  'Household',
  'Stationery',
  'Electronics Accessories',
];

export const CATEGORY_COLORS = {
  'Food & Beverages': '#B9834A',
  'Personal Care': '#A97C93',
  Household: '#5E7F92',
  Stationery: '#8A7A46',
  'Electronics Accessories': '#5B7568',
};

// The six checks L.A.C.E. runs against every scan. Font Size is derived from the
// calibrated physical scale rather than read directly off a single declaration.
export const RULE_ORDER = ['mrp', 'netQuantity', 'manufacturer', 'mfgDate', 'consumerCare', 'fontSize'];

export const RULE_META = {
  mrp: {
    id: 'mrp',
    label: 'MRP',
    regionId: 'mrp',
    requirement: 'Retail price must be printed as "MRP: ₹__" inclusive of all taxes, in one place on the principal display panel.',
    checks: ['Presence', 'Format', 'Completeness'],
  },
  netQuantity: {
    id: 'netQuantity',
    label: 'Net Quantity',
    regionId: 'netQuantity',
    requirement: 'Net quantity must be declared in standard metric units (g, kg, ml, l) in the font size prescribed for the pack size.',
    checks: ['Presence', 'Format', 'Size'],
  },
  manufacturer: {
    id: 'manufacturer',
    label: 'Manufacturer',
    regionId: 'manufacturer',
    requirement: 'Name and complete address of the manufacturer, packer, or importer must be declared.',
    checks: ['Presence', 'Completeness'],
  },
  mfgDate: {
    id: 'mfgDate',
    label: 'Manufacture Date',
    regionId: 'mfgDate',
    requirement: 'Month and year of manufacture, packing, or import must be declared.',
    checks: ['Presence', 'Format'],
  },
  consumerCare: {
    id: 'consumerCare',
    label: 'Consumer Care',
    regionId: 'consumerCare',
    requirement: 'A working consumer care name, address, phone number, or email must be declared and legible.',
    checks: ['Presence', 'Readability'],
  },
  fontSize: {
    id: 'fontSize',
    label: 'Font Size',
    regionId: null,
    requirement: "Declarations must meet the minimum character height for the pack's net-quantity slab, derived from the calibrated physical scale.",
    checks: ['Size'],
  },
};

function summarize(rules) {
  const values = Object.values(rules);
  return {
    passed: values.filter((r) => r.status === 'pass').length,
    warnings: values.filter((r) => r.status === 'warning').length,
    failed: values.filter((r) => r.status === 'fail').length,
  };
}

function overallStatus(summary) {
  if (summary.failed > 0) return 'noncompliant';
  if (summary.warnings > 0) return 'warning';
  return 'compliant';
}

function makeInspection(base) {
  const summary = summarize(base.rules);
  return { ...base, summary, status: overallStatus(summary) };
}

// The package shown throughout the hero, the signature story, the scan flow demo,
// and INSP-1042 below is the same illustrated product end to end.
export const DEMO_DECLARATIONS = {
  brand: 'NORTHFIELD',
  productName: 'Roasted Makhana',
  tagline: 'Lightly Salted',
  manufacturer: 'Mktd by: Northfield Foods Pvt. Ltd., Pune 411001',
  netQuantity: 'Net Qty: 200 g',
  mrp: 'MRP: ₹99.00*',
  mfgDate: 'Mfg: 08/2025',
  consumerCare: 'Consumer Care: 1800-212-3456',
  batch: 'Batch: NF2508K',
};

export const inspections = [
  makeInspection({
    id: 'INSP-1042',
    date: '2026-09-17',
    inspector: 'R. Sharma',
    category: 'Food & Beverages',
    product: { name: 'Roasted Makhana, Lightly Salted', brand: 'Northfield Foods' },
    declarations: DEMO_DECLARATIONS,
    measurement: { referenceMm: 37.3, scaleMmPerPx: 0.1, detectedTextPx: 13, physicalTextMm: 1.3 },
    rules: {
      mrp: { status: 'pass', extracted: '₹99.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '200 g' },
      manufacturer: { status: 'pass', extracted: 'Northfield Foods Pvt. Ltd., Pune 411001' },
      mfgDate: { status: 'pass', extracted: '08/2025' },
      consumerCare: { status: 'pass', extracted: '1800-212-3456' },
      fontSize: { status: 'warning', extracted: '1.30 mm', note: 'Just under the 1.5 mm minimum for this pack-size band.' },
    },
  }),
  makeInspection({
    id: 'INSP-1041',
    date: '2026-09-16',
    inspector: 'A. Verma',
    category: 'Personal Care',
    product: { name: 'Coconut Body Wash, 200 ml', brand: 'Meadowline' },
    declarations: {
      brand: 'MEADOWLINE',
      productName: 'Coconut Body Wash',
      tagline: '200 ml',
      manufacturer: 'Mktd by: Meadowline Personal Care Pvt. Ltd., Ahmedabad 380001',
      netQuantity: 'Net Qty: 200 ml',
      mrp: 'MRP: —',
      mfgDate: 'Mfg: 01/2026',
      consumerCare: 'Consumer Care: [illegible]',
      batch: 'Batch: ML0126A',
    },
    measurement: { referenceMm: 42.0, scaleMmPerPx: 0.112, detectedTextPx: 15, physicalTextMm: 1.68 },
    rules: {
      mrp: { status: 'fail', extracted: 'Not detected', note: 'MRP declaration missing or obscured by the shrink sleeve.' },
      netQuantity: { status: 'pass', extracted: '200 ml' },
      manufacturer: { status: 'pass', extracted: 'Meadowline Personal Care Pvt. Ltd., Ahmedabad 380001' },
      mfgDate: { status: 'pass', extracted: '01/2026' },
      consumerCare: { status: 'fail', extracted: 'Illegible', note: 'Printed in low-contrast foil, below the readability threshold.' },
      fontSize: { status: 'pass', extracted: '1.68 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1040',
    date: '2026-09-15',
    inspector: 'P. Nair',
    category: 'Stationery',
    product: { name: 'Gel Pens, Pack of 5', brand: 'Clearline' },
    declarations: {
      brand: 'CLEARLINE',
      productName: 'Gel Pens',
      tagline: 'Pack of 5',
      manufacturer: 'Mktd by: Clearline Stationery Pvt. Ltd., Coimbatore 641001',
      netQuantity: 'Net Qty: 5N',
      mrp: 'MRP: ₹60.00*',
      mfgDate: 'Mfg: 05/2026',
      consumerCare: 'Consumer Care: care@clearline.in',
      batch: 'Batch: CL0526C',
    },
    measurement: { referenceMm: 28.0, scaleMmPerPx: 0.084, detectedTextPx: 20, physicalTextMm: 1.68 },
    rules: {
      mrp: { status: 'pass', extracted: '₹60.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '5N (pieces)' },
      manufacturer: { status: 'pass', extracted: 'Clearline Stationery Pvt. Ltd., Coimbatore 641001' },
      mfgDate: { status: 'pass', extracted: '05/2026' },
      consumerCare: { status: 'pass', extracted: 'care@clearline.in' },
      fontSize: { status: 'pass', extracted: '1.68 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1039',
    date: '2026-09-14',
    inspector: 'R. Sharma',
    category: 'Food & Beverages',
    product: { name: 'Filter Coffee Powder, 500 g', brand: 'Bramblewood' },
    declarations: {
      brand: 'BRAMBLEWOOD',
      productName: 'Filter Coffee Powder',
      tagline: '500 g',
      manufacturer: 'Mktd by: Bramblewood Estates Pvt. Ltd., Coorg 571201',
      netQuantity: 'Net Qty: 500 g',
      mrp: 'MRP: ₹310.00*',
      mfgDate: 'Mfg: 07/2026',
      consumerCare: 'Consumer Care: 1800-425-9091',
      batch: 'Batch: BW0726F',
    },
    measurement: { referenceMm: 55.0, scaleMmPerPx: 0.121, detectedTextPx: 14, physicalTextMm: 1.69 },
    rules: {
      mrp: { status: 'pass', extracted: '₹310.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '500 g' },
      manufacturer: { status: 'pass', extracted: 'Bramblewood Estates Pvt. Ltd., Coorg 571201' },
      mfgDate: { status: 'pass', extracted: '07/2026' },
      consumerCare: { status: 'warning', extracted: '1800-425-9091', note: 'Toll-free number listed without an STD/country code prefix.' },
      fontSize: { status: 'pass', extracted: '1.69 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1038',
    date: '2026-09-12',
    inspector: 'A. Verma',
    category: 'Household',
    product: { name: 'Dish Wash Bar, 700 g', brand: 'Aarohi Home' },
    declarations: {
      brand: 'AAROHI HOME',
      productName: 'Dish Wash Bar',
      tagline: '700 g',
      manufacturer: 'Mktd by: Aarohi Home Care Pvt. Ltd., Indore 452001',
      netQuantity: 'Net Qty: 700gm',
      mrp: 'MRP: ₹85.00*',
      mfgDate: 'Mfg: —',
      consumerCare: 'Consumer Care: 1800-313-4477',
      batch: 'Batch: AH0326D',
    },
    measurement: { referenceMm: 61.0, scaleMmPerPx: 0.131, detectedTextPx: 12, physicalTextMm: 1.57 },
    rules: {
      mrp: { status: 'pass', extracted: '₹85.00 (incl. of all taxes)' },
      netQuantity: { status: 'fail', extracted: '700gm', note: "Non-standard unit abbreviation — must read '700 g'." },
      manufacturer: { status: 'pass', extracted: 'Aarohi Home Care Pvt. Ltd., Indore 452001' },
      mfgDate: { status: 'fail', extracted: 'Not detected', note: 'No manufacture or packing date found on any panel.' },
      consumerCare: { status: 'pass', extracted: '1800-313-4477' },
      fontSize: { status: 'pass', extracted: '1.57 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1037',
    date: '2026-09-10',
    inspector: 'P. Nair',
    category: 'Personal Care',
    product: { name: 'Herbal Hand Sanitizer, 100 ml', brand: 'Solterra' },
    declarations: {
      brand: 'SOLTERRA',
      productName: 'Herbal Hand Sanitizer',
      tagline: '100 ml',
      manufacturer: 'Mktd by: Solterra Wellness Pvt. Ltd., Jaipur 302001',
      netQuantity: 'Net Qty: 100 ml',
      mrp: 'MRP: ₹75.00*',
      mfgDate: 'Mfg: 06/2026',
      consumerCare: 'Consumer Care: 1800-267-1122',
      batch: 'Batch: ST0626S',
    },
    measurement: { referenceMm: 24.0, scaleMmPerPx: 0.079, detectedTextPx: 19, physicalTextMm: 1.5 },
    rules: {
      mrp: { status: 'pass', extracted: '₹75.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '100 ml' },
      manufacturer: { status: 'pass', extracted: 'Solterra Wellness Pvt. Ltd., Jaipur 302001' },
      mfgDate: { status: 'pass', extracted: '06/2026' },
      consumerCare: { status: 'pass', extracted: '1800-267-1122' },
      fontSize: { status: 'pass', extracted: '1.50 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1036',
    date: '2026-09-08',
    inspector: 'R. Sharma',
    category: 'Food & Beverages',
    product: { name: 'Turmeric Powder, 200 g', brand: 'Kirana Basics' },
    declarations: {
      brand: 'KIRANA BASICS',
      productName: 'Turmeric Powder',
      tagline: '200 g',
      manufacturer: 'Mktd by: Kirana Basics Foods LLP, Nagpur 440001',
      netQuantity: 'Net Qty: 200 g',
      mrp: 'MRP: ₹48.00*',
      mfgDate: 'Mfg: 04/2026',
      consumerCare: 'Consumer Care: 1800-890-2233',
      batch: 'Batch: KB0426T',
    },
    measurement: { referenceMm: 37.3, scaleMmPerPx: 0.1, detectedTextPx: 17, physicalTextMm: 1.7 },
    rules: {
      mrp: { status: 'pass', extracted: '₹48.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '200 g' },
      manufacturer: { status: 'pass', extracted: 'Kirana Basics Foods LLP, Nagpur 440001' },
      mfgDate: { status: 'pass', extracted: '04/2026' },
      consumerCare: { status: 'pass', extracted: '1800-890-2233' },
      fontSize: { status: 'pass', extracted: '1.70 mm' },
    },
  }),
  makeInspection({
    id: 'INSP-1035',
    date: '2026-09-05',
    inspector: 'A. Verma',
    category: 'Electronics Accessories',
    product: { name: 'USB-C Cable, Pack of 2', brand: 'Vantage' },
    declarations: {
      brand: 'VANTAGE',
      productName: 'USB-C Cable',
      tagline: 'Pack of 2',
      manufacturer: 'Mktd by: Vantage Electronics Pvt. Ltd., Noida 201301',
      netQuantity: 'Net Qty: 2 pieces',
      mrp: 'MRP: ₹399.00*',
      mfgDate: 'Mfg: 02/2026',
      consumerCare: 'Consumer Care: 1800-121-7788',
      batch: 'Batch: VG0226U',
    },
    measurement: { referenceMm: 33.0, scaleMmPerPx: 0.095, detectedTextPx: 13, physicalTextMm: 1.24 },
    rules: {
      mrp: { status: 'pass', extracted: '₹399.00 (incl. of all taxes)' },
      netQuantity: { status: 'pass', extracted: '2 pieces' },
      manufacturer: { status: 'pass', extracted: 'Vantage Electronics Pvt. Ltd., Noida 201301' },
      mfgDate: { status: 'pass', extracted: '02/2026' },
      consumerCare: { status: 'pass', extracted: '1800-121-7788' },
      fontSize: { status: 'warning', extracted: '1.24 mm', note: 'Marginal against the minimum for count-based declarations.' },
    },
  }),
];

export function getInspection(id) {
  return inspections.find((i) => i.id === id);
}

// The big pass/fail verdict headline is binary — a warning alone doesn't fail an
// inspection, it just needs review. The three-way `status` above is for list badges.
export function isCompliant(summary) {
  return summary.failed === 0;
}

const INSPECTION_COUNTS = { 'INSP-1042': 3, 'INSP-1041': 2, 'INSP-1040': 1, 'INSP-1039': 4, 'INSP-1038': 1, 'INSP-1037': 2, 'INSP-1036': 1, 'INSP-1035': 5 };

export const products = inspections.map((insp) => ({
  id: insp.id,
  name: insp.product.name,
  brand: insp.product.brand,
  category: insp.category,
  latestInspectionId: insp.id,
  latestDate: insp.date,
  status: insp.status,
  inspectionCount: INSPECTION_COUNTS[insp.id] ?? 1,
  declarations: insp.declarations,
}));

export const dashboardMetrics = [
  { id: 'scanned', label: 'Products Scanned', value: 124, deltaPct: 8, direction: 'up' },
  { id: 'compliant', label: 'Compliant', value: 98, deltaPct: 3, direction: 'up' },
  { id: 'noncompliant', label: 'Non-Compliant', value: 21, deltaPct: 2, direction: 'down' },
  { id: 'warnings', label: 'Warnings', value: 5, deltaPct: 1, direction: 'up' },
];

export const complianceTrend = [
  { label: 'Apr', value: 81 },
  { label: 'May', value: 79 },
  { label: 'Jun', value: 84 },
  { label: 'Jul', value: 86 },
  { label: 'Aug', value: 85 },
  { label: 'Sep', value: 89 },
];

export const complianceByCategory = [
  { category: 'Food & Beverages', value: 45 },
  { category: 'Personal Care', value: 25 },
  { category: 'Household', value: 15 },
  { category: 'Stationery', value: 10 },
  { category: 'Electronics Accessories', value: 5 },
];

export const openViolations = [
  { inspectionId: 'INSP-1041', priority: 'high', reason: 'MRP not detected + Consumer Care illegible' },
  { inspectionId: 'INSP-1038', priority: 'high', reason: 'Net Quantity format + Manufacture Date missing' },
  { inspectionId: 'INSP-1035', priority: 'medium', reason: 'Font size marginal against minimum' },
];

export const analyticsData = {
  complianceRate: 84,
  totalInspections: 124,
  violations: 21,
  mostCommonViolation: 'Font Size',
  commonViolations: [
    { label: 'Font Size', count: 9 },
    { label: 'Net Quantity format', count: 6 },
    { label: 'Consumer Care missing/illegible', count: 4 },
    { label: 'MRP not detected', count: 2 },
  ],
};

export const currentUser = {
  name: 'R. Sharma',
  role: 'Legal Metrology Inspector',
  org: 'Department of Consumer Affairs — Field Unit 4',
  initials: 'RS',
};

// The consumer-portal equivalent of currentUser — a shopper using L.A.C.E. to
// check products themselves, rather than an officer running field inspections.
export const currentConsumer = {
  name: 'Aditi Rao',
  role: 'Verified Shopper',
  org: 'Consumer Account',
  initials: 'AR',
};

// Returns the right mock profile for whichever portal is active.
// The name and initials come from whoever actually signed in; the rest of the
// profile (role label, org) is still demo data.
export function getCurrentUser(role) {
  const base = role === 'inspector' ? currentUser : currentConsumer;
  const name = getUserName();
  return name ? { ...base, name, initials: getInitials(name) } : base;
}

// A consumer only ever sees the products *they* personally scanned — a small
// slice of the full inspection log above, re-shaped slightly for their view.
const MY_SCAN_IDS = ['INSP-1042', 'INSP-1041', 'INSP-1036'];
export const myScans = inspections.filter((i) => MY_SCAN_IDS.includes(i.id));

export const consumerMetrics = [
  { id: 'scanned', label: 'Products You Scanned', value: myScans.length, deltaPct: 2, direction: 'up' },
  {
    id: 'compliant',
    label: 'Fully Compliant',
    value: myScans.filter((i) => i.status === 'compliant').length,
    deltaPct: 1,
    direction: 'up',
  },
  {
    id: 'flagged',
    label: 'Flagged for Review',
    value: myScans.filter((i) => i.status !== 'compliant').length,
    deltaPct: 1,
    direction: 'down',
  },
  { id: 'reported', label: 'Reports Filed', value: 1, deltaPct: 0, direction: 'up' },
];

export const consumerTips = [
  'Check the MRP panel first — it must include “inclusive of all taxes”.',
  'Net quantity should use standard units (g, kg, ml, l), never vague terms.',
  'No manufacture date or consumer-care contact? That’s worth reporting.',
];
