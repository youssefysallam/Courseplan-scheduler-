# CoursePlan Scheduler

A deterministic course scheduling system that generates a conflict-free weekly plan from a student's wishlist, completed courses, and credit constraints. Built as a TypeScript pnpm monorepo with an Express API, React + Vite frontend, and a shared scheduling/scoring package. 

---

## Demo

![CoursePlan Scheduler Demo](Demos/Demo.gif)

---

## How it works

1. **Browse courses** — load the full catalog with credit counts, difficulty, average hours per week, and prerequisites
2. **Build a wishlist** — toggle courses in; mark completed ones to satisfy prerequisites automatically
3. **Set constraints** — min/max credit bounds for the semester
4. **Generate plan** — the API enumerates valid section combinations via backtracking, scores each candidate, and returns the highest-scoring conflict-free schedule with an explanation

### Scheduling algorithm

```
Wishlist + Constraints
         │
         ▼
Backtracking enumeration (section combinations × time slots)
  → prune on time conflicts
  → prune on prerequisite violations
         │
         ▼
Score each candidate plan:
  credits_score  ─ distance from target credit range
  gap_score      ─ minimize idle time between classes
  days_score     ─ favor fewer class days
  balance_score  ─ spread hours across the week evenly
         │
         ▼
Return top plan + explanation + rejected list
```

All scheduling logic is deterministic — no LLM, no randomness. The same wishlist and constraints always produce the same plan.

---

## Key Features

- **Conflict detection** — no two selected sections overlap on the weekly calendar
- **Prerequisite enforcement** — completed courses mark prerequisites as satisfied
- **Multi-factor scoring** — four weighted components (credits, gaps, days, balance) with transparent breakdown in the response
- **Rejection explanations** — every excluded course gets a human-readable reason
- **Live course search** — filter by code, title, or tag in real time
- **Weekly calendar view** — generated plan renders as a draggable-free time grid with per-course color coding

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| API | TypeScript + Express |
| Frontend | React + Vite + Tailwind CSS |
| Shared logic | `@courseplan/shared` (scoring, types, course colors) |
| Language | TypeScript throughout |

---

## Project Structure

```
apps/
  api/
    src/
      routes/courses.ts       GET /courses — serve catalog
      routes/plan.ts          POST /plan — run scheduler, return scored plan
      services/generateScoredPlan.ts   Core backtracking + scoring
  web/
    src/
      App.tsx                 Main UI — wishlist, constraints, plan panel
      calendar/               WeekGrid, DayColumn, TimeRail
      api/                    Typed fetch clients for courses + plan
packages/
  shared/
    src/
      scoring/scorePlan.ts    Plan scoring (credits, gaps, days, balance)
      types/                  Course, Plan, Constraints, Score types
      ui/courseColors.ts      Deterministic per-course color assignment
      utils/overlaps.ts       Time overlap detection
    dataset/data/courses.sample.json   Sample course catalog
```

---

## Quick Start

```bash
# Install all workspace deps
pnpm install

# Start API (port 3001)
pnpm --filter api dev

# Start web frontend (port 5173)
pnpm --filter web dev
```

Copy `.env.example` to `.env` in `apps/api/` and set `PORT` if needed.

---

## API Reference

### `GET /courses`
Returns the full course catalog.

### `POST /plan`
```json
{
  "wishlist": ["CS240", "CS310"],
  "completed": ["CS110", "CS210"],
  "constraints": { "minCredits": 12, "maxCredits": 16 }
}
```
Returns:
```json
{
  "planId": "abc123",
  "selectedCourseCodes": ["CS240", "CS310"],
  "selectedSections": { ... },
  "totalCredits": 7,
  "score": 0.87,
  "scoreBreakdown": { "credits": 0.9, "gaps": 0.8, "days": 0.85, "balance": 0.9 },
  "explanation": ["CS240 satisfies CS210 prerequisite", "..."],
  "rejected": [{ "courseCode": "CS410", "reason": "Missing prerequisite CS310" }],
  "candidatesConsidered": 12
}
```
