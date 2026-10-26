// js/components/walletComponent.js
import { componentManager } from "../componentManager.js";

const id = "walletComponent";

const walletComponent = {
  balance: 0,
  cryptoRate: 0,
  transactions: [],
  maxTransactions: 10,
  interval: null,
  listeners: new Set(),

  updateWallet() {
    const change = Math.floor(Math.random() * 20) - 5;
    this.balance = Math.max(0, this.balance + change);
    this.cryptoRate = Math.floor(Math.random() * 50);
    
    // Add transaction
    const transaction = {
      amount: change,
      type: change > 0 ? 'income' : 'expense',
      timestamp: Date.now()
    };
    
    this.transactions.unshift(transaction);
    if (this.transactions.length > this.maxTransactions) {
      this.transactions.pop();
    }

    this.notifyListeners();
  },

  getWalletData() {
    return {
      balance: this.balance,
      cryptoRate: this.cryptoRate,
      transactions: [...this.transactions]
    };
  },

  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.getWalletData()));
  },

  start() {
    this.interval = setInterval(() => this.updateWallet(), 3000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

componentManager.registerComponent(id, walletComponent);
export default walletComponent;