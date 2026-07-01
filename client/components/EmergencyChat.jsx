import { useEffect, useRef, useState } from "react";
import { Send, Phone } from "react-feather";

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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-semibold text-red-600">119 상황실</span>
            {badge && (
              <span className={`text-white text-[10px] px-1.5 py-0.5 rounded-full ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
        )}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isUser
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
          }`}
        >
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
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50"
        style={{ minHeight: "200px" }}
      >
        {messages.length === 0 ? (
          <div className="m-auto text-center text-gray-400 px-6">
            <div className="text-3xl mb-2">🚨</div>
            <p className="text-sm">
              119 상황실과 문자로 연결되었습니다.
              <br />
              상황을 입력하시면 접수요원이 안내해 드립니다.
            </p>
            {location && (
              <p className="text-xs mt-2 text-gray-400">
                신고 시 현재 위치가 자동으로 전달됩니다.
              </p>
            )}
          </div>
        ) : (
          messages.map((m, i) => <Message key={i} message={m} />)
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-400 text-sm">
              상황실이 입력 중…
            </div>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-2 border-t border-gray-100 bg-white">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
          placeholder="상황을 입력하세요…"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40"
          aria-label="전송"
        >
          <Send size={18} />
        </button>
        <a
          href="tel:119"
          className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black"
          aria-label="119 전화"
          title="119 전화 걸기"
        >
          <Phone size={18} />
        </a>
      </div>
    </div>
  );
}
