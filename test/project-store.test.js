import test from "node:test";
import assert from "node:assert/strict";
import { emptyProject, loadProject, validateProject } from "../src/storage/project-store.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  };
}

test("corrupt storage does not prevent application startup", () => {
  assert.deepEqual(loadProject(memoryStorage({ "calcuvolt-project-v3": "{" })), emptyProject());
});

test("legacy array migrates to NEC 2023 model and kcmil terminology", () => {
  const project = validateProject([
    { name: "Legacy", amps: 200, phase: "1", neutral: true, wireSize: "3/0", length: 50 }
  ]);
  assert.equal(project.version, 3);
  assert.equal(project.circuits[0].wireSize, "3/0 AWG");
  assert.equal(project.circuits[0].insulationTemp, 90);
  assert.equal(project.circuits[0].terminalTemp, 60);
  assert.equal(project.circuits[0].neutralCurrentCarrying, true);
});

test("legacy EU length remains metric but supply is migrated into scoped NEC systems", () => {
  const project = validateProject({
    system: "eu",
    circuits: [{ name: "Legacy EU", amps: 20, phase: 1, wireSize: "12 AWG", length: 20 }]
  });
  assert.equal(project.unitSystem, "m");
  assert.equal(project.supplySystem, "single-120-240");
  assert.equal(project.circuits[0].lengthUnit, "m");
});

test("invalid imported wire size is rejected", () => {
  assert.throws(
    () => validateProject({
      circuits: [{ id: "x", name: "Bad", amps: 20, phase: 1, wireSize: "<img>" }]
    }),
    /неизвестный размер/
  );
});

test("duplicate imported identifiers are rejected", () => {
  assert.throws(
    () => validateProject({
      circuits: [
        { id: "same", name: "One", amps: 20, phase: 1, wireSize: "12 AWG" },
        { id: "same", name: "Two", amps: 20, phase: 1, wireSize: "12 AWG" }
      ]
    }),
    /уникальными/
  );
});
