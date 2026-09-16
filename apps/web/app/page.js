'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const initialForm = {
  kbli: '03111',
  ruangLingkup: 'RL-A-001',
  skalaUsaha: 'Besar',
  parameterCode: 'A00101',
  elapsedDays: 0,
  verifierResponded: false,
  eligibleForFiktifPositif: false,
};

function Pill({ children, tone = 'blue' }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export default function Home() {
  const [decisions, setDecisions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/business-rules/decisions')
      .then(setDecisions)
      .catch((err) => setError(err.message));
  }, []);

  const permit = result?.b1?.permitProfile;
  const fiktif = result?.b1?.fiktifPositif;
  const contract = result?.b2Contract;

  const traceRows = useMemo(() => permit?.trace || [], [permit]);

  async function simulate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/business-rules/simulate-permit', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          elapsedDays: Number(form.elapsedDays),
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div>
          <div className="eyebrow">OSS v2 · ZONE B ORCHESTRATOR</div>
          <h1>Business Rules <span>PoC</span></h1>
          <p>
            Demonstrasi B1 sebagai pemilik decision logic. B2 Workflow Engine hanya
            menerima keputusan yang sudah terstruktur untuk routing, SLA, dan orchestration.
          </p>
        </div>
        <div className="domain-card">
          <div className="domain-code">B1</div>
          <div>
            <strong>Business Rules</strong>
            <small>BRDF · DMN · Decision Service</small>
          </div>
        </div>
      </header>

      <section className="architecture panel">
        <div className="section-title">
          <div><span>01</span><h2>Target interaction</h2></div>
          <Pill tone="green">Separation of concerns</Pill>
        </div>
        <div className="flow">
          <div className="flow-box muted"><b>Regulation</b><small>validated source</small></div>
          <div className="arrow">→</div>
          <div className="flow-box orange"><b>BRDF</b><small>canonical rule definition</small></div>
          <div className="arrow">→</div>
          <div className="flow-box purple"><b>B1 Decision Service</b><small>DMN / rule evaluation</small></div>
          <div className="arrow">→</div>
          <div className="flow-box blue"><b>B2 Workflow Engine</b><small>BPMN / routing / SLA</small></div>
          <div className="arrow">→</div>
          <div className="flow-box green"><b>Zone C</b><small>Regulator domains</small></div>
        </div>
        <div className="principle">
          <b>B1 owns the decision logic.</b> B2 owns process orchestration. BPMN tidak perlu
          memuat ratusan gateway yang mengulang logika KBLI/regulasi.
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <div className="section-title"><div><span>02</span><h2>Decision catalog</h2></div></div>
          <div className="decision-list">
            {decisions.map((decision) => (
              <article key={decision.id} className="decision-card">
                <div className="decision-head">
                  <div><h3>{decision.name}</h3><code>{decision.id}</code></div>
                  <Pill tone={decision.status === 'ACTIVE' ? 'green' : 'amber'}>{decision.status}</Pill>
                </div>
                <p>{decision.description}</p>
                <div className="meta">
                  <span>v{decision.version}</span><span>{decision.ruleCount} rules</span><span>{decision.hitPolicy}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <form className="panel" onSubmit={simulate}>
          <div className="section-title"><div><span>03</span><h2>Permit simulator</h2></div><Pill>Decision input</Pill></div>
          <div className="form-grid">
            <label>KBLI<input value={form.kbli} onChange={(e) => setForm({ ...form, kbli: e.target.value })} /></label>
            <label>Ruang Lingkup<input value={form.ruangLingkup} onChange={(e) => setForm({ ...form, ruangLingkup: e.target.value })} /></label>
            <label>Skala Usaha<input value={form.skalaUsaha} onChange={(e) => setForm({ ...form, skalaUsaha: e.target.value })} /></label>
            <label>Parameter<input value={form.parameterCode} onChange={(e) => setForm({ ...form, parameterCode: e.target.value })} /></label>
            <label>Elapsed Days<input type="number" min="0" value={form.elapsedDays} onChange={(e) => setForm({ ...form, elapsedDays: e.target.value })} /></label>
          </div>
          <div className="checks">
            <label><input type="checkbox" checked={form.verifierResponded} onChange={(e) => setForm({ ...form, verifierResponded: e.target.checked })} /> Verifier sudah merespons</label>
            <label><input type="checkbox" checked={form.eligibleForFiktifPositif} onChange={(e) => setForm({ ...form, eligibleForFiktifPositif: e.target.checked })} /> Eligible Fiktif Positif (validated rule)</label>
          </div>
          <button disabled={loading}>{loading ? 'Evaluating…' : 'Evaluate Business Rules'}</button>
          {error && <div className="error">{error}</div>}
        </form>
      </section>

      {result && (
        <>
          <section className="panel result-panel">
            <div className="section-title"><div><span>04</span><h2>B1 decision result</h2></div><Pill tone={permit?.matched ? 'green' : 'amber'}>{permit?.matched ? 'MATCHED' : 'NO MATCH'}</Pill></div>
            <div className="result-grid">
              <div><small>Matched Rule</small><strong>{permit?.matchedRuleId || '—'}</strong></div>
              <div><small>Risk Level</small><strong>{permit?.output?.riskLevel || '—'}</strong></div>
              <div><small>Authority</small><strong>{permit?.output?.authority || '—'}</strong></div>
              <div><small>SLA</small><strong>{permit?.output?.slaDays ? `${permit.output.slaDays} hari` : '—'}</strong></div>
              <div><small>Route Target</small><strong>{permit?.output?.routeTarget || '—'}</strong></div>
              <div><small>Permit Type</small><strong>{Array.isArray(permit?.output?.permitType) ? permit.output.permitType.join(' + ') : '—'}</strong></div>
            </div>
          </section>

          <section className="grid two">
            <div className="panel">
              <div className="section-title"><div><span>05</span><h2>B2 contract</h2></div><Pill tone="blue">Output only</Pill></div>
              <p className="subtle">Workflow Engine tidak perlu menghitung ulang regulatory logic. B2 cukup menerima kontrak keputusan berikut.</p>
              <pre>{JSON.stringify(contract, null, 2)}</pre>
            </div>
            <div className="panel">
              <div className="section-title"><div><span>06</span><h2>Fiktif Positif guard</h2></div><Pill tone={fiktif?.output?.autoApprovalEligible ? 'amber' : 'green'}>{fiktif?.output?.autoApprovalEligible ? 'ELIGIBLE' : 'STANDARD FLOW'}</Pill></div>
              <pre>{JSON.stringify(fiktif?.output, null, 2)}</pre>
              <p className="warning">PoC guard: eligibility harus berasal dari rule/regulasi yang sudah divalidasi; sistem tidak menganggap semua proses otomatis eligible.</p>
            </div>
          </section>

          <section className="panel">
            <div className="section-title"><div><span>07</span><h2>Explainable rule trace</h2></div><Pill>{traceRows.length} attempted rule</Pill></div>
            {traceRows.map((rule) => (
              <div className="trace" key={rule.ruleId}>
                <div className="trace-head"><strong>{rule.ruleId}</strong><Pill tone={rule.matched ? 'green' : 'red'}>{rule.matched ? 'MATCH' : 'NO MATCH'}</Pill></div>
                <p>{rule.description}</p>
                <table><thead><tr><th>Field</th><th>Operator</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
                  <tbody>{rule.conditions.map((c, i) => <tr key={`${c.field}-${i}`}><td>{c.field}</td><td><code>{c.operator}</code></td><td>{JSON.stringify(c.value)}</td><td>{JSON.stringify(c.actual)}</td><td>{c.matched ? '✓' : '✕'}</td></tr>)}</tbody>
                </table>
              </div>
            ))}
          </section>
        </>
      )}

      <footer>
        <b>OSS v2 Business Rules PoC</b><span>B1 Business Rules · Zone B Orchestrator</span>
      </footer>
    </main>
  );
}
