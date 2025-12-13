import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인 상태면 홈으로
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.user) window.location.href = "/";
      } catch {
        // ignore
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "로그인 실패");
      window.location.href = "/";
    } catch (err) {
      setError(err?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="로그인">
      <div className="mx-auto grid max-w-md gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-sm font-semibold">대전소방본부 인트라넷</div>
            <div className="mt-1 text-xs text-slate-600">
              내부 계정으로 로그인하세요.
            </div>
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            <label className="grid gap-1">
              <span className="text-xs text-slate-600">아이디</span>
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="예: admin"
                autoComplete="username"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-600">비밀번호</span>
              <input
                type="password"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading || !username || !password}
              className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="text-xs text-slate-500">
              기본 관리자 계정은 서버 최초 실행 시 자동 생성됩니다.
            </div>
          </form>
        </div>

        <a
          href="/"
          className="text-center text-sm text-slate-600 hover:text-slate-900"
        >
          홈으로
        </a>
      </div>
    </Layout>
  );
}
