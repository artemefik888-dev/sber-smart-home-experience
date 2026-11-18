const ROOM_ASSET = (name) => `./assets/rooms/${name}.jpg`;
const PRODUCT_ASSET = (sku) => `./assets/products/${sku.toLowerCase()}.png`;

const SOURCE = {
  entry: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/43f7be1c_Prikhozhaya_—_bazovii,_komfort,_maksimum.pdf",
  living: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/af7c679e_Gostinaya_—_bazovii,_komfort,_maksimum.pdf",
  bedroom: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/629c9cbb_Spalnya_—_bazovii,_komfort,_maksimum.pdf",
  nursery: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/505811b0_Detskaya_—_bazovii,_komfort,_maksimum.pdf",
  kitchen: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/5c628d49_Kukhnya_—_bazovii,_komfort,_maksimum.pdf",
  bath: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/18855674_Vannaya_—_bazovii,_komfort,_maksimum.pdf",
  scenarios: "https://cdn-app.sberdevices.ru/misc/0.0.0/assets/sd-help/2236f9eb_Katalog_stsenariev.pdf",
  lighting: "https://sberdevices.ru/smarthome/lighting/",
};

const CATEGORIES = {
  light: { name: "Умный свет", icon: "◐", short: "Свет" },
  climate: { name: "Комфортный климат", icon: "≈", short: "Климат" },
  safety: { name: "Безопасность", icon: "⌁", short: "Безопасность" },
};

const GLOBAL_PER_HOME_SKUS = new Set(["O2U152W1R", "O2U202W1R"]);

const SHORT_NAMES = {
  "SBDV-00068": "Умный хаб Sber",
  "SBDV-00079": "Датчик температуры и влажности",
  "SBDV-00029": "Датчик движения",
  "SBDV-00030": "Датчик открытия",
  "SBDV-00032": "Сценарная кнопка",
  "SBDV-00154": "Датчик протечки",
  "SBDV-00033": "Умная светодиодная лента",
  "SBDV-00115": "Умная лампа E27",
  "SBDV-00117": "Умная лампа E14",
  "SBDV-00120": "Сверхъяркая лампа E27",
  "SBDV-00123W": "Умная накладная розетка",
  "SBDV-00127": "Умный детский ночник",
  "SBDV-00126": "Умный детский ночник",
  "SBDV-00185": "Терморегулятор радиатора",
  "O2U152W1R": "Система защиты от протечек 1/2\"",
  "O2U202W1R": "Система защиты от протечек 3/4\"",
  "ATN000138Z": "Термостат тёплого пола, белый",
  "ATN001038Z": "Термостат тёплого пола, карбон",
  "ATN000145Z": "Встраиваемая розетка, белая",
  "ATN001045Z": "Встраиваемая розетка, карбон",
  "ATN000153Z": "Выключатель 2 клавиши, белый",
  "ATN001053Z": "Выключатель 2 клавиши, карбон",
  "ATN000115Z": "Выключатель 1 клавиша, белый",
  "ATN001015Z": "Выключатель 1 клавиша, карбон",
  "ATN000117Z": "Выключатель 2 клавиши, белый",
  "ATN001017Z": "Выключатель 2 клавиши, карбон",
};

