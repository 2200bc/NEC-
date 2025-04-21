let lines = JSON.parse(localStorage.getItem('lines') || '[]');

const wireAmpacityTable = [
  { size: "14 AWG", ampacity: 20, area: 0.013, cma: 4110 },
  { size: "12 AWG", ampacity: 25, area: 0.020, cma: 6530 },
  { size: "10 AWG", ampacity: 35, area: 0.031, cma: 10380 },
  { size: "8 AWG", ampacity: 50, area: 0.050, cma: 16510 },
  { size: "6 AWG", ampacity: 65, area: 0.085, cma: 26240 },
  { size: "4 AWG", ampacity: 85, area: 0.136, cma: 41740 },
  { size: "3 AWG", ampacity: 100, area: 0.160, cma: 52620 },
  { size: "2 AWG", ampacity: 115, area: 0.208, cma: 66360 },
  { size: "1 AWG", ampacity: 130, area: 0.262, cma: 83690 },
  { size: "1/0", ampacity: 150, area: 0.330, cma: 105500 },
  { size: "2/0", ampacity: 175, area: 0.384, cma: 133100 },
  { size: "3/0", ampacity: 200, area: 0.460, cma: 167800 },
  { size: "4/0", ampacity: 230, area: 0.554, cma: 211600 },
  { size: "250 MCM", ampacity: 255, area: 0.677, cma: 250000 },
  { size: "300 MCM", ampacity: 285, area: 0.777, cma: 300000 },
  { size: "350 MCM", ampacity: 310, area: 0.877, cma: 350000 },
  { size: "400 MCM", ampacity: 335, area: 0.977, cma: 400000 },
  { size: "500 MCM", ampacity: 380, area: 1.177, cma: 500000 },
  { size: "600 MCM", ampacity: 420, area: 1.382, cma: 600000 },
  { size: "700 MCM", ampacity: 460, area: 1.586, cma: 700000 },
  { size: "750 MCM", ampacity: 475, area: 1.683, cma: 750000 },
  { size: "800 MCM", ampacity: 490, area: 1.780, cma: 800000 },
  { size: "900 MCM", ampacity: 520, area: 1.975, cma: 900000 },
  { size: "1000 MCM", ampacity: 545, area: 2.170, cma: 1000000 }
];

const wireAmpacityTable90C = [
  { size: "14 AWG", ampacity: 25 },
  { size: "12 AWG", ampacity: 30 },
  { size: "10 AWG", ampacity: 40 },
  { size: "8 AWG", ampacity: 55 },
  { size: "6 AWG", ampacity: 75 },
  { size: "4 AWG", ampacity: 95 },
  { size: "3 AWG", ampacity: 110 },
  { size: "2 AWG", ampacity: 130 },
  { size: "1 AWG", ampacity: 150 },
  { size: "1/0", ampacity: 170 },
  { size: "2/0", ampacity: 195 },
  { size: "3/0", ampacity: 225 },
  { size: "4/0", ampacity: 260 },
  { size: "250 MCM", ampacity: 290 },
  { size: "300 MCM", ampacity: 320 },
  { size: "350 MCM", ampacity: 350 },
  { size: "400 MCM", ampacity: 380 },
  { size: "500 MCM", ampacity: 430 },
  { size: "600 MCM", ampacity: 475 },
  { size: "700 MCM", ampacity: 520 },
  { size: "750 MCM", ampacity: 535 },
  { size: "800 MCM", ampacity: 555 },
  { size: "900 MCM", ampacity: 585 },
  { size: "1000 MCM", ampacity: 615 }
];

