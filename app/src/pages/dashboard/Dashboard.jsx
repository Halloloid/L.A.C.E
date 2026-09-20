import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ChartCard } from '../../components/ui/Card';
import { Metric, StatusBadge } from '../../components/ui/Basics';
import { ProductThumbnail } from '../../components/ui/ProductThumbnail';
import { LineChart, DonutChart } from '../../components/charts/Charts';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { signOut, getRole } from '../../lib/auth';
import {
  dashboardMetrics,
  complianceTrend,
  complianceByCategory,
  inspections,
  openViolations,
  getInspection,
  getCurrentUser,
  CATEGORY_COLORS,
} from '../../data/mockData';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const currentUser = getCurrentUser(getRole());
  const recent = inspections.slice(0, 6);
  const categoryData = complianceByCategory.map((c) => ({ ...c, color: CATEGORY_COLORS[c.category] }));

  return (
    <div className="page dashboard">
      <div className="page__head">
        <div>
          <h1>
            {getGreeting()}
            <span className="show-desktop">, {currentUser.name}</span>.
          </h1>
          <p className="page__subtitle">Here&rsquo;s your compliance overview.</p>
        </div>
        <div className="page__head-actions">
          <select className="select-field" defaultValue="30" aria-label="Date range">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            type="button"
            className="btn btn--secondary btn--md"
            onClick={() => {
              signOut();
              navigate('/', { replace: true });
            }}
          >
            <LogOut size={15} aria-hidden="true" /> Log out
          </button>
        </div>
      </div>

      <div className="dashboard__metrics">
        {dashboardMetrics.map((m) => (
          <Metric key={m.id} label={m.label} value={m.value} deltaPct={m.deltaPct} direction={m.direction} />
        ))}
      </div>

      <div className="dashboard__grid">
        <ChartCard title="Compliance Trend" subtitle="Monthly compliance rate" className="dashboard__trend">
          <LineChart data={complianceTrend} />
        </ChartCard>

        <ChartCard title="Compliance by Category" className="dashboard__category">
          <DonutChart
            data={categoryData}
            centerLabel={`${categoryData[0].value}%`}
            centerSublabel={categoryData[0].category}
          />
        </ChartCard>

        <ChartCard
          title="Recent Inspections"
          action={
            <Link to="/history" className="chart-card__link">
              View all →
            </Link>
          }
          className="dashboard__recent"
        >
          {isDesktop ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Inspector</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((i) => (
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
                    <td>{i.inspector}</td>
                    <td>
                      <Link to={`/inspection/${i.id}`} className="data-table__action">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="recent-list">
              {recent.map((i) => (
                <li key={i.id}>
                  <ProductThumbnail category={i.category} size={40} />
                  <div className="recent-list__body">
                    <span>{i.product.name}</span>
                    <span className="recent-list__meta">
                      {i.date} · {i.inspector}
                    </span>
                  </div>
                  <StatusBadge status={i.status} size="sm" />
                  <Link to={`/inspection/${i.id}`} aria-label={`View ${i.product.name} inspection`}>
                    →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Open Violations" className="dashboard__violations">
          <ul className="violation-list">
            {openViolations.map((v) => {
              const insp = getInspection(v.inspectionId);
              return (
                <li key={v.inspectionId}>
                  <ProductThumbnail
                    category={insp.category}
                    size={36}
                    statusDot={insp.status === 'noncompliant' ? 'fail' : 'warning'}
                  />
                  <div>
                    <span>{insp.product.name}</span>
                    <span className="violation-list__reason">{v.reason}</span>
                  </div>
                  <Link to={`/inspection/${insp.id}`}>Review →</Link>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
