// js/windowManager.js
export const wm = (() => {
  const desktop = document.getElementById("desktop");
  const taskButtons = document.getElementById("taskButtons");
  const windows = new Map();
  const windowRegistry = new Map();
  let zTop = 50;
  let spawnIndex = 0;

  function registerWindow(id, title, iconId, createFunction) {
    windowRegistry.set(id, { title, iconId, createFunction });
    return { id, title, iconId };
  }

  function createWindow(id, title, iconId, contentHtml) {
    if (windows.has(id)) {
      const existing = windows.get(id);
      existing.win.classList.remove("minimized");
      focusWindow(id);
      return existing.win;
    }

    const offset = spawnIndex * 40;
    spawnIndex++;

    const win = document.createElement("div");
    win.className = "win";
    win.id = id;
    win.style.left = `${100 + offset}px`;
    win.style.top = `${100 + offset}px`;
    win.style.width = "420px";
    win.style.height = "320px";

    win.innerHTML = `
      <div class="titlebar" data-drag>
        <div class="title">
          <svg class="ico"><use href="#${iconId}"/></svg>
          <span>${title}</span>
        </div>
        <div class="controls">
          <button class="ctrl btn-min"><svg class="ico"><use href="#ico-min"/></svg></button>
          <button class="ctrl btn-max"><svg class="ico"><use href="#ico-max"/></svg></button>
          <button class="ctrl btn-close"><svg class="ico"><use href="#ico-close"/></svg></button>
        </div>
      </div>
      <div class="content">${contentHtml}</div>
      <div class="resize-handle nw"></div>
      <div class="resize-handle ne"></div>
      <div class="resize-handle sw"></div>
      <div class="resize-handle se"></div>
    `;

    desktop.appendChild(win);
    makeDraggable(win);
    makeResizable(win);
    focusWindow(id);

    // Taskbar button
    const tb = document.createElement("div");
    tb.className = "tb";
    tb.innerHTML = `<svg class="ico"><use href="#${iconId}"/></svg>`;
    tb.onclick = () => toggleMinimize(id);
    taskButtons.appendChild(tb);

    win.querySelector(".btn-close").onclick = () => closeWindow(id, tb);
    win.querySelector(".btn-min").onclick = () => toggleMinimize(id);
    win.querySelector(".btn-max").onclick = () => toggleMaximize(id);

    windows.set(id, { win, tb, title, iconId });
    return win;
  }

  function openWindow(id) {
    const windowInfo = windowRegistry.get(id);
    if (!windowInfo) {
      console.error(`Window ${id} not registered`);
      return null;
    }

    if (windows.has(id)) {
      const existing = windows.get(id);
      existing.win.classList.remove("minimized");
      focusWindow(id);
      return existing.win;
    }

    if (windowInfo.createFunction) {
      return windowInfo.createFunction();
    } else {
      console.error(`No create function for window ${id}`);
      return null;
    }
  }

  function focusWindow(id) {
    const obj = windows.get(id);
    if (obj) obj.win.style.zIndex = ++zTop;
  }

  function toggleMinimize(id) {
    const { win } = windows.get(id);
    win.classList.toggle("minimized");
  }

  function toggleMaximize(id) {
    const { win } = windows.get(id);
    win.classList.toggle("maximized");
  }

  function closeWindow(id, tb) {
    const { win } = windows.get(id);
    win.remove();
    tb.remove();
    windows.delete(id);

    if (windows.size === 0) {
      spawnIndex = 0;
    }
  }

  function getRegisteredWindows() {
    return windowRegistry;
  }

  function getActiveWindows() {
    return windows;
  }

  // FIXED: Prevent windows from being dragged outside desktop
  function makeDraggable(win) {
    const bar = win.querySelector("[data-drag]");
    let offsetX, offsetY, isDragging = false;

    bar.addEventListener("mousedown", e => {
      if (win.classList.contains("maximized")) return;
      isDragging = true;
      const rect = win.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      win.style.zIndex = ++zTop;
      document.body.classList.add("dragging");
    });

    document.addEventListener("mousemove", e => {
      if (!isDragging) return;

      const desktopRect = desktop.getBoundingClientRect();
      const winWidth = win.offsetWidth;
      const winHeight = win.offsetHeight;

      // Calculate new position with boundaries
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;

      // Constrain to desktop boundaries
      newX = Math.max(desktopRect.left, Math.min(newX, desktopRect.right - winWidth));
      newY = Math.max(desktopRect.top, Math.min(newY, desktopRect.bottom - winHeight));

      win.style.left = (newX - desktopRect.left) + "px";
      win.style.top = (newY - desktopRect.top) + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.classList.remove("dragging");
    });
  }

  // FIXED: Prevent windows from being resized outside desktop
  function makeResizable(win) {
    const minW = 350, minH = 120;
    let isResizing = false, dir = null;
    let startX, startY, startW, startH, startL, startT;

    win.querySelectorAll(".resize-handle").forEach(h => {
      h.addEventListener("mousedown", e => {
        e.stopPropagation();
        isResizing = true;
        dir = h.classList[1];
        const r = win.getBoundingClientRect();
        const desktopRect = desktop.getBoundingClientRect();

        startX = e.clientX;
        startY = e.clientY;
        startW = r.width;
        startH = r.height;
        startL = r.left - desktopRect.left;
        startT = r.top - desktopRect.top;

        document.body.classList.add("dragging");
      });
    });

    document.addEventListener("mousemove", e => {
      if (!isResizing) return;

      const desktopRect = desktop.getBoundingClientRect();
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;

      let newW = startW, newH = startH, newL = startL, newT = startT;

      if (dir.includes("e")) newW = Math.max(minW, startW + dx);
      if (dir.includes("s")) newH = Math.max(minH, startH + dy);
      if (dir.includes("w")) {
        newW = Math.max(minW, startW - dx);
        newL = startL + dx;
      }
      if (dir.includes("n")) {
        newH = Math.max(minH, startH - dy);
        newT = startT + dy;
      }

      // Constrain to desktop boundaries
      if (newL < 0) {
        newW += newL;
        newL = 0;
      }
      if (newT < 0) {
        newH += newT;
        newT = 0;
      }
      if (newL + newW > desktopRect.width) {
        newW = desktopRect.width - newL;
      }
      if (newT + newH > desktopRect.height) {
        newH = desktopRect.height - newT;
      }

      // Ensure minimum size after constraints
      newW = Math.max(minW, newW);
      newH = Math.max(minH, newH);

      win.style.width = newW + "px";
      win.style.height = newH + "px";
      win.style.left = newL + "px";
      win.style.top = newT + "px";
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      document.body.classList.remove("dragging");
    });
  }

  return {
    createWindow,
    focusWindow,
    windows,
    registerWindow,
    getRegisteredWindows,
    getActiveWindows,
    openWindow
  };
})();