const conduitFillTable = {
  EMT: { "0.5": 0.122, "0.75": 0.213, "1": 0.346, "1.25": 0.598, "1.5": 0.814, "2": 1.342, "2.5": 2.206, "3": 3.356, "3.5": 4.581, "4": 5.942 },
  PVC: { "0.5": 0.147, "0.75": 0.253, "1": 0.436, "1.25": 0.771, "1.5": 1.094, "2": 1.860, "2.5": 3.020, "3": 4.360, "3.5": 5.950, "4": 7.760 },
  IMC: { "1": 0.380, "1.25": 0.640, "1.5": 0.860, "2": 1.400, "2.5": 2.340, "3": 3.550 },
  RMC: { "1": 0.380, "1.25": 0.640, "1.5": 0.860, "2": 1.400, "2.5": 2.340, "3": 3.550 },
  ENT: { "1": 0.350, "1.25": 0.600, "1.5": 0.800, "2": 1.300 }
};

function getWireSize(amps) {
  for (let i = 0; i < wireAmpacityTable.length; i++) {
    const wire = wireAmpacityTable[i];
    if (wire.size === "14 AWG") continue; // Исключаем 14 AWG
    if (amps <= wire.ampacity) return wire.size;
  }
  return "больше 1000 MCM";
}

function getWireSizeDerated(amps) {
  for (let i = 0; i < wireAmpacityTable90C.length; i++) {
    const wire = wireAmpacityTable90C[i];
    if (wire.size === "14 AWG") continue; // Исключаем 14 AWG
    if (amps <= wire.ampacity) return wire.size;
  }
  return "больше 1000 MCM";
}


function getWireArea(size) {
  const entry = wireAmpacityTable.find(e => e.size === size);
  return entry ? entry.area : 0.01;
}
function addLine() {
  const name = document.getElementById('line-name').value.trim();
  const amps = parseFloat(document.getElementById('line-amps').value);
  const length = parseFloat(document.getElementById('line-length').value);
  const phase = document.querySelector('input[name="phase"]:checked').value;
  const neutral = document.getElementById('line-neutral').checked;

  if (!name || isNaN(amps)) return alert("Заполни имя и ампераж");

  const wireSize = getWireSize(amps);
  const line = { name, amps, phase, neutral, wireSize };

  if (!isNaN(length)) line.length = length;

  lines.push(line);
  localStorage.setItem('lines', JSON.stringify(lines));
  renderLines();
  updateSelectors();

  document.getElementById('line-name').value = '';
  document.getElementById('line-amps').value = '';
  document.getElementById('line-length').value = '';
  document.querySelector('input[name="phase"][value="1"]').checked = true;
  document.getElementById('line-neutral').checked = false;
  updateNeutral();
}



function deleteLine(index) {
  if (!confirm("Удалить линию?")) return;
  lines.splice(index, 1);
  localStorage.setItem('lines', JSON.stringify(lines));
  renderLines();
  updateSelectors();
}

function renderLines() {
  const container = document.getElementById('line-list');
  container.innerHTML = "";
  lines.forEach((line, i) => {
    const phaseText =
      line.phase === "1" ? "1 фаза" :
      line.phase === "2" ? "2 фазы" :
      "3 фазы";
    const neutralText = line.neutral ? ", с нейтралью" : "";
    const lengthText = line.length ? `, ${line.length}ft` : "";
    const div = document.createElement("div");
    div.innerHTML = `${line.name}: ${line.amps}А, ${phaseText}${neutralText}${lengthText} → ${line.wireSize}
      <button onclick="deleteLine(${i})">Удалить</button>`;
    container.appendChild(div);
  });
}




function updateSelectors() {
  const derList = document.getElementById('derating-lines-list');
  const vSel = document.getElementById('voltage-line');
  derList.innerHTML = "";
  vSel.innerHTML = "";

  // Добавляем дефолтный пункт
  const defaultOption = new Option("Выберите линию", "");
  vSel.appendChild(defaultOption);

  lines.forEach((line, i) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = i;
    label.appendChild(checkbox);
    const neutralText = line.neutral ? "+N" : "";
    const phaseText = line.phase === "3" ? `3Ø${neutralText}` : `1Ø${neutralText}`;
    label.appendChild(document.createTextNode(` ${line.amps}A — ${phaseText} — ${line.name}`));
    derList.appendChild(label);
    derList.appendChild(document.createElement("br"));

    const opt = new Option(`${line.name}`, i);
    vSel.appendChild(opt);
  });
}

