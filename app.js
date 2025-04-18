let lines = JSON.parse(localStorage.getItem('lines') || '[]');

const wireAmpacityTable = [
  { size: "14 AWG", ampacity: 25 },
  { size: "12 AWG", ampacity: 30 },
  { size: "10 AWG", ampacity: 35 },
  { size: "8 AWG", ampacity: 50 },
  { size: "6 AWG", ampacity: 65 },
  { size: "4 AWG", ampacity: 85 },
  { size: "3 AWG", ampacity: 100 },
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

function getWireSize(amps) {
  for (let i = 0; i < wireAmpacityTable.length; i++) {
    if (amps <= wireAmpacityTable[i].ampacity) {
      return wireAmpacityTable[i].size;
    }
  }
  return "больше 1000 MCM";
}

function addLine() {
  const name = document.getElementById('line-name').value;
  const amps = parseInt(document.getElementById('line-amps').value);
  const phase = document.querySelector('input[name="phase"]:checked').value;
  const neutral = document.getElementById('line-neutral').checked;

  if (!name || !amps) return alert("Заполни все поля");

  const wireSize = getWireSize(amps);
  const line = { name, amps, phase, neutral, wireSize };
  lines.push(line);
  localStorage.setItem('lines', JSON.stringify(lines));
  renderLines();
  updateSelectors();
}

function renderLines() {
  const container = document.getElementById('line-list');
  container.innerHTML = "";
  lines.forEach((line, i) => {
    const div = document.createElement("div");
    div.textContent = `${line.name}: ${line.amps}А, ${line.phase} фазы${line.neutral ? ", с нейтралью" : ""} → ${line.wireSize}`;
    container.appendChild(div);
  });
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('section-' + id).classList.remove('hidden');
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
  const conduitSize = parseFloat(document.getElementById('conduit-size').value);
  const count = selected.length * 2;
  let factor = 1.0;
  if (count > 3 && count <= 6) factor = 0.8;
  else if (count <= 9) factor = 0.7;
  else if (count <= 20) factor = 0.5;
  else factor = 0.45;

  let result = `Всего жил: ${count}, коэффициент дирейтинга: ${factor}
`;

  selected.forEach(line => {
    const baseAmps = line.amps / factor;
    const newSize = getWireSize(baseAmps);
    result += `Линия ${line.name}: требуется ${newSize}
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
  const rho = material === "copper" ? 0.00098 : 0.00162;

  const ampacityEntry = wireAmpacityTable.find(e => e.size === line.wireSize);
  const area = ampacityEntry ? ampacityEntry.ampacity / 3 : 1;

  const vd = (rho * length * 2 * line.amps) / area;
  const percent = (vd / voltage) * 100;
  let rec = "";
  if (percent > 3) {
    rec = " — превышено! Увеличь провод!";
  }

  document.getElementById('voltage-result').textContent =
    `Падение: ${vd.toFixed(2)} В (${percent.toFixed(2)}%)${rec}`;
}

function balancePanel() {
  const type = document.querySelector('input[name="panel-type"]:checked').value;
  const slots = parseInt(document.getElementById('panel-slots').value);
  const result = document.getElementById('panel-result');

  if (!slots || slots <= 0) {
    result.textContent = "Укажи количество слотов";
    return;
  }

  let phaseA = [], phaseB = [], phaseC = [];
  lines.forEach((line, i) => {
    if (type === "1") {
      if (i % 2 === 0) phaseA.push(line.name);
      else phaseB.push(line.name);
    } else {
      if (i % 3 === 0) phaseA.push(line.name);
      else if (i % 3 === 1) phaseB.push(line.name);
      else phaseC.push(line.name);
    }
  });

  let out = `A: ${phaseA.join(", ")}
B: ${phaseB.join(", ")}`;
  if (type === "3") out += `
C: ${phaseC.join(", ")}`;
  result.textContent = out;
}

window.onload = () => {
  renderLines();
  updateSelectors();
};