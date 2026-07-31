import test from "node:test";
import assert from "node:assert/strict";
import { layoutPanel } from "../src/domain/panel.js";

const circuit = (overrides) => ({
  id: overrides.id,
  name: overrides.id,
  amps: overrides.amps ?? 20,
  phase: overrides.phase,
  neutral: false
});

test("single-phase panel uses only A and B", () => {
  const result = layoutPanel({
    panelType: 1,
    slotCount: 6,
    circuits: [
      circuit({ id: "one", phase: 1 }),
      circuit({ id: "two", phase: 1 })
    ]
  });
  assert.deepEqual(Object.keys(result.loads), ["A", "B"]);
  assert.equal("C" in result.loads, false);
  assert.deepEqual(result.loads, { A: 20, B: 20 });
});

test("two-pole breaker occupies consecutive vertical positions on one side", () => {
  const result = layoutPanel({
    panelType: 1,
    slotCount: 6,
    circuits: [circuit({ id: "two-pole", phase: 2 })]
  });
  const occupied = result.slots
    .map((entry, index) => entry ? index : null)
    .filter((index) => index !== null);
  assert.deepEqual(occupied, [0, 2]);
  assert.deepEqual(occupied.map((index) => result.slots[index].phase), ["A", "B"]);
});

test("three-pole circuit is reported unplaced in single-phase panel", () => {
  const result = layoutPanel({
    panelType: 1,
    slotCount: 6,
    circuits: [circuit({ id: "three-pole", phase: 3 })]
  });
  assert.equal(result.unplaced.length, 1);
  assert.match(result.unplaced[0].reason, /3-фазную/);
});

test("insufficient space never drops a circuit silently", () => {
  const result = layoutPanel({
    panelType: 1,
    slotCount: 6,
    circuits: [
      circuit({ id: "a", phase: 2 }),
      circuit({ id: "b", phase: 2 }),
      circuit({ id: "c", phase: 2 }),
      circuit({ id: "d", phase: 2 })
    ]
  });
  assert.ok(result.unplaced.length > 0);
});
