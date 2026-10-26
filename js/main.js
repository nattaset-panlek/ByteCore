// js/main.js
import { wm } from "./windowManager.js";
import { componentManager } from "./componentManager.js";
import { windowFactory } from "./windowFactory.js";

// Import components
import "./components/logsComponent.js";
import "./components/netComponent.js";
import "./components/rigComponent.js";
import "./components/tasksComponent.js";
import "./components/walletComponent.js";
import "./components/hackingComponent.js";
import "./components/rigManagerComponent.js";

// Import UI windows
import { createProfileWindow } from "./ui/profileWindow.js";
import { createHackingWindow } from "./ui/hackingWindow.js";
import { createRigManagerWindow } from "./ui/rigManagerWindow.js";

// Import game system
import { wireGameUI, renderClock } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  // Start all components
  componentManager.startAllComponents();
  wireGameUI();
  renderClock();

  // Register windows
  wm.registerWindow("logsWindow", "System Logs", "ico-logs", () => windowFactory.createLogsWindow());
  wm.registerWindow("netWindow", "Network Monitor", "ico-net", () => windowFactory.createNetWindow());
  wm.registerWindow("rigWindow", "Mining Rig", "ico-rig", () => windowFactory.createRigWindow());
  wm.registerWindow("tasksWindow", "Task Manager", "ico-tasks", () => windowFactory.createTasksWindow());
  wm.registerWindow("walletWindow", "Crypto Wallet", "ico-wallet", () => windowFactory.createWalletWindow());
  wm.registerWindow("terminalWindow", "Terminal", "ico-logs", () => windowFactory.createTerminalWindow());
  wm.registerWindow("profileWindow", "Profile", "ico-win", () => createProfileWindow());
  wm.registerWindow("hackingWindow", "Chimera Kit", "ico-net", () => createHackingWindow());
  wm.registerWindow("rigManagerWindow", "Rig Manager", "ico-rig", () => createRigManagerWindow());

  // Start menu
  const startBtn = document.querySelector(".start");
  let menu = null;

  startBtn.addEventListener("click", () => {
    if (menu) {
      menu.remove();
      menu = null;
      return;
    }

    menu = document.createElement("div");
    menu.style.position = "fixed";
    menu.style.bottom = "60px";
    menu.style.left = "10px";
    menu.style.background = "rgba(255,255,255,0.95)";
    menu.style.border = "1px solid var(--border)";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
    menu.style.padding = "8px";
    menu.style.minWidth = "200px";
    menu.style.zIndex = "3000";

    const registeredWindows = wm.getRegisteredWindows();

    // Add window items to menu
    for (const [id, windowInfo] of registeredWindows) {
      const item = document.createElement("div");
      item.style.padding = "6px 10px";
      item.style.cursor = "pointer";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.innerHTML = `<svg class="ico"><use href="#${windowInfo.iconId}"/></svg> <span>${windowInfo.title}</span>`;
      item.onmouseenter = () => (item.style.background = "#eaf3ff");
      item.onmouseleave = () => (item.style.background = "transparent");
      item.onclick = () => {
        wm.openWindow(id);
        menu.remove();
        menu = null;
      };
      menu.appendChild(item);
    }

    // Add separator
    const separator = document.createElement("div");
    separator.style.height = "1px";
    separator.style.background = "var(--border)";
    separator.style.margin = "4px 0";
    menu.appendChild(separator);

    // Add power options
    const powerOff = document.createElement("div");
    powerOff.style.padding = "6px 10px";
    powerOff.style.cursor = "pointer";
    powerOff.style.display = "flex";
    powerOff.style.alignItems = "center";
    powerOff.style.gap = "8px";
    powerOff.style.color = "var(--danger)";
    powerOff.innerHTML = `<svg class="ico"><use href="#ico-close"/></svg> <span>Shutdown</span>`;
    powerOff.onmouseenter = () => (powerOff.style.background = "#ffeaea");
    powerOff.onmouseleave = () => (powerOff.style.background = "transparent");
    powerOff.onclick = () => {
      if (confirm("Are you sure you want to shutdown Xea OS?")) {
        document.body.innerHTML = "<div style='display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #fff; font-family: monospace;'>Xea OS - Shutting down...</div>";
      }
    };
    menu.appendChild(powerOff);

    document.body.appendChild(menu);
  });

  // Close menu when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (menu && !startBtn.contains(e.target) && !menu.contains(e.target)) {
      menu.remove();
      menu = null;
    }
  });

  // Auto-open some windows on first load
  setTimeout(() => {
    wm.openWindow("profileWindow");
    wm.openWindow("rigWindow");

    // Add some initial tasks for demonstration
    setTimeout(() => {
      const tasksComponent = componentManager.getComponent("tasksComponent");
      if (tasksComponent) {
        tasksComponent.addTask("Chimera Kit", "user", 5.2, 25, "Network intrusion toolkit");
        tasksComponent.addTask("Terminal", "user", 2.1, 15, "Command line interface");
      }
    }, 1000);
  }, 500);

  // Initialize some discovered IPs for demonstration
  // ในส่วน start() ของ main.js - เพิ่ม initialization
  setTimeout(() => {
      const hackingComponent = componentManager.getComponent("hackingComponent");
      if (hackingComponent) {
          // เริ่มต้นด้วย fileSystem เป็น null
          hackingComponent.fileSystem = null;
          hackingComponent.scanIPs(3);
      }
  }, 2000);

  // Add global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      wm.openWindow("logsWindow");
    }
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      wm.openWindow("terminalWindow");
    }
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      wm.openWindow("rigManagerWindow");
    }
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      wm.openWindow("hackingWindow");
    }
  });

  // Show welcome message
  setTimeout(() => {
    const logsComponent = componentManager.getComponent("logsComponent");
    if (logsComponent) {
      logsComponent.addLog("Xea OS initialized successfully");
      logsComponent.addLog("System ready for operation");
      logsComponent.addLog("Type 'help' in Terminal for available commands");
    }
  }, 1000);
});
