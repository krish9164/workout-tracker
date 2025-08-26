import { useState } from "react";
import { api, setToken } from "../lib/api";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@fit.dev");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("Demo");

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function parseErr(err: any) {
    try {
      const j = JSON.parse(err?.message || "{}");
      return j?.detail || "Something went wrong";
    } catch {
      return err?.message || "Something went wrong";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email: email.trim(), password }
          : { email: email.trim(), password, name: name.trim() };

      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      setToken(data.access_token);
      window.location.href = "/";
    } catch (err: any) {
      setError(parseErr(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-100 text-gray-900">
      <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Workout Tracker</h1>
          <p className="text-sm text-gray-600">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {mode === "register" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium">Name</label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              autoComplete="name"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium">Email</label>
          <input
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Password</label>
          <div className="flex gap-2">
            <input
              type={showPwd ? "text" : "password"}
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="btn btn-ghost whitespace-nowrap"
              title={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          className="btn btn-primary w-full disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="btn btn-ghost w-full"
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
