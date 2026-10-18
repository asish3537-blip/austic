import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import {
  authenticatorUri,
  createAuthenticatorSecret,
  createRecoveryCodes,
  decryptAuthenticatorSecret,
  encodeBase32,
  encryptAuthenticatorSecret,
  recoveryCodeHash,
  totpAtStep,
  verifyTotp,
} from "../lib/totp";

// Synthetic fixtures only. This test process never loads environment files or a database client.
const TEST_AUTH_SECRET = "synthetic-authenticator-test-key-do-not-use-in-production";
const OTHER_AUTH_SECRET = "different-synthetic-key-do-not-use-in-production";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const NOW = 1_234_567_890_000;
const CURRENT_STEP = BigInt(Math.floor(NOW / 30_000));
const RECOVERY_CODE = "a1b2c3-d4e5f6-012345-6789ab";

beforeEach(() => { process.env.AUTH_SECRET = TEST_AUTH_SECRET; });
after(() => { delete process.env.AUTH_SECRET; });

test("Base32 encoding matches the RFC 4648 unpadded fixtures", () => {
  const fixtures = [
    ["", ""], ["f", "MY"], ["fo", "MZXQ"], ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"], ["fooba", "MZXW6YTB"], ["foobar", "MZXW6YTBOI"],
    ["12345678901234567890", RFC_SECRET],
  ];
  for (const [plain, expected] of fixtures) assert.equal(encodeBase32(Buffer.from(plain)), expected);
});

test("Generated authenticator secrets contain 160 random bits in 32 Base32 characters", () => {
  const secrets = Array.from({ length: 100 }, createAuthenticatorSecret);
  for (const secret of secrets) assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.equal(new Set(secrets).size, secrets.length);
});

// RFC 6238 Appendix B SHA-1 vectors. Six-digit values are the decimal suffix of the eight-digit result.
const rfcVectors = [
  { seconds: 59, eight: "94287082", six: "287082" },
  { seconds: 1_111_111_109, eight: "07081804", six: "081804" },
  { seconds: 1_111_111_111, eight: "14050471", six: "050471" },
  { seconds: 1_234_567_890, eight: "89005924", six: "005924" },
  { seconds: 2_000_000_000, eight: "69279037", six: "279037" },
  { seconds: 20_000_000_000, eight: "65353130", six: "353130" },
];

for (const vector of rfcVectors) {
  test(`RFC 6238 SHA-1 vector at ${vector.seconds} seconds matches six and eight digits`, () => {
    const step = BigInt(Math.floor(vector.seconds / 30));
    assert.equal(totpAtStep(RFC_SECRET, step, 8), vector.eight);
    assert.equal(totpAtStep(RFC_SECRET, step), vector.six);
    assert.equal(verifyTotp(RFC_SECRET, vector.six, null, vector.seconds * 1000), step);
  });
}

for (const delta of [-1, 0, 1]) {
  test(`TOTP verification accepts the ${delta === 0 ? "current" : delta === -1 ? "previous" : "next"} 30-second step`, () => {
    const expected = CURRENT_STEP + BigInt(delta);
    assert.equal(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, expected), null, NOW), expected);
  });
}

test("TOTP verification rejects codes two or more steps outside the clock window", () => {
  for (const delta of [-3, -2, 2, 3]) {
    assert.equal(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, CURRENT_STEP + BigInt(delta)), null, NOW), null);
  }
});

test("TOTP verification rejects a consumed step and every older step", () => {
  for (const delta of [-1, 0, 1]) {
    const usedStep = CURRENT_STEP + BigInt(delta);
    assert.equal(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, usedStep), usedStep, NOW), null);
  }
  assert.equal(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, CURRENT_STEP), CURRENT_STEP + BigInt(1), NOW), null);
  assert.equal(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, CURRENT_STEP + BigInt(1)), CURRENT_STEP, NOW), CURRENT_STEP + BigInt(1));
});

