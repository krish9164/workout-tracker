import { useEffect, useState } from "react";
import { api, ApiError, clearToken } from "../lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";


type Point = { date: string; volume: number };

export default function Analytics() {
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  async function load(nDays: number) {
    setLoading(true);
    setError(null);
    try {
      const [meData, points] = await Promise.all([
        api("/me"),
        api(`/analytics/daily-volume?days=${nDays}`),
      ]);
      setMe(meData);
      setData(points);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        window.location.href = "/login";
        return;
      }
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <div className="flex gap-2">
            <a
              href="/history"
              className="rounded px-3 py-2 bg-gray-200 hover:bg-gray-300 transition"
            >
              ← History
            </a>
          </div>
        </div>

        {/* Who */}
        <div className="rounded-xl p-4 bg-white shadow-sm text-sm text-gray-700">
          Signed in as <b>{me?.name}</b> ({me?.email})
        </div>

        {/* Controls */}
        <div className="rounded-xl p-4 bg-white shadow-sm flex items-center gap-3">
          <span className="text-sm text-gray-700">Days:</span>
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

        {/* Chart */}
        <div className="rounded-xl p-4 bg-white shadow-md" style={{ height: 360 }}>
          {loading ? (
            <div className="p-4 text-gray-700">Loading chart…</div>
          ) : error ? (
            <div className="p-4 text-red-600">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="volume" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Small explainer */}
        <div className="text-sm text-gray-600">
          Daily volume = sum of <code>reps × weight</code> across all sets recorded that day.
        </div>
      </div>
    </div>
  );
}
