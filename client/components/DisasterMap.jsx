import { useEffect, useRef } from "react";

export const SEVERITY_COLORS = {
  emergency: "#dc2626",
  warning: "#ea580c",
  caution: "#d97706",
  info: "#2563eb",
};

// Renders a Leaflet map (loaded globally from the CDN in index.html) showing
// the user's location and nearby disaster alerts. Rendered client-side only.
export default function DisasterMap({ center, alerts, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);

  // Initialize the map once the container and Leaflet are available.
  useEffect(() => {
    if (typeof window === "undefined" || !window.L || !containerRef.current) {
      return undefined;
    }
    if (mapRef.current) return undefined;

    const L = window.L;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lon],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    };
  }, []);

  // Keep the user marker + view in sync with the resolved location.
  useEffect(() => {
    const L = typeof window !== "undefined" ? window.L : null;
    const map = mapRef.current;
    if (!L || !map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([center.lat, center.lon]);
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.35)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker([center.lat, center.lon], { icon })
        .addTo(map)
        .bindPopup("현재 위치");
    }
    map.setView([center.lat, center.lon]);
  }, [center.lat, center.lon]);

  // Sync alert markers.
  useEffect(() => {
    const L = typeof window !== "undefined" ? window.L : null;
    const map = mapRef.current;
    if (!L || !map) return;

    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    alerts.forEach((alert) => {
      const color = SEVERITY_COLORS[alert.severity] || "#6b7280";
      const isSelected = alert.id === selectedId;
      const size = isSelected ? 40 : 32;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:${isSelected ? 18 : 15}px;">${alert.icon}</span>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
      });
      const marker = L.marker([alert.lat, alert.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>[${alert.severityLabel}] ${alert.category}</strong><br/>${alert.title}<br/><span style="color:#6b7280">${alert.distanceKm}km · ${alert.agency}</span>`,
        );
      marker.on("click", () => onSelect && onSelect(alert.id));
      markersRef.current[alert.id] = marker;
    });
  }, [alerts, selectedId, onSelect]);

  // Pan to and open the selected alert's popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current[selectedId];
    const alert = alerts.find((a) => a.id === selectedId);
    if (marker && alert) {
      map.panTo([alert.lat, alert.lon]);
      marker.openPopup();
    }
  }, [selectedId, alerts]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "260px", background: "#e5e7eb", zIndex: 0 }}
    />
  );
}