test("TOTP verification rejects invalid code input without coercing or trimming it", () => {
  const valid = totpAtStep(RFC_SECRET, CURRENT_STEP);
  for (const code of ["", "12345", "1234567", "abcdef", "１２３４５６", ` ${valid}`, `${valid} `, `${valid}\n`, "12-3456"]) {
    assert.equal(verifyTotp(RFC_SECRET, code, null, NOW), null);
  }
});

test("TOTP generation rejects malformed Base32 secrets and invalid counters", () => {
  for (const secret of ["", "not-base32", "ABC123", "ABC=", " ABCD"]) {
    assert.throws(() => totpAtStep(secret, CURRENT_STEP), /INVALID_AUTHENTICATOR_SECRET/);
  }
  assert.throws(() => totpAtStep(RFC_SECRET, BigInt(-1)), RangeError);
  assert.throws(() => totpAtStep(RFC_SECRET, BigInt("18446744073709551616")), RangeError);
});

test("TOTP verification at the Unix epoch skips negative candidate steps", () => {
  const code = totpAtStep(RFC_SECRET, BigInt(0));
  assert.equal(verifyTotp(RFC_SECRET, code, null, 0), BigInt(0));
  assert.equal(verifyTotp(RFC_SECRET, "000000", null, 0), null);
});

test("Encrypted authenticator secrets round-trip with a versioned AES-GCM envelope", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  const [version, iv, tag, ciphertext] = encrypted.split(".");
  assert.equal(version, "v1");
  assert.equal(Buffer.from(iv, "base64url").length, 12);
  assert.equal(Buffer.from(tag, "base64url").length, 16);
  assert.ok(ciphertext.length > 0);
  assert.ok(!encrypted.includes(RFC_SECRET));
  assert.equal(decryptAuthenticatorSecret(encrypted, USER_ID), RFC_SECRET);
});

test("Encrypting the same secret twice creates different IVs and ciphertext", () => {
  const first = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  const second = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  assert.notEqual(first, second);
  assert.notEqual(first.split(".")[1], second.split(".")[1]);
  assert.notEqual(first.split(".")[3], second.split(".")[3]);
  assert.equal(decryptAuthenticatorSecret(first, USER_ID), decryptAuthenticatorSecret(second, USER_ID));
});

test("Encrypted secrets reject tampering with the IV, authentication tag, or ciphertext", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  for (const index of [1, 2, 3]) {
    const parts = encrypted.split(".");
    const bytes = Buffer.from(parts[index], "base64url");
    bytes[0] ^= 1;
    parts[index] = bytes.toString("base64url");
    assert.throws(() => decryptAuthenticatorSecret(parts.join("."), USER_ID));
  }
});

test("Encrypted secrets are bound to the administrator identity", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  assert.throws(() => decryptAuthenticatorSecret(encrypted, OTHER_USER_ID));
});

test("Encrypted secrets cannot be decrypted with another application key", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  process.env.AUTH_SECRET = OTHER_AUTH_SECRET;
  assert.throws(() => decryptAuthenticatorSecret(encrypted, USER_ID));
});

test("Encryption and decryption fail closed without a sufficiently long application key", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  delete process.env.AUTH_SECRET;
  assert.throws(() => encryptAuthenticatorSecret(RFC_SECRET, USER_ID), /AUTH_SECRET_REQUIRED/);
  assert.throws(() => decryptAuthenticatorSecret(encrypted, USER_ID), /AUTH_SECRET_REQUIRED/);
  process.env.AUTH_SECRET = "too-short";
  assert.throws(() => encryptAuthenticatorSecret(RFC_SECRET, USER_ID), /AUTH_SECRET_REQUIRED/);
  assert.throws(() => decryptAuthenticatorSecret(encrypted, USER_ID), /AUTH_SECRET_REQUIRED/);
});

