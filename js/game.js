// js/game.js
const $ = (q) => document.querySelector(q);
const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.floor(n));
const now = () => Date.now();
const HOUR = 3600_000;

// ===== RPG Formulas =====
const miningRate = (cpu) => 10 * Math.pow(1.15, cpu - 1);
const hackingPower = (cpu) => 50 * Math.pow(1.12, cpu - 1);
const defensePoints = (fw) => 60 * Math.pow(1.13, fw - 1);
const concurrentTasks = (ram) => 1 + ram;
const upgradeCost = (base, lvl) => Math.round(base * Math.pow(1.25, lvl - 1));
const xpToNext = (lv) => Math.round(100 * Math.pow(1.2, lv - 1));
const OFFLINE_CAP_HRS = 8;

const BASE_COST = { cpu: 100, ram: 150, fw: 120, st: 80, up: 90 };

// PVE Targets - MMO RPG Style
const PVE_TARGETS = [
  { id: 'small_bank', name: 'Small Corporate Bank', seconds: 40, difficulty: 1000, rewards: { crypto: 220, xp: 35 },hackingGame: true },
  { id: 'shop_network', name: 'Local Shop Network', seconds: 20, difficulty: 500, rewards: { crypto: 110, xp: 18 } },
  { id: 'data_center', name: 'Corporate Data Center', seconds: 75, difficulty: 2000, rewards: { crypto: 500, xp: 70 } },
  { id: 'gov_server', name: 'Government Server', seconds: 120, difficulty: 5000, rewards: { crypto: 1200, xp: 150 } },
  { id: 'mega_corp', name: 'Mega Corporation HQ', seconds: 180, difficulty: 10000, rewards: { crypto: 2500, xp: 300 } }
];

// ===== RPG State =====
const STORAGE_KEY = 'chimera_mmo_save';
let S = load();

function defaultState() {
  return {
    createdAt: now(),
    lastLoginAt: now(),
    lastProcessedAt: now(),
    wallet: 0,
    uncollected: 0,
    player: {
      level: 1,
      xp: 0,
      reputation: 0,
      skills: {
        hacking: 1,
        stealth: 1,
        analysis: 1
      }
    },
    rig: { cpu: 1, ram: 1, fw: 1, st: 1, up: 1 },
    tasks: [],
    logs: [],
    achievements: [],
    discoveredTargets: ['small_bank', 'shop_network'] // Start with basic targets
  };
}

function load() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
}

// ===== Game API for Components =====
window.GameAPI = {
  getWallet: () => S.wallet,
  getStats: () => ({
    level: S.player.level,
    xp: S.player.xp,
    need: xpToNext(S.player.level),
    reputation: S.player.reputation,
    cpu: S.rig.cpu,
    ram: S.rig.ram,
    fw: S.rig.fw,
    rate: Math.floor(miningRate(S.rig.cpu)),
    hackingPower: Math.floor(hackingPower(S.rig.cpu))
  }),
  getLogs: () => S.logs.slice(),
  getPlayer: () => ({ ...S.player }),
  getDiscoveredTargets: () => [...S.discoveredTargets],
  getPVETargets: () => PVE_TARGETS.filter(target => S.discoveredTargets.includes(target.id))
};

// ===== Idle System =====
function processIdle() {
  const rate = miningRate(S.rig.cpu);
  const elapsed = now() - S.lastProcessedAt;
  const capped = Math.min(elapsed, OFFLINE_CAP_HRS * HOUR);
  S.uncollected += (rate / HOUR) * capped;
  S.lastProcessedAt = now();
}

