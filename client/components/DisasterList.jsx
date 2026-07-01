import { SEVERITY_COLORS } from "./DisasterMap";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  return `${hours}시간 전`;
}

function AlertCard({ alert, selected, onSelect, onReport }) {
  const color = SEVERITY_COLORS[alert.severity] || "#6b7280";
  return (
    <button
      type="button"
      onClick={() => onSelect(alert.id)}
      className={`w-full text-left p-3 rounded-xl border transition-shadow bg-white hover:shadow-md ${
        selected ? "ring-2 ring-offset-1" : "border-gray-200"
      }`}
      style={selected ? { borderColor: color, boxShadow: `0 0 0 2px ${color}22` } : {}}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ background: `${color}1a` }}
        >
          {alert.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: color }}
            >
              {alert.severityLabel}
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {alert.category}
            </span>
            <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
              {alert.distanceKm}km
            </span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>{alert.agency}</span>
            <span>·</span>
            <span>{timeAgo(alert.issuedAt)}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onReport(alert);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onReport(alert);
                }
              }}
              className="ml-auto text-red-600 font-semibold hover:underline cursor-pointer"
            >
              119 신고 →
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function DisasterList({
  alerts,
  selectedId,
  onSelect,
  onReport,
  status,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">주변 재난알림</h2>
        <span className="text-xs text-gray-500">
          {status === "ready"
            ? "현재 위치 기준"
            : status === "fallback"
              ? "기본 위치(서울) 기준"
              : "위치 확인 중…"}
          {" · "}
          {alerts.length}건
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          주변에 발효된 재난알림이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              selected={alert.id === selectedId}
              onSelect={onSelect}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}
