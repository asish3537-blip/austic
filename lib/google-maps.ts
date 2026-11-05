export type MapPoint = { latitude: number; longitude: number };
export function validMapPoint(p: MapPoint) { return Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180; }
const coordinate = (p: MapPoint) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
export function googleMapUrl(point: MapPoint) {
  return validMapPoint(point) ? "https://www.google.com/maps/search/?" + new URLSearchParams({ api: "1", query: coordinate(point) }) : null;
}
export function googleDirectionsUrl(destination: MapPoint, origin?: MapPoint) {
  return validMapPoint(destination) && (!origin || validMapPoint(origin)) ? "https://www.google.com/maps/dir/?" + new URLSearchParams({ api: "1", destination: coordinate(destination), ...(origin ? { origin: coordinate(origin) } : {}), travelmode: "driving", dir_action: "navigate" }) : null;
}
