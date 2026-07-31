import { SUPPLY_SYSTEMS, WIRE_TABLE } from "../data/nec.js";

const STORAGE_KEY = "calcuvolt-project-v4";
const PREVIOUS_KEYS = ["calcuvolt-project-v3", "calcuvolt-project-v2"];
const LEGACY_KEY = "lines";
export const PROJECT_VERSION = 4;
const WIRE_SIZES = new Set(WIRE_TABLE.map((wire) => wire.size));
const WIRE_ALIASES = Object.freeze({
  "1/0": "1/0 AWG",
  "2/0": "2/0 AWG",
  "3/0": "3/0 AWG",
  "4/0": "4/0 AWG",
  "250 MCM": "250 kcmil",
  "300 MCM": "300 kcmil",
  "350 MCM": "350 kcmil",
  "400 MCM": "400 kcmil",
  "500 MCM": "500 kcmil",
  "600 MCM": "600 kcmil",
  "700 MCM": "700 kcmil",
  "750 MCM": "750 kcmil",
  "800 MCM": "800 kcmil",
  "900 MCM": "900 kcmil",
  "1000 MCM": "1000 kcmil"
});

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeWireSize(value) {
  const raw = String(value ?? "").trim();
  return WIRE_ALIASES[raw] ?? raw;
}

function normalizeCircuit(raw, index, defaults) {
  if (!raw || typeof raw !== "object") throw new TypeError(`Цепь ${index + 1} имеет неверный формат`);
  const name = String(raw.name ?? "").trim();
  const amps = finitePositive(raw.amps);
  const phase = Number(raw.phase);
  const wireSize = normalizeWireSize(raw.wireSize);
  const length = raw.length === undefined || raw.length === null || raw.length === "" ? null : finitePositive(raw.length);
  const material = raw.material === "aluminum" ? "aluminum" : "copper";
  const insulationTemp = [60, 75, 90].includes(Number(raw.insulationTemp)) ? Number(raw.insulationTemp) : 90;
  const terminalTemp = [60, 75].includes(Number(raw.terminalTemp)) ? Number(raw.terminalTemp) : 60;
  const ambientC = raw.ambientC === undefined ? 30 : Number(raw.ambientC);

  if (!name || name.length > 80) throw new RangeError(`Цепь ${index + 1}: название обязательно и не длиннее 80 символов`);
  if (!amps) throw new RangeError(`Цепь ${index + 1}: ток должен быть положительным числом`);
  if (![1, 2, 3].includes(phase)) throw new RangeError(`Цепь ${index + 1}: допустимы 1, 2 или 3 полюса`);
  if (!WIRE_SIZES.has(wireSize)) throw new RangeError(`Цепь ${index + 1}: неизвестный размер проводника`);
  if (!Number.isFinite(ambientC) || ambientC < -50 || ambientC > 85) {
    throw new RangeError(`Цепь ${index + 1}: ambient temperature должна быть от −50°C до 85°C`);
  }
  if (terminalTemp > insulationTemp) throw new RangeError(`Цепь ${index + 1}: рейтинг клемм выше рейтинга изоляции`);
  if (raw.length !== undefined && raw.length !== null && raw.length !== "" && !length) {
    throw new RangeError(`Цепь ${index + 1}: длина должна быть положительным числом`);
  }

  const neutralCurrentCarrying = phase === 1
    ? true
    : Boolean(raw.neutralCurrentCarrying);
  return {
    id: String(raw.id || globalThis.crypto?.randomUUID?.() || `circuit-${Date.now()}-${index}`),
    name,
    amps,
    phase,
    neutral: neutralCurrentCarrying,
    neutralCurrentCarrying,
    wireSize,
    material,
    insulationTemp,
    terminalTemp,
    ambientC,
    continuous: Boolean(raw.continuous),
    hundredPercentRated: Boolean(raw.hundredPercentRated),
    circuitType: raw.circuitType === "feeder" ? "feeder" : "branch",
    length,
    lengthUnit: raw.lengthUnit === "m" || raw.system === "eu" ? "m" : defaults.unitSystem
  };
}

export function emptyProject() {
  return {
    version: PROJECT_VERSION,
    panelType: 1,
    unitSystem: "ft",
    circuits: []
  };
}

export function validateProject(raw) {
  if (Array.isArray(raw)) {
    raw = { circuits: raw, panelType: 1, unitSystem: "ft" };
  }
  if (!raw || typeof raw !== "object") throw new TypeError("Проект должен быть объектом или legacy-массивом");
  if (!Array.isArray(raw.circuits)) throw new TypeError("Поле circuits должно быть массивом");

  const panelType = [1, 3].includes(Number(raw.panelType))
    ? Number(raw.panelType)
    : (SUPPLY_SYSTEMS[raw.supplySystem]?.phases ?? 1);
  const unitSystem = raw.unitSystem === "m" || raw.system === "eu" ? "m" : "ft";
  const circuits = raw.circuits.map((circuit, index) =>
    normalizeCircuit(circuit, index, { unitSystem })
  );
  if (new Set(circuits.map((circuit) => circuit.id)).size !== circuits.length) {
    throw new RangeError("Идентификаторы цепей должны быть уникальными");
  }
  return { version: PROJECT_VERSION, panelType, unitSystem, circuits };
}

export function loadProject(storage = globalThis.localStorage) {
  if (!storage) return emptyProject();
  for (const key of [STORAGE_KEY, ...PREVIOUS_KEYS, LEGACY_KEY]) {
    const serialized = storage.getItem(key);
    if (!serialized) continue;
    try {
      return validateProject(JSON.parse(serialized));
    } catch {
      continue;
    }
  }
  return emptyProject();
}

export function saveProject(project, storage = globalThis.localStorage) {
  const validated = validateProject(project);
  storage?.setItem(STORAGE_KEY, JSON.stringify(validated));
  return validated;
}

export function clearProject(storage = globalThis.localStorage) {
  storage?.removeItem(STORAGE_KEY);
  PREVIOUS_KEYS.forEach((key) => storage?.removeItem(key));
  storage?.removeItem(LEGACY_KEY);
}
