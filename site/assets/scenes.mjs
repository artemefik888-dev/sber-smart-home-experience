import { deviceCategory, deviceInfo, instances, roomType } from "./model.mjs";

const scene = (id, name, category, required, event, action, result, before, after) =>
  ({ id, name, category, required, event, action, result, before, after });
const heat = scene("warm", "Комфортное тепло", "climate", ["climate","heat"],
  "Датчик замечает 19 °C", "Терморегулятор открывает клапан", "Температура растёт к 22 °C",
  { climate: 22, heat: 28 }, { climate: 21.4, heat: 82 });
const measure = scene("climate", "Проверить микроклимат", "climate", ["climate"],
  "В комнате меняется влажность", "Датчик обновляет показания", "Новые показания видны в «Салюте»",
  { climate: 45 }, { climate: 58 });
const leak = scene("leak", "Протечка замечена", "safety", ["water"],
  "На датчик попадает вода", "Датчик передаёт сигнал", "Уведомление о протечке доставлено",
  { water: false }, { water: true });
const protect = scene("protect", "Вода перекрыта", "safety", ["valve"],
  "Датчик системы обнаруживает воду", "Блок подаёт команду приводам", "Краны закрыты. Подача воды остановлена",
  { valve: false, water: false }, { valve: true, water: true });
const motion = scene("movement", "Свет при движении", "light", ["motion","switch"],
  "Датчик замечает движение", "Выключатель получает команду", "Обычный свет включён",
  { motion: false, switch: false }, { motion: true, switch: true });
const welcome = scene("welcome", "Я дома", "light", ["door","switch"],
  "Входная дверь открывается", "Выключатель получает команду", "Свет встречает у двери",
  { door: false, switch: false }, { door: true, switch: true });
const away = scene("away", "Я ушёл", "safety", ["switch","socket"],
  "Запущена команда ухода", "Свет и розетка получают команду", "Свет погас, подключённый прибор без питания",
  { switch: true, socket: true }, { switch: false, socket: false });
const rest = scene("rest", "Время отдыха", "light", ["switch","strip","speaker"],
  "Команда «Время отдыха»", "Верхний свет гаснет, лента и колонка включаются", "Мягкая подсветка и музыка",
  { switch: true, strip: 0, speaker: false }, { switch: false, strip: 65, speaker: true });
const story = scene("fairytale", "Пора спать", "light", ["switch","night","speaker"],
  "Команда «Пора спать»", "Гаснет верхний свет, включаются ночник и колонка", "Тёплый ночник и сказка",
  { switch: true, night: 0, speaker: false }, { switch: false, night: 45, speaker: true });
const nightStory = scene("night-story", "Ночник и сказка", "light", ["night","speaker"],
  "Пора готовиться ко сну", "Ночник загорается, колонка запускает сказку", "В комнате мягкий свет и сказка",
  { night: 0, speaker: false }, { night: 35, speaker: true });
const leave = scene("leave-entry", "Ухожу из дома", "safety", ["button","switch"],
  "Нажата кнопка у двери", "Выключатель размыкает цепь", "Свет в прихожей погас",
  { button: false, switch: true }, { button: true, switch: false });
const opening = scene("door", "Дверь под контролем", "safety", ["door"],
  "Дверь открывается", "Датчик передаёт сигнал", "Уведомление об открытии доставлено",
  { door: false }, { door: true });
const cooking = scene("cook", "Готовлю ужин", "light", ["strip"],
  "Запущена команда для кухни", "Лента увеличивает яркость", "Рабочая поверхность освещена",
  { strip: 0 }, { strip: 90 });
const wake = scene("wake", "Доброе утро", "light", ["lamp","speaker"],
  "Наступает заданное время", "Лампа плавно загорается, колонка включается", "Мягкий свет и музыка",
  { lamp: 0, speaker: false }, { lamp: 60, speaker: true });
const sleep = scene("sleep", "Спокойной ночи", "light", ["switch","lamp"],
  "Команда перед сном", "Свет выключается, лампа приглушается", "У кровати остаётся мягкий свет",
  { switch: true, lamp: 80 }, { switch: false, lamp: 24 });
const warmFloor = scene("floor", "Тёплый пол", "climate", ["floor"],
  "У термостата новая цель", "Термостат подаёт команду на нагрев", "Пол нагревается к 27 °C",
  { floor: 22 }, { floor: 27 });
