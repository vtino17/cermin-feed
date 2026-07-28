import type { FeedItem, ImportIssue, ParsedFeed, Platform } from './types';

const platforms = new Set<Platform>(['x', 'linkedin', 'reddit', 'youtube', 'instagram', 'other']);
const maxImportCharacters = 10 * 1024 * 1024;
const maxImportItems = 500;

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

export function redactSensitiveText(text: string): { text: string; count: number } {
  let count = 0;
  const replace = (input: string, pattern: RegExp, replacement: string) =>
    input.replace(pattern, () => {
      count += 1;
      return replacement;
    });
  let redacted = replace(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
  redacted = replace(
    redacted,
    /(?:\+62|62|0)8[1-9][0-9][\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,5}\b/g,
    '[PHONE]',
  );
  redacted = replace(redacted, /\b(?:\d[ -]*?){13,16}\b/g, '[NUMBER]');
  return { text: redacted, count };
}

function normalizeItem(
  value: unknown,
  index: number,
  redact: boolean,
  issues: ImportIssue[],
): { item: FeedItem | null; redactionCount: number } {
  if (!value || typeof value !== 'object') {
    issues.push({ row: index + 1, field: 'item', message: 'Item bukan object dan dilewati.' });
    return { item: null, redactionCount: 0 };
  }
  const item = value as Record<string, unknown>;
  const text = String(item.text ?? item.content ?? '').trim();
  if (!text) {
    issues.push({ row: index + 1, field: 'text', message: 'Item dilewati karena text kosong.' });
    return { item: null, redactionCount: 0 };
  }
  const rawPlatform = String(item.platform ?? 'other').toLowerCase() as Platform;
  const platform = platforms.has(rawPlatform) ? rawPlatform : 'other';
  const source = String(item.source ?? item.author ?? 'Tidak diketahui').trim();
  const capturedAt = String(item.capturedAt ?? item.captured_at ?? new Date().toISOString());
  if (!item.source && !item.author) {
    issues.push({
      row: index + 1,
      field: 'source',
      message: 'Source tidak tersedia; menggunakan “Tidak diketahui”.',
    });
  }
  const redacted = redact ? redactSensitiveText(text) : { text, count: 0 };
  const redactedSource = redact ? redactSensitiveText(source) : { text: source, count: 0 };
  let url = item.url ? String(item.url) : undefined;
  if (redact && url) {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.search = '';
      parsedUrl.hash = '';
      url = parsedUrl.toString();
    } catch {
      url = redactSensitiveText(url).text;
    }
  }

  return {
    item: {
      id: String(item.id ?? `import-${index + 1}`),
      platform,
      source: redactedSource.text,
      text: redacted.text.slice(0, 5000),
      capturedAt: Number.isNaN(Date.parse(capturedAt)) ? new Date().toISOString() : capturedAt,
      publishedAt: item.publishedAt ? String(item.publishedAt) : undefined,
      url,
      likes: Number.isFinite(Number(item.likes)) ? Number(item.likes) : undefined,
      comments: Number.isFinite(Number(item.comments)) ? Number(item.comments) : undefined,
      shares: Number.isFinite(Number(item.shares)) ? Number(item.shares) : undefined,
    },
    redactionCount: redacted.count + redactedSource.count,
  };
}

export function parseFeedFileDetailed(
  content: string,
  filename: string,
  options: { redactSensitive?: boolean } = {},
): ParsedFeed {
  if (content.length > maxImportCharacters) {
    throw new Error('File terlalu besar. Batas impor adalah 10 MB.');
  }
  const issues: ImportIssue[] = [];
  let values: unknown[];
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(content) as unknown;
    values = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed && Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: unknown[] }).items ?? [])
        : [];
  } else {
    const rows = parseCsvRows(content);
    const headers = rows.shift()?.map((header) => header.trim()) ?? [];
    values = rows.map((cells) =>
      Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ''])),
    );
  }

  if (values.length > maxImportItems) {
    issues.push({
      row: maxImportItems + 1,
      field: 'file',
      message: `Hanya ${maxImportItems} item pertama dianalisis untuk menjaga performa perangkat.`,
    });
  }
  const normalized = values
    .slice(0, maxImportItems)
    .map((value, index) => normalizeItem(value, index, options.redactSensitive ?? false, issues));
  const ids = new Set<string>();
  const items = normalized.flatMap((result, index) => {
    if (!result.item) return [];
    const originalId = result.item.id;
    if (!ids.has(originalId)) {
      ids.add(originalId);
      return [result.item];
    }
    let suffix = index + 1;
    let uniqueId = `${originalId}-${suffix}`;
    while (ids.has(uniqueId)) {
      suffix += 1;
      uniqueId = `${originalId}-${suffix}`;
    }
    ids.add(uniqueId);
    issues.push({
      row: index + 1,
      field: 'id',
      message: `ID duplikat “${originalId}” diubah menjadi “${uniqueId}”.`,
    });
    return [{ ...result.item, id: uniqueId }];
  });
  return {
    items,
    issues,
    redactionCount: normalized.reduce((sum, result) => sum + (result?.redactionCount ?? 0), 0),
  };
}

export function parseFeedFile(content: string, filename: string): FeedItem[] {
  return parseFeedFileDetailed(content, filename).items;
}
