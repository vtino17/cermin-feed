import type { FeedItem, Platform } from './types';

const platforms = new Set<Platform>(['x', 'linkedin', 'reddit', 'youtube', 'instagram', 'other']);

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeItem(value: unknown, index: number): FeedItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const text = String(item.text ?? item.content ?? '').trim();
  if (!text) return null;
  const rawPlatform = String(item.platform ?? 'other').toLowerCase() as Platform;
  const platform = platforms.has(rawPlatform) ? rawPlatform : 'other';
  const source = String(item.source ?? item.author ?? 'Tidak diketahui').trim();
  const capturedAt = String(item.capturedAt ?? item.captured_at ?? new Date().toISOString());

  return {
    id: String(item.id ?? `import-${index + 1}`),
    platform,
    source,
    text: text.slice(0, 5000),
    capturedAt: Number.isNaN(Date.parse(capturedAt)) ? new Date().toISOString() : capturedAt,
    publishedAt: item.publishedAt ? String(item.publishedAt) : undefined,
    url: item.url ? String(item.url) : undefined,
    likes: Number.isFinite(Number(item.likes)) ? Number(item.likes) : undefined,
    comments: Number.isFinite(Number(item.comments)) ? Number(item.comments) : undefined,
    shares: Number.isFinite(Number(item.shares)) ? Number(item.shares) : undefined,
  };
}

export function parseFeedFile(content: string, filename: string): FeedItem[] {
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(content) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed && Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: unknown[] }).items ?? [])
        : [];
    return values
      .map((value, index) => normalizeItem(value, index))
      .filter((item): item is FeedItem => item !== null);
  }

  const rows = parseCsvRows(content);
  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows
    .map((cells, index) =>
      normalizeItem(
        Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ''])),
        index,
      ),
    )
    .filter((item): item is FeedItem => item !== null);
}
