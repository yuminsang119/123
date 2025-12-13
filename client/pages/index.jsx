import Layout, { useMe } from "../components/Layout";

export default function Index() {
  const { user, loading } = useMe();

  return (
    <Layout>
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            내부망 전용 포털
          </div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            대전소방본부 인트라넷
          </h2>
          <p className="text-slate-600">
            공지/자료 공유, 근무표 확인, 내부 커뮤니케이션을 한 곳에서.
          </p>

          <div className="flex flex-wrap gap-2">
            {loading ? null : user ? (
              <>
                <a
                  href="/board"
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  게시판으로 이동
                </a>
                <a
                  href="/fire_station_schedule.html"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  근무표 보기
                </a>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  로그인
                </a>
                <a
                  href="/board"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  게시판(로그인 필요)
                </a>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-semibold">공지/게시판</div>
              <div className="mt-1 text-xs text-slate-600">
                공지, 자료, 현장 공유
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-semibold">근무표</div>
              <div className="mt-1 text-xs text-slate-600">
                3조 2교대 월간 계획
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-semibold">권한/보안</div>
              <div className="mt-1 text-xs text-slate-600">
                쿠키 기반 로그인 세션
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-semibold">DB 기반</div>
              <div className="mt-1 text-xs text-slate-600">
                SQLite로 게시글/사용자 저장
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
