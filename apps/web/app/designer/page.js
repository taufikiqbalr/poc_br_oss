'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import styles from './page.module.css';

const NODE_W = 190;
const NODE_H = 74;

const PALETTE = [
  { type: 'REGULATION', label: 'Regulation', hint: 'PP / Permen / Perda', icon: '§' },
  { type: 'CLAUSE', label: 'Clause / Pasal', hint: 'Pasal / Lampiran', icon: '¶' },
  { type: 'INPUT', label: 'Input / Fact', hint: 'KBLI, skala, parameter', icon: 'I' },
  { type: 'CONDITION', label: 'Condition', hint: 'IF / FEEL expression', icon: '?' },
  { type: 'DECISION', label: 'Decision', hint: 'DMN decision', icon: '◇' },
  { type: 'OUTPUT', label: 'Output', hint: 'Risk / permit type', icon: 'O' },
  { type: 'AUTHORITY', label: 'Authority', hint: 'K/L/D / Gubernur', icon: 'A' },
  { type: 'SLA', label: 'SLA / Timer', hint: 'Service time', icon: 'T' },
];

const SAMPLE_NODES = [
  { id: 'n1', type: 'REGULATION', label: 'PP No. 28 Tahun 2025', x: 40, y: 55, data: { source: 'PP 28/2025' } },
  { id: 'n2', type: 'CLAUSE', label: 'Lampiran I – Perizinan Berusaha', x: 270, y: 55, data: { source: 'Lampiran I' } },
  { id: 'n3', type: 'INPUT', label: 'KBLI = 03111', x: 500, y: 20, data: { field: 'kbli', value: '03111' } },
  { id: 'n4', type: 'INPUT', label: 'Ruang Lingkup = RL-A-001', x: 500, y: 115, data: { field: 'ruangLingkup', value: 'RL-A-001' } },
  { id: 'n5', type: 'INPUT', label: 'Skala Usaha = Besar', x: 500, y: 210, data: { field: 'skalaUsaha', value: 'Besar' } },
  { id: 'n6', type: 'DECISION', label: 'Determine Permit Profile', x: 750, y: 115, data: { decisionId: 'permit-profile-visual' } },
  { id: 'n7', type: 'OUTPUT', label: 'Risk Level = TINGGI', x: 1010, y: 15, data: { field: 'riskLevel', value: 'TINGGI' } },
  { id: 'n8', type: 'AUTHORITY', label: 'Authority = GUBERNUR', x: 1010, y: 110, data: { field: 'authority', value: 'GUBERNUR' } },
  { id: 'n9', type: 'SLA', label: 'SLA = 7 hari', x: 1010, y: 205, data: { field: 'slaDays', value: 7 } },
];

const SAMPLE_EDGES = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
  { id: 'e3', source: 'n2', target: 'n4' },
  { id: 'e4', source: 'n2', target: 'n5' },
  { id: 'e5', source: 'n3', target: 'n6' },
  { id: 'e6', source: 'n4', target: 'n6' },
  { id: 'e7', source: 'n5', target: 'n6' },
  { id: 'e8', source: 'n6', target: 'n7' },
  { id: 'e9', source: 'n6', target: 'n8' },
  { id: 'e10', source: 'n6', target: 'n9' },
];

function nodeDefaults(type) {
  switch (type) {
    case 'REGULATION': return { source: '' };
    case 'CLAUSE': return { source: '' };
    case 'INPUT': return { field: 'input', value: '' };
    case 'CONDITION': return { field: 'input', operator: 'eq', value: '' };
    case 'DECISION': return { decisionId: 'new-decision' };
    case 'OUTPUT': return { field: 'result', value: '' };
    case 'AUTHORITY': return { field: 'authority', value: '' };
    case 'SLA': return { field: 'slaDays', value: 0 };
    default: return {};
  }
}

