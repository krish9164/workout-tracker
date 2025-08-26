import { useEffect, useState } from "react";
import { api, clearToken, ApiError } from "../lib/api";

type Workout = {
  id: number;
  date: string; // "YYYY-MM-DD"
  title: string;
  sets_count?: number;
  sets?: Array<{
    id: number;
    exercise_id: number;
    reps: number;
    weight_kg: number;
    rpe?: number | null;
  }>;
};

export default function History() {
  const [me, setMe] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // simple client-side search (by title or date)
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const meData = await api("/me");
        setMe(meData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          window.location.href = "/login";
          return;
        }
        setError("Failed to load profile.");
        setLoading(false);
        return;
      }

      try {
        const raw = await api("/workouts");

        // normalize common shapes
        const list: any[] = Array.isArray(raw)
          ? raw
          : raw?.items ?? raw?.results ?? raw?.data ?? raw?.workouts ?? [];

        // newest first
        const sorted = [...list].sort((a, b) => {
          const da = a.date || a.created_at || "";
          const db = b.date || b.created_at || "";
          return da < db ? 1 : -1;
        });

        setWorkouts(sorted as Workout[]);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          window.location.href = "/login";
          return;
        }
        setError("Failed to load workouts.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function niceDate(d: string) {
    // avoid timezone shifts by pinning to midnight
    const dt = new Date(`${d}T00:00:00`);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
  }

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>;

  // filter by query
  const shown = workouts.filter((w) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (w.title || "").toLowerCase().includes(q) ||
      (w.date || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header row inside page content (shell handles the global header/sidebar) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">History</h1>
        <div className="flex gap-2">
          <a href="/new-workout" className="btn btn-primary">+ New Workout</a>
        </div>
      </div>

      {/* Who's logged in */}
      <div className="card p-4 text-sm">
        Signed in as <b>{me?.name}</b> ({me?.email})
      </div>

      {/* Search + count */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <input
          className="input max-w-sm"
          placeholder="Search by title/date…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="badge">{shown.length} workout{shown.length === 1 ? "" : "s"}</div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {error && <div className="p-4 text-red-600">{error}</div>}

        {shown.length === 0 ? (
          <div className="p-6 text-gray-600">No workouts found.</div>
        ) : (
          <ul>
            {shown.map((w) => {
              const setsCount =
                typeof w.sets_count === "number"
                  ? w.sets_count
                  : Array.isArray(w.sets)
                  ? w.sets.length
                  : undefined;

              return (
                <li key={w.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700">
                  {/* ✅ route fix: singular "/workout/:id" */}
                  <a
                    href={`/workout/${w.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="font-semibold">{w.title || "Workout"}</div>
                      <div className="text-sm text-gray-600">{niceDate(w.date)}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {setsCount != null
                        ? `${setsCount} set${setsCount === 1 ? "" : "s"}`
                        : "View details"}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
