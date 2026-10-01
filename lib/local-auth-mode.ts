/** Local-only auth fallback for development when no hosted database is configured. */
export function isLocalAuthMode() {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL;
}
