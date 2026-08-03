import {
  AMBIENT_CORRECTION_30C,
  SMALL_CONDUCTOR_OCPD_LIMITS,
  STANDARD_OCPD_RATINGS,
  WIRE_TABLE
} from "../data/nec.js";

export function requirePositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${label} должно быть положительным числом`);
  }
  return number;
}

export function findWire(size) {
  const wire = WIRE_TABLE.find((entry) => entry.size === size);
  if (!wire) throw new RangeError(`Неизвестный размер проводника: ${size}`);
  return wire;
}

export function ambientCorrectionFactor(ambientC, insulationTemp) {
  const ambient = Number(ambientC);
  const temperature = Number(insulationTemp);
  if (!Number.isFinite(ambient) || ambient < -50 || ambient > 85) {
    throw new RangeError("Температура окружающей среды должна быть от −50°C до 85°C");
  }
  if (![60, 75, 90].includes(temperature)) throw new RangeError("Допустимы проводники 60°C, 75°C или 90°C");
  const row = AMBIENT_CORRECTION_30C.find((entry) => ambient <= entry.maxC);
  const factor = row?.factors[temperature];
  if (!factor) throw new RangeError(`Изоляция ${temperature}°C не допускается при ${ambient}°C`);
  return factor;
}

export function nextStandardOcpd(requiredAmps) {
  const amps = requirePositiveNumber(requiredAmps, "Расчётный ток OCPD");
  return STANDARD_OCPD_RATINGS.find((rating) => rating >= amps) ?? null;
}

export function evaluateWire({
  wireSize,
  material = "copper",
  insulationTemp = 90,
  terminalTemp = 60,
  ambientC = 30,
  adjustmentFactor = 1,
  loadAmps,
  plannedOcpd = null,
  continuous = false,
  hundredPercentRated = false
}) {
  const wire = findWire(wireSize);
  if (!["copper", "aluminum"].includes(material)) throw new RangeError("Материал должен быть copper или aluminum");
  const ampacity = wire.ampacity[material];
  if (!ampacity) throw new RangeError(`${wireSize} недоступен для ${material === "aluminum" ? "алюминия" : "меди"}`);
  if (![60, 75].includes(Number(terminalTemp))) throw new RangeError("Температура клемм должна быть 60°C или 75°C");
  if (Number(terminalTemp) > Number(insulationTemp)) throw new RangeError("Температура клемм выше рейтинга изоляции");
  const adjustment = Number(adjustmentFactor);
  if (!Number.isFinite(adjustment) || adjustment <= 0 || adjustment > 1) throw new RangeError("Некорректный adjustment factor");

  const actualLoad = requirePositiveNumber(loadAmps, "Ток нагрузки");
  const requiredAmpacity = actualLoad * (continuous && !hundredPercentRated ? 1.25 : 1);
  const temperatureFactor = ambientCorrectionFactor(ambientC, insulationTemp);
  const correctedAmpacity = ampacity[insulationTemp] * temperatureFactor * adjustment;
  const terminalAmpacity = ampacity[terminalTemp];
  const allowableAmpacity = Math.min(correctedAmpacity, terminalAmpacity);
  const smallConductorLimit = SMALL_CONDUCTOR_OCPD_LIMITS[material]?.[wireSize] ?? Infinity;
  const maximumOcpd = Math.min(allowableAmpacity, smallConductorLimit);
  const requiredOcpd = nextStandardOcpd(requiredAmpacity);
  const selectedOcpd = plannedOcpd === null || plannedOcpd === undefined || plannedOcpd === ""
    ? requiredOcpd
    : requirePositiveNumber(plannedOcpd, "Запланированный автомат");
  const loadPasses = requiredAmpacity <= allowableAmpacity;
  const ocpdPasses = selectedOcpd !== null && selectedOcpd <= maximumOcpd;
  let reason = { code: "pass", message: "Проводник проходит нагрузку и выбранный автомат" };
  if (!loadPasses) {
    reason = correctedAmpacity > terminalAmpacity
      ? { code: "terminal_limit", message: `ограничение клемм ${terminalAmpacity} A ниже требуемых ${requiredAmpacity.toFixed(1)} A` }
      : { code: continuous ? "continuous_load" : "insufficient_ampacity", message: `допустимый ток ${allowableAmpacity.toFixed(1)} A ниже требуемых ${requiredAmpacity.toFixed(1)} A` };
  } else if (!ocpdPasses) {
    reason = correctedAmpacity > terminalAmpacity
      ? { code: "terminal_limit", message: `автомат ${selectedOcpd} A превышает ограничение клемм ${terminalAmpacity} A` }
      : { code: "planned_ocpd", message: `автомат ${selectedOcpd} A превышает допустимые ${maximumOcpd.toFixed(1)} A` };
  }

  return {
    wireSize,
    material,
    tableAmpacity: ampacity[insulationTemp],
    terminalAmpacity,
    temperatureFactor,
    adjustmentFactor: adjustment,
    correctedAmpacity,
    allowableAmpacity,
    requiredAmpacity,
    requiredOcpd,
    plannedOcpd: selectedOcpd,
    maximumOcpd,
    loadPasses,
    ocpdPasses,
    reason,
    passes: loadPasses && ocpdPasses
  };
}

export function recommendNextWireSize(options) {
  const currentIndex = WIRE_TABLE.findIndex((wire) => wire.size === options.wireSize);
  if (currentIndex < 0) findWire(options.wireSize);
  for (const wire of WIRE_TABLE.slice(currentIndex + 1)) {
    try {
      const result = evaluateWire({ ...options, wireSize: wire.size });
      if (result.passes) return result;
    } catch (error) {
      if (!/недоступен/.test(error.message)) throw error;
    }
  }
  return null;
}

export const AMBIENT_PRESETS = Object.freeze({ indoor: 30, rooftop: 55 });

export function ambientTemperatureForMode(mode, value) {
  if (mode === "indoor") return AMBIENT_PRESETS.indoor;
  if (mode === "rooftop") {
    const temperature = Number(value ?? AMBIENT_PRESETS.rooftop);
    if (![40, 45, 50, 55, 60].includes(temperature)) throw new RangeError("Выберите температуру жаркой зоны");
    return temperature;
  }
  if (mode === "custom") {
    const temperature = Number(value);
    if (!Number.isFinite(temperature) || temperature < -50 || temperature > 85) throw new RangeError("Температура должна быть от −50°C до 85°C");
    return temperature;
  }
  throw new RangeError("Неизвестные условия прокладки");
}

export function selectWireSize(optionsOrAmps, legacyTemperature = 75) {
  if (typeof optionsOrAmps === "number") {
    const amps = requirePositiveNumber(optionsOrAmps, "Ток");
    return WIRE_TABLE.find((wire) => wire.ampacity.copper?.[legacyTemperature] >= amps)?.size ?? null;
  }

  for (const wire of WIRE_TABLE) {
    try {
      const result = evaluateWire({ ...optionsOrAmps, wireSize: wire.size });
      if (result.passes) return result;
    } catch (error) {
      if (!/недоступен/.test(error.message)) throw error;
    }
  }
  return null;
}