const scenic = {
  entry: [opening, welcome, leave, motion], kitchen: [cooking, leak, away, heat],
  living: [rest, away, heat, wake], bedroom: [sleep, wake, heat, away],
  nursery: [story, nightStory, wake, heat, away], bath: [leak, protect, motion, measure, warmFloor], utility: [protect],
};
const partnerTypes = { living: ["curtain","robot"], kitchen: ["robot","kettle"], bedroom: ["curtain","humidifier"] };
export const partnersFor = room => (partnerTypes[roomType(room)] ?? []).map(kind => ({
  id: room + ":partner:" + kind, room, kind, partner: true, index: 0, qty: 1, title: deviceInfo[kind][0],
}));
const partnerStories = {
  curtain: scene("curtains", "Открыть шторы", "curtains", ["curtain"], "Команда для штор",
    "Совместимый привод открывает полотно", "Дневной свет входит в комнату", { curtain: 0 }, { curtain: 100 }),
  robot: scene("weekend", "Выходной без уборки", "safety", ["robot"], "Запущена уборка",
    "Робот выезжает с базы", "Робот убирает комнату", { robot: false }, { robot: true }),
  kettle: scene("tea", "Время чая", "safety", ["kettle"], "Запрос на нагрев воды",
    "Подключённый чайник начинает нагрев", "Вода нагрета", { kettle: 22 }, { kettle: 99 }),
  humidifier: scene("humidify", "Увлажнить воздух", "climate", ["humidifier"], "Команда для увлажнителя",
    "Увлажнитель запускается", "Влажность повышается", { humidifier: 35 }, { humidifier: 49 }),
};
const general = [
  scene("lighting", "Управлять светом", "light", ["switch"], "Нажатие выключателя", "Реле замыкает цепь", "Верхний свет включён", { switch: false }, { switch: true }),
  scene("power", "Выключить прибор", "safety", ["socket"], "Команда из приложения", "Розетка отключает питание", "Прибор обесточен", { socket: true }, { socket: false }),
  scene("music", "Включить музыку", "light", ["speaker"], "Команда для колонки", "Колонка запускает воспроизведение", "Музыка играет", { speaker: false }, { speaker: true }),
  scene("relay", "Включить свет через реле", "light", ["relay"], "Команда для реле", "Реле замыкает цепь", "Свет включён", { relay: false }, { relay: true }),
  scene("lamp", "Мягкий свет лампы", "light", ["lamp"], "Новая яркость", "Лампа меняет световой поток", "Лампа светит мягче", { lamp: 0 }, { lamp: 50 }),
  scene("night", "Ночник перед сном", "light", ["night"], "Команда для ночника", "Ночник включает тёплый свет", "У кровати мягкий свет", { night: 0 }, { night: 42 }),
  scene("media", "Запустить медиаприставку", "light", ["media"], "Команда просмотра", "Приставка запускается", "Медиаприставка активна", { media: false }, { media: true }),
  scene("motion", "Движение замечено", "safety", ["motion"], "Человек проходит мимо", "Датчик передаёт событие", "Движение зафиксировано", { motion: false }, { motion: true }),
  opening, motion, welcome, heat, measure, leak, protect, warmFloor, away, cooking,
];

export function roomScenes(room, rows, allowPartners) {
  const units = instances(rows);
  const available = new Set(units.map(d => d.kind));
  const candidates = [...(scenic[roomType(room)] ?? []), ...general];
  const seen = new Set();
  const ready = candidates.filter(s => {
    if (seen.has(s.id) || !s.required.every(k => available.has(k))) return false;
    seen.add(s.id);
    return true;
  });
  if (allowPartners) ready.push(...partnersFor(room).map(d => ({ ...partnerStories[d.kind], partner: true })));
  return ready;
}

export function sceneRows(s, rows) {
  if (s.partner) return [];
  return s.required.flatMap(type => {
    const row = rows.find(x => x.kind === type);
    return row ? [[row.base, 1]] : [];
  });
}

