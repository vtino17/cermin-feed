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

export type FeedMetrics = {
  totalItems: number;
  uniqueSources: number;
  estimatedMinutes: number;
  sourceDiversity: number;
  topicDiversity: number;
  agencyScore: number;
  baitRate: number;
  repetitionRate: number;
  sourceDistribution: DistributionEntry[];
  topicDistribution: DistributionEntry[];
  platformDistribution: DistributionEntry[];
  patterns: PatternHit[];
  similarPairs: SimilarPair[];
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
  schema: 'cermin.public-summary.v1';
  createdAt: string;
  itemCount: number;
  metrics: Pick<
    FeedMetrics,
    | 'sourceDiversity'
    | 'topicDiversity'
    | 'agencyScore'
    | 'baitRate'
    | 'repetitionRate'
    | 'platformDistribution'
    | 'topicDistribution'
  >;
};
