import { RACEWAY_TOTAL_AREA } from "../data/nec.js";
import { evaluateWire, findWire, selectWireSize } from "./conductors.js";

export function adjustmentFactor(conductorCount) {
  if (!Number.isInteger(conductorCount) || conductorCount < 0) {
    throw new RangeError("Количество проводников должно быть целым неотрицательным числом");
  }
  if (conductorCount <= 3) return 1;
  if (conductorCount <= 6) return 0.8;
  if (conductorCount <= 9) return 0.7;
  if (conductorCount <= 20) return 0.5;
  if (conductorCount <= 30) return 0.45;
  if (conductorCount <= 40) return 0.4;
  return 0.35;
}

export function currentCarryingCountForCircuit(circuit) {
  if (circuit.cccQuantity !== undefined || circuit.currentCarryingNeutralQuantity !== undefined) {
    const phaseConductors = Number(circuit.cccQuantity ?? 0);
    const neutralConductors = Number(circuit.currentCarryingNeutralQuantity ?? 0);
    if (![phaseConductors, neutralConductors].every(Number.isInteger) || phaseConductors < 0 || neutralConductors < 0) {
      throw new RangeError("Количество токонесущих проводников должно быть целым неотрицательным числом");
    }
    return phaseConductors + neutralConductors;
  }
  const poles = Number(circuit.phase);
  if (![1, 2, 3].includes(poles)) throw new RangeError("Цепь должна иметь 1, 2 или 3 полюса");
  return poles + (circuit.neutral && circuit.neutralCurrentCarrying ? 1 : 0);
}

export function installedConductorCountForCircuit(circuit) {
  if (circuit.conductorQuantity !== undefined || circuit.neutralQuantity !== undefined) {
    const phaseConductors = Number(circuit.conductorQuantity ?? 0);
    const neutralConductors = Number(circuit.neutralQuantity ?? 0);
    if (![phaseConductors, neutralConductors].every(Number.isInteger) || phaseConductors < 0 || neutralConductors < 0) {
      throw new RangeError("Физическое количество проводников должно быть целым неотрицательным числом");
    }
    if (Number(circuit.cccQuantity ?? 0) > phaseConductors) throw new RangeError("CCC quantity превышает physical conductor quantity");
    if (Number(circuit.currentCarryingNeutralQuantity ?? 0) > neutralConductors) throw new RangeError("Токонесущих нейтралей больше физического количества нейтралей");
    return phaseConductors + neutralConductors;
  }
  return Number(circuit.phase) + (circuit.neutral ? 1 : 0);
}

export function racewayFillLimit(conductorCount, nipple = false) {
  if (nipple) return 0.6;
  if (conductorCount === 1) return 0.53;
  if (conductorCount === 2) return 0.31;
  return 0.4;
}

export function calculateDerating({
  circuits,
  conduitType,
  conduitSize,
  groundWireSize = null,
  groundCount = 0,
  nipple = false
}) {
  if (!Array.isArray(circuits) || circuits.length === 0) {
    throw new RangeError("Выберите хотя бы одну цепь");
  }
  const totalRacewayArea = RACEWAY_TOTAL_AREA[conduitType]?.[conduitSize];
  if (!totalRacewayArea) throw new RangeError(`Для ${conduitType} ${conduitSize} нет данных Chapter 9 Table 4`);

  let currentCarryingCount = 0;
  let installedConductorCount = 0;
  let occupiedArea = 0;
  for (const circuit of circuits) {
    const installed = installedConductorCountForCircuit(circuit);
    currentCarryingCount += currentCarryingCountForCircuit(circuit);
    installedConductorCount += installed;
    occupiedArea += findWire(circuit.wireSize).areaTHHN * installed;
  }

  const grounds = Number(groundCount);
  if (!Number.isInteger(grounds) || grounds < 0) throw new RangeError("Количество EGC должно быть целым неотрицательным числом");
  if (grounds > 0) {
    if (!groundWireSize) throw new RangeError("Укажите размер equipment grounding conductor");
    installedConductorCount += grounds;
    occupiedArea += findWire(groundWireSize).areaTHHN * grounds;
  }

  const factor = adjustmentFactor(currentCarryingCount);
  const fillLimit = racewayFillLimit(installedConductorCount, nipple);
  const maximumFillArea = totalRacewayArea * fillLimit;
  const circuitResults = circuits.map((circuit) => {
    const original = evaluateWire({
      ...circuit,
      loadAmps: circuit.amps,
      adjustmentFactor: factor
    });
    const selected = selectWireSize({
      ...circuit,
      loadAmps: circuit.amps,
      adjustmentFactor: factor
    });
    return {
      id: circuit.id,
      name: circuit.name,
      originalSize: circuit.wireSize,
      requiredSize: selected?.wireSize ?? null,
      originalPasses: original.passes,
      allowableAmpacity: original.allowableAmpacity,
      tableAmpacity: original.tableAmpacity,
      terminalAmpacity: original.terminalAmpacity,
      temperatureFactor: original.temperatureFactor,
      requiredAmpacity: original.requiredAmpacity
    };
  });

  return {
    currentCarryingCount,
    installedConductorCount,
    adjustmentFactor: factor,
    fillLimit,
    occupiedArea,
    totalRacewayArea,
    maximumFillArea,
    actualFillPercent: occupiedArea / totalRacewayArea * 100,
    fillPercentOfAllowed: occupiedArea / maximumFillArea * 100,
    overfilled: occupiedArea > maximumFillArea,
    circuits: circuitResults,
    references: ["310.15(C)(1)", "310.15(E)", "Chapter 9 Table 1", "Chapter 9 Tables 4 and 5"]
  };
}