function updateVoltageDefaults() {
  const index = document.getElementById("voltage-line").value;
  const line = lines[index];
  const resultEl = document.getElementById("voltage-result");

  if (!line) {
    resultEl.textContent = "";
    return;
  }

  // Подставить длину, если есть
  const lengthField = document.getElementById("voltage-length");
  if (line.length) {
    lengthField.value = line.length;
  } else {
    lengthField.value = "";
  }

  // По умолчанию — 110 В
  document.querySelector('input[name="voltage-volts"][value="110"]').checked = true;

  // Установить размер провода из линии
  const overrideSelect = document.getElementById("voltage-override");
  if (overrideSelect && line.wireSize) {
    overrideSelect.value = line.wireSize;
  }

  // Лаконичный вывод
  const phaseText =
    line.phase === "1" ? "1 фаза" :
    line.phase === "2" ? "2 фазы" :
    "3 фазы";
  const neutralText = line.neutral ? "с нейтралью" : "без нейтрали";
  resultEl.textContent = `🔧 ${phaseText}, ${neutralText}, ${line.amps}А`;
  resultEl.style.color = "inherit";
}




function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('section-' + id).classList.remove('hidden');
}
function updateNeutral() {
  const phase = document.querySelector('input[name="phase"]:checked').value;
  const neutralCheckbox = document.getElementById('line-neutral');
  if (phase === "1") {
    neutralCheckbox.checked = true;
    neutralCheckbox.disabled = true;
  } else {
    neutralCheckbox.disabled = false;
  }
}

function calculateDerating() {
  const checkboxes = document.querySelectorAll('#derating-lines-list input[type=checkbox]');
  const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => lines[cb.value]);
  const type = document.getElementById('conduit-type').value;
  const size = document.getElementById('conduit-size').value;
  const maxFill = conduitFillTable[type]?.[size] || 1;

  let totalArea = 0;
  let conductorCount = 0;
  let result = "";

  selected.forEach(line => {
    let count = 0;
    if (line.phase === "1") count = 1;
    else if (line.phase === "2") count = 2;
    else if (line.phase === "3") count = 3;
    if (line.neutral) count += 1;

    conductorCount += count;
    totalArea += getWireArea(line.wireSize) * count;
  });

  let factor = 1.0;
  if (conductorCount > 3 && conductorCount <= 6) factor = 0.8;
  else if (conductorCount <= 9) factor = 0.7;
  else if (conductorCount <= 20) factor = 0.5;
  else factor = 0.45;

  const fillPercent = ((totalArea / maxFill) * 100).toFixed(1);
  result += `Жил: ${conductorCount}, коэфф: ${factor}, Загрузка трубы: ${fillPercent}% (${fillPercent <= 100 ? "OK" : "ПЕРЕПОЛНЕНО"})\n\n`;

  selected.forEach(line => {
    const newSize = getWireSizeDerated(line.amps / factor);
    result += `${line.name}: был ${line.wireSize} → нужен ${newSize}\n`;
  });

  const resEl = document.getElementById('derating-result');
  resEl.textContent = result;
  resEl.style.color = fillPercent > 100 ? "red" : "inherit";
}


