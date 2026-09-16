'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import styles from './page.module.css';

const STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'RETIRED'];
const NEXT = {
  DRAFT: 'REVIEW',
  REVIEW: 'APPROVED',
  APPROVED: 'PUBLISHED',
  PUBLISHED: 'ACTIVE',
  ACTIVE: 'RETIRED',
};
const ACTION_LABEL = {
  REVIEW: 'Submit for Review',
  APPROVED: 'Approve',
  PUBLISHED: 'Publish',
  ACTIVE: 'Activate',
  RETIRED: 'Retire',
};
const OPERATORS = ['eq', 'neq', 'in', 'gte', 'lte', 'exists', 'includes'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function serializeValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

function statusClass(status) {
  return `${styles.status} ${styles[`status${status}`] || ''}`;
}

export default function ManageRulesPage() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [actor, setActor] = useState('pejabat-regulator-demo');
  const [comment, setComment] = useState('');
  const [validation, setValidation] = useState(null);
  const [previewInput, setPreviewInput] = useState('{\n  "kbli": "03111",\n  "ruangLingkup": "RL-A-001",\n  "skalaUsaha": "Besar",\n  "parameterCode": "A00101"\n}');
  const [previewResult, setPreviewResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newDecision, setNewDecision] = useState({ id: '', name: '', description: '' });

  async function refreshList(preferredId) {
    const data = await api('/business-rules/managed');
    setList(data);
    const target = preferredId || selectedId || data[0]?.id;
    if (target) {
      setSelectedId(target);
      await loadRecord(target);
    }
  }

  async function loadRecord(id) {
    const data = await api(`/business-rules/managed/${id}`);
    setRecord(data);
    setDraft(clone(data.working));
    setValidation(null);
    setPreviewResult(null);
    setMessage('');
    setError('');
  }

  useEffect(() => {
    refreshList().catch((err) => setError(err.message));
  }, []);

  const editable = draft?.status === 'DRAFT';
  const nextStatus = draft ? NEXT[draft.status] : null;
  const history = useMemo(() => [...(record?.history || [])].reverse(), [record]);
  const lifecycle = useMemo(() => [...(record?.lifecycle || [])].reverse(), [record]);

  function setMeta(key, value) {
    if (!editable) return;
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setFields(key, text) {
    const fields = text.split(',').map((v) => v.trim()).filter(Boolean);
    setMeta(key, fields);
  }

  function updateRule(index, patch) {
    if (!editable) return;
    setDraft((current) => {
      const rules = clone(current.rules);
      rules[index] = { ...rules[index], ...patch };
      return { ...current, rules };
    });
  }

  function updateCondition(ruleIndex, field, key, value) {
    if (!editable) return;
    setDraft((current) => {
      const rules = clone(current.rules);
      const rule = rules[ruleIndex];
      let condition = rule.when.find((item) => item.field === field);
      if (!condition) {
        condition = { field, operator: 'eq', value: '' };
        rule.when.push(condition);
      }
      condition[key] = key === 'value' ? parseValue(value) : value;
      return { ...current, rules };
    });
  }

  function updateOutput(ruleIndex, field, value) {
    if (!editable) return;
    setDraft((current) => {
      const rules = clone(current.rules);
      rules[ruleIndex].then[field] = parseValue(value);
      return { ...current, rules };
    });
  }

  function addRule() {
    const number = (draft.rules?.length || 0) + 1;
    const when = draft.inputFields.map((field) => ({ field, operator: 'eq', value: '' }));
    const then = Object.fromEntries(draft.outputFields.map((field) => [field, '']));
    updateRule(draft.rules.length, {});
    setDraft((current) => ({
      ...current,
      rules: [
        ...current.rules,
        {
          id: `RULE-${String(number).padStart(3, '0')}`,
          description: 'New decision rule',
          priority: number * 10,
          status: 'ACTIVE',
          when,
          then,
          source: 'PoC Business Rule Management UI',
        },
      ],
    }));
  }

  function removeRule(index) {
    if (!editable) return;
    setDraft((current) => ({
      ...current,
      rules: current.rules.filter((_, i) => i !== index),
    }));
  }

  async function run(action) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    return run(async () => {
      const updated = await api(`/business-rules/managed/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify({ definition: draft, actor, comment: comment || 'Updated via Management UI' }),
      });
      setRecord(updated);
      setDraft(clone(updated.working));
      setComment('');
      setMessage('Draft saved and version history updated.');
      await refreshList(selectedId);
    });
  }

  function validateDecision() {
    return run(async () => {
      const result = await api(`/business-rules/managed/${selectedId}/validate`, { method: 'POST' });
      setValidation(result);
      setMessage(result.valid ? 'Decision table is valid for review.' : 'Validation found blocking errors.');
    });
  }

  function transition(target) {
    return run(async () => {
      const updated = await api(`/business-rules/managed/${selectedId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ target, actor, comment: comment || `${draft.status} -> ${target}` }),
      });
      setRecord(updated);
      setDraft(clone(updated.working));
      setComment('');
      setMessage(`Lifecycle moved to ${target}.`);
      await refreshList(selectedId);
    });
  }

  function newVersion() {
    return run(async () => {
      const updated = await api(`/business-rules/managed/${selectedId}/new-version`, {
        method: 'POST',
        body: JSON.stringify({ actor, comment: comment || 'New draft version' }),
      });
      setRecord(updated);
      setDraft(clone(updated.working));
      setComment('');
      setMessage('New draft version created; current ACTIVE version remains available to B2.');
      await refreshList(selectedId);
    });
  }

  function preview() {
    return run(async () => {
      let input;
      try { input = JSON.parse(previewInput); } catch { throw new Error('Preview input must be valid JSON'); }
      const result = await api(`/business-rules/managed/${selectedId}/preview`, {
        method: 'POST',
        body: JSON.stringify({ input }),
      });
      setPreviewResult(result);
      setMessage('Draft preview evaluated without changing the ACTIVE runtime version.');
    });
  }

  function createDecision() {
    return run(async () => {
      const created = await api('/business-rules/managed', {
        method: 'POST',
        body: JSON.stringify({
          actor,
          definition: {
            ...newDecision,
            inputFields: ['input'],
            outputFields: ['result'],
            rules: [],
          },
        }),
      });
      setShowCreate(false);
      setNewDecision({ id: '', name: '', description: '' });
      await refreshList(created.id);
      setMessage('New DRAFT decision created.');
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OSS v2 · Zone B · B1 Business Rules</div>
          <h1>Business Rule Management</h1>
          <p>Governed rule lifecycle, version history, and visual DMN decision-table editing for regulator-owned business rules.</p>
        </div>
        <div className={styles.topActions}>
          <a href="/">← Simulator</a>
          <button className={styles.primary} onClick={() => setShowCreate(!showCreate)}>+ New Decision</button>
        </div>
      </header>

      <section className={styles.governanceStrip}>
        <label>Actor / Pejabat<input value={actor} onChange={(e) => setActor(e.target.value)} /></label>
        <label>Change note<input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Alasan perubahan / approval note" /></label>
        <div className={styles.runtimeNote}><b>Runtime isolation</b><span>Draft changes do not replace the ACTIVE version until activation.</span></div>
      </section>

      {showCreate && (
        <section className={styles.createPanel}>
          <h2>Create Business Decision</h2>
          <div className={styles.createGrid}>
            <label>Decision ID<input value={newDecision.id} onChange={(e) => setNewDecision({ ...newDecision, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="permit-authority" /></label>
            <label>Name<input value={newDecision.name} onChange={(e) => setNewDecision({ ...newDecision, name: e.target.value })} placeholder="Determine Permit Authority" /></label>
            <label className={styles.wide}>Description<input value={newDecision.description} onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })} /></label>
          </div>
          <button className={styles.primary} disabled={busy || !newDecision.id || !newDecision.name} onClick={createDecision}>Create Draft</button>
        </section>
      )}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}><span>Decision Registry</span><b>{list.length}</b></div>
          {list.map((item) => (
            <button key={item.id} className={`${styles.decisionItem} ${selectedId === item.id ? styles.selected : ''}`} onClick={() => { setSelectedId(item.id); loadRecord(item.id); }}>
              <div><strong>{item.name}</strong><code>{item.id}</code></div>
              <span className={statusClass(item.workingStatus)}>{item.workingStatus}</span>
              <small>Working {item.workingVersion}</small>
              <small>Runtime {item.activeVersion || 'not active'}</small>
            </button>
          ))}
        </aside>

        <section className={styles.content}>
          {!draft ? <div className={styles.empty}>Select a decision to manage.</div> : (
            <>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div><span className={styles.kicker}>LIFECYCLE</span><h2>Governed Rule Lifecycle</h2></div>
                  <div className={styles.versionBox}><small>Working</small><b>{draft.version}</b><span>Active: {record?.active?.version || '—'}</span></div>
                </div>
                <div className={styles.lifecycle}>
                  {STATUSES.map((status, index) => {
                    const currentIndex = STATUSES.indexOf(draft.status);
                    const state = index < currentIndex ? styles.done : index === currentIndex ? styles.current : '';
                    return <div key={status} className={`${styles.lifeStep} ${state}`}><span>{index + 1}</span><b>{status === 'APPROVED' ? 'APPROVE' : status}</b></div>;
                  })}
                </div>
                <div className={styles.lifecycleActions}>
                  {editable && <><button className={styles.primary} disabled={busy} onClick={saveDraft}>Save Draft</button><button disabled={busy} onClick={validateDecision}>Validate</button></>}
                  {nextStatus && <button className={nextStatus === 'RETIRED' ? styles.danger : styles.accent} disabled={busy} onClick={() => transition(nextStatus)}>{ACTION_LABEL[nextStatus]}</button>}
                  {(draft.status === 'ACTIVE' || draft.status === 'RETIRED') && <button disabled={busy} onClick={newVersion}>Create New Draft Version</button>}
                </div>
                {validation && <div className={`${styles.validation} ${validation.valid ? styles.valid : styles.invalid}`}><b>{validation.valid ? '✓ Valid' : '✕ Validation errors'}</b><span>{validation.errors?.join(' · ') || 'No blocking errors'}</span>{validation.warnings?.length > 0 && <small>Warnings: {validation.warnings.join(' · ')}</small>}</div>}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}><div><span className={styles.kicker}>DECISION METADATA</span><h2>{draft.name}</h2></div><span className={statusClass(draft.status)}>{draft.status}</span></div>
                <div className={styles.metaGrid}>
                  <label>Name<input disabled={!editable} value={draft.name} onChange={(e) => setMeta('name', e.target.value)} /></label>
                  <label>Hit Policy<input disabled value={draft.hitPolicy} /></label>
                  <label className={styles.wide}>Description<textarea disabled={!editable} value={draft.description} onChange={(e) => setMeta('description', e.target.value)} /></label>
                  <label>Input fields<input disabled={!editable} value={draft.inputFields.join(', ')} onChange={(e) => setFields('inputFields', e.target.value)} /></label>
                  <label>Output fields<input disabled={!editable} value={draft.outputFields.join(', ')} onChange={(e) => setFields('outputFields', e.target.value)} /></label>
                </div>
              </section>

              <section className={`${styles.card} ${styles.editorCard}`}>
                <div className={styles.cardHead}>
                  <div><span className={styles.kicker}>DMN DECISION TABLE</span><h2>Visual Rule Editor</h2><p>Blue columns are inputs/conditions; green columns are outputs. Hit policy: FIRST.</p></div>
                  {editable && <button className={styles.primary} onClick={addRule}>+ Add Rule</button>}
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.dmnTable}>
                    <thead><tr><th className={styles.ruleCol}># / Rule</th><th className={styles.priorityCol}>Priority</th>{draft.inputFields.map((field) => <th key={`in-${field}`} className={styles.inputHead}>INPUT · {field}</th>)}{draft.outputFields.map((field) => <th key={`out-${field}`} className={styles.outputHead}>OUTPUT · {field}</th>)}<th>Description</th>{editable && <th>Action</th>}</tr></thead>
                    <tbody>
                      {draft.rules.map((rule, ruleIndex) => (
                        <tr key={`${rule.id}-${ruleIndex}`}>
                          <td className={styles.ruleCell}><span>{ruleIndex + 1}</span><input disabled={!editable} value={rule.id} onChange={(e) => updateRule(ruleIndex, { id: e.target.value })} /><select disabled={!editable} value={rule.status} onChange={(e) => updateRule(ruleIndex, { status: e.target.value })}><option>ACTIVE</option><option>DRAFT</option><option>RETIRED</option></select></td>
                          <td><input className={styles.smallInput} type="number" disabled={!editable} value={rule.priority} onChange={(e) => updateRule(ruleIndex, { priority: Number(e.target.value) })} /></td>
                          {draft.inputFields.map((field) => {
                            const condition = rule.when.find((item) => item.field === field) || { operator: 'eq', value: '' };
                            return <td key={`${rule.id}-${field}`} className={styles.inputCell}><select disabled={!editable} value={condition.operator} onChange={(e) => updateCondition(ruleIndex, field, 'operator', e.target.value)}>{OPERATORS.map((op) => <option key={op}>{op}</option>)}</select><input disabled={!editable} value={serializeValue(condition.value)} onChange={(e) => updateCondition(ruleIndex, field, 'value', e.target.value)} placeholder="value / $field" /></td>;
                          })}
                          {draft.outputFields.map((field) => <td key={`${rule.id}-out-${field}`} className={styles.outputCell}><input disabled={!editable} value={serializeValue(rule.then?.[field])} onChange={(e) => updateOutput(ruleIndex, field, e.target.value)} placeholder="output" /></td>)}
                          <td><textarea disabled={!editable} value={rule.description} onChange={(e) => updateRule(ruleIndex, { description: e.target.value })} /></td>
                          {editable && <td><button className={styles.iconDanger} onClick={() => removeRule(ruleIndex)}>Remove</button></td>}
                        </tr>
                      ))}
                      {!draft.rules.length && <tr><td colSpan={4 + draft.inputFields.length + draft.outputFields.length} className={styles.emptyRow}>No rules yet. Add the first DMN row.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className={styles.legend}><span className={styles.blueDot}></span>Input clauses <span className={styles.greenDot}></span>Output clauses <code>FIRST</code> first matching rule wins</div>
              </section>

              <section className={styles.split}>
                <div className={styles.card}>
                  <div className={styles.cardHead}><div><span className={styles.kicker}>SAFE TEST</span><h2>Draft Preview</h2></div><button disabled={busy} onClick={preview}>Evaluate Draft</button></div>
                  <textarea className={styles.jsonInput} value={previewInput} onChange={(e) => setPreviewInput(e.target.value)} />
                  {previewResult && <pre className={styles.result}>{JSON.stringify(previewResult, null, 2)}</pre>}
                </div>
                <div className={styles.card}>
                  <div className={styles.cardHead}><div><span className={styles.kicker}>AUDIT</span><h2>Lifecycle Events</h2></div><span>{lifecycle.length} events</span></div>
                  <div className={styles.timeline}>{lifecycle.map((event) => <div className={styles.event} key={event.id}><span></span><div><b>{event.action}</b><small>{event.from ? `${event.from} → ` : ''}{event.to} · {event.version}</small><p>{event.comment || 'No comment'}</p><em>{event.actor} · {new Date(event.createdAt).toLocaleString('id-ID')}</em></div></div>)}</div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}><div><span className={styles.kicker}>VERSION CONTROL</span><h2>Version History</h2></div><span>{history.length} snapshots</span></div>
                <div className={styles.tableScroll}><table className={styles.historyTable}><thead><tr><th>Version</th><th>Status</th><th>Revision</th><th>Changed by</th><th>Timestamp</th><th>Comment</th></tr></thead><tbody>{history.map((item, i) => <tr key={`${item.version}-${item.revision}-${i}`}><td><code>{item.version}</code></td><td><span className={statusClass(item.status)}>{item.status}</span></td><td>r{item.revision}</td><td>{item.changedBy}</td><td>{new Date(item.changedAt).toLocaleString('id-ID')}</td><td>{item.comment || '—'}</td></tr>)}</tbody></table></div>
              </section>
            </>
          )}
        </section>
      </div>

      {(message || error) && <div className={`${styles.toast} ${error ? styles.toastError : ''}`}>{error || message}</div>}
    </main>
  );
}
