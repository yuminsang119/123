// Nearby disaster alert data source.
//
// This module produces disaster alerts near a given coordinate. The output
// shape intentionally mirrors the Korean 재난문자 (emergency text) feeds
// published by 행정안전부 / 기상청 so that the mock source can later be swapped
// for the real open API (재난안전데이터공유플랫폼) without touching the client.

const EARTH_RADIUS_KM = 6371;

const DISASTER_TEMPLATES = [
  {
    type: "rain",
    label: "호우",
    icon: "🌧️",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 호우경보`,
      message: `[기상청] ${region}에 호우경보 발효. 하천변·저지대 침수 및 산사태 위험이 높습니다. 외출을 자제하고 안전한 곳으로 대피하세요.`,
    }),
  },
  {
    type: "typhoon",
    label: "태풍",
    icon: "🌀",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 태풍 북상`,
      message: `[기상청] 태풍이 ${region} 방향으로 북상 중입니다. 강풍·폭우에 대비해 간판·창문을 점검하고 외출을 삼가세요.`,
    }),
  },
  {
    type: "earthquake",
    label: "지진",
    icon: "🌐",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 인근 지진 발생`,
      message: `[기상청] ${region} 인근에서 지진이 발생했습니다. 낙하물에 주의하고 튼튼한 탁자 아래로 몸을 보호한 뒤 여진에 대비하세요.`,
    }),
  },
  {
    type: "wildfire",
    label: "산불",
    icon: "🔥",
    agency: "산림청",
    build: (region) => ({
      title: `${region} 산불 확산`,
      message: `[산림청] ${region} 산지에서 산불이 확산 중입니다. 연기 유입에 대비해 창문을 닫고 안내에 따라 신속히 대피하세요.`,
    }),
  },
  {
    type: "fire",
    label: "화재",
    icon: "🚒",
    agency: "소방청",
    build: (region) => ({
      title: `${region} 대형 화재`,
      message: `[소방청] ${region} 건물에서 화재가 발생했습니다. 해당 지역 접근을 피하고 연기 흡입에 주의하세요.`,
    }),
  },
  {
    type: "flood",
    label: "침수",
    icon: "🌊",
    agency: "행정안전부",
    build: (region) => ({
      title: `${region} 도로 침수`,
      message: `[행정안전부] ${region} 일대 도로가 침수되었습니다. 지하차도·하천 진입을 금지하고 우회 바랍니다.`,
    }),
  },
  {
    type: "snow",
    label: "대설",
    icon: "❄️",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 대설주의보`,
      message: `[기상청] ${region}에 대설주의보가 발효되었습니다. 빙판길 낙상과 교통 지연에 유의하세요.`,
    }),
  },
  {
    type: "heat",
    label: "폭염",
    icon: "🌡️",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 폭염경보`,
      message: `[기상청] ${region}에 폭염경보 발효. 낮 시간대 야외활동을 자제하고 충분한 수분을 섭취하세요.`,
    }),
  },
  {
    type: "dust",
    label: "미세먼지",
    icon: "😷",
    agency: "환경부",
    build: (region) => ({
      title: `${region} 미세먼지 매우나쁨`,
      message: `[환경부] ${region} 초미세먼지 농도가 '매우나쁨' 수준입니다. 외출 시 보건용 마스크를 착용하세요.`,
    }),
  },
  {
    type: "cold",
    label: "한파",
    icon: "🥶",
    agency: "기상청",
    build: (region) => ({
      title: `${region} 한파경보`,
      message: `[기상청] ${region}에 한파경보가 발효되었습니다. 동파·저체온증에 유의하고 취약계층 안부를 확인하세요.`,
    }),
  },
  {
    type: "missing",
    label: "실종",
    icon: "🔎",
    agency: "경찰청",
    build: (region) => ({
      title: `${region} 실종자 수색`,
      message: `[경찰청] ${region}에서 실종자 수색이 진행 중입니다. 목격 시 112로 신고 바랍니다.`,
    }),
  },
  {
    type: "gas",
    label: "가스누출",
    icon: "⚠️",
    agency: "소방청",
    build: (region) => ({
      title: `${region} 가스 누출`,
      message: `[소방청] ${region}에서 가스 누출이 신고되었습니다. 화기 사용을 금지하고 창문을 열어 환기 후 대피하세요.`,
    }),
  },
];

const SEVERITY_LEVELS = [
  { level: "emergency", label: "심각", weight: 3 },
  { level: "warning", label: "경계", weight: 2 },
  { level: "caution", label: "주의", weight: 1 },
  { level: "info", label: "관심", weight: 0 },
];

// Approximate district names used to make alerts feel local.
const REGION_HINTS = [
  "중구",
  "동구",
  "서구",
  "남구",
  "북구",
  "강남",
  "강북",
  "해안가",
  "산간 지역",
  "도심",
  "외곽",
  "하천 주변",
];

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Great-circle distance between two coordinates in kilometers.
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Small deterministic PRNG so a given location + day yields a stable feed
// (mulberry32). This keeps the demo consistent across refreshes.
function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(lat, lon) {
  const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 6)); // rotates every 6h
  const base = Math.round(lat * 1000) * 73856093 + Math.round(lon * 1000) * 19349663;
  return (base ^ (dayBucket * 83492791)) >>> 0;
}

// Offset a coordinate by a distance (km) and bearing (radians).
function offsetCoord(lat, lon, distanceKm, bearing) {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angular) +
      Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
  );
  const newLon =
    lonRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
      Math.cos(angular) - Math.sin(latRad) * Math.sin(newLat),
    );
  return [(newLat * 180) / Math.PI, (newLon * 180) / Math.PI];
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate nearby disaster alerts around a coordinate.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusKm maximum distance for generated alerts
 * @returns {Array<object>} alerts sorted by ascending distance
 */
export function getNearbyDisasters(lat, lon, radiusKm = 30) {
  const rng = createRng(hashSeed(lat, lon));
  const count = 4 + Math.floor(rng() * 4); // 4-7 alerts
  const usedTypes = new Set();
  const now = Date.now();
  const alerts = [];

  for (let i = 0; i < count; i += 1) {
    let template = pick(rng, DISASTER_TEMPLATES);
    // Avoid duplicate types where possible for variety.
    let guard = 0;
    while (usedTypes.has(template.type) && guard < 5) {
      template = pick(rng, DISASTER_TEMPLATES);
      guard += 1;
    }
    usedTypes.add(template.type);

    const severity = pick(rng, SEVERITY_LEVELS);
    const region = pick(rng, REGION_HINTS);
    const distanceKm = Number((rng() * radiusKm).toFixed(2));
    const bearing = rng() * 2 * Math.PI;
    const [alat, alon] = offsetCoord(lat, lon, distanceKm, bearing);
    const minutesAgo = Math.floor(rng() * 180);
    const { title, message } = template.build(region);

    alerts.push({
      id: `${template.type}-${i}-${hashSeed(alat, alon)}`,
      type: template.type,
      category: template.label,
      icon: template.icon,
      agency: template.agency,
      severity: severity.level,
      severityLabel: severity.label,
      title,
      message,
      region,
      lat: Number(alat.toFixed(5)),
      lon: Number(alon.toFixed(5)),
      distanceKm,
      issuedAt: new Date(now - minutesAgo * 60 * 1000).toISOString(),
    });
  }

  return alerts.sort((a, b) => a.distanceKm - b.distanceKm);
}
