
let lines = JSON.parse(localStorage.getItem('lines') || '[]');

const wireAmpacityTable = [
  { size: "14 AWG", ampacity: 25, area: 0.013, cma: 4110 },
  { size: "12 AWG", ampacity: 30, area: 0.020, cma: 6530 },
  { size: "10 AWG", ampacity: 35, area: 0.031, cma: 10380 },
  { size: "8 AWG", ampacity: 50, area: 0.050, cma: 16510 },
  { size: "6 AWG", ampacity: 65, area: 0.085, cma: 26240 },
  { size: "4 AWG", ampacity: 85, area: 0.136, cma: 41740 },
  { size: "3 AWG", ampacity: 100, area: 0.160, cma: 52620 },
  { size: "2 AWG", ampacity: 130, area: 0.208, cma: 66360 },
  { size: "1 AWG", ampacity: 150, area: 0.262, cma: 83690 },
  { size: "1/0", ampacity: 170, area: 0.330, cma: 105500 },
  { size: "2/0", ampacity: 195, area: 0.384, cma: 133100 },
  { size: "3/0", ampacity: 225, area: 0.460, cma: 167800 },
  { size: "4/0", ampacity: 260, area: 0.554, cma: 211600 },
  { size: "250 MCM", ampacity: 290, area: 0.677, cma: 250000 },
  { size: "300 MCM", ampacity: 320, area: 0.777, cma: 300000 },
  { size: "350 MCM", ampacity: 350, area: 0.877, cma: 350000 },
  { size: "400 MCM", ampacity: 380, area: 0.977, cma: 400000 },
  { size: "500 MCM", ampacity: 430, area: 1.177, cma: 500000 },
  { size: "600 MCM", ampacity: 475, area: 1.382, cma: 600000 },
  { size: "700 MCM", ampacity: 520, area: 1.586, cma: 700000 },
  { size: "750 MCM", ampacity: 535, area: 1.683, cma: 750000 },
  { size: "800 MCM", ampacity: 555, area: 1.780, cma: 800000 },
  { size: "900 MCM", ampacity: 585, area: 1.975, cma: 900000 },
  { size: "1000 MCM", ampacity: 615, area: 2.170, cma: 1000000 }
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
    if (amps <= wireAmpacityTable[i].ampacity) return wireAmpacityTable[i].size;
  }
  return "больше 1000 MCM";
}

function getWireArea(size) {
  const entry = wireAmpacityTable.find(e => e.size === size);
  return entry ? entry.area : 0.01;
}

function addLine() {
  const name = document.getElementById('line-name').value;
  const amps = parseFloat(document.getElementById('line-amps').value);
  const phase = document.querySelector('input[name="phase"]:checked').value;
  const neutral = document.getElementById('line-neutral').checked;
  if (!name || !amps) return alert("Заполни все поля");

  const wireSize = getWireSize(amps);
  const line = { name, amps, phase, neutral, wireSize };
  lines.push(line);
  localStorage.setItem('lines', JSON.stringify(lines));
  renderLines();
  updateSelectors();

  document.getElementById('line-name').value = '';
  document.getElementById('line-amps').value = '';
  document.querySelector('input[name="phase"][value="1"]').checked = true;
  document.getElementById('line-neutral').checked = false;
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
    const div = document.createElement("div");
    div.innerHTML = `${line.name}: ${line.amps}А, ${line.phase} фазы${line.neutral ? ", с нейтралью" : ""} → ${line.wireSize}
      <button onclick="deleteLine(${i})">Удалить</button>`;
    container.appendChild(div);
  });
}

function updateSelectors() {
  const derSel = document.getElementById('derating-lines');
  const vSel = document.getElementById('voltage-line');
  derSel.innerHTML = "";
  vSel.innerHTML = "";
  lines.forEach((line, i) => {
    const opt = new Option(`${line.name}`, i);
    derSel.appendChild(opt.cloneNode(true));
    vSel.appendChild(opt);
  });
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('section-' + id).classList.remove('hidden');
}


