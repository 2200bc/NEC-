import { SUPPLY_SYSTEMS, WIRE_TABLE } from "../data/nec.js";
import { evaluateWire, findWire, requirePositiveNumber } from "./conductors.js";

export function systemVoltage(supplySystem, phase) {
  const system = SUPPLY_SYSTEMS[supplySystem];
  if (!system) throw new RangeError("Неизвестная система питания");
  const poles = Number(phase);
  if (poles === 1) return system.lineNeutral;
  return system.lineLine;
}

export function calculateVoltageDrop({
  supplySystem = "single-120-240",
  phase,
  length,
  lengthUnit,
  material,
  wireSize,
  amps,
  thresholdPercent = 3,
  upstreamDropPercent = 0,
  circuitType = "branch",
  ampacityOptions = null
}) {
  const inputLength = requirePositiveNumber(length, "Длина");
  const current = requirePositiveNumber(amps, "Ток");
  const lengthFeet = lengthUnit === "m" ? inputLength * 3.28084 : inputLength;
  const wire = findWire(wireSize);
  if (!wire.ampacity[material]) throw new RangeError(`${wireSize} недоступен для выбранного материала`);
  const voltage = systemVoltage(supplySystem, phase);
  const multiplier = Number(phase) === 3 ? Math.sqrt(3) : 2;
  const resistivity = material === "aluminum" ? 21.2 : 12.9;
  const dropVolts = multiplier * lengthFeet * resistivity * current / wire.cma;
  const dropPercent = dropVolts / voltage * 100;
  const upstream = Number(upstreamDropPercent);
  if (!Number.isFinite(upstream) || upstream < 0 || upstream > 100) {
    throw new RangeError("Предшествующее падение должно быть от 0 до 100%");
  }
  const totalDropPercent = dropPercent + upstream;

  const recommended = WIRE_TABLE.find((candidate) => {
    if (!candidate.ampacity[material]) return false;
    if (ampacityOptions) {
      try {
        const evaluation = evaluateWire({ ...ampacityOptions, material, wireSize: candidate.size, loadAmps: current });
        if (!evaluation.passes) return false;
      } catch {
        return false;
      }
    }
    const candidateDrop = multiplier * lengthFeet * resistivity * current / candidate.cma;
    return candidateDrop / voltage * 100 <= thresholdPercent;
  });

  return {
    circuitType,
    voltage,
    multiplier,
    lengthFeet,
    dropVolts,
    dropPercent,
    upstreamDropPercent: upstream,
    totalDropPercent,
    exceedsBranchRecommendation: dropPercent > thresholdPercent,
    exceedsCombinedRecommendation: totalDropPercent > 5,
    thresholdPercent,
    recommendedSize: recommended?.size ?? null,
    references: circuitType === "feeder"
      ? ["215.2(A)(2) Informational Note No. 2"]
      : ["210.19(A) Informational Note", "215.2(A)(2) Informational Note No. 2"]
  };
}