function calculateVoltageDrop() {
  const index = document.getElementById("voltage-line").value;
  if (!lines[index]) return alert("Линия не выбрана");

  const line = lines[index];
  const material = document.getElementById("voltage-material").value;
  let length = parseFloat(document.getElementById("voltage-length").value);
  if (isNaN(length)) length = line.length;
  if (!length) return alert("Укажи длину — в поле или при создании линии");

  const volts = parseFloat(document.querySelector('input[name="voltage-volts"]:checked')?.value);
  if (!volts) return alert("Укажи напряжение");

  const is3Phase = parseInt(line.phase) === 3;
  const resistivity = material === "copper" ? 12.9 : 21.2;

  const override = document.getElementById("voltage-override").value;
  const wireSize = override || line.wireSize;
  const cma = wireAmpacityTable.find(w => w.size === wireSize)?.cma || 1000;

  const multiplier = is3Phase ? Math.sqrt(3) : 2;
  const VD = (multiplier * length * resistivity * line.amps) / cma;
  const percent = ((VD / volts) * 100).toFixed(2);

  const resultEl = document.getElementById("voltage-result");
  let output = "";

  // 1. ДАННЫЕ
  const phaseText =
    line.phase === "1" ? "1 фаза" :
    line.phase === "2" ? "2 фазы" :
    "3 фазы";
  const neutralText = line.neutral ? "с нейтралью" : "без нейтрали";
  output += `🔧 ${phaseText}, ${neutralText}, ${line.amps}А\n`;

  // 2. ФОРМУЛА
  output += `\n📐 Формула:\n`;
  output += is3Phase
    ? `VD = √3 × L × R × I / CMA\n`
    : `VD = 2 × L × R × I / CMA\n`;

  // 3. РЕЗУЛЬТАТ
  output += `\n→ Падение напряжения: ${VD.toFixed(2)} В (${percent}%)`;

  if (percent > 3) {
    resultEl.style.color = "red";
    output += `\n⚠️ Превышение допустимого 3% по NEC!`;

    const recommended = wireAmpacityTable.find(w =>
      (multiplier * length * resistivity * line.amps) / w.cma / volts < 0.03
    );
    if (recommended) {
      output += `\n💡 Рекомендуемый размер: ${recommended.size}`;
    } else {
      output += `\n❗ Невозможно подобрать провод в пределах 3%`;
    }
  } else {
    resultEl.style.color = "inherit";
  }

  resultEl.textContent = output;
}




