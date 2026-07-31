import test from "node:test";
import assert from "node:assert/strict";
import {
  ambientCorrectionFactor,
  evaluateWire,
  findWire,
  selectWireSize
} from "../src/domain/conductors.js";

test("NEC 2023 Table 310.16 corrected copper values are loaded", () => {
  assert.deepEqual(findWire("3 AWG").ampacity.copper, { 60: 85, 75: 100, 90: 115 });
  assert.deepEqual(findWire("1 AWG").ampacity.copper, { 60: 110, 75: 130, 90: 145 });
});

test("NEC 2023 Table 310.16 aluminum values are loaded", () => {
  assert.deepEqual(findWire("12 AWG").ampacity.aluminum, { 60: 15, 75: 20, 90: 25 });
  assert.deepEqual(findWire("500 kcmil").ampacity.aluminum, { 60: 260, 75: 310, 90: 350 });
});

test("Table 310.15(B)(1)(1) ambient correction uses insulation rating", () => {
  assert.equal(ambientCorrectionFactor(40, 90), 0.91);
  assert.equal(ambientCorrectionFactor(40, 75), 0.88);
  assert.equal(ambientCorrectionFactor(10, 60), 1.29);
  assert.throws(() => ambientCorrectionFactor(60, 60), /не допускается/);
});

test("20 A noncontinuous copper branch circuit selects 12 AWG at 60C terminals", () => {
  const result = selectWireSize({
    material: "copper",
    insulationTemp: 90,
    terminalTemp: 60,
    ambientC: 30,
    loadAmps: 20,
    continuous: false,
    adjustmentFactor: 1
  });
  assert.equal(result.wireSize, "12 AWG");
  assert.equal(result.requiredOcpd, 20);
});

test("20 A continuous load requires 25 A ampacity and 10 AWG under 240.4(D)", () => {
  const result = selectWireSize({
    material: "copper",
    insulationTemp: 90,
    terminalTemp: 60,
    ambientC: 30,
    loadAmps: 20,
    continuous: true,
    adjustmentFactor: 1
  });
  assert.equal(result.requiredAmpacity, 25);
  assert.equal(result.requiredOcpd, 25);
  assert.equal(result.wireSize, "10 AWG");
});

test("90C insulation may be used for correction but not above terminal ampacity", () => {
  const result = evaluateWire({
    wireSize: "12 AWG",
    material: "copper",
    insulationTemp: 90,
    terminalTemp: 60,
    ambientC: 40,
    adjustmentFactor: 0.8,
    loadAmps: 20
  });
  assert.equal(result.correctedAmpacity, 30 * 0.91 * 0.8);
  assert.equal(result.terminalAmpacity, 20);
  assert.equal(result.allowableAmpacity, 20);
});

test("unknown wire size is rejected", () => {
  assert.throws(() => findWire("7 AWG"), /Неизвестный размер/);
});
