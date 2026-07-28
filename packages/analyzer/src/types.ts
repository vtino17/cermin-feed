export type Platform = 'x' | 'linkedin' | 'reddit' | 'youtube' | 'instagram' | 'other';

export type FeedItem = {
  id: string;
  platform: Platform;
  source: string;
  text: string;
  capturedAt: string;
  publishedAt?: string;
  url?: string;
  likes?: number;
  comments?: number;
  shares?: number;
};

export type Topic =
  | 'technology'
  | 'politics'
  | 'economy'
  | 'health'
  | 'environment'
  | 'culture'
  | 'education'
  | 'entertainment'
  | 'sports'
  | 'lifestyle'
  | 'other';

export type DistributionEntry = {
  label: string;
  count: number;
  share: number;
};

export type PatternHit = {
  itemId: string;
  pattern: 'engagement-bait' | 'urgency' | 'outrage' | 'authority-claim';
  evidence: string[];
};

export type SimilarPair = {
  firstId: string;
  secondId: string;
  similarity: number;
};

export type NarrativeCluster = {
  id: string;
  itemIds: string[];
  sourceCount: number;
  averageSimilarity: number;
  topTerms: string[];
};

export type AnalysisConfidence = {
  score: number;
  sampleSize: number;
  metadataCompleteness: number;
  reasons: string[];
};

export type FeedMetrics = {
  analysisVersion: 2;
  totalItems: number;
  uniqueSources: number;
  estimatedMinutes: number;
  sourceDiversity: number;
  topicDiversity: number;
  sourceConcentration: number;
  temporalBurst: number;
  agencyScore: number;
  baitRate: number;
  repetitionRate: number;
  sourceDistribution: DistributionEntry[];
  topicDistribution: DistributionEntry[];
  platformDistribution: DistributionEntry[];
  patterns: PatternHit[];
  similarPairs: SimilarPair[];
  narrativeClusters: NarrativeCluster[];
  temporalDistribution: DistributionEntry[];
  confidence: AnalysisConfidence;
  insights: string[];
};

export type Snapshot = {
  id: string;
  label: string;
  createdAt: string;
  items: FeedItem[];
  metrics: FeedMetrics;
};

export type PublicSummary = {
  schema: 'cermin.public-summary.v2';
  createdAt: string;
  itemCount: number;
  metrics: Pick<
    FeedMetrics,
    | 'sourceDiversity'
    | 'topicDiversity'
    | 'agencyScore'
    | 'baitRate'
    | 'repetitionRate'
    | 'sourceConcentration'
    | 'temporalBurst'
    | 'platformDistribution'
    | 'topicDistribution'
  >;
  confidence: Pick<AnalysisConfidence, 'score' | 'sampleSize' | 'metadataCompleteness'>;
};

export type SnapshotComparison = {
  baselineId: string;
  currentId: string;
  deltas: {
    agencyScore: number;
    sourceDiversity: number;
    topicDiversity: number;
    baitRate: number;
    repetitionRate: number;
  };
  emergingTopics: DistributionEntry[];
  recedingTopics: DistributionEntry[];
  summary: string[];
};

export type ImportIssue = {
  row: number;
  field: string;
  message: string;
};

export type ParsedFeed = {
  items: FeedItem[];
  issues: ImportIssue[];
  redactionCount: number;
};
