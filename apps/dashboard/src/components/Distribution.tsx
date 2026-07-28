import type { DistributionEntry } from '@cermin/analyzer';

const palette = ['#f6c667', '#e6845c', '#7ab6a2', '#8da0d6', '#bc8dc9', '#7890a2'];

export function Distribution({
  entries,
  limit = 6,
}: {
  entries: DistributionEntry[];
  limit?: number;
}) {
  return (
    <div className="distribution">
      {entries.slice(0, limit).map((entry, index) => (
        <div className="distribution-row" key={entry.label}>
          <span className="distribution-label">
            <i style={{ background: palette[index % palette.length] }} />
            {entry.label}
          </span>
          <div className="distribution-track">
            <span
              style={{
                width: `${entry.share}%`,
                background: palette[index % palette.length],
              }}
            />
          </div>
          <strong>{entry.share}%</strong>
        </div>
      ))}
    </div>
  );
}
