// js/components/rigComponent.js
import { componentManager } from "../componentManager.js";

const id = "rigComponent";

const rigComponent = {
  currentStats: {
    gpuTemp: 0,
    hashRate: 0,
    powerUse: 0
  },
  activity: [],
  maxActivity: 15,
  interval: null,
  listeners: new Set(),

  updateStats() {
    const temp = (60 + Math.random() * 25).toFixed(1);
    const hash = (20 + Math.random() * 15).toFixed(1);
    const power = (120 + Math.random() * 50).toFixed(0);
    
    this.currentStats = { gpuTemp: temp, hashRate: hash, powerUse: power };
    
    // Add activity
    const activityMsg = `Mining cycle OK — ${hash} MH/s`;
    this.activity.unshift(activityMsg);
    if (this.activity.length > this.maxActivity) {
      this.activity.pop();
    }

    this.notifyListeners();
  },

  getCurrentStats() {
    return { ...this.currentStats };
  },

  getActivity() {
    return [...this.activity];
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
      activity: this.activity
    }));
  },

  start() {
    this.interval = setInterval(() => this.updateStats(), 3500);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

componentManager.registerComponent(id, rigComponent);
export default rigComponent;