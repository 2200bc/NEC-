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
    maximumOcpd,
    passes: requiredAmpacity <= allowableAmpacity && requiredOcpd !== null && requiredOcpd <= maximumOcpd
  };
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
