// js/ui/hackingWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "hackingWindow";
const title = "Chimera Kit";
const icon = "ico-net";

wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Chimera Kit - Network Intrusion</h2>
    <div class="grid">
      <div class="card">
        <strong>Target IP</strong>
        <input type="text" id="targetIP" placeholder="192.168.1.1" style="width: 100%; padding: 8px; margin: 5px 0;">
        <button id="btnStartEncrypt" class="secondary">Start Encryption</button>
      </div>
      <div class="card">
        <strong>Encryption Progress</strong>
        <div id="encryptTimer" style="display: none;">01:00</div>
        <div id="encryptProgress" style="width: 100%; height: 8px; background: #333; margin: 5px 0; display: none;">
          <div id="encryptProgressBar" style="height: 100%; background: #4fc3f7; width: 0%;"></div>
        </div>
        <strong>Session Timer</strong>
        <div id="hackTimer">05:00</div>
        <div id="hackProgress" style="width: 100%; height: 8px; background: #333; margin: 5px 0;">
          <div id="hackProgressBar" style="height: 100%; background: #0dbc79; width: 100%;"></div>
        </div>
        <button id="btnDisconnect" class="danger" disabled>Emergency Disconnect</button>
      </div>
    </div>
  </div>

  <div class="panel" id="fileExplorerPanel" style="display: none;">
    <h3>Remote File System - <span id="currentPath">/</span></h3>
    <div class="file-explorer">
      <div class="file-toolbar">
        <button id="btnBack" class="secondary">← Back</button>
        <button id="btnRefresh" class="secondary">Refresh</button>
        <span id="connectionStatus" style="margin-left: auto; color: #0dbc79;">● Connected</span>
      </div>
      <div id="fileList" class="file-list" style="height: 200px; overflow-y: auto; border: 1px solid var(--border); padding: 10px;">
        <!-- ไฟล์และโฟลเดอร์จะแสดงที่นี่ -->
      </div>
    </div>
  </div>

  <div class="panel" id="stolenFilesPanel">
    <h3>Acquired Files</h3>
    <div class="row" style="margin-bottom: 10px;">
      <span>Total Value: ₵<span id="totalValue">0</span></span>
      <button id="btnSellAll" class="secondary" style="margin-left: auto;">Sell All</button>
    </div>
    <ul id="stolenFilesList" class="list">
      <li style="color: var(--muted);">No files acquired yet</li>
    </ul>
  </div>

  <div class="panel" id="actionLogPanel">
    <h3>Action Log</h3>
    <div id="actionLog" style="height: 100px; overflow-y: auto; background: #1a1a1a; color: #ccc; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">
      <!-- Action logs will appear here -->
    </div>
  </div>
