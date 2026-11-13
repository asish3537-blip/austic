import { test } from "node:test";
import assert from "node:assert/strict";
import { courierCovers, courierKitchenBounds, type CourierArea } from "../lib/courier-area";

const area: CourierArea = { isAvailable: true, serviceCity: "Patiala", serviceLatitude: 20.3, serviceLongitude: 85.8, serviceRadiusMeters: 25000 };
test("GPS distance allows nearby pickups despite a stale city label", () => {
  assert.equal(courierCovers(area, { city: "Bhubaneswar", latitude: 20.45, longitude: 85.8 }), true);
  assert.equal(courierCovers(area, { city: "Patiala", latitude: 30.34, longitude: 76.38 }), false);
});
test("25 km limit and existing smaller selected radii are respected", () => {
  const kitchen = { city: "Bhubaneswar", latitude: 20.45, longitude: 85.8 };
  assert.equal(courierCovers({ ...area, serviceRadiusMeters: 10000 }, kitchen), false);
  assert.equal(courierCovers(area, { ...kitchen, latitude: 20.54 }), false);
  assert.equal(courierCovers({ ...area, serviceRadiusMeters: 26000 }, kitchen), false);
});
test("offline, missing and invalid pins cannot receive jobs", () => {
  const kitchen = { city: "Bhubaneswar", latitude: 20.3, longitude: 85.8 };
  for (const invalid of [{ ...area, isAvailable: false }, { ...area, serviceLatitude: null }, { ...area, serviceLongitude: NaN }, { ...area, serviceLatitude: 100 }]) {
    assert.equal(courierCovers(invalid, kitchen), false);
    assert.equal(courierKitchenBounds(invalid), null);
  }
  assert.equal(courierCovers(area, { ...kitchen, longitude: null }), false);
});
test("database prefilter includes nearby cross-city pickups and excludes distant latitude", () => {
  const bounds = courierKitchenBounds(area)!;
  assert.ok(bounds.latitude.gte < 20.15 && bounds.latitude.lte > 20.45);
  assert.ok(bounds.latitude.lte < 20.54);
  assert.ok(!("city" in bounds));
});
test("prefilter supports longitude wrap and polar areas", () => {
  assert.ok(courierKitchenBounds({ ...area, serviceLongitude: 179.99 })?.OR);
  assert.ok(courierKitchenBounds({ ...area, serviceLongitude: -179.99 })?.OR);
  assert.equal(courierKitchenBounds({ ...area, serviceLatitude: 89.99 })?.latitude.lte, 90);
});
