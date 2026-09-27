(function () {
  "use strict";

  const { attributes, skills, blankCharacter, mergeCharacter } = window.GhanorSheetData;
  const calc = window.GhanorSheetCalculations;
  const storage = window.GhanorSheetStorage;
  const form = document.querySelector("#characterSheet");
  const state = mergeCharacter(blankCharacter(), storage.load());
  const labelHints = {
    "XP": "Pontos de Experiência",
    "PV": "Pontos de Vida",
    "PM": "Pontos de Mana",
    "Qtd.": "Quantidade",
    "Esp.": "Espaços",
    "Valor (PP)": "Valor em Peças de Prata",
    "PB": "Peças de Bronze",
    "PP": "Peças de Prata",
    "PO": "Peças de Ouro"
  };
  const components = window.GhanorSheetComponents.create({ attributes, calc, labelHints });

  function input(name) {
    return form.elements[name];
  }

  function setValue(name, value) {
    const field = input(name);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  }

  function setPathValue(path, value) {
    const field = document.querySelector(`[data-path="${path}"]`);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  }

  function numberValue(name) {
    return clampFieldNumber(input(name));
  }

  function clampFieldNumber(field) {
    if (!field) return 0;
    const min = field.min === "" ? -Infinity : Number(field.min);
    const max = field.max === "" ? Infinity : Number(field.max);
    const value = calc.number(field.value);
    const clamped = Math.min(Math.max(value, min), max);
    if (String(value) !== String(clamped)) field.value = clamped;
    return clamped;
  }

  function readStaticFields() {
    state.playerName = input("playerName").value;
    state.characterName = input("characterName").value;
    state.race = input("race").value;
    state.origin = input("origin").value;
    state.className = input("className").value;
    state.level = numberValue("level");
    state.xp = numberValue("xp");
    state.hp.temp = numberValue("hpTemp");
    state.hp.max = numberValue("hpMax");
    state.hp.current = boundedCurrent("hpCurrent", state.hp.max, state.hp.temp);
    state.mp.temp = numberValue("mpTemp");
    state.mp.max = numberValue("mpMax");
    state.mp.current = boundedCurrent("mpCurrent", state.mp.max, state.mp.temp);
    state.money.bronze = numberValue("moneyBronze");
    state.money.silver = numberValue("moneySilver");
    state.money.gold = numberValue("moneyGold");

    attributes.forEach((attr) => {
      state.attributes[attr.key] = numberValue(`attr-${attr.key}`);
    });

    state.defense.base = numberValue("defenseBase");
    state.defense.attribute = input("defenseAttribute").value;
    state.defense.useAttribute = input("useAttributeInDefense").checked;
    state.defense.other = numberValue("defenseOther");
    state.defense.armor = {
      name: input("armorName").value,
      defense: numberValue("armorDefense"),
      penalty: numberValue("armorPenalty")
    };
    state.defense.shield = {
      name: input("shieldName").value,
      defense: numberValue("shieldDefense"),
      penalty: numberValue("shieldPenalty")
    };
  }

  function boundedCurrent(name, maximum, temporary) {
    const field = input(name);
    const value = clampFieldNumber(field);
    const limit = Math.max(0, calc.number(maximum) + calc.number(temporary));
    const clamped = Math.min(value, limit);
    if (field && value !== clamped) field.value = clamped;
    return clamped;
  }

  function saveAndRender() {
    readStaticFields();
    storage.save(state);
    renderTotals();
  }

  function renderAttributes() {
    const holder = document.querySelector("#attributesList");
    holder.innerHTML = components.attributes();

    const defenseSelect = input("defenseAttribute");
    defenseSelect.innerHTML = attributes.map((attr) => `<option value="${attr.key}">${attr.label}</option>`).join("");
  }

  function renderSkills() {
    const holder = document.querySelector("#skillsList");
    holder.innerHTML = components.skills(skills);
  }

  function renderDynamicLists() {
    renderAttacks();
    renderProficiencies();
    renderAbilities();
    renderSpells();
    renderEquipment();
    renderNotes();
  }

  function renderAttacks() {
    renderList("#attacksList", state.attacks, "attacks", components.attacks);
  }

  function renderProficiencies() {
    renderList("#proficienciesList", state.proficiencies, "proficiencies", components.proficiencies);
  }

  function renderAbilities() {
    renderList("#abilitiesList", state.abilities, "abilities", components.abilities);
  }

  function renderSpells() {
    const holder = document.querySelector("#spellsList");
    holder.innerHTML = components.spells(state.spells);
  }

  function renderNotes() {
    renderList("#notesList", state.notes, "notes", components.notes);
  }

  function renderEquipment() {
    renderList("#equipmentList", state.equipment, "equipment", components.equipment);
  }

  function renderList(selector, items, type, template) {
    const holder = document.querySelector(selector);
    holder.dataset.listType = type;
    if (!items.length) {
      holder.innerHTML = `<p class="empty">Nenhum registro. Use o botão acima para adicionar.</p>`;
      return;
    }
    holder.innerHTML = items.map(template).join("");
  }

  function setByPath(path, value) {
    const keys = path.split(".");
    let target = state;
    keys.slice(0, -1).forEach((key) => {
      target = target[Number.isNaN(Number(key)) ? key : Number(key)];
    });
    const finalKey = keys[keys.length - 1];
    target[finalKey] = value;
  }

  function getEmptyItem(type) {
    const map = {
      attacks: { name: "", test: "", damage: "", critical: "", range: "", type: "", spaces: 0 },
      proficiencies: { text: "" },
      abilities: { name: "", kind: "Habilidade", cost: "", source: "", description: "", open: true },
      spells: {
        name: "",
        circle: 1,
        school: "",
        execution: "",
        resistance: "",
        cost: "",
        range: "",
        target: "",
        duration: "",
        partial: "",
        description: "",
        open: true
      },
      equipment: { name: "", quantity: 1, spaces: 0, value: "" },
      notes: { title: "", text: "" }
    };
    return map[type];
  }

  function hydrateForm() {
    setValue("playerName", state.playerName);
    setValue("characterName", state.characterName);
    setValue("race", state.race);
    setValue("origin", state.origin);
    setValue("className", state.className);
    setValue("level", state.level);
    setValue("xp", state.xp);
    state.hp.current = Math.min(calc.number(state.hp.current), calc.number(state.hp.max) + calc.number(state.hp.temp));
    state.mp.current = Math.min(calc.number(state.mp.current), calc.number(state.mp.max) + calc.number(state.mp.temp));
    setValue("hpCurrent", state.hp.current);
    setValue("hpTemp", state.hp.temp);
    setValue("hpMax", state.hp.max);
    setValue("mpCurrent", state.mp.current);
    setValue("mpTemp", state.mp.temp);
    setValue("mpMax", state.mp.max);
    setValue("moneyBronze", state.money.bronze);
    setValue("moneySilver", state.money.silver);
    setValue("moneyGold", state.money.gold);
    setPathValue("spellcasting.attribute", state.spellcasting.attribute);
    setPathValue("spellcasting.equipmentBonus", state.spellcasting.equipmentBonus);
    setPathValue("spellcasting.powerBonus", state.spellcasting.powerBonus);
    setPathValue("spellcasting.otherBonus", state.spellcasting.otherBonus);
    attributes.forEach((attr) => setValue(`attr-${attr.key}`, state.attributes[attr.key]));
    setValue("defenseBase", state.defense.base);
    setValue("defenseAttribute", state.defense.attribute);
    setValue("useAttributeInDefense", state.defense.useAttribute);
    setValue("defenseOther", state.defense.other);
    setValue("armorName", state.defense.armor.name);
    setValue("armorDefense", state.defense.armor.defense);
    setValue("armorPenalty", state.defense.armor.penalty);
    setValue("shieldName", state.defense.shield.name);
    setValue("shieldDefense", state.defense.shield.defense);
    setValue("shieldPenalty", state.defense.shield.penalty);
    skills.forEach((skill) => {
      const entry = state.skills[skill.key] || {};
      const trained = document.querySelector(`[data-skill-trained="${skill.key}"]`);
      const other = document.querySelector(`[data-skill-other="${skill.key}"]`);
      const custom = document.querySelector(`[data-skill-custom="${skill.key}"]`);
      if (trained) trained.checked = Boolean(entry.trained);
      if (other) other.value = entry.other ?? 0;
      if (custom) custom.value = entry.customName ?? "";
    });
    renderTotals();
  }

  function renderTotals() {
    document.querySelector("#halfLevel").value = calc.halfLevel(state.level);
    document.querySelector("#defenseTotal").value = calc.defenseTotal(state);
    document.querySelector("#armorBonusTotal").value = calc.armorDefense(state);
    document.querySelector("#shieldBonusTotal").value = calc.shieldDefense(state);
    document.querySelector("#loadUsed").value = `${calc.loadUsed(state)} de ${calc.loadLimit(state)}`;
    document.querySelector("#moneyTotal").value = calc.formatPP(calc.moneyTotalPP(state));
    document.querySelectorAll("[data-half-skill]").forEach((item) => {
      item.textContent = calc.halfLevel(state.level);
    });
    skills.forEach((skill) => {
      const total = document.querySelector(`[data-skill-total="${skill.key}"]`);
      const training = document.querySelector(`[data-skill-training-bonus="${skill.key}"]`);
      if (training) training.textContent = state.skills[skill.key]?.trained ? calc.trainingBonus(state.level) : 0;
      if (total) total.value = calc.signed(calc.skillTotal(state, skill));
    });
    document.querySelector("#spellcastingCD").value = calc.spellcastingCD(state);
  }

  function exportJson() {
    readStaticFields();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filePart(state.playerName, "jogador")}_${filePart(state.characterName, "personagem")}_nivel_${calc.number(state.level) || 1}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function filePart(value, fallback) {
    return String(value || fallback)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback;
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const imported = JSON.parse(reader.result);
        Object.assign(state, mergeCharacter(blankCharacter(), imported));
        storage.save(state);
        bootstrap();
      } catch (error) {
        alert("Não foi possível importar esse JSON.");
      }
    });
    reader.readAsText(file);
  }

  function bindEvents() {
    function handlePathField(target) {
      const value = target.type === "number" ? clampFieldNumber(target) : target.value;
      setByPath(target.dataset.path, value);
      storage.save(state);
      if (/^spells\.\d+\.circle$/.test(target.dataset.path)) renderDynamicLists();
      renderTotals();
    }

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches("[data-path]")) {
        handlePathField(target);
        return;
      }
      if (target.matches("[data-skill-trained], [data-skill-other], [data-skill-custom]")) {
        const key = target.dataset.skillTrained || target.dataset.skillOther || target.dataset.skillCustom;
        state.skills[key] = state.skills[key] || {};
        if (target.dataset.skillTrained) state.skills[key].trained = target.checked;
        if (target.dataset.skillOther) state.skills[key].other = clampFieldNumber(target);
        if (target.dataset.skillCustom) state.skills[key].customName = target.value;
        storage.save(state);
        renderTotals();
        return;
      }
      saveAndRender();
    });

    form.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches("select[data-path]")) handlePathField(target);
    });

    document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add]");
      const remove = event.target.closest("[data-remove]");
      const copy = event.target.closest("[data-copy]");
      const toggle = event.target.closest("[data-toggle-row]");
      const addSpellCircle = event.target.closest("[data-add-spell-circle]");
      if (addSpellCircle) {
        const spell = getEmptyItem("spells");
        spell.circle = Number(addSpellCircle.dataset.addSpellCircle);
        state.spells.push(spell);
        storage.save(state);
        renderDynamicLists();
      }
      if (add) {
        state[add.dataset.add].push(getEmptyItem(add.dataset.add));
        storage.save(state);
        renderDynamicLists();
      }
      if (copy) {
        copyItem(copy.dataset.copy, Number(copy.dataset.index));
      }
      if (toggle) {
        toggleItem(toggle.dataset.toggleRow, Number(toggle.dataset.index));
      }
      if (remove) {
        state[remove.dataset.remove].splice(Number(remove.dataset.index), 1);
        storage.save(state);
        renderDynamicLists();
        renderTotals();
      }
    });

    document.addEventListener("dragstart", (event) => {
      const handle = event.target.closest("[data-drag]");
      if (!handle) return;
      const row = handle.closest("[data-row-type]");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${handle.dataset.drag}:${handle.dataset.index}`);
      if (row) {
        row.classList.add("is-dragging");
        event.dataTransfer.setDragImage(row, 16, 16);
      }
    });

    document.addEventListener("dragover", (event) => {
      const row = event.target.closest("[data-row-type]");
      if (!row) return;
      event.preventDefault();
      document.querySelectorAll(".is-drop-target").forEach((item) => {
        if (item !== row) item.classList.remove("is-drop-target");
      });
      if (!row.classList.contains("is-dragging")) row.classList.add("is-drop-target");
    });

    document.addEventListener("dragleave", (event) => {
      const row = event.target.closest("[data-row-type]");
      if (row && !row.contains(event.relatedTarget)) row.classList.remove("is-drop-target");
    });

    document.addEventListener("drop", (event) => {
      const row = event.target.closest("[data-row-type]");
      if (!row) return;
      const [type, fromIndex] = event.dataTransfer.getData("text/plain").split(":");
      if (type !== row.dataset.rowType) return;
      event.preventDefault();
      clearDragState();
      moveItem(type, Number(fromIndex), Number(row.dataset.index));
    });

    document.addEventListener("dragend", clearDragState);

    document.querySelector("#exportJson").addEventListener("click", exportJson);
    document.querySelector("#importJson").addEventListener("change", (event) => importJson(event.target.files[0]));
    document.querySelector("#clearSheet").addEventListener("click", () => {
      if (!confirm("Limpar a ficha salva neste navegador?")) return;
      storage.clear();
      Object.assign(state, blankCharacter());
      bootstrap();
    });
  }

  function clearDragState() {
    document.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => {
      item.classList.remove("is-dragging", "is-drop-target");
    });
  }

  function copyItem(type, index) {
    const item = state[type]?.[index];
    if (!item) return;
    state[type].splice(index + 1, 0, JSON.parse(JSON.stringify(item)));
    storage.save(state);
    renderDynamicLists();
    renderTotals();
  }

  function toggleItem(type, index) {
    const item = state[type]?.[index];
    if (!item) return;
    item.open = item.open === false;
    storage.save(state);
    renderDynamicLists();
  }

  function moveItem(type, fromIndex, toIndex) {
    if (!state[type] || fromIndex === toIndex) return;
    const [item] = state[type].splice(fromIndex, 1);
    state[type].splice(toIndex, 0, item);
    storage.save(state);
    renderDynamicLists();
    renderTotals();
  }

  function bootstrap() {
    renderAttributes();
    renderSkills();
    renderDynamicLists();
    hydrateForm();
  }

  bindEvents();
  bootstrap();
})();
