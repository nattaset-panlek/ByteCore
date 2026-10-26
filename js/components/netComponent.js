// js/components/netComponent.js
import { componentManager } from "../componentManager.js";

const id = "netComponent";

const netComponent = {
  currentStats: {
    download: 0,
    upload: 0,
    ping: 0
  },
  history: [],
  maxHistory: 20,
  interval: null,
  listeners: new Set(),

  updateStats() {
    const down = (Math.random() * 50).toFixed(1);
    const up = (Math.random() * 20).toFixed(1);
    const ping = Math.floor(Math.random() * 80) + 10;
    
    this.currentStats = { download: down, upload: up, ping };
    
    // Add to history
    this.history.unshift({ down, up, ping, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.notifyListeners();
  },

  getCurrentStats() {
    return { ...this.currentStats };
  },

  getHistory() {
    return [...this.history];
  },

  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    this.listeners.forEach(callback => callback({
      current: this.currentStats,
      history: this.history
    }));
  },

  start() {
    this.interval = setInterval(() => this.updateStats(), 3000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

componentManager.registerComponent(id, netComponent);
export default netComponent;