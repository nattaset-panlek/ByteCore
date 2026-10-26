// netWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "netWindow";
const title = "Network";
const icon = "ico-net";

// 👇 Register this window type
wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Network Monitor</h2>
    <div class="grid">
      <div class="card"><strong>Download</strong><div id="netDown">0 Mbps</div></div>
      <div class="card"><strong>Upload</strong><div id="netUp">0 Mbps</div></div>
      <div class="card"><strong>Latency</strong><div id="netPing">0 ms</div></div>
    </div>
  </div>

  <div class="panel">
    <h3>History</h3>
    <ul id="netHistory" class="list"></ul>
  </div>
`;

if (document.readyState !== 'loading') {
  const win = wm.createWindow(id, title, icon, html);

  const downEl = win.querySelector("#netDown");
  const upEl = win.querySelector("#netUp");
  const pingEl = win.querySelector("#netPing");
  const hist = win.querySelector("#netHistory");
  const netComponent = componentManager.getComponent("netComponent");

  netComponent.addListener((data) => {
    const { current, history } = data;
    
    downEl.textContent = `${current.download} Mbps`;
    upEl.textContent = `${current.upload} Mbps`;
    pingEl.textContent = `${current.ping} ms`;
    
    hist.innerHTML = '';
    history.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `↓ ${entry.down} Mbps  ↑ ${entry.up} Mbps  Ping ${entry.ping} ms`;
      hist.appendChild(li);
    });
  });

  netComponent.notifyListeners();
}