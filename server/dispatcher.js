// Two-way 119 emergency communication logic.
//
// When an OPENAI_API_KEY is configured the text channel is answered by the
// OpenAI Chat Completions API using a 119 dispatcher persona. When no key is
// present a fully offline, rule-based Korean dispatcher takes over so the app
// remains usable and testable without any external dependency.

const SYSTEM_PROMPT = `당신은 대한민국 119 종합상황실의 인공지능 접수요원입니다.
- 신고자를 침착하게 안정시키고, 짧고 명확한 한국어로 대응하세요.
- 반드시 위치, 사고 유형, 부상자 유무, 현재 상황을 순서대로 확인하세요.
- 생명이 위급하면 즉시 실행 가능한 응급처치(심폐소생술, 지혈, 대피 등)를 단계별로 안내하세요.
- 한 번에 한두 가지만 질문해 신고자가 답하기 쉽게 하세요.
- 실제 긴급 상황이면 반드시 "지금 바로 119(휴대전화 국번없이 119)로 전화하세요" 라고 안내하세요.
- 답변은 3~4문장 이내로 간결하게 하세요.`;

// Keyword-driven classification for the offline dispatcher.
const RULES = [
  {
    category: "화재",
    urgency: "critical",
    keywords: ["불", "화재", "연기", "타고", "불길", "스파크", "폭발"],
    guidance: [
      "지금 즉시 낮은 자세로 대피하고, 젖은 수건으로 입과 코를 막으세요.",
      "엘리베이터 대신 계단을 이용해 건물 밖으로 나가세요.",
      "대피가 어렵다면 문틈을 막고 창가에서 구조를 기다리세요.",
    ],
    followUp: "지금 계신 정확한 건물 주소와 층수를 알려주세요. 안에 다른 사람이 있나요?",
  },
  {
    category: "심정지·의식저하",
    urgency: "critical",
    keywords: ["숨", "호흡", "심장", "쓰러", "의식", "심정지", "가슴", "맥박"],
    guidance: [
      "환자를 평평한 바닥에 눕히고 반응과 호흡을 확인하세요.",
      "호흡이 없으면 가슴 중앙을 분당 100~120회 속도로 강하게 압박하세요.",
      "주변에 자동심장충격기(AED)가 있으면 가져와 안내에 따라 사용하세요.",
    ],
    followUp: "환자의 나이와 현재 의식·호흡 상태를 알려주세요. 위치는 어디인가요?",
  },
  {
    category: "교통사고",
    urgency: "high",
    keywords: ["사고", "교통", "차", "충돌", "추돌", "오토바이", "치였"],
    guidance: [
      "2차 사고 방지를 위해 안전한 곳으로 이동하고 비상등을 켜세요.",
      "부상자는 함부로 움직이지 말고 목과 척추를 고정하세요.",
      "출혈이 있으면 깨끗한 천으로 강하게 눌러 지혈하세요.",
    ],
    followUp: "사고 위치(도로명·방향)와 다친 사람 수를 알려주세요.",
  },
  {
    category: "부상·출혈",
    urgency: "high",
    keywords: ["피", "출혈", "다쳤", "베", "골절", "부러", "상처", "화상"],
    guidance: [
      "출혈 부위를 깨끗한 천으로 강하게 압박해 지혈하세요.",
      "다친 부위는 심장보다 높게 유지하세요.",
      "화상은 흐르는 시원한 물에 10분 이상 식히세요.",
    ],
    followUp: "다친 부위와 출혈 정도, 현재 위치를 알려주세요.",
  },
  {
    category: "지진",
    urgency: "high",
    keywords: ["지진", "흔들", "진동", "무너"],
    guidance: [
      "튼튼한 탁자 아래로 들어가 머리를 보호하세요.",
      "흔들림이 멈추면 계단으로 넓은 공터로 대피하세요.",
      "가스와 전기를 차단하고 여진에 대비하세요.",
    ],
    followUp: "현재 위치와 주변 건물 붕괴·부상자 여부를 알려주세요.",
  },
  {
    category: "침수·수난",
    urgency: "high",
    keywords: ["물", "침수", "빠졌", "잠겼", "홍수", "익수", "하천"],
    guidance: [
      "즉시 높은 곳으로 대피하고 지하·하천 근처를 피하세요.",
      "물에 빠진 사람에게 직접 들어가지 말고 주변 물체를 던져 주세요.",
      "차량이 침수되면 창문을 깨고 탈출하세요.",
    ],
    followUp: "현재 물이 차오르는 정도와 위치, 고립된 사람 여부를 알려주세요.",
  },
  {
    category: "가스누출",
    urgency: "high",
    keywords: ["가스", "냄새", "누출", "질식"],
    guidance: [
      "불꽃·전기 스위치를 절대 조작하지 말고 창문을 열어 환기하세요.",
      "가스 밸브를 잠그고 즉시 실외로 대피하세요.",
    ],
    followUp: "가스 냄새가 나는 위치와 대피 여부를 알려주세요.",
  },
];

