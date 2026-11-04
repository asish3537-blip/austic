export function localAdminPreviewEnabled() {
  if (process.env.NODE_ENV === "production" || process.env.PAUSTIK_LOCAL_ADMIN_SETUP !== "true") return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL || "").hostname);
  } catch { return false; }
}

