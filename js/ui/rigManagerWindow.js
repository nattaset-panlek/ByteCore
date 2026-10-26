// js/ui/rigManagerWindow.js
import { wm } from "../windowManager.js";
import { componentManager } from "../componentManager.js";

const id = "rigManagerWindow";
const title = "Rig Manager";
const icon = "ico-rig";

wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Rig Configuration</h2>
    <div class="grid">
      <div class="card">
        <strong>Current Rig Stats</strong>
        <div id="rigStats">
          <div>CPU: Level <span id="cpuLevel">1</span></div>
          <div>RAM: Level <span id="ramLevel">1</span></div>
          <div>Network: Level <span id="netLevel">1</span></div>
          <div>Storage: Level <span id="storageLevel">1</span></div>
          <div>Firewall: Level <span id="fwLevel">1</span></div>
        </div>
      </div>
      <div class="card">
        <strong>Performance</strong>
        <div id="performanceStats">
          <div>Encryption Speed: <span id="encryptSpeed">100%</span></div>
          <div>Hack Duration: <span id="hackDuration">300s</span></div>
          <div>File Transfer: <span id="transferSpeed">100%</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="panel">
    <h3>Device Shop</h3>
    <div class="shop-tabs">
      <button class="tab-btn active" data-tab="cpu">CPU</button>
      <button class="tab-btn" data-tab="ram">RAM</button>
      <button class="tab-btn" data-tab="network">Network</button>
      <button class="tab-btn" data-tab="storage">Storage</button>
    </div>

    <div id="shopContent" class="shop-content">
      <!-- Shop items will be loaded here -->
    </div>
  </div>
`;

const rigManagerStyles = `
  .shop-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 15px;
    border-bottom: 1px solid var(--border);
  }

  .tab-btn {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }

  .tab-btn.active {
    border-bottom-color: var(--accent);
    color: var(--accent);
  }

  .shop-content {
    min-height: 200px;
  }

  .shop-item {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .shop-item-info h4 {
    margin: 0 0 5px 0;
  }

  .shop-item-info .specs {
    font-size: 0.9em;
    color: var(--muted);
  }

  .shop-item-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .price-tag {
    font-weight: bold;
    color: #69f0ae;
  }

  .owned-badge {
    background: var(--accent);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8em;
  }
`;

if (!document.querySelector('#rigmanager-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'rigmanager-styles';
  styleEl.textContent = rigManagerStyles;
  document.head.appendChild(styleEl);
}

function createRigManagerWindow() {
  const win = wm.createWindow(id, title, icon, html);
  const rigManager = componentManager.getComponent("rigManagerComponent");

  // Elements
  const cpuLevel = win.querySelector("#cpuLevel");
  const ramLevel = win.querySelector("#ramLevel");
  const netLevel = win.querySelector("#netLevel");
  const storageLevel = win.querySelector("#storageLevel");
  const fwLevel = win.querySelector("#fwLevel");
  const encryptSpeed = win.querySelector("#encryptSpeed");
  const hackDuration = win.querySelector("#hackDuration");
  const transferSpeed = win.querySelector("#transferSpeed");
  const shopContent = win.querySelector("#shopContent");
  const tabButtons = win.querySelectorAll(".tab-btn");

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadShopItems(btn.getAttribute('data-tab'));
    });
  });

  // Load shop items
  function loadShopItems(category) {
    const devices = rigManager.getAvailableDevices();
    const owned = rigManager.getOwnedDevices();
    const categoryDevices = devices[category] || [];

    shopContent.innerHTML = '';

    categoryDevices.forEach(device => {
      const item = document.createElement('div');
      item.className = 'shop-item';

      const isOwned = owned[category] === device.id;

      item.innerHTML = `
        <div class="shop-item-info">
          <h4>${device.name}</h4>
          <div class="specs">
            Level ${device.level} •
            ${category === 'cpu' ? `Performance: ${device.performance}x` : ''}
            ${category === 'ram' ? `Performance: ${device.performance}x` : ''}
            ${category === 'network' ? `Speed: ${device.speed}x` : ''}
            ${category === 'storage' ? `Capacity: ${device.capacity}x` : ''}
          </div>
        </div>
        <div class="shop-item-actions">
          <span class="price-tag">₵${device.price}</span>
          ${isOwned ?
            '<span class="owned-badge">Owned</span>' :
            `<button class="secondary buy-btn" data-category="${category}" data-id="${device.id}">Buy</button>`
          }
        </div>
      `;

      shopContent.appendChild(item);
    });

    // Add event listeners for buy buttons
    setTimeout(() => {
      const buyButtons = shopContent.querySelectorAll('.buy-btn');
      buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const category = btn.getAttribute('data-category');
          const deviceId = btn.getAttribute('data-id');
          if (rigManager.upgradeDevice(category, deviceId)) {
            loadShopItems(category);
          } else {
            alert('Not enough funds!');
          }
        });
      });
    }, 100);
  }

  // Update UI
  function updateUI() {
    const stats = rigManager.getRigStats();

    cpuLevel.textContent = stats.cpu;
    ramLevel.textContent = stats.ram;
    netLevel.textContent = stats.uplink;
    storageLevel.textContent = stats.storage;
    fwLevel.textContent = stats.firewall;

    // Calculate performance metrics
    const encryptSpeedVal = Math.round(100 + (stats.cpu - 1) * 25);
    const hackDurationVal = Math.max(120, 300 - (stats.cpu - 1) * 30 + (stats.uplink - 1) * 10);
    const transferSpeedVal = Math.round(100 + (stats.uplink - 1) * 40);

    encryptSpeed.textContent = `${encryptSpeedVal}%`;
    hackDuration.textContent = `${hackDurationVal}s`;
    transferSpeed.textContent = `${transferSpeedVal}%`;
  }

  // Listener for updates
  rigManager.addListener((data) => {
    updateUI();
  });

  // Initial load
  updateUI();
  loadShopItems('cpu');

  return win;
}

export { createRigManagerWindow };
