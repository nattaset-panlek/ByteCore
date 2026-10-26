// js/components/logsComponent.js
import { componentManager } from "../componentManager.js";

const id = "logsComponent";

const logsComponent = {
  logs: [],
  maxLogs: 50,
  intervals: [],

  addLog(text) {
    const logEntry = {
      text,
      timestamp: new Date().toLocaleTimeString(),
      fullText: `[${new Date().toLocaleTimeString()}] ${text}`
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Notify listeners
    this.notifyListeners();
  },

  getLogs() {
    return [...this.logs];
  },

  // Subscribe/notify pattern for UI updates
  listeners: new Set(),

  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.logs));
  },

  start() {
    // Simulate logs
    const interval1 = setInterval(() => this.addLog("Background task completed."), 4000);
    const interval2 = setInterval(() => this.addLog("Network ping successful."), 6000);

    this.intervals.push(interval1, interval2);
  },

  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
};

componentManager.registerComponent(id, logsComponent);
export default logsComponent;
