(function () {
  "use strict";

  const { attributes, skills, blankCharacter } = window.GhanorSheetData;
  const calc = window.GhanorSheetCalculations;
  const storage = window.GhanorSheetStorage;
  const form = document.querySelector("#characterSheet");
  const state = mergeCharacter(blankCharacter(), storage.load());

  function mergeCharacter(base, saved) {
    if (!saved || typeof saved !== "object") return base;
    const merged = { ...base, ...saved };
    merged.attributes = { ...base.attributes, ...(saved.attributes || {}) };
    merged.hp = { ...base.hp, ...(saved.hp || {}) };
    merged.mp = { ...base.mp, ...(saved.mp || {}) };
    merged.defense = { ...base.defense, ...(saved.defense || {}) };
    merged.defense.armorRows = saved.defense?.armorRows || base.defense.armorRows;
    merged.skills = { ...base.skills, ...(saved.skills || {}) };
    merged.attacks = Array.isArray(saved.attacks) ? saved.attacks : base.attacks;
    merged.proficiencies = Array.isArray(saved.proficiencies) ? saved.proficiencies : base.proficiencies;
    merged.abilities = Array.isArray(saved.abilities) ? saved.abilities : base.abilities;
    merged.equipment = Array.isArray(saved.equipment) ? saved.equipment : base.equipment;
    return merged;
  }

  function input(name) {
    return form.elements[name];
  }

  function setValue(name, value) {
    const field = input(name);
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
    state.hp.current = numberValue("hpCurrent");
    state.hp.max = numberValue("hpMax");
    state.mp.current = numberValue("mpCurrent");
    state.mp.max = numberValue("mpMax");
    state.money = numberValue("money");

    attributes.forEach((attr) => {
      state.attributes[attr.key] = numberValue(`attr-${attr.key}`);
    });

    state.defense.base = numberValue("defenseBase");
    state.defense.attribute = input("defenseAttribute").value;
    state.defense.useAttribute = input("useAttributeInDefense").checked;
    state.defense.armorBonus = numberValue("armorBonus");
    state.defense.shieldBonus = numberValue("shieldBonus");
    state.defense.other = numberValue("defenseOther");
    state.defense.armorRows = [1, 2].map((row) => ({
      name: input(`armorName${row}`).value,
      defense: calc.number(input(`armorDefense${row}`).value),
      penalty: calc.number(input(`armorPenalty${row}`).value)
    }));
  }

  function saveAndRender() {
    readStaticFields();
    storage.save(state);
    renderTotals();
  }

  function renderAttributes() {
    const holder = document.querySelector("#attributesList");
    holder.innerHTML = attributes.map((attr) => `
      <label class="attribute-card ornamental" title="${attr.name}">
        <span>${attr.label}</span>
        <input name="attr-${attr.key}" type="number" min="-5" max="30" step="1" aria-label="${attr.name}">
      </label>
    `).join("");

    const defenseSelect = input("defenseAttribute");
    defenseSelect.innerHTML = attributes.map((attr) => `<option value="${attr.key}">${attr.label}</option>`).join("");
  }

  function renderSkills() {
    const holder = document.querySelector("#skillsList");
    holder.innerHTML = skills.map((skill) => {
      const suffixes = `${skill.armorPenalty ? " <span title=\"Penalidade de armadura\">¤</span>" : ""}${skill.trainedOnly ? " <span title=\"Somente treinada\">★</span>" : ""}`;
      const craftInput = skill.customName ? `<input class="skill-custom" data-skill-custom="${skill.key}" type="text" placeholder="especialidade">` : "";
      return `
        <div class="skill-row" data-skill="${skill.key}">
          <label class="skill-name">${skill.name}${craftInput}${suffixes}</label>
          <output class="skill-total" data-skill-total="${skill.key}">0</output>
          <span class="math">=</span>
          <span class="muted" data-half-skill>0</span>
          <span class="math">+</span>
          <span class="muted attr-ref">${skill.attr.toUpperCase()}</span>
          <span class="math">+</span>
          <input data-skill-training="${skill.key}" type="number" min="-99" max="99" step="1" aria-label="Treino em ${skill.name}">
          <span class="math">+</span>
          <input data-skill-other="${skill.key}" type="number" min="-99" max="99" step="1" aria-label="Outros em ${skill.name}">
        </div>
      `;
    }).join("");
  }

  function renderDynamicLists() {
    renderAttacks();
    renderProficiencies();
    renderAbilities();
    renderEquipment();
  }

  function renderAttacks() {
    renderList("#attacksList", state.attacks, "attacks", (item, index) => `
      <article class="dynamic-row attack-row">
        ${field(`attacks.${index}.name`, "Nome", item.name)}
        ${field(`attacks.${index}.test`, "Teste", item.test, "text")}
        ${field(`attacks.${index}.damage`, "Dano", item.damage)}
        ${field(`attacks.${index}.critical`, "Crítico", item.critical)}
        ${field(`attacks.${index}.range`, "Alcance", item.range)}
        ${field(`attacks.${index}.type`, "Tipo", item.type)}
        ${field(`attacks.${index}.spaces`, "Esp.", item.spaces, "number", { min: 0, max: 999 })}
        ${removeButton("attacks", index)}
      </article>
    `);
  }

  function renderProficiencies() {
    renderList("#proficienciesList", state.proficiencies, "proficiencies", (item, index) => `
      <article class="dynamic-row simple-row">
        ${field(`proficiencies.${index}.text`, "Descrição", item.text)}
        ${removeButton("proficiencies", index)}
      </article>
    `);
  }

  function renderAbilities() {
    renderList("#abilitiesList", state.abilities, "abilities", (item, index) => `
      <details class="ability-row" ${item.open ? "open" : ""}>
        <summary>
          ${field(`abilities.${index}.name`, "Nome", item.name)}
          ${field(`abilities.${index}.kind`, "Tipo", item.kind)}
          ${field(`abilities.${index}.cost`, "Custo", item.cost)}
          ${removeButton("abilities", index)}
        </summary>
        <div class="ability-body">
          ${field(`abilities.${index}.source`, "Origem", item.source)}
          <label>Descrição<textarea data-path="abilities.${index}.description">${escapeHtml(item.description || "")}</textarea></label>
        </div>
      </details>
    `);
  }

  function renderEquipment() {
    renderList("#equipmentList", state.equipment, "equipment", (item, index) => `
      <article class="dynamic-row equipment-row">
        ${field(`equipment.${index}.name`, "Item", item.name)}
        ${field(`equipment.${index}.quantity`, "Qtd.", item.quantity, "number", { min: 0, max: 999 })}
        ${field(`equipment.${index}.spaces`, "Esp.", item.spaces, "number", { min: 0, max: 999 })}
        ${field(`equipment.${index}.value`, "Valor", item.value)}
        ${removeButton("equipment", index)}
      </article>
    `);
  }

  function renderList(selector, items, type, template) {
    const holder = document.querySelector(selector);
    if (!items.length) {
      holder.innerHTML = `<p class="empty">Nenhum registro. Use o botão acima para adicionar.</p>`;
      return;
    }
    holder.innerHTML = items.map(template).join("");
  }

  function field(path, label, value, type = "text", limits = {}) {
    const numberAttrs = type === "number"
      ? ` min="${limits.min ?? -999}" max="${limits.max ?? 9999}" step="1"`
      : "";
    return `<label>${label}<input data-path="${path}" type="${type}"${numberAttrs} value="${escapeAttr(value ?? "")}"></label>`;
  }

  function removeButton(type, index) {
    return `<button type="button" class="icon-button no-print" data-remove="${type}" data-index="${index}" aria-label="Remover">×</button>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
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
      equipment: { name: "", quantity: 1, spaces: 0, value: "" }
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
    setValue("hpCurrent", state.hp.current);
    setValue("hpMax", state.hp.max);
    setValue("mpCurrent", state.mp.current);
    setValue("mpMax", state.mp.max);
    setValue("money", state.money);
    attributes.forEach((attr) => setValue(`attr-${attr.key}`, state.attributes[attr.key]));
    setValue("defenseBase", state.defense.base);
    setValue("defenseAttribute", state.defense.attribute);
    setValue("useAttributeInDefense", state.defense.useAttribute);
    setValue("armorBonus", state.defense.armorBonus);
    setValue("shieldBonus", state.defense.shieldBonus);
    setValue("defenseOther", state.defense.other);
    [0, 1].forEach((index) => {
      const row = state.defense.armorRows[index] || {};
      setValue(`armorName${index + 1}`, row.name);
      setValue(`armorDefense${index + 1}`, row.defense);
      setValue(`armorPenalty${index + 1}`, row.penalty);
    });
    skills.forEach((skill) => {
      const entry = state.skills[skill.key] || {};
      const training = document.querySelector(`[data-skill-training="${skill.key}"]`);
      const other = document.querySelector(`[data-skill-other="${skill.key}"]`);
      const custom = document.querySelector(`[data-skill-custom="${skill.key}"]`);
      if (training) training.value = entry.training ?? 0;
      if (other) other.value = entry.other ?? 0;
      if (custom) custom.value = entry.customName ?? "";
    });
    renderTotals();
  }

  function renderTotals() {
    document.querySelector("#halfLevel").value = calc.halfLevel(state.level);
    document.querySelector("#defenseTotal").value = calc.defenseTotal(state);
    document.querySelector("#loadUsed").value = calc.loadUsed(state);
    document.querySelectorAll("[data-half-skill]").forEach((item) => {
      item.textContent = calc.halfLevel(state.level);
    });
    skills.forEach((skill) => {
      const total = document.querySelector(`[data-skill-total="${skill.key}"]`);
      if (total) total.value = calc.signed(calc.skillTotal(state, skill));
    });
  }

  function exportJson() {
    readStaticFields();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = state.characterName ? state.characterName.toLowerCase().replace(/[^a-z0-9]+/gi, "-") : "ficha-ghanor";
    link.href = url;
    link.download = `${name}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    form.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches("[data-path]")) {
        const value = target.type === "number" ? clampFieldNumber(target) : target.value;
        setByPath(target.dataset.path, value);
        storage.save(state);
        renderTotals();
        return;
      }
      if (target.matches("[data-skill-training], [data-skill-other], [data-skill-custom]")) {
        const key = target.dataset.skillTraining || target.dataset.skillOther || target.dataset.skillCustom;
        state.skills[key] = state.skills[key] || {};
        if (target.dataset.skillTraining) state.skills[key].training = clampFieldNumber(target);
        if (target.dataset.skillOther) state.skills[key].other = clampFieldNumber(target);
        if (target.dataset.skillCustom) state.skills[key].customName = target.value;
        storage.save(state);
        renderTotals();
        return;
      }
      saveAndRender();
    });

    form.addEventListener("toggle", (event) => {
      const details = event.target.closest("details.ability-row");
      if (!details) return;
      const rows = Array.from(document.querySelectorAll(".ability-row"));
      const index = rows.indexOf(details);
      if (state.abilities[index]) state.abilities[index].open = details.open;
      storage.save(state);
    }, true);

    document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add]");
      const remove = event.target.closest("[data-remove]");
      if (add) {
        state[add.dataset.add].push(getEmptyItem(add.dataset.add));
        storage.save(state);
        renderDynamicLists();
      }
      if (remove) {
        state[remove.dataset.remove].splice(Number(remove.dataset.index), 1);
        storage.save(state);
        renderDynamicLists();
        renderTotals();
      }
    });

    document.querySelector("#exportJson").addEventListener("click", exportJson);
    document.querySelector("#importJson").addEventListener("change", (event) => importJson(event.target.files[0]));
    document.querySelector("#printSheet").addEventListener("click", () => window.print());
    document.querySelector("#clearSheet").addEventListener("click", () => {
      if (!confirm("Limpar a ficha salva neste navegador?")) return;
      storage.clear();
      Object.assign(state, blankCharacter());
      bootstrap();
    });
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
