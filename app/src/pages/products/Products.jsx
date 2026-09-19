import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductThumbnail } from '../../components/ui/ProductThumbnail';
import { StatusBadge, SearchBar } from '../../components/ui/Basics';
import { products } from '../../data/mockData';

export default function Products() {
  const [query, setQuery] = useState('');
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="page products-page">
      <div className="page__head">
        <h1>Products</h1>
        <SearchBar value={query} onChange={setQuery} placeholder="Search products or brands" />
      </div>

      <ul className="recent-list products-page__list">
        {filtered.map((p) => (
          <li key={p.id}>
            <ProductThumbnail category={p.category} size={44} />
            <div className="recent-list__body">
              <span>{p.name}</span>
              <span className="recent-list__meta">
                {p.brand} · {p.inspectionCount} inspection{p.inspectionCount === 1 ? '' : 's'} · Last {p.latestDate}
              </span>
            </div>
            <StatusBadge status={p.status} size="sm" />
            <Link to={`/inspection/${p.latestInspectionId}`} aria-label={`View ${p.name} inspection`}>
              →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
