let lines = JSON.parse(localStorage.getItem('lines') || '[]');

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

function getWireSize(amps) {
  if (amps <= 25) return "14 AWG";
  if (amps <= 30) return "12 AWG";
  if (amps <= 35) return "10 AWG";
  if (amps <= 50) return "8 AWG";
  if (amps <= 65) return "6 AWG";
  if (amps <= 85) return "4 AWG";
  if (amps <= 100) return "3 AWG";
  if (amps <= 130) return "2 AWG";
  if (amps <= 150) return "1 AWG";
  if (amps <= 170) return "1/0 AWG";
  return "больше 1/0";
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
  const count = selected.length * 2;
  let factor = 1.0;
  if (count > 3 && count <= 6) factor = 0.8;
  else if (count <= 9) factor = 0.7;
  else if (count <= 20) factor = 0.5;
  else factor = 0.45;
  const result = `Всего жил: ${count}, коэффициент: ${factor}`;
  document.getElementById('derating-result').textContent = result;
}

function calculateVoltageDrop() {
  const index = document.getElementById('voltage-line').value;
  const line = lines[index];
  const material = document.getElementById('voltage-material').value;
  const length = parseFloat(document.getElementById('voltage-length').value);
  const voltage = parseFloat(document.getElementById('voltage-volts').value);
  const rho = material === "copper" ? 0.00098 : 0.00162;
  const area = 1; // Условно
  const vd = (rho * length * 2 * line.amps) / area;
  const percent = (vd / voltage) * 100;
  document.getElementById('voltage-result').textContent = `Падение: ${vd.toFixed(2)} В (${percent.toFixed(2)}%)`;
}

function balancePanel() {
  const type = document.querySelector('input[name="panel-type"]:checked').value;
  const slots = parseInt(document.getElementById('panel-slots').value);
  const result = document.getElementById('panel-result');
  if (!slots || slots <= 0) {
    result.textContent = "Укажи количество слотов";
    return;
  }
  result.textContent = `Балансировка фаз для ${slots} слотов в ${type}-фазной панели пока условная (будет позже точная).`;
}

window.onload = () => {
  renderLines();
  updateSelectors();
};