export function condition(s, rows) {
  if (s.partner) return "Дополнительно: совместимое устройство (не входит в комплект). Функции зависят от модели.";
  if (s.id === "protect") return "Используются датчики и приводы из комплекта системы защиты. Диаметр уточняется по месту.";
  if (s.id === "leak" && !rows.some(d => d.kind === "valve")) return "Датчик сообщает о воде. Для перекрытия нужна система защиты с приводами.";
  const types = s.required;
  const bridge = rows.some(d => d.kind === "hub" || d.base?.startsWith("SBDV-00171"));
  const needsBridge = types.some(kind => ["motion","door","button","climate","water","heat","switch","relay"].includes(kind));
  if (needsBridge && !bridge) return "Для Zigbee-устройств подготовьте совместимый хаб или SberBoom Home.";
  if (types.includes("lamp") && rows.some(r => r.kind === "lamp" && /^SBDV-0030[567]$/.test(r.base))) return "Для лампы Matter проверьте совместимость контроллера и сети квартиры.";
  return "";
}

export const defaults = {
  switch: true, relay: false, strip: 0, lamp: 0, night: 0, socket: true, speaker: false, hub: true,
  media: false, door: false, motion: false, button: false, water: false, valve: false,
  climate: 22, heat: 28, floor: 22, curtain: 100, robot: false, kettle: 22, humidifier: 35,
};
export function stateLabel(type, value) {
  if (type === "valve") return value ? "Краны закрыты" : "Краны открыты";
  if (type === "water") return value ? "Обнаружена вода" : "Сухо";
  if (type === "door") return value ? "Открыта" : "Закрыта";
  if (type === "motion") return value ? "Движение обнаружено" : "Спокойно";
  if (type === "button") return value ? "Сигнал отправлен" : "Ожидает нажатия";
  if (type === "hub") return value ? "Связь установлена" : "Связь проверяется";
  if (type === "speaker") return value ? "Воспроизведение" : "Пауза";
  if (type === "robot") return value ? "Убирает" : "На базе";
  if (["climate","floor","kettle"].includes(type)) return type === "climate" && value > 35 ? value + "% влажн." : value + " °C";
  if (typeof value === "number") return value + "%";
  return value ? "Включено" : "Выключено";
}
export const deviceTask = deviceCategory;
export const positions = {
  living: { switch:[7,50], strip:[49,16], speaker:[15,52], lamp:[66,36], socket:[7,87], climate:[46,45],
    heat:[90,65], curtain:[89,34], robot:[58,89] },
  entry: { door:[20,18], switch:[49,49], motion:[78,15], hub:[12,57], button:[51,61], speaker:[24,71] },
  kitchen: { water:[86,89], switch:[9,56], motion:[12,17], speaker:[44,71], strip:[73,50], socket:[80,62],
    climate:[32,43], heat:[13,73], robot:[71,92], kettle:[93,54] },
  bedroom: { switch:[8,54], lamp:[39,45], speaker:[47,58], climate:[23,34], heat:[77,62], socket:[91,74],
    curtain:[83,30], humidifier:[28,72] },
  nursery: { night:[83,48], switch:[93,58], speaker:[29,63], lamp:[52,18], climate:[15,29], heat:[70,67], socket:[88,83],humidifier:[23,78] },
  bath: { water:[57,90], floor:[15,55], switch:[9,45], climate:[51,36], valve:[90,72], motion:[88,14] },
  utility: { valve:[63,18], water:[64,92] },
  kitchen_living: { switch:[8,53], strip:[73,35], speaker:[24,52], lamp:[56,45], socket:[86,68], climate:[33,38],
    heat:[59,75], curtain:[94,35], robot:[58,89],water:[85,89],kettle:[86,58] },
};
export function devicePosition(room, unit) {
  if (unit.component) return room==="utility" ? [61,92] : [30,91];
  if (unit.xy) return unit.xy.map(n=>Math.min(94,Math.max(6,n*100)));
  const presets = {
    "У входа":[12,52],"На полу в мокрой зоне":[55,88],"На внутренней стене":[42,37],"У радиатора":[82,67],
  };
  if (unit.location==="Вне кадра") return null;
  if (presets[unit.location]) return presets[unit.location];
  if (roomType(room)==="bedroom" && unit.kind==="switch" && unit.index===1) return [57,74];
  const p = (positions[room] ?? positions[roomType(room)])?.[unit.kind];
  if (!p) return null;
  const shift = unit.index * (unit.kind==="water" ? 13 : 9);
  return [Math.max(5, p[0] - shift), Math.min(94, p[1] + Math.min(2, unit.index))];
}
