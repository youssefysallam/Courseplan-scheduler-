import type { Course, Constraints, Section, GeneratedPlan } from ".."; // adjust paths to your existing types
import type { PlanScore, PlanScoreBreakdown, PlanScoringWeights } from "../types/score";

type Meeting = {
  day: string;          // e.g. "Mon"
  startMin: number;     // minutes from 00:00
  endMin: number;
};

function parseTimeToMinutes(t: string): number {
  // expects "HH:MM" 24h. If your dataset differs, swap this with your existing time utils.
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function sectionToMeetings(section: Section): Meeting[] {
  // Adjust to your actual section schema.
  // Common shapes: section.meetings: [{ day, start, end }]
  // If you already have a canonical utility, use it instead.
  const meetings = (section as any).meetings ?? [];
  return meetings.map((m: any) => ({
    day: m.day,
    startMin: typeof m.start === "number" ? m.start : parseTimeToMinutes(m.start),
    endMin: typeof m.end === "number" ? m.end : parseTimeToMinutes(m.end),
  }));
}

function buildSelectedMeetings(plan: GeneratedPlan, coursesByCode: Map<string, Course>): Map<string, Meeting[]> {
  const byDay = new Map<string, Meeting[]>();

  for (const sel of plan.selectedSections) {
    const course = coursesByCode.get(sel.courseCode);
    if (!course) continue;

    const section = course.sections.find((s: any) => s.id === sel.sectionId);
    if (!section) continue;

    for (const mtg of sectionToMeetings(section as any)) {
      const arr = byDay.get(mtg.day) ?? [];
      arr.push(mtg);
      byDay.set(mtg.day, arr);
    }
  }

  // sort each day by start time
  for (const [day, arr] of byDay) {
    arr.sort((a, b) => a.startMin - b.startMin);
    byDay.set(day, arr);
  }

  return byDay;
}

function calcGapMinutes(byDay: Map<string, Meeting[]>): number {
  let gaps = 0;
  for (const [, blocks] of byDay) {
    for (let i = 1; i < blocks.length; i++) {
      const gap = blocks[i].startMin - blocks[i - 1].endMin;
      if (gap > 0) gaps += gap;
    }
  }
  return gaps;
}

function calcDistinctDays(byDay: Map<string, Meeting[]>): number {
  let count = 0;
  for (const [, blocks] of byDay) {
    if (blocks.length > 0) count++;
  }
  return count;
}

function calcDailyMinutes(byDay: Map<string, Meeting[]>): number[] {
  const mins: number[] = [];
  for (const [, blocks] of byDay) {
    if (blocks.length === 0) continue;
    const total = blocks.reduce((acc, b) => acc + (b.endMin - b.startMin), 0);
    mins.push(total);
  }
  return mins;
}

function stddev(xs: number[]): number {
  if (xs.length <= 1) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varr = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(varr);
}

function weightOf(weights: PlanScoringWeights | undefined, key: keyof PlanScoreBreakdown, fallback: number): number {
  return weights?.[key] ?? fallback;
}

/**
 * Higher score is better.
 */
export function scorePlan(args: {
  plan: GeneratedPlan;
  courses: Course[];
  constraints: Constraints;
  weights?: PlanScoringWeights;
}): PlanScore {
  const { plan, courses, constraints, weights } = args;
  const coursesByCode = new Map(courses.map((c) => [c.code, c] as const));
  const byDay = buildSelectedMeetings(plan, coursesByCode);

  const gapMinutes = calcGapMinutes(byDay);
  const dayCount = calcDistinctDays(byDay);
  const dailyMins = calcDailyMinutes(byDay);
  const balancePenalty = stddev(dailyMins);

  // Credits: prefer meeting minCredits; also slight reward for higher credits (within maxCredits)
  // If below minCredits, reward closer to minCredits (less negative).
  const minC = constraints.minCredits ?? 0;
  const creditDelta = plan.totalCredits - minC;

  const breakdown: PlanScoreBreakdown = {
    credits: creditDelta,                 // bigger is better
    gaps: -gapMinutes,                    // fewer gaps => less negative => better
    days: -dayCount,                      // fewer days => better
    balance: -balancePenalty,             // lower stddev => better
  };

  const total =
    breakdown.credits * weightOf(weights, "credits", 3) +
    breakdown.gaps * weightOf(weights, "gaps", 0.02) +
    breakdown.days * weightOf(weights, "days", 5) +
    breakdown.balance * weightOf(weights, "balance", 0.05);

  return { total, breakdown };
}
