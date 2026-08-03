import { SUPPLY_SYSTEMS } from "../data/nec.js";
import { evaluateWire, selectWireSize } from "./conductors.js";

const MATERIALS = new Set(["copper", "aluminum"]);
const INSULATION_TEMPERATURES = new Set([60, 75, 90]);
const TERMINAL_TEMPERATURES = new Set([60, 75]);

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} должен быть положительным числом`);
  return number;
}

export function normalizeCircuitDraft(raw = {}) {
  const phase = Number(raw.phase ?? 1);
  const lengthValue = raw.length === "" || raw.length === null || raw.length === undefined ? null : Number(raw.length);
  return {
    name: String(raw.name ?? "").trim(),
    amps: Number(raw.amps),
    phase,
    neutral: phase === 1 || Boolean(raw.neutralCurrentCarrying),
    neutralCurrentCarrying: phase === 1 || Boolean(raw.neutralCurrentCarrying),
    material: raw.material === "aluminum" ? "aluminum" : "copper",
    insulationTemp: Number(raw.insulationTemp ?? 90),
    terminalTemp: Number(raw.terminalTemp ?? 60),
    ambientC: Number(raw.ambientC ?? 30),
    continuous: Boolean(raw.continuous),
    hundredPercentRated: false,
    circuitType: raw.circuitType === "feeder" ? "feeder" : "branch",
    length: lengthValue,
    lengthUnit: raw.lengthUnit === "m" ? "m" : "ft"
  };
}

export function validateCircuitDraft(raw, panelSystem) {
  const draft = normalizeCircuitDraft(raw);
  if (!draft.name || draft.name.length > 80) throw new RangeError("Название цепи обязательно и не длиннее 80 символов");
  draft.amps = positive(draft.amps, "Ток нагрузки");
  if (![1, 2, 3].includes(draft.phase)) throw new RangeError("Допустимы 1, 2 или 3 полюса");
  const system = SUPPLY_SYSTEMS[panelSystem];
  if (!system) throw new RangeError("Неизвестная конфигурация панели");
  if (system.phases === 1 && draft.phase === 3) throw new RangeError("Трёхполюсная цепь требует трёхфазную панель");
  if (!MATERIALS.has(draft.material)) throw new RangeError("Материал должен быть copper или aluminum");
  if (!INSULATION_TEMPERATURES.has(draft.insulationTemp)) throw new RangeError("Неподдерживаемая температура изоляции");
  if (!TERMINAL_TEMPERATURES.has(draft.terminalTemp)) throw new RangeError("Неподдерживаемая температура клемм");
  if (draft.terminalTemp > draft.insulationTemp) throw new RangeError("Температура клемм выше рейтинга изоляции");
  if (!Number.isFinite(draft.ambientC) || draft.ambientC < -50 || draft.ambientC > 85) throw new RangeError("Температура среды должна быть от −50°C до 85°C");
  if (draft.length !== null && (!Number.isFinite(draft.length) || draft.length < 0)) throw new RangeError("Длина не может быть отрицательной");
  return draft;
}

export function automaticCircuitName(circuits = []) {
  const names = new Set(circuits.map((circuit) => circuit.name));
  let index = 1;
  while (names.has(`Цепь ${index}`)) index += 1;
  return `Цепь ${index}`;
}

export function sizeCircuitDraft(raw, panelSystem, adjustmentFactor = 1) {
  const draft = validateCircuitDraft(raw, panelSystem);
  const sizing = selectWireSize({
    ...draft,
    loadAmps: draft.amps,
    plannedOcpd: draft.amps,
    adjustmentFactor
  });
  if (!sizing) throw new RangeError("Для заданных условий требуется проводник больше 1000 kcmil");
  return { draft, sizing };
}

export function draftToCircuit(raw, { panelSystem, circuits = [], idFactory = () => globalThis.crypto?.randomUUID?.() ?? `circuit-${Date.now()}`, wireSize = null } = {}) {
  const withName = { ...raw, name: String(raw?.name ?? "").trim() || automaticCircuitName(circuits) };
  const { draft, sizing } = sizeCircuitDraft(withName, panelSystem);
  const chosen = wireSize
    ? evaluateWire({ ...draft, wireSize, loadAmps: draft.amps, plannedOcpd: draft.amps, adjustmentFactor: 1 })
    : sizing;
  if (!chosen.passes) throw new RangeError(`${wireSize} не проходит расчётную ampacity`);
  return { id: String(idFactory()), ...draft, wireSize: chosen.wireSize };
}

export function updateCircuit(existing, raw, options = {}) {
  if (!existing?.id) throw new TypeError("Существующая цепь должна иметь id");
  return draftToCircuit(raw, { ...options, idFactory: () => existing.id });
}

export function duplicateCircuit(existing, { circuits = [], idFactory = () => globalThis.crypto?.randomUUID?.() ?? `circuit-${Date.now()}` } = {}) {
  if (!existing?.id) throw new TypeError("Существующая цепь должна иметь id");
  const base = `${existing.name} — копия`;
  const names = new Set(circuits.map((circuit) => circuit.name));
  let name = base;
  let index = 2;
  while (names.has(name)) name = `${base} ${index++}`;
  return { ...existing, id: String(idFactory()), name };
}
