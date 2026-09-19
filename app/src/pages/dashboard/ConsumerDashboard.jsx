import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, LogOut, ArrowRight, ShieldAlert, Lightbulb } from 'lucide-react';
import { ChartCard } from '../../components/ui/Card';
import { Metric, StatusBadge } from '../../components/ui/Basics';
import { ProductThumbnail } from '../../components/ui/ProductThumbnail';
import { signOut, getRole } from '../../lib/auth';
import { consumerMetrics, myScans, consumerTips, getCurrentUser } from '../../data/mockData';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser(getRole());

  return (
    <div className="page dashboard">
      <div className="page__head">
        <div>
          <h1>
            {getGreeting()}
            <span className="show-desktop">, {user.name}</span>.
          </h1>
          <p className="page__subtitle">Here&rsquo;s what you&rsquo;ve checked so far.</p>
        </div>
        <div className="page__head-actions">
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

      <Link to="/scan" className="consumer-cta">
        <div className="consumer-cta__icon">
          <ScanLine size={22} aria-hidden="true" />
        </div>
        <div className="consumer-cta__body">
          <strong>Scan a product label</strong>
          <span>Point your camera at the pack to check MRP, quantity, dates and more.</span>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>

      <div className="dashboard__metrics">
        {consumerMetrics.map((m) => (
          <Metric key={m.id} label={m.label} value={m.value} deltaPct={m.deltaPct} direction={m.direction} />
        ))}
      </div>

      <div className="dashboard__grid">
        <ChartCard
          title="Your Recent Scans"
          action={
            <Link to="/history" className="chart-card__link">
              View all →
            </Link>
          }
          className="dashboard__recent"
        >
          <ul className="recent-list">
            {myScans.map((i) => (
              <li key={i.id}>
                <ProductThumbnail category={i.category} size={40} />
                <div className="recent-list__body">
                  <span>{i.product.name}</span>
                  <span className="recent-list__meta">Scanned {i.date}</span>
                </div>
                <StatusBadge status={i.status} size="sm" />
                <Link to={`/verdict/${i.id}`} aria-label={`View ${i.product.name} result`}>
                  →
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Know Before You Buy" className="dashboard__violations">
          <ul className="tip-list">
            {consumerTips.map((tip) => (
              <li key={tip}>
                <Lightbulb size={16} aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <Link to="/report-issue" className="btn btn--secondary btn--md consumer-cta__report">
            <ShieldAlert size={15} aria-hidden="true" /> Report a mislabeled product
          </Link>
        </ChartCard>
      </div>
    </div>
  );
}
