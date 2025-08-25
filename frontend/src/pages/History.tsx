import { useEffect, useState } from "react";
import { api, clearToken, ApiError } from "../lib/api";

type Workout = {
  id: number;
  date: string;      // "YYYY-MM-DD"
  title: string;
  sets_count?: number; // if your API returns it; otherwise we’ll compute
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
        // 🔎 See exactly what the backend sends
        console.log("GET /workouts raw response:", raw);

        //  Normalize common shapes
        const list: any[] = Array.isArray(raw)
          ? raw
          : raw?.items ?? raw?.results ?? raw?.data ?? [];

        // If backend returns an object with 'workouts' key
        const normalized = Array.isArray(list) && list.length === 0 && Array.isArray(raw?.workouts)
          ? raw.workouts
          : list;

        // sort newest first; fall back to created_at if date missing
        const sorted = [...normalized].sort((a, b) => {
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

  if (loading) return <div className="p-6 text-gray-800">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">History</h1>
          <div className="flex gap-2">
            <a
              href="/new-workout"
              className="rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              + New Workout
            </a>
            <a
              href="/"
              className="rounded px-3 py-2 bg-gray-200 hover:bg-gray-300 transition"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        {/* Who's logged in */}
        <div className="rounded-xl p-4 bg-white shadow-sm text-sm text-gray-700">
          Signed in as <b>{me?.name}</b> ({me?.email})
        </div>

        {/* List */}
        <div className="rounded-xl p-2 bg-white shadow-md">
          {workouts.length === 0 ? (
            <div className="p-6 text-gray-700">No workouts yet.</div>
          ) : (
            <ul>
              {workouts.map((w) => {
                const setsCount =
                  typeof w.sets_count === "number"
                    ? w.sets_count
                    : Array.isArray(w.sets)
                    ? w.sets.length
                    : undefined;
                return (
                  <li key={w.id} className="border-b last:border-b-0 border-gray-200">
                    <a
                      href={`/workouts/${w.id}`}
                      className="block p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="font-semibold">{w.title || "Workout"}</div>
                        <div className="text-sm text-gray-600">{w.date}</div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {setsCount != null ? `${setsCount} set${setsCount === 1 ? "" : "s"}` : "View details"}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
