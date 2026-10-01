import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

let sqlClient;

export function database() {
  if (!process.env.DATABASE_URL) {
    throw new ApiError(503, "backend_setup_required", "The delivery service is not connected yet.");
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}

export function withApi(handler) {
  return async function paustikApiHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        send(res, error.status, { ok: false, error: error.code, message: error.message });
      } else {
        console.error("Paustik API request failed:", error?.name || "Error");
        send(res, 500, { ok: false, error: "internal_error", message: "The request could not be completed." });
      }
    }
  };
}

export function requireMethod(req, allowed) {
  if (!allowed.includes(req.method)) {
    throw new ApiError(405, "method_not_allowed", "This operation is not available with that method.");
  }
}

export function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new ApiError(403, "origin_required", "This operation must be started from the Paustik site.");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const allowedOrigins = new Set(host ? [`${forwardedProto}://${host}`] : []);
  if (process.env.NODE_ENV !== "production" && host) allowedOrigins.add(`http://${host}`);
  if (!allowedOrigins.has(origin)) {
    throw new ApiError(403, "origin_not_allowed", "This request did not come from the Paustik site.");
  }
}

export async function readJson(req) {
  const length = Number(req.headers["content-length"] || 0);
  if (length > 16_384) throw new ApiError(413, "request_too_large", "The request is too large.");
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) {
    if (Array.isArray(body)) throw new ApiError(400, "invalid_json", "Send a valid JSON object.");
    return body;
  }
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : typeof body === "string" ? body : "";
  if (text.length > 16_384) throw new ApiError(413, "request_too_large", "The request is too large.");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new ApiError(400, "invalid_json", "Send a valid JSON object.");
  }
}

export function uuid(value, field = "deliveryId") {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, "invalid_id", `${field} is not valid.`);
  }
  return value.toLowerCase();
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacCode(deliveryId, code) {
  const key = process.env.PAUSTIK_ADMIN_TOKEN;
  if (!key) throw new ApiError(503, "backend_setup_required", "The delivery service is not connected yet.");
  return createHmac("sha256", key).update(`${deliveryId}:${code}`).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function secureEquals(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireAdmin(req) {
  const expected = process.env.PAUSTIK_ADMIN_TOKEN;
  if (!expected) throw new ApiError(503, "backend_setup_required", "The operations service is not configured yet.");
  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secureEquals(supplied, expected)) throw new ApiError(401, "admin_auth_required", "Operations access is required.");
}

function parseCookies(req) {
  const result = new Map();
  for (const piece of String(req.headers.cookie || "").split(";")) {
    const at = piece.indexOf("=");
    if (at > 0) {
      try { result.set(piece.slice(0, at).trim(), decodeURIComponent(piece.slice(at + 1).trim())); }
      catch { /* Ignore malformed cookie values. */ }
    }
  }
  return result;
}

function cookieName(req, deliveryId, role) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
  return `${secure ? "__Host-" : ""}paustik-${role}-${deliveryId}`;
}

export function setLocationCookie(req, res, deliveryId, role, token, expiresAt) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
  const name = cookieName(req, deliveryId, role);
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const pieces = [`${name}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${seconds}`];
  if (secure) pieces.push("Secure");
  res.setHeader("Set-Cookie", pieces.join("; "));
}

export function clearLocationCookie(req, res, deliveryId, role) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
  const pieces = [`${cookieName(req, deliveryId, role)}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) pieces.push("Secure");
  res.setHeader("Set-Cookie", pieces.join("; "));
}

export async function requireLocationSession(sql, req, deliveryId, role) {
  const cookies = parseCookies(req);
  const secureName = `__Host-paustik-${role}-${deliveryId}`;
  const localName = `paustik-${role}-${deliveryId}`;
  const token = cookies.get(secureName) || cookies.get(localName);
  if (!token) throw new ApiError(401, "tracking_session_required", "Open the secure delivery link again to continue.");
  const [session] = await sql`
    SELECT s.id, s.delivery_id, s.role, s.expires_at, s.consent_at, s.consent_revoked_at
      FROM paustik_location_sessions s
     WHERE s.delivery_id = ${deliveryId}
       AND s.role = ${role}
       AND s.token_hash = ${sha256(token)}
       AND s.expires_at > now()
       AND s.revoked_at IS NULL
     LIMIT 1
  `;
  if (!session) throw new ApiError(401, "tracking_session_expired", "This delivery link has expired. Ask operations for a fresh link.");
  return session;
}

export async function requireAnyLocationSession(sql, req, deliveryId) {
  for (const role of ["parent", "courier"]) {
    try {
      return await requireLocationSession(sql, req, deliveryId, role);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401)) throw error;
    }
  }
  throw new ApiError(401, "tracking_session_required", "Open the secure delivery link again to continue.");
}

export function publicBase(req) {
  if (process.env.NODE_ENV === "production") return (process.env.PAUSTIK_PUBLIC_URL || "https://paustik-live-demo.vercel.app").replace(/\/$/, "");
  return (process.env.PAUSTIK_PUBLIC_URL || `http://${req.headers.host || "localhost:3000"}`).replace(/\/$/, "");
}

export function shareUrl(req, page, deliveryId, token) {
  const url = new URL(page, `${publicBase(req)}/`);
  url.searchParams.set("deliveryId", deliveryId);
  url.hash = new URLSearchParams({ share: token }).toString();
  return url.toString();
}

export function haversineAndBearing(fromLat, fromLon, toLat, toLon) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(toLat - fromLat);
  const dLon = radians(toLon - fromLon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(dLon / 2) ** 2;
  const distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  const bearing = (Math.atan2(
    Math.sin(dLon) * Math.cos(radians(toLat)),
    Math.cos(radians(fromLat)) * Math.sin(radians(toLat)) - Math.sin(radians(fromLat)) * Math.cos(radians(toLat)) * Math.cos(dLon)
  ) * 180 / Math.PI + 360) % 360;
  return { distance: Math.round(distance), bearing: Math.round(bearing) };
}

export function finiteNumber(value, field, min, max) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new ApiError(400, "invalid_input", `${field} is outside the allowed range.`);
  }
  return number;
}

export function nonEmptyString(value, field, max = 64) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, "invalid_input", `${field} is required and must be under ${max} characters.`);
  }
  return value.trim();
}
