import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { isEmailConfigured, makeAuthLink, sendAuthEmail } from "../lib/email";

// Synthetic fixtures only. No environment files, database clients, or real network calls.
const TEST_KEY = "re_synthetic_test_key_never_use_in_production";
const TEST_FROM = "Pausstik <no-reply@paustik.example>";
const TEST_ORIGIN = "https://paustik.example";
const TEST_RECIPIENT = "customer@example.test";
const TEST_TOKEN = "synthetic-token&with=characters/and+spaces here";
type CapturedRequest = { input: string | URL | Request; init?: RequestInit };
let requests: CapturedRequest[] = [];

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: "production",
    RESEND_API_KEY: TEST_KEY,
    EMAIL_FROM: TEST_FROM,
    PAUSTIK_PUBLIC_URL: TEST_ORIGIN,
  });
  requests = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ input, init });
    return new Response(null, { status: 200 });
  });
});

afterEach(() => {
  mock.restoreAll();
  for (const name of ["NODE_ENV", "RESEND_API_KEY", "EMAIL_FROM", "PAUSTIK_PUBLIC_URL"]) {
    delete process.env[name];
  }
});

function sentBody() {
  assert.equal(requests.length, 1);
  const body = requests[0].init?.body;
  assert.equal(typeof body, "string");
  return JSON.parse(body as string) as {
    from: string; to: string[]; subject: string; text: string; html: string;
  };
}

function sentLink() {
  const body = sentBody();
  return new URL(body.text.split("\n")[0].replace(/^[^:]+: /, ""));
}

test("email configuration accepts a named sender and a bare email address", () => {
  assert.equal(isEmailConfigured(), true);
  process.env.EMAIL_FROM = "no-reply@paustik.example";
  assert.equal(isEmailConfigured(), true);
});

test("email configuration trims sender and credential before sending", async () => {
  process.env.RESEND_API_KEY = `  ${TEST_KEY}  `;
  process.env.EMAIL_FROM = `  ${TEST_FROM}  `;
  assert.equal(isEmailConfigured(), true);
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), true);
  assert.equal(sentBody().from, TEST_FROM);
  assert.equal(new Headers(requests[0].init?.headers).get("Authorization"), `Bearer ${TEST_KEY}`);
});

for (const name of ["RESEND_API_KEY", "EMAIL_FROM"]) {
  for (const value of [undefined, "", "   "]) {
    test(`${name} ${value === undefined ? "missing" : value === "" ? "empty" : "blank"} prevents a network request`, async () => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
      assert.equal(isEmailConfigured(), false);
      assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), false);
      assert.equal(requests.length, 0);
    });
  }
}

for (const [label, sender] of [
  ["missing at sign", "no-reply.paustik.example"],
  ["missing domain suffix", "no-reply@paustik"],
  ["spaces in address", "no reply@paustik.example"],
  ["unclosed display address", "Pausstik <no-reply@paustik.example"],
  ["multiple addresses", "Pausstik <one@paustik.example>, Other <two@paustik.example>"],
  ["line break injection", "Pausstik\r\nBcc: other@example.test <no-reply@paustik.example>"],
] as const) {
  test(`malformed sender (${label}) is rejected before sending`, async () => {
    process.env.EMAIL_FROM = sender;
    assert.equal(isEmailConfigured(), false);
    assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), false);
    assert.equal(requests.length, 0);
  });
}

test("successful delivery request uses JSON, no-store, a timeout signal and the intended recipient", async () => {
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), true);
  const { input, init } = requests[0];
  assert.equal(input, "https://api.resend.com/emails");
  assert.equal(init?.method, "POST");
  assert.equal(init?.cache, "no-store");
  assert.ok(init?.signal instanceof AbortSignal);
  assert.equal(init.signal.aborted, false);
  assert.equal(new Headers(init.headers).get("Content-Type"), "application/json");
  assert.deepEqual(sentBody().to, [TEST_RECIPIENT]);
});

