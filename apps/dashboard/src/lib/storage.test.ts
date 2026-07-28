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
});
