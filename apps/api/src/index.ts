import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";

// --- Env ---
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "dev_cookie_secret_change_me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// --- Server ---
const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: CORS_ORIGIN, credentials: true });
await fastify.register(cookie, { secret: COOKIE_SECRET });
await fastify.register(jwt, {
  secret: JWT_SECRET,
  cookie: { cookieName: "token", signed: false }
});

// Demo “user store”
const DEMO_USER = { id: "u_1", email: "test@example.com", name: "Demo User" };

fastify.get("/health", async () => ({ ok: true }));

// --- Auth routes ---
const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

fastify.post("/auth/login", async (req, reply) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: "Invalid body" });
  const { email, password } = parsed.data;

  const isOk = email === DEMO_USER.email && password === "good_password.123";
  if (!isOk) return reply.code(401).send({ message: "Invalid email or password" });

  const token = fastify.jwt.sign(
    { sub: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name },
    { expiresIn: "7d" }
  );

  reply.setCookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true in production over HTTPS
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return reply.send({ ok: true, user: { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name } });
});

fastify.post("/auth/logout", async (_req, reply) => {
  reply.setCookie("token", "", { path: "/", maxAge: 0 });
  return reply.send({ ok: true });
});

fastify.get("/auth/me", async (req, reply) => {
  try {
    await req.jwtVerify(); // verifies token from cookie
    return reply.send({ ok: true, user: req.user });
  } catch {
    return reply.code(401).send({ ok: false });
  }
});

// --- Start ---
fastify.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
