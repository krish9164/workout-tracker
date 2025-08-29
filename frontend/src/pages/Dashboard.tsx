// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { api, clearToken } from "../lib/api";
import VoiceCapture from "../components/VoiceCapture";

type Exercise = {
  id: number;
  name: string;
  muscles?: string[] | null;
  is_custom?: boolean;
  user_id?: number | null;
};

type Stats = {
  last_workout_date: string | null;
  this_week_start: string;
  last_completed_week_start: string;
  current_week_count: number;
  last_week_count: number;
  threshold: number;
  streak_weeks: number;
};

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([api("/me"), api("/exercises"), api("/analytics/stats?threshold=3")])
      .then(([meData, exData, statsData]) => {
        setMe(meData);
        setExercises(exData);
        setStats(statsData);
      })
      .catch(() => {
        clearToken();
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!newExercise.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api("/exercises", {
        method: "POST",
        body: JSON.stringify({ name: newExercise.trim() }),
      });
      setExercises((prev) => [...prev, created]);
      setNewExercise("");
    } catch (err: any) {
      setError(err?.message || "Failed to add exercise");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExercise(id: number) {
    if (!confirm("Delete this exercise? This cannot be undone.")) return;
    try {
      await api(`/exercises/${id}`, { method: "DELETE" });
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setError(err?.message || "Failed to delete exercise");
    }
  }

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  function niceDate(d?: string | null) {
    if (!d) return "—";
    const dt = new Date(`${d}T00:00:00`);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
  }

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>;

  const progressPct = stats
    ? Math.min(100, (stats.current_week_count / Math.max(1, stats.threshold)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Last workout */}
        <div className="card p-5">
          <div className="text-sm text-gray-500">Last workout</div>
          <div className="mt-1 text-2xl font-semibold">{niceDate(stats?.last_workout_date)}</div>
          {stats?.last_workout_date ? (
            <div className="mt-2 text-xs text-gray-500">
              Last week: <b>{stats.last_week_count}</b> session{stats.last_week_count === 1 ? "" : "s"}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">No workouts yet — start your first one!</div>
          )}
        </div>

        {/* This week progress */}
        <div className="card p-5">
          <div className="text-sm text-gray-500">This week</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats?.current_week_count ?? 0}/{stats?.threshold ?? 3} sessions
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Goal: ≥{stats?.threshold ?? 3} sessions per week
          </div>
        </div>

        {/* Current streak */}
        <div className="card p-5">
          <div className="text-sm text-gray-500">Current streak</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats?.streak_weeks ?? 0} week{(stats?.streak_weeks ?? 0) === 1 ? "" : "s"}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Counts consecutive <b>completed</b> weeks (Mon–Sun) with ≥{stats?.threshold ?? 3} sessions.
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-gray-500">Quick Action</div>
          <div className="mt-1 text-lg font-semibold">New Workout</div>
          <a href="/new-workout" className="btn btn-primary mt-3">Start Now</a>
        </div>

        <div className="card p-5">
          <div className="text-sm text-gray-500">Voice</div>
          <div className="mt-1 text-lg font-semibold">Log by speech</div>
          <div className="mt-3">
            <VoiceCapture
              onUploaded={(d) => {
                alert(`Saved from transcript:\n\n${d.transcript}`);
                window.location.href = `/workout/${d.workout.id}`;
              }}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-gray-500">Insights</div>
          <div className="mt-1 text-lg font-semibold">Analytics</div>
          <a href="/analytics" className="btn btn-ghost mt-3">See charts</a>
        </div>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div>Signed in as <b>{me?.name}</b> ({me?.email})</div>
            <div className="text-sm text-gray-500 mt-1">Welcome back! You’re logged in.</div>
          </div>
          <button onClick={logout} className="btn btn-ghost">Logout</button>
        </div>
      </div>

      {/* Exercises */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Exercises</h2>
          <span className="badge">{exercises.length} total</span>
        </div>

        <form onSubmit={addExercise} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g., Bench Press"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
          />
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </form>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {exercises.length === 0 ? (
          <div className="text-sm text-gray-600">No exercises yet. Add one above.</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {exercises.map((ex) => (
              <li
                key={ex.id}
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 px-4 py-3 hover:bg-white dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{ex.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2">
                      {ex.is_custom && <span className="badge">CUSTOM</span>}
                      {ex.muscles && ex.muscles.length > 0 && (
                        <span className="text-xs text-gray-500">{ex.muscles.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  {ex.user_id && (
                    <button
                      type="button"
                      onClick={() => deleteExercise(ex.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                      title="Delete"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
