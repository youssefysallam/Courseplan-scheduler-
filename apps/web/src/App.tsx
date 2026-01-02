import { useEffect, useMemo, useState } from "react";
import { fetchCourses } from "./api/courses";
import { generatePlan, type GeneratePlanResponse } from "./api/plan";
import { planToCalendarEvents } from "./calendar/normalize";
import DayColumn from "./calendar/DayColumn";
import { computeWindow } from "./calendar/window";

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

  const [showCalendar, setShowCalendar] = useState(false);

  /* ---------- initial load ---------- */
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

  /* ---------- persistence ---------- */
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

    // Optional quick sanity checks while debugging "0 events"
    // Remove after you confirm it works.
    console.log("plan.selectedSections:", (plan as any)?.selectedSections);
    console.log("courses[0].code:", (courses as any)?.[0]?.code);
    console.log("courses[0].sections[0]:", (courses as any)?.[0]?.sections?.[0]);

    return planToCalendarEvents(plan as any, courses as any);
  }, [plan, courses]);

  const calendarWindow = useMemo(() => {
    return computeWindow(calendarEvents);
  }, [calendarEvents]);

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
        constraints: { minCredits, maxCredits }
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
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold">CoursePlan Scheduler</h1>
            <p className="text-neutral-400 mt-2">
              MVP: load courses + build a wishlist (next: constraints + generate plan).
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="text-sm text-neutral-400">Wishlist</div>
              <div className="text-2xl font-semibold">{wishlist.length}</div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="text-sm text-neutral-400">Completed</div>
              <div className="text-2xl font-semibold">{completed.length}</div>
            </div>
          </div>
        </header>

        {/* Planner controls + plan output */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Constraints */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="text-sm text-neutral-400">Constraints</div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-neutral-300">
                Min credits
                <input
                  type="number"
                  value={minCredits}
                  onChange={(e) => setMinCredits(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
                />
              </label>

              <label className="text-sm text-neutral-300">
                Max credits
                <input
                  type="number"
                  value={maxCredits}
                  onChange={(e) => setMaxCredits(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
                />
              </label>
            </div>

            {/* Manual completed entry */}
            <div className="mt-4">
              <div className="text-sm text-neutral-400 mb-1">Mark completed by code</div>
              <div className="flex gap-2">
                <input
                  value={completedInput}
                  onChange={(e) => setCompletedInput(e.target.value)}
                  placeholder="CS240"
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
                />
                <button
                  onClick={addCompletedByCode}
                  className="rounded-lg border border-blue-700 bg-blue-600/20 px-3 py-2 text-sm font-medium text-blue-200 hover:bg-blue-600/30"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              onClick={onGeneratePlan}
              disabled={planLoading || wishlist.length === 0}
              className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm font-medium hover:bg-neutral-900 disabled:opacity-50"
            >
              {planLoading ? "Generating..." : "Generate Plan"}
            </button>

            {planError && <div className="mt-3 text-sm text-red-300">{planError}</div>}
          </div>

          {/* Generated plan */}
          <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="text-sm text-neutral-400">Generated Plan</div>

            {!plan && (
              <div className="mt-3 text-neutral-400">
                Click “Generate Plan” to see selected courses + explanation.
              </div>
            )}

            {plan && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-neutral-300">
                    Plan ID: <span className="text-neutral-100">{plan.planId}</span>
                  </span>
                  <span className="text-sm text-neutral-300">
                    Score:{" "}
                    <span className="text-neutral-100">
                      {typeof plan.score === "number" ? plan.score.toFixed(2) : String(plan.score ?? "—")}
                    </span>
                  </span>

                  <span className="text-sm text-neutral-300">
                    Candidates:{" "}
                    <span className="text-neutral-100">
                      {plan.candidatesConsidered ?? "—"}
                    </span>
                  </span>

                  <span className="text-sm text-neutral-300">
                    Score breakdown:{" "}
                    <span className="text-neutral-100">
                      {plan.scoreBreakdown
                        ? `credits=${plan.scoreBreakdown.credits}, gaps=${plan.scoreBreakdown.gaps}, days=${plan.scoreBreakdown.days}, balance=${plan.scoreBreakdown.balance}`
                        : "—"}
                    </span>
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-neutral-400">Selected courses</div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {plan.selectedCourseCodes.map((code) => (
                      <span
                        key={code}
                        className="text-xs rounded-full border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
                      >
                        {code}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-sm text-neutral-300">
                    Total credits:{" "}
                    <span className="text-neutral-100">{plan.totalCredits}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-neutral-400">Why this plan</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-neutral-200 space-y-1">
                    {plan.explanation.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>

                  {plan.rejected.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-neutral-400">Rejected</div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-neutral-200 space-y-1">
                        {plan.rejected.map((r) => (
                          <li key={r.courseCode}>
                            <span className="font-medium">{r.courseCode}:</span>{" "}
                            {r.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Calendar wiring checkpoint (no calendar UI yet) */}
                <div className="mt-5 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => setShowCalendar((v) => !v)}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm font-medium hover:bg-neutral-900"
                  >
                    {showCalendar ? "Hide Weekly Schedule" : "Show Weekly Schedule"}
                  </button>

                {showCalendar && (
                  <div className="mt-3">
                    <div className="text-sm text-neutral-300">
                      Calendar events resolved:{" "}
                      <span className="text-neutral-100 font-medium">{calendarEvents.length}</span>
                    </div>

                    <div className="mt-4" style={{ overflowX: "auto" }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                            <DayColumn
                              key={d}
                              day={d as any}
                              events={calendarEvents}
                              windowStartMin={calendarWindow.startMin}
                              windowEndMin={calendarWindow.endMin}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Course list */}
        <div className="mt-8">
          {loading && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              Loading courses...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-4">
              {courses.map((c) => {
                const inWish = wishlistSet.has(c.code);
                const isCompleted = completedSet.has(c.code);

                return (
                  <div
                    key={c.code}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 flex items-center justify-between gap-6"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{c.code}</span>
                        <span className="text-neutral-400 truncate">{c.title}</span>
                      </div>

                      <div className="mt-2 text-sm text-neutral-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{c.credits} credits</span>
                        <span>difficulty {c.difficulty}/5</span>
                        <span>~{c.avgHoursPerWeek} hrs/wk</span>
                        {c.prereqs?.length ? (
                          <span>prereqs: {c.prereqs.join(", ")}</span>
                        ) : (
                          <span>no prereqs</span>
                        )}
                      </div>

                      {c.tags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs rounded-full border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleCompleted(c.code)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                          isCompleted
                            ? "bg-blue-600/20 border-blue-600 text-blue-200"
                            : "bg-neutral-950 border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                        }`}
                      >
                        {isCompleted ? "Completed ✓" : "Mark completed"}
                      </button>

                      <button
                        onClick={() => toggleWishlist(c.code)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                          inWish
                            ? "bg-emerald-600/20 border-emerald-600 text-emerald-200"
                            : "bg-neutral-950 border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                        }`}
                      >
                        {inWish ? "In wishlist ✓" : "Add to wishlist"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="mt-10 text-sm text-neutral-500">
          Next: dataset expansion + real schedule construction (section conflicts).
        </footer>
      </div>
    </div>
  );
}
