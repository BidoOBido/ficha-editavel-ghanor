(function () {
  "use strict";

  function create({ attributes, calc, labelHints }) {
    function field(path, label, value, type = "text", options = {}) {
      const numberAttrs = type === "number"
        ? ` min="${options.min ?? -999}" max="${options.max ?? 9999}" step="1"`
        : "";
      const hint = labelHints[label];
      const title = hint ? ` title="${escapeAttr(hint)}"` : "";
      const className = options.grid ? " class=\"grid-field\"" : "";
      return `<label${className}${title}><span class="field-label">${label}</span><input data-path="${path}" type="${type}"${numberAttrs}${title} value="${escapeAttr(value ?? "")}"></label>`;
    }

    function selectField(path, label, value, options, isAttribute = false) {
      const content = options.map((option) => {
        const display = isAttribute && option ? option.toUpperCase() : option;
        return `<option value="${escapeAttr(option)}"${option === (value ?? "") ? " selected" : ""}>${display || "-"}</option>`;
      }).join("");
      return `<label><span class="field-label">${label}</span><select data-path="${path}">${content}</select></label>`;
    }

    function rowActions(type, index, collapsible = false, open = true) {
      const toggle = collapsible
        ? `<button type="button" class="icon-button no-print" data-toggle-row="${type}" data-index="${index}" aria-label="${open ? "Colapsar" : "Abrir"}">${open ? "⌄" : "›"}</button>`
        : "";
      return `
        <div class="row-actions no-print">
          ${toggle}
          <button type="button" class="icon-button drag-handle" draggable="true" data-drag="${type}" data-index="${index}" aria-label="Reordenar">↕</button>
          <button type="button" class="icon-button" data-copy="${type}" data-index="${index}" aria-label="Copiar">⧉</button>
        </div>
      `;
    }

    function removeButton(type, index) {
      return `<button type="button" class="icon-button no-print" data-remove="${type}" data-index="${index}" aria-label="Remover">×</button>`;
    }

    function attributeName(key) {
      return attributes.find((attr) => attr.key === key)?.name || key;
    }

    function spellCircleCost(circle) {
      return ({ 1: "1 PM", 2: "3 PM", 3: "6 PM", 4: "10 PM", 5: "15 PM" })[circle];
    }

    return {
      attributes() {
        return attributes.map((attr) => `
          <label class="attribute-card ornamental" title="${attr.name}">
            <span title="${attr.name}">${attr.label}</span>
            <input name="attr-${attr.key}" type="number" min="-5" max="30" step="1" aria-label="${attr.name}" title="${attr.name}">
          </label>
        `).join("");
      },

      skills(skills) {
        return skills.map((skill) => {
          const suffixes = `${skill.armorPenalty ? " <span title=\"Penalidade de armadura\">¤</span>" : ""}${skill.trainedOnly ? " <span title=\"Somente treinada\">★</span>" : ""}`;
          const craftInput = skill.customName ? `<input class="skill-custom" data-skill-custom="${skill.key}" type="text" placeholder="especialidade">` : "";
          return `
            <div class="skill-row" data-skill="${skill.key}">
              <input class="skill-trained" data-skill-trained="${skill.key}" type="checkbox" aria-label="Treinada em ${skill.name}">
              <label class="skill-name">${skill.name}${craftInput}${suffixes}</label>
              <output class="skill-total" data-skill-total="${skill.key}">0</output>
              <span class="math">=</span>
              <span class="muted" data-half-skill>0</span>
              <span class="math">+</span>
              <span class="muted attr-ref" title="${attributeName(skill.attr)}">${skill.attr.toUpperCase()}</span>
              <span class="math">+</span>
              <span class="muted" data-skill-training-bonus="${skill.key}">0</span>
              <span class="math">+</span>
              <input data-skill-other="${skill.key}" type="number" min="-99" max="99" step="1" aria-label="Outros em ${skill.name}">
            </div>
          `;
        }).join("");
      },

      attacks(item, index) {
        return `
          <article class="dynamic-row attack-row" data-row-type="attacks" data-index="${index}">
            ${rowActions("attacks", index)}
            ${field(`attacks.${index}.name`, "Nome", item.name, "text", { grid: true })}
            ${field(`attacks.${index}.test`, "Teste", item.test, "text", { grid: true })}
            ${field(`attacks.${index}.damage`, "Dano", item.damage, "text", { grid: true })}
            ${field(`attacks.${index}.critical`, "Crítico", item.critical, "text", { grid: true })}
            ${field(`attacks.${index}.range`, "Alcance", item.range, "text", { grid: true })}
            ${field(`attacks.${index}.type`, "Tipo", item.type, "text", { grid: true })}
            ${field(`attacks.${index}.spaces`, "Esp.", item.spaces, "number", { min: 0, max: 999, grid: true })}
            ${removeButton("attacks", index)}
          </article>
        `;
      },

      proficiencies(item, index) {
        return `
          <article class="dynamic-row simple-row" data-row-type="proficiencies" data-index="${index}">
            ${rowActions("proficiencies", index)}
            ${field(`proficiencies.${index}.text`, "Descrição", item.text)}
            ${removeButton("proficiencies", index)}
          </article>
        `;
      },

      abilities(item, index) {
        return `
          <article class="ability-row ${item.open === false ? "is-collapsed" : ""}" data-row-type="abilities" data-index="${index}">
            ${rowActions("abilities", index, true, item.open !== false)}
            <div class="ability-summary">
              ${field(`abilities.${index}.name`, "Nome", item.name)}
              ${field(`abilities.${index}.kind`, "Tipo", item.kind)}
              ${field(`abilities.${index}.cost`, "Custo", item.cost)}
              ${removeButton("abilities", index)}
            </div>
            <div class="ability-body">
              ${field(`abilities.${index}.source`, "Origem", item.source)}
              <label>Descrição<textarea data-path="abilities.${index}.description">${escapeHtml(item.description || "")}</textarea></label>
            </div>
          </article>
        `;
      },

      spells(spells) {
        return [1, 2, 3, 4, 5].map((circle) => {
          const circleSpells = spells
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => calc.number(item.circle) === circle);
          return `
            <section class="spell-circle" data-spell-circle="${circle}">
              <div class="spell-circle-heading">
                <h3>${circle}º Círculo</h3>
                <span>${spellCircleCost(circle)}</span>
                <button type="button" class="icon-button no-print" data-add-spell-circle="${circle}" aria-label="Adicionar magia de ${circle}º círculo">+</button>
              </div>
              <div class="spell-circle-list">
                ${circleSpells.length ? circleSpells.map(({ item, index }) => this.spell(item, index)).join("") : "<p class=\"empty\">Nenhuma magia.</p>"}
              </div>
            </section>
          `;
        }).join("");
      },

      spell(item, index) {
        return `
          <article class="spell-row ${item.open === false ? "is-collapsed" : ""}" data-row-type="spells" data-index="${index}">
            ${rowActions("spells", index, true, item.open !== false)}
            <div class="spell-summary">
              ${field(`spells.${index}.name`, "Nome", item.name)}
              <label class="spell-circle-select"><span class="field-label">Círculo</span><input data-path="spells.${index}.circle" type="number" min="1" max="5" step="1" value="${escapeAttr(item.circle ?? 1)}"></label>
              ${field(`spells.${index}.cost`, "Custo", item.cost)}
              ${selectField(`spells.${index}.resistance`, "Resistência", item.resistance, ["", "Fortitude", "Reflexos", "Vontade"])}
              ${removeButton("spells", index)}
            </div>
            <div class="spell-body">
              <div class="spell-details">
                ${field(`spells.${index}.school`, "Escola", item.school)}
                ${field(`spells.${index}.execution`, "Execução", item.execution)}
                ${field(`spells.${index}.range`, "Alcance", item.range)}
                ${field(`spells.${index}.target`, "Alvo/Área", item.target)}
                ${field(`spells.${index}.duration`, "Duração", item.duration)}
                ${field(`spells.${index}.partial`, "Se resistir", item.partial)}
              </div>
              <label>Descrição<textarea data-path="spells.${index}.description">${escapeHtml(item.description || "")}</textarea></label>
            </div>
          </article>
        `;
      },

      equipment(item, index) {
        return `
          <article class="dynamic-row equipment-row" data-row-type="equipment" data-index="${index}">
            ${rowActions("equipment", index)}
            ${field(`equipment.${index}.name`, "Item", item.name, "text", { grid: true })}
            ${field(`equipment.${index}.quantity`, "Qtd.", item.quantity, "number", { min: 0, max: 999, grid: true })}
            ${field(`equipment.${index}.spaces`, "Esp.", item.spaces, "number", { min: 0, max: 999, grid: true })}
            ${field(`equipment.${index}.value`, "Valor (PP)", item.value, "text", { grid: true })}
            ${removeButton("equipment", index)}
          </article>
        `;
      },

      notes(item, index) {
        return `
          <article class="note-item ${item.open === false ? "is-collapsed" : ""}" data-row-type="notes" data-index="${index}">
            ${rowActions("notes", index, true, item.open !== false)}
            <div class="dynamic-row note-row">
              ${field(`notes.${index}.title`, "Título", item.title)}
              ${removeButton("notes", index)}
            </div>
            <label class="note-body">Texto<textarea data-path="notes.${index}.text">${escapeHtml(item.text || "")}</textarea></label>
          </article>
        `;
      }
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  window.GhanorSheetComponents = { create };
})();
