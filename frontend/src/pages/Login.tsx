import { useState } from "react";
import { api, setToken } from "../lib/api";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@fit.dev");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("Demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      setToken(data.access_token);
      window.location.href = "/";
    } catch (err: any) {
      // Show a friendlier message if backend returns a big blob
      const msg = (() => {
        try {
          const json = JSON.parse(err?.message || "{}");
          return json?.detail || "Something went wrong";
        } catch {
          return err?.message || "Something went wrong";
        }
      })();
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white shadow-md rounded-xl p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Workout Tracker</h1>
          <p className="text-sm text-gray-600">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {mode === "register" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-800">Name</label>
            <input
              className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-800">Email</label>
          <input
            className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-800">Password</label>
          <input
            type="password"
            className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          className="w-full rounded-lg px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="w-full rounded-lg px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 transition"
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