const ROOMS = [
  {
    id: "entry", name: "Прихожая", asset: "entry", sourceUrl: SOURCE.entry, shortNote: "Официальное решение по комнате",
    intro: "Свет встречает у двери, а дом сообщает, когда вход открывается.",
    hotspots: [
      { id: "door", label: "Датчик открытия", sku: "SBDV-00030", x: 14, y: 29, scene: "home" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 34, y: 50, scene: "home" },
      { id: "motion", label: "Датчик движения", sku: "SBDV-00029", x: 70, y: 63, scene: "night-entry" },
      { id: "hub", label: "Хаб для сценариев", sku: "SBDV-00068", x: 83, y: 31, scene: "door-watch" },
    ],
    scenarios: [
      { id: "home", name: "Я дома", cat: "light", before: "В прихожей темно", trigger: "Дверь открывается", result: "Основной свет включён", reason: "Датчик открытия передаёт событие хабу. Выключатель включает обычный светильник.", products: ["SBDV-00030", "SWITCH_2"], effect: "light", requiresHub: true, sourceUrl: SOURCE.entry, shortNote: "Официальная комнатная логика, состав пересчитан по РРЦ" },
      { id: "night-entry", name: "Ночной вход", cat: "light", before: "Поздний вечер", trigger: "Есть движение", result: "Основной свет включён", reason: "Датчик движения запускает свет только в нужное время. Обычный свет включается выключателем без регулировки яркости.", products: ["SBDV-00029", "SWITCH_2"], effect: "motion", requiresHub: true, sourceUrl: SOURCE.scenarios, shortNote: "Адаптация официального сценария" },
      { id: "door-watch", name: "Дверь под контролем", cat: "safety", before: "Никого нет дома", trigger: "Дверь открылась", result: "Пришло уведомление", reason: "Датчик открытия фиксирует событие. Хаб связывает датчик с приложением.", products: ["SBDV-00030"], effect: "away", requiresHub: true, sourceUrl: SOURCE.entry, shortNote: "Официальная комнатная логика" },
    ],
  },
  {
    id: "corridor", name: "Коридор", asset: "corridor", sourceUrl: SOURCE.lighting, shortNote: "Демо-сценарий",
    intro: "Проход становится безопаснее ночью, а основной свет остаётся привычным.",
    hotspots: [
      { id: "motion", label: "Датчик движения", sku: "SBDV-00029", x: 24, y: 32, scene: "night-route" },
      { id: "strip", label: "Умная лента", sku: "SBDV-00033", x: 58, y: 70, scene: "night-route" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_1", x: 83, y: 43, scene: "corridor-light" },
    ],
    scenarios: [
      { id: "night-route", name: "Ночной маршрут", cat: "light", before: "Коридор тёмный", trigger: "Человек проходит", result: "Включилась мягкая подсветка", reason: "Датчик движения запускает ленту. Яркость и оттенок меняются только у умной ленты.", products: ["SBDV-00029", "SBDV-00033"], effect: "motion", requiresHub: true, sourceUrl: SOURCE.lighting, shortNote: "Демо-сценарий на официальных устройствах" },
      { id: "corridor-light", name: "Основной свет", cat: "light", before: "Свет выключен", trigger: "Нажатие выключателя", result: "Обычный свет включён", reason: "Встраиваемый выключатель управляет существующим светильником. Цвет и яркость обычной лампы не меняются.", products: ["SWITCH_1"], effect: "light", requiresHub: true, sourceUrl: SOURCE.lighting, shortNote: "Официальная механика выключателя" },
      { id: "corridor-away", name: "Я ушёл", cat: "safety", before: "Свет включён", trigger: "Команда «Я ушёл»", result: "Освещение выключено", reason: "Сценарий переводит выбранные выключатели и умную ленту в состояние «выкл».", products: ["SWITCH_1", "SBDV-00033"], effect: "away", requiresHub: true, sourceUrl: SOURCE.lighting, shortNote: "Официальный бытовой сюжет" },
    ],
  },
  {
    id: "living", name: "Гостиная", asset: "living", sourceUrl: SOURCE.living, shortNote: "Официальное решение по комнате",
    intro: "Обычный свет, атмосфера и тепло собираются в понятные вечерние сценарии.",
    hotspots: [
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 18, y: 48, scene: "evening" },
      { id: "strip", label: "Умная лента", sku: "SBDV-00033", x: 64, y: 32, scene: "evening" },
      { id: "climate", label: "Датчик климата", sku: "SBDV-00079", x: 46, y: 67, scene: "warm-living" },
      { id: "radiator", label: "Терморегулятор радиатора", sku: "SBDV-00185", x: 82, y: 65, scene: "warm-living" },
      { id: "socket", label: "Умная розетка", sku: "SBDV-00123W", x: 88, y: 36, scene: "away-living" },
    ],
    scenarios: [
      { id: "evening", name: "Вечер дома", cat: "light", before: "Комната освещена обычно", trigger: "Нажатие сценария", result: "Основной свет и атмосфера готовы", reason: "Выключатель управляет обычным светом, а лента добавляет регулируемую атмосферную подсветку.", products: ["SWITCH_2", "SBDV-00033"], effect: "light", requiresHub: true, sourceUrl: SOURCE.living, shortNote: "Официальное решение по комнате" },
      { id: "away-living", name: "Я ушёл", cat: "safety", before: "Свет и прибор включены", trigger: "Команда «Я ушёл»", result: "Выбранные устройства выключены", reason: "Выключатель отключает основной свет. Умная розетка обесточивает подключённый прибор пользователя.", products: ["SWITCH_2", "SBDV-00123W"], effect: "away", requiresHub: true, sourceUrl: SOURCE.lighting, shortNote: "Официальный бытовой сюжет" },
      { id: "warm-living", name: "Комфортное тепло", cat: "climate", before: "В комнате прохладно", trigger: "Температура ниже цели", result: "Радиатор начал нагрев", reason: "Датчик передаёт температуру, терморегулятор открывает радиатор. Радиатор — существующий прибор пользователя.", products: ["SBDV-00079", "SBDV-00185"], effect: "climate", requiresHub: true, sourceUrl: SOURCE.living, shortNote: "Официальное решение по комнате" },
    ],
  },
  {
    id: "bedroom", name: "Спальня", asset: "bedroom", sourceUrl: SOURCE.bedroom, shortNote: "Официальное решение по комнате",
    intro: "Один сценарий помогает закончить день, другой — проснуться в комфортном свете.",
    hotspots: [
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 18, y: 45, scene: "sleep" },
      { id: "lamp", label: "Умная лампа", sku: "SBDV-00120", x: 51, y: 27, scene: "morning" },
      { id: "button", label: "Сценарная кнопка", sku: "SBDV-00032", x: 62, y: 69, scene: "sleep" },
      { id: "radiator", label: "Терморегулятор радиатора", sku: "SBDV-00185", x: 88, y: 62, scene: "warm-bedroom" },
    ],
    scenarios: [
      { id: "sleep", name: "Пора спать", cat: "light", before: "Основной свет включён", trigger: "Нажата кнопка у кровати", result: "Свет выключен", reason: "Кнопка запускает сценарий. Выключатель отключает обычный потолочный свет.", products: ["SBDV-00032", "SWITCH_2"], effect: "away", requiresHub: true, sourceUrl: SOURCE.bedroom, shortNote: "Официальное решение по комнате" },
      { id: "morning", name: "Доброе утро", cat: "light", before: "Комната тёмная", trigger: "Наступило заданное время", result: "Умная лампа включилась", reason: "Умная лампа плавно создаёт утренний свет по расписанию. Обычный выключатель не регулирует цвет.", products: ["SBDV-00120"], effect: "light", requiresHub: false, sourceUrl: SOURCE.lighting, shortNote: "Официальный бытовой сюжет" },
      { id: "warm-bedroom", name: "Комфортное тепло", cat: "climate", before: "Температура ниже цели", trigger: "Датчик видит 20 °C", result: "Радиатор начал нагрев", reason: "Терморегулятор меняет подачу тепла на радиаторе. Датчик показывает температуру и влажность.", products: ["SBDV-00079", "SBDV-00185"], effect: "climate", requiresHub: true, sourceUrl: SOURCE.bedroom, shortNote: "Официальное решение по комнате" },
    ],
  },
  {
    id: "nursery", name: "Детская", asset: "nursery", sourceUrl: SOURCE.nursery, shortNote: "Официальное решение по комнате",
    intro: "Ночник помогает заснуть, а датчик показывает климат без лишних действий.",
    hotspots: [
      { id: "nightlight", label: "Умный ночник", sku: "SBDV-00127", x: 31, y: 51, scene: "soft-night" },
      { id: "temperature", label: "Датчик климата", sku: "SBDV-00079", x: 72, y: 39, scene: "climate-control" },
      { id: "button", label: "Сценарная кнопка", sku: "SBDV-00032", x: 62, y: 74, scene: "soft-night" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 88, y: 55, scene: "nursery-main" },
    ],
    scenarios: [
      { id: "soft-night", name: "Мягкий ночник", cat: "light", before: "Пора укладываться", trigger: "Нажата кнопка", result: "Ночник включён", reason: "Сценарная кнопка включает ночник. Яркость и цвет меняются на самом ночнике.", products: ["SBDV-00032", "SBDV-00127"], effect: "light", requiresHub: true, sourceUrl: SOURCE.nursery, shortNote: "Официальное решение по комнате" },
      { id: "climate-control", name: "Климат под контролем", cat: "climate", before: "Обычный режим", trigger: "Влажность изменилась", result: "Показания видны в приложении", reason: "Датчик показывает температуру и влажность и может участвовать в автоматизации отопления.", products: ["SBDV-00079"], effect: "climate", requiresHub: true, sourceUrl: SOURCE.nursery, shortNote: "Официальное решение по комнате" },
      { id: "nursery-main", name: "Основной свет", cat: "light", before: "Свет выключен", trigger: "Нажат выключатель", result: "Обычный свет включён", reason: "Выключатель AtlasDesign управляет существующим светильником без замены лампы.", products: ["SWITCH_2"], effect: "light", requiresHub: true, sourceUrl: SOURCE.lighting, shortNote: "Официальная механика выключателя" },
    ],
  },
  {
    id: "kitchen", name: "Кухня", asset: "kitchen", sourceUrl: SOURCE.kitchen, shortNote: "Официальное решение по комнате",
    intro: "Дом предупреждает о воде и помогает выключить подключённый прибор.",
    hotspots: [
      { id: "water", label: "Датчик протечки", sku: "SBDV-00154", x: 34, y: 76, scene: "water-watch" },
      { id: "socket", label: "Умная розетка", sku: "SBDV-00123W", x: 68, y: 48, scene: "appliance-off" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 88, y: 42, scene: "kitchen-light" },
      { id: "motion", label: "Датчик движения", sku: "SBDV-00029", x: 53, y: 23, scene: "kitchen-light" },
    ],
    scenarios: [
      { id: "water-watch", name: "Вода под контролем", cat: "safety", before: "Пол сухой", trigger: "Вода попала на датчик", result: "Пришло уведомление", reason: "Датчик протечки сообщает о воде. Сам по себе он не закрывает кран.", products: ["SBDV-00154"], effect: "water", requiresHub: true, sourceUrl: SOURCE.kitchen, shortNote: "Официальное решение по комнате" },
      { id: "appliance-off", name: "Прибор выключен", cat: "safety", before: "Прибор получает питание", trigger: "Команда в приложении", result: "Розетка выключена", reason: "Накладная Wi-Fi-розетка отключает конкретный подключённый прибор пользователя и не требует хаба.", products: ["SBDV-00123W"], effect: "away", requiresHub: false, sourceUrl: SOURCE.kitchen, shortNote: "Официальная комнатная логика" },
      { id: "kitchen-light", name: "Свет при движении", cat: "light", before: "Кухня тёмная", trigger: "Есть движение", result: "Основной свет включён", reason: "Датчик движения запускает выключатель. Выключатель управляет обычным светильником.", products: ["SBDV-00029", "SWITCH_2"], effect: "motion", requiresHub: true, sourceUrl: SOURCE.kitchen, shortNote: "Официальное решение по комнате" },
    ],
  },
  {
    id: "bath", name: "Ванная", asset: "bath", sourceUrl: SOURCE.bath, shortNote: "Официальное решение по комнате",
    intro: "Базовый вариант сообщает о воде, расширенный действительно перекрывает краны.",
    hotspots: [
      { id: "water", label: "Датчик протечки", sku: "SBDV-00154", x: 26, y: 78, scene: "bath-leak" },
      { id: "protection", label: "Система защиты", sku: "O2U152W1R", x: 72, y: 70, scene: "water-stop" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_2", x: 87, y: 41, scene: "bath-light" },
      { id: "motion", label: "Датчик движения", sku: "SBDV-00029", x: 48, y: 25, scene: "bath-light" },
    ],
    scenarios: [
      { id: "bath-leak", name: "Протечка замечена", cat: "safety", before: "Пол сухой", trigger: "Появилась вода", result: "Пришло уведомление", reason: "Беспроводной датчик сообщает о протечке. Закрытие воды в этот состав не входит.", products: ["SBDV-00154"], effect: "water", requiresHub: true, sourceUrl: SOURCE.bath, shortNote: "Официальное решение по комнате" },
      { id: "water-stop", name: "Вода перекрыта", cat: "safety", before: "Краны открыты", trigger: "Комплект обнаружил протечку", result: "Приводы закрыли краны", reason: "Полный комплект O2U152W1R включает блок, приводы и датчики, поэтому действительно перекрывает воду.", products: ["O2U152W1R"], effect: "water", requiresHub: false, sourceUrl: SOURCE.bath, shortNote: "Официальное решение, комплект 1/2 дюйма" },
      { id: "bath-light", name: "Свет без касаний", cat: "light", before: "Свет выключен", trigger: "Есть движение", result: "Основной свет включён", reason: "Датчик движения запускает встраиваемый выключатель для обычного светильника.", products: ["SBDV-00029", "SWITCH_2"], effect: "motion", requiresHub: true, sourceUrl: SOURCE.bath, shortNote: "Официальное решение по комнате" },
    ],
  },
  {
    id: "toilet", name: "Туалет", asset: "toilet", sourceUrl: SOURCE.scenarios, shortNote: "Демо-сценарий",
    intro: "Компактный набор света и защиты использует те же проверенные устройства.",
    hotspots: [
      { id: "water", label: "Датчик протечки", sku: "SBDV-00154", x: 28, y: 75, scene: "toilet-leak" },
      { id: "switch", label: "Выключатель AtlasDesign", sku: "SWITCH_1", x: 82, y: 43, scene: "toilet-light" },
      { id: "motion", label: "Датчик движения", sku: "SBDV-00029", x: 52, y: 24, scene: "toilet-light" },
    ],
    scenarios: [
      { id: "toilet-leak", name: "Протечка", cat: "safety", before: "Пол сухой", trigger: "Датчик намок", result: "Пришло уведомление", reason: "Датчик протечки отправляет событие через хаб. Автоматического перекрытия воды в этом составе нет.", products: ["SBDV-00154"], effect: "water", requiresHub: true, sourceUrl: SOURCE.scenarios, shortNote: "Демо-сценарий на официальных устройствах" },
      { id: "toilet-light", name: "Свет без касаний", cat: "light", before: "Свет выключен", trigger: "Есть движение", result: "Основной свет включён", reason: "Датчик движения запускает выключатель, который управляет обычным светильником.", products: ["SBDV-00029", "SWITCH_1"], effect: "motion", requiresHub: true, sourceUrl: SOURCE.scenarios, shortNote: "Демо-сценарий" },
      { id: "toilet-stop", name: "Защита квартиры", cat: "safety", before: "Вода подаётся", trigger: "Комплект видит протечку", result: "Краны закрыты", reason: "Для закрытия воды используется полный комплект защиты, установленный на вводе квартиры.", products: ["O2U152W1R"], effect: "water", requiresHub: false, sourceUrl: SOURCE.bath, shortNote: "Демо-применение официального комплекта" },
    ],
  },
];

