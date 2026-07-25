import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bell,
  ChevronRight,
  Home,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
} from "react-feather";
import useGeolocation, { DEFAULT_LOCATION } from "../hooks/useGeolocation";
import DisasterMap from "./DisasterMap";
import DisasterList from "./DisasterList";
import EmergencyChat from "./EmergencyChat";
import VoiceCall from "./VoiceCall";

export default function App() {
  const { location, status } = useGeolocation();
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [activeDisaster, setActiveDisaster] = useState(null);
  const [tab, setTab] = useState("chat"); // chat | voice
  const [mobileView, setMobileView] = useState("home"); // home | map | report
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const center = location || DEFAULT_LOCATION;

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setVoiceEnabled(Boolean(c.voiceEnabled)))
      .catch(() => setVoiceEnabled(false));
  }, []);

  const loadAlerts = useCallback(() => {
    if (!location) return;
    setLoadingAlerts(true);
    fetch(`/api/disasters?lat=${location.lat}&lon=${location.lon}&radius=30`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  }, [location]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleReport = useCallback((alert) => {
    setActiveDisaster(alert);
    setSelectedId(alert.id);
    setTab("chat");
    setMobileView("report");
  }, []);

  const emergencyCount = alerts.filter((a) => a.severity === "emergency").length;
  const warningCount = alerts.filter((a) =>
    ["emergency", "warning"].includes(a.severity),
  ).length;
  const locationLabel =
    status === "ready"
      ? "현재 위치 반경 30km"
      : status === "fallback"
        ? "서울시청 반경 30km"
        : "현재 위치 확인 중";
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(updatedAt))
    : "--:--";

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand-mark">
          <Shield size={20} fill="currentColor" />
        </div>
        <div className="min-w-0">
          <h1 className="brand-title">안심119</h1>
          <p className="brand-subtitle">내 주변 안전을 한눈에</p>
        </div>
        <div className="header-location">
          <MapPin size={14} />
          <span>{locationLabel}</span>
        </div>
        <button
          type="button"
          onClick={loadAlerts}
          className="icon-button"
          aria-label="재난정보 새로고침"
        >
          <RefreshCw size={18} className={loadingAlerts ? "animate-spin" : ""} />
        </button>
        <a href="tel:119" className="call-pill">
          <Phone size={16} fill="currentColor" />
          <span>119</span>
        </a>
      </header>

      <main className="dashboard-grid">
        <section
          className={`map-panel ${mobileView === "map" ? "mobile-active" : ""}`}
        >
          <div className="panel-heading map-heading">
            <div>
              <p className="eyebrow">실시간 안전 지도</p>
              <h2>내 주변 재난 현황</h2>
            </div>
            <span className="live-badge">
              <i /> LIVE
            </span>
          </div>
          <div className="map-wrap">
            <DisasterMap
              center={center}
              alerts={alerts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="map-status">
            <Navigation size={15} />
            <span>{locationLabel}</span>
            <span className="ml-auto">마지막 갱신 {updatedLabel}</span>
          </div>
        </section>

        <section
          className={`feed-panel ${mobileView === "home" ? "mobile-active" : ""}`}
        >
          <div className="safety-hero">
            <div className="hero-glow" />
            <div className="hero-top">
              <span className="hero-kicker">
                <Activity size={14} /> 실시간 안전 브리핑
              </span>
              <span className="hero-time">{updatedLabel} 기준</span>
            </div>
            <div className="hero-content">
              <div>
                <p className="hero-label">주변에 확인이 필요한 알림</p>
                <div className="hero-number">
                  {warningCount}<small>건</small>
                </div>
              </div>
              <div className="hero-orbit">
                <Bell size={29} />
                {emergencyCount > 0 && <b>{emergencyCount}</b>}
              </div>
            </div>
            <button
              type="button"
              className="hero-map-link"
              onClick={() => setMobileView("map")}
            >
              지도에서 위치 확인 <ChevronRight size={16} />
            </button>
          </div>

          <div className="quick-actions">
            <button type="button" onClick={() => setMobileView("report")}>
              <span className="quick-icon red">
                <MessageCircle size={20} />
              </span>
              <span>
                <b>문자로 신고</b>
                <small>말하기 어려울 때</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <a href="tel:119">
              <span className="quick-icon dark">
                <Phone size={20} />
              </span>
              <span>
                <b>119 전화</b>
                <small>긴급상황 즉시 연결</small>
              </span>
              <ChevronRight size={17} />
            </a>
          </div>

          <div className="feed-card">
            <div className="feed-toolbar">
              <div>
                <p className="eyebrow">NEARBY ALERTS</p>
                <h2>내 주변 알림</h2>
              </div>
              <button
                type="button"
                onClick={loadAlerts}
                className="text-button"
              >
                전체 {alerts.length}건
                <ChevronRight size={15} />
              </button>
            </div>
            <DisasterList
              alerts={alerts}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReport={handleReport}
              status={status}
            />
          </div>
        </section>

        <section
          className={`report-panel ${mobileView === "report" ? "mobile-active" : ""}`}
        >
          <div className="report-heading">
            <div className="dispatcher-avatar">
              <span>119</span>
            </div>
            <div>
              <p className="eyebrow">24시간 연결</p>
              <h2>119 상황실</h2>
            </div>
            <span className="online-dot">접수 가능</span>
          </div>
          <div className="report-tabs">
            <button
              type="button"
              onClick={() => setTab("chat")}
              className={tab === "chat" ? "active" : ""}
            >
              <MessageCircle size={16} /> 문자 신고
            </button>
            <button
              type="button"
              onClick={() => setTab("voice")}
              className={tab === "voice" ? "active" : ""}
            >
              <Phone size={16} /> 음성 통화
            </button>
          </div>
          <div className="report-body">
            {tab === "chat" ? (
              <EmergencyChat
                location={location}
                activeDisaster={activeDisaster}
                onClearDisaster={() => setActiveDisaster(null)}
              />
            ) : voiceEnabled ? (
              <VoiceCall location={location} />
            ) : (
              <div className="voice-unavailable">
                <div className="voice-icon">
                  <Phone size={27} />
                </div>
                <h3>음성 연결 준비 중</h3>
                <p>현재는 문자 신고를 이용하거나<br />119로 바로 전화해 주세요.</p>
                <a href="tel:119" className="primary-call">
                  <Phone size={17} fill="currentColor" /> 119 전화 연결
                </a>
              </div>
            )}
          </div>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="주 메뉴">
        <button
          type="button"
          className={mobileView === "home" ? "active" : ""}
          onClick={() => setMobileView("home")}
        >
          <Home size={21} />
          <span>안전홈</span>
        </button>
        <button
          type="button"
          className={mobileView === "map" ? "active" : ""}
          onClick={() => setMobileView("map")}
        >
          <Map size={21} />
          <span>재난지도</span>
        </button>
        <button
          type="button"
          className={mobileView === "report" ? "active report-nav" : "report-nav"}
          onClick={() => setMobileView("report")}
        >
          <span className="nav-emergency">
            <MessageCircle size={22} />
          </span>
          <span>119 신고</span>
        </button>
      </nav>
    </div>
  );
}
