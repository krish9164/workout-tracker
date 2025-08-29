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

  async function removeExercise(id: number) {
    if (!confirm("Delete this exercise? This cannot be undone.")) return;
    setError(null);
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
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{ex.name}</div>
                  {ex.muscles && ex.muscles.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {ex.muscles.join(", ")}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                    {ex.is_custom ? "Custom" : "Global"}
                  </div>
                </div>

                {ex.is_custom ? (
                  <button
                    className="btn btn-ghost text-red-600"
                    onClick={() => removeExercise(ex.id)}
                    title="Delete exercise"
                  >
                    Delete
                  </button>
                ) : (
                  <span
                    className="text-xs text-gray-400 self-center"
                    title="Global exercises cannot be deleted"
                  >
                    •
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