`;

// เพิ่ม CSS สำหรับ File Explorer
const hackingStyles = `
  .file-list {
    background: #1a1a1a;
    color: #fff;
    font-family: 'Consolas', monospace;
    border-radius: 4px;
    padding: 10px;
  }

  .file-item {
    padding: 8px;
    margin: 2px 0;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s;
  }

  .file-item:hover {
    background: #2a2a2a;
  }

  .file-item.folder {
    color: #4fc3f7;
  }

  .file-item.file {
    color: #69f0ae;
  }

  .file-size {
    color: #b0bec5;
    font-size: 0.8em;
    margin-left: auto;
  }

  .file-rarity-common { color: #69f0ae; }
  .file-rarity-rare { color: #448aff; }
  .file-rarity-epic { color: #e040fb; }
  .file-rarity-legendary { color: #ffab00; }

  .context-menu {
    position: fixed;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    min-width: 120px;
  }

  .context-menu-item {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 2px;
    color: #fff;
  }

  .context-menu-item:hover {
    background: #3d3d3d;
  }

  .loading {
    color: #ffa726;
    font-style: italic;
  }

  .action-log-entry {
    margin: 2px 0;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .log-success { color: #69f0ae; }
  .log-warning { color: #ffa726; }
  .log-error { color: #ff6b6b; }
  .log-info { color: #4fc3f7; }

  .encrypting {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }
`;

// เพิ่ม Styles
if (!document.querySelector('#hacking-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'hacking-styles';
  styleEl.textContent = hackingStyles;
  document.head.appendChild(styleEl);
}

function createHackingWindow() {
  const win = wm.createWindow(id, title, icon, html);
  const hackingComponent = componentManager.getComponent("hackingComponent");
  let contextMenu = null;
  let currentActionLoading = null;

  // Elements
  const targetIP = win.querySelector("#targetIP");
  const btnStartEncrypt = win.querySelector("#btnStartEncrypt");
  const btnDisconnect = win.querySelector("#btnDisconnect");
  const encryptTimer = win.querySelector("#encryptTimer");
  const encryptProgress = win.querySelector("#encryptProgress");
  const encryptProgressBar = win.querySelector("#encryptProgressBar");
  const hackTimer = win.querySelector("#hackTimer");
  const hackProgressBar = win.querySelector("#hackProgressBar");
  const fileExplorerPanel = win.querySelector("#fileExplorerPanel");
  const currentPath = win.querySelector("#currentPath");
  const fileList = win.querySelector("#fileList");
  const btnBack = win.querySelector("#btnBack");
  const btnRefresh = win.querySelector("#btnRefresh");
  const connectionStatus = win.querySelector("#connectionStatus");
  const stolenFilesList = win.querySelector("#stolenFilesList");
  const totalValue = win.querySelector("#totalValue");
  const btnSellAll = win.querySelector("#btnSellAll");
  const actionLog = win.querySelector("#actionLog");

  // อัพเดท IP ที่ค้นพบแล้ว
  if (hackingComponent.discoveredIPs.length > 0) {
    targetIP.placeholder = hackingComponent.discoveredIPs[0];
  }

  // Add action log
  function addActionLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `action-log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    actionLog.appendChild(entry);
    actionLog.scrollTop = actionLog.scrollHeight;
  }

  // Start Encryption
  btnStartEncrypt.addEventListener('click', () => {
    const ip = targetIP.value.trim();
    if (!ip) return alert('Please enter target IP address');

    const rigManager = componentManager.getComponent("rigManagerComponent");
    const playerRig = rigManager ? rigManager.getRigStats() : { cpu: 1, uplink: 1 };

    const hackingComponent = componentManager.getComponent("hackingComponent");
    if (hackingComponent.startEncryption(ip, playerRig)) {
      btnStartEncrypt.disabled = true;
      encryptTimer.style.display = 'block';
      encryptProgress.style.display = 'block';
      addActionLog(`Starting encryption on ${ip}...`, 'info');
      addActionLog(`Encryption time: ${hackingComponent.encryptTime}s (CPU Level ${playerRig.cpu})`, 'info');
    }
  });

  // Emergency Disconnect
  btnDisconnect.addEventListener('click', () => {
    hackingComponent.endHack(true);
    fileExplorerPanel.style.display = 'none';
    btnStartEncrypt.disabled = false;
    btnDisconnect.disabled = true;
    encryptTimer.style.display = 'none';
    encryptProgress.style.display = 'none';
    addActionLog('Disconnected from target', 'warning');
  });

  // File Explorer Navigation
  btnBack.addEventListener('click', () => {
    const currentPath = hackingComponent.fileSystem.currentPath;
    if (currentPath.length > 1) {
      hackingComponent.navigateTo(currentPath.slice(1, -1));
      addActionLog(`Navigated to /${hackingComponent.fileSystem.currentPath.slice(1).join('/')}`, 'info');
    }
  });

  btnRefresh.addEventListener('click', () => {
    renderFileExplorer();
    addActionLog('Refreshed file list', 'info');
  });

  // Render File Explorer
  function renderFileExplorer() {
      const folder = hackingComponent.getCurrentFolder();
      if (!folder) {
          fileList.innerHTML = '<div class="file-item" style="color: #ffa726;">⏳ Loading file system...</div>';
          return;
      }

      currentPath.textContent = '/' + hackingComponent.fileSystem.currentPath.slice(1).join('/');

      fileList.innerHTML = '';

      folder.forEach(item => {
      const fileItem = document.createElement('div');
      fileItem.className = `file-item ${item.type}`;

      const icon = item.type === 'folder' ? '📁' : '📄';
      const size = item.type === 'file' ? `<span class="file-size">${item.size} MB</span>` : '';
      const rarityClass = item.type === 'file' ? `file-rarity-${item.rarity}` : '';

      fileItem.innerHTML = `
        <span>${icon}</span>
        <span class="file-name ${rarityClass}">${item.name}</span>
        ${size}
      `;

      fileItem.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;

        if (item.type === 'folder') {
          hackingComponent.navigateTo([...hackingComponent.fileSystem.currentPath.slice(1), item.name]);
          addActionLog(`Opened folder: ${item.name}`, 'info');
        } else {
          showContextMenu(e, item);
        }
      });

      // Double click สำหรับไฟล์
      fileItem.addEventListener('dblclick', () => {
        if (item.type === 'folder') {
          hackingComponent.navigateTo([...hackingComponent.fileSystem.currentPath.slice(1), item.name]);
          addActionLog(`Opened folder: ${item.name}`, 'info');
        } else {
          performFileAction(item.name, 'open');
        }
      });

      fileList.appendChild(fileItem);
    });
  }

  // Context Menu สำหรับไฟล์
  function showContextMenu(event, file) {
    // ลบ context menu เก่าถ้ามี
    if (contextMenu) {
      contextMenu.remove();
    }

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = event.clientX + 'px';
    contextMenu.style.top = event.clientY + 'px';

    const actions = [
      { name: 'Open', action: 'open' },
      { name: 'Copy', action: 'copy' },
      { name: 'Cut', action: 'cut' },
      { name: 'Download', action: 'download' },
      { name: 'Remove', action: 'remove' }
    ];

    actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'context-menu-item';
      item.textContent = action.name;
      item.addEventListener('click', () => {
        performFileAction(file.name, action.action);
        contextMenu.remove();
        contextMenu = null;
      });
      contextMenu.appendChild(item);
    });

    document.body.appendChild(contextMenu);

    // ปิด context menu เมื่อคลิก其他地方
    setTimeout(() => {
      const closeHandler = () => {
        if (contextMenu) {
          contextMenu.remove();
          contextMenu = null;
        }
        document.removeEventListener('click', closeHandler);
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  // Perform File Action
  function performFileAction(fileName, action) {
    if (currentActionLoading) return;

    const rigManager = componentManager.getComponent("rigManagerComponent");
    const playerRig = rigManager ? rigManager.getRigStats() : { cpu: 1, uplink: 1 };

    const result = hackingComponent.performFileAction(fileName, action, playerRig);
    if (result && result.success) {
      // แสดง loading
      currentActionLoading = fileName;
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'file-item loading';
      loadingMsg.innerHTML = `⏳ Performing ${action}... (${result.time}s)`;
      fileList.appendChild(loadingMsg);

      addActionLog(`${action.charAt(0).toUpperCase() + action.slice(1)}ing ${fileName}... (${result.time}s)`, 'info');

      setTimeout(() => {
        loadingMsg.remove();
        currentActionLoading = null;

        if (action === 'download' || action === 'copy' || action === 'cut') {
          updateStolenFilesList();
          addActionLog(`Successfully ${action}ed ${fileName} (+₵${result.value})`, 'success');
        }

        if (action === 'remove') {
          addActionLog(`Removed ${fileName} (Value increased)`, 'warning');
        }

        if (action === 'open') {
          addActionLog(`Opened ${fileName}`, 'info');
        }

        renderFileExplorer();
      }, result.time * 1000);
    }
  }

  // อัพเดทรายการไฟล์ที่ขโมยมา
  function updateStolenFilesList() {
    const stolenFiles = hackingComponent.stolenFiles;
    stolenFilesList.innerHTML = '';

    let total = 0;

    if (stolenFiles.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No files acquired yet';
      li.style.color = 'var(--muted)';
      stolenFilesList.appendChild(li);
      totalValue.textContent = '0';
      btnSellAll.disabled = true;
      return;
    }

    stolenFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="row">
          <span><strong>${file.name}</strong></span>
          <span class="file-rarity-${file.rarity}">${file.rarity.toUpperCase()}</span>
        </div>
        <div class="row">
          <span>${file.size} MB</span>
          <span>₵${file.value}</span>
          <button class="secondary sell-btn" data-index="${index}">Sell</button>
        </div>
      `;
      stolenFilesList.appendChild(li);
      total += file.value;
    });

    totalValue.textContent = total;
    btnSellAll.disabled = false;

    // Add event listeners for sell buttons
    setTimeout(() => {
      const sellButtons = stolenFilesList.querySelectorAll('.sell-btn');
      sellButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          const value = hackingComponent.sellFile(index);
          if (value > 0) {
            addActionLog(`Sold file for ₵${value}`, 'success');
            if (window.GameAPI && window.GameAPI.addLog) {
              window.GameAPI.addLog(`SOLD file for ₵${value}`);
            }
          }
          updateStolenFilesList();
        });
      });
    }, 100);
  }

  // Sell All Files
  btnSellAll.addEventListener('click', () => {
    const stolenFiles = hackingComponent.stolenFiles;
    let totalEarned = 0;

    stolenFiles.forEach(file => {
      totalEarned += file.value;
    });

    hackingComponent.stolenFiles = [];
    updateStolenFilesList();

    addActionLog(`Sold all files for ₵${totalEarned}`, 'success');
    if (window.GameAPI && window.GameAPI.addLog) {
      window.GameAPI.addLog(`SOLD ALL files for ₵${totalEarned}`);
    }
  });

  // Listener สำหรับอัพเดท UI
  hackingComponent.addListener((data) => {
      // อัพเดท Encryption Timer
      if (data.isEncrypting) {
          const encryptMinutes = Math.floor(data.encryptRemaining / 60);
          const encryptSeconds = data.encryptRemaining % 60;
          encryptTimer.textContent = `${encryptMinutes.toString().padStart(2, '0')}:${encryptSeconds.toString().padStart(2, '0')}`;

          const encryptProgressPercent = ((data.encryptTime - data.encryptRemaining) / data.encryptTime) * 100;
          encryptProgressBar.style.width = `${encryptProgressPercent}%`;

          connectionStatus.textContent = '● Encrypting...';
          connectionStatus.style.color = '#4fc3f7';
          connectionStatus.classList.add('encrypting');
      }

      // อัพเดท Hack Timer
      const minutes = Math.floor(data.timeRemaining / 60);
      const seconds = data.timeRemaining % 60;
      hackTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // อัพเดท Progress Bar
      const progress = (data.timeRemaining / data.totalTime) * 100;
      hackProgressBar.style.width = `${progress}%`;

      // เปลี่ยนสีเมื่อเวลาใกล้หมด
      if (progress < 20) {
          hackProgressBar.style.background = '#ff6b6b';
      } else if (progress < 50) {
          hackProgressBar.style.background = '#ffa726';
      } else {
          hackProgressBar.style.background = '#0dbc79';
      }

      // แสดง File Explorer เมื่อ Encryption เสร็จและมี fileSystem
      if (data.isHacking && data.fileSystem) {
          fileExplorerPanel.style.display = 'block';
          btnDisconnect.disabled = false;
          connectionStatus.textContent = '● Connected';
          connectionStatus.style.color = '#0dbc79';
          connectionStatus.classList.remove('encrypting');
          renderFileExplorer();
          addActionLog('Encryption complete! Access granted to file system.', 'success');
      }

      // อัพเดท stolen files
      updateStolenFilesList();

      // แสดง warning เมื่อเวลาใกล้หมด
      if (data.timeRemaining === 30) {
          addActionLog('Warning: 30 seconds remaining!', 'warning');
      } else if (data.timeRemaining === 10) {
          addActionLog('Critical: 10 seconds remaining! Disconnect soon!', 'error');
      }
  });

  // Initial action log
  addActionLog('Chimera Kit initialized. Ready for network intrusion.', 'info');

  return win;
}

export { createHackingWindow };
