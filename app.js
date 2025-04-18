
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

function getWireCMA(size) {
  const entry = wireAmpacityTable.find(e => e.size === size);
  return entry ? entry.cma : 10000;
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

function calculateVoltageDrop() {
  const index = document.getElementById('voltage-line').value;
  const line = lines[index];
  const material = document.getElementById('voltage-material').value;
  const length = parseFloat(document.getElementById('voltage-length').value);
  const voltage = parseFloat(document.getElementById('voltage-volts').value);
  const k = material === "copper" ? 12.9 : 21.2;
  const cma = getWireCMA(line.wireSize);
  const vd = (2 * line.amps * length * k) / cma;
  const percent = (vd / voltage) * 100;
  document.getElementById('voltage-result').textContent =
    `Падение: ${vd.toFixed(2)} В (${percent.toFixed(2)}%)` + (percent > 3 ? " — Увеличь провод!" : "");
}

function balancePanel() {
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

window.onload = () => {
  renderLines();
  updateSelectors();
};
