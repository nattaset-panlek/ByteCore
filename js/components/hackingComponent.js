// js/components/hackingComponent.js
import { componentManager } from "../componentManager.js";

const id = "hackingComponent";

const hackingComponent = {
  currentTarget: null,
  isHacking: false,
  isEncrypting: false,
  timeRemaining: 0,
  totalTime: 0,
  encryptTime: 0,
  encryptRemaining: 0,
  discoveredIPs: [],
  fileSystem: null, // เปลี่ยนจาก {} เป็น null
  stolenFiles: [],
  interval: null,
  encryptInterval: null,
  listeners: new Set(),

  // สุ่มสร้าง IP Address
  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  },

  // ค้นหา IP ใหม่
  scanIPs(count = 5) {
    const newIPs = [];
    for (let i = 0; i < count; i++) {
      newIPs.push(this.generateRandomIP());
    }
    this.discoveredIPs = [...new Set([...this.discoveredIPs, ...newIPs])];
    this.notifyListeners();
    return newIPs;
  },

  // สร้าง File System แบบสุ่ม
  generateFileSystem() {
    return {
      root: [
        {
          name: "Documents",
          type: "folder",
          children: [
            { name: "passwords.txt", type: "file", size: 2.3, rarity: "common", value: 150 },
            { name: "financial_report.pdf", type: "file", size: 5.7, rarity: "rare", value: 800 },
            { name: "secret_plans.docx", type: "file", size: 3.1, rarity: "epic", value: 1500 }
          ]
        },
        {
          name: "Pictures",
          type: "folder",
          children: [
            { name: "vacation.jpg", type: "file", size: 4.2, rarity: "common", value: 100 },
            { name: "blueprint.png", type: "file", size: 8.9, rarity: "legendary", value: 2500 }
          ]
        },
        {
          name: "System32",
          type: "folder",
          children: [
            { name: "config.sys", type: "file", size: 1.1, rarity: "common", value: 200 },
            { name: "kernel.dll", type: "file", size: 12.5, rarity: "epic", value: 1800 }
          ]
        },
        {
          name: "UserData",
          type: "folder",
          children: [
            { name: "crypto_wallet.dat", type: "file", size: 15.3, rarity: "legendary", value: 3000 },
            { name: "email_backup.db", type: "file", size: 7.8, rarity: "rare", value: 1200 }
          ]
        }
      ],
      currentPath: ["root"]
    };
  },

  // เริ่ม Encryption
  startEncryption(ipAddress, playerRig) {
    if (this.isHacking || this.isEncrypting) return false;

    this.currentTarget = ipAddress;
    this.isEncrypting = true;

    // คำนวณเวลา Encryption จาก Rig
    const baseEncryptTime = 60; // 1 นาทีพื้นฐาน
    const cpuBonus = (playerRig.cpu || 1) * 8;
    this.encryptTime = Math.max(30, baseEncryptTime - cpuBonus);
    this.encryptRemaining = this.encryptTime;

    // ยังไม่สร้าง fileSystem ตอนนี้ (รอจนกว่า encryption จะเสร็จ)
    this.fileSystem = null;

    this.encryptInterval = setInterval(() => {
      this.encryptRemaining--;
      if (this.encryptRemaining <= 0) {
        this.finishEncryption(playerRig);
      }
      this.notifyListeners();
    }, 1000);

    this.notifyListeners();
    return true;
  },

  // จบ Encryption และเริ่ม Hack
  finishEncryption(playerRig) {
    clearInterval(this.encryptInterval);
    this.isEncrypting = false;

    // เริ่ม Session Hack และสร้าง fileSystem
    this.isHacking = true;

    // คำนวณเวลาจาก Rig
    const baseTime = 300;
    const cpuBonus = (playerRig.cpu || 1) * 10;
    const uplinkBonus = (playerRig.uplink || 1) * 5;

    this.totalTime = Math.max(120, baseTime - cpuBonus + uplinkBonus);
    this.timeRemaining = this.totalTime;

    // สร้าง fileSystem เมื่อ encryption เสร็จเท่านั้น
    this.fileSystem = this.generateFileSystem();

    this.interval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.endHack(false);
      }
      this.notifyListeners();
    }, 1000);

    this.notifyListeners();
  },

  // จบ Hack
  endHack(success = true) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.encryptInterval) {
      clearInterval(this.encryptInterval);
      this.encryptInterval = null;
    }

    if (!success) {
      // เสียเงินเมื่อถูกตัดการเชื่อมต่อ
      const penalty = Math.floor(this.totalTime / 10) * 50;
      if (window.GameAPI && window.GameAPI.addLog) {
        window.GameAPI.addLog(`HACK FAILED - Connection lost! Penalty: ₵${penalty}`);
      }
    }

    this.isHacking = false;
    this.isEncrypting = false;
    this.currentTarget = null;
    this.timeRemaining = 0;
    this.encryptRemaining = 0;
    this.fileSystem = null; // รีเซ็ต fileSystem
    this.notifyListeners();
  },

  // ดึงข้อมูลโฟลเดอร์ปัจจุบัน (เพิ่มการตรวจสอบ null)
  getCurrentFolder() {
    if (!this.fileSystem || !this.fileSystem.currentPath) {
      return null;
    }

    let current = this.fileSystem.root;
    const path = this.fileSystem.currentPath.slice(1);

    for (const folderName of path) {
      const folder = current.find(item => item.name === folderName && item.type === "folder");
      if (folder) current = folder.children;
      else return null;
    }

    return current;
  },

  // เปลี่ยนโฟลเดอร์ (เพิ่มการตรวจสอบ null)
  navigateTo(path) {
    if (!this.fileSystem) return;

    this.fileSystem.currentPath = ["root", ...path];
    this.notifyListeners();
  },

  // Action กับไฟล์ (เพิ่มการตรวจสอบ null)
  performFileAction(fileName, action, playerRig) {
    if (!this.fileSystem) return null;

    const folder = this.getCurrentFolder();
    if (!folder) return null;

    const file = folder.find(item => item.name === fileName && item.type === "file");
    if (!file) return null;

    const actions = {
      open: { time: 3, value: file.value * 0.1 },
      copy: { time: file.size * 2, value: file.value * 0.3 },
      cut: { time: file.size * 1.5, value: file.value * 0.5 },
      download: { time: file.size * 3, value: file.value },
      remove: { time: file.size * 1, value: file.value * 1.2 }
    };

    const actionData = actions[action];
    if (!actionData) return null;

    // คำนวณเวลาจริงจาก Rig Network
    const networkSpeed = (playerRig.uplink || 1) * 0.8;
    const actualTime = Math.max(1, actionData.time - networkSpeed);

    // เพิ่มไฟล์ที่ขโมยมาได้
    if (action === 'download' || action === 'copy' || action === 'cut') {
      this.stolenFiles.push({
        ...file,
        acquiredAt: Date.now(),
        action: action
      });
    }

    return {
      success: true,
      time: actualTime,
      value: actionData.value,
      file: file
    };
  },

  // ขายไฟล์
  sellFile(index) {
    if (this.stolenFiles[index]) {
      const file = this.stolenFiles[index];
      this.stolenFiles.splice(index, 1);
      this.notifyListeners();
      return file.value;
    }
    return 0;
  },

  // Listener system
  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    const data = {
      isHacking: this.isHacking,
      isEncrypting: this.isEncrypting,
      currentTarget: this.currentTarget,
      timeRemaining: this.timeRemaining,
      totalTime: this.totalTime,
      encryptRemaining: this.encryptRemaining,
      encryptTime: this.encryptTime,
      discoveredIPs: this.discoveredIPs,
      fileSystem: this.fileSystem,
      currentFolder: this.getCurrentFolder(), // ฟังก์ชันนี้มีการตรวจสอบ null แล้ว
      stolenFiles: this.stolenFiles
    };

    this.listeners.forEach(callback => callback(data));
  },

  start() {
    // โหลด IP ที่ค้นพบแล้วจาก LocalStorage
    const saved = localStorage.getItem('chimera_discovered_ips');
    if (saved) {
      this.discoveredIPs = JSON.parse(saved);
    }
    this.fileSystem = null; // เริ่มต้นด้วย null
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.encryptInterval) {
      clearInterval(this.encryptInterval);
    }
    localStorage.setItem('chimera_discovered_ips', JSON.stringify(this.discoveredIPs));
  }
};

componentManager.registerComponent(id, hackingComponent);
export default hackingComponent;
