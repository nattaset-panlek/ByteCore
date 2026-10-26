// tasksWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "tasksWindow";
const title = "Tasks";
const icon = "ico-tasks";

// 👇 Register this window type
wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Active Tasks</h2>
    <ul id="taskList" class="list"></ul>
  </div>

  <div class="panel">
    <button id="addTaskBtn">Add Random Task</button>
  </div>
`;

if (document.readyState !== 'loading') {
  const win = wm.createWindow(id, title, icon, html);

  const list = win.querySelector("#taskList");
  const addBtn = win.querySelector("#addTaskBtn");
  const tasksComponent = componentManager.getComponent("tasksComponent");

  tasksComponent.addListener((tasks) => {
    list.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement("li");
      li.textContent = task.name;
      list.appendChild(li);
    });
  });

  addBtn.onclick = () => {
    const taskNames = ["Sync Wallet", "Network Scan", "Mine Batch", "Backup Logs", "System Clean"];
    const name = taskNames[Math.floor(Math.random() * taskNames.length)];
    tasksComponent.addTask(name);
  };

  tasksComponent.notifyListeners();
}