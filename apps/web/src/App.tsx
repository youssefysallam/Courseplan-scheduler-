import { useEffect, useMemo, useState } from "react";
import { fetchCourses } from "./api/courses";
import { generatePlan, type GeneratePlanResponse } from "./api/plan";
import { planToCalendarEvents } from "./calendar/normalize";
import { DAY_START_MIN, DAY_END_MIN } from "./calendar/constants";
import WeekGrid from "./calendar/WeekGrid";

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
    <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300">
      {children}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
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

    console.log("plan.selectedSections:", (plan as any)?.selectedSections);
    console.log("courses[0].code:", (courses as any)?.[0]?.code);
    console.log("courses[0].sections[0]:", (courses as any)?.[0]?.sections?.[0]);

    return planToCalendarEvents(plan as any, courses as any);
  }, [plan, courses]);

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_15%_10%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(900px_500px_at_85%_20%,rgba(59,130,246,0.15),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60 text-sm font-semibold">
                UMB
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                CoursePlan Scheduler
              </h1>
            </div>
            <p className="text-sm text-neutral-400">
              Build a wishlist, apply credit constraints, and generate a conflict-free weekly plan.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatPill label="Wishlist" value={wishlist.length} />
            <StatPill label="Completed" value={completed.length} />
            <button
              onClick={onGeneratePlan}
              disabled={planLoading || wishlist.length === 0}
              className={cx(
                "h-[52px] rounded-2xl px-5 text-sm font-semibold",
                "border border-emerald-500/30 bg-emerald-500/15 text-emerald-100",
                "hover:bg-emerald-500/20 active:translate-y-[1px]",
                "disabled:opacity-50 disabled:hover:bg-emerald-500/15"
              )}
            >
              {planLoading ? "Generating…" : "Generate plan"}
            </button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left */}
          <div className="space-y-6">
            {/* Constraints */}
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Constraints</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Credit limits and manual completed entries.
                  </p>
                </div>
                <Badge>
                  {minCredits}–{maxCredits} credits
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="text-sm text-neutral-300">
                  <span className="text-xs text-neutral-400">Min credits</span>
                  <input
                    type="number"
                    value={minCredits}
                    onChange={(e) => setMinCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600"
                  />
                </label>

                <label className="text-sm text-neutral-300">
                  <span className="text-xs text-neutral-400">Max credits</span>
                  <input
                    type="number"
                    value={maxCredits}
                    onChange={(e) => setMaxCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600"
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-400 mb-2">
                  Mark completed by code
                </div>
                <div className="flex gap-2">
                  <input
                    value={completedInput}
                    onChange={(e) => setCompletedInput(e.target.value)}
                    placeholder="CS240"
                    className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600"
                  />
                  <button
                    onClick={addCompletedByCode}
                    className={cx(
                      "rounded-2xl px-4 py-3 text-sm font-semibold",
                      "border border-blue-500/30 bg-blue-500/15 text-blue-100",
                      "hover:bg-blue-500/20 active:translate-y-[1px]"
                    )}
                  >
                    Add
                  </button>
                </div>
              </div>

              {planError && (
                <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {planError}
                </div>
              )}
            </section>

            {/* Courses */}
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Courses</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Add courses to wishlist and mark completed.
                  </p>
                </div>
                <Badge>{courses.length} total</Badge>
              </div>

              <div className="mt-5 max-h-[68vh] overflow-y-auto pr-1 space-y-3">
                {loading && (
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                    Loading courses…
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {!loading &&
                  !error &&
                  courses.map((c) => {
                    const inWish = wishlistSet.has(c.code);
                    const isCompleted = completedSet.has(c.code);

                    return (
                      <div
                        key={c.code}
                        className={cx(
                          "rounded-3xl border bg-neutral-950 p-4",
                          "border-neutral-800 hover:border-neutral-700 transition",
                          !inWish && !isCompleted && "opacity-90 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tracking-tight">
                                {c.code}
                              </span>
                              <span className="text-sm text-neutral-400 truncate">
                                {c.title}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge>{c.credits} cr</Badge>
                              <Badge>diff {c.difficulty}/5</Badge>
                              <Badge>~{c.avgHoursPerWeek} hrs/wk</Badge>
                              <Badge>
                                {c.prereqs?.length ? `prereqs: ${c.prereqs.join(", ")}` : "no prereqs"}
                              </Badge>
                            </div>

                            {c.tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {c.tags.map((t) => (
                                  <Badge key={t}>{t}</Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => toggleCompleted(c.code)}
                              className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-semibold border",
                                isCompleted
                                  ? "bg-blue-500/15 border-blue-500/30 text-blue-100"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                              )}
                            >
                              {isCompleted ? "Completed ✓" : "Mark completed"}
                            </button>

                            <button
                              onClick={() => toggleWishlist(c.code)}
                              className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-semibold border",
                                inWish
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-100"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                              )}
                            >
                              {inWish ? "In wishlist ✓" : "Add to wishlist"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Generated Plan</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Results, explanation, and weekly calendar.
                  </p>
                </div>
                {plan ? (
                  <Badge>{plan.totalCredits} credits</Badge>
                ) : (
                  <Badge>—</Badge>
                )}
              </div>

              {!plan && (
                <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                  Add courses to your wishlist, then click{" "}
                  <span className="text-neutral-100 font-semibold">Generate plan</span>.
                </div>
              )}

              {plan && (
                <div className="mt-5 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge>Plan: {plan.planId}</Badge>
                    <Badge>
                      Score{" "}
                      {typeof plan.score === "number"
                        ? plan.score.toFixed(2)
                        : String(plan.score ?? "—")}
                    </Badge>
                    <Badge>Candidates {plan.candidatesConsidered ?? "—"}</Badge>
                    <Badge>
                      {plan.scoreBreakdown
                        ? `credits=${plan.scoreBreakdown.credits} • gaps=${plan.scoreBreakdown.gaps} • days=${plan.scoreBreakdown.days} • balance=${plan.scoreBreakdown.balance}`
                        : "score breakdown —"}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-semibold">Selected courses</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {plan.selectedCourseCodes.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-200"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-neutral-300">
                      Total credits:{" "}
                      <span className="text-neutral-100 font-semibold">
                        {plan.totalCredits}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold">Why this plan</div>
                    <ul className="mt-2 space-y-1 text-sm text-neutral-200">
                      {plan.explanation.map((line, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-neutral-600" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.rejected.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold">Rejected</div>
                        <ul className="mt-2 space-y-1 text-sm text-neutral-200">
                          {plan.rejected.map((r) => (
                            <li key={r.courseCode} className="flex gap-2">
                              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-neutral-600" />
                              <span>
                                <span className="font-semibold">{r.courseCode}:</span>{" "}
                                {r.reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold">Weekly schedule</div>
                      <div className="text-xs text-neutral-400">
                        {calendarEvents.length} events
                      </div>
                    </div>

                    <div className="mt-3">
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
