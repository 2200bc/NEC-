import { NEC_DATASET, RACEWAY_TOTAL_AREA, SUPPLY_SYSTEMS, WIRE_TABLE } from "./src/data/nec.js";
import { draftToCircuit, duplicateCircuit, sizeCircuitDraft, updateCircuit } from "./src/domain/circuit-model.js";
import { calculateDerating } from "./src/domain/derating.js";
import { layoutPanel } from "./src/domain/panel.js";
import { calculateVoltageDrop } from "./src/domain/voltage-drop.js";
import { clearProject, emptyProject, loadProject, saveProject, validateProject } from "./src/storage/project-store.js";

const ids = [
  "app-message", "compatibility-warning", "global-panel-type", "global-units", "line-count", "line-list",
  "sizing-form", "sizing-name", "sizing-amps", "sizing-length", "sizing-length-label", "sizing-material",
  "sizing-insulation", "sizing-terminal", "sizing-ambient", "sizing-circuit-type", "sizing-neutral",
  "sizing-continuous", "sizing-reset", "sizing-result", "sizing-result-actions", "sizing-save", "sizing-another",
  "voltage-form", "voltage-saved-field", "voltage-saved", "voltage-name", "voltage-amps", "voltage-length",
  "voltage-length-label", "voltage-material", "voltage-wire", "voltage-upstream", "voltage-circuit-type",
  "voltage-result", "voltage-actions", "voltage-save", "voltage-update", "voltage-save-new",
  "raceway-saved-list", "manual-name", "manual-wire", "manual-material", "manual-amps", "manual-insulation",
  "manual-terminal", "manual-ambient", "manual-physical", "manual-ccc", "manual-neutrals", "manual-neutral-ccc",
  "manual-continuous", "manual-add", "manual-list", "conduit-type", "conduit-size", "ground-wire", "ground-count",
  "conduit-nipple", "calculate-derating", "derating-result", "panel-slots", "render-panel", "print-panel",
  "panel-stale", "panel-result", "panel-visual", "export-data", "import-data", "import-file", "reset-data"
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

let project = loadProject();
let sizingCalculation = null;
let editingCircuitId = null;
let voltageCalculation = null;
let voltageCircuitId = null;
let manualRows = [];
let messageTimer;

const createId = () => globalThis.crypto?.randomUUID?.() ?? `circuit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const selectedRadio = (name) => Number(document.querySelector(`input[name="${name}"]:checked`).value);
const panelPhases = () => SUPPLY_SYSTEMS[project.panelSystem].phases;

function showMessage(message, isError = false) {
  clearTimeout(messageTimer);
  el["app-message"].textContent = message;
  el["app-message"].classList.toggle("is-error", isError);
  el["app-message"].hidden = false;
  messageTimer = setTimeout(() => { el["app-message"].hidden = true; }, 7000);
}

function showSection(name) {
  document.querySelectorAll(".section").forEach((section) => { section.hidden = section.id !== `section-${name}`; });
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.section === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function appendOption(select, value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  select.append(option);
}

function metric(label, value) {
  const item = document.createElement("div");
  item.className = "metric";
  const caption = document.createElement("span");
  caption.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  item.append(caption, strong);
  return item;
}

function resetResult(container) {
  container.replaceChildren();
  container.hidden = false;
  container.classList.remove("is-warning", "is-danger");
}

function resultTitle(container, text) {
  const heading = document.createElement("h3");
  heading.textContent = text;
  container.append(heading);
}

function addReferences(container, references = []) {
  const list = document.createElement("ul");
  list.className = "result-list";
  references.forEach((reference) => {
    const item = document.createElement("li");
    item.textContent = `NEC 2023: ${reference}`;
    list.append(item);
  });
  container.append(list);
}

function persist() { project = saveProject(project); }

function invalidateDerived() {
  el["voltage-result"].hidden = true;
  el["voltage-actions"].hidden = true;
  el["panel-result"].hidden = true;
  el["panel-visual"].replaceChildren();
  el["panel-stale"].hidden = false;
}

function updateCompatibility() {
  const incompatible = panelPhases() === 1 ? project.circuits.filter((circuit) => circuit.phase === 3) : [];
  el["compatibility-warning"].hidden = incompatible.length === 0;
  el["compatibility-warning"].textContent = incompatible.length
    ? `В проекте есть 3-pole цепи, несовместимые с однофазной панелью: ${incompatible.map((c) => c.name).join(", ")}`
    : "";
}

function updatePhaseAvailability() {
  for (const name of ["sizing-phase", "voltage-phase"]) {
    const threePole = document.querySelector(`input[name="${name}"][value="3"]`);
    threePole.disabled = panelPhases() === 1;
    if (threePole.disabled && threePole.checked) document.querySelector(`input[name="${name}"][value="1"]`).checked = true;
  }
  updateSizingNeutral();
  updateCompatibility();
}

function updateSizingNeutral() {
  const phase = selectedRadio("sizing-phase");
  if (phase === 1) el["sizing-neutral"].checked = true;
  el["sizing-neutral"].disabled = phase === 1;
}

function setUnitLabels() {
  el["sizing-length-label"].textContent = `Длина, ${project.unitSystem}`;
  el["voltage-length-label"].textContent = `Длина, ${project.unitSystem}`;
}

function circuitDraftFromSizingForm() {
  return {
    name: el["sizing-name"].value,
    amps: el["sizing-amps"].value,
    phase: selectedRadio("sizing-phase"),
    neutralCurrentCarrying: el["sizing-neutral"].checked,
    material: el["sizing-material"].value,
    insulationTemp: el["sizing-insulation"].value,
    terminalTemp: el["sizing-terminal"].value,
    ambientC: el["sizing-ambient"].value,
    continuous: el["sizing-continuous"].checked,
    circuitType: el["sizing-circuit-type"].value,
    length: el["sizing-length"].value,
    lengthUnit: project.unitSystem
  };
}

function fillSizingForm(circuit) {
  el["sizing-name"].value = circuit.name ?? "";
  el["sizing-amps"].value = circuit.amps ?? "";
  el["sizing-length"].value = circuit.length ?? "";
  el["sizing-material"].value = circuit.material ?? "copper";
  el["sizing-insulation"].value = String(circuit.insulationTemp ?? 90);
  el["sizing-terminal"].value = String(circuit.terminalTemp ?? 60);
  el["sizing-ambient"].value = circuit.ambientC ?? 30;
  el["sizing-continuous"].checked = Boolean(circuit.continuous);
  el["sizing-neutral"].checked = Boolean(circuit.neutralCurrentCarrying);
  el["sizing-circuit-type"].value = circuit.circuitType ?? "branch";
  const phase = document.querySelector(`input[name="sizing-phase"][value="${circuit.phase ?? 1}"]`);
  if (phase && !phase.disabled) phase.checked = true;
  updateSizingNeutral();
}

function renderSizingResult(result) {
  const { sizing } = result;
  const container = el["sizing-result"];
  resetResult(container);
  resultTitle(container, `Selected conductor: ${sizing.wireSize}`);
  const grid = document.createElement("div");
  grid.className = "result-grid";
  grid.append(
    metric("Load current", `${result.rawDraft.amps} A`),
    metric("Required ampacity", `${sizing.requiredAmpacity.toFixed(1)} A`),
    metric("Continuous adjustment", result.rawDraft.continuous ? "125%" : "100%"),
    metric("Base ampacity", `${sizing.tableAmpacity} A`),
    metric("Ambient factor", sizing.temperatureFactor.toFixed(2)),
    metric("CCC factor", sizing.adjustmentFactor.toFixed(2)),
    metric("Corrected ampacity", `${sizing.correctedAmpacity.toFixed(1)} A`),
    metric("Terminal limit", `${sizing.terminalAmpacity} A`),
    metric("Allowable ampacity", `${sizing.allowableAmpacity.toFixed(1)} A`),
    metric("Maximum permitted OCPD", `${sizing.maximumOcpd} A`)
  );
  container.append(grid);
  addReferences(container, ["Table 310.16", "310.15(B)(1)(1)", "110.14(C)", "240.4(D)"]);
  el["sizing-result-actions"].hidden = false;
  el["sizing-save"].textContent = editingCircuitId ? "Update circuit" : "Save as circuit";
}

function calculateSizing(event) {
  event.preventDefault();
  try {
    const rawDraft = circuitDraftFromSizingForm();
    const calculationDraft = { ...rawDraft, name: rawDraft.name.trim() || "Unsaved calculation" };
    const result = sizeCircuitDraft(calculationDraft, project.panelSystem);
    sizingCalculation = { ...result, rawDraft };
    renderSizingResult(sizingCalculation);
  } catch (error) { showMessage(error.message, true); }
}

function saveSizingCircuit() {
  if (!sizingCalculation) return showMessage("Сначала выполните расчёт", true);
  try {
    const raw = sizingCalculation.rawDraft;
    if (editingCircuitId) {
      const existing = project.circuits.find((circuit) => circuit.id === editingCircuitId);
      if (!existing) throw new RangeError("Редактируемая цепь больше не существует");
      const updated = updateCircuit(existing, raw, { panelSystem: project.panelSystem, circuits: project.circuits });
      project.circuits = project.circuits.map((circuit) => circuit.id === existing.id ? updated : circuit);
      editingCircuitId = null;
      showMessage(`Цепь «${updated.name}» обновлена`);
    } else {
      const circuit = draftToCircuit(raw, { panelSystem: project.panelSystem, circuits: project.circuits, idFactory: createId });
      project.circuits = [...project.circuits, circuit];
      showMessage(`Цепь «${circuit.name}» сохранена`);
    }
    persist();
    invalidateDerived();
    renderProject();
    sizingCalculation = null;
    el["sizing-result-actions"].hidden = true;
  } catch (error) { showMessage(error.message, true); }
}

function resetSizing(preservePreferences = false) {
  const preferences = preservePreferences ? {
    material: el["sizing-material"].value,
    insulation: el["sizing-insulation"].value,
    terminal: el["sizing-terminal"].value,
    ambient: el["sizing-ambient"].value,
    continuous: el["sizing-continuous"].checked,
    phase: selectedRadio("sizing-phase")
  } : null;
  el["sizing-form"].reset();
  el["sizing-ambient"].value = preferences?.ambient ?? 30;
  if (preferences) {
    el["sizing-material"].value = preferences.material;
    el["sizing-insulation"].value = preferences.insulation;
    el["sizing-terminal"].value = preferences.terminal;
    el["sizing-continuous"].checked = preferences.continuous;
    const phase = document.querySelector(`input[name="sizing-phase"][value="${preferences.phase}"]`);
    if (phase && !phase.disabled) phase.checked = true;
  }
  editingCircuitId = null;
  sizingCalculation = null;
  el["sizing-result"].hidden = true;
  el["sizing-result-actions"].hidden = true;
  updateSizingNeutral();
}

function voltageMode() { return document.querySelector('input[name="voltage-mode"]:checked').value; }

function voltageDraftFromForm() {
  const phase = selectedRadio("voltage-phase");
  const saved = voltageCircuitId ? project.circuits.find((circuit) => circuit.id === voltageCircuitId) : null;
  return {
    name: el["voltage-name"].value,
    amps: el["voltage-amps"].value,
    phase,
    neutralCurrentCarrying: phase === 1 || Boolean(saved?.neutralCurrentCarrying),
    material: el["voltage-material"].value,
    insulationTemp: saved?.insulationTemp ?? 90,
    terminalTemp: saved?.terminalTemp ?? 60,
    ambientC: saved?.ambientC ?? 30,
    continuous: Boolean(saved?.continuous),
    circuitType: el["voltage-circuit-type"].value,
    length: el["voltage-length"].value,
    lengthUnit: project.unitSystem
  };
}

function fillVoltageForm(circuit) {
  el["voltage-name"].value = circuit.name ?? "";
  el["voltage-amps"].value = circuit.amps ?? "";
  el["voltage-length"].value = circuit.length ?? "";
  el["voltage-material"].value = circuit.material ?? "copper";
  el["voltage-wire"].value = circuit.wireSize ?? "12 AWG";
  el["voltage-circuit-type"].value = circuit.circuitType ?? "branch";
  const phase = document.querySelector(`input[name="voltage-phase"][value="${circuit.phase ?? 1}"]`);
  if (phase && !phase.disabled) phase.checked = true;
}

function changeVoltageMode() {
  const savedMode = voltageMode() === "saved";
  el["voltage-saved-field"].hidden = !savedMode;
  voltageCircuitId = null;
  voltageCalculation = null;
  el["voltage-result"].hidden = true;
  el["voltage-actions"].hidden = true;
  if (!savedMode) {
    el["voltage-saved"].value = "";
    fillVoltageForm({ material: "copper", wireSize: "12 AWG", phase: 1, circuitType: "branch" });
  }
}

function selectVoltageCircuit() {
  voltageCircuitId = el["voltage-saved"].value || null;
  const circuit = project.circuits.find((item) => item.id === voltageCircuitId);
  if (circuit) fillVoltageForm(circuit);
  el["voltage-result"].hidden = true;
  el["voltage-actions"].hidden = true;
}

function calculateVoltage(event) {
  event.preventDefault();
  try {
    const draft = voltageDraftFromForm();
    if (panelPhases() === 1 && draft.phase === 3) throw new RangeError("Трёхполюсная цепь несовместима с однофазной панелью");
    const result = calculateVoltageDrop({
      supplySystem: project.panelSystem,
      phase: draft.phase,
      length: draft.length,
      lengthUnit: draft.lengthUnit,
      material: draft.material,
      wireSize: el["voltage-wire"].value,
      amps: draft.amps,
      upstreamDropPercent: el["voltage-upstream"].value,
      circuitType: draft.circuitType,
      ampacityOptions: draft
    });
    voltageCalculation = { draft, result, wireSize: el["voltage-wire"].value };
    const container = el["voltage-result"];
    resetResult(container);
    const warning = result.exceedsBranchRecommendation || result.exceedsCombinedRecommendation;
    container.classList.toggle("is-warning", warning);
    resultTitle(container, warning ? "Рекомендуемый предел превышен" : "Voltage drop в рекомендуемых пределах");
    const grid = document.createElement("div");
    grid.className = "result-grid";
    grid.append(
      metric("System voltage", `${result.voltage} V`),
      metric("Formula mode", result.multiplier === 2 ? "Single-phase · 2 × L" : "Three-phase · √3 × L"),
      metric("Conductor", `${voltageCalculation.wireSize} · ${draft.material === "aluminum" ? "Al" : "Cu"}`),
      metric("Local drop", `${result.dropVolts.toFixed(2)} V`),
      metric("Local drop", `${result.dropPercent.toFixed(2)}% · ${result.exceedsBranchRecommendation ? "FAIL 3%" : "PASS 3%"}`),
      metric("Upstream", `${result.upstreamDropPercent.toFixed(2)}%`),
      metric("Total drop", `${result.totalDropPercent.toFixed(2)}% · ${result.exceedsCombinedRecommendation ? "FAIL 5%" : "PASS 5%"}`),
      metric("Recommended size", result.recommendedSize ?? "Over 1000 kcmil")
    );
    container.append(grid);
    addReferences(container, result.references);
    el["voltage-actions"].hidden = false;
    const savedMode = voltageMode() === "saved" && voltageCircuitId;
    el["voltage-save"].hidden = Boolean(savedMode);
    el["voltage-update"].hidden = !savedMode;
    el["voltage-save-new"].hidden = !savedMode;
  } catch (error) { showMessage(error.message, true); }
}

function saveVoltage(asUpdate = false) {
  if (!voltageCalculation) return showMessage("Сначала выполните расчёт", true);
  try {
    const options = { panelSystem: project.panelSystem, circuits: project.circuits, wireSize: voltageCalculation.wireSize, idFactory: createId };
    if (asUpdate) {
      const existing = project.circuits.find((circuit) => circuit.id === voltageCircuitId);
      if (!existing) throw new RangeError("Сохранённая цепь не найдена");
      const updated = updateCircuit(existing, voltageCalculation.draft, options);
      project.circuits = project.circuits.map((circuit) => circuit.id === existing.id ? updated : circuit);
      showMessage(`Цепь «${updated.name}» обновлена`);
    } else {
      const circuit = draftToCircuit(voltageCalculation.draft, options);
      project.circuits = [...project.circuits, circuit];
      showMessage(`Цепь «${circuit.name}» сохранена`);
    }
    persist();
    invalidateDerived();
    renderProject();
  } catch (error) { showMessage(error.message, true); }
}

function manualRowFromForm() {
  const conductorQuantity = Number(el["manual-physical"].value);
  const cccQuantity = Number(el["manual-ccc"].value);
  const neutralQuantity = Number(el["manual-neutrals"].value);
  const currentCarryingNeutralQuantity = Number(el["manual-neutral-ccc"].value);
  if (!Number.isInteger(conductorQuantity) || conductorQuantity <= 0) throw new RangeError("Physical conductor quantity должен быть больше 0");
  if (![cccQuantity, neutralQuantity, currentCarryingNeutralQuantity].every(Number.isInteger) || Math.min(cccQuantity, neutralQuantity, currentCarryingNeutralQuantity) < 0) throw new RangeError("Количество проводников должно быть целым неотрицательным");
  if (cccQuantity > conductorQuantity) throw new RangeError("CCC quantity превышает physical conductor quantity");
  if (currentCarryingNeutralQuantity > neutralQuantity) throw new RangeError("CCC neutral quantity превышает physical neutral quantity");
  const amps = Number(el["manual-amps"].value);
  if (!Number.isFinite(amps) || amps <= 0) throw new RangeError("Load current должен быть положительным");
  return {
    id: createId(), name: el["manual-name"].value.trim() || `Manual ${manualRows.length + 1}`,
    wireSize: el["manual-wire"].value, material: el["manual-material"].value,
    insulationTemp: Number(el["manual-insulation"].value), terminalTemp: Number(el["manual-terminal"].value),
    ambientC: Number(el["manual-ambient"].value), amps, continuous: el["manual-continuous"].checked,
    hundredPercentRated: false, conductorQuantity, cccQuantity, neutralQuantity, currentCarryingNeutralQuantity
  };
}

function addManualRow() {
  try {
    manualRows = [...manualRows, manualRowFromForm()];
    el["manual-name"].value = "";
    el["manual-amps"].value = "";
    renderManualRows();
  } catch (error) { showMessage(error.message, true); }
}

function renderManualRows() {
  el["manual-list"].replaceChildren();
  if (!manualRows.length) {
    const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = "Ручных строк пока нет."; el["manual-list"].append(empty); return;
  }
  manualRows.forEach((row) => {
    const item = document.createElement("article"); item.className = "circuit-item";
    const text = document.createElement("div");
    const title = document.createElement("h4"); title.textContent = row.name;
    const meta = document.createElement("div"); meta.className = "circuit-meta";
    meta.textContent = `${row.wireSize} · ${row.amps} A · physical ${row.conductorQuantity + row.neutralQuantity} · CCC ${row.cccQuantity + row.currentCarryingNeutralQuantity}`;
    text.append(title, meta);
    const actions = document.createElement("div"); actions.className = "item-actions";
    [["Save as circuit", "save-manual"], ["Delete", "delete-manual"]].forEach(([label, action]) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.setAttribute(`data-${action}`, row.id); actions.append(button);
    });
    item.append(text, actions); el["manual-list"].append(item);
  });
}

function saveManualRow(id) {
  try {
    const row = manualRows.find((item) => item.id === id);
    if (!row) throw new RangeError("Ручная строка не найдена");
    if (![1, 2, 3].includes(row.conductorQuantity) || row.neutralQuantity > 1) throw new RangeError("Для сохранения как circuit нужны 1–3 фазных проводника и не более одной нейтрали");
    const draft = {
      name: row.name, amps: row.amps, phase: row.conductorQuantity,
      neutralCurrentCarrying: row.currentCarryingNeutralQuantity > 0, material: row.material,
      insulationTemp: row.insulationTemp, terminalTemp: row.terminalTemp, ambientC: row.ambientC,
      continuous: row.continuous, length: null, lengthUnit: project.unitSystem
    };
    const circuit = draftToCircuit(draft, { panelSystem: project.panelSystem, circuits: project.circuits, idFactory: createId, wireSize: row.wireSize });
    project.circuits = [...project.circuits, circuit]; persist(); invalidateDerived(); renderProject();
    showMessage(`Цепь «${circuit.name}» сохранена`);
  } catch (error) { showMessage(error.message, true); }
}

function calculateRaceway() {
  try {
    const selectedIds = new Set([...el["raceway-saved-list"].querySelectorAll('input[type="checkbox"]:checked')].map((box) => box.value));
    const circuits = [...project.circuits.filter((circuit) => selectedIds.has(circuit.id)), ...manualRows];
    const result = calculateDerating({
      circuits, conduitType: el["conduit-type"].value, conduitSize: el["conduit-size"].value,
      groundWireSize: el["ground-wire"].value, groundCount: Number(el["ground-count"].value), nipple: el["conduit-nipple"].checked
    });
    const container = el["derating-result"]; resetResult(container); container.classList.toggle("is-danger", result.overfilled);
    resultTitle(container, result.overfilled ? "Raceway fill: FAIL" : "Raceway fill: PASS");
    const grid = document.createElement("div"); grid.className = "result-grid";
    grid.append(
      metric("Physical conductor area", `${result.occupiedArea.toFixed(4)} in²`),
      metric("Allowable raceway area", `${result.maximumFillArea.toFixed(4)} in²`),
      metric("Actual fill", `${result.actualFillPercent.toFixed(1)}%`),
      metric("Permitted limit", `${(result.fillLimit * 100).toFixed(0)}%`),
      metric("Total physical", String(result.installedConductorCount)),
      metric("Total CCC", String(result.currentCarryingCount)),
      metric("Adjustment factor", result.adjustmentFactor.toFixed(2)),
      metric("EGC contribution", `${el["ground-count"].value} × ${el["ground-wire"].value}`)
    );
    container.append(grid);
    const list = document.createElement("ul"); list.className = "result-list";
    result.circuits.forEach((circuit) => {
      const li = document.createElement("li");
      li.textContent = `${circuit.name}: base ${circuit.tableAmpacity} A · ambient ${circuit.temperatureFactor.toFixed(2)} · corrected ${circuit.allowableAmpacity.toFixed(1)} A · required ${circuit.requiredAmpacity.toFixed(1)} A · terminal ${circuit.terminalAmpacity} A · ${circuit.originalPasses ? "PASS" : "FAIL"}`;
      list.append(li);
    });
    container.append(list); addReferences(container, result.references);
  } catch (error) { showMessage(error.message, true); }
}

function renderCircuitList() {
  el["line-count"].textContent = String(project.circuits.length);
  el["line-list"].replaceChildren();
  if (!project.circuits.length) {
    const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = "Сохранённых цепей пока нет. Выполните независимый расчёт и нажмите Save as circuit."; el["line-list"].append(empty); return;
  }
  project.circuits.forEach((circuit) => {
    const item = document.createElement("article"); item.className = "circuit-item";
    const details = document.createElement("div"); const title = document.createElement("h4"); title.textContent = circuit.name;
    const meta = document.createElement("div"); meta.className = "circuit-meta";
    meta.textContent = `${circuit.amps} A · ${circuit.phase}-pole${circuit.neutralCurrentCarrying ? " + CCC neutral" : ""} · ${circuit.wireSize} · ${circuit.material === "aluminum" ? "Al" : "Cu"}${circuit.length !== null ? ` · ${circuit.length} ${circuit.lengthUnit}` : ""}`;
    details.append(title, meta);
    const actions = document.createElement("div"); actions.className = "item-actions";
    [["Edit", "edit-circuit"], ["Duplicate", "duplicate-circuit"], ["Voltage drop", "voltage-circuit"], ["Delete", "delete-circuit"]].forEach(([label, action]) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.setAttribute(`data-${action}`, circuit.id); actions.append(button);
    });
    item.append(details, actions); el["line-list"].append(item);
  });
}

function renderCircuitSelectors() {
  const oldVoltage = el["voltage-saved"].value;
  el["voltage-saved"].replaceChildren(); appendOption(el["voltage-saved"], "", "Выберите цепь");
  project.circuits.forEach((circuit) => appendOption(el["voltage-saved"], circuit.id, `${circuit.name} · ${circuit.amps} A`, circuit.id === oldVoltage));
  el["raceway-saved-list"].replaceChildren();
  if (!project.circuits.length) { const p = document.createElement("p"); p.className = "circuit-meta"; p.textContent = "Нет сохранённых цепей — используйте manual conductors."; el["raceway-saved-list"].append(p); }
  project.circuits.forEach((circuit) => {
    const label = document.createElement("label"); const box = document.createElement("input"); box.type = "checkbox"; box.value = circuit.id;
    const text = document.createElement("span"); text.textContent = `${circuit.name} · ${circuit.wireSize} · ${circuit.phase}-pole`; label.append(box, text); el["raceway-saved-list"].append(label);
  });
}

function renderProject() { renderCircuitList(); renderCircuitSelectors(); updateCompatibility(); }

function editCircuit(id) {
  const circuit = project.circuits.find((item) => item.id === id); if (!circuit) return;
  editingCircuitId = id; sizingCalculation = null; fillSizingForm(circuit); el["sizing-result"].hidden = true; el["sizing-result-actions"].hidden = true; showSection("sizing");
  el["sizing-name"].focus();
}

function duplicateSavedCircuit(id) {
  const circuit = project.circuits.find((item) => item.id === id); if (!circuit) return;
  const copy = duplicateCircuit(circuit, { circuits: project.circuits, idFactory: createId }); project.circuits = [...project.circuits, copy]; persist(); invalidateDerived(); renderProject(); showMessage(`Создана копия «${copy.name}»`);
}

function deleteCircuit(id) {
  const circuit = project.circuits.find((item) => item.id === id); if (!circuit || !confirm(`Удалить цепь «${circuit.name}»?`)) return;
  project.circuits = project.circuits.filter((item) => item.id !== id); persist(); invalidateDerived(); renderProject(); showMessage(`Цепь «${circuit.name}» удалена`);
}

function openCircuitVoltage(id) {
  document.querySelector('input[name="voltage-mode"][value="saved"]').checked = true; changeVoltageMode(); el["voltage-saved"].value = id; selectVoltageCircuit(); showSection("voltage");
}

function panelCell(slot, entry) {
  const fragment = document.createDocumentFragment(); const number = document.createElement("td"); number.className = "panel-slot"; number.textContent = String(slot);
  const load = document.createElement("td"); const phase = document.createElement("td"); phase.className = "panel-phase";
  if (entry) { load.textContent = `${entry.name} · ${entry.amps} A${entry.poles > 1 ? ` · ${entry.poleIndex}/${entry.poles}` : ""}`; phase.textContent = entry.phase; }
  fragment.append(number, load, phase); return fragment;
}

function renderPanel() {
  try {
    const incompatible = panelPhases() === 1 ? project.circuits.filter((circuit) => circuit.phase === 3) : [];
    if (incompatible.length) throw new RangeError(`Сначала исправьте несовместимые 3-pole цепи: ${incompatible.map((c) => c.name).join(", ")}`);
    const result = layoutPanel({ circuits: project.circuits, panelType: panelPhases(), slotCount: Number(el["panel-slots"].value) });
    const summary = el["panel-result"]; resetResult(summary); summary.classList.toggle("is-warning", result.unplaced.length > 0 || result.imbalancePercent > 20);
    resultTitle(summary, result.unplaced.length ? "Панель построена не полностью" : "Панель построена");
    const grid = document.createElement("div"); grid.className = "result-grid"; Object.entries(result.loads).forEach(([phase, amps]) => grid.append(metric(`Фаза ${phase}`, `${amps} A`))); grid.append(metric("Перекос", `${result.imbalancePercent.toFixed(1)}%`)); summary.append(grid);
    if (result.unplaced.length) { const list = document.createElement("ul"); list.className = "result-list"; result.unplaced.forEach(({ circuit, reason }) => { const li = document.createElement("li"); li.textContent = `${circuit.name}: ${reason}`; list.append(li); }); summary.append(list); }
    const table = document.createElement("table"); table.className = "panel-table"; const caption = document.createElement("caption"); caption.textContent = `${SUPPLY_SYSTEMS[project.panelSystem].label} panel`;
    const head = document.createElement("thead"); const row = document.createElement("tr"); ["#", "Нагрузка", "Фаза", "#", "Нагрузка", "Фаза"].forEach((text) => { const th = document.createElement("th"); th.textContent = text; th.scope = "col"; row.append(th); }); head.append(row);
    const body = document.createElement("tbody"); for (let index = 0; index < result.slots.length; index += 2) { const tr = document.createElement("tr"); tr.append(panelCell(index + 1, result.slots[index]), panelCell(index + 2, result.slots[index + 1])); body.append(tr); }
    table.append(caption, head, body); el["panel-visual"].replaceChildren(table); el["panel-stale"].hidden = true;
  } catch (error) { showMessage(error.message, true); }
}

function changePanelSystem() {
  const next = el["global-panel-type"].value; if (!SUPPLY_SYSTEMS[next]) return;
  project.panelSystem = next; updatePhaseAvailability(); invalidateDerived();
  try { persist(); } catch (error) { showMessage(error.message, true); }
}

function exportProject() {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `calcuvolt-project-v${project.version}.json`; anchor.click(); URL.revokeObjectURL(url);
}

async function importProject(file) {
  if (!file) return; if (file.size > 1_000_000) return showMessage("Файл импорта превышает 1 MB", true);
  try { project = validateProject(JSON.parse(await file.text())); persist(); renderAll(); showMessage("Проект импортирован и проверен"); } catch (error) { showMessage(`Импорт отклонён: ${error.message}`, true); } finally { el["import-file"].value = ""; }
}

function resetProject() {
  if (!confirm("Удалить все сохранённые цепи и начать новый проект?")) return;
  clearProject(); project = emptyProject(); persist(); manualRows = []; resetSizing(); renderAll(); invalidateDerived(); showSection("sizing"); showMessage("Создан новый проект");
}

function renderConduitOptions() {
  el["conduit-type"].replaceChildren(); Object.keys(RACEWAY_TOTAL_AREA).forEach((type) => appendOption(el["conduit-type"], type, type)); renderConduitSizes();
}
function renderConduitSizes() {
  const type = el["conduit-type"].value; el["conduit-size"].replaceChildren(); Object.keys(RACEWAY_TOTAL_AREA[type] ?? {}).sort((a, b) => Number(a) - Number(b)).forEach((size) => appendOption(el["conduit-size"], size, `${size}″`));
}
function renderWireOptions() {
  for (const select of [el["voltage-wire"], el["manual-wire"], el["ground-wire"]]) { select.replaceChildren(); WIRE_TABLE.forEach((wire) => appendOption(select, wire.size, wire.size, wire.size === "12 AWG")); }
}

function renderAll() {
  el["global-panel-type"].value = project.panelSystem; el["global-units"].value = project.unitSystem; setUnitLabels(); updatePhaseAvailability(); renderProject(); renderManualRows();
}

function registerEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => showSection(button.dataset.section)));
  el["global-panel-type"].addEventListener("input", changePanelSystem); el["global-panel-type"].addEventListener("change", changePanelSystem);
  el["global-units"].addEventListener("change", () => { project.unitSystem = el["global-units"].value === "m" ? "m" : "ft"; persist(); setUnitLabels(); });
  document.querySelectorAll('input[name="sizing-phase"]').forEach((radio) => radio.addEventListener("change", updateSizingNeutral));
  el["sizing-form"].addEventListener("submit", calculateSizing); el["sizing-save"].addEventListener("click", saveSizingCircuit); el["sizing-reset"].addEventListener("click", () => resetSizing()); el["sizing-another"].addEventListener("click", () => resetSizing(true));
  document.querySelectorAll('input[name="voltage-mode"]').forEach((radio) => radio.addEventListener("change", changeVoltageMode));
  el["voltage-saved"].addEventListener("change", selectVoltageCircuit); el["voltage-form"].addEventListener("submit", calculateVoltage); el["voltage-save"].addEventListener("click", () => saveVoltage(false)); el["voltage-update"].addEventListener("click", () => saveVoltage(true)); el["voltage-save-new"].addEventListener("click", () => saveVoltage(false));
  el["manual-add"].addEventListener("click", addManualRow); el["manual-list"].addEventListener("click", (event) => { const save = event.target.closest("[data-save-manual]"); const remove = event.target.closest("[data-delete-manual]"); if (save) saveManualRow(save.dataset.saveManual); if (remove) { manualRows = manualRows.filter((row) => row.id !== remove.dataset.deleteManual); renderManualRows(); } });
  el["conduit-type"].addEventListener("change", renderConduitSizes); el["calculate-derating"].addEventListener("click", calculateRaceway);
  el["line-list"].addEventListener("click", (event) => { const target = event.target; const edit = target.closest("[data-edit-circuit]"); const copy = target.closest("[data-duplicate-circuit]"); const voltage = target.closest("[data-voltage-circuit]"); const remove = target.closest("[data-delete-circuit]"); if (edit) editCircuit(edit.dataset.editCircuit); if (copy) duplicateSavedCircuit(copy.dataset.duplicateCircuit); if (voltage) openCircuitVoltage(voltage.dataset.voltageCircuit); if (remove) deleteCircuit(remove.dataset.deleteCircuit); });
  el["render-panel"].addEventListener("click", renderPanel); el["print-panel"].addEventListener("click", () => el["panel-visual"].querySelector("table") ? window.print() : showMessage("Сначала постройте панель", true));
  el["export-data"].addEventListener("click", exportProject); el["import-data"].addEventListener("click", () => el["import-file"].click()); el["import-file"].addEventListener("change", () => importProject(el["import-file"].files[0])); el["reset-data"].addEventListener("click", resetProject);
}

function initialize() {
  renderWireOptions(); renderConduitOptions(); renderAll(); updateSizingNeutral(); registerEvents(); showSection("sizing");
  console.info(`CalcuVolt dataset: ${NEC_DATASET.id} (${NEC_DATASET.status})`);
  if ("serviceWorker" in navigator && location.protocol !== "file:") window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch((error) => console.warn("Service worker registration failed", error)));
}

initialize();
