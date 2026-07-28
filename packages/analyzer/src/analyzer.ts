import { patternTerms, stopWords, topicTerms } from './dictionaries';
import type {
  DistributionEntry,
  FeedItem,
  FeedMetrics,
  NarrativeCluster,
  PatternHit,
  PublicSummary,
  SimilarPair,
  Snapshot,
  SnapshotComparison,
  Topic,
} from './types';

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 0) => Number(value.toFixed(digits));

export function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase('id')
    .normalize('NFKD')
    .replace(/https?:\/\/\S+|[@#][\p{L}\p{N}_]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function classifyTopic(text: string): Topic {
  const normalized = ` ${text.toLocaleLowerCase('id')} `;
  const scores = Object.entries(topicTerms).map(([topic, terms]) => ({
    topic: topic as Topic,
    score: terms.reduce((total, term) => total + (normalized.includes(` ${term} `) ? 1 : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].topic : 'other';
}

export function detectPatterns(item: FeedItem): PatternHit[] {
  const normalized = item.text.toLocaleLowerCase('id');
  return Object.entries(patternTerms).flatMap(([pattern, terms]) => {
    const evidence = terms.filter((term) => normalized.includes(term));
    return evidence.length
      ? [
          {
            itemId: item.id,
            pattern: pattern as PatternHit['pattern'],
            evidence,
          },
        ]
      : [];
  });
}

export function cosineSimilarity(first: string, second: string): number {
  const firstCounts = new Map<string, number>();
  const secondCounts = new Map<string, number>();
  tokenize(first).forEach((token) => firstCounts.set(token, (firstCounts.get(token) ?? 0) + 1));
  tokenize(second).forEach((token) => secondCounts.set(token, (secondCounts.get(token) ?? 0) + 1));
  const vocabulary = new Set([...firstCounts.keys(), ...secondCounts.keys()]);
  const dot = [...vocabulary].reduce(
    (sum, token) => sum + (firstCounts.get(token) ?? 0) * (secondCounts.get(token) ?? 0),
    0,
  );
  const normA = Math.sqrt([...firstCounts.values()].reduce((sum, value) => sum + value ** 2, 0));
  const normB = Math.sqrt([...secondCounts.values()].reduce((sum, value) => sum + value ** 2, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}

function distribution(values: string[]): DistributionEntry[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: round((count / values.length) * 100, 1) }))
    .sort((a, b) => b.count - a.count);
}

export function normalizedShannon(entries: DistributionEntry[]): number {
  if (entries.length <= 1) return 0;
  const entropy = entries.reduce((sum, entry) => {
    const probability = entry.share / 100;
    return probability > 0 ? sum - probability * Math.log(probability) : sum;
  }, 0);
  return round((entropy / Math.log(entries.length)) * 100);
}

function findSimilarPairs(items: FeedItem[]): SimilarPair[] {
  const pairs: SimilarPair[] = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      const left = items[first];
      const right = items[second];
      if (!left || !right) continue;
      const similarity = cosineSimilarity(left.text, right.text);
      if (similarity >= 0.62) {
        pairs.push({
          firstId: left.id,
          secondId: right.id,
          similarity: round(similarity * 100),
        });
      }
    }
  }
  return pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
}

function buildNarrativeClusters(items: FeedItem[], pairs: SimilarPair[]): NarrativeCluster[] {
  const parent = new Map(items.map((item) => [item.id, item.id]));
  const find = (id: string): string => {
    const value = parent.get(id) ?? id;
    if (value === id) return id;
    const root = find(value);
    parent.set(id, root);
    return root;
  };
  const union = (first: string, second: string) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
  };
  pairs.forEach((pair) => union(pair.firstId, pair.secondId));

  const grouped = new Map<string, string[]>();
  items.forEach((item) => {
    const root = find(item.id);
    grouped.set(root, [...(grouped.get(root) ?? []), item.id]);
  });

  return [...grouped.values()]
    .filter((itemIds) => itemIds.length > 1)
    .map((itemIds, index) => {
      const clusterItems = items.filter((item) => itemIds.includes(item.id));
      const clusterPairs = pairs.filter(
        (pair) => itemIds.includes(pair.firstId) && itemIds.includes(pair.secondId),
      );
      const termCounts = new Map<string, number>();
      clusterItems
        .flatMap((item) => tokenize(item.text))
        .forEach((term) => {
          termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
        });
      const topTerms = [...termCounts.entries()]
        .filter(([, count]) => count > 1)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([term]) => term);
      return {
        id: `cluster-${index + 1}`,
        itemIds,
        sourceCount: new Set(clusterItems.map((item) => item.source)).size,
        averageSimilarity: round(
          clusterPairs.reduce((sum, pair) => sum + pair.similarity, 0) /
            Math.max(1, clusterPairs.length),
        ),
        topTerms,
      };
    })
    .sort((a, b) => b.itemIds.length - a.itemIds.length);
}

