import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateDiscount, batchProblem, batchRoute, couponDiscount, deliveryQuote } from "../lib/dispatch-rules";
import { deliveryHandoverCode, matchesHandoverCode } from "../lib/delivery-handover";

const stop = (id: string, quantity = 1, latitude = 20.3, minutes = 0) => ({ id, quantity, scheduledFor: new Date(Date.UTC(2026, 10, 13, 7, minutes)), pickup: { latitude: 20.3, longitude: 85.8 }, dropoff: { latitude, longitude: 85.8 } });
test("batches enforce order count and total carrying capacity", () => {
  assert.equal(batchProblem([stop("a"), stop("b"), stop("c")], 3), null);
  assert.match(batchProblem([stop("a"), stop("b"), stop("c"), stop("d")], 10)!, /three/);
  assert.match(batchProblem([stop("a", 3), stop("b", 4)], 6)!, /capacity/);
});
test("distant drop-offs and incompatible delivery windows cannot be batched", () => {
  assert.match(batchProblem([stop("a"), stop("b", 1, 20.34)], 6)!, /2 km/);
  assert.match(batchProblem([stop("a"), stop("b", 1, 20.3, 31)], 6)!, /time window/);
  assert.equal(batchProblem([stop("a"), stop("b", 1, 20.31, 30)], 6), null);
});
test("every route pickup precedes every customer drop-off", () => {
  const route = batchRoute([stop("a"), stop("b", 1, 20.305), stop("c", 1, 20.31)]);
  assert.deepEqual(route.slice(0, 3).map(item => item.kind), ["PICKUP", "PICKUP", "PICKUP"]);
  assert.equal(new Set(route.filter(item => item.kind === "DELIVERY").map(item => item.id)).size, 3);
});
test("delivery fees are deterministic, rounded and capped", () => {
  assert.equal(deliveryQuote(0.5), 9);
  assert.equal(deliveryQuote(2), 14);
  assert.equal(deliveryQuote(2.125), 14.63);
  assert.equal(deliveryQuote(100), 150);
  assert.throws(() => deliveryQuote(NaN));
});
test("coupons cannot exceed their eligible base or cap", () => {
  assert.equal(couponDiscount("PERCENT", 10, 30, 500, 9), 30);
  assert.equal(couponDiscount("DELIVERY", 50, 50, 100, 9), 9);
  assert.equal(couponDiscount("FIXED", 200, 200, 69, 9), 69);
  assert.deepEqual(allocateDiscount(1, [1, 1, 1]), [0.33, 0.33, 0.34]);
  assert.equal(allocateDiscount(20.01, [69, 89, 99]).reduce((sum, n) => Math.round((sum + n) * 100) / 100, 0), 20.01);
});
test("handover codes are bound to the delivery, nonce and handover stage", () => {
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "isolated-dispatch-unit-test-secret";
  try {
    const code = deliveryHandoverCode("one", "nonce-one");
    assert.match(code, /^\d{6}$/);
    assert.equal(matchesHandoverCode("one", "nonce-one", code), true);
    assert.equal(matchesHandoverCode("two", "nonce-one", code), false);
    assert.equal(matchesHandoverCode("one:pickup", "nonce-one", code), false);
    assert.equal(matchesHandoverCode("one", "nonce-two", code), false);
    assert.equal(matchesHandoverCode("one", "nonce-one", "123"), false);
  } finally { if (original === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original; }
});
