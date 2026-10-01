import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type LocalRole = "CUSTOMER" | "MOTHER" | "DELIVERY_AGENT" | "ADMIN";
export type LocalStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

export type LocalAuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: LocalRole;
  status: LocalStatus;
  emailVerifiedAt: Date | null;
};

type LocalUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: LocalRole;
  status: LocalStatus;
  email_verified_at: string | null;
};

type LocalSessionRow = LocalUserRow & {
  session_expires_at: string;
  revoked_at: string | null;
};

type LocalAuthDbGlobal = typeof globalThis & { __paustikLocalAuthDb?: DatabaseSync };

function database() {
  const globalStore = globalThis as LocalAuthDbGlobal;
  if (globalStore.__paustikLocalAuthDb) return globalStore.__paustikLocalAuthDb;

  const file = join(process.cwd(), ".data", "paustik-local-auth.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      email_verified_at TEXT,
      last_login_at TEXT,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS email_tokens_user_idx ON email_tokens(user_id, created_at);
  `);
  globalStore.__paustikLocalAuthDb = db;
  return db;
}

function mapUser(row: LocalUserRow): LocalAuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
  };
}

function hashPhoneCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function issueLocalPhoneCode(phone: string) {
  const db = database();
  const now = new Date();
  const existing = db.prepare("SELECT requested_at FROM phone_codes WHERE phone = ?").get(phone) as { requested_at?: string } | undefined;
  if (existing?.requested_at && now.getTime() - new Date(existing.requested_at).getTime() < 30_000) {
    return { code: null, retryAfterSeconds: Math.ceil((30_000 - (now.getTime() - new Date(existing.requested_at).getTime())) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  db.prepare(`INSERT INTO phone_codes(phone, code_hash, expires_at, requested_at, attempts)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at,
      requested_at=excluded.requested_at, attempts=0`).run(
    phone,
    hashPhoneCode(phone, code),
    new Date(now.getTime() + 10 * 60_000).toISOString(),
    now.toISOString(),
  );
  return { code, retryAfterSeconds: 0 };
}

export function verifyLocalPhoneCode(phone: string, code: string) {
  const db = database();
  const row = db.prepare("SELECT code_hash, expires_at, attempts FROM phone_codes WHERE phone = ?").get(phone) as { code_hash: string; expires_at: string; attempts: number } | undefined;
  if (!row) return false;
  if (new Date(row.expires_at).getTime() <= Date.now() || row.attempts >= 6) {
    db.prepare("DELETE FROM phone_codes WHERE phone = ?").run(phone);
    return false;
  }

  const expected = Buffer.from(row.code_hash, "hex");
  const supplied = Buffer.from(hashPhoneCode(phone, code), "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    db.prepare("UPDATE phone_codes SET attempts = attempts + 1 WHERE phone = ?").run(phone);
    return false;
  }

  db.prepare("DELETE FROM phone_codes WHERE phone = ?").run(phone);
  return true;
}

export function findLocalUserByPhone(candidates: string[]) {
  if (!candidates.length) return null;
  const marks = candidates.map(() => "?").join(",");
  const row = database().prepare(`SELECT id,name,email,phone,role,status,email_verified_at FROM users WHERE phone IN (${marks}) LIMIT 1`).get(...candidates) as LocalUserRow | undefined;
  return row ? mapUser(row) : null;
}

export function findLocalUserByEmail(email: string) {
  const row = database().prepare("SELECT id,name,email,phone,role,status,email_verified_at FROM users WHERE email = ? COLLATE NOCASE LIMIT 1").get(email) as LocalUserRow | undefined;
  return row ? mapUser(row) : null;
}

export function createLocalUser(input: {
  name: string;
  email: string;
  phone: string;
  role: LocalRole;
  status: LocalStatus;
  profile: Record<string, string>;
}) {
  const db = database();
  const now = new Date();
  const id = randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO users(id,name,email,phone,role,status,profile_json,created_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(id, input.name, input.email.toLowerCase(), input.phone, input.role, input.status, JSON.stringify(input.profile), now.toISOString());
    db.exec("COMMIT");
    return { id, status: input.status };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createLocalEmailToken(userId: string, tokenHash: string) {
  const db = database();
  const now = new Date();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE email_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(now.toISOString(), userId);
    db.prepare("INSERT INTO email_tokens(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(
      tokenHash,
      userId,
      new Date(now.getTime() + 24 * 60 * 60_000).toISOString(),
      now.toISOString(),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function hasRecentLocalEmailToken(userId: string, since: Date) {
  return Boolean(database().prepare("SELECT 1 FROM email_tokens WHERE user_id = ? AND used_at IS NULL AND created_at > ? LIMIT 1").get(userId, since.toISOString()));
}

export function verifyLocalEmail(tokenHash: string, now = new Date()) {
  const db = database();
  const token = db.prepare("SELECT user_id, expires_at, used_at FROM email_tokens WHERE token_hash = ?").get(tokenHash) as { user_id: string; expires_at: string; used_at: string | null } | undefined;
  if (!token || token.used_at || new Date(token.expires_at).getTime() <= now.getTime()) return false;

  db.exec("BEGIN IMMEDIATE");
  try {
    const consumed = db.prepare("UPDATE email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").run(now.toISOString(), tokenHash, now.toISOString());
    if (Number(consumed.changes) !== 1) {
      db.exec("ROLLBACK");
      return false;
    }
    db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(now.toISOString(), token.user_id);
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createLocalSession(userId: string, tokenHash: string, expiresAt: Date) {
  database().prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(
    tokenHash, userId, expiresAt.toISOString(), new Date().toISOString(),
  );
}

export function findLocalUserForSession(tokenHash: string) {
  const row = database().prepare(`SELECT u.id,u.name,u.email,u.phone,u.role,u.status,u.email_verified_at,
      s.expires_at AS session_expires_at,s.revoked_at
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1`).get(tokenHash) as LocalSessionRow | undefined;
  if (!row || row.revoked_at || new Date(row.session_expires_at).getTime() <= Date.now()) return null;
  return mapUser(row);
}

export function revokeLocalSession(tokenHash: string) {
  database().prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(new Date().toISOString(), tokenHash);
}

export function touchLocalUser(userId: string) {
  database().prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(), userId);
}

