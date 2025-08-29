import { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { toggleTheme } from "../lib/theme";

export default function AppShell({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/new-workout", label: "New Workout" },
    { href: "/history", label: "History" },
    { href: "/analytics", label: "Analytics" },
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold">WT</div>
          <div className="text-lg font-semibold">Workout&nbsp;Tracker</div>
        </div>

        <nav className="px-3 py-2 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <a key={l.href} href={l.href} className={`navlink ${active ? "navlink-active" : ""}`}>
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <button onClick={toggleTheme} className="btn btn-ghost w-full" title="Toggle dark mode">
            🌙 / ☀️ Theme
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-gray-900/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <div className="md:hidden font-semibold">Workout Tracker</div>
            <div className="flex items-center gap-2">
              <a className="btn btn-ghost hidden sm:inline-flex" href="/history">History</a>
              <a className="btn btn-primary" href="/new-workout">New Workout</a>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
