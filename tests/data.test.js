const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8");
  vm.runInContext(source, context);
  return context.window.GhanorSheetData;
}

function loadCalculations() {
  const context = { window: {} };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "calculations.js"), "utf8");
  vm.runInContext(source, context);
  return context.window.GhanorSheetCalculations;
}

test("JSON legado sem versao e detectado como v0 antes da migracao", () => {
  const data = loadData();
  const character = data.mergeCharacter(data.blankCharacter(), { characterName: "Legado" });

  assert.equal(data.readSheetVersion({ characterName: "Legado" }), data.LEGACY_SHEET_VERSION);
  assert.equal(character.sheetVersion, data.CURRENT_SHEET_VERSION);
  assert.equal(character.characterName, "Legado");
});

test("JSON novo usa a versao atual", () => {
  const data = loadData();
  const character = data.blankCharacter();

  assert.equal(data.CURRENT_SHEET_VERSION, 4);
  assert.equal(character.sheetVersion, data.CURRENT_SHEET_VERSION);
  assert.equal(character.level, 2);
});

test("round-trip de exportacao e importacao preserva a versao", () => {
  const data = loadData();
  const exported = JSON.stringify({
    ...data.blankCharacter(),
    characterName: "Arnaldo",
    sheetVersion: data.CURRENT_SHEET_VERSION
  });
  const imported = data.mergeCharacter(data.blankCharacter(), JSON.parse(exported));

  assert.equal(imported.sheetVersion, data.CURRENT_SHEET_VERSION);
  assert.equal(imported.characterName, "Arnaldo");
});

test("fichas de nivel 1 sao migradas para nivel 2", () => {
  const data = loadData();
  const imported = data.mergeCharacter(data.blankCharacter(), {
    sheetVersion: 1,
    level: 1
  });

  assert.equal(imported.level, 2);
  assert.equal(imported.sheetVersion, data.CURRENT_SHEET_VERSION);
});

test("treinamento numerico legado vira checkbox treinado", () => {
  const data = loadData();
  const imported = data.mergeCharacter(data.blankCharacter(), {
    sheetVersion: 1,
    skills: {
      melee: { training: 2, other: 1 },
      ranged: { training: 0, other: 3 }
    }
  });

  assert.equal(imported.skills.melee.trained, true);
  assert.equal(imported.skills.melee.training, undefined);
  assert.equal(imported.skills.melee.other, 1);
  assert.equal(imported.skills.ranged.trained, false);
});

test("bonus de treinamento segue faixa por nivel", () => {
  const calc = loadCalculations();

  assert.equal(calc.trainingBonus(2), 2);
  assert.equal(calc.trainingBonus(7), 4);
  assert.equal(calc.trainingBonus(15), 6);
});

test("total de pericia usa checkbox treinado em vez de campo numerico", () => {
  const calc = loadCalculations();
  const character = {
    level: 7,
    attributes: { for: 3 },
    defense: { armor: { penalty: 0 }, shield: { penalty: 0 } },
    skills: { melee: { trained: true, other: 1 } }
  };

  assert.equal(calc.skillTotal(character, { key: "melee", attr: "for" }), 11);
});

test("magias antigas em habilidades alimentam o novo bloco por circulo", () => {
  const data = loadData();
  const imported = data.mergeCharacter(data.blankCharacter(), {
    sheetVersion: 2,
    abilities: [
      { name: "Raio", kind: "Magia", cost: "1 PM", description: "Reflexos reduz a metade" },
      { name: "Peçonha", kind: "Veneno", description: "Fortitude evita" },
      { name: "Grito", kind: "Habilidade" }
    ]
  });

  assert.equal(imported.spells.length, 1);
  assert.equal(imported.spells[0].name, "Raio");
  assert.equal(imported.spells[0].circle, 1);
  assert.equal(imported.spells[0].cost, "1 PM");
  assert.equal(imported.abilities.length, 3);
});

