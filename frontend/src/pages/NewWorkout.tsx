import { useEffect, useState } from "react";
import { api, clearToken } from "../lib/api";

type Exercise = { id: number; name: string };

type SetRow = {
  exercise_id: number | "";
  reps: number | "";
  weight_kg: number | "";
  rpe: number | "";
};

export default function NewWorkout() {
  // page data
  const [me, setMe] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [title, setTitle] = useState("Workout");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [rows, setRows] = useState<SetRow[]>([
    { exercise_id: "", reps: "", weight_kg: "", rpe: "" },
    { exercise_id: "", reps: "", weight_kg: "", rpe: "" },
  ]);

  // ui state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // load user + exercises
  useEffect(() => {
    Promise.all([api("/me"), api("/exercises")])
      .then(([meData, exData]) => {
        setMe(meData);
        setExercises(exData);
      })
      .catch(() => {
        clearToken();
        window.location.href = "/login";
      });
  }, []);

  function updateRow(i: number, patch: Partial<SetRow>) {
    setRows((curr) => curr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((curr) => [...curr, { exercise_id: "", reps: "", weight_kg: "", rpe: "" }]);
  }

  function removeRow(i: number) {
    setRows((curr) => curr.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);

    // only keep rows that are fully filled in
    const clean = rows
      .map((r, idx) => ({
        exercise_id: Number(r.exercise_id),
        set_index: idx + 1,
        reps: Number(r.reps),
        weight_kg: Number(r.weight_kg),
        rpe: r.rpe === "" ? null : Number(r.rpe),
      }))
      .filter(
        (r) =>
          Number.isFinite(r.exercise_id) &&
          Number.isFinite(r.reps) &&
          Number.isFinite(r.weight_kg) &&
          r.reps > 0 &&
          r.weight_kg >= 0
      );

    if (clean.length === 0) {
      setSaving(false);
      setError("Please add at least one complete set.");
      return;
    }

    try {
      await api("/workouts", {
        method: "POST",
        body: JSON.stringify({
          date,          // "YYYY-MM-DD"
          title,         // string
          sets: clean,   // [{exercise_id, set_index, reps, weight_kg, rpe?}]
        }),
      });
      setOk("Saved! Going to History…");
      setTimeout(() => (window.location.href = "/history"), 800);
    } catch (err: any) {
      setError(err?.message || "Failed to save workout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header row (AppShell provides the global chrome) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Workout</h1>
        <a href="/history" className="btn btn-ghost">← History</a>
      </div>

      {/* Who's logged in */}
      <div className="card p-4 text-sm">
        Signed in as <b>{me?.name}</b> ({me?.email})
      </div>

      {/* Form */}
      <form onSubmit={submit} className="card p-6 space-y-5">
        {/* Basics */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upper Body A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Sets table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sets</h2>
            <button
              type="button"
              onClick={addRow}
              className="btn btn-primary"
            >
              + Add set
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Exercise</th>
                  <th className="py-2 pr-2">Reps</th>
                  <th className="py-2 pr-2">Weight (kg)</th>
                  <th className="py-2 pr-2">RPE (optional)</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="align-middle">
                    <td className="py-2 pr-2">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <select
                        className="input"
                        value={r.exercise_id}
                        onChange={(e) =>
                          updateRow(i, { exercise_id: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                      >
                        <option value="">Choose…</option>
                        {exercises.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={r.reps}
                        onChange={(e) => updateRow(i, { reps: e.target.value === "" ? "" : Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        className="input"
                        value={r.weight_kg}
                        onChange={(e) =>
                          updateRow(i, { weight_kg: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step="0.5"
                        className="input"
                        value={r.rpe}
                        onChange={(e) => updateRow(i, { rpe: e.target.value === "" ? "" : Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="btn btn-ghost"
                        disabled={rows.length === 1}
                        title={rows.length === 1 ? "Keep at least one set" : "Remove"}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {ok && <div className="text-sm text-green-700">{ok}</div>}

          <div className="flex justify-end">
            <button
              className="btn btn-primary disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save workout"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
