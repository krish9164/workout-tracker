import { useState } from "react";
import { api, setToken } from "../lib/api";

const HERO =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop"; // gym vibe

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@fit.dev");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("Demo");

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function parseErr(err: any) {
    try { const j = JSON.parse(err?.message || "{}"); return j?.detail || "Something went wrong"; }
    catch { return err?.message || "Something went wrong"; }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) return setError("Please enter email and password.");
    if (mode === "register" && !name.trim()) return setError("Please enter your name.");

    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim() };
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      setToken(data.access_token);
      window.location.href = "/";
    } catch (err: any) {
      setError(parseErr(err));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left hero */}
      <div className="hidden md:block relative">
        <img
          src={HERO}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/60 via-blue-700/40 to-emerald-600/30" />
        <div className="relative h-full w-full p-10 flex flex-col justify-end text-white">
          <div className="text-3xl font-bold">Workout Tracker</div>
          <p className="mt-2 text-white/80 max-w-md">Log smarter. Lift better. Stay consistent with weekly insights.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-sm text-gray-600">
              {mode === "login" ? "Sign in to continue" : "It only takes a minute"}
            </p>
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label className="block text-sm font-medium">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Password</label>
            <div className="flex gap-2">
              <input
                type={showPwd ? "text" : "password"}
                className="input flex-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <button className="btn btn-primary w-full" disabled={loading}>
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
    </div>
  );
}
