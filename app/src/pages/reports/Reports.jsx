import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Basics';
import { inspections } from '../../data/mockData';

export default function Reports() {
  return (
    <div className="page reports-page">
      <div className="page__head">
        <h1>Reports</h1>
        <p className="page__subtitle">Generate a printable report for any completed inspection.</p>
      </div>

      <ul className="recent-list reports-page__list">
        {inspections.map((i) => (
          <li key={i.id}>
            <span className="reports-page__icon" aria-hidden="true">
              <FileText size={18} strokeWidth={1.8} />
            </span>
            <div className="recent-list__body">
              <span>{i.product.name}</span>
              <span className="recent-list__meta">
                {i.id} · {i.date}
              </span>
            </div>
            <StatusBadge status={i.status} size="sm" />
            <Link to={`/report/${i.id}`}>Open →</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
