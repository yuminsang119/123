import { useEffect, useMemo, useState } from "react";

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json",
  );
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = data?.message || `요청 실패 (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function useMe() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await api("/api/me");
        if (!cancelled) setUser(data?.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, user, refresh: async () => api("/api/me") };
}

export default function Layout({ title, children }) {
  const { loading, user } = useMe();

  const nav = useMemo(
    () => [
      { href: "/", label: "홈" },
      { href: "/board", label: "게시판" },
      { href: "/fire_station_schedule.html", label: "근무표" },
    ],
    [],
  );

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <a href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-600" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">대전소방본부</div>
              <div className="text-xs text-slate-500">Intranet Portal</div>
            </div>
          </a>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {loading ? (
              <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-sm text-slate-600 sm:block">
                  <span className="font-medium text-slate-900">{user.name}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                로그인
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {title ? (
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          </div>
        ) : null}
        {children}
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© 대전소방본부 인트라넷</div>
          <div className="flex gap-3">
            <a className="hover:text-slate-700" href="/board">
              공지/게시
            </a>
            <a className="hover:text-slate-700" href="/fire_station_schedule.html">
              근무표
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
