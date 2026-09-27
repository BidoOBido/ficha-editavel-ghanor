(function () {
  "use strict";

  const LEGACY_SHEET_VERSION = 0;
  const CURRENT_SHEET_VERSION = 4;
  const MAX_TEXT_LENGTH = 5000;
  const MAX_SHORT_TEXT_LENGTH = 200;
  const MAX_LIST_ITEMS = 200;
  const ALLOWED_ATTRIBUTE_KEYS = new Set(["for", "des", "con", "int", "sab", "car"]);
  const ALLOWED_SPELL_ATTRIBUTES = new Set(["int", "sab", "car"]);

  function readSheetVersion(character) {
    if (!character || typeof character !== "object") return LEGACY_SHEET_VERSION;
    return Number.isInteger(character.sheetVersion) ? character.sheetVersion : LEGACY_SHEET_VERSION;
  }

  function mergeCharacter(base, saved) {
    if (!saved || typeof saved !== "object") return base;
    const savedVersion = readSheetVersion(saved);
    const merged = assignSafe({}, base, saved);
    merged.sheetVersion = CURRENT_SHEET_VERSION;
    merged.playerName = cleanText(saved.playerName, MAX_SHORT_TEXT_LENGTH);
    merged.characterName = cleanText(saved.characterName, MAX_SHORT_TEXT_LENGTH);
    merged.race = cleanText(saved.race, MAX_SHORT_TEXT_LENGTH);
    merged.origin = cleanText(saved.origin, MAX_SHORT_TEXT_LENGTH);
    merged.className = cleanText(saved.className, MAX_SHORT_TEXT_LENGTH);
    merged.level = clampInteger(saved.level ?? base.level, 1, 20);
    if (calcNumber(merged.level) === 1) merged.level = 2;
    merged.xp = clampInteger(saved.xp ?? base.xp, 0, 190000);
    merged.attributes = normalizeAttributes(base.attributes, saved.attributes);
    merged.hp = normalizeResource(base.hp, saved.hp);
    merged.mp = normalizeResource(base.mp, saved.mp);
    merged.defense = assignSafe({}, base.defense, isPlainObject(saved.defense) ? saved.defense : {});
    if (Array.isArray(saved.defense?.armorRows)) {
      const armorRow = saved.defense.armorRows[0] || {};
      const shieldRow = saved.defense.armorRows[1] || {};
      merged.defense.armor = normalizeArmor(base.defense.armor, armorRow);
      merged.defense.shield = normalizeArmor(base.defense.shield, shieldRow);
    } else {
      merged.defense.armor = normalizeArmor(base.defense.armor, saved.defense?.armor);
      merged.defense.shield = normalizeArmor(base.defense.shield, saved.defense?.shield);
    }
    merged.defense.base = clampInteger(saved.defense?.base ?? base.defense.base, 0, 99);
    merged.defense.attribute = ALLOWED_ATTRIBUTE_KEYS.has(saved.defense?.attribute) ? saved.defense.attribute : base.defense.attribute;
    merged.defense.useAttribute = Boolean(saved.defense?.useAttribute ?? base.defense.useAttribute);
    merged.defense.other = clampInteger(saved.defense?.other ?? base.defense.other, -99, 99);
    if (typeof saved.defense?.armorBonus === "number") merged.defense.armor.defense = clampInteger(saved.defense.armorBonus, 0, 99);
    if (typeof saved.defense?.shieldBonus === "number") merged.defense.shield.defense = clampInteger(saved.defense.shieldBonus, 0, 99);
    delete merged.defense.armorRows;
    delete merged.defense.armorBonus;
    delete merged.defense.shieldBonus;
    merged.skills = normalizeSkills(migrateSkills(assignSafe({}, base.skills, isPlainObject(saved.skills) ? saved.skills : {}), savedVersion));
    merged.attacks = normalizeList(saved.attacks, normalizeAttack);
    merged.proficiencies = normalizeList(saved.proficiencies, normalizeProficiency);
    merged.abilities = normalizeList(saved.abilities, normalizeAbility);
    merged.spellcasting = normalizeSpellcasting(base.spellcasting, saved.spellcasting);
    merged.spells = normalizeSpells(Array.isArray(saved.spells) ? saved.spells : migrateSpellsFromAbilities(merged.abilities, savedVersion));
    merged.equipment = normalizeList(saved.equipment, normalizeEquipment);
    merged.notes = normalizeList(saved.notes, normalizeNote);
    merged.money = typeof saved.money === "number"
      ? { ...base.money, silver: clampInteger(saved.money, 0, 999999) }
      : normalizeMoney(base.money, saved.money);
    return merged;
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function assignSafe(target, ...sources) {
    sources.forEach((source) => {
      if (!isPlainObject(source)) return;
      Object.keys(source).forEach((key) => {
        if (key === "__proto__" || key === "constructor" || key === "prototype") return;
        target[key] = source[key];
      });
    });
    return target;
  }

  function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
    return String(value ?? "").slice(0, maxLength);
  }

  function clampInteger(value, min, max) {
    return Math.min(Math.max(Math.trunc(calcNumber(value)), min), max);
  }

  function normalizeList(value, normalizer) {
    return Array.isArray(value) ? value.slice(0, MAX_LIST_ITEMS).map(normalizer) : [];
  }

  function normalizeAttributes(base, saved) {
    const normalized = { ...base };
    if (!isPlainObject(saved)) return normalized;
    Object.keys(normalized).forEach((key) => {
      normalized[key] = clampInteger(saved[key] ?? normalized[key], -5, 30);
    });
    return normalized;
  }

  function normalizeResource(base, saved) {
    const source = isPlainObject(saved) ? saved : {};
    return {
      current: clampInteger(source.current ?? base.current, 0, 9999),
      temp: clampInteger(source.temp ?? base.temp, 0, 9999),
      max: clampInteger(source.max ?? base.max, 0, 9999)
    };
  }

  function normalizeArmor(base, saved) {
    const source = isPlainObject(saved) ? saved : {};
    return {
      name: cleanText(source.name ?? base.name, MAX_SHORT_TEXT_LENGTH),
      defense: clampInteger(source.defense ?? base.defense, 0, 99),
      penalty: clampInteger(source.penalty ?? base.penalty, -99, 0)
    };
  }

  function normalizeSkills(skills) {
    const normalized = {};
    Object.entries(skills).forEach(([key, entry]) => {
      if (!isPlainObject(entry)) return;
      normalized[key] = {
        trained: Boolean(entry.trained),
        other: clampInteger(entry.other, -99, 99),
        customName: cleanText(entry.customName, MAX_SHORT_TEXT_LENGTH)
      };
    });
    return normalized;
  }

  function normalizeSpellcasting(base, saved) {
    const source = isPlainObject(saved) ? saved : {};
    const attribute = ALLOWED_SPELL_ATTRIBUTES.has(source.attribute) ? source.attribute : base.attribute;
    return {
      attribute,
      equipmentBonus: clampInteger(source.equipmentBonus ?? base.equipmentBonus, -99, 99),
      powerBonus: clampInteger(source.powerBonus ?? base.powerBonus, -99, 99),
      otherBonus: clampInteger(source.otherBonus ?? base.otherBonus, -99, 99)
    };
  }

  function normalizeAttack(item) {
    const source = isPlainObject(item) ? item : {};
    return {
      name: cleanText(source.name, MAX_SHORT_TEXT_LENGTH),
      test: cleanText(source.test, MAX_SHORT_TEXT_LENGTH),
      damage: cleanText(source.damage, MAX_SHORT_TEXT_LENGTH),
      critical: cleanText(source.critical, MAX_SHORT_TEXT_LENGTH),
      range: cleanText(source.range, MAX_SHORT_TEXT_LENGTH),
      type: cleanText(source.type, MAX_SHORT_TEXT_LENGTH),
      spaces: clampInteger(source.spaces, 0, 999)
    };
  }

  function normalizeProficiency(item) {
    return { text: cleanText(isPlainObject(item) ? item.text : "") };
  }

  function normalizeAbility(item) {
    const source = isPlainObject(item) ? item : {};
    return {
      name: cleanText(source.name, MAX_SHORT_TEXT_LENGTH),
      kind: cleanText(source.kind || "Habilidade", MAX_SHORT_TEXT_LENGTH),
      cost: cleanText(source.cost, MAX_SHORT_TEXT_LENGTH),
      source: cleanText(source.source, MAX_SHORT_TEXT_LENGTH),
      description: cleanText(source.description),
      open: source.open !== false
    };
  }

  function normalizeSpell(item) {
    const source = isPlainObject(item) ? item : {};
    return {
      name: cleanText(source.name, MAX_SHORT_TEXT_LENGTH),
      circle: clampInteger(source.circle || 1, 1, 5),
      school: cleanText(source.school, MAX_SHORT_TEXT_LENGTH),
      execution: cleanText(source.execution, MAX_SHORT_TEXT_LENGTH),
      cost: cleanText(source.cost, MAX_SHORT_TEXT_LENGTH),
      range: cleanText(source.range, MAX_SHORT_TEXT_LENGTH),
      target: cleanText(source.target, MAX_SHORT_TEXT_LENGTH),
      duration: cleanText(source.duration, MAX_SHORT_TEXT_LENGTH),
      resistance: cleanText(source.resistance, MAX_SHORT_TEXT_LENGTH),
      partial: cleanText(source.partial, MAX_SHORT_TEXT_LENGTH),
      description: cleanText(source.description),
      open: source.open !== false
    };
  }

  function normalizeEquipment(item) {
    const source = isPlainObject(item) ? item : {};
    return {
      name: cleanText(source.name, MAX_SHORT_TEXT_LENGTH),
      quantity: clampInteger(source.quantity ?? 1, 0, 999),
      spaces: clampInteger(source.spaces, 0, 999),
      value: cleanText(source.value, MAX_SHORT_TEXT_LENGTH)
    };
  }

  function normalizeNote(item) {
    const source = isPlainObject(item) ? item : {};
    return {
      title: cleanText(source.title, MAX_SHORT_TEXT_LENGTH),
      text: cleanText(source.text),
      open: source.open !== false
    };
  }

  function normalizeMoney(base, saved) {
    const source = isPlainObject(saved) ? saved : {};
    return {
      bronze: clampInteger(source.bronze ?? base.bronze, 0, 999999),
      silver: clampInteger(source.silver ?? base.silver, 0, 999999),
      gold: clampInteger(source.gold ?? base.gold, 0, 999999)
    };
  }

  function calcNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function migrateSkills(skills, savedVersion) {
    if (savedVersion >= 2) return skills;
    return Object.fromEntries(Object.entries(skills).map(([key, entry]) => {
      if (!entry || typeof entry !== "object") return [key, entry];
      const migrated = { ...entry };
      if (typeof migrated.trained !== "boolean") migrated.trained = calcNumber(migrated.training) > 0;
      delete migrated.training;
      return [key, migrated];
    }));
  }

  function migrateSpellsFromAbilities(abilities, savedVersion) {
    if (savedVersion >= 3 || !Array.isArray(abilities)) return [];
    return abilities
      .filter((item) => /magia/i.test(item?.kind || ""))
      .map((item) => ({
        name: item.name || "",
        circle: 1,
        school: "",
        execution: "",
        cost: item.cost || "",
        range: "",
        target: "",
        duration: "",
        resistance: "",
        partial: "",
        description: item.description || "",
        open: item.open !== false
      }));
  }

  function normalizeSpells(spells) {
    return normalizeList(spells, normalizeSpell);
  }

  window.GhanorSheetData = {
    LEGACY_SHEET_VERSION,
    CURRENT_SHEET_VERSION,

    attributes: [
      { key: "for", label: "FOR", name: "Força" },
      { key: "des", label: "DES", name: "Destreza" },
      { key: "con", label: "CON", name: "Constituição" },
      { key: "int", label: "INT", name: "Inteligência" },
      { key: "sab", label: "SAB", name: "Sabedoria" },
      { key: "car", label: "CAR", name: "Carisma" }
    ],

    // [Ghanor] Lista e atributos espelham a ficha editável de A Lenda de Ghanor RPG.
    // Penalidade por armadura e "somente treinada" ficam visíveis para o jogador ajustar.
    skills: [
      { key: "acrobatics", name: "Acrobacia", attr: "des", armorPenalty: true },
      { key: "animalHandling", name: "Adestramento", attr: "car", trainedOnly: true },
      { key: "athletics", name: "Atletismo", attr: "for" },
      { key: "performance", name: "Atuação", attr: "car" },
      { key: "ride", name: "Cavalgar", attr: "des" },
      { key: "knowledge", name: "Conhecimento", attr: "int", trainedOnly: true },
      { key: "healing", name: "Cura", attr: "sab" },
      { key: "diplomacy", name: "Diplomacia", attr: "car" },
      { key: "deception", name: "Enganação", attr: "car" },
      { key: "fortitude", name: "Fortitude", attr: "con" },
      { key: "stealth", name: "Furtividade", attr: "des", armorPenalty: true },
      { key: "warfare", name: "Guerra", attr: "int", trainedOnly: true },
      { key: "initiative", name: "Iniciativa", attr: "des" },
      { key: "intimidation", name: "Intimidação", attr: "car" },
      { key: "insight", name: "Intuição", attr: "sab" },
      { key: "investigation", name: "Investigação", attr: "int" },
      { key: "thievery", name: "Ladinagem", attr: "des", armorPenalty: true, trainedOnly: true },
      { key: "melee", name: "Luta", attr: "for" },
      { key: "mysticism", name: "Misticismo", attr: "int", trainedOnly: true },
      { key: "nobility", name: "Nobreza", attr: "int", trainedOnly: true },
      { key: "craft1", name: "Ofício", attr: "int", trainedOnly: true, customName: true },
      { key: "craft2", name: "Ofício", attr: "int", trainedOnly: true, customName: true },
      { key: "perception", name: "Percepção", attr: "sab" },
      { key: "ranged", name: "Pontaria", attr: "des" },
      { key: "reflexes", name: "Reflexos", attr: "des" },
      { key: "religion", name: "Religião", attr: "sab", trainedOnly: true },
      { key: "survival", name: "Sobrevivência", attr: "sab" },
      { key: "will", name: "Vontade", attr: "sab" }
    ],

    blankCharacter() {
      return {
        sheetVersion: CURRENT_SHEET_VERSION,
        playerName: "",
        characterName: "",
        race: "",
        origin: "",
        className: "",
        level: 2,
        // [Tormenta20] Ghanor avança ao fim de aventuras, sem tabela de XP.
        // O campo existe para mesas que usam o fallback de XP de T20: 0 a 190.000.
        xp: 0,
        attributes: { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 },
        hp: { current: 0, temp: 0, max: 0 },
        mp: { current: 0, temp: 0, max: 0 },
        defense: {
          base: 10,
          attribute: "des",
          useAttribute: true,
          other: 0,
          armor: { name: "", defense: 0, penalty: 0 },
          shield: { name: "", defense: 0, penalty: 0 }
        },
        skills: {},
        attacks: [],
        proficiencies: [],
        abilities: [],
        spellcasting: { attribute: "int", equipmentBonus: 0, powerBonus: 0, otherBonus: 0 },
        spells: [],
        equipment: [],
        notes: [],
        // [Ghanor] Preços usam PP como referência. O livro usa PC para cobre;
        // a interface usa PB a pedido da mesa, convertido como 10 PB = 1 PP.
        money: { bronze: 0, silver: 0, gold: 0 }
      };
    },

    readSheetVersion,
    mergeCharacter
  };
})();
