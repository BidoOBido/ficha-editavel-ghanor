(function () {
  "use strict";

  const LEGACY_SHEET_VERSION = 0;
  const CURRENT_SHEET_VERSION = 3;

  function readSheetVersion(character) {
    if (!character || typeof character !== "object") return LEGACY_SHEET_VERSION;
    return Number.isInteger(character.sheetVersion) ? character.sheetVersion : LEGACY_SHEET_VERSION;
  }

  function mergeCharacter(base, saved) {
    if (!saved || typeof saved !== "object") return base;
    const savedVersion = readSheetVersion(saved);
    const merged = { ...base, ...saved };
    merged.sheetVersion = CURRENT_SHEET_VERSION;
    if (calcNumber(merged.level) === 1) merged.level = 2;
    merged.attributes = { ...base.attributes, ...(saved.attributes || {}) };
    merged.hp = { ...base.hp, ...(saved.hp || {}) };
    merged.mp = { ...base.mp, ...(saved.mp || {}) };
    merged.defense = { ...base.defense, ...(saved.defense || {}) };
    if (Array.isArray(saved.defense?.armorRows)) {
      const armorRow = saved.defense.armorRows[0] || {};
      const shieldRow = saved.defense.armorRows[1] || {};
      merged.defense.armor = { ...base.defense.armor, ...armorRow };
      merged.defense.shield = { ...base.defense.shield, ...shieldRow };
    } else {
      merged.defense.armor = { ...base.defense.armor, ...(saved.defense?.armor || {}) };
      merged.defense.shield = { ...base.defense.shield, ...(saved.defense?.shield || {}) };
    }
    if (typeof saved.defense?.armorBonus === "number") merged.defense.armor.defense = saved.defense.armorBonus;
    if (typeof saved.defense?.shieldBonus === "number") merged.defense.shield.defense = saved.defense.shieldBonus;
    delete merged.defense.armorRows;
    delete merged.defense.armorBonus;
    delete merged.defense.shieldBonus;
    merged.skills = migrateSkills({ ...base.skills, ...(saved.skills || {}) }, savedVersion);
    merged.attacks = Array.isArray(saved.attacks) ? saved.attacks : base.attacks;
    merged.proficiencies = Array.isArray(saved.proficiencies) ? saved.proficiencies : base.proficiencies;
    merged.abilities = Array.isArray(saved.abilities) ? saved.abilities : base.abilities;
    merged.spellcasting = { ...base.spellcasting, ...(saved.spellcasting || {}) };
    merged.spells = normalizeSpells(Array.isArray(saved.spells) ? saved.spells : migrateSpellsFromAbilities(merged.abilities, savedVersion));
    merged.equipment = Array.isArray(saved.equipment) ? saved.equipment : base.equipment;
    merged.notes = Array.isArray(saved.notes) ? saved.notes : base.notes;
    merged.money = typeof saved.money === "number"
      ? { ...base.money, silver: saved.money }
      : { ...base.money, ...(saved.money || {}) };
    return merged;
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
    return spells.map((spell) => ({
      name: spell.name || "",
      circle: Math.min(Math.max(calcNumber(spell.circle) || 1, 1), 4),
      school: spell.school || "",
      execution: spell.execution || "",
      cost: spell.cost || "",
      range: spell.range || "",
      target: spell.target || "",
      duration: spell.duration || "",
      resistance: spell.resistance || "",
      partial: spell.partial || "",
      description: spell.description || "",
      open: spell.open !== false
    }));
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