for (const status of [401, 422, 429, 500]) {
  test(`provider HTTP ${status} returns false`, async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => new Response(null, { status }));
    assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), false);
  });
}

test("provider exception returns false without propagating it", async () => {
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => { throw new Error("Synthetic transport failure"); });
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), false);
});

test("provider timeout returns false without propagating it", async () => {
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => { throw new DOMException("Synthetic timeout", "TimeoutError"); });
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), false);
});

for (const [kind, route, subject] of [
  ["verify", "/api/auth/verify-email", "Verify your Pausstik email"],
  ["reset", "/reset-password", "Reset your Pausstik password"],
] as const) {
  test(`${kind} emails use the intended route, encoded token and Pausstik branding`, async () => {
    assert.equal(await sendAuthEmail(TEST_RECIPIENT, kind, TEST_TOKEN), true);
    const body = sentBody();
    const link = sentLink();
    assert.equal(body.subject, subject);
    assert.match(body.html, /your Pausstik account/);
    assert.equal(link.origin, TEST_ORIGIN);
    assert.equal(link.pathname, route);
    assert.equal(link.searchParams.get("token"), TEST_TOKEN);
    assert.equal([...link.searchParams.keys()].length, 1);
    assert.equal(body.html.includes(TEST_TOKEN), false);
    assert.equal(new URL(makeAuthLink(kind, TEST_TOKEN, `${TEST_ORIGIN}/`)).toString(), link.toString());
  });
}

test("configured HTTPS origin takes priority over request origin and strips path/query", async () => {
  process.env.PAUSTIK_PUBLIC_URL = `${TEST_ORIGIN}/site?unused=true`;
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN, "https://other.example.test"), true);
  assert.equal(sentLink().origin, TEST_ORIGIN);
});

for (const [label, configured] of [
  ["missing", undefined],
  ["malformed", "not a URL"],
  ["HTTP", "http://paustik.example"],
  ["local", "https://localhost:3100"],
  ["credentials", "https://user:password@paustik.example"],
] as const) {
  test(`a ${label} configured origin falls back to a valid HTTPS request origin`, async () => {
    if (configured === undefined) delete process.env.PAUSTIK_PUBLIC_URL;
    else process.env.PAUSTIK_PUBLIC_URL = configured;
    assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN, "https://request.example.test/path"), true);
    assert.equal(sentLink().origin, "https://request.example.test");
  });
}

for (const [label, requestOrigin] of [
  ["missing", undefined],
  ["malformed", "not a URL"],
  ["HTTP", "http://paustik.example"],
  ["localhost", "https://localhost:3100"],
  ["IPv4 loopback", "https://127.0.0.1:3100"],
  ["IPv6 loopback", "https://[::1]:3100"],
  ["embedded credentials", "https://user:password@paustik.example"],
  ["non-HTTP protocol", "ftp://paustik.example"],
] as const) {
  test(`production fails closed with only a ${label} origin`, async () => {
    delete process.env.PAUSTIK_PUBLIC_URL;
    assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN, requestOrigin), false);
    assert.equal(requests.length, 0);
  });
}

test("development allows an explicitly configured localhost origin", async () => {
  Object.assign(process.env, { NODE_ENV: "development", PAUSTIK_PUBLIC_URL: "http://localhost:3101" });
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), true);
  assert.equal(sentLink().origin, "http://localhost:3101");
});

test("development allows a localhost request origin", async () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  delete process.env.PAUSTIK_PUBLIC_URL;
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN, "http://127.0.0.1:3101"), true);
  assert.equal(sentLink().origin, "http://127.0.0.1:3101");
});

test("development has a local fallback when neither origin is supplied", async () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  delete process.env.PAUSTIK_PUBLIC_URL;
  assert.equal(await sendAuthEmail(TEST_RECIPIENT, "verify", TEST_TOKEN), true);
  assert.equal(sentLink().origin, "http://localhost:3000");
});
