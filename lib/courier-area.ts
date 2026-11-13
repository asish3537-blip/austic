import { distanceMeters } from "./marketplace-rules";

export const MAX_COURIER_RADIUS_KM = 25;
export type CourierArea = { isAvailable: boolean; serviceCity: string | null; serviceLatitude: unknown; serviceLongitude: unknown; serviceRadiusMeters: number };

export function courierPin(area: CourierArea) {
  if (area.serviceLatitude == null || area.serviceLongitude == null) return null;
  const latitude = Number(area.serviceLatitude), longitude = Number(area.serviceLongitude);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

export function courierCovers(area: CourierArea, kitchen: { city: string; latitude: unknown; longitude: unknown }) {
  const origin = courierPin(area);
  const target = courierPin({ ...area, serviceLatitude: kitchen.latitude, serviceLongitude: kitchen.longitude });
  return area.isAvailable && !!origin && !!target && Number.isFinite(area.serviceRadiusMeters) && area.serviceRadiusMeters > 0 && area.serviceRadiusMeters <= MAX_COURIER_RADIUS_KM * 1000 && distanceMeters(origin, target) <= area.serviceRadiusMeters;
}

// A database prefilter before pagination; exact distance is checked again before showing or claiming a job.
export function courierKitchenBounds(area: CourierArea) {
  const pin = courierPin(area);
  if (!pin || !area.isAvailable || !Number.isFinite(area.serviceRadiusMeters) || area.serviceRadiusMeters <= 0 || area.serviceRadiusMeters > MAX_COURIER_RADIUS_KM * 1000) return null;
  const angular = area.serviceRadiusMeters / 6371000;
  const degrees = angular * 180 / Math.PI;
  const latitude = { gte: Math.max(-90, pin.latitude - degrees), lte: Math.min(90, pin.latitude + degrees) };
  if (latitude.gte === -90 || latitude.lte === 90) return { latitude };
  const span = Math.asin(Math.min(1, Math.sin(angular) / Math.cos(pin.latitude * Math.PI / 180))) * 180 / Math.PI;
  const west = pin.longitude - span, east = pin.longitude + span;
  if (west < -180) return { latitude, OR: [{ longitude: { gte: west + 360 } }, { longitude: { lte: east } }] };
  if (east > 180) return { latitude, OR: [{ longitude: { gte: west } }, { longitude: { lte: east - 360 } }] };
  return { latitude, longitude: { gte: west, lte: east } };
}