const LEVELS = {
  basic: { name: "Базовый", count: 1 },
  comfort: { name: "Комфорт", count: 2 },
  max: { name: "Максимум", count: 3 },
};

const PACKAGE_PRODUCTS = {
  entry: {
    basic: ["SBDV-00068", "SBDV-00030", "SWITCH_2", "SOCKET_WALL"],
    comfort: ["SBDV-00068", "SBDV-00030", "SWITCH_2", "SOCKET_WALL", "SBDV-00029", "SBDV-00032", "SBDV-00033"],
    max: ["SBDV-00068", "SBDV-00030", "SWITCH_2", "SOCKET_WALL", "SBDV-00029", "SBDV-00032", "SBDV-00033", "SBDV-00123W"],
  },
  living: {
    basic: ["SBDV-00068", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL"],
    comfort: ["SBDV-00068", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00079", "SBDV-00033"],
    max: ["SBDV-00068", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00079", "SBDV-00033", "SBDV-00029"],
  },
  bedroom: {
    basic: ["SBDV-00068", "SBDV-00079", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL"],
    comfort: ["SBDV-00068", "SBDV-00079", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00030", "SBDV-00033"],
    max: ["SBDV-00068", "SBDV-00079", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00030", "SBDV-00033", "FLOOR_THERMOSTAT"],
  },
  nursery: {
    basic: ["SBDV-00068", "SBDV-00079", "SBDV-00127", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL"],
    comfort: ["SBDV-00068", "SBDV-00079", "SBDV-00127", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00030", "SBDV-00033"],
    max: ["SBDV-00068", "SBDV-00079", "SBDV-00127", "SBDV-00123W", "SBDV-00185", "SWITCH_2", "SOCKET_WALL", "SBDV-00030", "SBDV-00033", "SBDV-00029", "FLOOR_THERMOSTAT"],
  },
  kitchen: {
    basic: ["SBDV-00068", "SBDV-00033", "SWITCH_2", "SOCKET_WALL", "SBDV-00154", "SBDV-00185"],
    comfort: ["SBDV-00068", "SBDV-00033", "SWITCH_2", "SOCKET_WALL", "SBDV-00154", "SBDV-00185", "SBDV-00079", "SBDV-00123W"],
    max: ["SBDV-00068", "SBDV-00033", "SWITCH_2", "SOCKET_WALL", "SBDV-00154", "SBDV-00185", "SBDV-00079", "SBDV-00123W", "O2U152W1R"],
  },
  bath: {
    basic: ["SBDV-00068", "SWITCH_2", "SBDV-00154"],
    comfort: ["SBDV-00068", "SWITCH_2", "SBDV-00154", "SBDV-00079", "FLOOR_THERMOSTAT", "SOCKET_WALL"],
    max: ["SBDV-00068", "SWITCH_2", "SBDV-00154", "SBDV-00079", "FLOOR_THERMOSTAT", "SOCKET_WALL", "O2U152W1R", "SBDV-00029"],
  },
  corridor: {
    basic: ["SBDV-00068", "SBDV-00029", "SBDV-00033"],
    comfort: ["SBDV-00068", "SBDV-00029", "SBDV-00033", "SWITCH_1"],
    max: ["SBDV-00068", "SBDV-00029", "SBDV-00033", "SWITCH_1", "SBDV-00030"],
  },
  toilet: {
    basic: ["SBDV-00068", "SBDV-00029", "SWITCH_1"],
    comfort: ["SBDV-00068", "SBDV-00029", "SWITCH_1", "SBDV-00154"],
    max: ["SBDV-00068", "SBDV-00029", "SWITCH_1", "SBDV-00154", "O2U152W1R"],
  },
};

const FALLBACK_CATALOG = [
  ["SBDV-00068", 2790], ["SBDV-00079", 1790], ["SBDV-00029", 1990], ["SBDV-00030", 1790],
  ["SBDV-00032", 1790], ["SBDV-00154", 1790], ["SBDV-00033", 2990], ["SBDV-00120", 990],
  ["SBDV-00123W", 1490], ["SBDV-00127", 2590], ["SBDV-00185", 3990], ["O2U152W1R", 29990],
  ["ATN000115Z", 2590], ["ATN001015Z", 2990], ["ATN000117Z", 3190], ["ATN001017Z", 3690],
  ["ATN000153Z", 3190], ["ATN001053Z", 3690], ["ATN000145Z", 2790], ["ATN001045Z", 3290],
  ["ATN000138Z", 8990], ["ATN001038Z", 11290],
].map(([sku, rrc]) => ({ sku, rrc, name: SHORT_NAMES[sku] || sku, description: SHORT_NAMES[sku] || sku }));

const defaultState = {
  view: "home",
  room: "living",
  activeCategory: "light",
  activeScenario: {},
  selectedDevice: null,
  switchColor: "white",
  selectedScenes: [],
  pickerRooms: ["entry", "living", "bedroom"],
  pickerCategories: ["light", "safety"],
  budget: 25000,
  levels: Object.fromEntries(ROOMS.map((room) => [room.id, "basic"])),
  extras: {},
  checkoutComplete: false,
  businessCount: 3,
  businessComplete: false,
  demoPhase: "idle",
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let catalog = [];
let catalogBySku = new Map();
let demoTimer = null;
let toastTimer = null;
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("sber-smart-home-experience-v1") || "null");
    if (!saved || typeof saved !== "object") return structuredClone(defaultState);
    const roomIds = new Set(ROOMS.map((room) => room.id));
    const catIds = new Set(Object.keys(CATEGORIES));
    return {
      ...structuredClone(defaultState),
      switchColor: saved.switchColor === "carbon" ? "carbon" : "white",
      selectedScenes: Array.isArray(saved.selectedScenes) ? saved.selectedScenes.filter(validSceneKey) : [],
      pickerRooms: Array.isArray(saved.pickerRooms) ? saved.pickerRooms.filter((id) => roomIds.has(id)) : defaultState.pickerRooms,
      pickerCategories: Array.isArray(saved.pickerCategories) ? saved.pickerCategories.filter((id) => catIds.has(id)) : defaultState.pickerCategories,
      budget: Number.isFinite(saved.budget) ? Math.min(90000, Math.max(5000, saved.budget)) : defaultState.budget,
      levels: { ...defaultState.levels, ...(saved.levels || {}) },
      extras: saved.extras && typeof saved.extras === "object" ? saved.extras : {},
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  const payload = {
    switchColor: state.switchColor,
    selectedScenes: state.selectedScenes,
    pickerRooms: state.pickerRooms,
    pickerCategories: state.pickerCategories,
    budget: state.budget,
    levels: state.levels,
    extras: state.extras,
  };
  localStorage.setItem("sber-smart-home-experience-v1", JSON.stringify(payload));
}

function validSceneKey(key) {
  if (typeof key !== "string" || !key.includes(":")) return false;
  const [roomId, sceneId] = key.split(":");
  return Boolean(findRoom(roomId)?.scenarios.some((scene) => scene.id === sceneId));
}

function findRoom(id) { return ROOMS.find((room) => room.id === id); }
function findScenario(roomId, sceneId) { return findRoom(roomId)?.scenarios.find((scene) => scene.id === sceneId); }
function sceneKey(roomId, sceneId) { return `${roomId}:${sceneId}`; }
function resolveSku(sku) {
  if (sku === "SWITCH_1") return state.switchColor === "carbon" ? "ATN001015Z" : "ATN000115Z";
  if (sku === "SWITCH_2") return state.switchColor === "carbon" ? "ATN001053Z" : "ATN000153Z";
  if (sku === "SOCKET_WALL") return state.switchColor === "carbon" ? "ATN001045Z" : "ATN000145Z";
  if (sku === "FLOOR_THERMOSTAT") return state.switchColor === "carbon" ? "ATN001038Z" : "ATN000138Z";
  return sku;
}
function product(sku) { return catalogBySku.get(resolveSku(sku)) || { sku: resolveSku(sku), rrc: 0, name: SHORT_NAMES[resolveSku(sku)] || resolveSku(sku), description: "" }; }
function productName(sku) { const item = product(sku); return SHORT_NAMES[item.sku] || item.description || item.name; }
function formatPrice(value) { return `${Math.round(value).toLocaleString("ru-RU")} ₽`; }
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

function selectionDetails(keys = state.selectedScenes, extras = state.extras) {
  const perRoom = new Map();
  let needsHub = false;
  keys.filter(validSceneKey).forEach((key) => {
    const [roomId, scenarioId] = key.split(":");
    const scene = findScenario(roomId, scenarioId);
    if (!scene) return;
    if (!perRoom.has(roomId)) perRoom.set(roomId, { scenarios: [], skus: new Set() });
    const room = perRoom.get(roomId);
    room.scenarios.push(scene);
    scene.products.map(resolveSku).forEach((sku) => room.skus.add(sku));
    needsHub ||= scene.requiresHub;
  });
  Object.entries(extras || {}).forEach(([roomId, skus]) => {
    if (!findRoom(roomId) || !Array.isArray(skus)) return;
    if (!perRoom.has(roomId)) perRoom.set(roomId, { scenarios: [], skus: new Set() });
    skus.map(resolveSku).forEach((sku) => perRoom.get(roomId).skus.add(sku));
  });
  const quantities = new Map();
  perRoom.forEach((room) => room.skus.forEach((sku) => quantities.set(sku, GLOBAL_PER_HOME_SKUS.has(sku) ? 1 : (quantities.get(sku) || 0) + 1)));
  if (needsHub) quantities.set("SBDV-00068", 1);
  const products = [...quantities].map(([sku, qty]) => ({ ...product(sku), sku, qty, subtotal: product(sku).rrc * qty, shared: sku === "SBDV-00068" || GLOBAL_PER_HOME_SKUS.has(sku) }));
  return { perRoom, products, total: products.reduce((sum, item) => sum + item.subtotal, 0), needsHub };
}

function recommendation() {
  const candidates = [];
  for (const roomId of state.pickerRooms) {
    const room = findRoom(roomId);
    if (!room) continue;
    const matching = room.scenarios.filter((scene) => state.pickerCategories.includes(scene.cat));
    if (matching[0]) candidates.push(sceneKey(roomId, matching[0].id));
  }
  const minimum = selectionDetails(candidates, {});
  if (!candidates.length) return { keys: [], minimum: 0, total: 0, insufficient: false };
  if (minimum.total > state.budget) return { keys: candidates, minimum: minimum.total, total: minimum.total, insufficient: true };
  const accepted = [...candidates];
  for (const roomId of state.pickerRooms) {
    const room = findRoom(roomId);
    const extras = room?.scenarios.filter((scene) => state.pickerCategories.includes(scene.cat)).slice(1) || [];
    for (const scene of extras) {
      const attempt = [...accepted, sceneKey(roomId, scene.id)];
      if (selectionDetails(attempt, {}).total <= state.budget) accepted.push(sceneKey(roomId, scene.id));
    }
  }
  const details = selectionDetails(accepted, {});
  return { keys: accepted, minimum: minimum.total, total: details.total, insufficient: false };
}

function levelKeys(roomId, level) {
  const room = findRoom(roomId);
  return (room?.scenarios || []).slice(0, LEVELS[level]?.count || 1).map((scene) => sceneKey(roomId, scene.id));
}

function sceneForRoom(room) {
  const id = state.activeScenario[room.id];
  return room.scenarios.find((scene) => scene.id === id) || room.scenarios.find((scene) => scene.cat === state.activeCategory) || room.scenarios[0];
}

function setView(view) {
  stopDemo();
  state.view = view;
  state.checkoutComplete = view === "checkout" ? state.checkoutComplete : false;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function stopDemo() {
  if (demoTimer) clearTimeout(demoTimer);
  demoTimer = null;
  state.demoPhase = "idle";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function render() {
  const count = selectionDetails().products.reduce((sum, item) => sum + item.qty, 0);
  document.querySelector("#header-cart-count").textContent = count;
  const pages = {
    home: renderHome,
    room: renderRoom,
    picker: renderPicker,
    bundle: renderBundle,
    checkout: renderCheckout,
    business: renderBusiness,
  };
  app.innerHTML = (pages[state.view] || renderHome)();
}

function apartmentMarkup() {
  return `<div class="apartment" aria-label="Интерактивная схема квартиры">
    <div class="apartment-image">
      <img src="${ROOM_ASSET("apartment-hero")}" alt="Визуализация всей квартиры с восемью помещениями" />
      ${[
        ["living",20,65], ["bedroom",25,29], ["nursery",51,30], ["kitchen",77,32],
        ["bath",84,67], ["toilet",64,74], ["entry",49,82], ["corridor",48,52],
      ].map(([id,x,y]) => { const room = findRoom(id); return `<button class="apartment-pin" style="left:${x}%;top:${y}%" type="button" data-action="select-room" data-room="${id}" aria-label="Открыть комнату ${room.name}"><span></span>${room.name}</button>`; }).join("")}
    </div>
    <div class="apartment-caption"><span><strong>8 комнат</strong> — выберите любую</span><span>Интерактивная квартира</span></div>
  </div>`;
}

function renderHome() {
  return `<div class="page">
    <section class="hero"><div class="shell hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Умный дом в действии</p>
        <h1>Посмотрите, как работает умный дом</h1>
        <p class="lead">Выберите комнату, нажмите на устройство и увидьте бытовой сценарий. Затем соберите свой комплект по задачам и бюджету.</p>
        <div class="cta-row">
          <button class="primary green" type="button" data-action="select-room" data-room="living">Попробовать в квартире</button>
          <button class="secondary" type="button" data-action="go-picker">Подобрать комплект</button>
          <button class="link-button" type="button" data-action="select-room" data-room="entry">Смотреть сценарии →</button>
        </div>
      </div>
      ${apartmentMarkup()}
    </div></section>
    <section class="value-strip"><div class="shell">
      <div class="section-title"><h2>От действия к понятному результату</h2><p>Сценарии показывают не абстрактные функции, а последовательность: что произошло, какое устройство сработало и что изменилось дома.</p></div>
      <div class="value-cards">
        <article class="value-card"><span class="number">01</span><div><h3>Исследуйте комнаты</h3><p>В каждой комнате — свои устройства, сценарии и объяснение связей.</p></div></article>
        <article class="value-card"><span class="number">02</span><div><h3>Подберите по задачам</h3><p>Свет, климат и безопасность можно сочетать в рамках бюджета.</p></div></article>
        <article class="value-card"><span class="number">03</span><div><h3>Проверьте комплект</h3><p>Общие устройства учитываются один раз, цены берутся из РРЦ 4Q 2026.</p></div></article>
      </div>
    </div></section>
  </div>`;
}

function renderRoom() {
  const room = findRoom(state.room) || ROOMS[0];
  const active = sceneForRoom(room);
  state.activeScenario[room.id] = active.id;
  const selectedKey = sceneKey(room.id, active.id);
  const selected = state.selectedScenes.includes(selectedKey);
  const switchUsed = room.hotspots.some((spot) => spot.sku === "SWITCH_1" || spot.sku === "SWITCH_2");
  const detailSpot = room.hotspots.find((spot) => spot.id === state.selectedDevice) || room.hotspots.find((spot) => spot.scene === active.id) || room.hotspots[0];
  const detailProduct = product(detailSpot.sku);
  const status = state.demoPhase === "running" ? active.trigger : state.demoPhase === "done" ? active.result : "Нажмите «Запустить демонстрацию»";
  return `<div class="page room-page"><div class="shell">
    <div class="room-rail" role="tablist" aria-label="Комнаты квартиры">
      ${ROOMS.map((item) => `<button class="room-tab ${item.id === room.id ? "active" : ""}" type="button" data-action="select-room" data-room="${item.id}" role="tab" aria-selected="${item.id === room.id}"><img src="${ROOM_ASSET(item.asset)}" alt="" /><span>${item.name}</span></button>`).join("")}
    </div>
    <div class="room-workspace">
      <section class="room-main">
        <div class="room-main-head"><div><p class="eyebrow">Комната ${ROOMS.findIndex((item) => item.id === room.id) + 1} из 8</p><h2>${room.name}</h2><p>${room.intro}</p></div>
          ${switchUsed ? `<div class="switch-toggle"><span>Выключатель</span><button type="button" class="${state.switchColor === "white" ? "active" : ""}" data-action="set-switch" data-color="white">Белый</button><button type="button" class="${state.switchColor === "carbon" ? "active" : ""}" data-action="set-switch" data-color="carbon">Карбон</button></div>` : ""}
        </div>
        <div class="room-stage ${state.demoPhase !== "idle" ? `demo-${active.effect}` : ""}">
          <img src="${ROOM_ASSET(room.asset)}" alt="Интерьер: ${room.name}" />
          <div class="stage-shade"></div><div class="scene-glow"></div><div class="heat-wave"></div><div class="water-wave"></div><div class="motion-path"></div>
          ${room.hotspots.map((spot) => hotspotMarkup(spot, detailSpot.id === spot.id)).join("")}
          <div class="demo-status">${esc(status)}</div>
        </div>
      </section>
      <aside class="room-side">
        <div class="room-side-top"><div><h3>${active.name}</h3><p class="subtle">Что происходит и какие устройства нужны</p></div><span class="source-badge">${esc(active.shortNote.includes("Демо") ? "Демо-сценарий" : "Источник Sber")}</span></div>
        <div class="category-tabs">${Object.entries(CATEGORIES).map(([id, cat]) => { const available = room.scenarios.some((scene) => scene.cat === id); return `<button class="chip ${state.activeCategory === id ? "active" : ""}" type="button" data-action="select-category" data-category="${id}" ${available ? "" : "disabled"}>${cat.short}</button>`; }).join("")}</div>
        <div class="scenario-list">${room.scenarios.filter((scene) => scene.cat === state.activeCategory).map((scene) => `<button class="scenario-option ${scene.id === active.id ? "active" : ""}" type="button" data-action="select-scenario" data-room="${room.id}" data-scenario="${scene.id}"><strong>${scene.name}</strong><span>${scene.trigger} → ${scene.result}</span></button>`).join("") || `<p class="subtle">В этой комнате пока нет сценария выбранной категории.</p>`}</div>
        <div class="scenario-story">
          <div class="story-flow"><div class="story-step"><b>До</b>${active.before}</div><div class="story-arrow">→</div><div class="story-step"><b>Событие</b>${active.trigger}</div><div class="story-arrow">→</div><div class="story-step"><b>Результат</b>${active.result}</div></div>
          <p class="subtle">${active.reason}</p>
          <div class="scenario-actions"><button class="secondary" type="button" data-action="run-demo">${state.demoPhase === "idle" ? "Запустить демонстрацию" : "Повторить"}</button><button class="primary ${selected ? "green" : ""}" type="button" data-action="toggle-scene" data-room="${room.id}" data-scenario="${active.id}">${selected ? "В комплекте ✓" : "Добавить сценарий"}</button></div>
        </div>
        <div class="device-detail"><div class="device-detail-inner"><img src="${PRODUCT_ASSET(detailProduct.sku)}" alt="${esc(productName(detailProduct.sku))}" /><div><strong>${esc(productName(detailProduct.sku))}</strong><small>${detailProduct.sku}</small><div class="price">${formatPrice(detailProduct.rrc)}</div></div></div></div>
      </aside>
    </div>
  </div></div>`;
}

function hotspotMarkup(spot, selected) {
  const item = product(spot.sku);
  return `<button class="device-hotspot ${selected ? "selected" : ""}" style="left:${spot.x}%;top:${spot.y}%" type="button" data-action="select-device" data-device="${spot.id}" data-scene="${spot.scene}" data-label="${esc(spot.label)}" aria-label="${esc(spot.label)}"><img src="${PRODUCT_ASSET(item.sku)}" alt="" /></button>`;
}

function renderPicker() {
  const rec = recommendation();
  const details = selectionDetails(rec.keys, {});
  const roomSummary = [...details.perRoom].map(([roomId, data]) => `<div class="rec-room"><div><strong>${findRoom(roomId).name}</strong><span>${data.scenarios.map((scene) => scene.name).join(", ")}</span></div><b>${data.scenarios.length}</b></div>`).join("");
  return `<div class="page picker-page"><div class="shell">
    <div class="stepper" aria-label="Шаг 1 из 3"><span class="active"></span><span></span><span></span></div>
    <div class="picker-head"><div><p class="eyebrow">Демонстрационный подбор</p><h1>Что вы хотите добавить в свой дом?</h1></div><p>Выберите несколько задач, комнаты и бюджет. Хаб будет добавлен автоматически, если он нужен для выбранных устройств.</p></div>
    <div class="picker-grid"><div>
      <section class="panel"><h3>Задачи</h3><p class="panel-intro">Можно выбрать несколько категорий одновременно.</p><div class="category-choice-grid">
        ${Object.entries(CATEGORIES).map(([id, cat]) => `<button class="category-choice ${state.pickerCategories.includes(id) ? "active" : ""}" type="button" data-action="toggle-picker-category" data-category="${id}"><span class="choice-icon">${cat.icon}</span><strong>${cat.name}</strong><small>${id === "light" ? "Свет, выключатели и атмосфера" : id === "climate" ? "Температура и влажность" : "Протечки, двери и отключение приборов"}</small></button>`).join("")}
      </div></section>
      <section class="panel"><h3>Комнаты</h3><p class="panel-intro">Наборы и сценарии будут рассчитаны отдельно для каждой выбранной комнаты.</p><div class="room-checks">
        ${ROOMS.map((room) => `<label class="room-check"><input type="checkbox" data-room="${room.id}" ${state.pickerRooms.includes(room.id) ? "checked" : ""} /><span>${room.name}</span></label>`).join("")}
      </div></section>
      <section class="panel"><h3>Бюджет на устройства</h3><div class="budget-row"><input type="range" min="5000" max="90000" step="1000" value="${state.budget}" aria-label="Бюджет" data-role="budget" /><div class="budget-value">${formatPrice(state.budget)}</div></div><div class="budget-presets">${[15000,25000,40000,70000].map((value) => `<button type="button" data-action="set-budget" data-budget="${value}">${formatPrice(value)}</button>`).join("")}</div></section>
    </div>
    <aside class="panel recommendation"><span class="source-badge">Демонстрационный подбор</span><h3>${rec.insufficient ? "Нужен больший бюджет" : "Рекомендуемый состав"}</h3>
      <div class="rec-stat"><strong>${formatPrice(rec.total)}</strong><span>${details.products.reduce((sum, item) => sum + item.qty, 0)} устройств<br />${rec.keys.length} сценариев</span></div>
      <div class="rec-rooms">${roomSummary || `<p>Выберите категории и комнаты.</p>`}</div>
      ${rec.insufficient ? `<div class="rec-warning">Минимальная связка для выбранных задач стоит ${formatPrice(rec.minimum)}. Увеличьте бюджет или уменьшите число комнат.</div>` : ""}
      <button class="primary" type="button" data-action="add-recommendation" ${!rec.keys.length || rec.insufficient ? "disabled" : ""}>Добавить рекомендации в комплект</button>
    </aside></div>

    <section class="ready-section"><div class="section-title"><h2>Готовые наборы по комнатам</h2><p>В каждом уровне — свои сценарии и устройства. Сумма пересчитана по фактическим SKU, РРЦ 4Q 2026.</p></div><div class="ready-grid">
      ${ROOMS.map(readyCard).join("")}
    </div></section>
  </div></div>`;
}

function readyCard(room) {
  const level = state.levels[room.id] || "basic";
  const keys = levelKeys(room.id, level);
  const packageSkus = PACKAGE_PRODUCTS[room.id]?.[level] || [];
  const details = selectionDetails(keys, { [room.id]: packageSkus });
  const scenes = keys.map((key) => findScenario(...key.split(":")));
  return `<article class="ready-card"><img src="${ROOM_ASSET(room.asset)}" alt="${room.name}" /><div class="ready-content"><span class="source-badge">${room.shortNote.includes("Демо") ? "Демо-вариант" : "Решение по комнате"}</span><h3>${room.name}</h3>
    <div class="level-tabs">${Object.entries(LEVELS).map(([id, item]) => `<button type="button" class="${level === id ? "active" : ""}" data-action="set-level" data-room="${room.id}" data-level="${id}">${item.name}</button>`).join("")}</div>
    <p class="ready-scenarios">${scenes.map((scene) => scene.name).join(" · ")}</p>
    <div class="ready-total"><strong>${formatPrice(details.total)}</strong><button class="link-button" type="button" data-action="try-set" data-room="${room.id}" data-level="${level}">Попробовать</button></div>
    <button class="primary green" type="button" data-action="add-set" data-room="${room.id}" data-level="${level}">Добавить набор</button>
  </div></article>`;
}

function renderBundle() {
  const details = selectionDetails();
  if (!state.selectedScenes.length) return `<div class="page bundle-page"><div class="shell"><div class="bundle-head"><div><p class="eyebrow">Шаг 3 из 3</p><h1>Мой комплект</h1></div><p>Здесь соберутся выбранные сценарии и необходимые устройства.</p></div><div class="empty-state"><div class="empty-icon">⌂</div><h3>Комплект пока пуст</h3><p>Попробуйте сценарий в квартире или получите рекомендацию по задачам и бюджету.</p><div class="cta-row" style="justify-content:center"><button class="primary green" type="button" data-action="select-room" data-room="living">Исследовать квартиру</button><button class="secondary" type="button" data-action="go-picker">Подобрать комплект</button></div></div></div></div>`;
  return `<div class="page bundle-page"><div class="shell">
    <div class="stepper" aria-label="Шаг 3 из 3"><span class="active"></span><span class="active"></span><span class="active"></span></div>
    <div class="bundle-head"><div><p class="eyebrow">Проверка состава</p><h1>Мой комплект</h1></div><p>Сценарии сохраняются по комнатам. Одинаковое устройство внутри комнаты не дублируется, общий хаб учитывается один раз.</p></div>
    <div class="bundle-layout"><div><section class="panel"><h3>Сценарии по комнатам</h3>
      ${[...details.perRoom].map(([roomId, data]) => `<div class="bundle-room"><div class="bundle-room-head"><h3>${findRoom(roomId).name}</h3><button class="link-button" type="button" data-action="select-room" data-room="${roomId}">Вернуться в комнату</button></div>${data.scenarios.map((scene) => `<div class="scene-pill"><span><strong>${scene.name}</strong> · ${CATEGORIES[scene.cat].short}</span><button class="icon-button" type="button" data-action="remove-scene" data-room="${roomId}" data-scenario="${scene.id}" aria-label="Удалить сценарий">×</button></div>`).join("")}</div>`).join("")}
    </section>
    <section class="panel"><div class="room-main-head" style="padding:0 0 18px"><div><h3>Выключатели AtlasDesign</h3><p>Цвет меняет фото, SKU и цену во всём комплекте.</p></div><div class="switch-toggle"><button type="button" class="${state.switchColor === "white" ? "active" : ""}" data-action="set-switch" data-color="white">Белый</button><button type="button" class="${state.switchColor === "carbon" ? "active" : ""}" data-action="set-switch" data-color="carbon">Карбон</button></div></div></section>
    <section class="panel"><h3>Устройства</h3><div class="product-list">${details.products.map(productRow).join("")}</div></section></div>
    <aside class="panel summary-card"><span class="source-badge">РРЦ 4Q 2026</span><h3>Итого</h3><div class="summary-line"><span>Сценариев</span><strong>${state.selectedScenes.length}</strong></div><div class="summary-line"><span>Комнат</span><strong>${details.perRoom.size}</strong></div><div class="summary-line"><span>Позиций</span><strong>${details.products.reduce((sum, item) => sum + item.qty, 0)}</strong></div>${details.needsHub ? `<div class="summary-line"><span>Общий хаб</span><strong>1 шт.</strong></div>` : ""}${details.products.some((item) => GLOBAL_PER_HOME_SKUS.has(item.sku)) ? `<div class="summary-line"><span>Общая защита воды</span><strong>1 система</strong></div>` : ""}<div class="summary-total"><span>За устройства</span><strong>${formatPrice(details.total)}</strong></div><button class="primary green" type="button" data-action="go-checkout">Перейти в корзину</button><button class="link-button" type="button" data-action="go-picker">Изменить подбор</button></aside>
    </div>
  </div></div>`;
}

function productRow(item) {
  return `<div class="product-row"><img src="${PRODUCT_ASSET(item.sku)}" alt="${esc(productName(item.sku))}" /><div><strong>${esc(productName(item.sku))}</strong><small>${item.sku} · ${item.qty} шт. × ${formatPrice(item.rrc)}${item.shared ? " · одна общая позиция на квартиру" : ""}</small></div><div class="row-price">${formatPrice(item.subtotal)}</div></div>`;
}

function renderCheckout() {
  const details = selectionDetails();
  if (state.checkoutComplete) return `<div class="page bundle-page"><div class="shell"><div class="checkout-box checkout-success"><div class="success-mark">✓</div><p class="eyebrow">Демонстрационный заказ</p><h2>Комплект собран</h2><p>Заказ не отправлен и оплата не выполнялась. Вы можете вернуться к сценам, изменить цвет выключателя или состав комнат.</p><div class="cta-row" style="justify-content:center"><button class="primary green" type="button" data-action="select-room" data-room="${state.room}">Вернуться в квартиру</button><button class="secondary" type="button" data-action="go-bundle">Изменить комплект</button></div></div></div></div>`;
  return `<div class="page bundle-page"><div class="shell"><div class="bundle-head"><div><p class="eyebrow">Демо-корзина</p><h1>Оформление</h1></div><p>Это публичный прототип. Он не собирает персональные данные и не проводит оплату.</p></div><div class="checkout-box"><h3>Комплект для ${details.perRoom.size} ${details.perRoom.size === 1 ? "комнаты" : "комнат"}</h3><div class="summary-line"><span>${details.products.reduce((sum, item) => sum + item.qty, 0)} устройств</span><strong>${formatPrice(details.total)}</strong></div><div class="checkout-options"><div class="checkout-option"><strong>Самовывоз</strong><span>Демонстрационный способ получения</span></div><div class="checkout-option"><strong>Доставка</strong><span>Условия уточняются в реальном магазине</span></div></div><button class="primary green" type="button" data-action="confirm-order" style="width:100%">Подтвердить демо-заказ</button><button class="link-button" type="button" data-action="go-bundle">Назад к комплекту</button></div></div></div>`;
}

function renderBusiness() {
  const baseKeys = state.selectedScenes.length ? state.selectedScenes : ["entry:home", "kitchen:water-watch"];
  const details = selectionDetails(baseKeys);
  const total = details.total * state.businessCount;
  if (state.businessComplete) return `<div class="page business-page"><div class="shell"><div class="checkout-box checkout-success"><div class="success-mark">✓</div><p class="eyebrow">Демонстрационный B2B-канал</p><h2>Запрос подготовлен</h2><p>Состав для ${state.businessCount} объектов рассчитан на сумму ${formatPrice(total)}. Реальная заявка не отправлялась.</p><button class="primary green" type="button" data-action="reset-business">Изменить расчёт</button></div></div></div>`;
  return `<div class="page business-page"><div class="shell">
    <div class="business-head"><div><p class="eyebrow">Демонстрационный B2B-канал</p><h1>Умный дом для объектов</h1></div><p>Те же сцены можно показать заказчику, затем масштабировать выбранный состав на одинаковые квартиры или помещения.</p></div>
    <section class="business-banner"><div><span class="source-badge">Для обсуждения второго выхода CJM</span><h2>Покажите сценарии клиенту до заказа</h2><p>Откройте квартиру, соберите один типовой комплект и вернитесь сюда. Количество объектов умножит состав без изменения логики комнат.</p><button class="primary green" type="button" data-action="select-room" data-room="living">Показать сценарии</button></div><div class="business-room-stack"><img src="${ROOM_ASSET("living")}" alt="Гостиная" /><img src="${ROOM_ASSET("entry")}" alt="Прихожая" /><img src="${ROOM_ASSET("bedroom")}" alt="Спальня" /><img src="${ROOM_ASSET("kitchen")}" alt="Кухня" /></div></section>
    <div class="business-controls"><section class="panel"><h3>Количество одинаковых объектов</h3><p class="panel-intro">Для каждого объекта считается отдельный комплект и один хаб.</p><div class="count-control"><button type="button" data-action="business-minus" aria-label="Уменьшить количество">−</button><strong>${state.businessCount}</strong><button type="button" data-action="business-plus" aria-label="Увеличить количество">+</button></div></section><section class="panel"><h3>Состав одного объекта</h3><p class="panel-intro">${baseKeys.length} сценариев, ${details.products.reduce((sum, item) => sum + item.qty, 0)} устройств.</p><button class="secondary" type="button" data-action="go-bundle">Проверить состав</button></section></div>
    <div class="business-summary"><div class="business-metric"><strong>${state.businessCount}</strong><span>объектов</span></div><div class="business-metric"><strong>${details.products.reduce((sum, item) => sum + item.qty, 0) * state.businessCount}</strong><span>устройств</span></div><div class="business-metric"><strong>${formatPrice(total)}</strong><span>ориентировочно по РРЦ</span></div></div>
    <div class="cta-row"><button class="primary green" type="button" data-action="business-request">Подготовить демо-запрос</button><button class="secondary" type="button" data-action="go-picker">Изменить типовой комплект</button></div>
  </div></div>`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "go-home") setView("home");
  if (action === "go-picker") setView("picker");
  if (action === "go-bundle") setView("bundle");
  if (action === "go-business") setView("business");
  if (action === "go-checkout") setView("checkout");
  if (action === "select-room") {
    stopDemo(); state.room = button.dataset.room; state.selectedDevice = null;
    const room = findRoom(state.room); const scene = room.scenarios[0]; state.activeCategory = scene.cat; state.activeScenario[room.id] = scene.id; setView("room");
  }
  if (action === "select-category") {
    stopDemo(); state.activeCategory = button.dataset.category; const room = findRoom(state.room); const scene = room.scenarios.find((item) => item.cat === state.activeCategory); if (scene) state.activeScenario[room.id] = scene.id; state.selectedDevice = null; render();
  }
  if (action === "select-scenario") { stopDemo(); state.activeScenario[button.dataset.room] = button.dataset.scenario; state.selectedDevice = null; render(); }
  if (action === "select-device") {
    stopDemo(); state.selectedDevice = button.dataset.device; const room = findRoom(state.room); const scene = room.scenarios.find((item) => item.id === button.dataset.scene); if (scene) { state.activeCategory = scene.cat; state.activeScenario[room.id] = scene.id; } render();
  }
  if (action === "set-switch") { state.switchColor = button.dataset.color === "carbon" ? "carbon" : "white"; saveState(); render(); showToast(`Выбран выключатель: ${state.switchColor === "carbon" ? "Карбон" : "Белый"}`); }
  if (action === "run-demo") {
    stopDemo(); state.demoPhase = "running"; render();
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 1250;
    demoTimer = setTimeout(() => { state.demoPhase = "done"; render(); }, delay);
  }
  if (action === "toggle-scene") {
    const key = sceneKey(button.dataset.room, button.dataset.scenario); const exists = state.selectedScenes.includes(key);
    state.selectedScenes = exists ? state.selectedScenes.filter((item) => item !== key) : [...state.selectedScenes, key]; saveState(); render(); showToast(exists ? "Сценарий удалён" : "Сценарий добавлен в комплект");
  }
  if (action === "toggle-picker-category") { const id = button.dataset.category; state.pickerCategories = state.pickerCategories.includes(id) ? state.pickerCategories.filter((item) => item !== id) : [...state.pickerCategories, id]; saveState(); render(); }
  if (action === "set-budget") { state.budget = Number(button.dataset.budget); saveState(); render(); }
  if (action === "set-level") { state.levels[button.dataset.room] = button.dataset.level; saveState(); render(); }
  if (action === "try-set") { const room = findRoom(button.dataset.room); const keys = levelKeys(room.id, button.dataset.level); state.room = room.id; state.activeScenario[room.id] = keys[0].split(":")[1]; state.activeCategory = findScenario(...keys[0].split(":")).cat; setView("room"); }
  if (action === "add-set") { const roomId = button.dataset.room; const level = button.dataset.level; const keys = levelKeys(roomId, level); state.selectedScenes = [...new Set([...state.selectedScenes, ...keys])]; state.extras[roomId] = PACKAGE_PRODUCTS[roomId]?.[level] || []; saveState(); showToast("Набор добавлен в комплект"); render(); }
  if (action === "add-recommendation") { const rec = recommendation(); if (!rec.insufficient) { state.selectedScenes = [...new Set([...state.selectedScenes, ...rec.keys])]; saveState(); setView("bundle"); showToast("Рекомендации добавлены"); } }
  if (action === "remove-scene") { const roomId = button.dataset.room; const key = sceneKey(roomId, button.dataset.scenario); state.selectedScenes = state.selectedScenes.filter((item) => item !== key); if (!state.selectedScenes.some((item) => item.startsWith(`${roomId}:`))) delete state.extras[roomId]; saveState(); render(); showToast("Сценарий удалён, состав пересчитан"); }
  if (action === "confirm-order") { state.checkoutComplete = true; render(); }
  if (action === "business-minus") { state.businessCount = Math.max(1, state.businessCount - 1); render(); }
  if (action === "business-plus") { state.businessCount = Math.min(100, state.businessCount + 1); render(); }
  if (action === "business-request") { state.businessComplete = true; render(); }
  if (action === "reset-business") { state.businessComplete = false; render(); }
});

document.addEventListener("change", (event) => {
  const checkbox = event.target.closest('.room-check input[type="checkbox"]');
  if (!checkbox) return;
  const id = checkbox.dataset.room;
  state.pickerRooms = checkbox.checked ? [...new Set([...state.pickerRooms, id])] : state.pickerRooms.filter((item) => item !== id);
  saveState(); render();
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.role !== "budget") return;
  state.budget = Number(event.target.value); saveState(); render();
});

async function start() {
  app.innerHTML = `<div class="shell" style="padding-top:80px"><p class="eyebrow">Загрузка каталога</p><h2>Готовим квартиру</h2></div>`;
  try {
    const response = await fetch("./data/catalog-rrc-4q2026.json");
    if (!response.ok) throw new Error("catalog unavailable");
    catalog = await response.json();
  } catch {
    catalog = FALLBACK_CATALOG;
  }
  catalogBySku = new Map(catalog.map((item) => [item.sku, { ...item, rrc: Math.round(Number(item.rrc) * 100) / 100 }]));
  render();
}

start();
