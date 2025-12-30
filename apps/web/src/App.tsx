import { useEffect, useMemo, useState } from "react";
import { fetchCourses } from "./api/courses";

type Course = {
  code: string;
  title: string;
  credits: number;
  difficulty: number;
  avgHoursPerWeek: number;
  prereqs: string[];
  tags: string[];
};

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  function toggleWishlist(code: string) {
    setWishlist((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
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

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <div className="text-sm text-neutral-400">Wishlist</div>
            <div className="text-2xl font-semibold">{wishlist.length}</div>
          </div>
        </header>

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

                    <button
                      onClick={() => toggleWishlist(c.code)}
                      className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium border ${
                        inWish
                          ? "bg-emerald-600/20 border-emerald-600 text-emerald-200"
                          : "bg-neutral-950 border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                      }`}
                    >
                      {inWish ? "In wishlist ✓" : "Add to wishlist"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="mt-10 text-sm text-neutral-500">
          Next: completed courses + constraints form + Generate Plan endpoint.
        </footer>
      </div>
    </div>
  );
}
