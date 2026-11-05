import { inflateSync } from "node:zlib";

export type KitchenBranding = { kind: "photo" | "logo"; image: string };
function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function readKitchenBranding(value: unknown): KitchenBranding | null {
  if (!value || typeof value !== "object" || !("branding" in value)) return null;
  const b = value.branding as Partial<KitchenBranding> | null;
  return b && (b.kind === "photo" || b.kind === "logo") && typeof b.image === "string" && b.image.startsWith("data:image/png;base64,") && b.image.length < 280000 ? { kind: b.kind, image: b.image } : null;
}

// Accept the small, non-interlaced PNG produced by the upload canvas. Keep only image chunks.
export function normalizeKitchenImage(value: string) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length > 280000) throw new Error("Use a smaller PNG image.");
  const data = Buffer.from(value.slice(22), "base64");
  if (!data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("Invalid PNG image.");
  let offset = 8, width = 0, height = 0, channels = 0, ended = false;
  const chunks: Buffer[] = [], compressed: Buffer[] = [];
  while (offset + 12 <= data.length) {
    const size = data.readUInt32BE(offset), end = offset + size + 12;
    if (size > 200000 || end > data.length) throw new Error("Invalid image size.");
    const type = data.toString("ascii", offset + 4, offset + 8);
    if (crc32(data.subarray(offset + 4, end - 4)) !== data.readUInt32BE(end - 4)) throw new Error("Corrupt image chunk.");
    if (offset === 8 && type !== "IHDR") throw new Error("Missing image header.");
    if (type === "IHDR") {
      if (width || size !== 13) throw new Error("Invalid image header.");
      width = data.readUInt32BE(offset + 8); height = data.readUInt32BE(offset + 12);
      channels = data[offset + 17] === 6 ? 4 : data[offset + 17] === 2 ? 3 : 0;
      if (!width || !height || width > 256 || height > 256 || !channels || data[offset + 16] !== 8 || data[offset + 18] || data[offset + 19] || data[offset + 20]) throw new Error("Upload a resized photo using the image picker.");
    }
    if (["IHDR", "IDAT", "IEND"].includes(type)) chunks.push(data.subarray(offset, end));
    if (type === "IDAT") compressed.push(data.subarray(offset + 8, end - 4));
    offset = end;
    if (type === "IEND") { if (size !== 0) throw new Error("Invalid image ending."); ended = true; break; }
  }
  if (!ended || offset !== data.length || !compressed.length) throw new Error("Incomplete image.");
  const stride = width * channels + 1;
  const pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: stride * height });
  if (pixels.length !== stride * height) throw new Error("Invalid image pixels.");
  for (let y = 0; y < height; y++) if (pixels[y * stride] > 4) throw new Error("Invalid image filter.");
  return "data:image/png;base64," + Buffer.concat([data.subarray(0, 8), ...chunks]).toString("base64");
}
