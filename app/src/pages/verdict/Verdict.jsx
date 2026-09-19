import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, FileText, Search, ShieldAlert } from 'lucide-react';
import { ComplianceRing } from '../../components/ui/ComplianceRing';
import { StatusBadge } from '../../components/ui/Basics';
import { getInspection, isCompliant, RULE_META } from '../../data/mockData';
import { isInspector } from '../../lib/auth';

export default function Verdict() {
  const { id } = useParams();
  const inspection = getInspection(id);
  const inspector = isInspector();

  if (!inspection) return <Navigate to="/dashboard" replace />;

  const { summary, rules, product } = inspection;
  const compliant = isCompliant(summary);
  const issues = Object.entries(rules).filter(([, r]) => r.status !== 'pass');

  return (
    <div className="page verdict-page">
      <div className="page__head">
        <h1>Compliance Verdict</h1>
        <p className="page__subtitle">
          {product.name} · {product.brand}
        </p>
      </div>

      <div className="verdict-card">
        <ComplianceRing
          passed={summary.passed}
          warnings={summary.warnings}
          failed={summary.failed}
          size={188}
        />
        <h2 className={compliant ? 'is-pass' : 'is-fail'}>
          {compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
        </h2>
        <p className="verdict-card__counts">
          {summary.passed} Passed · {summary.warnings} Warnings · {summary.failed} Failed
        </p>

        {issues.length > 0 && (
          <div className="verdict-card__issues">
            <span className="mono-label">Key Issues</span>
            <ul>
              {issues.map(([ruleId, r]) => (
                <li key={ruleId}>
                  <StatusBadge status={r.status} size="sm" />
                  <span>{RULE_META[ruleId].label}</span>
                  {r.note && <span className="verdict-card__note">{r.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="verdict-card__action">
          <span className="mono-label">Recommended Action</span>
          <p>
            {inspector
              ? summary.failed > 0
                ? 'Flag for corrective notice — one or more mandatory declarations failed verification.'
                : summary.warnings > 0
                ? 'Log for review — declarations pass but should be monitored on the next batch.'
                : 'No action required — all mandatory declarations verified.'
              : summary.failed > 0
              ? 'This product is missing required label information. Consider reporting it to the department.'
              : summary.warnings > 0
              ? 'Mostly compliant, with a minor issue worth keeping an eye on.'
              : 'This label meets all mandatory declaration requirements.'}
          </p>
        </div>

        <div className="verdict-card__buttons">
          {inspector ? (
            <Link to={`/inspection/${inspection.id}`} className="btn btn--secondary btn--md">
              <Search size={15} aria-hidden="true" /> Inspect Evidence
            </Link>
          ) : (
            !compliant && (
              <Link to="/report-issue" className="btn btn--secondary btn--md">
                <ShieldAlert size={15} aria-hidden="true" /> Report This Product
              </Link>
            )
          )}
          <Link to={`/report/${inspection.id}`} className="btn btn--primary btn--md">
            <FileText size={15} aria-hidden="true" /> Open Report <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
