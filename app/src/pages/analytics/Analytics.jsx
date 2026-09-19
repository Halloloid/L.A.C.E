import { ChartCard } from '../../components/ui/Card';
import { Metric } from '../../components/ui/Basics';
import { LineChart, DonutChart } from '../../components/charts/Charts';
import { complianceTrend, complianceByCategory, analyticsData, CATEGORY_COLORS } from '../../data/mockData';

export default function Analytics() {
  const categoryData = complianceByCategory.map((c) => ({ ...c, color: CATEGORY_COLORS[c.category] }));

  return (
    <div className="page analytics-page">
      <div className="page__head">
        <h1>Analytics</h1>
        <p className="page__subtitle">Compliance patterns across every inspection on record.</p>
      </div>

      <div className="dashboard__metrics">
        <Metric label="Compliance Rate" value={`${analyticsData.complianceRate}%`} />
        <Metric label="Total Inspections" value={analyticsData.totalInspections} />
        <Metric label="Violations" value={analyticsData.violations} />
        <Metric label="Most Common Issue" value={analyticsData.mostCommonViolation} />
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

        <ChartCard title="Most Common Violations" className="analytics-page__violations">
          <ul className="analytics-page__bar-list">
            {analyticsData.commonViolations.map((v) => (
              <li key={v.label}>
                <span>{v.label}</span>
                <span className="analytics-page__bar-track">
                  <span
                    className="analytics-page__bar-fill"
                    style={{ width: `${(v.count / analyticsData.commonViolations[0].count) * 100}%` }}
                  />
                </span>
                <span className="mono-label">{v.count}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