function classify(text) {
  const lower = (text || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule;
    }
  }
  return null;
}

function locationLine(location) {
  if (!location) return "";
  if (location.address) return `신고자 위치: ${location.address}`;
  if (typeof location.lat === "number" && typeof location.lon === "number") {
    return `신고자 위치(GPS): 위도 ${location.lat.toFixed(5)}, 경도 ${location.lon.toFixed(5)}`;
  }
  return "";
}

// Offline dispatcher used when no OpenAI key is configured.
function ruleBasedReply(messages, location, disaster) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = lastUser ? lastUser.content : "";
  const isFirstUserTurn =
    messages.filter((m) => m.role === "user").length <= 1;

  const rule = classify(text);
  const loc = locationLine(location);

  if (!rule) {
    if (isFirstUserTurn) {
      const disasterNote = disaster
        ? ` 방금 '${disaster.category}' 재난알림을 확인하셨네요.`
        : "";
      return {
        reply:
          `119 상황실입니다. 침착하게 말씀해 주세요.${disasterNote} ` +
          `현재 어떤 상황인지, 다치거나 위험에 처한 사람이 있는지 알려주세요.` +
          (loc ? ` (${loc} 확인했습니다.)` : ""),
        meta: { category: "접수", urgency: "info", guidance: [], source: "rule" },
      };
    }
    return {
      reply:
        "네, 확인했습니다. 조금 더 자세히 설명해 주세요. 정확한 위치와 " +
        "현재 위험 상황, 다친 사람이 있는지 알려주시면 바로 도움을 드리겠습니다.",
      meta: { category: "접수", urgency: "info", guidance: [], source: "rule" },
    };
  }

  const intro =
    rule.urgency === "critical"
      ? "위급한 상황입니다. 지금 바로 국번없이 119로 전화해 주세요."
      : "접수했습니다. 곧 출동하겠습니다.";

  const guidanceText = rule.guidance
    .map((g, i) => `${i + 1}. ${g}`)
    .join("\n");

  return {
    reply: `${intro}\n\n[${rule.category} 응급 안내]\n${guidanceText}\n\n${rule.followUp}${
      loc ? `\n\n${loc}` : ""
    }`,
    meta: {
      category: rule.category,
      urgency: rule.urgency,
      guidance: rule.guidance,
      source: "rule",
    },
  };
}

async function openAiReply(messages, location, disaster, apiKey) {
  const contextParts = [];
  const loc = locationLine(location);
  if (loc) contextParts.push(loc);
  if (disaster) {
    contextParts.push(
      `신고자가 확인한 재난알림: [${disaster.category}] ${disaster.title}`,
    );
  }
  const systemContent = contextParts.length
    ? `${SYSTEM_PROMPT}\n\n[상황 정보]\n${contextParts.join("\n")}`
    : SYSTEM_PROMPT;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: systemContent }, ...messages],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${detail}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "";
  const rule = classify(
    [...messages].reverse().find((m) => m.role === "user")?.content || "",
  );
  return {
    reply,
    meta: {
      category: rule?.category || "접수",
      urgency: rule?.urgency || "info",
      guidance: rule?.guidance || [],
      source: "openai",
    },
  };
}

/**
 * Produce a 119 dispatcher reply for a conversation.
 *
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages
 * @param {{lat?: number, lon?: number, address?: string}|null} params.location
 * @param {object|null} params.disaster alert the user is asking about
 * @returns {Promise<{reply: string, meta: object}>}
 */
export async function getDispatcherReply({ messages, location, disaster }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m.content === "string" && m.content.trim())
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }))
    : [];

  if (apiKey) {
    try {
      return await openAiReply(safeMessages, location, disaster, apiKey);
    } catch (err) {
      // Fall back to the offline dispatcher on any API error.
      const fallback = ruleBasedReply(safeMessages, location, disaster);
      fallback.meta.source = "rule-fallback";
      fallback.meta.error = String(err.message || err);
      return fallback;
    }
  }

  return ruleBasedReply(safeMessages, location, disaster);
}

export { SYSTEM_PROMPT };
