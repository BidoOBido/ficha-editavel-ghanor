(function () {
  "use strict";

  window.GhanorSheetData = {
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
        playerName: "",
        characterName: "",
        race: "",
        origin: "",
        className: "",
        level: 1,
        // [Tormenta20] Ghanor avança ao fim de aventuras, sem tabela de XP.
        // O campo existe para mesas que usam o fallback de XP de T20: 0 a 190.000.
        xp: 0,
        attributes: { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 },
        hp: { current: 0, max: 0 },
        mp: { current: 0, max: 0 },
        defense: {
          base: 10,
          attribute: "des",
          useAttribute: true,
          armorBonus: 0,
          shieldBonus: 0,
          other: 0,
          armorRows: [
            { name: "", defense: 0, penalty: 0 },
            { name: "", defense: 0, penalty: 0 }
          ]
        },
        skills: {},
        attacks: [],
        proficiencies: [],
        abilities: [],
        equipment: [],
        money: 0
      };
    }
  };
})();
