import { ShoppingBag, Droplet, Home, PenLine, Cable, Package } from 'lucide-react';
import { CATEGORY_COLORS } from '../../data/mockData';

const CATEGORY_ICON = {
  'Food & Beverages': ShoppingBag,
  'Personal Care': Droplet,
  Household: Home,
  Stationery: PenLine,
  'Electronics Accessories': Cable,
};

export function ProductThumbnail({ category, size = 44, statusDot }) {
  const Icon = CATEGORY_ICON[category] || Package;
  const color = CATEGORY_COLORS[category] || '#48b890';
  return (
    <span
      className="product-thumb"
      style={{ width: size, height: size, background: `${color}1a`, color }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.8} aria-hidden="true" />
      {statusDot && <span className={`product-thumb__dot product-thumb__dot--${statusDot}`} aria-hidden="true" />}
    </span>
  );
}
