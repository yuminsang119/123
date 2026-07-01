import Fastify from "fastify";
import FastifyVite from "@fastify/vite";
import fastifyEnv from "@fastify/env";

import { getNearbyDisasters } from "./server/disasters.js";
import { getDispatcherReply } from "./server/dispatcher.js";

// Fastify + React + Vite configuration
const server = Fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
});

// OPENAI_API_KEY is optional: the app runs fully (disaster alerts + offline
// 119 text dispatcher) without it, and unlocks realtime voice + smarter chat
// when it is present.
const schema = {
  type: "object",
  properties: {
    OPENAI_API_KEY: {
      type: "string",
    },
    PORT: {
      type: "string",
    },
  },
};

await server.register(fastifyEnv, { dotenv: true, schema });

await server.register(FastifyVite, {
  root: import.meta.url,
  renderer: "@fastify/react",
});

await server.vite.ready();

// Whether realtime voice is available (requires an OpenAI key).
server.get("/api/config", async () => ({
  voiceEnabled: Boolean(process.env.OPENAI_API_KEY),
}));

// Nearby disaster alerts around a coordinate.
server.get("/api/disasters", async (request) => {
  const lat = Number.parseFloat(request.query.lat);
  const lon = Number.parseFloat(request.query.lon);
  const radius = Number.parseFloat(request.query.radius);

  // Default to Seoul City Hall if no coordinate is supplied.
  const safeLat = Number.isFinite(lat) ? lat : 37.5665;
  const safeLon = Number.isFinite(lon) ? lon : 126.978;
  const safeRadius = Number.isFinite(radius) ? radius : 30;

  return {
    center: { lat: safeLat, lon: safeLon },
    radiusKm: safeRadius,
    updatedAt: new Date().toISOString(),
    alerts: getNearbyDisasters(safeLat, safeLon, safeRadius),
  };
});

// Two-way 119 text communication.
server.post("/api/119/chat", async (request, reply) => {
  const { messages, location, disaster } = request.body || {};
  if (!Array.isArray(messages)) {
    reply.code(400);
    return { error: "messages must be an array" };
  }
  return getDispatcherReply({ messages, location, disaster });
});

// Server-side API route to return an ephemeral realtime session token
server.get("/token", async (request, reply) => {
  if (!process.env.OPENAI_API_KEY) {
    reply.code(503);
    return { error: "voice_disabled", message: "OPENAI_API_KEY not configured" };
  }

  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "verse",
    }),
  });

  return new Response(r.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

await server.listen({ port: process.env.PORT || 3000 });
