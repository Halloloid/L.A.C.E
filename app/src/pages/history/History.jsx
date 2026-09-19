import { Link } from 'react-router-dom';
import { ProductThumbnail } from '../../components/ui/ProductThumbnail';
import { StatusBadge } from '../../components/ui/Basics';
import { inspections, myScans } from '../../data/mockData';
import { isInspector } from '../../lib/auth';

export default function History() {
  const inspector = isInspector();
  const rows = inspector ? inspections : myScans;
  const detailPath = (id) => (inspector ? `/inspection/${id}` : `/verdict/${id}`);

  return (
    <div className="page history-page">
      <div className="page__head">
        <h1>{inspector ? 'Inspection History' : 'My Scans'}</h1>
        <p className="page__subtitle">
          {inspector ? `${rows.length} inspections on record.` : `${rows.length} products you&rsquo;ve scanned.`}
        </p>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Date</th>
            <th>Status</th>
            {inspector && <th>Inspector</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td>
                <div className="data-table__product">
                  <ProductThumbnail category={i.category} size={32} />
                  <div>
                    <div>{i.product.name}</div>
                    <div className="data-table__brand">{i.product.brand}</div>
                  </div>
                </div>
              </td>
              <td>{i.date}</td>
              <td>
                <StatusBadge status={i.status} />
              </td>
              {inspector && <td>{i.inspector}</td>}
              <td>
                <Link to={detailPath(i.id)} className="data-table__action">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
