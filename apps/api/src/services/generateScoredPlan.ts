import { scorePlan } from "@courseplan/shared";
import type { Course, Constraints, PlanResult, ScoringOptions } from "@courseplan/shared";
import { generatePlanCandidates } from "./scheduler"; // adjust path

export type ScoredPlanResponse = PlanResult & {
  score: ReturnType<typeof scorePlan>;
  scoreExplanation: string[];
  candidatesConsidered: number;
};

export function generateScoredPlan(args: {
  courses: Course[];
  wishlistCodes: string[];
  completedCodes: string[];
  constraints: Constraints;
  scoring?: ScoringOptions;
}): ScoredPlanResponse {
  const { courses, wishlistCodes, completedCodes, constraints, scoring } = args;

  const maxCandidates = scoring?.maxCandidates ?? 200;
  const candidates = generatePlanCandidates({
    courses,
    wishlistCodes,
    completedCodes,
    constraints,
    maxCandidates,
  });

  // Fallback: if candidates returns empty (should only happen if no valid plan),
  // you can call your existing generatePlan() and score it, or just return your existing failure response.
  if (candidates.length === 0) {
    // Replace with your existing behavior.
    // For now, return a minimal “empty” with explanation.
    const empty: PlanResult = {
      selectedCourseCodes: [],
      selectedSections: [],
      totalCredits: 0,
      explanation: ["No valid schedule found."],
      rejected: [],
    };

    const score = scorePlan({ plan: empty, courses, constraints, weights: scoring?.weights });
    return {
      ...empty,
      score,
      scoreExplanation: ["No candidates to score."],
      candidatesConsidered: 0,
    };
  }

  let best = candidates[0];
  let bestScore = scorePlan({ plan: best, courses, constraints, weights: scoring?.weights });

  for (let i = 1; i < candidates.length; i++) {
    const s = scorePlan({ plan: candidates[i], courses, constraints, weights: scoring?.weights });

    // Higher total is better; tie-breaker: higher credits; then deterministic (keep earlier)
    if (s.total > bestScore.total || (s.total === bestScore.total && candidates[i].totalCredits > best.totalCredits)) {
      best = candidates[i];
      bestScore = s;
    }
  }

  const scoreExplanation = [
    `Scoring considered ${candidates.length} candidate schedule(s).`,
    `Score total = ${bestScore.total.toFixed(2)}.`,
    `Breakdown: credits=${bestScore.breakdown.credits.toFixed(2)}, gaps=${bestScore.breakdown.gaps.toFixed(2)}, days=${bestScore.breakdown.days.toFixed(2)}, balance=${bestScore.breakdown.balance.toFixed(2)}.`,
  ];

  return {
    ...best,
    score: bestScore,
    scoreExplanation,
    candidatesConsidered: candidates.length,
  };
}
