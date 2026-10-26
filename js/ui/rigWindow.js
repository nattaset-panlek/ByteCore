// rigWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "rigWindow";
const title = "Mining Rig";
const icon = "ico-rig";

// 👇 Register this window type
wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Rig Status</h2>
    <div class="grid">
      <div class="card"><strong>GPU Temp</strong><div id="gpuTemp">0°C</div></div>
      <div class="card"><strong>Hash Rate</strong><div id="hashRate">0 MH/s</div></div>
      <div class="card"><strong>Power Usage</strong><div id="powerUse">0 W</div></div>
    </div>
  </div>

  <div class="panel">
    <h3>Activity Log</h3>
    <ul id="rigActivity" class="list"></ul>
  </div>
`;

if (document.readyState !== 'loading') {
  const win = wm.createWindow(id, title, icon, html);

  const gpuTemp = win.querySelector("#gpuTemp");
  const hashRate = win.querySelector("#hashRate");
  const powerUse = win.querySelector("#powerUse");
  const act = win.querySelector("#rigActivity");
  const rigComponent = componentManager.getComponent("rigComponent");

  rigComponent.addListener((data) => {
    const { current, activity } = data;
    
    gpuTemp.textContent = `${current.gpuTemp}°C`;
    hashRate.textContent = `${current.hashRate} MH/s`;
    powerUse.textContent = `${current.powerUse} W`;
    
    act.innerHTML = '';
    activity.forEach(msg => {
      const li = document.createElement("li");
      li.textContent = msg;
      act.appendChild(li);
    });
  });

  rigComponent.notifyListeners();
}