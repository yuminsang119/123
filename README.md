# 119 안심콜 · 주변 재난알림 앱

내 주변의 재난 상황을 실시간으로 확인하고, 119 종합상황실과 **문자·음성 양방향**으로
신고·상담할 수 있는 웹 애플리케이션입니다.

## 주요 기능

### 1. 주변 재난알림 (Nearby Disaster Alerts)
- 브라우저 위치 정보를 기반으로 내 주변에서 발효된 재난알림을 지도와 목록으로 표시
- Leaflet(OpenStreetMap) 지도에 재난 유형별 아이콘·심각도 색상으로 마커 표시
- 재난 유형: 호우 · 태풍 · 지진 · 산불 · 화재 · 침수 · 대설 · 폭염 · 미세먼지 · 한파 · 실종 · 가스누출
- 심각도(심각/경계/주의/관심) 배지와 거리(km)·발령기관·발령시각 표시, 가까운 순 정렬
- 위치 권한이 없으면 서울시청 좌표로 자동 대체

> 재난 데이터는 대한민국 `재난문자` 포맷을 모사한 서버 생성 피드입니다.
> `server/disasters.js`를 실제 행정안전부/기상청 공개 API로 교체하면 그대로 사용할 수 있습니다.

### 2. 119 양방향 커뮤니케이션 (Two-way communication with 119)
- **문자 신고**: 119 상황실과 채팅으로 대화. 상황 유형(화재·심정지·교통사고·출혈·지진·침수·가스누출)을
  분석해 단계별 응급처치 안내와 후속 질문을 제공하며, 현재 위치(GPS)를 자동으로 전달
- **음성 통화**: OpenAI Realtime(WebRTC) 기반 AI 접수요원과 실시간 음성 대화 (서버에 API 키가 있을 때)
- 상단 및 각 화면의 `119` 버튼으로 실제 전화(`tel:119`) 연결

## 실행 방법

```bash
npm install
npm run dev        # 개발 모드 (http://localhost:3000)
# 또는
npm run build && npm start
```

### 환경 변수 (선택)
`OPENAI_API_KEY`를 설정하면 **음성 통화**와 더 똑똑한 문자 상담(OpenAI)이 활성화됩니다.
설정하지 않아도 재난알림과 규칙 기반 문자 신고는 정상 동작합니다.

```bash
cp .env.sample .env   # OPENAI_API_KEY 입력 (선택)
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/config` | 음성 통화 사용 가능 여부 반환 |
| GET | `/api/disasters?lat&lon&radius` | 좌표 주변 재난알림 목록 (거리순) |
| POST | `/api/119/chat` | 119 문자 신고 응답 (`{ messages, location, disaster }`) |
| GET | `/token` | 음성 통화용 OpenAI Realtime 임시 토큰 |

## 기술 스택
- 서버: Fastify + `@fastify/vite` + `@fastify/react` (SSR)
- 클라이언트: React 18, Tailwind CSS, Leaflet, react-feather
- 음성: OpenAI Realtime API (WebRTC)

## 파일 구성
- `server.js`: Fastify 서버 및 API 라우트
- `server/disasters.js`: 위치 기반 재난알림 생성기 (실제 API 교체 지점)
- `server/dispatcher.js`: 119 문자 응대 로직 (오프라인 규칙 기반 + OpenAI 옵션)
- `client/components/`: `App`, `DisasterMap`, `DisasterList`, `EmergencyChat`, `VoiceCall`
- `client/hooks/useGeolocation.js`: 위치 확인 훅

---
_참고: 이 저장소에는 별도의 소방서 근무계획표(`fire_station_schedule.html`)도 포함되어 있습니다._