function legacybalancePanel() {
  const type = document.querySelector('input[name="panel-type"]:checked').value;
  const slots = parseInt(document.getElementById("panel-slots").value);
  const result = document.getElementById("panel-result");
  if (!slots || slots < 6) return result.textContent = "Нужно минимум 6 слотов для трёхфазных линий";

  const slotMap = new Array(slots).fill(null);
  let phaseLoad = { A: 0, B: 0, C: 0 };

  const slotPhase = slot => {
    const pos = Math.floor(slot / 2) % 3;
    return ['A', 'B', 'C'][pos];
  };

  const getPhaseTriplet = () => {
    for (let i = 0; i <= slots - 6; i += 2) {
      const s1 = i;
      const s2 = i + 2;
      const s3 = i + 4;
      if (!slotMap[s1] && !slotMap[s2] && !slotMap[s3]) {
        return [s1, s2, s3];
      }
    }
    return null;
  };

  let pointer = 0;
  const sorted = [...lines].sort((a, b) => b.amps - a.amps);

  for (const line of sorted) {
    if (line.phase === "3") {
      const group = getPhaseTriplet();
      if (!group) continue;
      group.forEach(i => slotMap[i] = `${i + 1}`);
      phaseLoad.A += line.amps;
      phaseLoad.B += line.amps;
      phaseLoad.C += line.amps;
      slotMap[group[0]] = `${group.map(i => i + 1).join(',')}: ${line.name} → фазы A+B+C`;
    } else {
      while (pointer < slots && slotMap[pointer]) pointer++;
      if (pointer >= slots) break;
      const phase = slotPhase(pointer);
      slotMap[pointer] = `${pointer + 1}: ${line.name} → фаза ${phase}`;
      phaseLoad[phase] += line.amps;
    }
  }

  const max = Math.max(phaseLoad.A, phaseLoad.B, phaseLoad.C);
  const min = Math.min(phaseLoad.A, phaseLoad.B, phaseLoad.C);
  const delta = max - min;
  const unbalance = delta > 0.2 * max ? "⚠️ Перекос фаз!" : "";

  const output = slotMap.filter(Boolean).join("\n") +
    `\n\nНагрузка: A=${phaseLoad.A}А, B=${phaseLoad.B}А, C=${phaseLoad.C}А\n${unbalance}`;
  result.textContent = output;
}
function resetCalculator() {
  if (confirm("Очистить все данные и начать заново?")) {
    lines = [];
    localStorage.removeItem('lines');
    renderLines();
    updateSelectors();
    document.getElementById('derating-result').textContent = "";
    document.getElementById('voltage-result').textContent = "";
    document.getElementById('panel-result').textContent = "";
  }
}
function exportData() {
  const blob = new Blob([JSON.stringify(lines, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nec_lines.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.getElementById("import-file");
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Неверный формат файла");

      lines = data;
      localStorage.setItem('lines', JSON.stringify(lines));
      renderLines();
      updateSelectors();
      alert("Импорт завершён");
    } catch (err) {
      alert("Ошибка при импорте: " + err.message);
    }
  };
  reader.readAsText(file);
}

function renderVisualPanel() {
  const slots = parseInt(document.getElementById("panel-slots").value);
  if (!slots || slots < 6 || slots % 2 !== 0) return alert("Слотов должно быть чётное число, минимум 6");

  const container = document.getElementById("panel-visual");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "panel-table";

  const header = `
    <tr>
      <th class="slot">#</th>
      <th class="name">Load Served</th>
      <th class="phase">Phase</th>
      <th class="slot">#</th>
      <th class="name">Load Served</th>
      <th class="phase">Phase</th>
    </tr>
  `;
  table.innerHTML = header;

  const slotMap = new Array(slots).fill(null);
  let phaseLoad = { A: 0, B: 0, C: 0 };

  const slotPhase = slot => ['A', 'B', 'C'][Math.floor(slot / 2) % 3];
  let pointer = 0;
  const sorted = [...lines].sort((a, b) => b.amps - a.amps);

  for (const line of sorted) {
    if (line.phase === "3") {
      let placed = false;
      for (let i = 0; i <= slots - 6; i += 2) {
        if (!slotMap[i] && !slotMap[i + 2] && !slotMap[i + 4]) {
          const label = `${line.name} (${line.amps}A)`;
          slotMap[i] = { label, phase: "A+B+C" };
          slotMap[i + 2] = "_SKIP_";
          slotMap[i + 4] = "_SKIP_";
          phaseLoad.A += line.amps;
          phaseLoad.B += line.amps;
          phaseLoad.C += line.amps;
          placed = true;
          break;
        }
      }
      if (!placed) continue;
    } else {
      while (pointer < slots && slotMap[pointer]) pointer++;
      if (pointer >= slots) break;
      const phase = slotPhase(pointer);
      slotMap[pointer] = {
        label: `${line.name} (${line.amps}A)`,
        phase
      };
      phaseLoad[phase] += line.amps;
    }
  }

  for (let i = 0; i < slots / 2; i++) {
    const left = i * 2;
    const right = i * 2 + 1;

    const l = slotMap[left];
    const r = slotMap[right];

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${left + 1}</td>
      <td>${l && l !== "_SKIP_" ? l.label : ""}</td>
      <td>${l && l !== "_SKIP_" ? l.phase : ""}</td>
      <td>${right + 1}</td>
      <td>${r && r !== "_SKIP_" ? r.label : ""}</td>
      <td>${r && r !== "_SKIP_" ? r.phase : ""}</td>
    `;
    table.appendChild(row);
  }

  const footer = document.createElement("tr");
  footer.className = "footer-row";
  const total = phaseLoad.A + phaseLoad.B + phaseLoad.C;
  footer.innerHTML = `
    <td colspan="6">Load per Phase: A = ${phaseLoad.A}A, B = ${phaseLoad.B}A, C = ${phaseLoad.C}A | Total = ${total}A</td>
  `;
  table.appendChild(footer);

  container.appendChild(table);
}


window.onload = () => {
  showSection('lines');
  renderLines();
  updateSelectors();
  updateNeutral();

  document.querySelectorAll('input[name="phase"]').forEach(radio => {
    radio.addEventListener('change', updateNeutral);
  });
};
