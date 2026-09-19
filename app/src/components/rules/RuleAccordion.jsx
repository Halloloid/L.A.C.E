import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { StatusBadge } from '../ui/Basics';
import { RULE_META, RULE_ORDER } from '../../data/mockData';

export function RuleAccordion({ rules, onViewEvidence, readOnly = false }) {
  const [openId, setOpenId] = useState(null);

  return (
    <ul className="rule-accordion">
      {RULE_ORDER.map((ruleId) => {
        const rule = rules[ruleId];
        if (!rule) return null;
        const meta = RULE_META[ruleId];
        const isOpen = readOnly || openId === ruleId;
        return (
          <li key={ruleId} className={`rule-row ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="rule-row__head"
              onClick={() => !readOnly && setOpenId(isOpen ? null : ruleId)}
              aria-expanded={isOpen}
              disabled={readOnly}
            >
              <span className="rule-row__label">{meta.label}</span>
              <span className="rule-row__right">
                <StatusBadge status={rule.status} />
                {!readOnly && <ChevronDown size={16} className="rule-row__chevron" aria-hidden="true" />}
              </span>
            </button>
            {isOpen && (
              <div className="rule-row__body">
                <div className="rule-row__field">
                  <span className="mono-label">Extracted</span>
                  <p>{rule.extracted}</p>
                </div>
                <div className="rule-row__field">
                  <span className="mono-label">Requirement</span>
                  <p>{meta.requirement}</p>
                </div>
                {rule.note && (
                  <div className="rule-row__field">
                    <span className="mono-label">Note</span>
                    <p>{rule.note}</p>
                  </div>
                )}
                {meta.regionId && onViewEvidence && (
                  <button type="button" className="rule-row__evidence-link" onClick={() => onViewEvidence(ruleId)}>
                    View on image →
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
