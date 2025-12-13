import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";

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
    const err = new Error(message);
    // 상태코드가 필요하면 이후 확장 가능
    throw err;
  }
  return data;
}

export default function BoardPage() {
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [q, setQ] = useState("");
  const [posts, setPosts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  const [mode, setMode] = useState("view"); // view | new | edit
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canEditSelected = useMemo(() => {
    if (!me || !selected) return false;
    return me.role === "admin" || me.id === selected.author_id;
  }, [me, selected]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setMeLoading(true);
      try {
        const data = await api("/api/me");
        if (!cancelled) setMe(data?.user || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPosts(nextQ = q) {
    const query = nextQ.trim() ? `?q=${encodeURIComponent(nextQ.trim())}` : "";
    const data = await api(`/api/posts${query}`);
    setPosts(data?.posts || []);
  }

  async function loadPost(id) {
    const data = await api(`/api/posts/${id}`);
    setSelected(data?.post || null);
  }

  useEffect(() => {
    if (meLoading) return;
    if (!me) return;
    loadPosts().catch((e) => setError(e.message));
  }, [meLoading, me]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    loadPost(selectedId).catch((e) => setError(e.message));
  }, [selectedId]);

  useEffect(() => {
    if (mode === "new") {
      setTitle("");
      setContent("");
    }
    if (mode === "edit" && selected) {
      setTitle(selected.title || "");
      setContent(selected.content || "");
    }
  }, [mode, selected]);

  async function createPost() {
    setSaving(true);
    setError("");
    try {
      const data = await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      await loadPosts("");
      setQ("");
      setSelectedId(Number(data.id));
      setMode("view");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updatePost() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/posts/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      await loadPost(selectedId);
      await loadPosts(q);
      setMode("view");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!selectedId) return;
    if (!window.confirm("정말 삭제할까요?")) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/posts/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      setSelected(null);
      setMode("view");
      await loadPosts(q);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!meLoading && !me) {
    return (
      <Layout title="게시판">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold">로그인이 필요합니다.</div>
          <div className="mt-1 text-sm text-slate-600">
            게시판은 내부 계정으로 로그인 후 이용할 수 있습니다.
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              로그인
            </a>
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              홈
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="게시판">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="검색 (제목/내용)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <button
                onClick={() => loadPosts(q).catch((e) => setError(e.message))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                검색
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setMode("new")}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                새 글
              </button>
              <button
                onClick={() => {
                  setQ("");
                  loadPosts("").catch((e) => setError(e.message));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="max-h-[65dvh] overflow-auto p-2">
            {posts.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">게시글이 없습니다.</div>
            ) : (
              <div className="grid gap-2">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setMode("view");
                    }}
                    className={`text-left rounded-xl border px-3 py-3 hover:bg-slate-50 ${
                      selectedId === p.id
                        ? "border-slate-400 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">
                      {p.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <div className="truncate">
                        {p.author_name} ({p.author_username})
                      </div>
                      <div>{(p.updated_at || p.created_at || "").slice(0, 16)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {mode === "new" ? (
            <div className="grid gap-3">
              <div className="text-sm font-semibold">새 글 작성</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용"
                rows={10}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="flex gap-2">
                <button
                  disabled={saving || !title.trim() || !content.trim()}
                  onClick={createPost}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "등록"}
                </button>
                <button
                  disabled={saving}
                  onClick={() => setMode("view")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="grid gap-3">
              {mode === "edit" ? (
                <>
                  <div className="text-sm font-semibold">게시글 수정</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용"
                    rows={10}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={saving || !title.trim() || !content.trim()}
                      onClick={updatePost}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => setMode("view")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      취소
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold tracking-tight">
                        {selected.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {selected.author_name} ({selected.author_username}) · {(
                          selected.updated_at || selected.created_at
                        ).slice(0, 16)}
                      </div>
                    </div>

                    {canEditSelected ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMode("edit")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={deletePost}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {selected.content}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="text-sm font-semibold">게시판</div>
              <div className="text-sm text-slate-600">
                왼쪽 목록에서 게시글을 선택하거나, "새 글"로 작성하세요.
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
