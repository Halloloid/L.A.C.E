import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Ruler, FileText, ArrowRight } from 'lucide-react';
import { EvidenceViewer } from '../../components/evidence/EvidenceViewer';
import { RuleAccordion } from '../../components/rules/RuleAccordion';
import { MeasurementTool } from '../../components/measurement/MeasurementTool';
import { StatusBadge } from '../../components/ui/Basics';
import { getInspection, RULE_META, CATEGORY_COLORS } from '../../data/mockData';

const TABS = [
  { id: 'evidence', label: 'Evidence & Rules' },
  { id: 'measurement', label: 'Measurement' },
];

export default function Inspection() {
  const { id } = useParams();
  const inspection = getInspection(id);
  const [tab, setTab] = useState('evidence');
  const [activeRuleId, setActiveRuleId] = useState(null);

  const regionStatuses = useMemo(() => {
    if (!inspection) return {};
    const map = {};
    Object.entries(inspection.rules).forEach(([ruleId, rule]) => {
      const meta = RULE_META[ruleId];
      if (meta?.regionId) map[meta.regionId] = rule.status;
    });
    return map;
  }, [inspection]);

  if (!inspection) return <Navigate to="/dashboard" replace />;

  const { declarations, product, category, rules } = inspection;
  const bandColor = CATEGORY_COLORS[category];

  const activeMeta = activeRuleId ? RULE_META[activeRuleId] : null;
  const activeRule = activeRuleId ? rules[activeRuleId] : null;
  const callout =
    activeMeta?.regionId && activeRule
      ? { regionId: activeMeta.regionId, text: activeMeta.label, status: activeRule.status }
      : null;

  return (
    <div className="page inspection-page">
      <div className="page__head">
        <div>
          <h1>Inspection Workspace</h1>
          <p className="page__subtitle">
            {product.name} · {product.brand} · {inspection.id}
          </p>
        </div>
        <StatusBadge status={inspection.status} size="lg" />
      </div>

      <div className="inspection-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`inspection-tabs__tab ${tab === t.id ? 'is-active' : ''}`.trim()}
            onClick={() => setTab(t.id)}
          >
            {t.id === 'measurement' && <Ruler size={14} aria-hidden="true" />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'evidence' ? (
        <div className="inspection-page__grid">
          <EvidenceViewer
            declarations={declarations}
            bandColor={bandColor}
            regionStatuses={regionStatuses}
            highlightRegionId={activeMeta?.regionId ?? null}
            callout={callout}
          />
          <RuleAccordion rules={rules} onViewEvidence={setActiveRuleId} />
        </div>
      ) : (
        <div className="inspection-page__measurement">
          <p className="inspection-page__measurement-intro">
            Re-check the calibrated scale for this inspection against the label.
          </p>
          <MeasurementTool declarations={declarations} bandColor={bandColor} />
        </div>
      )}

      <div className="inspection-page__footer">
        <Link to={`/verdict/${inspection.id}`} className="btn btn--secondary btn--md">
          View Verdict
        </Link>
        <Link to={`/report/${inspection.id}`} className="btn btn--primary btn--md">
          <FileText size={15} aria-hidden="true" /> Open Report <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
