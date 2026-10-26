// js/ui/profileWindow.js
import { wm } from "../windowManager.js";

const id = "profileWindow";
const title = "Profile";
const icon = "ico-win";

wm.registerWindow(id, title, icon);

const html = `
  <div class="panel">
    <h2>Profile</h2>
    <div class="grid">
      <div class="card">
        <strong>Level</strong>
        <div id="profileLevel">1</div>
      </div>
      <div class="card">
        <strong>Reputation</strong>
        <div id="profileRep">0</div>
      </div>
      <div class="card">
        <strong>Total XP</strong>
        <div id="profileTotalXP">0</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <h3>Skills</h3>
    <div class="grid">
      <div class="card">
        <strong>Hacking</strong>
        <div id="skillHacking">Lv.1</div>
        <progress id="hackProgress" value="0" max="100"></progress>
      </div>
      <div class="card">
        <strong>Stealth</strong>
        <div id="skillStealth">Lv.1</div>
        <progress id="stealthProgress" value="0" max="100"></progress>
      </div>
      <div class="card">
        <strong>Analysis</strong>
        <div id="skillAnalysis">Lv.1</div>
        <progress id="analysisProgress" value="0" max="100"></progress>
      </div>
    </div>
  </div>

  <div class="panel">
    <h3>Achievements</h3>
    <ul id="achievementList" class="list"></ul>
  </div>
`;

function createProfileWindow() {
  const win = wm.createWindow(id, title, icon, html);
  updateProfileData(win);
  
  // Update every 2 seconds
  setInterval(() => updateProfileData(win), 2000);
  return win;
}

function updateProfileData(win) {
  const stats = window.GameAPI?.getStats();
  const player = window.GameAPI?.getPlayer();
  
  if (!stats || !player) return;
  
  // Basic info
  win.querySelector("#profileLevel").textContent = stats.level;
  win.querySelector("#profileRep").textContent = stats.reputation;
  win.querySelector("#profileTotalXP").textContent = (stats.xp + getTotalXPForLevel(stats.level)).toLocaleString();
  
  // Skills
  win.querySelector("#skillHacking").textContent = `Lv.${player.skills.hacking}`;
  win.querySelector("#skillStealth").textContent = `Lv.${player.skills.stealth}`;
  win.querySelector("#skillAnalysis").textContent = `Lv.${player.skills.analysis}`;
  
  // Progress bars (simulated progression)
  win.querySelector("#hackProgress").value = (stats.xp / stats.need) * 100;
  win.querySelector("#stealthProgress").value = (stats.level % 10) * 10;
  win.querySelector("#analysisProgress").value = (stats.reputation % 10) * 10;
  
  // Achievements
  updateAchievements(win, stats, player);
}

function getTotalXPForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.round(100 * Math.pow(1.2, i - 1));
  }
  return total;
}

function updateAchievements(win, stats, player) {
  const list = win.querySelector("#achievementList");
  const achievements = [];
  
  // Define achievements
  if (stats.level >= 5) achievements.push("🔓 Novice Hacker - Reach Level 5");
  if (stats.level >= 10) achievements.push("🔓 Advanced Hacker - Reach Level 10");
  if (stats.level >= 15) achievements.push("🔓 Elite Hacker - Reach Level 15");
  if (stats.wallet >= 1000) achievements.push("💰 Thousandaire - Accumulate ₵1,000");
  if (stats.wallet >= 5000) achievements.push("💰 Crypto Enthusiast - Accumulate ₵5,000");
  if (stats.reputation >= 50) achievements.push("🏆 Known Hacker - Reach 50 Reputation");
  
  list.innerHTML = '';
  achievements.forEach(achievement => {
    const li = document.createElement("li");
    li.textContent = achievement;
    list.appendChild(li);
  });
  
  if (achievements.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No achievements yet. Keep hacking!";
    li.style.color = "var(--muted)";
    list.appendChild(li);
  }
}

export { createProfileWindow };