
let lines = JSON.parse(localStorage.getItem('lines') || '[]');

const wireAmpacityTable = [
  { size: "14 AWG", ampacity: 25, area: 0.013 },
  { size: "12 AWG", ampacity: 30, area: 0.020 },
  { size: "10 AWG", ampacity: 35, area: 0.031 },
  { size: "8 AWG", ampacity: 50, area: 0.050 },
  { size: "6 AWG", ampacity: 65, area: 0.085 },
  { size: "4 AWG", ampacity: 85, area: 0.136 },
  { size: "3 AWG", ampacity: 100, area: 0.160 },
  { size: "2 AWG", ampacity: 130, area: 0.208 },
  { size: "1 AWG", ampacity: 150, area: 0.262 },
  { size: "1/0", ampacity: 170, area: 0.330 },
  { size: "2/0", ampacity: 195, area: 0.384 },
  { size: "3/0", ampacity: 225, area: 0.460 },
  { size: "4/0", ampacity: 260, area: 0.554 },
  { size: "250 MCM", ampacity: 290, area: 0.677 },
  { size: "300 MCM", ampacity: 320, area: 0.777 },
  { size: "350 MCM", ampacity: 350, area: 0.877 },
  { size: "400 MCM", ampacity: 380, area: 0.977 },
  { size: "500 MCM", ampacity: 430, area: 1.177 },
  { size: "600 MCM", ampacity: 475, area: 1.382 },
  { size: "700 MCM", ampacity: 520, area: 1.586 },
  { size: "750 MCM", ampacity: 535, area: 1.683 },
  { size: "800 MCM", ampacity: 555, area: 1.780 },
  { size: "900 MCM", ampacity: 585, area: 1.975 },
  { size: "1000 MCM", ampacity: 615, area: 2.170 }
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

function calculateDerating() {
  const selected = Array.from(document.getElementById('derating-lines').selectedOptions).map(o => lines[o.value]);
  const count = selected.length * 2;
  let factor = 1.0;
  if (count > 3 && count <= 6) factor = 0.8;
  else if (count <= 9) factor = 0.7;
  else if (count <= 20) factor = 0.5;
  else factor = 0.45;

  const type = document.getElementById('conduit-type').value;
  const size = document.getElementById('conduit-size').value;
  const maxFill = conduitFillTable[type]?.[size] || 1;
  let totalArea = 0;
  selected.forEach(line => totalArea += getWireArea(line.wireSize) * 2);

  const fillPercent = ((totalArea / maxFill) * 100).toFixed(1);
  const fillStatus = fillPercent <= 100 ? "OK" : "ПЕРЕПОЛНЕНО";

  let result = `Жил: ${count}, коэфф: ${factor}
${type} ${size}": макс. ${maxFill} in³, нужно: ${totalArea.toFixed(3)} in³ (${fillPercent}%) → ${fillStatus}
`;

  selected.forEach(line => {
    const newSize = getWireSize(line.amps / factor);
    result += `${line.name}: был ${line.wireSize} → нужен ${newSize}
`;
  });

  document.getElementById('derating-result').textContent = result;
}


function calculateVoltageDrop() {
  const index = document.getElementById('voltage-line').value;
  const line = lines[index];
  const material = document.getElementById('voltage-material').value;
  const length = parseFloat(document.getElementById('voltage-length').value);
  const voltage = parseFloat(document.getElementById('voltage-volts').value);
  const k = material === "copper" ? 12.9 : 21.2;

  const cmaTable = {
    "14 AWG": 4110, "12 AWG": 6530, "10 AWG": 10380, "8 AWG": 16510,
    "6 AWG": 26240, "4 AWG": 41740, "3 AWG": 52620, "2 AWG": 66360,
    "1 AWG": 83690, "1/0": 105500, "2/0": 133100, "3/0": 167800, "4/0": 211600,
    "250 MCM": 250000, "300 MCM": 300000, "350 MCM": 350000,
    "400 MCM": 400000, "500 MCM": 500000, "600 MCM": 600000,
    "700 MCM": 700000, "750 MCM": 750000, "800 MCM": 800000,
    "900 MCM": 900000, "1000 MCM": 1000000
  };

  const cma = cmaTable[line.wireSize] || 10000;
  const vd = (2 * line.amps * length * k) / cma;
  const percent = (vd / voltage) * 100;

  document.getElementById('voltage-result').textContent =
    `Падение: ${vd.toFixed(2)} В (${percent.toFixed(2)}%)` + (percent > 3 ? " — Увеличь провод!" : "");
}

 {
  const type = document.querySelector('input[name="panel-type"]:checked').value;
  const slots = parseInt(document.getElementById('panel-slots').value);
  const result = document.getElementById('panel-result');
  if (!slots || slots <= 0) return result.textContent = "Укажи количество слотов";

  let phaseA = [], phaseB = [], phaseC = [];
  let totalA = 0, totalB = 0, totalC = 0;

  const sortedLines = [...lines].sort((a, b) => b.amps - a.amps);

  sortedLines.forEach((line) => {
    if (type === "1") {
      if (totalA <= totalB) {
        phaseA.push(line.name);
        totalA += line.amps;
      } else {
        phaseB.push(line.name);
        totalB += line.amps;
      }
    } else {
      if (totalA <= totalB && totalA <= totalC) {
        phaseA.push(line.name);
        totalA += line.amps;
      } else if (totalB <= totalC) {
        phaseB.push(line.name);
        totalB += line.amps;
      } else {
        phaseC.push(line.name);
        totalC += line.amps;
      }
    }
  });

  let out = `Фаза A (${totalA}А): ${phaseA.join(", ")}
Фаза B (${totalB}А): ${phaseB.join(", ")}`;
  if (type === "3") out += `
Фаза C (${totalC}А): ${phaseC.join(", ")}`;
  result.textContent = out;
}
 {
  const type = document.querySelector('input[name="panel-type"]:checked').value;
  const slots = parseInt(document.getElementById('panel-slots').value);
  const result = document.getElementById('panel-result');
  if (!slots || slots <= 0) return result.textContent = "Укажи количество слотов";

  let a = [], b = [], c = [];
  lines.forEach((line, i) => {
    if (type === "1") {
      (i % 2 === 0 ? a : b).push(line.name);
    } else {
      if (i % 3 === 0) a.push(line.name);
      else if (i % 3 === 1) b.push(line.name);
      else c.push(line.name);
    }
  });

  let out = `Фаза A: ${a.join(", ")}
Фаза B: ${b.join(", ")}`;
  if (type === "3") out += `
Фаза C: ${c.join(", ")}`;
  out += `
Слоты: ${lines.map((l, i) => i + 1 + ": " + l.name).join(", ")}`;
  result.textContent = out;
}

window.onload = () => {
  renderLines();
  updateSelectors();
};
