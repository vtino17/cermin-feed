import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../src';
import {
  analyzeFeed,
  classifyTopic,
  compareSnapshots,
  cosineSimilarity,
  parseFeedFileDetailed,
  parseFeedFile,
  redactSensitiveText,
  toPublicSummary,
  createSnapshot,
} from '../src';

const item = (id: string, source: string, text: string): FeedItem => ({
  id,
  source,
  text,
  platform: 'x',
  capturedAt: '2026-07-28T00:00:00.000Z',
});

describe('feed analysis', () => {
  it('classifies Indonesian topics', () => {
    expect(classifyTopic('Startup teknologi AI sedang membangun software baru')).toBe('technology');
    expect(classifyTopic('Kebijakan pemerintah dan menteri dibahas DPR')).toBe('politics');
  });

  it('finds repeated narratives', () => {
    expect(
      cosineSimilarity(
        'Teknologi AI membantu developer menulis software',
        'Developer memakai teknologi AI untuk menulis software',
      ),
    ).toBeGreaterThan(0.7);
  });

  it('penalizes concentrated and bait-heavy feeds', () => {
    const concentrated = analyzeFeed([
      item('1', 'satu', 'BREAKING wajib tahu, share kalau setuju teknologi ini gila'),
      item('2', 'satu', 'BREAKING wajib tahu, share kalau setuju teknologi ini gila'),
      item('3', 'satu', 'BREAKING wajib tahu, share kalau setuju teknologi ini gila'),
    ]);
    const diverse = analyzeFeed([
      item('1', 'satu', 'Riset teknologi untuk pendidikan terbuka'),
      item('2', 'dua', 'Komunitas menanam hutan untuk iklim'),
      item('3', 'tiga', 'Dokter membahas kesehatan tidur'),
    ]);
    expect(diverse.agencyScore).toBeGreaterThan(concentrated.agencyScore);
    expect(concentrated.baitRate).toBe(100);
  });

  it('exports no raw text or source names', () => {
    const snapshot = createSnapshot('Pagi', [item('1', 'akun-rahasia', 'teks pribadi teknologi')]);
    const exported = JSON.stringify(toPublicSummary(snapshot));
    expect(exported).not.toContain('akun-rahasia');
    expect(exported).not.toContain('teks pribadi');
  });

  it('reports confidence, concentration, temporal bursts, and narrative clusters', () => {
    const metrics = analyzeFeed([
      item('1', 'satu', 'Teknologi AI membantu developer menulis software'),
      item('2', 'satu', 'Developer memakai teknologi AI untuk menulis software'),
      item('3', 'dua', 'Riset kesehatan membahas kualitas tidur'),
    ]);
    expect(metrics.analysisVersion).toBe(2);
    expect(metrics.sourceConcentration).toBeGreaterThan(0);
    expect(metrics.temporalBurst).toBe(100);
    expect(metrics.confidence.sampleSize).toBe(3);
    expect(metrics.narrativeClusters[0]?.itemIds).toHaveLength(2);
  });

  it('compares changes between snapshots', () => {
    const baseline = createSnapshot('awal', [
      item('1', 'satu', 'BREAKING share kalau setuju teknologi ini gila'),
      item('2', 'satu', 'BREAKING share kalau setuju teknologi ini gila'),
    ]);
    const current = createSnapshot('baru', [
      item('3', 'satu', 'Riset teknologi untuk pendidikan'),
      item('4', 'dua', 'Komunitas menjaga hutan dan iklim'),
      item('5', 'tiga', 'Dokter membahas kesehatan tidur'),
    ]);
    const comparison = compareSnapshots(baseline, current);
    expect(comparison.deltas.agencyScore).toBeGreaterThan(0);
    expect(comparison.deltas.baitRate).toBeLessThan(0);
  });
});

describe('feed parser', () => {
  it('parses JSON and CSV snapshots', () => {
    expect(
      parseFeedFile(
        JSON.stringify([{ platform: 'reddit', source: 'komunitas', text: 'Isi posting' }]),
        'feed.json',
      ),
    ).toHaveLength(1);
    expect(
      parseFeedFile('platform,source,text\nx,akun,"Teks, dengan koma"', 'feed.csv')[0]?.text,
    ).toBe('Teks, dengan koma');
  });

  it('redacts common personal identifiers and reports import issues', () => {
    const redacted = redactSensitiveText(
      'Hubungi nama@example.com atau +62 812-3456-7890 dan kartu 4111 1111 1111 1111',
    );
    expect(redacted.text).not.toContain('nama@example.com');
    expect(redacted.count).toBe(3);

    const parsed = parseFeedFileDetailed(
      JSON.stringify([
        { text: 'Kontak saya nama@example.com', platform: 'x' },
        { source: 'kosong' },
      ]),
      'feed.json',
      { redactSensitive: true },
    );
    expect(parsed.items[0]?.text).toContain('[EMAIL]');
    expect(parsed.redactionCount).toBe(1);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it('bounds large imports and makes duplicate ids unique', () => {
    const values = Array.from({ length: 501 }, (_, index) => ({
      id: 'duplicate',
      text: `Posting nomor ${index} dengan isi yang cukup panjang`,
      source: 'Sumber',
      platform: 'other',
      capturedAt: '2026-07-28T00:00:00.000Z',
    }));
    const parsed = parseFeedFileDetailed(JSON.stringify(values), 'large.json');
    expect(parsed.items).toHaveLength(500);
    expect(new Set(parsed.items.map((feedItem) => feedItem.id)).size).toBe(500);
    expect(parsed.issues.some((issue) => issue.field === 'file')).toBe(true);
    expect(parsed.issues.some((issue) => issue.field === 'id')).toBe(true);
  });
});
