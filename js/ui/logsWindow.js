// logsWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "logsWindow";
const title = "Logs";
const icon = "ico-logs";

// 👇 Register this window type
wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>System Logs</h2>
    <ul id="logList" class="loglist"></ul>
  </div>
`;

// Only create window if not importing for registration
if (document.readyState !== 'loading') {
  const win = wm.createWindow(id, title, icon, html);
  const list = win.querySelector("#logList");
  const logsComponent = componentManager.getComponent("logsComponent");

  logsComponent.addListener((logs) => {
    list.innerHTML = '';
    logs.forEach(log => {
      const li = document.createElement("li");
      li.textContent = log.fullText;
      list.appendChild(li);
    });
  });

  const currentLogs = logsComponent.getLogs();
  currentLogs.forEach(log => {
    const li = document.createElement("li");
    li.textContent = log.fullText;
    list.appendChild(li);
  });
}
