export type AlertLocation = { latitude: number; longitude: number };
export type AlertEarthquake = {
  id: string;
  source: "BMKG" | "USGS";
  magnitude: number;
  place: string;
  longitude: number;
  latitude: number;
  depthKm: number | null;
  occurredAt: string;
};
export type NearbyAlert = { event: AlertEarthquake; distanceKm: number; level: "warning" | "danger" };

export function validLocation(location: AlertLocation) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180;
}

export function distanceKm(from: AlertLocation, to: AlertLocation) {
  const latitudeDelta = (to.latitude - from.latitude) * Math.PI / 180;
  const longitudeDelta = (to.longitude - from.longitude) * Math.PI / 180;
  const latitude = from.latitude * Math.PI / 180;
  const targetLatitude = to.latitude * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function nearbyAlerts(location: AlertLocation, events: AlertEarthquake[], now = Date.now()): NearbyAlert[] {
  if (!validLocation(location)) return [];
  return events.flatMap<NearbyAlert>(event => {
    const occurred = Date.parse(event.occurredAt);
    if (!validLocation(event) || !Number.isFinite(event.magnitude) || !Number.isFinite(occurred)
      || occurred > now + 2 * 60_000 || occurred < now - 30 * 60_000) return [];
    const distance = distanceKm(location, event);
    if (distance <= 100 && event.magnitude >= 5.5) return [{ event, distanceKm: distance, level: "danger" as const }];
    if (distance <= 200 && event.magnitude >= 4) return [{ event, distanceKm: distance, level: "warning" as const }];
    return [];
  }).sort((a, b) => (b.level === "danger" ? 1 : 0) - (a.level === "danger" ? 1 : 0)
    || Date.parse(b.event.occurredAt) - Date.parse(a.event.occurredAt));
}
