
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

  // Очистка полей
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

window.onload = () => {
  renderLines();
  updateSelectors();
};
