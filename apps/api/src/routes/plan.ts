import { Router } from "express";
import fs from "fs";
import path from "path";
import type { Course, Rejection, Section, SelectedSection } from "@courseplan/shared";
import { sectionOverlaps } from "@courseplan/shared";

type GeneratePlanRequest = {
  wishlist: string[];
  completed: string[];
  constraints?: {
    minCredits?: number;
    maxCredits?: number;
  };
  scoring?: {
    maxCandidates?: number;
    weights?: Partial<{
      credits: number;
      gaps: number;
      days: number;
      balance: number;
    }>;
  };
};

type Pick = { course: Course; section: Section };

type PlanScoreBreakdown = {
  credits: number;
  gaps: number;
  days: number;
  balance: number;
};

type PlanScore = {
  total: number;
  breakdown: PlanScoreBreakdown;
};

type GeneratedPlanResponse = {
  selectedCourseCodes: string[];
  selectedSections: SelectedSection[];
  totalCredits: number;
  explanation: string[];
  rejected: Rejection[];
  score: number;
  scoreBreakdown: PlanScoreBreakdown;
  scoreExplanation: string[];
  candidatesConsidered: number;
};

const DATASET_PATH = path.resolve(
  __dirname,
  "../../../../packages/shared/dataset/data/courses.sample.json"
);

function loadCoursesFromDataset(): Course[] {
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  return JSON.parse(raw) as Course[];
}

function hasConflict(current: Pick[], nextSection: Section): boolean {
  for (const p of current) {
    if (sectionOverlaps(p.section as any, nextSection as any)) return true;
  }
  return false;
}

function totalCreditsOf(picks: Pick[]): number {
  return picks.reduce((sum, p) => sum + (p.course.credits ?? 0), 0);
}

function getMeetings(section: any): Array<{ day: string; start: string | number; end: string | number }> {
  if (Array.isArray(section?.timeSlots)) {
    return section.timeSlots.map((ts: any) => ({
      day: ts.day,
      start: ts.startMin, // already minutes
      end: ts.endMin,     // already minutes
    }));
  }

  // Other formats (safe to keep)
  if (Array.isArray(section?.meetings)) return section.meetings;
  if (Array.isArray(section?.times)) return section.times;
  if (Array.isArray(section?.schedule)) return section.schedule;

  return [];
}


function timeToMinutes(t: string | number): number {
  if (typeof t === "number") return t;
  const [hh, mm] = String(t).split(":").map((x) => Number(x));
  return hh * 60 + mm;
}

function buildMeetingsByDay(picks: Pick[]): Map<string, Array<{ startMin: number; endMin: number }>> {
  const byDay = new Map<string, Array<{ startMin: number; endMin: number }>>();

  for (const p of picks) {
    const meetings = getMeetings(p.section as any);
    for (const m of meetings) {
      const day = m.day;
      const startMin = timeToMinutes(m.start);
      const endMin = timeToMinutes(m.end);

      const arr = byDay.get(day) ?? [];
      arr.push({ startMin, endMin });
      byDay.set(day, arr);
    }
  }

  for (const [day, blocks] of byDay) {
    blocks.sort((a, b) => a.startMin - b.startMin);
    byDay.set(day, blocks);
  }

  return byDay;
}

function calcGapMinutes(byDay: Map<string, Array<{ startMin: number; endMin: number }>>): number {
  let gaps = 0;
  for (const [, blocks] of byDay) {
    for (let i = 1; i < blocks.length; i++) {
      const gap = blocks[i].startMin - blocks[i - 1].endMin;
      if (gap > 0) gaps += gap;
    }
  }
  return gaps;
}

function calcDistinctDays(byDay: Map<string, Array<{ startMin: number; endMin: number }>>): number {
  let count = 0;
  for (const [, blocks] of byDay) {
    if (blocks.length > 0) count++;
  }
  return count;
}

