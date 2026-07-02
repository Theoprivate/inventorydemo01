import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.AUTH_MODE = "local";
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret";
process.env.DEV_AUTH_USERNAME = "admin";
process.env.DEV_AUTH_PASSWORD = "admin123";

const { fastify } = await import("./server.js");

before(async () => {
  await fastify.ready();
});

after(async () => {
  await fastify.close();
});

test("health reports a ready local-auth API", async () => {
  const response = await fastify.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: "restaurant-api",
    authMode: "local",
  });
});

test("login rejects an invalid password", async () => {
  const response = await fastify.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username: "admin", password: "wrong" },
  });

  assert.equal(response.statusCode, 401);
});

test("login cookie authenticates /auth/me and can be cleared", async () => {
  const loginResponse = await fastify.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username: "admin", password: "admin123" },
  });

  assert.equal(loginResponse.statusCode, 200);
  const setCookie = loginResponse.headers["set-cookie"];
  assert.equal(typeof setCookie, "string");
  const cookie = (setCookie as string).split(";", 1)[0];

  const meResponse = await fastify.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie },
  });

  assert.equal(meResponse.statusCode, 200);
  assert.equal(meResponse.json().user.username, "admin");

  const logoutResponse = await fastify.inject({
    method: "POST",
    url: "/auth/logout",
    headers: { cookie },
  });

  assert.equal(logoutResponse.statusCode, 200);
  assert.match(String(logoutResponse.headers["set-cookie"]), /Max-Age=0/);
});
