import { Router } from "express";
import fs from "fs";
import path from "path";
import type {
  Course,
  GeneratedPlan,
  Rejection,
  Section,
  SelectedSection
} from "@courseplan/shared";
import { sectionOverlaps } from "@courseplan/shared";

type GeneratePlanRequest = {
  wishlist: string[];
  completed: string[];
  constraints: {
    minCredits: number;
    maxCredits: number;
  };
};

function loadCoursesFromDataset(): Course[] {
  const rel =
    process.env.DATASET_PATH ?? "../../packages/shared/dataset/data/courses.sample.json";
  const abs = path.resolve(process.cwd(), rel);
  const raw = fs.readFileSync(abs, "utf-8");
  return JSON.parse(raw) as Course[];
}

function prereqsMet(course: Course, completed: Set<string>): boolean {
  return (course.prereqs ?? []).every((p) => completed.has(p));
}

type Pick = { course: Course; section: Section };

function creditsOf(picks: Pick[]): number {
  return picks.reduce((sum, p) => sum + p.course.credits, 0);
}

function hasConflict(picks: Pick[], next: Section): boolean {
  return picks.some((p) => sectionOverlaps(p.section, next));
}

function backtrackBestSchedule(courses: Course[], maxCredits: number): Pick[] {
  let best: Pick[] = [];

  function dfs(i: number, current: Pick[]) {
    const currentCredits = creditsOf(current);

    if (currentCredits > maxCredits) return;

    if (currentCredits > creditsOf(best)) {
      best = [...current];
    }

    if (i >= courses.length) return;

    const course = courses[i];
    const sections = course.sections ?? [];

    // Option 1: skip course
    dfs(i + 1, current);

    // Option 2: try each section
    for (const sec of sections) {
      if (hasConflict(current, sec)) continue;

      current.push({ course, section: sec });
      dfs(i + 1, current);
      current.pop();
    }
  }

  dfs(0, []);
  return best;
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

    const allCourses = loadCoursesFromDataset();
    const byCode = new Map(allCourses.map((c) => [c.code, c]));

    const rejected: Rejection[] = [];
    const prereqEligible: Course[] = [];

    // Step 1: resolve wishlist -> courses, prereq filtering, completed filtering
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

      if (!prereqsMet(course, completed)) {
        const missing = (course.prereqs ?? []).filter((p) => !completed.has(p));
        rejected.push({
          courseCode: code,
          reason: `Missing prerequisites: ${missing.join(", ")}`
        });
        continue;
      }

      prereqEligible.push(course);
    }

    // Step 2: reject courses that have no sections (can’t schedule)
    const eligible: Course[] = [];
    for (const c of prereqEligible) {
      const sectionCount = c.sections?.length ?? 0;
      if (sectionCount === 0) {
        rejected.push({ courseCode: c.code, reason: "No sections available" });
        continue;
      }
      eligible.push(c);
    }

    // Step 3: conflict-aware backtracking to pick best schedule under maxCredits
    const picks = backtrackBestSchedule(eligible, maxCredits);

    const selectedSections: SelectedSection[] = picks.map((p) => ({
      courseCode: p.course.code,
      sectionId: p.section.id
    }));

    const selectedCourseCodes = picks.map((p) => p.course.code);
    const totalCredits = picks.reduce((sum, p) => sum + p.course.credits, 0);

    // Step 4: explanation
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
        `Note: Could not reach minCredits=${minCredits} with conflict-free sections under maxCredits=${maxCredits}.`
      );
    }

    const result: GeneratedPlan = {
      planId: `plan_${Date.now()}`,
      selectedCourseCodes,
      selectedSections,
      totalCredits,
      score: 0,
      explanation,
      rejected
    };

    res.json(result);
  });

  return router;
}