function calcDailyMinutes(byDay: Map<string, Array<{ startMin: number; endMin: number }>>): number[] {
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
  const variance = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function scoreCandidate(args: {
  picks: Pick[];
  minCredits: number;
  weights?: Partial<{ credits: number; gaps: number; days: number; balance: number }>;
}): PlanScore {
  const { picks, minCredits, weights } = args;

  const wCredits = weights?.credits ?? 3;
  const wGaps = weights?.gaps ?? 0.02;
  const wDays = weights?.days ?? 5;
  const wBalance = weights?.balance ?? 0.05;

  const credits = totalCreditsOf(picks);
  const byDay = buildMeetingsByDay(picks);

  const gapMinutes = calcGapMinutes(byDay);
  const dayCount = calcDistinctDays(byDay);
  const dailyMins = calcDailyMinutes(byDay);
  const balancePenalty = stddev(dailyMins);

  const breakdown: PlanScoreBreakdown = {
    credits: credits - minCredits,
    gaps: -gapMinutes,
    days: -dayCount,
    balance: -balancePenalty
  };

  const total =
    breakdown.credits * wCredits +
    breakdown.gaps * wGaps +
    breakdown.days * wDays +
    breakdown.balance * wBalance;

  return { total, breakdown };
}

function generateCandidates(eligible: Course[], maxCredits: number, maxCandidates: number): Pick[][] {
  const candidates: Pick[][] = [];

  function dfs(i: number, current: Pick[]) {
    if (candidates.length >= maxCandidates) return;

    const curCredits = totalCreditsOf(current);
    if (curCredits > maxCredits) return;

    if (i === eligible.length) {
      candidates.push(current.map((p) => ({ course: p.course, section: p.section })));
      return;
    }

    const course = eligible[i];

    dfs(i + 1, current);

    const sections = course.sections ?? [];
    for (const sec of sections) {
      if (hasConflict(current, sec)) continue;

      current.push({ course, section: sec });
      dfs(i + 1, current);
      current.pop();

      if (candidates.length >= maxCandidates) return;
    }
  }

  dfs(0, []);
  return candidates;
}

export function planRouter() {
  const router = Router();

  router.post("/generate", (req, res) => {
    const body = req.body as GeneratePlanRequest;

    const wishlist = body.wishlist ?? [];
    const completedArr = body.completed ?? [];
    const completed = new Set(completedArr);

    const minCredits = body.constraints?.minCredits ?? 12;
    const maxCredits = body.constraints?.maxCredits ?? 16;

    const maxCandidates = body.scoring?.maxCandidates ?? 200;
    const weights = body.scoring?.weights;

    const allCourses = loadCoursesFromDataset();
    const byCode = new Map(allCourses.map((c) => [c.code, c] as const));

    const rejected: Rejection[] = [];
    const prereqEligible: Course[] = [];

    for (const code of wishlist) {
      const course = byCode.get(code);

      if (!course) {
        rejected.push({ courseCode: code, reason: "Course not found in dataset" });
        continue;
      }

      if (completed.has(code)) {
        rejected.push({ courseCode: code, reason: "Already completed" });
        continue;
      }

      const prereqs: string[] = (course as any).prereqs ?? [];
      const missing = prereqs.filter((p) => !completed.has(p));

      if (missing.length > 0) {
        rejected.push({
          courseCode: course.code,
          reason: `Missing prereqs: ${missing.join(", ")}`
        });
        continue;
      }

      prereqEligible.push(course);
    }

    const eligible: Course[] = [];
    for (const c of prereqEligible) {
      const sections = c.sections ?? [];
      if (sections.length === 0) {
        rejected.push({ courseCode: c.code, reason: "No sections available" });
        continue;
      }
      eligible.push(c);
    }

    const candidates = generateCandidates(eligible, maxCredits, maxCandidates);

    let bestPicks: Pick[] = [];
    let bestScore: PlanScore = scoreCandidate({ picks: bestPicks, minCredits, weights });

    for (const cand of candidates) {
      const s = scoreCandidate({ picks: cand, minCredits, weights });

      const candCredits = totalCreditsOf(cand);
      const bestCredits = totalCreditsOf(bestPicks);

      if (s.total > bestScore.total || (s.total === bestScore.total && candCredits > bestCredits)) {
        bestPicks = cand;
        bestScore = s;
      }
    }

    const selectedSections: SelectedSection[] = bestPicks.map((p) => ({
      courseCode: p.course.code,
      sectionId: (p.section as any).id
    }));

    const selectedCourseCodes = bestPicks.map((p) => p.course.code);
    const totalCredits = totalCreditsOf(bestPicks);

    const explanation: string[] = [
      `Wishlist: ${wishlist.join(", ") || "(none)"}`,
      `Completed: ${completedArr.join(", ") || "(none)"}`,
      `Eligible after prereq checks: ${prereqEligible.map((c) => c.code).join(", ") || "(none)"}`,
      `Eligible with sections: ${eligible.map((c) => c.code).join(", ") || "(none)"}`,
      `Picked sections (conflict-free): ${
        selectedSections.map((s) => `${s.courseCode}:${s.sectionId}`).join(", ") || "(none)"
      }`,
      `Total credits: ${totalCredits} (target ${minCredits}-${maxCredits})`
    ];

    if (totalCredits < minCredits) {
      explanation.push(
        `Could not reach minCredits=${minCredits} within maxCredits=${maxCredits} without conflicts/prereq violations.`
      );
    }

    const scoreExplanation: string[] = [
      `Scored ${candidates.length} candidate schedule(s) (cap=${maxCandidates}).`,
      `Score total=${bestScore.total.toFixed(2)}.`,
      `Breakdown: credits=${bestScore.breakdown.credits.toFixed(2)}, gaps=${bestScore.breakdown.gaps.toFixed(
        2
      )}, days=${bestScore.breakdown.days.toFixed(2)}, balance=${bestScore.breakdown.balance.toFixed(2)}.`
    ];

    const result: GeneratedPlanResponse = {
      selectedCourseCodes,
      selectedSections,
      totalCredits,
      score: bestScore.total,
      scoreBreakdown: bestScore.breakdown,
      scoreExplanation,
      candidatesConsidered: candidates.length,
      explanation,
      rejected
    };

    res.json(result);
  });

  return router;
}
