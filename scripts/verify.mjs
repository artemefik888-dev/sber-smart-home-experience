import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const catalogPath = join(root, "site/data/catalog-rrc-4q2026.json");
const appPath = join(root, "site/assets/app.js");
const htmlPath = join(root, "site/index.html");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const app = await readFile(appPath, "utf8");
const html = await readFile(htmlPath, "utf8");

assert.equal(catalog.length, 45, "Каталог должен содержать 45 SKU");
assert.equal(new Set(catalog.map((item) => item.sku)).size, 45, "SKU должны быть уникальными");
for (const item of catalog) {
  assert.deepEqual(Object.keys(item).sort(), ["description", "name", "rrc", "sku"], `Только разрешённые поля A–E для ${item.sku}`);
  assert.ok(item.sku && item.name && item.description, `Заполненные данные ${item.sku}`);
  assert.ok(Number.isFinite(item.rrc) && item.rrc >= 0, `Корректная РРЦ ${item.sku}`);
}

const prices = new Map(catalog.map((item) => [item.sku, item.rrc]));
const expected = {
  "SBDV-00029": 1990, "SBDV-00030": 1790, "SBDV-00079": 1790, "SBDV-00032": 1790,
  "SBDV-00154": 1790, "SBDV-00068": 2790, "SBDV-00033": 2990, "SBDV-00185": 3990,
  "SBDV-00123W": 1490, "ATN000115Z": 2590, "ATN001015Z": 2990, "ATN000117Z": 3190,
  "ATN001017Z": 3690,
};
for (const [sku, price] of Object.entries(expected)) assert.equal(prices.get(sku), price, `${sku}: РРЦ 4Q 2026`);

const entryWhite = ["SBDV-00068", "SBDV-00030", "ATN000153Z", "ATN000145Z"].reduce((sum, sku) => sum + prices.get(sku), 0);
const entryCarbon = ["SBDV-00068", "SBDV-00030", "ATN001053Z", "ATN001045Z"].reduce((sum, sku) => sum + prices.get(sku), 0);
assert.equal(entryWhite, 10560, "Прихожая Базовый, белый");
assert.equal(entryCarbon, 11560, "Прихожая Базовый, карбон");

for (const room of ["entry", "corridor", "living", "bedroom", "nursery", "kitchen", "bath", "toilet"]) {
  assert.ok(app.includes(`id: "${room}"`), `Комната ${room} присутствует`);
  await access(join(root, `site/assets/rooms/${room}.jpg`));
}
assert.ok(app.includes("Демонстрационный подбор"));
assert.ok(app.includes("sourceUrl") && app.includes("shortNote"));
assert.ok(app.includes("O2U152W1R") && app.includes("SWITCH_2"));
assert.ok(html.includes("./assets/app.js") && html.includes("./assets/styles.css"), "Относительные пути для GitHub Pages");
await access(join(root, "site/assets/rooms/apartment-hero.jpg"));

console.log(`Проверено: ${catalog.length} SKU, 8 комнат, цены, источники, ассеты и GitHub Pages paths.`);
