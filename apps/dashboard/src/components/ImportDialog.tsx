import { useRef, useState } from 'react';
import type { FeedItem } from '@cermin/analyzer';
import { parseFeedFileDetailed } from '@cermin/analyzer';

export function ImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (
    label: string,
    items: FeedItem[],
    meta: { redactionCount: number; issueCount: number },
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState('Snapshot baru');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [redactSensitive, setRedactSensitive] = useState(true);

  if (!open) return null;

  const readFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const parsed = parseFeedFileDetailed(await file.text(), file.name, {
        redactSensitive,
      });
      if (!parsed.items.length)
        throw new Error('Tidak menemukan posting yang memiliki kolom text.');
      onImport(label.trim() || file.name, parsed.items, {
        redactionCount: parsed.redactionCount,
        issueCount: parsed.issues.length,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'File tidak dapat dibaca.');
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Tutup">
          ×
        </button>
        <p className="eyebrow">Analisis lokal</p>
        <h2 id="import-title">Impor snapshot feed</h2>
        <p className="muted">
          Gunakan JSON atau CSV. File dibaca di browser dan tidak dikirim ke mana pun.
        </p>

        <label className="label-field">
          Nama snapshot
          <input value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} />
        </label>

        <label className="redaction-toggle">
          <input
            type="checkbox"
            checked={redactSensitive}
            onChange={(event) => setRedactSensitive(event.target.checked)}
          />
          <span>
            <strong>Redaksi data sensitif</strong>
            <small>
              Email, nomor telepon Indonesia, dan nomor panjang diganti sebelum disimpan.
            </small>
          </span>
        </label>

        <button
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void readFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon">↑</span>
          <strong>Tarik file ke sini</strong>
          <small>atau klik untuk memilih · maksimal diproses di perangkatmu</small>
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="schema-hint">
          <strong>Kolom minimum</strong>
          <code>text, source, platform, capturedAt</code>
        </div>
      </section>
    </div>
  );
}
