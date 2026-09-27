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
    return number(character.defense.armor?.penalty) + number(character.defense.shield?.penalty);
  }

  function armorDefense(character) {
    return number(character.defense.armor?.defense);
  }

  function shieldDefense(character) {
    return number(character.defense.shield?.defense);
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
    return number(character.defense.base) + attr + armorDefense(character) + shieldDefense(character) + number(character.defense.other);
  }

  function loadUsed(character) {
    return (character.equipment || []).reduce((sum, item) => {
      return sum + number(item.quantity || 1) * number(item.spaces);
    }, 0);
  }

  function loadLimit(character) {
    const strength = number(character.attributes?.for);
    return 10 + (strength >= 0 ? strength * 2 : strength);
  }

  function moneyTotalPP(character) {
    const money = character.money || {};
    return number(money.bronze) / 10 + number(money.silver) + number(money.gold) * 10;
  }

  function formatPP(value) {
    const numeric = number(value);
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(".", ",");
  }

  window.GhanorSheetCalculations = {
    number,
    signed,
    halfLevel,
    skillTotal,
    defenseTotal,
    armorDefense,
    shieldDefense,
    loadUsed,
    loadLimit,
    moneyTotalPP,
    formatPP,
    totalArmorPenalty
  };
})();
