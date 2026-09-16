'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import styles from './page.module.css';

function downloadXml(filename, xml) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function DmnArtifactsPage() {
  const [decisions, setDecisions] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [selectedId, setSelectedId] = useState('permit-profile');
  const [preview, setPreview] = useState(null);
  const [source, setSource] = useState('working');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [managed, published] = await Promise.all([
      api('/business-rules/managed'),
      api('/business-rules/artifacts'),
    ]);
    setDecisions(managed);
    setArtifacts(published);
    if (!managed.some((item) => item.id === selectedId) && managed[0]) {
      setSelectedId(managed[0].id);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const selected = useMemo(
    () => decisions.find((item) => item.id === selectedId),
    [decisions, selectedId],
  );

  async function generate(targetSource = source, autoDownload = false) {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/business-rules/managed/${selectedId}/dmn/${targetSource}`);
      setPreview(data);
      setSource(targetSource);
      if (autoDownload) downloadXml(data.filename, data.dmnXml);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPublished(artifact) {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/business-rules/artifacts/${artifact.decisionId}/${artifact.version}`);
      setPreview(data);
      downloadXml(data.filename, data.dmnXml);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>OSS v2 · B1 Business Rules · Decision Artifact</div>
          <h1>Standard DMN XML Artifacts</h1>
          <p>
            Generate dan publish decision model sebagai file <code>.dmn</code> berbasis
            OMG DMN 1.3 XML agar dapat dibuka di Camunda Modeler atau DMN-compatible tool.
          </p>
        </div>
        <nav className={styles.nav}>
          <a href="/">Simulator</a>
          <a href="/designer">Rule Designer</a>
          <a href="/manage">Management</a>
        </nav>
      </header>

      <section className={styles.standardCard}>
        <div>
          <span>STANDARD PROFILE</span>
          <strong>OMG DMN 1.3</strong>
        </div>
        <div>
          <span>MODEL NAMESPACE</span>
          <strong>https://www.omg.org/spec/DMN/20191111/MODEL/</strong>
        </div>
        <div>
          <span>FORMAT</span>
          <strong>XML · .dmn · application/xml</strong>
        </div>
        <div>
          <span>INTEROPERABILITY TARGET</span>
          <strong>Camunda Modeler / DMN tooling</strong>
        </div>
      </section>

      <section className={styles.grid}>
        <aside className={styles.registry}>
          <div className={styles.sectionTitle}>Decision Registry</div>
          {decisions.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelectedId(item.id); setPreview(null); }}
              className={selectedId === item.id ? styles.selected : ''}
            >
              <strong>{item.name}</strong>
              <code>{item.id}</code>
              <small>Working: {item.workingVersion} · {item.workingStatus}</small>
              <small>Runtime: {item.activeVersion || 'not active'}</small>
            </button>
          ))}
        </aside>

        <section className={styles.workspace}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <span>GENERATE</span>
                <h2>{selected?.name || 'Decision Model'}</h2>
              </div>
              <div className={styles.badge}>DMN 1.3 XML</div>
            </div>

            <p className={styles.note}>
              <b>Working DMN</b> cocok untuk review/pertukaran model. <b>Active DMN</b>
              merepresentasikan rule yang sedang dikonsumsi runtime B2. Saat lifecycle masuk
              <b> PUBLISHED</b>, sistem otomatis menyimpan immutable publication artifact di
              <code> data/published-dmn</code>.
            </p>

            <div className={styles.actions}>
              <button disabled={busy || !selectedId} onClick={() => generate('working', false)}>
                Preview Working DMN
              </button>
              <button className={styles.primary} disabled={busy || !selectedId} onClick={() => generate('working', true)}>
                Download Working .dmn
              </button>
              <button disabled={busy || !selected?.activeVersion} onClick={() => generate('active', true)}>
                Download Active .dmn
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          {preview && (
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <span>ARTIFACT PREVIEW</span>
                  <h2>{preview.filename}</h2>
                </div>
                <div className={styles.hash}>SHA-256<br/><code>{preview.sha256}</code></div>
              </div>
              <div className={styles.meta}>
                <span><b>Decision</b>{preview.decisionId}</span>
                <span><b>Version</b>{preview.version}</span>
                <span><b>Standard</b>{preview.standard}</span>
                <span><b>MIME</b>{preview.mimeType}</span>
              </div>
              <pre>{preview.dmnXml}</pre>
            </div>
          )}
        </section>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><span>PUBLISHED REGISTRY</span><h2>Published DMN Artifacts</h2></div>
          <div className={styles.badge}>{artifacts.length} artifact</div>
        </div>
        {artifacts.length === 0 ? (
          <div className={styles.empty}>
            Belum ada publication artifact. Pindahkan sebuah decision melalui lifecycle sampai
            status <b>PUBLISHED</b> pada Business Rule Management.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Decision</th><th>Version</th><th>File</th><th>Published by</th><th>Published at</th><th>SHA-256</th><th></th></tr></thead>
              <tbody>
                {artifacts.map((artifact) => (
                  <tr key={`${artifact.decisionId}-${artifact.version}`}>
                    <td><strong>{artifact.decisionName}</strong><code>{artifact.decisionId}</code></td>
                    <td>{artifact.version}</td>
                    <td><code>{artifact.filename}</code></td>
                    <td>{artifact.publishedBy}</td>
                    <td>{new Date(artifact.publishedAt).toLocaleString('id-ID')}</td>
                    <td><code className={styles.shortHash}>{artifact.sha256}</code></td>
                    <td><button onClick={() => downloadPublished(artifact)}>Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.flowCard}>
        <div className={styles.flowStep}><b>Regulation</b><span>source</span></div>
        <i>→</i>
        <div className={styles.flowStep}><b>BRDF / Internal JSON</b><span>editable model</span></div>
        <i>→</i>
        <div className={`${styles.flowStep} ${styles.highlight}`}><b>DMN XML</b><span>portable artifact</span></div>
        <i>→</i>
        <div className={styles.flowStep}><b>DMN Engine</b><span>decision runtime</span></div>
        <i>→</i>
        <div className={styles.flowStep}><b>B2 Workflow</b><span>JSON result</span></div>
      </section>
    </main>
  );
}
