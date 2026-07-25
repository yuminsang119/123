import { SEVERITY_COLORS } from "./DisasterMap";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  return `${hours}시간 전`;
}

function AlertCard({ alert, selected, onSelect, onReport, index }) {
  const color = SEVERITY_COLORS[alert.severity] || "#6b7280";
  return (
    <button
      type="button"
      onClick={() => onSelect(alert.id)}
      className={`alert-item ${selected ? "selected" : ""}`}
      style={{
        "--alert-color": color,
        "--stagger-delay": `${Math.min(index, 7) * 55}ms`,
      }}
    >
      <span className="severity-rail" />
      <div className="alert-layout">
        <div
          className="alert-icon"
          style={{ background: `${color}12`, color }}
        >
          {alert.icon}
        </div>
        <div className="alert-copy">
          <div className="alert-title-row">
            <span
              className="severity-label"
              style={{ color, background: `${color}12` }}
            >
              {alert.severityLabel}
            </span>
            <strong>{alert.title}</strong>
            <span className="alert-distance">
              {alert.distanceKm}km
            </span>
          </div>
          <p className="alert-message">{alert.message}</p>
          <div className="alert-meta">
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
              className="report-link"
            >
              119 신고
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
    <div className="alert-list">
      {alerts.length === 0 ? (
        <div className={`empty-alerts ${status === "locating" ? "loading" : ""}`}>
          {status === "locating" ? (
            <>
              <span className="loading-pulse" />
              주변 안전정보를 확인하고 있습니다
            </>
          ) : (
            "주변에 발효된 재난알림이 없습니다."
          )}
        </div>
      ) : (
        <div className="alert-stack">
          {alerts.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={index}
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
