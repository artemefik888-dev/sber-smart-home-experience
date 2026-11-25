import { catalog, colorPairs, roomKits, layouts, cases } from "./release-data.mjs";

export { catalog, roomKits, layouts, cases };
export const levels = { basic: "Базовый", comfort: "Комфорт", max: "Максимум" };
export const functions = {
  max: "Свет, климат и безопасность",
  light: "Умный свет",
  light_climate: "Умный свет + климат",
  safety: "Безопасность",
  safety_light: "Безопасность + умный свет",
};
export const tasks = { light: "Свет", climate: "Климат", safety: "Безопасность", curtains: "Управление шторами" };
export const rooms = {
  living: { name: "Гостиная", image: "living-release-2", story: "Отдохнуть дома", pitch: "Мягкий свет, музыка и комфортная температура." },
  entry: { name: "Прихожая / коридор", image: "entry", story: "Вернуться домой", pitch: "Узнайте, когда открылась дверь. Пусть свет встретит вас у входа." },
  kitchen: { name: "Кухня", image: "kitchen", story: "Приготовить ужин", pitch: "Подсветите столешницу и получите сигнал, если под мойкой появилась вода." },
  bedroom: { name: "Спальня 1", image: "bedroom", story: "Проснуться в своём темпе", pitch: "Мягкий свет утром и комфортное тепло ночью." },
  nursery: { name: "Спальня 2 / детская", image: "nursery", story: "Подготовиться ко сну", pitch: "Приглушите ночник и включите сказку." },
  bath: { name: "Ванная", image: "bath", story: "Вовремя заметить воду", pitch: "Уведомления о протечке и перекрытие воды с системой защиты." },
  utility: { name: "Сантехнический шкаф", image: "utility-release-2", story: "Защитить квартиру", pitch: "Блок защиты управляет кранами на вводе воды." },
};
export const planLabels = { studio: ["Студия", "30 м²"], one: ["1-комнатная", "40 м²"], two: ["2-комнатная", "60 м²"], three: ["3-комнатная", "65–75 м²"] };
const lookup = new Map(Object.keys(catalog).map(sku => [sku.toUpperCase(), sku]));
const whiteOf = Object.fromEntries(Object.entries(colorPairs).map(([white, carbon]) => [carbon, white]));
export const normSku = sku => lookup.get(String(sku ?? "").replace(/\s/g, "").toUpperCase());
export const baseSku = sku => whiteOf[normSku(sku)] ?? normSku(sku);
export const quantity = qty => Math.min(999, Math.max(0, Math.floor(Number(qty) || 0)));
export const rub = value => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₽";
export const roomType = id => ({ room: "bedroom", kitchen_living: "living" })[id] ?? id;
export const roomName = (id, names = {}) => names[id] || rooms[roomType(id)]?.name || id;
export const count = rows => rows.reduce((n, row) => n + row.qty, 0);
export const total = rows => rows.reduce((n, row) => n + row.qty * row.price, 0);

export function kind(sku) {
  const id = baseSku(sku);
  if (id?.startsWith("O2U")) return "valve";
  if (["ATN000145Z", "SBDV-00123W"].includes(id)) return "socket";
  if (id === "ATN000138Z") return "floor";
  if (id?.startsWith("ATN")) return "switch";
  if (["SBDV-00301", "SBDV-00302"].includes(id)) return "relay";
  if (["SBDV-00305", "SBDV-00306", "SBDV-00307", "SBDV-00115", "SBDV-00117", "SBDV-00120"].includes(id)) return "lamp";
  return {
    "SBDV-00006": "media", "SBDV-00029": "motion", "SBDV-00030": "door",
    "SBDV-00032": "button", "SBDV-00033": "strip", "SBDV-00038": "extension",
    "SBDV-00068": "hub", "SBDV-00079": "climate", "SBDV-00126": "night",
    "SBDV-00127": "night", "SBDV-00154": "water", "SBDV-00185": "heat",
  }[id] ?? "speaker";
}

export const deviceInfo = {
  switch: ["Выключатель", "Свет", "У входа"], relay: ["Реле", "Свет", "В монтажной коробке"],
  strip: ["Светодиодная лента", "Свет", "В контуре подсветки"], lamp: ["Умная лампа", "Свет", "В светильнике"],
  night: ["Ночник", "Свет", "У кровати"], extension: ["Удлинитель ленты", "Свет", "В контуре подсветки"],
  socket: ["Розетка", "Питание", "У подключённого прибора"], speaker: ["Колонка", "Звук", "На открытой полке"],
  hub: ["Хаб", "Связь", "В доступной точке"], media: ["Медиаприставка", "Мультимедиа", "Рядом с телевизором"],
  door: ["Датчик открытия", "Безопасность", "На дверной коробке"], motion: ["Датчик движения", "Безопасность", "В верхней части стены"],
  button: ["Сценарная кнопка", "Управление", "На стене или полке"], water: ["Датчик протечки", "Безопасность", "На полу в мокрой зоне"],
  valve: ["Система защиты", "Безопасность", "У ввода воды, вне кадра"], climate: ["Датчик климата", "Климат", "На внутренней стене"],
  heat: ["Терморегулятор", "Климат", "На радиаторе"], floor: ["Термостат пола", "Климат", "На стене у входа"],
  curtain: ["Шторы", "Шторы", "На окне"], robot: ["Робот-пылесос", "Уборка", "На полу"],
  kettle: ["Чайник", "Кухня", "На столешнице"], humidifier: ["Увлажнитель", "Климат", "На устойчивой поверхности"],
};
export const deviceCategory = type => (["switch","relay","strip","lamp","night","extension"].includes(type) ? "light"
  : ["climate","heat","floor","humidifier"].includes(type) ? "climate" : type === "curtain" ? "curtains" : "safety");

