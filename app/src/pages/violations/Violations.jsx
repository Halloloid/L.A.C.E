import { Link } from 'react-router-dom';
import { ProductThumbnail } from '../../components/ui/ProductThumbnail';
import { getInspection, openViolations } from '../../data/mockData';

export default function Violations() {
  return (
    <div className="page violations-page">
      <div className="page__head">
        <h1>Open Violations</h1>
        <p className="page__subtitle">{openViolations.length} inspections need follow-up.</p>
      </div>

      <ul className="violation-list violations-page__list">
        {openViolations.map((v) => {
          const insp = getInspection(v.inspectionId);
          return (
            <li key={v.inspectionId}>
              <ProductThumbnail
                category={insp.category}
                size={40}
                statusDot={insp.status === 'noncompliant' ? 'fail' : 'warning'}
              />
              <div>
                <span>{insp.product.name}</span>
                <span className="violation-list__reason">{v.reason}</span>
              </div>
              <span className={`mono-label violations-page__priority violations-page__priority--${v.priority}`}>
                {v.priority}
              </span>
              <Link to={`/inspection/${insp.id}`}>Review →</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
