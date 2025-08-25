import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, clearToken, ApiError } from "../lib/api";

type ExerciseMap = Record<number, string>;

export default function WorkoutDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);

  const [me, setMe] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [exNames, setExNames] = useState<ExerciseMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [meData, w, exs] = await Promise.all([
        api("/me"),
        api(`/workouts/${id}`),
        api("/exercises"),
      ]);
      setMe(meData);
      setWorkout(w);
      setTitle(w?.title || "");
      setNotes(w?.notes || "");
      const map: ExerciseMap = {};
      (exs || []).forEach((e: any) => (map[e.id] = e.name));
      setExNames(map);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      setError("Failed to load workout.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const updated = await api(`/workouts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, notes }),
      });
      setWorkout(updated);
      setOk("Saved.");
      setTimeout(() => setOk(null), 900);
    } catch (err: any) {
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkout() {
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    try {
      await api(`/workouts/${id}`, { method: "DELETE" });
      window.location.href = "/history";
    } catch (err: any) {
      setError(err?.message || "Failed to delete.");
    }
  }

  if (loading) return <div className="p-6 text-gray-800">Loading…</div>;
  if (!workout) return <div className="p-6 text-red-600">Not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Workout</h1>
          <div className="flex gap-2">
            <a
              href="/history"
              className="rounded px-3 py-2 bg-gray-200 hover:bg-gray-300 transition"
            >
              ← Back
            </a>
            <button
              onClick={deleteWorkout}
              className="rounded px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition"
              title="Delete workout"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Who */}
        <div className="rounded-xl p-4 bg-white shadow-sm text-sm text-gray-700">
          <div>
            Signed in as <b>{me?.name}</b> ({me?.email})
          </div>
          <div>
            <b>Date:</b> {workout.date}
          </div>
        </div>

        {/* Edit title/notes */}
        <form
          onSubmit={saveMeta}
          className="rounded-xl p-6 bg-white shadow-md space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Title
            </label>
            <input
              className="w-full rounded px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upper Body A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Notes
            </label>
            <textarea
              className="w-full rounded px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {ok && <div className="text-sm text-green-700">{ok}</div>}

          <div className="flex justify-end">
            <button
              className="rounded px-4 py-2 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        {/* Sets */}
                {/* Sets */}
        <div className="rounded-xl p-6 bg-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sets</h2>
            <button
              type="button"
              onClick={async () => {
                try {
                  // create a simple default set; you can change defaults
                  const firstExerciseId = Number(Object.keys(exNames)[0] || 1);
                  const updated = await api(`/workouts/${id}/sets`, {
                    method: "POST",
                    body: JSON.stringify({
                      exercise_id: firstExerciseId,
                      reps: 5,
                      weight_kg: 20,
                      rpe: null,
                    }),
                  });
                  setWorkout(updated);
                } catch (err: any) {
                  setError(err?.message || "Failed to add set");
                }
              }}
              className="rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              + Add set
            </button>
          </div>

          {(!workout.sets || workout.sets.length === 0) ? (
            <div className="text-gray-700">No sets recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-700">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Exercise</th>
                    <th className="py-2 pr-2">Reps</th>
                    <th className="py-2 pr-2">Weight (kg)</th>
                    <th className="py-2 pr-2">RPE</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {workout.sets.map((s: any, i: number) => (
                    <tr key={s.id ?? i} className="align-middle">
                      <td className="py-2 pr-2">{s.set_index ?? i + 1}</td>

                      <td className="py-2 pr-2">
                        <select
                          className="w-full rounded px-2 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={s.exercise_id}
                          onChange={(e) => {
                            const exercise_id = Number(e.target.value);
                            api(`/workouts/${id}/sets/${s.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ exercise_id }),
                            })
                              .then((updated) => setWorkout(updated))
                              .catch((err) =>
                                setError(err?.message || "Failed to update exercise")
                              );
                          }}
                        >
                          {Object.entries(exNames).map(([eid, name]) => (
                            <option key={eid} value={eid}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          className="w-full rounded px-2 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                          defaultValue={s.reps}
                          onBlur={(e) => {
                            const reps = Number(e.target.value);
                            api(`/workouts/${id}/sets/${s.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ reps }),
                            })
                              .then((updated) => setWorkout(updated))
                              .catch((err) =>
                                setError(err?.message || "Failed to update reps")
                              );
                          }}
                        />
                      </td>

                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          className="w-full rounded px-2 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                          defaultValue={s.weight_kg}
                          onBlur={(e) => {
                            const weight_kg = Number(e.target.value);
                            api(`/workouts/${id}/sets/${s.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ weight_kg }),
                            })
                              .then((updated) => setWorkout(updated))
                              .catch((err) =>
                                setError(err?.message || "Failed to update weight")
                              );
                          }}
                        />
                      </td>

                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step="0.5"
                          className="w-full rounded px-2 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                          defaultValue={s.rpe ?? ""}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            const rpe = raw === "" ? null : Number(raw);
                            api(`/workouts/${id}/sets/${s.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ rpe }),
                            })
                              .then((updated) => setWorkout(updated))
                              .catch((err) =>
                                setError(err?.message || "Failed to update RPE")
                              );
                          }}
                        />
                      </td>

                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm("Remove this set?")) return;
                            api(`/workouts/${id}/sets/${s.id}`, { method: "DELETE" })
                              .then(() => load())
                              .catch((err) =>
                                setError(err?.message || "Failed to delete set")
                              );
                          }}
                          className="rounded px-2 py-1 bg-gray-200 hover:bg-gray-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
