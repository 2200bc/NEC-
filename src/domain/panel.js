import { requirePositiveNumber } from "./conductors.js";

function phaseSequence(panelType) {
  return panelType === 3 ? ["A", "B", "C"] : ["A", "B"];
}

function phaseForSlot(slotIndex, panelType) {
  const phases = phaseSequence(panelType);
  return phases[Math.floor(slotIndex / 2) % phases.length];
}

function candidateGroups(slotCount, poles) {
  const groups = [];
  for (const side of [0, 1]) {
    for (let start = side; start + (poles - 1) * 2 < slotCount; start += 2) {
      groups.push(Array.from({ length: poles }, (_, index) => start + index * 2));
    }
  }
  return groups;
}

export function layoutPanel({ circuits, panelType, slotCount }) {
  const type = Number(panelType);
  const slots = Number(slotCount);
  if (![1, 3].includes(type)) throw new RangeError("Тип панели должен быть 1 или 3");
  if (!Number.isInteger(slots) || slots < 6 || slots % 2 !== 0) {
    throw new RangeError("Количество слотов должно быть чётным и не меньше 6");
  }

  const slotMap = Array(slots).fill(null);
  const phases = phaseSequence(type);
  const loads = Object.fromEntries(phases.map((phase) => [phase, 0]));
  const unplaced = [];
  const sorted = [...circuits].sort((a, b) => Number(b.phase) - Number(a.phase) || b.amps - a.amps);

  for (const circuit of sorted) {
    const poles = Number(circuit.phase);
    const amps = requirePositiveNumber(circuit.amps, "Ток цепи");
    if (![1, 2, 3].includes(poles) || (poles === 3 && type !== 3)) {
      unplaced.push({ circuit, reason: poles === 3 ? "Трёхполюсная цепь требует 3-фазную панель" : "Некорректное число полюсов" });
      continue;
    }

    const availableGroups = candidateGroups(slots, poles)
      .filter((candidate) => candidate.every((slot) => !slotMap[slot]));
    const group = availableGroups
      .map((candidate) => {
        const projected = { ...loads };
        candidate.forEach((slot) => {
          projected[phaseForSlot(slot, type)] += amps;
        });
        const projectedValues = Object.values(projected);
        return {
          candidate,
          score: Math.max(...projectedValues) - Math.min(...projectedValues)
        };
      })
      .sort((a, b) => a.score - b.score || a.candidate[0] - b.candidate[0])[0]?.candidate;
    if (!group) {
      unplaced.push({ circuit, reason: "Недостаточно свободных последовательных слотов" });
      continue;
    }

    group.forEach((slot, index) => {
      const phase = phaseForSlot(slot, type);
      slotMap[slot] = { circuitId: circuit.id, name: circuit.name, amps, phase, poleIndex: index + 1, poles };
      loads[phase] += amps;
    });
  }

  const loadValues = Object.values(loads);
  const maximumLoad = Math.max(...loadValues);
  const minimumLoad = Math.min(...loadValues);
  const imbalancePercent = maximumLoad === 0 ? 0 : (maximumLoad - minimumLoad) / maximumLoad * 100;

  return { slots: slotMap, loads, unplaced, imbalancePercent };
}
