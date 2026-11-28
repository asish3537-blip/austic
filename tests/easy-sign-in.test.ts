import assert from "node:assert/strict";
import { test } from "node:test";
import { emailLoginHash, googleCanLinkEmail, newEmailCode } from "../lib/easy-sign-in";
import { sendLoginCode } from "../lib/email";

test("codes keep six digits, including leading zeros", () => {
  for(let i=0;i<100;i++) assert.match(newEmailCode(), /^\d{6}$/);
});
test("code hashes bind the email, code, server secret and purpose", () => {
  process.env.AUTH_SECRET = "synthetic-secret-for-unit-tests";
  const hash = emailLoginHash("account@example.test", "123456");
  assert.equal(hash.length,64);
  assert.equal(hash,emailLoginHash("ACCOUNT@example.test","123456"));
  assert.notEqual(hash,emailLoginHash("other@example.test","123456"));
  assert.notEqual(hash,emailLoginHash("account@example.test","123457"));
  process.env.AUTH_SECRET = "other-synthetic-secret";
  assert.notEqual(hash,emailLoginHash("account@example.test","123456"));
  delete process.env.AUTH_SECRET;
  assert.throws(()=>emailLoginHash("account@example.test","123456"));
});
test("automatic Google linking requires Google authority over the email", () => {
  assert.equal(googleCanLinkEmail("account@gmail.com"),true);
  assert.equal(googleCanLinkEmail("account@company.test","company.test"),true);
  assert.equal(googleCanLinkEmail("account@other.test"),false);
  assert.equal(googleCanLinkEmail("account@gmail.com.attacker.test"),false);
});
test("email codes are never sent without provider configuration", async () => {
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
  assert.equal(await sendLoginCode("account@example.test","123456"),false);
});
