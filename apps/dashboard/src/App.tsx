import { useEffect, useMemo, useState } from 'react';
import {
  compareSnapshots,
  createSnapshot,
  toPublicSummary,
  type FeedItem,
  type PatternHit,
  type Snapshot,
} from '@cermin/analyzer';
import demoData from '../../../samples/feed-demo.json';
import { Distribution } from './components/Distribution';
import { ImportDialog } from './components/ImportDialog';
import { VaultDialog } from './components/VaultDialog';
import { clearSnapshots, loadSnapshots, saveSnapshots } from './lib/storage';

const demoItems = demoData as FeedItem[];
const patternLabels: Record<PatternHit['pattern'], string> = {
  'engagement-bait': 'Ajakan interaksi',
  urgency: 'Urgensi buatan',
  outrage: 'Pemicu kemarahan',
  'authority-claim': 'Klaim otoritas',
};

const topicColors: Record<string, string> = {
  technology: '#f6c667',
  politics: '#e6845c',
  economy: '#7ab6a2',
  health: '#8da0d6',
  environment: '#78a88c',
  culture: '#bc8dc9',
  education: '#d8a864',
  entertainment: '#dc7891',
  sports: '#7b9bcc',
  lifestyle: '#a8b46d',
  other: '#747b78',
};

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scoreLabel(score: number) {
  if (score >= 76) return 'Bervariasi';
  if (score >= 51) return 'Cukup beragam';
  return 'Perlu dilihat';
}