test("Encrypted secrets reject malformed envelopes including extra empty segments", () => {
  const encrypted = encryptAuthenticatorSecret(RFC_SECRET, USER_ID);
  const parts = encrypted.split(".");
  const malformed = [
    "", "v1", parts.slice(0, 3).join("."), encrypted.replace(/^v1\./, "v2."),
    [parts[0], "AA", parts[2], parts[3]].join("."),
    [parts[0], parts[1], "AA", parts[3]].join("."),
    `${encrypted}.extra`, `${encrypted}.`, `${encrypted}..extra`,
  ];
  for (const value of malformed) assert.throws(() => decryptAuthenticatorSecret(value, USER_ID), /INVALID_AUTHENTICATOR_SECRET/);
});

test("Recovery code generation returns ten unique 96-bit codes in the displayed format", () => {
  const first = createRecoveryCodes();
  const second = createRecoveryCodes();
  assert.equal(first.length, 10);
  assert.equal(second.length, 10);
  for (const code of [...first, ...second]) assert.match(code, /^[a-f0-9]{6}(?:-[a-f0-9]{6}){3}$/);
  assert.equal(new Set([...first, ...second]).size, 20);
});

test("Recovery-code hashing normalizes supported input and produces a 256-bit digest", () => {
  const hash = recoveryCodeHash(RECOVERY_CODE, USER_ID);
  assert.match(hash!, /^[a-f0-9]{64}$/);
  assert.equal(recoveryCodeHash(`  ${RECOVERY_CODE.toUpperCase()}  `, USER_ID), hash);
  assert.equal(recoveryCodeHash(RECOVERY_CODE.replaceAll("-", ""), USER_ID), hash);
});

test("Recovery-code hashes are bound to the user and application key", () => {
  const hash = recoveryCodeHash(RECOVERY_CODE, USER_ID);
  assert.notEqual(recoveryCodeHash(RECOVERY_CODE, OTHER_USER_ID), hash);
  process.env.AUTH_SECRET = OTHER_AUTH_SECRET;
  assert.notEqual(recoveryCodeHash(RECOVERY_CODE, USER_ID), hash);
});

test("Different recovery codes have different stored digests", () => {
  const codes = createRecoveryCodes();
  const hashes = codes.map((code) => recoveryCodeHash(code, USER_ID));
  assert.equal(new Set(hashes).size, codes.length);
  assert.ok(hashes.every((hash) => typeof hash === "string" && hash.length === 64));
});

test("Recovery-code hashing rejects malformed input", () => {
  for (const code of ["", "123456", "a".repeat(23), "a".repeat(25), "g".repeat(24), "a1b2c3 d4e5f6 012345 6789ab", "a1b2c3/d4e5f6/012345/6789ab"]) {
    assert.equal(recoveryCodeHash(code, USER_ID), null);
  }
});

test("Recovery-code hashing fails closed without a sufficiently long application key", () => {
  delete process.env.AUTH_SECRET;
  assert.throws(() => recoveryCodeHash(RECOVERY_CODE, USER_ID), /AUTH_SECRET_REQUIRED/);
  process.env.AUTH_SECRET = "too-short";
  assert.throws(() => recoveryCodeHash(RECOVERY_CODE, USER_ID), /AUTH_SECRET_REQUIRED/);
});

test("Authenticator URI encodes the account label and declares interoperable TOTP settings", () => {
  const email = "admin+owner@example.test";
  const uri = authenticatorUri(RFC_SECRET, email);
  const parsed = new URL(uri);
  assert.equal(parsed.protocol, "otpauth:");
  assert.equal(parsed.hostname, "totp");
  assert.equal(decodeURIComponent(parsed.pathname.slice(1)), `Pausstik:${email}`);
  assert.equal(parsed.searchParams.get("secret"), RFC_SECRET);
  assert.equal(parsed.searchParams.get("issuer"), "Pausstik");
  assert.equal(parsed.searchParams.get("algorithm"), "SHA1");
  assert.equal(parsed.searchParams.get("digits"), "6");
  assert.equal(parsed.searchParams.get("period"), "30");
  assert.equal(parsed.searchParams.size, 5);
});
