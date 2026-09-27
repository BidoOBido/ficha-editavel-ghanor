(function () {
  "use strict";

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function signed(value) {
    const numeric = number(value);
    return numeric > 0 ? `+${numeric}` : String(numeric);
  }

  function halfLevel(level) {
    return Math.floor(Math.max(0, number(level)) / 2);
  }

  function totalArmorPenalty(character) {
    return (character.defense.armorRows || []).reduce((sum, row) => sum + number(row.penalty), 0);
  }

  function skillTotal(character, skill) {
    const entry = character.skills[skill.key] || {};
    const base = halfLevel(character.level);
    const attr = number(character.attributes[skill.attr]);
    const training = number(entry.training);
    const other = number(entry.other);
    const armor = skill.armorPenalty ? totalArmorPenalty(character) : 0;
    return base + attr + training + other + armor;
  }

  function defenseTotal(character) {
    const attr = character.defense.useAttribute ? number(character.attributes[character.defense.attribute]) : 0;
    return number(character.defense.base) + attr + number(character.defense.armorBonus) + number(character.defense.shieldBonus) + number(character.defense.other);
  }

  function loadUsed(character) {
    return (character.equipment || []).reduce((sum, item) => {
      return sum + number(item.quantity || 1) * number(item.spaces);
    }, 0);
  }

  window.GhanorSheetCalculations = {
    number,
    signed,
    halfLevel,
    skillTotal,
    defenseTotal,
    loadUsed,
    totalArmorPenalty
  };
})();