// ===== Task System =====
function hasFreeSlot() {
  return S.tasks.length < concurrentTasks(S.rig.ram);
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function startTask({ kind, name, durationMs, meta }) {
  if (!hasFreeSlot()) return false;

  
  
  S.tasks.push({
    id: uuid(),
    kind,
    name,
    startedAt: now(),
    endsAt: now() + durationMs,
    meta: meta || {}
  });
  
  log(`START   ${name} (${kind})`);
  save();
  render();
  return true;
}

function resolveTasks() {
  const done = [], pend = [];
  for (const t of S.tasks) {
    (now() >= t.endsAt ? done : pend).push(t);
  }
  
  for (const t of done) {
    if (t.kind === 'pve') {
      const attackPower = hackingPower(S.rig.cpu);
      const difficulty = t.meta.diff || 0;
      const successChance = Math.min(0.95, attackPower / (difficulty * 1.5));
      
      if (Math.random() < successChance) {
        // Success
        const cryptoReward = t.meta.rewards.crypto;
        const xpReward = t.meta.rewards.xp;
        
        S.wallet += cryptoReward;
        S.player.reputation += Math.floor(cryptoReward / 100);
        giveXP(xpReward);
        
        // Chance to discover new target
        if (Math.random() < 0.3 && S.discoveredTargets.length < PVE_TARGETS.length) {
          const undiscovered = PVE_TARGETS.filter(t => !S.discoveredTargets.includes(t.id));
          if (undiscovered.length > 0) {
            const newTarget = undiscovered[Math.floor(Math.random() * undiscovered.length)];
            S.discoveredTargets.push(newTarget.id);
            log(`DISCOVER New target available: ${newTarget.name}`);
          }
        }
        
        log(`SUCCESS ${t.name} +₵${fmt(cryptoReward)} +${xpReward}XP +${Math.floor(cryptoReward/100)} Rep`);
      } else {
        // Failure - but still get some XP
        const xpReward = Math.floor(t.meta.rewards.xp * 0.3);
        giveXP(xpReward);
        log(`FAIL    ${t.name} (got ${xpReward}XP from experience)`);
      }
    }
  }
  
  S.tasks = pend;
  save();
  render();
}

// ===== Progression System =====
function giveXP(x) {
  S.player.xp += x;
  while (S.player.xp >= xpToNext(S.player.level)) {
    S.player.xp -= xpToNext(S.player.level);
    S.player.level++;
    
    // Unlock new abilities at certain levels
    if (S.player.level === 5 && !S.discoveredTargets.includes('data_center')) {
      S.discoveredTargets.push('data_center');
      log(`LEVEL UP Unlocked new target: Corporate Data Center`);
    }
    if (S.player.level === 10 && !S.discoveredTargets.includes('gov_server')) {
      S.discoveredTargets.push('gov_server');
      log(`LEVEL UP Unlocked new target: Government Server`);
    }
    if (S.player.level === 15 && !S.discoveredTargets.includes('mega_corp')) {
      S.discoveredTargets.push('mega_corp');
      log(`LEVEL UP Unlocked new target: Mega Corporation HQ`);
    }
    
    log(`LEVEL UP! Now level ${S.player.level}`);
  }
}

// ===== Upgrade System =====
function tryUpgrade(key) {
  const lvl = S.rig[key];
  const cost = upgradeCost(BASE_COST[key], lvl);
  
  if (S.wallet < cost) return false;
  
  S.wallet -= cost;
  S.rig[key]++;
  
  if (key === 'cpu') S.lastProcessedAt = now();
  
  log(`UPGRADE ${key.toUpperCase()} -> Lv.${S.rig[key]} (-₵${fmt(cost)})`);
  return true;
}

// ===== UI Rendering =====
function setText(sel, val) {
  const el = $(sel);
  if (el) el.textContent = String(val);
}

function render() {
  const rate = miningRate(S.rig.cpu);
  const hackPower = hackingPower(S.rig.cpu);

  // Wallet and Mining
  setText('#wallet', `₵ ${fmt(S.wallet)}`);
  setText('#cryptoRate', `/ชม. ${fmt(rate)}`);
  setText('#uncollected', `₵ ${fmt(S.uncollected)}`);

  // Player Stats
  setText('#level', S.player.level);
  setText('#reputation', S.player.reputation);
  const need = xpToNext(S.player.level);
  setText('#xpText', `${fmt(S.player.xp)} / ${fmt(need)} XP`);
  
  const xpFill = $('#xpFill');
  if (xpFill) xpFill.style.width = `${Math.min(100, (S.player.xp / need) * 100)}%`;

  // Rig Stats
  setText('#cpuLvl', S.rig.cpu);
  setText('#ramLvl', S.rig.ram);
  setText('#fwLvl', S.rig.fw);
  setText('#stLvl', S.rig.st);
  setText('#upLvl', S.rig.up);

  // Combat Stats
  setText('#miningRate', fmt(rate));
  setText('#hackPower', fmt(hackPower));
  setText('#defVal', fmt(defensePoints(S.rig.fw)));
  setText('#ramSlots', concurrentTasks(S.rig.ram));

  // Upgrade Costs
  setText('#costCPU', fmt(upgradeCost(BASE_COST.cpu, S.rig.cpu)));
  setText('#costRAM', fmt(upgradeCost(BASE_COST.ram, S.rig.ram)));
  setText('#costFW', fmt(upgradeCost(BASE_COST.fw, S.rig.fw)));
  setText('#costST', fmt(upgradeCost(BASE_COST.st, S.rig.st)));
  setText('#costUP', fmt(upgradeCost(BASE_COST.up, S.rig.up)));

  // Task Management
  setText('#maxSlots', concurrentTasks(S.rig.ram));
  setText('#usedSlots', S.tasks.length);

  // Render Task List
  const list = $('#taskList');
  if (list) {
    list.innerHTML = '';
    for (const t of S.tasks) {
      const left = Math.max(0, t.endsAt - now());
      const li = document.createElement('li');
      li.innerHTML = `
        <div><b>${t.name}</b> <span class="badge">${t.kind.toUpperCase()}</span></div>
        <div class="row">
          <span class="time">เหลือ: <span data-left="${t.id}">${fmtMs(left)}</span></span>
          <button class="danger" data-cancel="${t.id}">ยกเลิก</button>
        </div>`;
      
      li.querySelector('[data-cancel]').addEventListener('click', () => {
        S.tasks = S.tasks.filter(x => x.id !== t.id);
        log(`CANCEL  ${t.name}`);
        save();
        render();
      });
      
      list.appendChild(li);
    }
  }

  // Update Contracts List
  updateContractsList();
}

function updateContractsList() {
  const ul = $('#contractList');
  if (!ul) return;
  
  ul.innerHTML = '';
  const availableTargets = PVE_TARGETS.filter(target => 
    S.discoveredTargets.includes(target.id)
  );
  
  for (const c of availableTargets) {
    const attackPower = hackingPower(S.rig.cpu);
    const successChance = Math.min(95, Math.floor((attackPower / (c.difficulty * 1.5)) * 100));
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="row">
        <span class="badge">⏱ ${c.seconds} วิ</span>
        <span class="badge">🛡 ${fmt(c.difficulty)}</span>
        <span class="badge">🎯 ${successChance}%</span>
      </div>
      <div><b>${c.name}</b></div>
      <div class="row">
        <span class="badge">💰 +₵${fmt(c.rewards.crypto)}</span>
        <span class="badge">⭐ +${c.rewards.xp} XP</span>
        <span class="badge">🏆 +${Math.floor(c.rewards.crypto/100)} Rep</span>
      </div>
      <div class="row"><button class="secondary">เริ่มแฮ็ก</button></div>`;
    
    li.querySelector('button').addEventListener('click', () => {
      if (!hasFreeSlot()) return alert('RAM เต็มแล้ว');
      startTask({
        kind: 'pve',
        name: c.name,
        durationMs: c.seconds * 1000,
        meta: { diff: c.difficulty, rewards: c.rewards }
      });
    });
    
    ul.appendChild(li);
  }
}

function tickUI() {
  for (const t of S.tasks) {
    const el = document.querySelector(`[data-left="${t.id}"]`);
    if (el) el.textContent = fmtMs(Math.max(0, t.endsAt - now()));
  }
}

// ===== Utilities =====
function log(msg) {
  const L = { t: now(), msg };
  S.logs.push(L);
  if (S.logs.length > 250) S.logs.shift();
  save();
  
  if (window.CMD?.appendLine) {
    window.CMD.appendLine(`[${new Date(L.t).toLocaleTimeString()}] ${L.msg}`);
  }
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function fmtMs(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}น ${r}วิ` : `${r}วิ`;
}

// ===== Event Handlers =====
export function wireGameUI() {
  $('#btnCollect')?.addEventListener('click', () => {
    const g = Math.floor(S.uncollected);
    if (g <= 0) return;
    S.wallet += g;
    S.uncollected -= g;
    log(`COLLECT +₵${fmt(g)}`);
    save();
    render();
  });
  
  // Upgrade buttons
  $('#btnUpCPU')?.addEventListener('click', () => { 
    if (tryUpgrade('cpu')) { save(); render(); } else alert('เงินไม่พอ'); 
  });
  $('#btnUpRAM')?.addEventListener('click', () => { 
    if (tryUpgrade('ram')) { save(); render(); } else alert('เงินไม่พอ'); 
  });
  $('#btnUpFW')?.addEventListener('click', () => { 
    if (tryUpgrade('fw')) { save(); render(); } else alert('เงินไม่พอ'); 
  });
  $('#btnUpST')?.addEventListener('click', () => { 
    if (tryUpgrade('st')) { save(); render(); } else alert('เงินไม่พอ'); 
  });
  $('#btnUpUP')?.addEventListener('click', () => { 
    if (tryUpgrade('up')) { save(); render(); } else alert('เงินไม่พอ'); 
  });

  // Cheat buttons (for testing)
  $('#btnGiveMoney')?.addEventListener('click', () => { 
    S.wallet += 1000; 
    save(); 
    render(); 
  });
  
  $('#btnReset')?.addEventListener('click', () => { 
    if (confirm('ลบเซฟทั้งหมด?')) { 
      S = defaultState(); 
      save(); 
      render(); 
    } 
  });

  // Initialize
  processIdle();
  render();
  
  // Game loop
  setInterval(() => { 
    processIdle(); 
    resolveTasks(); 
    render(); 
  }, 1000);
  
  setInterval(tickUI, 200);
}

// ===== Taskbar Clock =====
export function renderClock() {
  const el = document.getElementById('trayClock');
  const upd = () => {
    const d = new Date();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
    if (el) el.innerHTML = `<span class="time">${time}</span><span class="date">${date}</span>`;
  };
  upd();
  setInterval(upd, 1000);
}