import { useEffect, useRef, useState } from "react";
import { CheckCircle, MapPin, Send } from "react-feather";

const QUICK_REPLIES = [
  "불이 났어요",
  "사람이 쓰러졌어요",
  "교통사고가 났어요",
  "물에 빠졌어요",
];

function urgencyStyle(urgency) {
  switch (urgency) {
    case "critical":
      return { label: "긴급", className: "bg-red-600" };
    case "high":
      return { label: "위급", className: "bg-orange-500" };
    default:
      return null;
  }
}

// Renders a single chat message with a dispatcher/citizen distinction.
function Message({ message }) {
  const isUser = message.role === "user";
  const badge = !isUser && message.meta ? urgencyStyle(message.meta.urgency) : null;
  return (
    <div className={`message-row ${isUser ? "user" : "dispatcher"}`}>
      <div className="message-group">
        {!isUser && (
          <div className="message-sender">
            <span>119 상황실</span>
            {badge && (
              <span className={`urgency-badge ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
        )}
        <div className="message-bubble">
          {message.content}
        </div>
      </div>
    </div>
  );
}

export default function EmergencyChat({ location, activeDisaster, onClearDisaster }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const disasterRef = useRef(activeDisaster);
  disasterRef.current = activeDisaster;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // When a disaster is selected for reporting, prefill a starter message.
  useEffect(() => {
    if (activeDisaster) {
      setInput(`'${activeDisaster.category}' 관련해서 신고합니다. `);
    }
  }, [activeDisaster]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage = { role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/119/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          location,
          disaster: disasterRef.current || null,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, meta: data.meta },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "죄송합니다. 상황실 연결에 문제가 발생했습니다. 긴급 시 휴대전화로 119에 직접 전화해 주세요.",
          meta: { urgency: "info" },
        },
      ]);
    } finally {
      setSending(false);
      onClearDisaster && onClearDisaster();
    }
  }

  return (
    <div className="emergency-chat">
      <div
        ref={scrollRef}
        className="chat-stream"
        style={{ minHeight: "200px" }}
      >
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-check">
              <CheckCircle size={23} />
            </div>
            <h3>상황실 연결 준비 완료</h3>
            <p>현재 상황을 짧게 알려주세요.<br />접수요원이 바로 안내해 드립니다.</p>
            {location && (
              <span className="location-shared">
                <MapPin size={12} /> 위치정보 자동 전달
              </span>
            )}
          </div>
        ) : (
          messages.map((m, i) => <Message key={i} message={m} />)
        )}
        {sending && (
          <div className="typing-row">
            <span /><span /><span />
            <small>상황실이 확인 중입니다</small>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="quick-replies">
          <p>빠른 신고</p>
          <div>
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
            >
              {q}
            </button>
          ))}
          </div>
        </div>
      )}

      <div className="chat-composer">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
          placeholder="상황을 입력하세요…"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="send-button"
          aria-label="전송"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
