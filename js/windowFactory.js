// js/windowFactory.js
import { wm } from "./windowManager.js";
import { componentManager } from "./componentManager.js";

export const windowFactory = {
  createLogsWindow() {
    const id = "logsWindow";
    const title = "Logs";
    const icon = "ico-logs";

    const html = `
      <div class="panel">
        <h2>System Logs</h2>
        <ul id="logList" class="loglist"></ul>
      </div>
    `;

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

    return win;
  },

  createNetWindow() {
    const id = "netWindow";
    const title = "Network";
    const icon = "ico-net";

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
    return win;
  },

  createRigWindow() {
    const id = "rigWindow";
    const title = "Mining Rig";
    const icon = "ico-rig";

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
    return win;
  },

  createTasksWindow() {
    const id = "tasksWindow";
    const title = "Tasks";
    const icon = "ico-tasks";

    const html = `
      <div class="panel">
        <h2>Active Tasks</h2>
        <ul id="taskList" class="list"></ul>
      </div>

      <div class="panel">
        <button id="addTaskBtn">Add Random Task</button>
      </div>
    `;

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
    return win;
  },

  createWalletWindow() {
    const id = "walletWindow";
    const title = "Wallet";
    const icon = "ico-wallet";

    const html = `
      <div class="panel">
        <h2>Wallet Overview</h2>
        <div class="row gap">
          <div class="card">
            <strong>Balance</strong>
            <div id="walletBalance">₵ 0</div>
          </div>
          <div class="card">
            <strong>Crypto Rate</strong>
            <div id="cryptoRateWin">/ชม. 0</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Recent Transactions</h3>
        <ul id="walletTxList" class="list"></ul>
      </div>
    `;

    const win = wm.createWindow(id, title, icon, html);
    const balanceEl = win.querySelector("#walletBalance");
    const rateEl = win.querySelector("#cryptoRateWin");
    const txList = win.querySelector("#walletTxList");
    const walletComponent = componentManager.getComponent("walletComponent");

    walletComponent.addListener((data) => {
      balanceEl.textContent = `₵ ${data.balance}`;
      rateEl.textContent = `/ชม. ${data.cryptoRate}`;

      txList.innerHTML = '';
      data.transactions.forEach(tx => {
        const li = document.createElement("li");
        li.textContent = `${tx.amount > 0 ? "+" : ""}₵ ${tx.amount} ${tx.type}`;
        txList.appendChild(li);
      });
    });

    walletComponent.notifyListeners();
    return win;
  },

  createTerminalWindow() {
    const id = "terminalWindow";
    const title = "Terminal";
    const icon = "ico-logs";

    const html = `
      <div class="console" id="terminalConsole">
        <div class="cmd-banner">Xea OS v1.0 Interactive Shell</div>
        <div id="terminalOutput"></div>
        <div class="input-line">
          <span class="prompt">C:\\User></span>
          <input type="text" id="terminalInput" class="terminal-input" autocomplete="off" spellcheck="false"/>
        </div>
      </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#terminal-styles')) {
      const terminalStyles = `
        .terminal-input {
          background: transparent;
          border: none;
          outline: none;
          color: #cccccc;
          font: 14px/1.35 Consolas, "Cascadia Mono", Menlo, Monaco, monospace;
          flex: 1;
          margin-left: 8px;
          caret-color: #0dbc79;
        }

        .input-line {
          display: flex;
          align-items: center;
          margin-top: 8px;
        }

        .command {
          color: #0dbc79;
        }

        .output {
          color: #bcbcbc;
          margin: 4px 0;
        }

        .error {
          color: #ff6b6b;
        }

        .success {
          color: #0dbc79;
        }

        .warning {
          color: #ffa726;
        }

        .ip-address {
          color: #4fc3f7;
          cursor: pointer;
          text-decoration: underline;
        }

        .ip-address:hover {
          color: #29b6f6;
        }
      `;

      const styleEl = document.createElement('style');
      styleEl.id = 'terminal-styles';
      styleEl.textContent = terminalStyles;
      document.head.appendChild(styleEl);
    }

    const win = wm.createWindow(id, title, icon, html);
    const output = win.querySelector("#terminalOutput");
    const input = win.querySelector("#terminalInput");

    let commandHistory = [];
    let historyIndex = -1;

    // Helper functions for formulas
    function hackingPower(cpu) {
      return 50 * Math.pow(1.12, cpu - 1);
    }

    function defensePoints(fw) {
      return 60 * Math.pow(1.13, fw - 1);
    }

    function calculateHackTime(playerRig) {
      const baseTime = 300;
      const cpuBonus = (playerRig.cpu || 1) * 10;
      const uplinkBonus = (playerRig.uplink || 1) * 5;
      return Math.max(120, baseTime - cpuBonus + uplinkBonus);
    }

    // Terminal commands
    const commands = {
      help: () => `Available commands:\n
- help: Show this help message
- clear: Clear terminal
- status: Show system status
- wallet: Show wallet balance
- logs [n]: Show recent logs (default: 5)
- net: Show network status
- rig: Show mining rig status
- time: Show current time
- echo [text]: Echo text back
- calc [expression]: Simple calculator
- scan [count]: Scan for network devices (default: 5)
- hack <ip>: Start hacking target IP address`,

      clear: () => {
        output.innerHTML = '';
        return '';
      },

      status: () => {
        const stats = window.GameAPI?.getStats();
        if (!stats) return 'Game system not available';

        return `System Status:
Level: ${stats.level}
XP: ${stats.xp}/${stats.need}
CPU: Lv.${stats.cpu} | RAM: Lv.${stats.ram} | Firewall: Lv.${stats.fw}
Mining Rate: ${stats.rate}/hour
Hacking Power: ${Math.floor(hackingPower(stats.cpu))}
Defense Points: ${Math.floor(defensePoints(stats.fw))}`;
      },

      wallet: () => {
        const wallet = window.GameAPI?.getWallet();
        return wallet !== undefined ? `Wallet Balance: ₵ ${wallet.toLocaleString()}` : 'Wallet not available';
      },

      logs: (args) => {
        const logs = window.GameAPI?.getLogs();
        if (!logs) return 'Log system not available';

        const count = parseInt(args[0]) || 5;
        const recentLogs = logs.slice(-count);

        if (recentLogs.length === 0) return 'No logs available';

        return recentLogs.map(log => log.msg).join('\n');
      },

      net: () => {
        const netComponent = componentManager.getComponent("netComponent");
        if (!netComponent) return 'Network component not available';

        const stats = netComponent.getCurrentStats();
        return `Network Status:
Download: ${stats.download} Mbps
Upload: ${stats.upload} Mbps
Ping: ${stats.ping} ms`;
      },

      rig: () => {
        const rigComponent = componentManager.getComponent("rigComponent");
        if (!rigComponent) return 'Rig component not available';

        const stats = rigComponent.getCurrentStats();
        return `Mining Rig:
GPU Temp: ${stats.gpuTemp}°C
Hash Rate: ${stats.hashRate} MH/s
Power: ${stats.powerUse} W`;
      },

      time: () => new Date().toLocaleString(),

      echo: (args) => args.join(' '),

      calc: (args) => {
        try {
          const expression = args.join(' ');
          // Safe evaluation
          const result = Function(`"use strict"; return (${expression})`)();
          return `${expression} = ${result}`;
        } catch (error) {
          return `Error: Invalid expression`;
        }
      },

      scan: (args) => {
        const hackingComponent = componentManager.getComponent("hackingComponent");
        if (!hackingComponent) return 'Hacking system not available';

        const count = parseInt(args[0]) || 5;
        const newIPs = hackingComponent.scanIPs(count);

        let result = `Network scan completed. Found ${newIPs.length} active devices:\n\n`;

        newIPs.forEach((ip, index) => {
          result += `${index + 1}. <span class="ip-address" data-ip="${ip}">${ip}</span>\n`;
        });

        result += `\nUse 'hack &lt;IP&gt;' to initiate intrusion. Click on IP to auto-fill.`;

        // Add click handlers for IP addresses
        setTimeout(() => {
          const ipElements = output.querySelectorAll('.ip-address');
          ipElements.forEach(el => {
            el.addEventListener('click', () => {
              const ip = el.getAttribute('data-ip');
              input.value = `hack ${ip}`;
              input.focus();
            });
          });
        }, 100);

        return result;
      },

      hack: (args) => {
        if (!args[0]) return 'Usage: hack <ip_address>\nExample: hack 192.168.1.1';

        const ip = args[0];
        // Validate IP format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) {
          return 'Error: Invalid IP address format';
        }

        const hackingComponent = componentManager.getComponent("hackingComponent");
        if (!hackingComponent) return 'Hacking system not available';

        const playerRig = window.GameAPI?.getStats();
        if (!playerRig) return 'Game system not available';

        // Check if IP is in discovered list
        if (!hackingComponent.discoveredIPs.includes(ip)) {
          return `Warning: IP ${ip} not found in scanned devices. Use 'scan' first.\nOr proceed anyway with 'hack ${ip} force'`;
        }

        // Check for force flag
        const force = args[1] === 'force';
        if (!force && !hackingComponent.discoveredIPs.includes(ip)) {
          return `IP ${ip} not found in scanned devices. Use 'scan' first or add 'force' to bypass.`;
        }

        // เปิด Hacking Window และเริ่ม Hack
        setTimeout(() => {
          wm.openWindow("hackingWindow");
          setTimeout(() => {
            if (hackingComponent && playerRig) {
              const success = hackingComponent.startHack(ip, playerRig);
              if (!success) {
                addOutput('Hacking session already in progress!', 'error');
              }
            }
          }, 500);
        }, 100);

        return `Initiating intrusion sequence on ${ip}...\nOpening Chimera Kit interface...\nSession time: ${calculateHackTime(playerRig)} seconds`;
      }
    };

    function executeCommand(inputText) {
      const [command, ...args] = inputText.trim().split(' ');
      const cmd = command.toLowerCase();

      // Add to history
      if (inputText.trim()) {
        commandHistory.push(inputText);
        historyIndex = commandHistory.length;
      }

      if (cmd === '') return '';

      if (commands[cmd]) {
        try {
          return commands[cmd](args);
        } catch (error) {
          return `Error executing command: ${error.message}`;
        }
      } else {
        return `Command not found: ${cmd}. Type 'help' for available commands.`;
      }
    }

    function addOutput(text, className = 'output') {
      const line = document.createElement('div');
      line.className = className;

      // Allow HTML for IP links
      if (className === 'output' && text.includes('<span')) {
        line.innerHTML = text;
      } else {
        line.textContent = text;
      }

      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function displayPrompt() {
      addOutput(`C:\\User> ${commandHistory[commandHistory.length - 1]}`, 'command');
    }

    // Handle input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const inputText = input.value;
        input.value = '';

        // Display the command
        displayPrompt();

        // Execute and display result
        const result = executeCommand(inputText);
        if (result) {
          const className = result.startsWith('Error:') ? 'error' :
                           result.startsWith('Warning:') ? 'warning' :
                           result.startsWith('Available commands:') ? 'output' :
                           result.startsWith('Usage:') ? 'output' : 'success';
          addOutput(result, className);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyIndex > 0) historyIndex--;
          input.value = commandHistory[historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          input.value = commandHistory[historyIndex] || '';
        } else {
          historyIndex = commandHistory.length;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Basic tab completion
        const inputText = input.value;
        const availableCommands = Object.keys(commands);
        const matching = availableCommands.filter(cmd => cmd.startsWith(inputText));

        if (matching.length === 1) {
          input.value = matching[0] + ' ';
        } else if (matching.length > 1) {
          addOutput('Possible completions: ' + matching.join(', '));
        }
      }
    });

    // Focus input when terminal is clicked
    win.addEventListener('click', () => {
      input.focus();
    });

    // Initial message
    addOutput('Type "help" for available commands', 'output');
    addOutput('Use "scan" to find network devices, then "hack <IP>" to intrude', 'output');
    input.focus();

    return win;
  }
};
