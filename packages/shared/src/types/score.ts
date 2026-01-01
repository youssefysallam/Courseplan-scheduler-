export type PlanScoreBreakdown = {
  credits: number;   // closeness to minCredits / credit preference
  gaps: number;      // idle time between classes
  days: number;      // fewer days is better
  balance: number;   // balanced workload across days
};

export type PlanScore = {
  total: number;
  breakdown: PlanScoreBreakdown;
};

export type PlanScoringWeights = Partial<Record<keyof PlanScoreBreakdown, number>>;

export type ScoringOptions = {
  weights?: PlanScoringWeights;
  maxCandidates?: number; // how many valid plans to consider
};
