import { useEffect, useState } from "react";

// Seoul City Hall — used as a graceful fallback when the browser cannot or
// will not provide a location.
export const DEFAULT_LOCATION = { lat: 37.5665, lon: 126.978 };

/**
 * Resolve the user's coordinate via the browser Geolocation API, falling back
 * to a default so the rest of the app always has something to render.
 */
export default function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("locating"); // locating | ready | fallback
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation(DEFAULT_LOCATION);
      setStatus("fallback");
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLocation(DEFAULT_LOCATION);
        setStatus("fallback");
      }
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("ready");
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setError(err.message);
        setLocation(DEFAULT_LOCATION);
        setStatus("fallback");
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
    );

    return () => clearTimeout(timer);
  }, []);

  return { location, status, error };
}
