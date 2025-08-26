import { PropsWithChildren } from "react";
import { toggleTheme } from "../lib/theme";

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-brand-600 text-white grid place-items-center font-bold">WT</div>
          <div className="text-lg font-semibold">Workout&nbsp;Tracker</div>
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          <a className="block rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" href="/">Dashboard</a>
          <a className="block rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" href="/new-workout">New Workout</a>
          <a className="block rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" href="/history">History</a>
          <a className="block rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" href="/analytics">Analytics</a>
        </nav>
        <div className="mt-6">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost w-full"
            title="Toggle dark mode"
          >
            🌙 / ☀️ Theme
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <button
              className="md:hidden btn btn-ghost"
              onClick={() => alert("Mobile menu (optional)")}
            >
              ☰
            </button>
            <div className="font-semibold md:hidden">Workout Tracker</div>
            <div className="flex items-center gap-2">
              <a className="btn btn-ghost" href="/history">History</a>
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
