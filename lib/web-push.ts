import webpush from "web-push";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushPayload, validPushEndpoint } from "@/lib/push-rules";

export function webPushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY, privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  return publicKey && privateKey && /^[\w-]{87}$/.test(publicKey) && /^[\w-]{43}$/.test(privateKey) ? { publicKey, privateKey, subject: "https://paustik.in" } : null;
}
export async function sendPendingPush(userIds: string[], sender: typeof webpush.sendNotification = webpush.sendNotification.bind(webpush)) {
  const config = webPushConfig(); if (!config || !userIds.length) return;
  const now = new Date();
  const devices = await prisma.webPushDevice.findMany({ where: { userId: { in: [...new Set(userIds)] }, user: { status: "ACTIVE", email: { not: { endsWith: "@paustik.invalid" } } }, session: { revokedAt: null, expiresAt: { gt: now } } }, include: { session: true, user: { select: { role: true, adminAuthVersion: true } } }, take: 100 });
  await Promise.allSettled(devices.map(async device => {
    if (!validPushEndpoint(device.endpoint) || (device.user.role === "ADMIN" && device.session.adminAuthVersion !== device.user.adminAuthVersion)) return;
    const pending = () => prisma.$queryRaw<Array<{ id: string }>>`
      SELECT n.id FROM paustik_marketplace.notifications n
      JOIN paustik_marketplace.web_push_devices d ON d.id = ${device.id}::uuid
      WHERE n.user_id = d.user_id AND n.created_at > d.last_event_at
      AND n.created_at >= ${new Date(now.getTime() - 86400000)}
      AND n.kind IN ('ORDER','DELIVERY','PAYMENT','ACCOUNT','SYSTEM')
      ORDER BY n.created_at ASC LIMIT 20`;
    if (!(await pending()).length) return;
    const lease = await prisma.webPushDevice.updateMany({ where: { id: device.id, sessionId: device.sessionId, OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(now.getTime() - 15000) } }] }, data: { lastAttemptAt: now } });
    if (!lease.count) return;
    const notifications = await pending();
    if (!notifications.length) { await prisma.webPushDevice.updateMany({ where: { id: device.id, sessionId: device.sessionId }, data: { lastAttemptAt: null } }); return; }
    // One generic alert covers the batch; private order details stay behind sign-in.
    const latest = notifications.at(-1)!;
    try {
      await sender({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, pushPayload(latest.id), { vapidDetails: config, TTL: 86400, timeout: 8000, urgency: "normal" });
      // Keep PostgreSQL timestamp precision; a JavaScript Date could replay the same microsecond event.
      await prisma.$executeRaw`UPDATE paustik_marketplace.web_push_devices d
        SET last_event_at = n.created_at, last_attempt_at = NULL
        FROM paustik_marketplace.notifications n
        WHERE d.id = ${device.id}::uuid AND d.session_id = ${device.sessionId}::uuid AND n.id = ${latest.id}::uuid`;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.webPushDevice.deleteMany({ where: { id: device.id, sessionId: device.sessionId } });
      // Transient failures keep their cursor and can retry on the next app/event request.
      console.error("Paustik push delivery unavailable", status || "network");
    }
  }));
}
export function scheduleEntityPush(entityIds: string[]) {
  if (!webPushConfig()) return;
  after(async () => {
    try {
      const recipients = await prisma.notification.findMany({ where: { entityId: { in: entityIds }, createdAt: { gte: new Date(Date.now() - 60000) }, kind: { not: "DEMO" } }, distinct: ["userId"], select: { userId: true } });
      await sendPendingPush(recipients.map(r => r.userId));
    } catch { console.error("Paustik push dispatch deferred."); }
  });
}
