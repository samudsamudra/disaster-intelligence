import type { AlertLocation } from "./local-alert-risk";

export function simulatedPointNear(location: AlertLocation): AlertLocation {
  return {
    latitude: location.latitude,
    longitude: location.longitude + 1 / (111.32 * Math.max(0.2, Math.cos(location.latitude * Math.PI / 180))),
  };
}
