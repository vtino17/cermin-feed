import type { Snapshot } from '@cermin/analyzer';

const storageKey = 'cermin:snapshots:v1';

export function loadSnapshots(storage: Pick<Storage, 'getItem'>): Snapshot[] {
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as Snapshot[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(storage: Pick<Storage, 'setItem'>, snapshots: Snapshot[]) {
  storage.setItem(storageKey, JSON.stringify(snapshots.slice(0, 12)));
}

export function clearSnapshots(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(storageKey);
}
