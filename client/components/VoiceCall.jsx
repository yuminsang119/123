import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic } from "react-feather";

const DISPATCHER_INSTRUCTIONS = `당신은 대한민국 119 종합상황실의 인공지능 접수요원입니다.
신고자를 침착하게 안정시키고 짧고 명확한 한국어로 응대하세요.
위치, 사고 유형, 부상자 유무, 현재 상황을 순서대로 확인하고,
생명이 위급하면 심폐소생술·지혈·대피 등 응급처치를 단계별로 안내하세요.
실제 긴급상황이면 즉시 119로 전화하도록 안내하세요.`;

// Realtime voice line to the AI 119 dispatcher (OpenAI Realtime over WebRTC).
export default function VoiceCall({ location }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | active | error
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState([]);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);

  async function startCall() {
    setStatus("connecting");
    setErrorMsg("");
    setTranscript([]);
    try {
      const tokenResponse = await fetch("/token");
      if (!tokenResponse.ok) {
        const info = await tokenResponse.json().catch(() => ({}));
        throw new Error(info.message || "음성 통화를 사용할 수 없습니다.");
      }
      const data = await tokenResponse.json();
      const ephemeralKey = data.client_secret.value;

      const pc = new RTCPeerConnection();
      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      pc.ontrack = (e) => {
        audioRef.current.srcObject = e.streams[0];
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        setStatus("active");
        const locationNote = location
          ? `\n신고자 GPS: 위도 ${location.lat}, 경도 ${location.lon}.`
          : "";
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              instructions: DISPATCHER_INSTRUCTIONS + locationNote,
            },
          }),
        );
      });

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          if (
            event.type === "response.audio_transcript.done" &&
            event.transcript
          ) {
            setTranscript((prev) => [
              ...prev,
              { role: "119", text: event.transcript },
            ]);
          }
          if (
            event.type ===
              "conversation.item.input_audio_transcription.completed" &&
            event.transcript
          ) {
            setTranscript((prev) => [
              ...prev,
              { role: "나", text: event.transcript },
            ]);
          }
        } catch {
          // ignore malformed events
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });

      pcRef.current = pc;
    } catch (err) {
      setErrorMsg(err.message || "연결에 실패했습니다.");
      setStatus("error");
    }
  }

  function endCall() {
    if (dcRef.current) dcRef.current.close();
    if (pcRef.current) pcRef.current.close();
    dcRef.current = null;
    pcRef.current = null;
    setStatus("idle");
  }

  useEffect(() => () => endCall(), []);

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 gap-5 bg-gray-50">
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-colors ${
          status === "active"
            ? "bg-green-600 animate-pulse"
            : status === "connecting"
              ? "bg-amber-500"
              : status === "error"
                ? "bg-gray-400"
                : "bg-red-600"
        }`}
      >
        {status === "active" ? <Mic size={40} /> : <Phone size={40} />}
      </div>

      <div className="text-center">
        <p className="font-bold text-gray-900">
          {status === "idle" && "119 음성통화 대기"}
          {status === "connecting" && "연결 중…"}
          {status === "active" && "통화 중 · 말씀하세요"}
          {status === "error" && "연결 실패"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {status === "active"
            ? "AI 접수요원과 음성으로 대화합니다."
            : "버튼을 눌러 상황실과 음성으로 연결하세요."}
        </p>
        {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
      </div>

      {status === "active" ? (
        <button
          type="button"
          onClick={endCall}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700"
        >
          <PhoneOff size={18} /> 통화 종료
        </button>
      ) : (
        <button
          type="button"
          onClick={startCall}
          disabled={status === "connecting"}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 disabled:opacity-50"
        >
          <Phone size={18} /> 음성으로 연결
        </button>
      )}

      {transcript.length > 0 && (
        <div className="w-full max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200 p-3 flex flex-col gap-2">
          {transcript.map((t, i) => (
            <p key={i} className="text-sm">
              <span
                className={`font-semibold ${
                  t.role === "119" ? "text-red-600" : "text-blue-600"
                }`}
              >
                {t.role}:
              </span>{" "}
              <span className="text-gray-700">{t.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
