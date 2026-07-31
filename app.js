import { NEC_DATASET, RACEWAY_TOTAL_AREA, SUPPLY_SYSTEMS, WIRE_TABLE } from "./src/data/nec.js";
import { selectWireSize } from "./src/domain/conductors.js";
import { calculateDerating } from "./src/domain/derating.js";
import { layoutPanel } from "./src/domain/panel.js";
import { calculateVoltageDrop } from "./src/domain/voltage-drop.js";
import {
  clearProject,
  emptyProject,
  loadProject,
  saveProject,
  validateProject
} from "./src/storage/project-store.js";

const elements = Object.fromEntries(
  [
    "app-message", "global-panel-type", "global-units", "line-form", "line-name", "line-amps", "line-length",
    "line-length-label", "line-neutral-ccc", "line-material", "line-insulation-temp",
    "line-terminal-temp", "line-ambient", "line-continuous", "line-circuit-type",
    "line-count", "line-list", "conduit-type",
    "conduit-size", "derating-lines-list", "calculate-derating", "derating-result",
    "ground-wire", "ground-count", "conduit-nipple",
    "voltage-line", "voltage-material", "voltage-length", "voltage-length-label",
    "voltage-wire", "voltage-actual-amps", "voltage-upstream-drop", "calculate-voltage", "voltage-result",
    "panel-slots", "render-panel", "print-panel", "panel-result", "panel-visual",
    "export-data", "import-data", "import-file", "reset-data"
  ].map((id) => [id, document.getElementById(id)])
);

