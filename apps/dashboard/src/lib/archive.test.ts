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
    await expect(encryptSnapshot(snapshot, 'short')).rejects.toThrow('at least 12');
    const archive = await encryptSnapshot(snapshot, 'passphrase-yang-kuat');
    await expect(decryptSnapshot(archive, 'passphrase-yang-salah')).rejects.toThrow(
      'could not be opened',
    );
  });

  it('rejects oversized key material before decoding it', async () => {
    const snapshot = createSnapshot('Secret', items);
    const archive = await encryptSnapshot(snapshot, 'strong-passphrase');
    archive.keyDerivation.salt = 'A'.repeat(1_000_000);

    await expect(decryptSnapshot(archive, 'strong-passphrase')).rejects.toThrow(
      'not recognized',
    );
  });
});
