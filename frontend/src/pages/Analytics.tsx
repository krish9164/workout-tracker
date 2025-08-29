// src/pages/Analytics.tsx
import { useEffect, useState } from "react";
import { api, ApiError, clearToken } from "../lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";

type DailyPoint = { date: string; volume: number };
type WeeklyPoint = { week_start: string; volume: number };
type MaxW = { exercise_id: number; exercise_name: string; max_weight: number };

export default function Analytics() {
  const [me, setMe] = useState<any>(null);

  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);

  const [weeks, setWeeks] = useState(10);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const [maxw, setMaxW] = useState<MaxW[]>([]);
  const [maxwLoading, setMaxWLoading] = useState(true);

  // Weekly recap (LLM) states
  const [recap, setRecap] = useState<string | null>(null);
  const [recapStats, setRecapStats] = useState<any | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapErr, setRecapErr] = useState<string | null>(null);
  const [recapSentMsg, setRecapSentMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  async function loadAll(nDays: number, nWeeks: number) {
    setError(null);
    setDailyLoading(true);
    setWeeklyLoading(true);
    setMaxWLoading(true);
    try {
      const [meData, dailyData, weeklyData, maxwData] = await Promise.all([
        api("/me"),
        api(`/analytics/daily-volume?days=${nDays}`),
        api(`/analytics/weekly-volume?weeks=${nWeeks}`),
        api(`/analytics/max-weight?top_n=8`),
      ]);
      setMe(meData);
      setDaily(dailyData);
      setWeekly(weeklyData);
      setMaxW(maxwData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      setError("Failed to load analytics.");
    } finally {
      setDailyLoading(false);
      setWeeklyLoading(false);
      setMaxWLoading(false);
    }
  }

  async function previewWeeklyRecap() {
    setRecapErr(null);
    setRecapSentMsg(null);
    setRecapLoading(true);
    try {
      const data = await api("/analytics/weekly-summary");
      setRecap(data?.summary || "");
      setRecapStats(data?.stats || null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      setRecapErr("Failed to load weekly recap.");
    } finally {
      setRecapLoading(false);
    }
  }

  async function sendWeeklyRecap() {
    setRecapErr(null);
    setRecapSentMsg(null);
    setRecapLoading(true);
    try {
      const sent = await api("/analytics/send-weekly-summary", { method: "POST" });
      setRecapSentMsg(`Sent to ${sent?.sent_to || me?.email || "your email"}.`);
      // If we don't have a preview yet, fetch it now so the user can also read it on-screen.
      if (!recap) {
        const data = await api("/analytics/weekly-summary");
        setRecap(data?.summary || "");
        setRecapStats(data?.stats || null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      setRecapErr("Failed to send weekly recap email.");
    } finally {
      setRecapLoading(false);
    }
  }

  useEffect(() => {
    loadAll(days, weeks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, weeks]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <div className="flex gap-2">
            <a href="/history" className="rounded px-3 py-2 bg-gray-200 hover:bg-gray-300 transition">← History</a>
          </div>
        </div>

        {/* Who */}
        <div className="rounded-xl p-4 bg-white shadow-sm text-sm text-gray-700">
          Signed in as <b>{me?.name}</b> ({me?.email})
        </div>

        {error && <div className="rounded-xl p-3 bg-red-50 text-red-700">{error}</div>}

        {/* Daily Volume */}
        <div className="rounded-xl p-4 bg-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Daily Volume</h2>
            <div className="text-sm flex items-center gap-2">
              <span>Days:</span>
              <select
                className="rounded border border-gray-300 px-2 py-1"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </div>
          </div>
          <div style={{ height: 320 }}>
            {dailyLoading ? (
              <div className="p-2 text-gray-600">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="volume" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Daily volume = sum of <code>reps × weight</code> across all sets that day.
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="rounded-xl p-4 bg-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weekly Volume</h2>
            <div className="text-sm flex items-center gap-2">
              <span>Weeks:</span>
              <select
                className="rounded border border-gray-300 px-2 py-1"
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>
          <div style={{ height: 320 }}>
            {weeklyLoading ? (
              <div className="p-2 text-gray-600">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week_start" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="volume" dot={false} name="Volume (sum reps×kg)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Week starts on Monday. Volume is aggregated across all workouts in that week.
          </div>
        </div>

        {/* Heaviest Weight per Exercise */}
        <div className="rounded-xl p-4 bg-white shadow-md space-y-3">
          <h2 className="text-xl font-semibold">Heaviest Weight per Exercise</h2>
          <div style={{ height: 360 }}>
            {maxwLoading ? (
              <div className="p-2 text-gray-600">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maxw} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="exercise_name"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="max_weight" name="Max weight (kg)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Shows your single heaviest set for each exercise (kg).
          </div>
        </div>

        {/* Weekly Recap (LLM summary + email) */}
        <div className="rounded-xl p-4 bg-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weekly Recap</h2>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost"
                onClick={previewWeeklyRecap}
                disabled={recapLoading}
                title="Generate a short motivational summary of your week"
              >
                {recapLoading ? "Loading…" : "Preview recap"}
              </button>
              <button
                className="btn btn-primary"
                onClick={sendWeeklyRecap}
                disabled={recapLoading}
                title="Email this week's recap to your inbox"
              >
                {recapLoading ? "Sending…" : "Email me now"}
              </button>
            </div>
          </div>

          {recapErr && (
            <div className="rounded-md p-3 bg-red-50 text-red-700 text-sm">{recapErr}</div>
          )}
          {recapSentMsg && (
            <div className="rounded-md p-3 bg-green-50 text-green-700 text-sm">{recapSentMsg}</div>
          )}

          {recap ? (
            <div className="space-y-3">
              <div className="whitespace-pre-wrap text-sm leading-6">{recap}</div>
              {recapStats && (
                <div className="text-xs text-gray-600">
                  <div>Week: {recapStats.week_start} → {recapStats.week_end}</div>
                  <div>Days trained: {recapStats.days_trained} • Workouts: {recapStats.workouts} • Sets: {recapStats.total_sets}</div>
                  <div>Total volume: {recapStats.total_volume} (Δ vs last week: {recapStats.volume_change_vs_last_week >= 0 ? "+" : ""}{recapStats.volume_change_vs_last_week})</div>
                  {recapStats.missed_groups?.length > 0 && (
                    <div>Missed groups: {recapStats.missed_groups.join(", ")}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Generate a short motivational summary of your current week and optionally send it to your email.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
