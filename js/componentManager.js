// js/componentManager.js
export const componentManager = (() => {
  const components = new Map();

  function registerComponent(id, component) {
    components.set(id, component);
  }

  function getComponent(id) {
    return components.get(id);
  }

  function getAllComponents() {
    return components;
  }

  function startAllComponents() {
    for (const [id, component] of components) {
      if (typeof component.start === 'function') {
        component.start();
      }
    }
  }

  function stopAllComponents() {
    for (const [id, component] of components) {
      if (typeof component.stop === 'function') {
        component.stop();
      }
    }
  }

  return {
    registerComponent,
    getComponent,
    getAllComponents,
    startAllComponents,
    stopAllComponents
  };
})();
