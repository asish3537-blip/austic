export function normalizePhoneNumber(input: string) {
  const raw = input.trim();
  const compact = raw.replace(/[\s().-]/g, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (!/^\d+$/.test(digits)) return null;
  if (!compact.startsWith("+")) {
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
    else if (digits.length === 12 && digits.startsWith("91")) { /* already India E.164 digits */ }
    else return null;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

export function phoneLookupCandidates(input: string, normalized: string) {
  const digits = normalized.slice(1);
  const candidates = new Set([input.trim(), normalized, digits]);
  const rawCompact = input.trim().replace(/[^\d+]/g, "");
  if (rawCompact) candidates.add(rawCompact);

  if (digits.startsWith("91") && digits.length === 12) {
    const local = digits.slice(2);
    candidates.add(local);
    candidates.add(`0${local}`);
    candidates.add(`+91 ${local.slice(0, 5)} ${local.slice(5)}`);
    candidates.add(`+91-${local.slice(0, 5)}-${local.slice(5)}`);
    candidates.add(`${local.slice(0, 5)} ${local.slice(5)}`);
    candidates.add(`${local.slice(0, 5)}-${local.slice(5)}`);
  }
  return [...candidates].filter(Boolean);
}
