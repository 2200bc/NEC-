import test from "node:test";
import assert from "node:assert/strict";
import { calculateVoltageDrop, systemVoltage } from "../src/domain/voltage-drop.js";

test("supported supply systems select line-neutral and line-line voltage", () => {
  assert.equal(systemVoltage("single-120-240", 1), 120);
  assert.equal(systemVoltage("single-120-240", 2), 240);
  assert.equal(systemVoltage("three-120-208", 3), 208);
  assert.equal(systemVoltage("three-277-480", 1), 277);
});

test("known voltage-drop example remains stable", () => {
  const result = calculateVoltageDrop({
    supplySystem: "single-120-240",
    phase: 1,
    length: 50,
    lengthUnit: "ft",
    material: "copper",
    wireSize: "12 AWG",
    amps: 20
  });
  assert.equal(result.dropVolts.toFixed(2), "3.95");
  assert.equal(result.dropPercent.toFixed(2), "3.29");
  assert.equal(result.recommendedSize, "10 AWG");
});

test("combined feeder and branch recommendation is checked at 5 percent", () => {
  const result = calculateVoltageDrop({
    supplySystem: "single-120-240",
    phase: 1,
    length: 25,
    lengthUnit: "ft",
    material: "copper",
    wireSize: "12 AWG",
    amps: 20,
    upstreamDropPercent: 4
  });
  assert.equal(result.exceedsCombinedRecommendation, true);
});

test("metric length is converted to feet", () => {
  const result = calculateVoltageDrop({
    supplySystem: "three-277-480",
    phase: 1,
    length: 10,
    lengthUnit: "m",
    material: "copper",
    wireSize: "12 AWG",
    amps: 10
  });
  assert.ok(Math.abs(result.lengthFeet - 32.8084) < 0.0001);
});
