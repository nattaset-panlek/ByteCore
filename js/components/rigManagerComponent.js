// js/components/rigManagerComponent.js
import { componentManager } from "../componentManager.js";

const id = "rigManagerComponent";

const rigManagerComponent = {
  playerRig: {
    cpu: 1,
    ram: 1,
    firewall: 1,
    storage: 1,
    uplink: 1,
    gpu: 1
  },

  devices: {
    cpu: [
      { id: 'cpu_basic', name: 'Basic CPU', level: 1, price: 100, performance: 1 },
      { id: 'cpu_advanced', name: 'Advanced CPU', level: 2, price: 250, performance: 1.5 },
      { id: 'cpu_pro', name: 'Professional CPU', level: 3, price: 600, performance: 2.2 }
    ],
    ram: [
      { id: 'ram_4gb', name: '4GB RAM', level: 1, price: 80, performance: 1 },
      { id: 'ram_8gb', name: '8GB RAM', level: 2, price: 200, performance: 1.8 },
      { id: 'ram_16gb', name: '16GB RAM', level: 3, price: 450, performance: 2.5 }
    ],
    network: [
      { id: 'net_basic', name: 'Basic Network Card', level: 1, price: 120, speed: 1 },
      { id: 'net_gigabit', name: 'Gigabit Network Card', level: 2, price: 300, speed: 2 },
      { id: 'net_10g', name: '10G Network Card', level: 3, price: 800, speed: 3.5 }
    ],
    storage: [
      { id: 'hdd_1tb', name: '1TB HDD', level: 1, price: 60, capacity: 1 },
      { id: 'ssd_500gb', name: '500GB SSD', level: 2, price: 180, capacity: 1.5 },
      { id: 'nvme_1tb', name: '1TB NVMe', level: 3, price: 400, capacity: 2.5 }
    ]
  },

  ownedDevices: {
    cpu: 'cpu_basic',
    ram: 'ram_4gb',
    network: 'net_basic',
    storage: 'hdd_1tb'
  },

  listeners: new Set(),

  // อัพเกรดอุปกรณ์
  upgradeDevice(type, deviceId) {
    const device = this.devices[type].find(d => d.id === deviceId);
    if (!device) return false;

    const currentWallet = window.GameAPI?.getWallet();
    if (currentWallet < device.price) return false;

    // TODO: ลดเงินผู้เล่น
    this.ownedDevices[type] = deviceId;

    // อัพเดท Rig ตามอุปกรณ์
    this.updateRigStats();

    this.notifyListeners();
    return true;
  },

  // อัพเดทสถิติ Rig ตามอุปกรณ์
  updateRigStats() {
    const cpuDevice = this.devices.cpu.find(d => d.id === this.ownedDevices.cpu);
    const ramDevice = this.devices.ram.find(d => d.id === this.ownedDevices.ram);
    const netDevice = this.devices.network.find(d => d.id === this.ownedDevices.network);
    const storageDevice = this.devices.storage.find(d => d.id === this.ownedDevices.storage);

    this.playerRig = {
      cpu: cpuDevice ? cpuDevice.level : 1,
      ram: ramDevice ? ramDevice.level : 1,
      uplink: netDevice ? netDevice.level : 1,
      storage: storageDevice ? storageDevice.level : 1,
      firewall: this.playerRig.firewall,
      gpu: this.playerRig.gpu
    };
  },

  getRigStats() {
    return { ...this.playerRig };
  },

  getAvailableDevices() {
    return { ...this.devices };
  },

  getOwnedDevices() {
    return { ...this.ownedDevices };
  },

  // Listener system
  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    this.listeners.forEach(callback => callback({
      rigStats: this.playerRig,
      availableDevices: this.devices,
      ownedDevices: this.ownedDevices
    }));
  },

  start() {
    this.updateRigStats();
  },

  stop() {
    // Save state if needed
  }
};

componentManager.registerComponent(id, rigManagerComponent);
export default rigManagerComponent;
