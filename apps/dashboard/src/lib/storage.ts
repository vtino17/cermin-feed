import { analyzeFeed, type Snapshot } from '@cermin/analyzer';

const storageKey = 'cermin:snapshots:v1';

export function loadSnapshots(storage: Pick<Storage, 'getItem'>): Snapshot[] {
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return (value as Snapshot[])
      .filter(
        (snapshot) =>
          snapshot &&
          typeof snapshot.id === 'string' &&
          typeof snapshot.label === 'string' &&
          typeof snapshot.createdAt === 'string' &&
          Array.isArray(snapshot.items),
      )
      .slice(0, 12)
      .map((snapshot) => ({
        ...snapshot,
        metrics:
          snapshot.metrics?.analysisVersion === 2 ? snapshot.metrics : analyzeFeed(snapshot.items),
      }));
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
