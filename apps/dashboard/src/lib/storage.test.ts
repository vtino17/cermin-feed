import { describe, expect, it, vi } from 'vitest';
import { clearSnapshots, loadSnapshots, saveSnapshots } from './storage';

describe('snapshot storage', () => {
  it('recovers from malformed local data', () => {
    expect(loadSnapshots({ getItem: () => 'invalid' })).toEqual([]);
  });

  it('writes and clears local snapshots', () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    saveSnapshots({ setItem }, []);
    clearSnapshots({ removeItem });
    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith('cermin:snapshots:v1');
  });

  it('reanalyzes legacy snapshots when loading them', () => {
    const legacy = {
      id: 'legacy',
      label: 'Snapshot lama',
      createdAt: '2026-07-28T00:00:00.000Z',
      items: [
        {
          id: 'one',
          platform: 'other',
          source: 'Sumber',
          text: 'Sebuah posting teknologi yang cukup panjang untuk dianalisis',
          capturedAt: '2026-07-28T00:00:00.000Z',
        },
      ],
      metrics: { totalItems: 1 },
    };
    const [snapshot] = loadSnapshots({ getItem: () => JSON.stringify([legacy]) });
    expect(snapshot?.metrics.analysisVersion).toBe(2);
    expect(snapshot?.metrics.confidence.sampleSize).toBe(1);
  });
});
