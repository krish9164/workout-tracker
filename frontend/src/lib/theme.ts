export function initTheme() {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = stored ?? (prefersDark ? "dark" : "light");
  setTheme(theme as "light" | "dark");
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark");
}

export function setTheme(mode: "light" | "dark") {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem("theme", mode);
}
