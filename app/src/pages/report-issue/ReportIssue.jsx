import { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '../../data/mockData';

export default function ReportIssue() {
  const [submitted, setSubmitted] = useState(false);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // Demo only — the real Rust/Axum backend will take this as a ticket
    // and route it to the relevant Legal Metrology field unit.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page report-issue-page">
        <div className="card report-issue__done">
          <CheckCircle2 size={36} aria-hidden="true" />
          <h1>Thanks — we&rsquo;ve logged it.</h1>
          <p>
            Your report on <strong>{productName || 'this product'}</strong> has been filed with the Legal
            Metrology field unit for review. You&rsquo;ll be notified if it needs anything further from you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page report-issue-page">
      <div className="page__head">
        <div>
          <h1>Report an Issue</h1>
          <p className="page__subtitle">Spotted a mislabeled or non-compliant product? Let the inspection team know.</p>
        </div>
      </div>

      <form className="card report-issue__form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="mono-label">Product name</span>
          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Coconut Body Wash, 200 ml"
          />
        </label>

        <label className="field">
          <span className="mono-label">Category</span>
          <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="mono-label">What&rsquo;s wrong?</span>
          <textarea
            required
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Missing MRP, illegible consumer care number, wrong net quantity…"
          />
        </label>

        <button type="submit" className="btn btn--primary btn--lg">
          <ShieldAlert size={16} aria-hidden="true" /> Submit report
        </button>
      </form>
    </div>
  );
}
