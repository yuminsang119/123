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
      className={`alert-item ${selected ? "selected" : ""}`}
      style={{ "--alert-color": color }}
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
        <div className="empty-alerts">
          주변에 발효된 재난알림이 없습니다.
        </div>
      ) : (
        <div className="alert-stack">
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
