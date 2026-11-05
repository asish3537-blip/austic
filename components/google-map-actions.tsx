import { googleMapUrl, googleDirectionsUrl, type MapPoint } from "@/lib/google-maps";
export function GoogleMapActions({ point, destination, label = "Location" }: { point: MapPoint; destination?: MapPoint; label?: string }) {
  const map = googleMapUrl(point), directions = googleDirectionsUrl(destination || point, destination ? point : undefined);
  if (!map) return null;
  return <div className="google-map-actions"><a href={map} target="_blank" rel="noopener noreferrer">Google Maps · {label} ↗</a>{directions && <a href={directions} target="_blank" rel="noopener noreferrer">{destination ? "Courier-to-door directions" : "Get directions"} ↗</a>}<small>Opens Google Maps and shares these coordinates only when you tap. Map directions are separate from Paustik’s order status.</small></div>;
}