function analysisConfidence(items: FeedItem[]) {
  const completeFields = items.reduce(
    (sum, item) =>
      sum +
      [item.text.length >= 24, item.source !== 'Tidak diketahui', Boolean(item.capturedAt)].filter(
        Boolean,
      ).length,
    0,
  );
  const metadataCompleteness = round((completeFields / (items.length * 3)) * 100);
  const sampleScore = clamp((Math.log2(items.length + 1) / Math.log2(101)) * 100);
  const score = round(sampleScore * 0.65 + metadataCompleteness * 0.35);
  const reasons = [
    items.length < 20
      ? 'Snapshot kecil; pola dapat berubah setelah lebih banyak item.'
      : 'Ukuran snapshot cukup untuk refleksi awal.',
    metadataCompleteness < 75
      ? 'Sebagian metadata sumber atau waktu tidak lengkap.'
      : 'Metadata utama cukup lengkap.',
  ];
  return { score, sampleSize: items.length, metadataCompleteness, reasons };
}

export function analyzeFeed(items: FeedItem[]): FeedMetrics {
  if (!items.length) {
    return {
      analysisVersion: 2,
      totalItems: 0,
      uniqueSources: 0,
      estimatedMinutes: 0,
      sourceDiversity: 0,
      topicDiversity: 0,
      sourceConcentration: 0,
      temporalBurst: 0,
      agencyScore: 0,
      baitRate: 0,
      repetitionRate: 0,
      sourceDistribution: [],
      topicDistribution: [],
      platformDistribution: [],
      patterns: [],
      similarPairs: [],
      narrativeClusters: [],
      temporalDistribution: [],
      confidence: {
        score: 0,
        sampleSize: 0,
        metadataCompleteness: 0,
        reasons: ['Belum ada item untuk dianalisis.'],
      },
      insights: ['Belum ada item untuk dianalisis.'],
    };
  }

  const sourceDistribution = distribution(items.map((item) => item.source.trim() || 'unknown'));
  const topicDistribution = distribution(items.map((item) => classifyTopic(item.text)));
  const platformDistribution = distribution(items.map((item) => item.platform));
  const temporalDistribution = distribution(
    items.map((item) => {
      const date = new Date(item.capturedAt);
      return Number.isNaN(date.getTime())
        ? 'unknown'
        : `${String(date.getHours()).padStart(2, '0')}:00`;
    }),
  );
  const patterns = items.flatMap(detectPatterns);
  const similarPairs = findSimilarPairs(items);
  const narrativeClusters = buildNarrativeClusters(items, similarPairs);
  const baitItemCount = new Set(patterns.map((hit) => hit.itemId)).size;
  const repeatedItemCount = new Set(similarPairs.flatMap((pair) => [pair.firstId, pair.secondId]))
    .size;
  const sourceDiversity = normalizedShannon(sourceDistribution);
  const topicDiversity = normalizedShannon(topicDistribution);
  const sourceConcentration = round(
    sourceDistribution.reduce((sum, entry) => sum + (entry.share / 100) ** 2, 0) * 100,
  );
  const temporalBurst = round(temporalDistribution[0]?.share ?? 0);
  const baitRate = round((baitItemCount / items.length) * 100);
  const repetitionRate = round((repeatedItemCount / items.length) * 100);
  const dominantSource = sourceDistribution[0];
  const dominantTopic = topicDistribution[0];
  const concentrationPenalty = dominantSource ? Math.max(0, dominantSource.share - 25) : 0;
  const agencyScore = round(
    clamp(
      sourceDiversity * 0.33 +
        topicDiversity * 0.27 +
        (100 - baitRate) * 0.2 +
        (100 - repetitionRate) * 0.2 -
        concentrationPenalty * 0.18 -
        Math.max(0, temporalBurst - 60) * 0.05,
    ),
  );
  const words = items.reduce((sum, item) => sum + item.text.split(/\s+/).length, 0);

  const insights = [
    dominantSource && dominantSource.share >= 35
      ? `${dominantSource.label} menyumbang ${dominantSource.share}% snapshot—lebih dari sepertiga feed.`
      : `Tidak ada satu sumber yang mengambil lebih dari sepertiga snapshot.`,
    dominantTopic
      ? `Topik paling sering adalah ${dominantTopic.label} (${dominantTopic.share}%).`
      : 'Belum ada topik dominan.',
    baitRate >= 25
      ? `${baitRate}% item memuat pola ajakan interaksi, urgensi, kemarahan, atau klaim otoritas.`
      : `Pola manipulasi yang terdeteksi relatif rendah (${baitRate}%).`,
    repetitionRate >= 25
      ? `${repetitionRate}% item memiliki kemiripan tinggi dengan item lain.`
      : `Repetisi narasi yang terdeteksi relatif rendah (${repetitionRate}%).`,
  ];

  return {
    analysisVersion: 2,
    totalItems: items.length,
    uniqueSources: sourceDistribution.length,
    estimatedMinutes: Math.max(1, Math.ceil(words / 220)),
    sourceDiversity,
    topicDiversity,
    sourceConcentration,
    temporalBurst,
    agencyScore,
    baitRate,
    repetitionRate,
    sourceDistribution,
    topicDistribution,
    platformDistribution,
    patterns,
    similarPairs,
    narrativeClusters,
    temporalDistribution,
    confidence: analysisConfidence(items),
    insights,
  };
}