export function App() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    const saved = loadSnapshots(window.localStorage);
    return saved.length ? saved : [createSnapshot('Demo — Pagi Jakarta', demoItems)];
  });
  const [activeId, setActiveId] = useState(() => snapshots[0]?.id ?? '');
  const [importOpen, setImportOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [persistenceEnabled, setPersistenceEnabled] = useState(
    () => window.localStorage.getItem('cermin:persistence') !== 'off',
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'items'>('overview');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (persistenceEnabled) {
      saveSnapshots(window.localStorage, snapshots);
      window.localStorage.setItem('cermin:persistence', 'on');
      return;
    }
    clearSnapshots(window.localStorage);
    window.localStorage.setItem('cermin:persistence', 'off');
  }, [persistenceEnabled, snapshots]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const active = snapshots.find((snapshot) => snapshot.id === activeId) ?? snapshots[0];
  const activeIndex = snapshots.findIndex((snapshot) => snapshot.id === active?.id);
  const previous = activeIndex >= 0 ? snapshots[activeIndex + 1] : undefined;
  const metrics = active?.metrics;
  const comparison = useMemo(
    () => (active && previous ? compareSnapshots(previous, active) : null),
    [active, previous],
  );

  const patternCounts = useMemo(() => {
    if (!metrics) return [];
    const counts = new Map<PatternHit['pattern'], number>();
    metrics.patterns.forEach((hit) => counts.set(hit.pattern, (counts.get(hit.pattern) ?? 0) + 1));
    return [...counts.entries()].sort(([, a], [, b]) => b - a);
  }, [metrics]);

  if (!active || !metrics) return null;

  const handleImport = (
    label: string,
    items: FeedItem[],
    meta: { redactionCount: number; issueCount: number },
  ) => {
    const snapshot = createSnapshot(label, items);
    setSnapshots((current) => [snapshot, ...current].slice(0, 12));
    setActiveId(snapshot.id);
    setImportOpen(false);
    const privacyNote = meta.redactionCount
      ? ` ${meta.redactionCount} data sensitif disamarkan.`
      : '';
    const issueNote = meta.issueCount ? ` ${meta.issueCount} baris dilewati.` : '';
    setToast(`${items.length} posting dianalisis di perangkat.${privacyNote}${issueNote}`);
  };

  const resetData = () => {
    const demo = createSnapshot('Demo — Pagi Jakarta', demoItems);
    clearSnapshots(window.localStorage);
    setSnapshots([demo]);
    setActiveId(demo.id);
    setToast('Data lokal dihapus. Snapshot demo dimuat kembali.');
  };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Cermin, beranda">
          <span className="brand-glyph" aria-hidden="true">
            <i />
          </span>
          <span>
            <strong>cermin</strong>
            <small>feed observatory</small>
          </span>
        </a>
        <div className="topbar-center">
          <span className="privacy-signal">
            <i /> Pemrosesan lokal aktif
          </span>
          <button
            className="session-toggle"
            type="button"
            aria-pressed={!persistenceEnabled}
            onClick={() => {
              setPersistenceEnabled((current) => !current);
              setToast(
                persistenceEnabled
                  ? 'Mode sesi aktif. Snapshot tidak disimpan setelah tab ditutup.'
                  : 'Penyimpanan lokal aktif kembali.',
              );
            }}
          >
            {persistenceEnabled ? 'Tersimpan lokal' : 'Mode sesi'}
          </button>
        </div>
        <div className="topbar-actions">
          <a href="#metode">Metode</a>
          <button className="vault-button" type="button" onClick={() => setVaultOpen(true)}>
            Vault
          </button>
          <button className="primary-button" type="button" onClick={() => setImportOpen(true)}>
            + Impor snapshot
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-title">
            <span>Snapshot lokal</span>
            <strong>{snapshots.length}/12</strong>
          </div>
          <div className="snapshot-list">
            {snapshots.map((snapshot, index) => (
              <button
                type="button"
                className={`snapshot-item ${snapshot.id === active.id ? 'active' : ''}`}
                key={snapshot.id}
                onClick={() => setActiveId(snapshot.id)}
              >
                <span className="snapshot-number">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{snapshot.label}</strong>
                  <small>
                    {snapshot.metrics.totalItems} item ·{' '}
                    {new Date(snapshot.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </small>
                </span>
                <i
                  className={`snapshot-score score-${snapshot.metrics.agencyScore >= 60 ? 'good' : 'watch'}`}
                >
                  {snapshot.metrics.agencyScore}
                </i>
              </button>
            ))}
          </div>
          <button className="new-snapshot" type="button" onClick={() => setImportOpen(true)}>
            <span>＋</span>
            <strong>Tambah snapshot</strong>
            <small>JSON atau CSV</small>
          </button>
          <div className="sidebar-footer">
            <p>Semua isi feed tersimpan hanya di browser ini.</p>
            <button type="button" onClick={resetData}>
              Hapus data lokal
            </button>
          </div>
        </aside>

        <main id="main">
          <section className="report-header">
            <div>
              <p className="eyebrow">Laporan perhatian pribadi</p>
              <h1>{active.label}</h1>
              <p>
                {metrics.totalItems} posting dari {metrics.uniqueSources} sumber · sekitar{' '}
                {metrics.estimatedMinutes} menit waktu baca · keyakinan {metrics.confidence.score}%
              </p>
            </div>
            <div className="report-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  downloadJson('cermin-public-summary.json', toPublicSummary(active));
                  setToast('Ringkasan agregat diekspor tanpa teks dan nama sumber.');
                }}
              >
                Ekspor aman ↓
              </button>
            </div>
          </section>

          <nav className="tabs" aria-label="Bagian laporan">
            {[
              ['overview', 'Ringkasan'],
              ['patterns', `Pola terdeteksi · ${metrics.patterns.length}`],
              ['items', `Item lokal · ${metrics.totalItems}`],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeTab === value ? 'active' : ''}
                onClick={() => setActiveTab(value as typeof activeTab)}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <>
              <section className="metric-grid">
                <article className="agency-card">
                  <div
                    className="score-orbit"
                    style={{ '--score': `${metrics.agencyScore * 3.6}deg` } as React.CSSProperties}
                  >
                    <div>
                      <strong>{metrics.agencyScore}</strong>
                      <span>/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="metric-label">Ruang kendali feed</p>
                    <h2>{scoreLabel(metrics.agencyScore)}</h2>
                    <p>
                      Gabungan variasi sumber, topik, repetisi, dan pola yang mendorong reaksi
                      cepat.
                    </p>
                  </div>
                  {comparison && (
                    <span className={`delta ${comparison.deltas.agencyScore >= 0 ? 'up' : 'down'}`}>
                      {comparison.deltas.agencyScore >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(comparison.deltas.agencyScore)} dari snapshot sebelumnya
                    </span>
                  )}
                </article>

                <article className="mini-metric">
                  <span className="metric-icon source-icon">◫</span>
                  <p className="metric-label">Keragaman sumber</p>
                  <strong>{metrics.sourceDiversity}</strong>
                  <div className="micro-track">
                    <i style={{ width: `${metrics.sourceDiversity}%` }} />
                  </div>
                  <small>{metrics.uniqueSources} sumber berbeda</small>
                </article>
                <article className="mini-metric">
                  <span className="metric-icon topic-icon">✣</span>
                  <p className="metric-label">Keragaman topik</p>
                  <strong>{metrics.topicDiversity}</strong>
                  <div className="micro-track">
                    <i style={{ width: `${metrics.topicDiversity}%` }} />
                  </div>
                  <small>{metrics.topicDistribution.length} kelompok topik</small>
                </article>
                <article className="mini-metric">
                  <span className="metric-icon bait-icon">!</span>
                  <p className="metric-label">Pola pemicu</p>
                  <strong>{metrics.baitRate}%</strong>
                  <div className="micro-track risk">
                    <i style={{ width: `${metrics.baitRate}%` }} />
                  </div>
                  <small>
                    {new Set(metrics.patterns.map((hit) => hit.itemId)).size} item ditandai
                  </small>
                </article>
              </section>

              <section className="insight-strip">
                <span className="insight-mark">i</span>
                <div>
                  <strong>Apa yang paling terlihat?</strong>
                  <p>
                    {metrics.insights[0]} {metrics.insights[2]}
                  </p>
                </div>
                <button type="button" onClick={() => setActiveTab('patterns')}>
                  Lihat buktinya →
                </button>
              </section>

              <section className="expert-strip" aria-label="Metrik analisis lanjutan">
                <article>
                  <span>Konsentrasi sumber</span>
                  <strong>{metrics.sourceConcentration}</strong>
                  <small>Indeks 0–100; makin tinggi makin terpusat</small>
                </article>
                <article>
                  <span>Ledakan temporal</span>
                  <strong>{metrics.temporalBurst}%</strong>
                  <small>Porsi item pada jam terpadat</small>
                </article>
                <article>
                  <span>Keyakinan analisis</span>
                  <strong>{metrics.confidence.score}%</strong>
                  <small>{metrics.confidence.reasons[0]}</small>
                </article>
                <article>
                  <span>Klaster narasi</span>
                  <strong>{metrics.narrativeClusters.length}</strong>
                  <small>Kelompok cerita lintas item yang mirip</small>
                </article>
              </section>

              {comparison && (
                <section className="comparison-panel">
                  <div>
                    <p className="eyebrow">Perubahan antar-snapshot</p>
                    <h2>Apa yang bergeser sejak snapshot sebelumnya?</h2>
                    <p>{comparison.summary[0]}</p>
                  </div>
                  <div className="delta-grid">
                    {[
                      ['Kendali', comparison.deltas.agencyScore],
                      ['Sumber', comparison.deltas.sourceDiversity],
                      ['Topik', comparison.deltas.topicDiversity],
                      ['Pemicu', comparison.deltas.baitRate],
                    ].map(([label, delta]) => (
                      <span key={label}>
                        {label}
                        <strong className={Number(delta) >= 0 ? 'positive' : 'negative'}>
                          {Number(delta) >= 0 ? '+' : ''}
                          {delta}
                        </strong>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="analysis-grid">
                <article className="panel topic-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Komposisi</p>
                      <h2>Topik yang mengisi perhatianmu</h2>
                    </div>
                    <span>Shannon {metrics.topicDiversity}/100</span>
                  </div>
                  <div className="topic-visual">
                    <div className="topic-bars" aria-label="Distribusi topik">
                      {metrics.topicDistribution.map((entry) => (
                        <div
                          key={entry.label}
                          style={{
                            height: `${Math.max(12, entry.share * 2.1)}px`,
                            background: topicColors[entry.label] ?? '#747b78',
                          }}
                          title={`${entry.label}: ${entry.share}%`}
                        >
                          <span>{entry.share}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="topic-labels">
                      {metrics.topicDistribution.map((entry) => (
                        <span key={entry.label}>
                          <i style={{ background: topicColors[entry.label] ?? '#747b78' }} />
                          {entry.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Konsentrasi</p>
                      <h2>Siapa yang paling sering muncul?</h2>
                    </div>
                    <span>{metrics.uniqueSources} sumber</span>
                  </div>
                  <Distribution entries={metrics.sourceDistribution} />
                  <p className="panel-note">
                    Tinggi bukan berarti buruk. Cermin menampilkan konsentrasi agar kamu yang
                    menilai.
                  </p>
                </article>
              </section>

              <section className="analysis-grid lower">
                <article className="panel pattern-summary">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Bahasa persuasif</p>
                      <h2>Pola yang meminta reaksi cepat</h2>
                    </div>
                    <span>{metrics.patterns.length} sinyal</span>
                  </div>
                  <div className="pattern-counts">
                    {patternCounts.length ? (
                      patternCounts.map(([pattern, count]) => (
                        <button
                          key={pattern}
                          type="button"
                          onClick={() => setActiveTab('patterns')}
                        >
                          <span>{patternLabels[pattern]}</span>
                          <strong>{count}</strong>
                        </button>
                      ))
                    ) : (
                      <p>Tidak ada pola dalam kamus lokal yang terdeteksi.</p>
                    )}
                  </div>
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Platform</p>
                      <h2>Dari mana snapshot berasal?</h2>
                    </div>
                  </div>
                  <Distribution entries={metrics.platformDistribution} />
                  <p className="panel-note">Cermin tidak terhubung ke akun platform mana pun.</p>
                </article>
              </section>
            </>
          )}

          {activeTab === 'patterns' && (
            <section className="pattern-page">
              <div className="section-intro">
                <div>
                  <p className="eyebrow">Deteksi yang dapat diperiksa</p>
                  <h2>Bukan vonis. Hanya penanda untuk dilihat ulang.</h2>
                </div>
                <p>
                  Semua sinyal berasal dari kamus terbuka di source code. Tidak ada model rahasia
                  atau pengiriman teks ke layanan AI.
                </p>
              </div>
              <div className="pattern-list">
                {metrics.patterns.map((hit, index) => {
                  const feedItem = active.items.find((item) => item.id === hit.itemId);
                  return (
                    <article key={`${hit.itemId}-${hit.pattern}`}>
                      <span className="pattern-index">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span className={`pattern-pill pattern-${hit.pattern}`}>
                          {patternLabels[hit.pattern]}
                        </span>
                        <blockquote>{feedItem?.text}</blockquote>
                        <p>Sinyal: {hit.evidence.map((item) => `“${item}”`).join(', ')}</p>
                      </div>
                      <small>{feedItem?.source}</small>
                    </article>
                  );
                })}
                {!metrics.patterns.length && (
                  <div className="empty-state">Tidak ada pola terdeteksi.</div>
                )}
              </div>
              <div className="repetition-panel">
                <h3>Pasangan narasi yang mirip</h3>
                <p>{metrics.similarPairs.length} pasangan melewati ambang kemiripan 62%.</p>
                {metrics.similarPairs.slice(0, 5).map((pair) => (
                  <div key={`${pair.firstId}-${pair.secondId}`}>
                    <strong>{pair.similarity}% mirip</strong>
                    <span>{active.items.find((item) => item.id === pair.firstId)?.source}</span>
                    <span>↔</span>
                    <span>{active.items.find((item) => item.id === pair.secondId)?.source}</span>
                  </div>
                ))}
              </div>
              <div className="cluster-panel">
                <h3>Klaster narasi</h3>
                <p>
                  Item terhubung bila kemiripan teks melewati ambang. Klaster membantu melihat
                  pengulangan cerita lintas sumber.
                </p>
                {metrics.narrativeClusters.map((cluster) => (
                  <article key={cluster.id}>
                    <div>
                      <strong>{cluster.itemIds.length} item</strong>
                      <span>{cluster.sourceCount} sumber</span>
                    </div>
                    <p>{cluster.topTerms.join(' · ')}</p>
                    <small>rata-rata kemiripan {cluster.averageSimilarity}%</small>
                  </article>
                ))}
                {!metrics.narrativeClusters.length && (
                  <div className="empty-state">Belum ada klaster narasi yang kuat.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'items' && (
            <section className="items-page">
              <div className="section-intro">
                <div>
                  <p className="eyebrow">Data mentah lokal</p>
                  <h2>Item di snapshot ini</h2>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => downloadJson('cermin-private-snapshot.json', active)}
                >
                  Ekspor privat
                </button>
              </div>
              <div className="item-table">
                <div className="table-head">
                  <span>Sumber</span>
                  <span>Isi</span>
                  <span>Platform</span>
                </div>
                {active.items.map((item) => (
                  <article key={item.id}>
                    <strong>{item.source}</strong>
                    <p>{item.text}</p>
                    <span>{item.platform}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="method" id="metode">
            <p className="eyebrow">Metode transparan</p>
            <div>
              <h2>
                Cermin mengukur komposisi,
                <br />
                bukan menentukan kebenaran.
              </h2>
              <p>
                Keragaman memakai normalized Shannon entropy. Repetisi memakai cosine similarity
                token. Pola persuasif memakai kamus Bahasa Indonesia dan Inggris yang dapat diaudit.
                Skor ruang kendali adalah ringkasan heuristik—bukan diagnosis filter bubble.
              </p>
            </div>
          </section>
        </main>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      <VaultDialog
        open={vaultOpen}
        snapshot={active}
        onClose={() => setVaultOpen(false)}
        onRestore={(restored) => {
          const snapshot = createSnapshot(`${restored.label} — dipulihkan`, restored.items);
          setSnapshots((current) => [snapshot, ...current].slice(0, 12));
          setActiveId(snapshot.id);
          setToast('Archive berhasil didekripsi dan dianalisis ulang di perangkat.');
        }}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
