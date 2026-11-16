import test from "node:test";
import assert from "node:assert/strict";
import { simulatedPointNear } from "./local-alert-lab.ts";
import { distanceKm, nearbyAlerts } from "./local-alert-risk.ts";

test("the lab event is about one kilometer from an Indonesian user", () => {
  const location = { latitude: -6.2, longitude: 106.8 };
  const point = simulatedPointNear(location);
  const distance = distanceKm(location, point);
  assert.ok(distance > 0.9 && distance < 1.1);
  const alerts = nearbyAlerts(location, [{
    id: "lab", source: "BMKG", magnitude: 5.8, place: "Uji",
    depthKm: 10, occurredAt: new Date().toISOString(), ...point,
  }]);
  assert.equal(alerts[0]?.level, "danger");
});
