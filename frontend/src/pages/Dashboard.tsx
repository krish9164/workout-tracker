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

  // Load profile + exercises on page load
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

  if (loading) return <div className="p-6 text-gray-800">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Header */}
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <a
            href="/history"
            className="rounded px-3 py-2 bg-gray-200 hover:bg-gray-300 transition"
          >
            History
          </a>
          <a
            href="/new-workout"
            className="rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            + New Workout
          </a>
          <a
            href="/analytics"
            className="rounded px-3 py-2 bg-green-600 text-white hover:bg-green-700 transition"
          >
            Analytics
          </a>
          <button
            onClick={logout}
            className="rounded px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>


      <div className="max-w-3xl mx-auto space-y-6 px-6 pb-10">
        {/* Profile card */}
        <div className="rounded-xl p-6 bg-white shadow-md">
          <div>
            Signed in as <b>{me?.name}</b> ({me?.email})
          </div>
          <div className="text-sm text-gray-600 mt-1">
            This confirms your login works.
          </div>
        </div>

        {/* Exercises card */}
        <div className="rounded-xl p-6 bg-white shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Exercises</h2>

          <form onSubmit={addExercise} className="flex gap-2">
            <input
              className="flex-1 rounded px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Bench Press"
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
            />
            <button
              className="rounded px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              disabled={saving}
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </form>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {exercises.length === 0 ? (
            <div className="text-sm text-gray-600">
              No exercises yet. Add one above.
            </div>
          ) : (
            <ul className="list-disc ml-5 text-gray-800 text-base">
              {exercises.map((ex) => (
                <li key={ex.id}>{ex.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
