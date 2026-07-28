import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../src';
import {
  analyzeFeed,
  classifyTopic,
  cosineSimilarity,
  parseFeedFile,
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
});
