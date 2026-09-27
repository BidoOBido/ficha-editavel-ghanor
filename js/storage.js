(function () {
  "use strict";

  const KEY = "ghanor-web-sheet-v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Não foi possível carregar a ficha salva.", error);
      return null;
    }
  }

  function save(character) {
    localStorage.setItem(KEY, JSON.stringify(character));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  window.GhanorSheetStorage = { load, save, clear, KEY };
})();