test("CD de magia usa nivel, atributo e bonus", () => {
  const calc = loadCalculations();
  const character = {
    level: 10,
    attributes: { int: 4 },
    spellcasting: {
      attribute: "int",
      equipmentBonus: 1,
      powerBonus: 2,
      otherBonus: 3
    }
  };

  assert.equal(calc.spellcastingCD(character), 25);
});

test("calculos rejeitam numeros com conteudo nao numerico", () => {
  const calc = loadCalculations();

  assert.equal(calc.number("10"), 10);
  assert.equal(calc.number("-3"), -3);
  assert.equal(calc.number("10<script>"), 0);
  assert.equal(calc.number("0x10"), 0);
  assert.equal(calc.number("1e3"), 0);
});

test("calculos rejeitam chaves textuais de atributo nao permitidas", () => {
  const calc = loadCalculations();
  const character = {
    level: "10<script>",
    attributes: {
      for: 3,
      int: 4,
      "__proto__": 99
    },
    defense: {
      useAttribute: true,
      attribute: "__proto__",
      base: "10",
      other: "1<script>",
      armor: { defense: "2<script>", penalty: 0 },
      shield: { defense: "1", penalty: 0 }
    },
    spellcasting: {
      attribute: "for",
      equipmentBonus: "1<script>",
      powerBonus: "2",
      otherBonus: "3"
    },
    skills: { melee: { trained: true, other: "1<script>" } }
  };

  assert.equal(calc.defenseTotal(character), 11);
  assert.equal(calc.spellcastingCD(character), 15);
  assert.equal(calc.skillTotal(character, { key: "melee", attr: "__proto__" }), 2);
});

test("magias de quinto circulo sao preservadas", () => {
  const data = loadData();
  const imported = data.mergeCharacter(data.blankCharacter(), {
    sheetVersion: 3,
    spells: [{ name: "Milagre", circle: 5 }]
  });

  assert.equal(imported.spells[0].circle, 5);
});

test("importacao ignora chaves de poluicao de prototipo", () => {
  const data = loadData();
  const malicious = JSON.parse('{"__proto__":{"polluted":true},"skills":{"__proto__":{"polluted":true},"melee":{"trained":true}}}');
  const imported = data.mergeCharacter(data.blankCharacter(), malicious);

  assert.equal({}.polluted, undefined);
  assert.equal(imported.polluted, undefined);
  assert.equal(imported.skills.polluted, undefined);
  assert.equal(imported.skills.melee.trained, true);
});

test("importacao limita listas e campos longos", () => {
  const data = loadData();
  const longText = "x".repeat(6000);
  const imported = data.mergeCharacter(data.blankCharacter(), {
    notes: Array.from({ length: 250 }, () => ({ title: longText, text: longText }))
  });

  assert.equal(imported.notes.length, 200);
  assert.equal(imported.notes[0].title.length, 200);
  assert.equal(imported.notes[0].text.length, 5000);
});

test("importacao limita numeros ao intervalo da interface", () => {
  const data = loadData();
  const imported = data.mergeCharacter(data.blankCharacter(), {
    level: 999,
    xp: -10,
    attributes: { for: 999 },
    hp: { current: -1, temp: 99999, max: 99999 },
    defense: { base: -10, other: 999, armor: { defense: 999, penalty: 999 } },
    money: { bronze: -1, silver: 9999999, gold: 10 }
  });

  assert.equal(imported.level, 20);
  assert.equal(imported.xp, 0);
  assert.equal(imported.attributes.for, 30);
  assert.equal(imported.hp.current, 0);
  assert.equal(imported.hp.temp, 9999);
  assert.equal(imported.defense.base, 0);
  assert.equal(imported.defense.other, 99);
  assert.equal(imported.defense.armor.defense, 99);
  assert.equal(imported.defense.armor.penalty, 0);
  assert.equal(imported.money.bronze, 0);
  assert.equal(imported.money.silver, 999999);
});