let project = loadProject();
let messageTimer;

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `circuit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showMessage(message, isError = false) {
  clearTimeout(messageTimer);
  elements["app-message"].textContent = message;
  elements["app-message"].classList.toggle("is-error", isError);
  elements["app-message"].hidden = false;
  messageTimer = setTimeout(() => {
    elements["app-message"].hidden = true;
  }, 6000);
}

function persist() {
  project = saveProject(project);
}

function showSection(sectionName) {
  document.querySelectorAll(".section").forEach((section) => {
    section.hidden = section.id !== `section-${sectionName}`;
  });
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.section === sectionName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function setUnitLabels() {
  const unit = project.unitSystem;
  elements["line-length-label"].textContent = `Длина, ${unit}`;
  if (!elements["voltage-line"].value) {
    elements["voltage-length-label"].textContent = `Длина, ${unit}`;
  }
}

function updateNeutralControl() {
  const phase = Number(document.querySelector('input[name="phase"]:checked').value);
  if (phase === 1) {
    elements["line-neutral-ccc"].checked = true;
    elements["line-neutral-ccc"].disabled = true;
  } else {
    elements["line-neutral-ccc"].disabled = false;
  }
}

function updateCircuitPhaseAvailability() {
  const threePole = document.querySelector('input[name="phase"][value="3"]');
  threePole.disabled = SUPPLY_SYSTEMS[project.panelSystem].phases === 1;
  if (threePole.disabled && threePole.checked) {
    document.querySelector('input[name="phase"][value="1"]').checked = true;
    updateNeutralControl();
  }
}

function circuitMeta(circuit) {
  const length = circuit.length ? ` · ${circuit.length} ${circuit.lengthUnit}` : "";
  const neutral = circuit.neutral ? ` + N${circuit.neutralCurrentCarrying ? " (CCC)" : ""}` : "";
  const load = circuit.continuous ? " · continuous 125%" : "";
  return `${circuit.amps} A${load} · ${circuit.phase}-pole${neutral}${length} · ${circuit.wireSize} ${circuit.material === "aluminum" ? "Al" : "Cu"} · ${circuit.terminalTemp}°C terminals`;
}

function renderCircuitList() {
  elements["line-count"].textContent = String(project.circuits.length);
  elements["line-list"].replaceChildren();

  if (project.circuits.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Цепей пока нет. Добавьте первую цепь выше.";
    elements["line-list"].append(empty);
    return;
  }

  for (const circuit of project.circuits) {
    const item = document.createElement("article");
    item.className = "circuit-item";

    const details = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = circuit.name;
    const meta = document.createElement("div");
    meta.className = "circuit-meta";
    meta.textContent = circuitMeta(circuit);
    details.append(heading, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Удалить";
    remove.dataset.deleteCircuit = circuit.id;
    remove.setAttribute("aria-label", `Удалить цепь ${circuit.name}`);
    item.append(details, remove);
    elements["line-list"].append(item);
  }
}

function appendOption(select, value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  select.append(option);
}

function renderConduitOptions() {
  const previousType = elements["conduit-type"].value;
  elements["conduit-type"].replaceChildren();
  Object.keys(RACEWAY_TOTAL_AREA).forEach((type) => {
    appendOption(elements["conduit-type"], type, type, type === previousType);
  });
  renderConduitSizes();
}

function renderConduitSizes() {
  const type = elements["conduit-type"].value;
  const previousSize = elements["conduit-size"].value;
  elements["conduit-size"].replaceChildren();
  Object.keys(RACEWAY_TOTAL_AREA[type] ?? {}).sort((a, b) => Number(a) - Number(b)).forEach((size) => {
    appendOption(elements["conduit-size"], size, `${size}″`, size === previousSize);
  });
}

function renderCircuitSelectors() {
  const previousVoltageCircuit = elements["voltage-line"].value;
  elements["voltage-line"].replaceChildren();
  appendOption(elements["voltage-line"], "", "Выберите цепь");
  for (const circuit of project.circuits) {
    appendOption(
      elements["voltage-line"],
      circuit.id,
      `${circuit.name} · ${circuit.amps} A`,
      circuit.id === previousVoltageCircuit
    );
  }

  elements["derating-lines-list"].replaceChildren();
  if (project.circuits.length === 0) {
    const text = document.createElement("p");
    text.className = "circuit-meta";
    text.textContent = "Сначала добавьте цепи.";
    elements["derating-lines-list"].append(text);
  } else {
    for (const circuit of project.circuits) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = circuit.id;
      const text = document.createElement("span");
      text.textContent = `${circuit.name} · ${circuitMeta(circuit)}`;
      label.append(checkbox, text);
      elements["derating-lines-list"].append(label);
    }
  }
}

function renderWireOptions() {
  elements["voltage-wire"].replaceChildren();
  elements["ground-wire"].replaceChildren();
  WIRE_TABLE.forEach((wire) => {
    appendOption(elements["voltage-wire"], wire.size, wire.size);
    appendOption(elements["ground-wire"], wire.size, wire.size, wire.size === "12 AWG");
  });
}

function renderAll() {
  elements["global-panel-type"].value = project.panelSystem;
  elements["global-units"].value = project.unitSystem;
  updateCircuitPhaseAvailability();
  setUnitLabels();
  renderCircuitList();
  renderCircuitSelectors();
}

function metric(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric";
  const caption = document.createElement("span");
  caption.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  wrapper.append(caption, strong);
  return wrapper;
}

function resultHeading(container, title) {
  const heading = document.createElement("h3");
  heading.textContent = title;
  container.append(heading);
}

function resetResult(container) {
  container.replaceChildren();
  container.hidden = false;
  container.classList.remove("is-warning", "is-danger");
}

function selectedCircuit() {
  return project.circuits.find((circuit) => circuit.id === elements["voltage-line"].value);
}

function updateVoltageDefaults() {
  const circuit = selectedCircuit();
  elements["voltage-result"].hidden = true;
  if (!circuit) {
    elements["voltage-length"].value = "";
    elements["voltage-actual-amps"].value = "";
    setUnitLabels();
    return;
  }

  elements["voltage-length"].value = circuit.length ?? "";
  elements["voltage-length-label"].textContent = `Длина, ${circuit.lengthUnit}`;
  elements["voltage-wire"].value = circuit.wireSize;
  elements["voltage-actual-amps"].value = circuit.amps;
  elements["voltage-material"].value = circuit.material;
}

function calculateDeratingFromForm() {
  try {
    const selectedIds = new Set(
      [...elements["derating-lines-list"].querySelectorAll('input[type="checkbox"]:checked')]
        .map((checkbox) => checkbox.value)
    );
    const result = calculateDerating({
      circuits: project.circuits.filter((circuit) => selectedIds.has(circuit.id)),
      conduitType: elements["conduit-type"].value,
      conduitSize: elements["conduit-size"].value,
      groundWireSize: elements["ground-wire"].value,
      groundCount: Number(elements["ground-count"].value),
      nipple: elements["conduit-nipple"].checked
    });

    const container = elements["derating-result"];
    resetResult(container);
    container.classList.toggle("is-danger", result.overfilled);
    resultHeading(container, result.overfilled ? "Труба переполнена" : "Расчёт заполнения");

    const grid = document.createElement("div");
    grid.className = "result-grid";
    grid.append(
      metric("Токонесущих · 310.15(C)", String(result.currentCarryingCount)),
      metric("Всего в raceway", String(result.installedConductorCount)),
      metric("Adjustment factor", result.adjustmentFactor.toFixed(2)),
      metric("Допустимое заполнение", `${(result.fillLimit * 100).toFixed(0)}%`),
      metric("Заполнение лимита", `${result.fillPercentOfAllowed.toFixed(1)}%`)
    );
    container.append(grid);

    const list = document.createElement("ul");
    list.className = "result-list";
    result.circuits.forEach((circuit) => {
      const item = document.createElement("li");
      item.textContent = `${circuit.name}: ${circuit.originalSize} → ${circuit.requiredSize ?? "больше 1000 kcmil"} · allowable ${circuit.allowableAmpacity.toFixed(1)} A${circuit.originalPasses ? "" : " · исходный размер не проходит"}`;
      list.append(item);
    });
    result.references.forEach((reference) => {
      const item = document.createElement("li");
      item.textContent = `NEC 2023: ${reference}`;
      list.append(item);
    });
    container.append(list);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function calculateVoltageFromForm() {
  const circuit = selectedCircuit();
  if (!circuit) return showMessage("Выберите цепь для расчёта", true);

  try {
    const panelType = SUPPLY_SYSTEMS[project.panelSystem].phases;
    if (panelType === 1 && circuit.phase === 3) {
      throw new RangeError("Трёхполюсная цепь недопустима в однофазной панели");
    }
    const result = calculateVoltageDrop({
      supplySystem: project.panelSystem,
      phase: circuit.phase,
      length: elements["voltage-length"].value,
      lengthUnit: circuit.lengthUnit,
      material: elements["voltage-material"].value,
      wireSize: elements["voltage-wire"].value,
      amps: elements["voltage-actual-amps"].value || circuit.amps,
      upstreamDropPercent: elements["voltage-upstream-drop"].value || 0,
      circuitType: circuit.circuitType,
      ampacityOptions: circuit
    });

    const container = elements["voltage-result"];
    resetResult(container);
    const voltageWarning = result.exceedsBranchRecommendation || result.exceedsCombinedRecommendation;
    container.classList.toggle("is-warning", voltageWarning);
    resultHeading(container, voltageWarning ? "Рекомендуемый предел превышен" : "Падение в рекомендуемых пределах");

    const grid = document.createElement("div");
    grid.className = "result-grid";
    grid.append(
      metric("Рабочее напряжение", `${result.voltage} V`),
      metric("Падение", `${result.dropVolts.toFixed(2)} V`),
      metric("Участок", `${result.dropPercent.toFixed(2)}%`),
      metric("Feeder + branch", `${result.totalDropPercent.toFixed(2)}%`)
    );
    container.append(grid);

    const details = document.createElement("ul");
    details.className = "result-list";
    const formula = document.createElement("li");
    formula.textContent = `Формула: ${result.multiplier === 2 ? "2" : "√3"} × L × K × I / CMA`;
    details.append(formula);
    if (result.recommendedSize) {
      const recommendation = document.createElement("li");
      recommendation.textContent = `Минимальный размер по ampacity и порогу 3%: ${result.recommendedSize}`;
      details.append(recommendation);
    }
    result.references.forEach((reference) => {
      const item = document.createElement("li");
      item.textContent = `NEC 2023: ${reference}`;
      details.append(item);
    });
    container.append(details);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function panelCell(slotNumber, entry) {
  const fragment = document.createDocumentFragment();
  const numberCell = document.createElement("td");
  numberCell.className = "panel-slot";
  numberCell.textContent = String(slotNumber);
  const loadCell = document.createElement("td");
  const phaseCell = document.createElement("td");
  phaseCell.className = "panel-phase";

  if (entry) {
    loadCell.textContent = `${entry.name} · ${entry.amps} A${entry.poles > 1 ? ` · pole ${entry.poleIndex}/${entry.poles}` : ""}`;
    phaseCell.textContent = entry.phase;
  }
  fragment.append(numberCell, loadCell, phaseCell);
  return fragment;
}

function renderPanelFromForm() {
  try {
    const panelType = SUPPLY_SYSTEMS[project.panelSystem].phases;
    const result = layoutPanel({
      circuits: project.circuits,
      panelType,
      slotCount: Number(elements["panel-slots"].value)
    });

    const summary = elements["panel-result"];
    resetResult(summary);
    summary.classList.toggle("is-warning", result.unplaced.length > 0 || result.imbalancePercent > 20);
    resultHeading(summary, result.unplaced.length ? "Панель построена не полностью" : "Панель построена");
    const grid = document.createElement("div");
    grid.className = "result-grid";
    Object.entries(result.loads).forEach(([phase, amps]) => grid.append(metric(`Фаза ${phase}`, `${amps} A`)));
    grid.append(metric("Перекос", `${result.imbalancePercent.toFixed(1)}%`));
    summary.append(grid);

    if (result.unplaced.length) {
      const list = document.createElement("ul");
      list.className = "result-list";
      result.unplaced.forEach(({ circuit, reason }) => {
        const item = document.createElement("li");
        item.textContent = `${circuit.name}: ${reason}`;
        list.append(item);
      });
      summary.append(list);
    }

    const table = document.createElement("table");
    table.className = "panel-table";
    const caption = document.createElement("caption");
    caption.textContent = `${SUPPLY_SYSTEMS[project.panelSystem].label} panel`;
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "Нагрузка", "Фаза", "#", "Нагрузка", "Фаза"].forEach((label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.append(th);
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    for (let row = 0; row < result.slots.length / 2; row += 1) {
      const left = row * 2;
      const right = left + 1;
      const tr = document.createElement("tr");
      tr.append(panelCell(left + 1, result.slots[left]), panelCell(right + 1, result.slots[right]));
      body.append(tr);
    }
    table.append(caption, head, body);
    elements["panel-visual"].replaceChildren(table);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function addCircuit(event) {
  event.preventDefault();
  try {
    const amps = Number(elements["line-amps"].value);
    const phase = Number(document.querySelector('input[name="phase"]:checked').value);
    if (SUPPLY_SYSTEMS[project.panelSystem].phases === 1 && phase === 3) {
      throw new RangeError("Трёхполюсная цепь недопустима в однофазной панели");
    }
    const neutral = phase === 1 || elements["line-neutral-ccc"].checked;
    const sizingOptions = {
      material: elements["line-material"].value,
      insulationTemp: Number(elements["line-insulation-temp"].value),
      terminalTemp: Number(elements["line-terminal-temp"].value),
      ambientC: Number(elements["line-ambient"].value),
      loadAmps: amps,
      continuous: elements["line-continuous"].checked,
      hundredPercentRated: false,
      adjustmentFactor: 1
    };
    const selectedWire = selectWireSize(sizingOptions);
    if (!selectedWire) throw new RangeError("Для заданных условий требуется проводник больше 1000 kcmil");
    const lengthValue = elements["line-length"].value;
    const circuit = {
      id: createId(),
      name: elements["line-name"].value.trim(),
      amps,
      phase,
      neutral,
      neutralCurrentCarrying: neutral,
      wireSize: selectedWire.wireSize,
      material: sizingOptions.material,
      insulationTemp: sizingOptions.insulationTemp,
      terminalTemp: sizingOptions.terminalTemp,
      ambientC: sizingOptions.ambientC,
      continuous: sizingOptions.continuous,
      hundredPercentRated: false,
      circuitType: elements["line-circuit-type"].value,
      length: lengthValue ? Number(lengthValue) : null,
      lengthUnit: project.unitSystem
    };

    project = validateProject({ ...project, circuits: [...project.circuits, circuit] });
    persist();
    elements["line-form"].reset();
    updateNeutralControl();
    renderAll();
    showMessage(`Цепь «${circuit.name}» добавлена`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function deleteCircuit(id) {
  const circuit = project.circuits.find((candidate) => candidate.id === id);
  if (!circuit || !confirm(`Удалить цепь «${circuit.name}»?`)) return;
  project.circuits = project.circuits.filter((candidate) => candidate.id !== id);
  persist();
  renderAll();
  elements["derating-result"].hidden = true;
  elements["voltage-result"].hidden = true;
  elements["panel-result"].hidden = true;
  elements["panel-visual"].replaceChildren();
}

function exportProject() {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `calcuvolt-project-v${project.version}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function importProject(file) {
  if (!file) return;
  if (file.size > 1_000_000) return showMessage("Файл импорта превышает лимит 1 MB", true);
  try {
    project = validateProject(JSON.parse(await file.text()));
    persist();
    renderAll();
    elements["import-file"].value = "";
    showMessage("Проект импортирован и проверен");
  } catch (error) {
    showMessage(`Импорт отклонён: ${error.message}`, true);
  }
}

