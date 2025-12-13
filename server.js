import Fastify from "fastify";
import FastifyVite from "@fastify/vite";
import fastifyEnv from "@fastify/env";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Fastify + React + Vite configuration
const server = Fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
});

const schema = {
  type: "object",
  required: [],
  properties: {
    OPENAI_API_KEY: {
      type: "string",
    },
    AUTH_SECRET: {
      type: "string",
    },
    ADMIN_USERNAME: {
      type: "string",
    },
    ADMIN_PASSWORD: {
      type: "string",
    },
    DB_PATH: {
      type: "string",
    },
  },
};

await server.register(fastifyEnv, { dotenv: true, schema });

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-intranet-auth-secret";
if (!process.env.AUTH_SECRET) {
  server.log.warn(
    "AUTH_SECRET is not set. Using a default dev secret (do not use in production).",
  );
}

const dbPath =
  process.env.DB_PATH || path.join(process.cwd(), "data", "intranet.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
`);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120_000;
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [kind, itStr, salt, hashHex] = String(stored).split("$");
  if (kind !== "pbkdf2") return false;
  const iterations = Number(itStr);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const candidate = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidate, "hex"),
      Buffer.from(hashHex, "hex"),
    );
  } catch {
    return false;
  }
}

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
const existingAdmin = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get(adminUsername);
if (!existingAdmin) {
  db.prepare(
    "INSERT INTO users (username, name, role, password_hash) VALUES (?, ?, ?, ?)",
  ).run(adminUsername, "관리자", "admin", hashPassword(adminPassword));
  server.log.warn(
    `Seeded admin user: username="${adminUsername}" password="${adminPassword}" (please change via DB/env).`,
  );
}

await server.register(fastifyCookie, {
  secret: AUTH_SECRET,
  hook: "onRequest",
});

await server.register(fastifyJwt, {
  secret: AUTH_SECRET,
  cookie: {
    cookieName: "intranet_token",
    signed: false,
  },
});

server.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "인증이 필요합니다." });
  }
});

function getSafeUserById(id) {
  const row = db
    .prepare("SELECT id, username, name, role, created_at FROM users WHERE id=?")
    .get(id);
  return row || null;
}

await server.register(FastifyVite, {
  root: import.meta.url,
  renderer: "@fastify/react",
});

await server.vite.ready();

server.get("/health", async () => {
  return { ok: true };
});

// Auth
server.post("/api/auth/login", async (request, reply) => {
  const { username, password } = request.body || {};
  if (!username || !password) {
    return reply.code(400).send({ message: "아이디/비밀번호를 입력하세요." });
  }

  const user = db
    .prepare(
      "SELECT id, username, name, role, password_hash FROM users WHERE username = ?",
    )
    .get(String(username));
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return reply.code(401).send({ message: "로그인 정보가 올바르지 않습니다." });
  }

  const token = await reply.jwtSign(
    {
      sub: String(user.id),
      role: user.role,
      name: user.name,
      username: user.username,
    },
    { sign: { expiresIn: "8h" } },
  );
  reply
    .setCookie("intranet_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    })
    .send({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
});

server.post("/api/auth/logout", async (_request, reply) => {
  reply
    .clearCookie("intranet_token", { path: "/" })
    .send({ ok: true });
});

server.get("/api/me", { preHandler: server.authenticate }, async (request) => {
  const id = Number(request.user?.sub);
  const user = Number.isFinite(id) ? getSafeUserById(id) : null;
  return { user };
});

// Board
server.get("/api/posts", { preHandler: server.authenticate }, async (request) => {
  const q = String(request.query?.q || "").trim();
  const rows = q
    ? db
        .prepare(
          `
          SELECT p.id, p.title, p.created_at, p.updated_at,
                 u.id as author_id, u.name as author_name, u.username as author_username
          FROM posts p
          JOIN users u ON u.id = p.author_id
          WHERE p.title LIKE ? OR p.content LIKE ?
          ORDER BY p.id DESC
        `,
        )
        .all(`%${q}%`, `%${q}%`)
    : db
        .prepare(
          `
          SELECT p.id, p.title, p.created_at, p.updated_at,
                 u.id as author_id, u.name as author_name, u.username as author_username
          FROM posts p
          JOIN users u ON u.id = p.author_id
          ORDER BY p.id DESC
        `,
        )
        .all();
  return { posts: rows };
});

server.get(
  "/api/posts/:id",
  { preHandler: server.authenticate },
  async (request, reply) => {
    const id = Number(request.params?.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ message: "잘못된 id" });

    const row = db
      .prepare(
        `
        SELECT p.id, p.title, p.content, p.created_at, p.updated_at,
               u.id as author_id, u.name as author_name, u.username as author_username
        FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.id = ?
      `,
      )
      .get(id);
    if (!row) return reply.code(404).send({ message: "게시글이 없습니다." });
    return { post: row };
  },
);

server.post(
  "/api/posts",
  { preHandler: server.authenticate },
  async (request, reply) => {
    const { title, content } = request.body || {};
    if (!title || !content) {
      return reply.code(400).send({ message: "제목/내용을 입력하세요." });
    }

    const authorId = Number(request.user?.sub);
    const info = db
      .prepare("INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)")
      .run(String(title).trim(), String(content), authorId);
    return { id: info.lastInsertRowid };
  },
);

server.put(
  "/api/posts/:id",
  { preHandler: server.authenticate },
  async (request, reply) => {
    const id = Number(request.params?.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ message: "잘못된 id" });
    const { title, content } = request.body || {};
    if (!title || !content) {
      return reply.code(400).send({ message: "제목/내용을 입력하세요." });
    }

    const post = db.prepare("SELECT id, author_id FROM posts WHERE id=?").get(id);
    if (!post) return reply.code(404).send({ message: "게시글이 없습니다." });

    const userId = Number(request.user?.sub);
    const isAdmin = request.user?.role === "admin";
    if (!isAdmin && post.author_id !== userId) {
      return reply.code(403).send({ message: "권한이 없습니다." });
    }

    db.prepare(
      "UPDATE posts SET title=?, content=?, updated_at=datetime('now') WHERE id=?",
    ).run(String(title).trim(), String(content), id);
    return { ok: true };
  },
);

server.delete(
  "/api/posts/:id",
  { preHandler: server.authenticate },
  async (request, reply) => {
    const id = Number(request.params?.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ message: "잘못된 id" });

    const post = db.prepare("SELECT id, author_id FROM posts WHERE id=?").get(id);
    if (!post) return reply.code(404).send({ message: "게시글이 없습니다." });

    const userId = Number(request.user?.sub);
    const isAdmin = request.user?.role === "admin";
    if (!isAdmin && post.author_id !== userId) {
      return reply.code(403).send({ message: "권한이 없습니다." });
    }

    db.prepare("DELETE FROM posts WHERE id=?").run(id);
    return { ok: true };
  },
);

// Server-side API route to return an ephemeral realtime session token
server.get("/token", async () => {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ message: "OPENAI_API_KEY 미설정" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
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
