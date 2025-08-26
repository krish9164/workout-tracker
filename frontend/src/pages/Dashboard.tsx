// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { api, clearToken } from "../lib/api";

type Exercise = { id: number; name: string; muscles?: string[] | null };

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api("/me"), api("/exercises")])
      .then(([meData, exData]) => {
        setMe(meData);
        setExercises(exData);
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

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-gray-500">Quick Action</div>
          <div className="mt-1 text-lg font-semibold">New Workout</div>
          <a href="/new-workout" className="btn btn-primary mt-3">Start Now</a>
        </div>
        <div className="card p-5">
          <div className="text-sm text-gray-500">View</div>
          <div className="mt-1 text-lg font-semibold">History</div>
          <a href="/history" className="btn btn-ghost mt-3">Open</a>
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
            <div>
              Signed in as <b>{me?.name}</b> ({me?.email})
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Welcome back! You’re logged in.
            </div>
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
          <div className="text-sm text-gray-600">
            No exercises yet. Add one above.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {exercises.map((ex) => (
              <li
                key={ex.id}
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
              >
                <div className="font-medium">{ex.name}</div>
                {ex.muscles && ex.muscles.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {ex.muscles.join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