export function createSnapshot(label: string, items: FeedItem[], now = new Date()): Snapshot {
  return {
    id: `snapshot-${now.getTime()}`,
    label,
    createdAt: now.toISOString(),
    items,
    metrics: analyzeFeed(items),
  };
}

export function toPublicSummary(snapshot: Snapshot): PublicSummary {
  const { metrics } = snapshot;
  return {
    schema: 'cermin.public-summary.v2',
    createdAt: snapshot.createdAt,
    itemCount: metrics.totalItems,
    metrics: {
      sourceDiversity: metrics.sourceDiversity,
      topicDiversity: metrics.topicDiversity,
      agencyScore: metrics.agencyScore,
      baitRate: metrics.baitRate,
      repetitionRate: metrics.repetitionRate,
      sourceConcentration: metrics.sourceConcentration,
      temporalBurst: metrics.temporalBurst,
      platformDistribution: metrics.platformDistribution,
      topicDistribution: metrics.topicDistribution,
    },
    confidence: {
      score: metrics.confidence.score,
      sampleSize: metrics.confidence.sampleSize,
      metadataCompleteness: metrics.confidence.metadataCompleteness,
    },
  };
}

export function compareSnapshots(baseline: Snapshot, current: Snapshot): SnapshotComparison {
  const delta = (currentValue: number, baselineValue: number) =>
    round(currentValue - baselineValue, 1);
  const baselineTopics = new Map(
    baseline.metrics.topicDistribution.map((entry) => [entry.label, entry.share]),
  );
  const currentTopics = new Map(
    current.metrics.topicDistribution.map((entry) => [entry.label, entry.share]),
  );
  const changes = [...new Set([...baselineTopics.keys(), ...currentTopics.keys()])].map(
    (label) => ({
      label,
      count: 0,
      share: delta(currentTopics.get(label) ?? 0, baselineTopics.get(label) ?? 0),
    }),
  );
  const deltas = {
    agencyScore: delta(current.metrics.agencyScore, baseline.metrics.agencyScore),
    sourceDiversity: delta(current.metrics.sourceDiversity, baseline.metrics.sourceDiversity),
    topicDiversity: delta(current.metrics.topicDiversity, baseline.metrics.topicDiversity),
    baitRate: delta(current.metrics.baitRate, baseline.metrics.baitRate),
    repetitionRate: delta(current.metrics.repetitionRate, baseline.metrics.repetitionRate),
  };

  return {
    baselineId: baseline.id,
    currentId: current.id,
    deltas,
    emergingTopics: changes.filter((entry) => entry.share > 0).sort((a, b) => b.share - a.share),
    recedingTopics: changes
      .filter((entry) => entry.share < 0)
      .sort((a, b) => a.share - b.share)
      .map((entry) => ({ ...entry, share: Math.abs(entry.share) })),
    summary: [
      deltas.agencyScore === 0
        ? 'Ruang kendali tidak berubah.'
        : `Ruang kendali ${deltas.agencyScore > 0 ? 'naik' : 'turun'} ${Math.abs(deltas.agencyScore)} poin.`,
      deltas.baitRate === 0
        ? 'Proporsi pola pemicu stabil.'
        : `Pola pemicu ${deltas.baitRate > 0 ? 'naik' : 'turun'} ${Math.abs(deltas.baitRate)} poin.`,
    ],
  };
}
