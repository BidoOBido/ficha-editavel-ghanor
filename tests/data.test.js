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

  assert.equal(data.CURRENT_SHEET_VERSION, 2);
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
