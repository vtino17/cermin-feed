// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSnapshot, type FeedItem } from '@cermin/analyzer';
import { decryptSnapshot, encryptSnapshot } from './archive';

const items: FeedItem[] = [
  {
    id: 'one',
    platform: 'reddit',
    source: 'private-source',
    text: 'Isi snapshot yang harus terenkripsi',
    capturedAt: '2026-07-28T00:00:00.000Z',
  },
];

describe('encrypted archive', () => {
  it('round-trips a snapshot without plaintext leakage', async () => {
    const snapshot = createSnapshot('Rahasia', items);
    const archive = await encryptSnapshot(snapshot, 'passphrase-yang-kuat');
    expect(JSON.stringify(archive)).not.toContain('private-source');
    await expect(decryptSnapshot(archive, 'passphrase-yang-kuat')).resolves.toMatchObject({
      label: 'Rahasia',
      items,
    });
  });

  it('rejects short and incorrect passphrases', async () => {
    const snapshot = createSnapshot('Rahasia', items);
    await expect(encryptSnapshot(snapshot, 'pendek')).rejects.toThrow('minimal 12');
    const archive = await encryptSnapshot(snapshot, 'passphrase-yang-kuat');
    await expect(decryptSnapshot(archive, 'passphrase-yang-salah')).rejects.toThrow(
      'tidak dapat dibuka',
    );
  });
});
