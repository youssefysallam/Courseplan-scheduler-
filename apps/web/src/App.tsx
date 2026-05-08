import { useEffect, useMemo, useState } from "react";
import { fetchCourses } from "./api/courses";
import { generatePlan, type GeneratePlanResponse } from "./api/plan";
import { planToCalendarEvents } from "./calendar/normalize";
import { DAY_START_MIN, DAY_END_MIN } from "./calendar/constants";
import WeekGrid from "./calendar/WeekGrid";
import { getCourseColor } from "@courseplan/shared";

type TimeSlot = {
  day: string;
  startMin: number;
  endMin: number;
};

type CourseSection = {
  id: string;
  timeSlots: TimeSlot[];
};

type Course = {
  code: string;
  title: string;
  credits: number;
  difficulty: number;
  avgHoursPerWeek: number;
  prereqs: string[];
  tags: string[];
  sections?: CourseSection[];
};

const LS_WISHLIST = "courseplan:wishlist";
const LS_COMPLETED = "courseplan:completed";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-neutral-700/50 bg-neutral-900/80 px-2 py-0.5 text-[11px] font-medium text-neutral-400 tracking-wide">
      {children}
    </span>
  );
}

function StatPill({
  label,
  value,
  accent = "emerald",
}: {
  label: string;
  value: number;
  accent?: "emerald" | "blue";
}) {
  const isEmerald = accent === "emerald";
  return (
    <div
      className={cx(
        "rounded-xl border bg-neutral-900/80 px-5 py-3 backdrop-blur-sm transition-all",
        isEmerald
          ? "border-emerald-900/50 shadow-[0_0_22px_rgba(16,185,129,0.08)] hover:shadow-[0_0_28px_rgba(16,185,129,0.16)]"
          : "border-blue-900/50 shadow-[0_0_22px_rgba(59,130,246,0.08)] hover:shadow-[0_0_28px_rgba(59,130,246,0.16)]"
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </div>
      <div
        className={cx(
          "mt-0.5 text-3xl font-bold tabular-nums leading-none",
          isEmerald ? "text-emerald-200" : "text-blue-200"
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  const [completedInput, setCompletedInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");

  const [minCredits, setMinCredits] = useState(12);
  const [maxCredits, setMaxCredits] = useState(16);

  const [plan, setPlan] = useState<GeneratePlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    const savedWishlist = localStorage.getItem(LS_WISHLIST);
    const savedCompleted = localStorage.getItem(LS_COMPLETED);

    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    if (savedCompleted) setCompleted(JSON.parse(savedCompleted));

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchCourses();
        if (!alive) return;
        setCourses(data.courses as Course[]);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_WISHLIST, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(LS_COMPLETED, JSON.stringify(completed));
  }, [completed]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
  const completedSet = useMemo(() => new Set(completed), [completed]);

  const calendarEvents = useMemo(() => {
    if (!plan) return [];
    return planToCalendarEvents(plan as any, courses as any);
  }, [plan, courses]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [courses, courseSearch]);

  const calendarWindow = useMemo(() => {
    return { startMin: DAY_START_MIN, endMin: DAY_END_MIN };
  }, []);

  function toggleWishlist(code: string) {
    setWishlist((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function toggleCompleted(code: string) {
    setCompleted((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function addCompletedByCode() {
    const code = completedInput.trim().toUpperCase();
    if (!code || completed.includes(code)) return;

    setCompleted((prev) => [...prev, code]);
    setCompletedInput("");
  }

  async function onGeneratePlan() {
    try {
      setPlanError(null);
      setPlanLoading(true);

      const result = await generatePlan({
        wishlist,
        completed,
        constraints: { minCredits, maxCredits },
      });

      setPlan(result);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlanLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition placeholder-neutral-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_15%_10%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_500px_at_85%_20%,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        {/* ── Header ── */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  CoursePlan
                </h1>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-500/70 -mt-0.5">
                  Scheduler
                </div>
              </div>
            </div>
            <p className="text-sm text-neutral-500 max-w-sm">
              Build a wishlist, set credit constraints, and generate a conflict-free weekly plan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatPill label="Wishlist" value={wishlist.length} accent="emerald" />
            <StatPill label="Completed" value={completed.length} accent="blue" />
            <button
              onClick={onGeneratePlan}
              disabled={planLoading || wishlist.length === 0}
              className={cx(
                "h-[60px] rounded-xl px-6 text-sm font-semibold tracking-wide transition-all",
                "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
                "hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
                "active:translate-y-[1px]",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-500/10 disabled:hover:shadow-none"
              )}
            >
              {planLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </span>
              ) : (
                "Generate plan →"
              )}
            </button>
          </div>
        </header>

        {/* Separator */}
        <div className="mt-7 h-px bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent" />

        <div className="mt-7 grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Constraints */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-base font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Constraints
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Credit limits and completed courses.
                  </p>
                </div>
                <span className="rounded-lg border border-neutral-700/50 bg-neutral-900 px-2.5 py-1 text-xs font-semibold tabular-nums text-neutral-300">
                  {minCredits}–{maxCredits} cr
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-600">
                    Min credits
                  </span>
                  <input
                    type="number"
                    value={minCredits}
                    onChange={(e) => setMinCredits(Number(e.target.value))}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-600">
                    Max credits
                  </span>
                  <input
                    type="number"
                    value={maxCredits}
                    onChange={(e) => setMaxCredits(Number(e.target.value))}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-600">
                  Mark completed by code
                </div>
                <div className="flex gap-2">
                  <input
                    value={completedInput}
                    onChange={(e) => setCompletedInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCompletedByCode()}
                    placeholder="CS240"
                    className={cx(inputClass, "flex-1")}
                  />
                  <button
                    onClick={addCompletedByCode}
                    className={cx(
                      "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                      "border border-blue-500/30 bg-blue-500/10 text-blue-100",
                      "hover:bg-blue-500/20 hover:border-blue-500/50 active:translate-y-[1px]"
                    )}
                  >
                    Add
                  </button>
                </div>
              </div>

              {planError && (
                <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  {planError}
                </div>
              )}
            </section>

            {/* Courses */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-base font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Courses
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Add to wishlist or mark completed.
                  </p>
                </div>
                <Badge>
                  {courseSearch
                    ? `${filteredCourses.length} / ${courses.length}`
                    : `${courses.length} total`}
                </Badge>
              </div>

              <div className="mt-4">
                <input
                  type="search"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search by code, title, or tag…"
                  className={inputClass}
                />
              </div>

              <div className="mt-3 max-h-[68vh] space-y-2.5 overflow-y-auto pr-1">
                {loading && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-500">
                    Loading courses…
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {!loading && !error && filteredCourses.length === 0 && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-500">
                    No courses match &ldquo;{courseSearch}&rdquo;
                  </div>
                )}

                {!loading &&
                  !error &&
                  filteredCourses.map((c) => {
                    const inWish = wishlistSet.has(c.code);
                    const isCompleted = completedSet.has(c.code);
                    const colors = getCourseColor(c.code);

                    return (
                      <div
                        key={c.code}
                        className={cx(
                          "relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-4 pl-5 transition-all",
                          "hover:border-neutral-700",
                          (inWish || isCompleted) && "border-neutral-700"
                        )}
                      >
                        {/* color accent strip */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px]"
                          style={{ background: colors.border }}
                        />

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-bold tracking-tight text-neutral-100">
                                {c.code}
                              </span>
                              <span className="truncate text-xs text-neutral-500">
                                {c.title}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge>{c.credits} cr</Badge>
                              <Badge>diff {c.difficulty}/5</Badge>
                              <Badge>~{c.avgHoursPerWeek} h/wk</Badge>
                              {c.prereqs?.length ? (
                                <Badge>pre: {c.prereqs.join(", ")}</Badge>
                              ) : (
                                <Badge>no prereqs</Badge>
                              )}
                            </div>

                            {c.tags?.length ? (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {c.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                    style={{
                                      background: colors.border + "22",
                                      color: colors.border,
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-col gap-1.5">
                            <button
                              onClick={() => toggleCompleted(c.code)}
                              className={cx(
                                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                                isCompleted
                                  ? "bg-blue-500/15 border-blue-500/30 text-blue-200"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                              )}
                            >
                              {isCompleted ? "Done ✓" : "Mark done"}
                            </button>

                            <button
                              onClick={() => toggleWishlist(c.code)}
                              className={cx(
                                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                                inWish
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                              )}
                            >
                              {inWish ? "Wishlisted ✓" : "Add"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-base font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Generated Plan
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Results, explanation, and weekly calendar.
                  </p>
                </div>
                {plan ? (
                  <span className="rounded-lg border border-emerald-800/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    {plan.totalCredits} credits
                  </span>
                ) : (
                  <Badge>—</Badge>
                )}
              </div>

              {!plan && (
                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/50 px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900">
                    <svg className="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm text-neutral-500">
                    Add courses to your wishlist, then click{" "}
                    <span className="font-semibold text-neutral-300">Generate plan</span>.
                  </p>
                </div>
              )}

              {plan && (
                <div className="mt-5 space-y-5">
                  {/* Plan stats grid */}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      { label: "Plan ID", value: plan.planId },
                      {
                        label: "Score",
                        value:
                          typeof plan.score === "number"
                            ? plan.score.toFixed(2)
                            : String(plan.score ?? "—"),
                      },
                      { label: "Candidates", value: String(plan.candidatesConsidered ?? "—") },
                      { label: "Credits", value: String(plan.totalCredits) },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5"
                      >
                        <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
                          {label}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-200">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Score breakdown */}
                  {plan.scoreBreakdown && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-neutral-800/50 bg-neutral-950/40 px-4 py-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-700">
                        Breakdown
                      </span>
                      {Object.entries(plan.scoreBreakdown).map(([k, v]) => (
                        <span key={k} className="flex items-baseline gap-1.5 text-xs">
                          <span className="text-neutral-600">{k}</span>
                          <span className="font-semibold text-neutral-300">{v}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Selected courses chips */}
                  <div>
                    <div
                      className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-neutral-500"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Selected courses
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.selectedCourseCodes.map((code) => {
                        const colors = getCourseColor(code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide"
                            style={{
                              background: colors.bg + "30",
                              border: `1px solid ${colors.border}55`,
                              color: "#e5e7eb",
                            }}
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: colors.border }}
                            />
                            {code}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Why this plan */}
                  <div>
                    <div
                      className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-neutral-500"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Why this plan
                    </div>
                    <ul className="space-y-1.5">
                      {plan.explanation.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/50" />
                          <span className="text-sm leading-relaxed text-neutral-300">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Rejected */}
                  {plan.rejected.length > 0 && (
                    <div>
                      <div
                        className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-neutral-500"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Rejected
                      </div>
                      <ul className="space-y-1.5">
                        {plan.rejected.map((r) => (
                          <li key={r.courseCode} className="flex items-start gap-2.5">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/40" />
                            <span className="text-sm leading-relaxed text-neutral-400">
                              <span className="font-semibold text-neutral-300">
                                {r.courseCode}:
                              </span>{" "}
                              {r.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weekly schedule */}
                  <div className="border-t border-neutral-800 pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <div
                        className="text-xs font-bold uppercase tracking-[0.1em] text-neutral-500"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Weekly schedule
                      </div>
                      <div className="text-xs text-neutral-600">
                        {calendarEvents.length} event{calendarEvents.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="mt-4">
                      <WeekGrid
                        events={calendarEvents}
                        windowStartMin={calendarWindow.startMin}
                        windowEndMin={calendarWindow.endMin}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
