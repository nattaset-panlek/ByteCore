// js/components/tasksComponent.js
import { componentManager } from "../componentManager.js";

const id = "tasksComponent";

const tasksComponent = {
  tasks: [],
  maxTasks: 50,
  interval: null,
  listeners: new Set(),

  addTask(name, type = "system", cpuUsage = 0, memoryUsage = 0, description = "") {
    const task = {
      id: Date.now() + Math.random(),
      name: name,
      type: type,
      status: "running",
      cpuUsage: cpuUsage || Math.random() * 10,
      memoryUsage: memoryUsage || Math.random() * 50,
      description: description,
      timestamp: Date.now(),
      user: type === "user" ? "Player" : "SYSTEM"
    };

    this.tasks.unshift(task);
    if (this.tasks.length > this.maxTasks) {
      this.tasks.pop();
    }

    this.notifyListeners();
    return task.id;
  },

  endTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = "ended";
      setTimeout(() => {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.notifyListeners();
      }, 2000);
    }
    this.notifyListeners();
  },

  suspendTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === "running") {
      task.status = "suspended";
      task.cpuUsage = 0;
      this.notifyListeners();
    }
  },

  resumeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === "suspended") {
      task.status = "running";
      task.cpuUsage = Math.random() * 5;
      this.notifyListeners();
    }
  },

  getTasks() {
    return [...this.tasks];
  },

  getTaskCount() {
    return this.tasks.length;
  },

  getTotalCPUUsage() {
    return this.tasks.reduce((total, task) => total + (task.cpuUsage || 0), 0);
  },

  getTotalMemoryUsage() {
    return this.tasks.reduce((total, task) => total + (task.memoryUsage || 0), 0);
  },

  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners() {
    this.listeners.forEach(callback => callback({
      tasks: this.tasks,
      totalCPU: this.getTotalCPUUsage(),
      totalMemory: this.getTotalMemoryUsage(),
      taskCount: this.getTaskCount()
    }));
  },

  start() {
    // System tasks ที่เริ่มต้นอัตโนมัติ
    const systemTasks = [
      {
        name: "System Idle Process",
        type: "system",
        cpu: 0.1,
        memory: 1,
        description: "Handles system idle time"
      },
      {
        name: "Security Manager",
        type: "security",
        cpu: 2.5,
        memory: 15,
        description: "Network security and firewall"
      },
      {
        name: "Network Service",
        type: "network",
        cpu: 1.2,
        memory: 8,
        description: "Manages network connections"
      },
      {
        name: "Crypto Miner",
        type: "mining",
        cpu: 15.7,
        memory: 32,
        description: "Cryptocurrency mining operation"
      },
      {
        name: "File System Monitor",
        type: "system",
        cpu: 0.8,
        memory: 12,
        description: "Monitors file system activity"
      },
      {
        name: "Memory Compressor",
        type: "system",
        cpu: 1.5,
        memory: 5,
        description: "Compresses memory pages"
      }
    ];

    // เพิ่ม system tasks
    systemTasks.forEach(task => {
      this.addTask(task.name, task.type, task.cpu, task.memory, task.description);
    });

    // อัพเดท CPU usage แบบสุ่มทุก 3 วินาที
    this.interval = setInterval(() => {
      this.tasks.forEach(task => {
        if (task.status === "running" && task.name !== "System Idle Process") {
          // สุ่มเปลี่ยน CPU usage
          const change = (Math.random() - 0.5) * 3;
          task.cpuUsage = Math.max(0.1, Math.min(50, task.cpuUsage + change));

          // สุ่มเปลี่ยน Memory usage น้อยกว่า
          const memChange = (Math.random() - 0.5) * 2;
          task.memoryUsage = Math.max(1, task.memoryUsage + memChange);
        }
      });
      this.notifyListeners();
    }, 3000);

    // เพิ่ม user tasks แบบสุ่มบางครั้ง
    setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance
        const userTasks = [
          { name: "Background Scan", type: "user", cpu: 3.2, memory: 20, desc: "Security vulnerability scan" },
          { name: "Data Analysis", type: "user", cpu: 8.5, memory: 45, desc: "Analyzing collected data" },
          { name: "Encryption Process", type: "user", cpu: 12.3, memory: 28, desc: "File encryption operation" }
        ];
        const task = userTasks[Math.floor(Math.random() * userTasks.length)];
        this.addTask(task.name, task.type, task.cpu, task.memory, task.desc);
      }
    }, 10000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

componentManager.registerComponent(id, tasksComponent);
export default tasksComponent;
