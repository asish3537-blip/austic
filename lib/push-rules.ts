import { ECDH } from "node:crypto";
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.username && !u.password && !u.hash && (!u.port || u.port === "443") && endpoint.length <= 2048 &&
      (u.hostname === "fcm.googleapis.com" || u.hostname === "updates.push.services.mozilla.com" || u.hostname === "web.push.apple.com" || u.hostname.endsWith(".notify.windows.com"));
  } catch { return false; }
}
export function validPushKeys(keys: { p256dh: string; auth: string }) {
  if (!/^[\w-]+={0,2}$/.test(keys.p256dh) || !/^[\w-]+={0,2}$/.test(keys.auth)) return false;
  const key = Buffer.from(keys.p256dh, "base64url");
  if (key.length !== 65 || key[0] !== 4 || Buffer.from(keys.auth, "base64url").length !== 16) return false;
  try { ECDH.convertKey(key, "prime256v1"); return true; } catch { return false; }
}
export const pushPayload = (id: string) => JSON.stringify({ title: "Paustik update", body: "Open Paustik to see your latest account update.", tag: "paustik-" + id, url: "/notifications" });