function addLine() {
  const name = document.getElementById('line-name').value;
  const amps = parseFloat(document.getElementById('line-amps').value);
  const phase = document.querySelector('input[name="phase"]:checked').value;
  const neutral = document.getElementById('line-neutral').checked;
  if (!name || !amps) return alert("Заполни все поля");

  const wireSize = getWireSize(amps);
  const line = { name, amps, phase, neutral, wireSize };
  lines.push(line);
  localStorage.setItem('lines', JSON.stringify(lines));
  renderLines();
  updateSelectors();

  document.getElementById('line-name').value = '';
  document.getElementById('line-amps').value = '';
  document.querySelector('input[name="phase"][value="1"]').checked = true;
  document.getElementById('line-neutral').checked = false;
}

function renderLines() {
  const container = document.getElementById('line-list');
  container.innerHTML = "";
  lines.forEach((line, i) => {
    const div = document.createElement("div");
    div.innerHTML = `${line.name}: ${line.amps}А, ${line.phase} фазы${line.neutral ? ", с нейтралью" : ""} → ${line.wireSize}
      <button onclick="deleteLine(${i})">Удалить</button>`;
    container.appendChild(div);
  });
}

function updateSelectors() {
  const derSel = document.getElementById('derating-lines');
  const vSel = document.getElementById('voltage-line');
  derSel.innerHTML = "";
  vSel.innerHTML = "";
  lines.forEach((line, i) => {
    const opt = new Option(`${line.name}`, i);
    derSel.appendChild(opt.cloneNode(true));
    vSel.appendChild(opt);
  });
}


function calculateDerating() {
  const selected = Array.from(document.getElementById('derating-lines').selectedOptions).map(o => lines[o.value]);
  const type = document.getElementById('conduit-type').value;
  const size = document.getElementById('conduit-size').value;
  const maxFill = conduitFillTable[type]?.[size] || 1;

  let totalArea = 0;
  let conductorCount = 0;
  let result = "";

  selected.forEach(line => {
    const count = line.phase === "3" ? 3 : 2;
    conductorCount += count;
    if (line.neutral) conductorCount += 1;
    totalArea += getWireArea(line.wireSize) * count;
  });

  let factor = 1.0;
  if (conductorCount > 3 && conductorCount <= 6) factor = 0.8;
  else if (conductorCount <= 9) factor = 0.7;
  else if (conductorCount <= 20) factor = 0.5;
  else factor = 0.45;

  const fillPercent = ((totalArea / maxFill) * 100).toFixed(1);
  result += `Жил: ${conductorCount}, коэфф: ${factor}, Загрузка трубы: ${fillPercent}% (${fillPercent <= 100 ? "OK" : "ПЕРЕПОЛНЕНО"})

`;

  selected.forEach(line => {
    const newSize = getWireSize(line.amps / factor);
    result += `${line.name}: был ${line.wireSize} → нужен ${newSize}
`;
  });

  document.getElementById('derating-result').textContent = result;
}

function balancePanel() {
  const type = document.querySelector('input[name="panel-type"]:checked").value;
  const slots = parseInt(document.getElementById("panel-slots").value);
  const result = document.getElementById("panel-result");
  if (!slots || slots < 6) return result.textContent = "Нужно минимум 6 слотов для трёхфазных линий";

  const slotMap = new Array(slots).fill(null);
  let phaseLoad = { A: 0, B: 0, C: 0 };

  const slotPhase = slot => {
    const side = (slot + 1) % 2 === 0 ? 'R' : 'L';
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

  const output = slotMap.filter(Boolean).join("\n") +
    `\n\nНагрузка: A=${phaseLoad.A}А, B=${phaseLoad.B}А, C=${phaseLoad.C}А`;
  result.textContent = output;
}

window.onload = () => {
  renderLines();
  updateSelectors();
};
