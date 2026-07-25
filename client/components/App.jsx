import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, MessageSquare, Phone, RefreshCw } from "react-feather";
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
  }, []);

  const emergencyCount = alerts.filter((a) => a.severity === "emergency").length;

  return (
    <div className="h-full w-full flex flex-col bg-gray-100 text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14 bg-red-600 text-white shadow-md flex-shrink-0 safe-top">
        <AlertTriangle size={22} className="flex-shrink-0" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-bold text-base truncate">119 안심콜</span>
          <span className="text-[11px] text-red-100 hidden xs:inline sm:inline">
            주변 재난알림 · 양방향 신고
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {emergencyCount > 0 && (
            <span className="text-xs bg-white text-red-700 font-bold px-2 py-1 rounded-full whitespace-nowrap">
              심각 {emergencyCount}
            </span>
          )}
          <a
            href="tel:119"
            className="flex items-center gap-1.5 bg-white text-red-700 font-bold text-sm px-3 py-2 rounded-full hover:bg-red-50 active:scale-95"
          >
            <Phone size={15} /> 119
          </a>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
        {/* Left: map + list */}
        <section className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4 lg:overflow-hidden">
          <div className="h-56 sm:h-64 lg:h-[45%] flex-shrink-0 relative rounded-xl shadow-sm bg-white p-1">
            <DisasterMap
              center={center}
              alerts={alerts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="flex-1 lg:overflow-y-auto bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-end mb-2">
              <button
                type="button"
                onClick={loadAlerts}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                <RefreshCw size={13} className={loadingAlerts ? "animate-spin" : ""} />
                새로고침
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

        {/* Right: 119 communication */}
        <section className="w-full lg:w-[400px] flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden min-h-[420px] lg:min-h-0">
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={() => setTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold ${
                tab === "chat"
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-500"
              }`}
            >
              <MessageSquare size={16} /> 문자 신고
            </button>
            <button
              type="button"
              onClick={() => setTab("voice")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold ${
                tab === "voice"
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-500"
              }`}
            >
              <Phone size={16} /> 음성 통화
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {tab === "chat" ? (
              <EmergencyChat
                location={location}
                activeDisaster={activeDisaster}
                onClearDisaster={() => setActiveDisaster(null)}
              />
            ) : voiceEnabled ? (
              <VoiceCall location={location} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 bg-gray-50">
                <Phone size={36} className="text-gray-300" />
                <p className="text-sm text-gray-500">
                  음성 통화는 서버에 <code>OPENAI_API_KEY</code>가 설정된 경우
                  사용할 수 있습니다.
                </p>
                <p className="text-xs text-gray-400">
                  지금은 <b>문자 신고</b>로 상황실과 연결하거나, 아래 버튼으로
                  실제 119에 전화하세요.
                </p>
                <a
                  href="tel:119"
                  className="mt-1 flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-red-700"
                >
                  <Phone size={16} /> 119 전화 걸기
                </a>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
