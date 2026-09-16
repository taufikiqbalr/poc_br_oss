'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import styles from './page.module.css';

const CANVAS_W = 2600;
const LANE_H = 270;
const BASE_Y = 92;
const GAP_X = 220;
const NODE_W = 180;
const NODE_H = 74;

const OPERATORS = ['eq', 'neq', 'in', 'gte', 'lte', 'exists', 'includes'];

const PALETTE = [
  { kind: 'RULE', icon: '▭', label: 'Rule', hint: 'Tambah rule baru' },
  { kind: 'CONDITION', icon: 'ƒx', label: 'Condition', hint: 'IF / FEEL condition' },
  { kind: 'OUTPUT', icon: '→', label: 'Output', hint: 'Decision result field' },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeId(value = '') {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function stringifyValue(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseValue(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

function nodeDims(node) {
  if (['start', 'end'].includes(node.kind)) return { w: 62, h: 62 };
  if (node.kind === 'gateway') return { w: 116, h: 92 };
  if (node.kind === 'nomatch') return { w: 150, h: 64 };
  return { w: NODE_W, h: NODE_H };
}

function buildGraph(definition, positions = {}) {
  if (!definition) return { nodes: [], edges: [], lanes: [], height: 760 };
  const rules = definition.rules || [];
  const outputFields = definition.outputFields || [];
  const nodes = [];
  const edges = [];
  const lanes = [];
  const meta = [];

  const put = (node, x, y) => {
    const saved = positions[node.id];
    nodes.push({ ...node, x: saved?.x ?? x, y: saved?.y ?? y });
  };

  if (!rules.length) {
    put({ id: 'start', kind: 'start', label: 'Start' }, 60, 160);
    put({ id: 'no-rules', kind: 'nomatch', label: 'No rules defined' }, 250, 160);
    put({ id: 'end-empty', kind: 'end', label: 'End' }, 480, 160);
    edges.push({ id: 'e-empty-1', source: 'start', target: 'no-rules' });
    edges.push({ id: 'e-empty-2', source: 'no-rules', target: 'end-empty' });
    return { nodes, edges, lanes: [], height: 620 };
  }

  rules.forEach((rule, ruleIndex) => {
    const top = 30 + ruleIndex * LANE_H;
    const y = top + BASE_Y;
    const prefix = `r${ruleIndex}-${safeId(rule.id)}`;
    lanes.push({
      id: prefix,
      ruleIndex,
      top,
      label: rule.id,
      priority: rule.priority,
      status: rule.status,
      description: rule.description,
    });

    let x = ruleIndex === 0 ? 190 : 120;
    const conditionIds = [];
    (rule.when || []).forEach((condition, conditionIndex) => {
      const id = `${prefix}-c${conditionIndex}`;
      conditionIds.push(id);
      put({
        id,
        kind: 'condition',
        ruleIndex,
        conditionIndex,
        label: condition.field || 'condition',
        subtitle: `${condition.operator || 'eq'} ${stringifyValue(condition.value) || '—'}`,
      }, x, y);
      x += GAP_X;
    });

    const gatewayId = `${prefix}-gateway`;
    put({
      id: gatewayId,
      kind: 'gateway',
      ruleIndex,
      label: 'Rule match?',
      subtitle: rule.id,
    }, x, y - 10);
    x += 190;

    const outputIds = [];
    outputFields.forEach((field, outputIndex) => {
      const id = `${prefix}-o${outputIndex}-${safeId(field)}`;
      outputIds.push(id);
      put({
        id,
        kind: 'output',
        ruleIndex,
        outputField: field,
        label: field,
        subtitle: stringifyValue(rule.then?.[field]) || '—',
      }, x, y);
      x += GAP_X;
    });

    const matchEndId = `${prefix}-end`;
    put({ id: matchEndId, kind: 'end', ruleIndex, label: 'Matched' }, x + 12, y + 6);

    const first = conditionIds[0] || gatewayId;
    if (ruleIndex === 0) {
      put({ id: 'start', kind: 'start', label: 'Start' }, 54, y + 6);
      edges.push({ id: 'start-first', source: 'start', target: first });
    }

    conditionIds.forEach((id, index) => {
      const target = conditionIds[index + 1] || gatewayId;
      edges.push({ id: `${id}-${target}`, source: id, target });
    });

    const yesTarget = outputIds[0] || matchEndId;
    edges.push({ id: `${gatewayId}-yes`, source: gatewayId, target: yesTarget, label: 'YES', tone: 'yes' });
    outputIds.forEach((id, index) => {
      edges.push({
        id: `${id}-next`,
        source: id,
        target: outputIds[index + 1] || matchEndId,
      });
    });

    meta.push({ gatewayId, first, ruleIndex, y, rightX: x });
  });

  meta.forEach((item, index) => {
    if (meta[index + 1]) {
      edges.push({
        id: `${item.gatewayId}-no-next`,
        source: item.gatewayId,
        target: meta[index + 1].first,
        label: 'NO · next rule',
        tone: 'no',
      });
    } else {
      const noId = 'no-match';
      const endId = 'end-no-match';
      const lastTop = 30 + item.ruleIndex * LANE_H;
      put({ id: noId, kind: 'nomatch', label: 'NO MATCH', subtitle: 'Rule review required' }, Math.min(item.rightX + 40, CANVAS_W - 410), lastTop + 195);
      put({ id: endId, kind: 'end', label: 'End' }, Math.min(item.rightX + 260, CANVAS_W - 150), lastTop + 196);
      edges.push({ id: `${item.gatewayId}-no`, source: item.gatewayId, target: noId, label: 'NO', tone: 'no' });
      edges.push({ id: `${noId}-${endId}`, source: noId, target: endId, tone: 'no' });
    }
  });

  return {
    nodes,
    edges,
    lanes,
    height: Math.max(760, rules.length * LANE_H + 170),
  };
}

function edgeGeometry(edge, map) {
  const source = map[edge.source];
  const target = map[edge.target];
  if (!source || !target) return null;
  const sd = nodeDims(source);
  const td = nodeDims(target);
  const sx = source.x + sd.w;
  const sy = source.y + sd.h / 2;
  const tx = target.x;
  const ty = target.y + td.h / 2;
  const distance = tx - sx;
  const c1 = distance >= 0 ? sx + Math.max(50, distance * 0.45) : sx + 140;
  const c2 = distance >= 0 ? tx - Math.max(50, distance * 0.45) : tx - 140;
  return {
    path: `M ${sx} ${sy} C ${c1} ${sy}, ${c2} ${ty}, ${tx} ${ty}`,
    lx: (sx + tx) / 2,
    ly: (sy + ty) / 2 - 8,
  };
}

export default function RuleFlowModeler() {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [positions, setPositions] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [actor, setActor] = useState('pejabat-regulator-demo');
  const [comment, setComment] = useState('Visual rule-flow update');
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadList(preferredId) {
    const data = await api('/business-rules/managed');
    setList(data);
    const id = preferredId || selectedId || data[0]?.id;
    if (id) await loadDecision(id);
  }

  async function loadDecision(id) {
    const data = await api(`/business-rules/managed/${id}`);
    setSelectedId(id);
    setRecord(data);
    setDraft(clone(data.working));
    setSelectedNodeId('');
    setMessage('');
    setError('');
    const key = `oss-br-rule-flow:${id}:${data.working.version}`;
    try { setPositions(JSON.parse(localStorage.getItem(key) || '{}')); } catch { setPositions({}); }
  }

  useEffect(() => {
    loadList().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId || !draft?.version) return;
    const key = `oss-br-rule-flow:${selectedId}:${draft.version}`;
    try { localStorage.setItem(key, JSON.stringify(positions)); } catch {}
  }, [positions, selectedId, draft?.version]);

  const graph = useMemo(() => buildGraph(draft, positions), [draft, positions]);
  const nodeMap = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const selectedNode = nodeMap[selectedNodeId];
  const editable = draft?.status === 'DRAFT';

  function autoLayout() {
    setPositions({});
    setMessage('Auto layout diterapkan. Connector mengikuti posisi node secara otomatis.');
  }

  function resetView() {
    setZoom(1);
    setPositions({});
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }

  function dragNode(event, nodeId) {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-oss-rule-node', nodeId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function dragPalette(event, kind) {
    event.dataTransfer.setData('application/x-oss-rule-palette', kind);
    event.dataTransfer.effectAllowed = 'copy';
  }

  function nearestRuleIndex(y) {
    if (!draft?.rules?.length) return 0;
    return Math.max(0, Math.min(draft.rules.length - 1, Math.floor((y - 30) / LANE_H)));
  }

  function dropCanvas(event) {
    event.preventDefault();
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(10, (event.clientX - bounds.left) / zoom - 90);
    const y = Math.max(10, (event.clientY - bounds.top) / zoom - 37);
    const nodeId = event.dataTransfer.getData('application/x-oss-rule-node');
    const paletteKind = event.dataTransfer.getData('application/x-oss-rule-palette');

    if (nodeId) {
      setPositions((current) => ({ ...current, [nodeId]: { x, y } }));
      return;
    }
    if (!editable || !paletteKind) return;

    if (paletteKind === 'RULE') {
      addRule();
      return;
    }

    const ruleIndex = nearestRuleIndex(y);
    if (paletteKind === 'CONDITION') addCondition(ruleIndex);
    if (paletteKind === 'OUTPUT') addOutputField(ruleIndex);
  }

  function addRule() {
    if (!editable) return;
    setDraft((current) => {
      const next = clone(current);
      const number = next.rules.length + 1;
      next.rules.push({
        id: `RULE-${String(number).padStart(3, '0')}`,
        description: 'New rule from visual flow modeler',
        priority: number * 10,
        status: 'ACTIVE',
        when: [],
        then: Object.fromEntries(next.outputFields.map((field) => [field, ''])),
        source: 'Visual Rule Flow Modeler',
        notes: 'Draft visual rule; review required before publication.',
      });
      return next;
    });
  }

  function addCondition(ruleIndex) {
    setDraft((current) => {
      const next = clone(current);
      const field = `input${next.inputFields.length + 1}`;
      if (!next.inputFields.includes(field)) next.inputFields.push(field);
      next.rules[ruleIndex].when.push({ field, operator: 'eq', value: '' });
      return next;
    });
  }

  function addOutputField(ruleIndex) {
    setDraft((current) => {
      const next = clone(current);
      const field = `output${next.outputFields.length + 1}`;
      next.outputFields.push(field);
      next.rules.forEach((rule, index) => {
        rule.then = { ...(rule.then || {}), [field]: index === ruleIndex ? '' : '' };
      });
      return next;
    });
  }

  function updateRule(ruleIndex, patch) {
    setDraft((current) => {
      const next = clone(current);
      next.rules[ruleIndex] = { ...next.rules[ruleIndex], ...patch };
      return next;
    });
  }

  function updateCondition(ruleIndex, conditionIndex, patch) {
    setDraft((current) => {
      const next = clone(current);
      const condition = next.rules[ruleIndex].when[conditionIndex];
      next.rules[ruleIndex].when[conditionIndex] = { ...condition, ...patch };
      if (patch.field && !next.inputFields.includes(patch.field)) next.inputFields.push(patch.field);
      return next;
    });
  }

  function updateOutput(ruleIndex, field, value) {
    setDraft((current) => {
      const next = clone(current);
      next.rules[ruleIndex].then = { ...(next.rules[ruleIndex].then || {}), [field]: parseValue(value) };
      return next;
    });
  }

  function removeCondition(ruleIndex, conditionIndex) {
    setDraft((current) => {
      const next = clone(current);
      next.rules[ruleIndex].when.splice(conditionIndex, 1);
      return next;
    });
    setSelectedNodeId('');
  }

  function removeRule(ruleIndex) {
    setDraft((current) => {
      const next = clone(current);
      next.rules.splice(ruleIndex, 1);
      return next;
    });
    setSelectedNodeId('');
  }

  async function saveDraft() {
    if (!editable) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/business-rules/managed/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify({ definition: draft, actor, comment }),
      });
      setRecord(updated);
      setDraft(clone(updated.working));
      setMessage('DRAFT tersimpan. Flow diagram tetap terhubung ke decision definition yang sama.');
      await loadList(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function createDraftVersion() {
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/business-rules/managed/${selectedId}/new-version`, {
        method: 'POST',
        body: JSON.stringify({ actor, comment: 'Create editable draft from visual rule flow' }),
      });
      setRecord(updated);
      setDraft(clone(updated.working));
      setPositions({});
      setMessage('Versi DRAFT baru dibuat. Rule flow sekarang dapat diedit.');
      await loadList(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OSS v2 · B1 BUSINESS RULES</div>
          <h1>Visual Rule Flow Modeler</h1>
          <p>Camunda/BPMN-like canvas untuk melihat dan mengubah setiap rule sebagai flow diagram. Hit policy FIRST divisualisasikan dengan jalur YES ke output dan NO ke rule berikutnya.</p>
        </div>
        <nav className={styles.nav}>
          <a href="/designer">Regulation Designer</a>
          <a href="/manage">Rule Management</a>
          <a href="/artifacts">DMN Artifacts</a>
          <a href="/">Simulator</a>
        </nav>
      </header>

      <section className={styles.commandBar}>
        <label>Actor<input value={actor} onChange={(e) => setActor(e.target.value)} /></label>
        <label className={styles.comment}>Change note<input value={comment} onChange={(e) => setComment(e.target.value)} /></label>
        <button onClick={autoLayout}>Auto layout</button>
        <button onClick={resetView}>Reset view</button>
        <div className={styles.zoomControl}>
          <button onClick={() => setZoom((z) => Math.max(.6, +(z - .1).toFixed(1)))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.4, +(z + .1).toFixed(1)))}>+</button>
        </div>
        {editable ? (
          <button className={styles.primary} disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : 'Save DRAFT'}</button>
        ) : (
          <button className={styles.primary} disabled={busy || !['ACTIVE', 'RETIRED'].includes(draft?.status)} onClick={createDraftVersion}>Create editable DRAFT</button>
        )}
      </section>

      {message && <div className={styles.message}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.workspace}>
        <aside className={styles.leftPanel}>
          <div className={styles.panelTitle}>Decision Registry</div>
          <div className={styles.registry}>
            {list.map((item) => (
              <button key={item.id} className={selectedId === item.id ? styles.registrySelected : ''} onClick={() => loadDecision(item.id)}>
                <strong>{item.name}</strong>
                <code>{item.id}</code>
                <small>{item.workingStatus} · {item.workingVersion}</small>
                <small>{item.ruleCount} rule(s)</small>
              </button>
            ))}
          </div>
          <div className={styles.panelTitle}>Flow Palette</div>
          <p className={styles.help}>Drag ke canvas untuk menambah elemen pada DRAFT.</p>
          {PALETTE.map((item) => (
            <div key={item.kind} draggable={editable} onDragStart={(event) => dragPalette(event, item.kind)} className={`${styles.paletteItem} ${!editable ? styles.disabled : ''}`}>
              <span>{item.icon}</span>
              <div><b>{item.label}</b><small>{item.hint}</small></div>
            </div>
          ))}
          <div className={styles.legend}>
            <b>Connector semantics</b>
            <span><i className={styles.yesDot}></i> YES → output / matched</span>
            <span><i className={styles.noDot}></i> NO → rule berikutnya</span>
            <small>Node dapat dipindahkan dengan drag-and-drop; connector akan mengikuti otomatis.</small>
          </div>
        </aside>

        <section className={styles.centerPanel}>
          <div className={styles.canvasHeader}>
            <div>
              <strong>{draft?.name || 'Select a decision'}</strong>
              <span>{draft ? `${draft.id} · ${draft.version} · ${draft.status} · Hit Policy ${draft.hitPolicy}` : ''}</span>
            </div>
            <div className={styles.canvasStats}>
              <span>{draft?.rules?.length || 0} rules</span>
              <span>{graph.nodes.length} nodes</span>
              <span>{graph.edges.length} connectors</span>
            </div>
          </div>

          <div ref={viewportRef} className={styles.viewport} onDragOver={(e) => e.preventDefault()} onDrop={dropCanvas}>
            <div
              ref={canvasRef}
              className={styles.canvas}
              style={{ width: CANVAS_W, height: graph.height, transform: `scale(${zoom})`, transformOrigin: '0 0' }}
              onClick={() => setSelectedNodeId('')}
            >
              {graph.lanes.map((lane) => (
                <div key={lane.id} className={styles.ruleLane} style={{ top: lane.top, height: LANE_H - 20 }}>
                  <div className={styles.laneLabel}>
                    <b>RULE {lane.ruleIndex + 1}</b>
                    <code>{lane.label}</code>
                    <span>P{lane.priority} · {lane.status}</span>
                  </div>
                </div>
              ))}

              <svg className={styles.edges} width={CANVAS_W} height={graph.height}>
                <defs>
                  <marker id="flow-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <path d="M0,0 L9,4.5 L0,9 z" />
                  </marker>
                </defs>
                {graph.edges.map((edge) => {
                  const geometry = edgeGeometry(edge, nodeMap);
                  if (!geometry) return null;
                  return (
                    <g key={edge.id} className={edge.tone === 'yes' ? styles.edgeYes : edge.tone === 'no' ? styles.edgeNo : styles.edgeDefault}>
                      <path d={geometry.path} markerEnd="url(#flow-arrow)" />
                      {edge.label && <text x={geometry.lx} y={geometry.ly}>{edge.label}</text>}
                    </g>
                  );
                })}
              </svg>

              {graph.nodes.map((node) => {
                const dims = nodeDims(node);
                const classes = [styles.flowNode, styles[`node_${node.kind}`], selectedNodeId === node.id ? styles.nodeSelected : ''].join(' ');
                return (
                  <div
                    key={node.id}
                    draggable={!['start', 'end'].includes(node.kind)}
                    onDragStart={(event) => dragNode(event, node.id)}
                    onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id); }}
                    className={classes}
                    style={{ left: node.x, top: node.y, width: dims.w, height: dims.h }}
                  >
                    {!['start', 'end'].includes(node.kind) && <span className={styles.portLeft}></span>}
                    <div className={styles.nodeBody}>
                      <b>{node.label}</b>
                      {node.subtitle && <small>{node.subtitle}</small>}
                    </div>
                    {!['start', 'end'].includes(node.kind) && <span className={styles.portRight}></span>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className={styles.rightPanel}>
          <div className={styles.panelTitle}>Properties</div>
          {!selectedNode ? (
            <div className={styles.emptyInspector}>Pilih node pada canvas untuk mengubah rule.</div>
          ) : (
            <div className={styles.inspector}>
              <div className={styles.inspectorType}>{selectedNode.kind.toUpperCase()}</div>
              <h3>{selectedNode.label}</h3>

              {selectedNode.kind === 'condition' && (() => {
                const condition = draft.rules[selectedNode.ruleIndex].when[selectedNode.conditionIndex];
                return <>
                  <label>Field<input disabled={!editable} value={condition.field} onChange={(e) => updateCondition(selectedNode.ruleIndex, selectedNode.conditionIndex, { field: e.target.value })} /></label>
                  <label>Operator<select disabled={!editable} value={condition.operator} onChange={(e) => updateCondition(selectedNode.ruleIndex, selectedNode.conditionIndex, { operator: e.target.value })}>{OPERATORS.map((op) => <option key={op}>{op}</option>)}</select></label>
                  <label>Value<input disabled={!editable} value={stringifyValue(condition.value)} onChange={(e) => updateCondition(selectedNode.ruleIndex, selectedNode.conditionIndex, { value: parseValue(e.target.value) })} /></label>
                  {editable && <button className={styles.danger} onClick={() => removeCondition(selectedNode.ruleIndex, selectedNode.conditionIndex)}>Remove condition</button>}
                </>;
              })()}

              {selectedNode.kind === 'output' && (() => {
                const rule = draft.rules[selectedNode.ruleIndex];
                return <>
                  <label>Output field<input disabled value={selectedNode.outputField} /></label>
                  <label>Output value<input disabled={!editable} value={stringifyValue(rule.then?.[selectedNode.outputField])} onChange={(e) => updateOutput(selectedNode.ruleIndex, selectedNode.outputField, e.target.value)} /></label>
                </>;
              })()}

              {selectedNode.kind === 'gateway' && (() => {
                const rule = draft.rules[selectedNode.ruleIndex];
                return <>
                  <label>Rule ID<input disabled={!editable} value={rule.id} onChange={(e) => updateRule(selectedNode.ruleIndex, { id: e.target.value })} /></label>
                  <label>Priority<input type="number" disabled={!editable} value={rule.priority} onChange={(e) => updateRule(selectedNode.ruleIndex, { priority: Number(e.target.value) })} /></label>
                  <label>Description<textarea disabled={!editable} value={rule.description || ''} onChange={(e) => updateRule(selectedNode.ruleIndex, { description: e.target.value })} /></label>
                  <label>Source<textarea disabled={!editable} value={rule.source || ''} onChange={(e) => updateRule(selectedNode.ruleIndex, { source: e.target.value })} /></label>
                  <label>Rule row status<select disabled={!editable} value={rule.status || 'ACTIVE'} onChange={(e) => updateRule(selectedNode.ruleIndex, { status: e.target.value })}><option>ACTIVE</option><option>DRAFT</option><option>RETIRED</option></select></label>
                  {editable && <button className={styles.danger} onClick={() => removeRule(selectedNode.ruleIndex)}>Delete rule</button>}
                </>;
              })()}

              {['start', 'end', 'nomatch'].includes(selectedNode.kind) && <p className={styles.readonlyNote}>System flow node. Posisi dapat dipindahkan, tetapi semantics node ini dibentuk otomatis dari hit policy dan urutan rule.</p>}

              <div className={styles.positionBox}>
                <b>Canvas position</b>
                <span>x {Math.round(selectedNode.x)} · y {Math.round(selectedNode.y)}</span>
                <button onClick={() => setPositions((current) => { const next = { ...current }; delete next[selectedNode.id]; return next; })}>Reset node position</button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className={styles.explainer}>
        <b>Execution semantics yang divisualisasikan</b>
        <span>Start → kondisi Rule 1 → gateway. Jika YES, output rule dihasilkan dan flow selesai. Jika NO, connector meneruskan evaluasi ke Rule 2, Rule 3, dan seterusnya. Bila tidak ada rule yang match, flow berakhir di NO MATCH / RULE_REVIEW_REQUIRED.</span>
      </section>
    </main>
  );
}
