import type { Snapshot } from '@cermin/analyzer';

export type EncryptedArchive = {
  schema: 'cermin.encrypted-archive.v1';
  createdAt: string;
  algorithm: 'AES-GCM';
  keyDerivation: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  iv: string;
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(value: Uint8Array): string {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSnapshot(
  snapshot: Snapshot,
  passphrase: string,
): Promise<EncryptedArchive> {
  if (passphrase.length < 12) throw new Error('Passphrase minimal 12 karakter.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 600000;
  const key = await deriveKey(passphrase, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(snapshot)),
  );
  return {
    schema: 'cermin.encrypted-archive.v1',
    createdAt: new Date().toISOString(),
    algorithm: 'AES-GCM',
    keyDerivation: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: toBase64(salt),
    },
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<Snapshot>;
  return (
    typeof snapshot.id === 'string' &&
    typeof snapshot.label === 'string' &&
    snapshot.label.length <= 120 &&
    typeof snapshot.createdAt === 'string' &&
    Array.isArray(snapshot.items) &&
    snapshot.items.length <= 500 &&
    snapshot.items.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.source === 'string' &&
        item.source.length <= 240 &&
        typeof item.text === 'string' &&
        item.text.length <= 5000 &&
        typeof item.platform === 'string' &&
        typeof item.capturedAt === 'string',
    ) &&
    Boolean(snapshot.metrics)
  );
}

export async function decryptSnapshot(
  archiveInput: string | EncryptedArchive,
  passphrase: string,
): Promise<Snapshot> {
  try {
    const archive =
      typeof archiveInput === 'string'
        ? (JSON.parse(archiveInput) as EncryptedArchive)
        : archiveInput;
    if (
      archive.schema !== 'cermin.encrypted-archive.v1' ||
      archive.algorithm !== 'AES-GCM' ||
      archive.keyDerivation?.name !== 'PBKDF2' ||
      archive.keyDerivation.hash !== 'SHA-256' ||
      !Number.isInteger(archive.keyDerivation.iterations) ||
      archive.keyDerivation.iterations < 100000 ||
      archive.keyDerivation.iterations > 2000000
    ) {
      throw new Error('Format archive tidak dikenali.');
    }
    const salt = fromBase64(archive.keyDerivation.salt);
    const iv = fromBase64(archive.iv);
    if (salt.length !== 16 || iv.length !== 12 || archive.ciphertext.length > 20000000) {
      throw new Error('Format archive tidak dikenali.');
    }
    const key = await deriveKey(passphrase, salt, archive.keyDerivation.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      fromBase64(archive.ciphertext),
    );
    const snapshot = JSON.parse(decoder.decode(plaintext)) as unknown;
    if (!isSnapshot(snapshot)) throw new Error('Isi archive bukan snapshot Cermin.');
    return snapshot;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('snapshot Cermin') || error.message.includes('tidak dikenali'))
    ) {
      throw error;
    }
    throw new Error('Archive tidak dapat dibuka. Periksa passphrase atau integritas file.');
  }
}