function parseValue(raw) {
  const text = String(raw ?? '').trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

export default function RegulationRuleDesigner() {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState(SAMPLE_NODES);
  const [edges, setEdges] = useState(SAMPLE_EDGES);
  const [selectedId, setSelectedId] = useState('n6');
  const [pendingSource, setPendingSource] = useState('');
  const [actor, setActor] = useState('pejabat-regulator-demo');
  const [decisionId, setDecisionId] = useState('permit-profile-visual');
  const [decisionName, setDecisionName] = useState('Permit Profile from Regulation');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('oss-br-regulation-designer') || 'null');
      if (saved?.nodes?.length) {
        setNodes(saved.nodes);
        setEdges(saved.edges || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('oss-br-regulation-designer', JSON.stringify({ nodes, edges })); } catch {}
  }, [nodes, edges]);

  const selected = nodes.find((node) => node.id === selectedId);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes]);

  function dragPalette(event, item) {
    event.dataTransfer.setData('application/x-oss-node-type', item.type);
    event.dataTransfer.setData('text/plain', item.label);
    event.dataTransfer.effectAllowed = 'copy';
  }

  function dragNode(event, nodeId) {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-oss-node-id', nodeId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function dropOnCanvas(event) {
    event.preventDefault();
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, event.clientX - bounds.left - NODE_W / 2);
    const y = Math.max(8, event.clientY - bounds.top - NODE_H / 2);
    const existingId = event.dataTransfer.getData('application/x-oss-node-id');
    const type = event.dataTransfer.getData('application/x-oss-node-type');

    if (existingId) {
      setNodes((current) => current.map((node) => node.id === existingId ? { ...node, x, y } : node));
      return;
    }
    if (!type) return;
    const palette = PALETTE.find((item) => item.type === type);
    const id = `n-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const node = { id, type, label: palette?.label || type, x, y, data: nodeDefaults(type) };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  }

  function connectFrom(id) {
    setPendingSource(id);
    setMessage('Pilih connector di sisi kiri node tujuan.');
  }

  function connectTo(id) {
    if (!pendingSource || pendingSource === id) return;
    const exists = edges.some((edge) => edge.source === pendingSource && edge.target === id);
    if (!exists) setEdges((current) => [...current, { id: `e-${Date.now()}`, source: pendingSource, target: id }]);
    setPendingSource('');
    setMessage('Connection created.');
  }

  function updateSelected(patch, dataPatch) {
    setNodes((current) => current.map((node) => node.id === selectedId ? {
      ...node,
      ...patch,
      data: { ...node.data, ...(dataPatch || {}) },
    } : node));
  }

  function removeSelected() {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId('');
  }

  function resetSample() {
    setNodes(SAMPLE_NODES);
    setEdges(SAMPLE_EDGES);
    setSelectedId('n6');
    setDecisionId('permit-profile-visual');
    setDecisionName('Permit Profile from Regulation');
    setMessage('Sample PP 28/2025 loaded.');
  }

  function generateDefinition() {
    const inputNodes = nodes.filter((node) => ['INPUT', 'CONDITION'].includes(node.type));
    const outputNodes = nodes.filter((node) => ['OUTPUT', 'AUTHORITY', 'SLA'].includes(node.type));
    const sourceNodes = nodes.filter((node) => ['REGULATION', 'CLAUSE'].includes(node.type));

    const inputFields = [...new Set(inputNodes.map((node) => node.data?.field).filter(Boolean))];
    const outputFields = [...new Set(outputNodes.map((node) => node.data?.field).filter(Boolean))];
    const when = inputNodes.map((node) => ({
      field: node.data?.field || 'input',
      operator: node.type === 'CONDITION' ? (node.data?.operator || 'eq') : 'eq',
      value: parseValue(node.data?.value),
    }));
    const then = Object.fromEntries(outputNodes.map((node) => [node.data?.field || 'result', parseValue(node.data?.value)]));

    return {
      id: decisionId,
      name: decisionName,
      description: `Generated from visual regulation model: ${sourceNodes.map((node) => node.label).join(' → ')}`,
      inputFields: inputFields.length ? inputFields : ['input'],
      outputFields: outputFields.length ? outputFields : ['result'],
      rules: [{
        id: `RULE-${Date.now()}`,
        description: 'Generated from Regulation-to-Rule visual designer',
        priority: 10,
        status: 'ACTIVE',
        when,
        then,
        source: sourceNodes.map((node) => node.data?.source || node.label).filter(Boolean).join(' | '),
        notes: 'PoC-generated draft. Regulator review and lifecycle approval are required before activation.',
      }],
    };
  }

  async function createDraft() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const definition = generateDefinition();
      const created = await api('/business-rules/managed', {
        method: 'POST',
        body: JSON.stringify({ actor, definition }),
      });
      setMessage(`DRAFT '${created.id}' dibuat. Lanjutkan Review → Approve → Publish → Active di Rule Management.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function edgePath(edge) {
    const source = nodeMap[edge.source];
    const target = nodeMap[edge.target];
    if (!source || !target) return '';
    const sx = source.x + NODE_W;
    const sy = source.y + NODE_H / 2;
    const tx = target.x;
    const ty = target.y + NODE_H / 2;
    const curve = Math.max(60, Math.abs(tx - sx) * 0.45);
    return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OSS v2 · B1 BUSINESS RULES</div>
          <h1>Regulation → Business Rule Designer</h1>
          <p>Drag-and-drop visual modeling seperti BPM/BPMN, tetapi fokusnya adalah traceability regulasi → facts → decision → DMN outputs.</p>
        </div>
        <div className={styles.actions}>
          <a href="/manage">Rule Management</a>
          <a href="/">Simulator</a>
          <button onClick={resetSample}>Load PP 28 Sample</button>
        </div>
      </header>

      <section className={styles.metaBar}>
        <label>Decision ID<input value={decisionId} onChange={(e) => setDecisionId(e.target.value.toLowerCase().replace(/\s+/g, '-'))} /></label>
        <label>Decision Name<input value={decisionName} onChange={(e) => setDecisionName(e.target.value)} /></label>
        <label>Actor / Pejabat<input value={actor} onChange={(e) => setActor(e.target.value)} /></label>
        <button className={styles.primary} disabled={busy || !decisionId || !decisionName} onClick={createDraft}>{busy ? 'Generating…' : 'Generate DRAFT Rule'}</button>
      </section>

      {message && <div className={styles.message}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        <aside className={styles.palette}>
          <div className={styles.panelTitle}>Element Palette</div>
          <p>Drag elemen ke canvas.</p>
          {PALETTE.map((item) => (
            <div key={item.type} draggable onDragStart={(event) => dragPalette(event, item)} className={`${styles.paletteItem} ${styles[item.type.toLowerCase()]}`}>
              <span>{item.icon}</span>
              <div><b>{item.label}</b><small>{item.hint}</small></div>
            </div>
          ))}
          <div className={styles.paletteHelp}>
            <b>Connect</b>
            <span>Klik bulatan kanan node sumber, lalu bulatan kiri node tujuan.</span>
          </div>
        </aside>

        <section className={styles.canvasWrap}>
          <div className={styles.canvasToolbar}>
            <div><b>Visual Model Canvas</b><span>{nodes.length} nodes · {edges.length} connections</span></div>
            {pendingSource && <span className={styles.connecting}>Connecting from {nodeMap[pendingSource]?.label}</span>}
          </div>
          <div ref={canvasRef} className={styles.canvas} onDragOver={(e) => e.preventDefault()} onDrop={dropOnCanvas} onClick={() => setSelectedId('')}>
            <svg className={styles.edges}>
              <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker></defs>
              {edges.map((edge) => <path key={edge.id} d={edgePath(edge)} markerEnd="url(#arrow)" />)}
            </svg>
            {nodes.map((node) => (
              <div
                key={node.id}
                draggable
                onDragStart={(event) => dragNode(event, node.id)}
                onClick={(event) => { event.stopPropagation(); setSelectedId(node.id); }}
                className={`${styles.node} ${styles[node.type.toLowerCase()]} ${selectedId === node.id ? styles.selected : ''}`}
                style={{ left: node.x, top: node.y }}
              >
                <button className={`${styles.handle} ${styles.inHandle}`} onClick={(event) => { event.stopPropagation(); connectTo(node.id); }} title="Connect target" />
                <div className={styles.nodeType}>{node.type}</div>
                <strong>{node.label}</strong>
                <small>{node.data?.field ? `${node.data.field}: ${String(node.data.value ?? '')}` : node.data?.source || node.data?.decisionId || 'visual element'}</small>
                <button className={`${styles.handle} ${styles.outHandle}`} onClick={(event) => { event.stopPropagation(); connectFrom(node.id); }} title="Connect source" />
              </div>
            ))}
          </div>
        </section>

        <aside className={styles.inspector}>
          <div className={styles.panelTitle}>Properties</div>
          {!selected ? <p>Select a node to edit.</p> : (
            <>
              <div className={`${styles.typeBadge} ${styles[selected.type.toLowerCase()]}`}>{selected.type}</div>
              <label>Label<input value={selected.label} onChange={(e) => updateSelected({ label: e.target.value })} /></label>
              {['REGULATION', 'CLAUSE'].includes(selected.type) && <label>Source reference<input value={selected.data?.source || ''} onChange={(e) => updateSelected({}, { source: e.target.value })} /></label>}
              {['INPUT', 'CONDITION', 'OUTPUT', 'AUTHORITY', 'SLA'].includes(selected.type) && <label>Field<input value={selected.data?.field || ''} onChange={(e) => updateSelected({}, { field: e.target.value })} /></label>}
              {selected.type === 'CONDITION' && <label>Operator<select value={selected.data?.operator || 'eq'} onChange={(e) => updateSelected({}, { operator: e.target.value })}><option>eq</option><option>neq</option><option>in</option><option>gte</option><option>lte</option><option>exists</option><option>includes</option></select></label>}
              {['INPUT', 'CONDITION', 'OUTPUT', 'AUTHORITY', 'SLA'].includes(selected.type) && <label>Value<input value={String(selected.data?.value ?? '')} onChange={(e) => updateSelected({}, { value: e.target.value })} /></label>}
              {selected.type === 'DECISION' && <label>Decision ID<input value={selected.data?.decisionId || ''} onChange={(e) => updateSelected({}, { decisionId: e.target.value })} /></label>}
              <button className={styles.delete} onClick={removeSelected}>Delete Node</button>
            </>
          )}
          <div className={styles.generatedPreview}>
            <b>Generated DRAFT preview</b>
            <pre>{JSON.stringify(generateDefinition(), null, 2)}</pre>
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <b>Design intent:</b> BPM-like visual authoring untuk traceability dan rule composition. Hasil akhirnya tetap Decision Definition / DMN, bukan BPMN workflow; workflow tetap dimiliki B2.
      </footer>
    </main>
  );
}
