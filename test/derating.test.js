import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustmentFactor,
  calculateDerating,
  racewayFillLimit
} from "../src/domain/derating.js";

const circuit = (overrides = {}) => ({
  id: "c1",
  name: "Lighting",
  amps: 20,
  phase: 1,
  neutral: true,
  neutralCurrentCarrying: true,
  wireSize: "12 AWG",
  material: "copper",
  insulationTemp: 90,
  terminalTemp: 60,
  ambientC: 30,
  continuous: false,
  hundredPercentRated: false,
  ...overrides
});

test("Table 310.15(C)(1) adjustment ranges include 31–40 and 41+", () => {
  assert.equal(adjustmentFactor(3), 1);
  assert.equal(adjustmentFactor(4), 0.8);
  assert.equal(adjustmentFactor(7), 0.7);
  assert.equal(adjustmentFactor(10), 0.5);
  assert.equal(adjustmentFactor(21), 0.45);
  assert.equal(adjustmentFactor(31), 0.4);
  assert.equal(adjustmentFactor(41), 0.35);
});

test("Chapter 9 Table 1 fill limits depend on installed conductor count", () => {
  assert.equal(racewayFillLimit(1), 0.53);
  assert.equal(racewayFillLimit(2), 0.31);
  assert.equal(racewayFillLimit(3), 0.4);
  assert.equal(racewayFillLimit(8, true), 0.6);
});

test("two-wire circuit counts neutral as current carrying and EGC only for fill", () => {
  const result = calculateDerating({
    circuits: [circuit()],
    conduitType: "EMT",
    conduitSize: "0.5",
    groundWireSize: "12 AWG",
    groundCount: 1
  });
  assert.equal(result.currentCarryingCount, 2);
  assert.equal(result.installedConductorCount, 3);
  assert.equal(result.adjustmentFactor, 1);
  assert.equal(result.fillLimit, 0.4);
  assert.equal(result.circuits[0].requiredSize, "12 AWG");
});

test("neutral declared non-current-carrying is excluded from adjustment count", () => {
  const result = calculateDerating({
    circuits: [circuit({ phase: 2, neutralCurrentCarrying: false })],
    conduitType: "EMT",
    conduitSize: "0.5"
  });
  assert.equal(result.currentCarryingCount, 2);
  assert.equal(result.installedConductorCount, 3);
});

test("unsupported raceway combination fails closed", () => {
  assert.throws(
    () => calculateDerating({
      circuits: [circuit()],
      conduitType: "ENT",
      conduitSize: "4"
    }),
    /нет данных/
  );
});