function resetProject() {
  if (!confirm("Удалить все локальные цепи и начать новый расчёт?")) return;
  clearProject();
  project = emptyProject();
  persist();
  renderAll();
  elements["derating-result"].hidden = true;
  elements["voltage-result"].hidden = true;
  elements["panel-result"].hidden = true;
  elements["panel-visual"].replaceChildren();
  showSection("lines");
  showMessage("Создан новый расчёт");
}

function registerEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });
  document.querySelectorAll('input[name="phase"]').forEach((input) => {
    input.addEventListener("change", updateNeutralControl);
  });
  elements["line-form"].addEventListener("submit", addCircuit);
  elements["line-list"].addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-circuit]");
    if (button) deleteCircuit(button.dataset.deleteCircuit);
  });
  elements["global-panel-type"].addEventListener("change", () => {
    project.panelSystem = elements["global-panel-type"].value;
    persist();
    updateCircuitPhaseAvailability();
    elements["voltage-result"].hidden = true;
    elements["panel-result"].hidden = true;
    elements["panel-visual"].replaceChildren();
  });
  elements["global-units"].addEventListener("change", () => {
    project.unitSystem = elements["global-units"].value === "m" ? "m" : "ft";
    persist();
    setUnitLabels();
  });
  elements["conduit-type"].addEventListener("change", renderConduitSizes);
  elements["calculate-derating"].addEventListener("click", calculateDeratingFromForm);
  elements["voltage-line"].addEventListener("change", updateVoltageDefaults);
  elements["calculate-voltage"].addEventListener("click", calculateVoltageFromForm);
  elements["render-panel"].addEventListener("click", renderPanelFromForm);
  elements["print-panel"].addEventListener("click", () => {
    if (!elements["panel-visual"].querySelector("table")) return showMessage("Сначала постройте панель", true);
    window.print();
  });
  elements["export-data"].addEventListener("click", exportProject);
  elements["import-data"].addEventListener("click", () => elements["import-file"].click());
  elements["import-file"].addEventListener("change", () => importProject(elements["import-file"].files[0]));
  elements["reset-data"].addEventListener("click", resetProject);
}

function initialize() {
  renderWireOptions();
  renderConduitOptions();
  renderAll();
  updateNeutralControl();
  registerEvents();
  showSection("lines");
  console.info(`CalcuVolt dataset: ${NEC_DATASET.id} (${NEC_DATASET.status})`);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }
}

initialize();
