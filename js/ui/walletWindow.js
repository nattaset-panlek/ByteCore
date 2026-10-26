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

  updateFromGame() {
    // Get real data from game instead of random
    const gameData = window.GameAPI?.getWallet();
    if (gameData !== undefined) {
      const oldBalance = this.balance;
      this.balance = gameData;
      
      // Only add transaction if balance changed significantly
      if (Math.abs(this.balance - oldBalance) >= 1) {
        const transaction = {
          amount: this.balance - oldBalance,
          type: this.balance > oldBalance ? 'income' : 'expense',
          timestamp: Date.now()
        };
        
        this.transactions.unshift(transaction);
        if (this.transactions.length > this.maxTransactions) {
          this.transactions.pop();
        }
      }
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
    this.interval = setInterval(() => this.updateFromGame(), 3000);
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