export function makeRow(room, sku, qty, color = "white") {
  const base = baseSku(sku);
  const canonical = color === "carbon" ? colorPairs[base] ?? base : base;
  if (!canonical || !quantity(qty)) return null;
  const item = catalog[canonical];
  return {
    id: room + ":" + base, room, base, sku: canonical, qty: quantity(qty), price: item.rrc,
    title: item.title, image: item.image, kind: kind(base),
    color: colorPairs[base] ? color === "carbon" ? "Карбон" : "Белый" : "",
  };
}

export const listRows = (room, pairs, color) => pairs.map(([sku, qty]) => makeRow(room, sku, qty, color)).filter(Boolean);
export const kitRows = (room, level, color) => listRows(room, roomKits[room]?.[level] || [], color);
export const planRows = (plan, variant = "max", color, overrides = {}) =>
  layouts[plan].rows.flatMap(([room, sku, qty, tags]) => {
    const row = makeRow(room, sku, qty, color);
    const active = variant === "max" || tags.includes(variant);
    const chosen = overrides[row.id] ?? (active ? qty : 0);
    return makeRow(room, sku, chosen, color) || [];
  });

export function groupRows(rows) {
  return Object.groupBy(rows, row => row.room);
}

export function instances(rows) {
  return rows.flatMap(row => Array.from({ length: row.qty }, (_, index) => ({
    ...row, rowId: row.id, id: row.id + ":" + (index + 1), index,
  })));
}

export function cartRows(kits, sceneSelections, color) {
  const merged = new Map();
  function add(row, source) {
    const prev = merged.get(row.id);
    merged.set(row.id, {
      ...row, qty: Math.max(row.qty, prev?.qty ?? 0), sources: [...(prev?.sources ?? []), source],
    });
  }
  for (const [room, level] of Object.entries(kits)) kitRows(room, level, color).forEach(row => add(row, levels[level]));
  for (const sc of Object.values(sceneSelections)) listRows(sc.room, sc.items, color).forEach(row => add(row, sc.name));
  return [...merged.values()];
}

export function recommendedKits(selectedRooms, selectedTasks, budget, color) {
  const applicable = selectedTasks.filter(task => task !== "curtains");
  if (!selectedRooms.length || !selectedTasks.length) return { chosen: {}, sum: 0 };
  const coverage = rows => new Set(rows.map(row => deviceCategory(row.kind)));
  const wanted = Object.fromEntries(selectedRooms.map(room => {
    const best = Object.keys(levels).find(level => {
      const categories = coverage(kitRows(room, level, color));
      return applicable.every(task => categories.has(task));
    }) ?? "max";
    return [room, best];
  }));
  const sum = total(Object.entries(wanted).flatMap(([room, level]) => kitRows(room, level, color)));
  return { chosen: wanted, sum, surcharge: Math.max(0, sum - budget) };
}

export const caseRoom = id => ({ entry:"entry", nursery:"nursery", bedroom:"bedroom", climate:"bath", light:"living", safety:"entry", module_safety:"utility", module_climate:"bath", module_light:"living", module_media:"living" })[id] || "living";
export function caseRows(id, color, options = {}) {
  const item = cases.find(x => x.id === id);
  if (!item) return [];
  const room = caseRoom(id);
  const pairs = item.variableProducts?.map(sku => [sku, options[sku]]) || item.items;
  const extras = id === "safety" && options.protection ? [[options.protection, 1]] : [];
  return listRows(room, [...pairs, ...extras], color);
}

export const questionTypes = {
  valve: { label: "Зоны перекрытия воды", help: "Одна система на зону. Уточните диаметр на вводе.", options: ["O2U152W1R", "O2U202W1R"] },
  heat: { label: "Радиаторы", help: "По терморегулятору на радиатор. Сверьте клапан и крепление.", options: ["SBDV-00185"] },
  switch: { label: "Выключатели", help: "Выберите число клавиш и вариант подключения нейтрали.", options: ["ATN000115Z", "ATN000117Z", "ATN000113Z", "ATN000153Z"] },
  socket: { label: "Управляемые розетки", help: "Уточните количество приборов, которыми нужно управлять.", options: ["ATN000145Z", "SBDV-00123W"] },
  floor: { label: "Тёплый пол", help: "Сверьте тип пола и совместимость термостата.", options: ["ATN000138Z"] },
  lamp: { label: "Лампы", help: "Уточните цоколь и поддержку Matter сетью квартиры.", options: ["SBDV-00305","SBDV-00306","SBDV-00307","SBDV-00120"] },
  hub: { label: "Хабы", help: "Учитывайте уже имеющийся совместимый хаб или SberBoom Home.", options: ["SBDV-00068"] },
};

export function applyAdjustments(rows, changes, color) {
  const merged = new Map(rows.map(row => [row.id, row]));
  for (const { room, oldSku, sku, qty, location, xy } of Object.values(changes)) {
    const oldId = room + ":" + baseSku(oldSku);
    const next = makeRow(room, sku, qty, color);
    merged.delete(oldId);
    if (next) merged.set(next.id, { ...next, location: location ?? "", xy });
  }
  return [...merged.values()];
}
