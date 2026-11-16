import test from "node:test";
import assert from "node:assert/strict";
import { nearbyAlerts } from "./local-alert-risk.ts";

const now = Date.parse("2026-11-16T05:00:00Z");
const location = { latitude: -6.2, longitude: 106.8 };
const event = (id, latitude, magnitude, minutesAgo = 5) => ({
  id, latitude, longitude: 106.8, magnitude, source: "BMKG",
  place: "Contoh data uji", depthKm: 10,
  occurredAt: new Date(now - minutesAgo * 60_000).toISOString(),
});

test("warning and danger respect magnitude and distance", () => {
  const alerts = nearbyAlerts(location, [event("warning", -5.3, 4.2), event("danger", -6.15, 5.8), event("weak", -6.15, 3.9), event("far", -3, 7)], now);
  assert.deepEqual(alerts.map(item => [item.event.id, item.level]), [["danger", "danger"], ["warning", "warning"]]);
});

test("old, future and invalid events do not alert", () => {
  const alerts = nearbyAlerts(location, [event("old", -6.19, 6, 31), event("future", -6.19, 6, -3), event("invalid", 200, 6)], now);
  assert.equal(alerts.length, 0);
});
