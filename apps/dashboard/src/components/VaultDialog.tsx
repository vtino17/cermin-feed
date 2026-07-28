import { useState } from 'react';
import type { Snapshot } from '@cermin/analyzer';
import { decryptSnapshot, encryptSnapshot } from '../lib/archive';

function downloadArchive(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cermin-encrypted-${Date.now()}.cermin`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VaultDialog({
  open,
  snapshot,
  onClose,
  onRestore,
}: {
  open: boolean;
  snapshot: Snapshot;
  onClose: () => void;
  onRestore: (snapshot: Snapshot) => void;
}) {
  const [mode, setMode] = useState<'backup' | 'restore'>('backup');
  const [passphrase, setPassphrase] = useState('');
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const close = () => {
    setPassphrase('');
    setFile(undefined);
    setError('');
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'backup') {
        downloadArchive(await encryptSnapshot(snapshot, passphrase));
        close();
      } else {
        if (!file) throw new Error('Pilih file .cermin terlebih dahulu.');
        if (file.size > 15 * 1024 * 1024) throw new Error('Archive melebihi batas 15 MB.');
        onRestore(await decryptSnapshot(await file.text(), passphrase));
        close();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Operasi vault gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="import-dialog vault-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" onClick={close} aria-label="Tutup">
          ×
        </button>
        <p className="eyebrow">Encrypted local vault</p>
        <h2 id="vault-title">Backup tanpa membuka isi.</h2>
        <p className="muted">
          AES-256-GCM dengan kunci dari PBKDF2-SHA-256. Passphrase tidak disimpan dan tidak dapat
          dipulihkan.
        </p>
        <div className="vault-tabs">
          <button
            type="button"
            className={mode === 'backup' ? 'active' : ''}
            onClick={() => setMode('backup')}
          >
            Buat backup
          </button>
          <button
            type="button"
            className={mode === 'restore' ? 'active' : ''}
            onClick={() => setMode('restore')}
          >
            Pulihkan
          </button>
        </div>
        {mode === 'restore' && (
          <label className="archive-file">
            File archive
            <input
              type="file"
              accept=".cermin,application/json"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </label>
        )}
        <label className="label-field">
          Passphrase
          <input
            type="password"
            minLength={12}
            autoComplete="new-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Minimal 12 karakter"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button full"
          type="button"
          disabled={busy || passphrase.length < 12}
          onClick={() => void submit()}
        >
          {busy ? 'Memproses…' : mode === 'backup' ? 'Enkripsi dan unduh' : 'Dekripsi di perangkat'}
        </button>
      </section>
    </div>
  );
}
