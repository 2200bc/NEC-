import test from "node:test";
import assert from "node:assert/strict";
import { draftToCircuit, duplicateCircuit, sizeCircuitDraft, updateCircuit } from "../src/domain/circuit-model.js";
import { validateProject } from "../src/storage/project-store.js";

const draft = (overrides = {}) => ({
  name: "Lighting",
  amps: 20,
  phase: 1,
  material: "copper",
  insulationTemp: 90,
  terminalTemp: 60,
  ambientC: 30,
  continuous: false,
  neutralCurrentCarrying: true,
  length: 50,
  lengthUnit: "ft",
  ...overrides
});

test("draft creates a unique validated circuit", () => {
  const circuit = draftToCircuit(draft(), { panelSystem: "single-120-208", idFactory: () => "new-id" });
  assert.equal(circuit.id, "new-id");
  assert.equal(circuit.wireSize, "12 AWG");
  assert.equal(validateProject({ panelSystem: "single-120-208", unitSystem: "ft", circuits: [circuit] }).circuits.length, 1);
});

test("independent conductor sizing works without a project circuit", () => {
  const result = sizeCircuitDraft(draft({ continuous: true }), "single-120-208");
  assert.equal(result.sizing.requiredAmpacity, 25);
  assert.equal(result.sizing.wireSize, "10 AWG");
});

test("update preserves id, recalculates sizing, and does not mutate original", () => {
  const original = draftToCircuit(draft(), { panelSystem: "single-120-208", idFactory: () => "same-id" });
  const updated = updateCircuit(original, draft({ amps: 30 }), { panelSystem: "single-120-208" });
  assert.equal(updated.id, "same-id");
  assert.equal(updated.wireSize, "10 AWG");
  assert.equal(original.amps, 20);
  assert.equal(original.wireSize, "12 AWG");
});

test("duplicate gets a new id and leaves original unchanged", () => {
  const original = draftToCircuit(draft(), { panelSystem: "single-120-208", idFactory: () => "old" });
  const copy = duplicateCircuit(original, { circuits: [original], idFactory: () => "copy" });
  assert.equal(copy.id, "copy");
  assert.equal(copy.name, "Lighting Copy");
  assert.equal(original.id, "old");
});
