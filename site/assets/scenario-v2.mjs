import { baseSku, count, deviceInfo, instances, roomType } from "./model.mjs";
import { entries, roleSku, customerAvailability, businessAvailability, deprecatedIds, globalIdeas } from "./scenario-data-v2.mjs";

export const partnerLabel = "Партнёрское устройство · не входит в комплект и расчёт";
const entryById = new Map(entries.map(s=>[s.id,s]));
const roleBases = {
  ...roleSku,
  home:[...roleSku.home,"SBDV-00171D","SBDV-00171V"],
  hub:[...roleSku.hub,"SBDV-00171D","SBDV-00171V"],
  speaker:[...roleSku.speaker,"SBDV-00171D","SBDV-00171V","SBDV-00250B","SBDV-00250G","SBDV-00250Y","SBDV-00090a"],
  switch:[...roleSku.switch,"ATN000113Z","ATN000153Z"],
  switch2:[...roleSku.switch2,"ATN000153Z"],
  szop:[...roleSku.szop,"O2U202W1R"],
  bulb:[...roleSku.bulb,"SBDV-00305","SBDV-00307","SBDV-00115","SBDV-00117","SBDV-00120"],
  socket:[...roleSku.socket,"SBDV-00123W"],
  nightlight:[...roleSku.nightlight,"SBDV-00127"],
};
export const roleKind = {
  switch:"switch",switch2:"switch",strip:"strip",bulb:"lamp",socket:"socket",button:"button",
  door:"door",motion:"motion",leak:"water",szop:"valve",temp:"climate",radiator:"heat",floor:"floor",
  home:"speaker",speaker:"speaker",hub:"hub",nightlight:"night",
  curtain:"curtain",robot:"robot",humidifier:"humidifier",kettle:"kettle",
};
export const matchesRole = (item,role) => item.partner ? item.kind===role : Boolean(roleBases[role]?.includes(baseSku(item.base || item.sku)));
export const unitsFor = (units,role) => units.filter(d=>matchesRole(d,role));
const have = (rows, role, qty=1) => count(rows.filter(d=>matchesRole(d,role))) >= qty;
const category = value => ({ Свет:"light", Атмосфера:"light", Климат:"climate", Комфорт:"comfort", Безопасность:"safety" })[value];
const addOns = {
  living:["curtain","robot"], kitchen:["robot","kettle"], kitchen_living:["curtain","robot","kettle"],
  bedroom:["curtain","humidifier"], nursery:["humidifier"], room:["curtain","robot","humidifier"],
};
export function companionDevices(room, scenes, showDirect) {
  const types = new Set(scenes.flatMap(s=>s.partners?.map(p=>p.type) ?? []));
  if (showDirect) for (const type of addOns[room] ?? addOns[roomType(room)] ?? []) types.add(type);
  return [...types].map(kind=>({ id:room+":partner:"+kind, room, kind, index:0, qty:1, partner:true, title:deviceInfo[kind][0] }));
}
export function sceneAliases(id, scenes) {
  const old = {
    rest:["L01","BL01"], away:["L05","E06"], cook:["K01","BK01"], warm:["L06","K06","N05"],
    leak:["W01","K03","W06","U01"], protect:["W06","U01"], sleep:["B01","BB01"], wake:["B02","BB02"],
    fairytale:["N01"], climate:["W02"], movement:["W03","E05"], door:["E01","E03"], home:["E04"],
  };
  return scenes.find(s=>s.id===id) ?? (deprecatedIds[id] || old[id] || []).map(next=>scenes.find(s=>s.id===next)).find(Boolean);
}
export function resolveScenes(room, rows, options={}) {
  const { mode="customer", level="max", plan, variant="max", settings={}, type }=options;
  const effective=type || room;
  let ids;
  if (mode==="customer") ids=customerAvailability[effective]?.[level] ?? [];
  else if (mode==="layout") ids=businessAvailability[plan]?.[variant]?.[room] ?? [];
  else if (mode==="project") ids=type && type!==roomType(room)
    ? [...new Set(Object.values(customerAvailability[effective] ?? {}).flat()), ...entries.filter(x=>x.room===effective && x.id.length===4).map(s=>s.id)]
    : [...new Set([...(businessAvailability[plan]?.[variant]?.[room] ?? []), ...(customerAvailability[effective]?.max ?? [])])];
  else {
    ids=entries.filter(s=>[effective,roomType(effective)].includes(s.room)).map(s=>s.id);
    if (effective==="bath") ids.push("K06");
  }
  const hasVent = settings.ventilation && have(rows,"temp") && have(rows,"switch2") && ids.includes("W04");
  const explicit = mode==="customer" || mode==="layout";
  const available = ids.map(id=>entryById.get(id)).filter(s=>s &&
    s.requires.every(role=>have(rows,role,s.counts[role] ?? 1)) &&
    (s.id!=="W04" || hasVent) && (s.id!=="W02" || !hasVent) &&
    (explicit || !s.hideIf || !have(rows,s.hideIf)));
  const family = { BK01:"K01",BK02:"K02",BK03:"K07",BL01:"L01",BL02:"L02",BB01:"B01",BB02:"B02",BN01:"N03" };
  const unique=available.filter(s=>!family[s.id]||!available.some(x=>x.id===family[s.id]));
  return unique.map(s=>{
    const optional=(s.optional ?? []).filter(o=>
      o.requires.every(role=>have(rows,role)) &&
      (s.id!=="W06" || settings.linked) &&
      (!o.requires.includes("socket") || settings.safeLoads));
    return {
      ...s, category:category(s.category), label:s.category, optional, required:s.requires.map(r=>roleKind[r]),
      partners:s.partners ?? [], buyRoles:[...new Set([...s.requires,...optional.flatMap(x=>x.requires)])],
      result:programs[s.id].result, action:programs[s.id].frames.map(f=>f.text).join(" · "),
    };
  });
}
export function buyRows(s, rows) {
  const picks=new Map();
  for (const role of s.buyRoles) {
    let needed=s.counts[role] ?? 1;
    for (const row of rows.filter(r=>matchesRole(r,role))) {
      if (needed<=0) break;
      const qty=Math.min(needed,row.qty);
      picks.set(row.id,{ ...row,qty:Math.max(picks.get(row.id)?.qty ?? 0,qty) });
      needed-=qty;
    }
  }
  return [...picks.values()];
}
export function conditions(s, rows, outsideHub=false) {
  const zigbee=s.requires.some(r=>["door","motion","button","temp","leak","radiator","floor","switch","switch2","socket"].includes(r));
  const needHub=zigbee && !outsideHub && !have(rows,"hub") ? "Нужен совместимый хаб Zigbee или SberBoom Home." : "";
  const notes={
    E07:"Та же кнопка используется для альтернативного пресета звонка.",
    B07:"Два выключателя управляют одним контуром. На одном настроена сценарная клавиша.",
    W06:"В стандартном демо работает комплектный датчик СЗОП.",
    U01:"Работает комплектный датчик СЗОП.",
    W01:"Датчик сообщает о воде. Краны остаются открыты.",
    W04:"Второй канал управляет установленной совместимой вытяжкой.",
    K07:"Показан разрешённый дистанционный режим совместимого чайника.",
    BK03:"Показан разрешённый дистанционный режим совместимого чайника.",
    L05:"В сценарии отключается заранее назначенная допустимая нагрузка.",
  };
  return [notes[s.id],needHub].filter(Boolean).join(" ");
}

const F = (text, changes, only = "") => ({ text, changes, only });
const P = (seed, event, frames, result) => ({ seed,event,frames,result });
const welcome = P({"door":false,"switch":false,"speaker":false}, F("Дверь открыта",{door:true}), [
  F("Выключатель включает свет",{switch:true}), F("Колонка приветствует",{speaker:true,$note:"С возвращением!"},"speaker"),
], "В прихожей светло. Можно войти с занятыми руками.");
const motionLight = (role, label) => P({motion:false,[role]:false}, F("Датчик заметил движение",{motion:true}), [
  F("Обычный свет включён",{[role]:true,$note:"3 минуты без движения · время ускорено"}),
  F("Время вышло. Свет выключается",{motion:false,[role]:false}),
],label);
const climate = (result, humidifier=false) => P({temp:22,radiator:28,humidifier:35},F("Датчик заметил 19 °C",{temp:19}),[
  F("Клапан открывается",{radiator:82,temp:19.4,$target:22}), F("Комната постепенно прогревается",{temp:20.2}),
  F("Температура приближается к цели",{temp:21.4}),
  ...(humidifier?[F("Отдельное правило заметило низкую влажность",{$note:"Влажность 34% · пример настроенного порога"},"humidifier"),
    F("Увлажнитель переходит в рабочий режим",{humidifier:49},"humidifier")]:[]),
],result);
const waterAlarm = (kitchen=false) => P({leak:false,strip:0,socket:true,$note:""},F("Датчик обнаружил воду",{leak:true}),[
  F("На телефоне появилось уведомление",{$note:"Уведомление о протечке"}),
  ...(kitchen?[F("Лента предупреждает красным светом",{strip:[75,"red"]},"strip"),
    F("Назначенная нагрузка отключается",{socket:false},"socket")]:[]),
], "Вода замечена. Получено уведомление.");
const shutoff = P({szop:false,$water:false,$note:""}, F("Комплектный датчик обнаружил воду",{$water:true}),[
  F("Контроллер подал команду приводам",{$valveMoving:true}),
  F("Приводы закрыли краны",{szop:true,$valveMoving:false,$note:"Вода перекрыта"}),
],"Вода перекрыта. Подача остановлена.");
const warmNight = { temp:21.2,radiator:35,$target:20 };
const warmMorning = { temp:20.8,radiator:62,$target:22 };
const wake = smart => P({[smart?"bulb":"switch2"]:smart?0:false,home:false,curtain:0,temp:20,radiator:24},F("Наступило время подъёма",{$window:".55"}),[
  F("Комната просыпается",{[smart?"bulb":"switch2"]:smart?[24,"amber"]:true}),
  ...(smart?[F("Лампа становится ярче",{bulb:[68,"snow"]})]:[]),
  F("Колонка отмечает утренний режим",{home:true,$note:"Время вставать"}),
  F("Шторы открываются",{curtain:100,$window:"1"},"curtain"),
  F("Радиатор получил утреннюю уставку",warmMorning,"radiator"),
],smart?"Утро начинается с мягкого света.":"Утренний свет включён.");
const bedtime = smart => P({switch2:true,home:false,bulb:smart?85:0,socket:true,temp:22,radiator:65},F("Команда перед сном",{}),[
  F("Обычные контуры гаснут",{switch2:false,"switch2.2":false}),
  ...(smart?[F("У кровати остаётся ночной свет",{bulb:[18,"amber"]})]:[]),
  F("Колонка подтверждает режим",{home:true,$note:"Спокойной ночи"}),
  F("Радиатор получил ночную уставку",warmNight,"radiator"),
  F("Выбранный прибор обесточен",{socket:false},"socket"),
],smart?"У кровати мягкий свет, остальная комната темнее.":"Обычный свет выключен.");
const breakfast = smart => P({switch2:false,"switch2.2":false,strip:0,home:false,kettle:22},F("Настало время завтрака",{$window:".86"}),[
  F(smart?"Лента даёт мягкий утренний свет":"Включён обеденный контур",smart?{strip:[43,"amber"]}:{"switch2.2":true}),
  ...(smart?[F("Включён обеденный контур",{"switch2.2":true},"switch2")]:[]),
  F("Home подтверждает режим",{home:true,$note:"Пора завтракать"}),
  F("Совместимый чайник подтвердил безопасное состояние",{kettle:57},"kettle"),
  F("Чайник завершает демо нагрева",{kettle:92},"kettle"),
],smart?"Кухня освещена к завтраку.":"Обеденный контур включён.");
const movies = smart => P({switch2:true,"switch2.2":!smart,strip:0,home:false,curtain:100},F("Команда «Время отдыха»",{}),[
  F("Основной свет гаснет",{switch2:false}),
  ...(smart?[F("Лента переходит в мягкий фон",{strip:[61,"amber"]})]:[]),
  F("Home подтверждает кино-режим",{home:true,$note:"Кино-режим"}),
  F("Совместимые шторы закрываются",{curtain:0},"curtain"),
],smart?"Основной свет погашен, лента даёт мягкий фон.":"Основной контур выключен, оставлен дополнительный.");
const guests = smart => P({switch2:false,"switch2.2":false,strip:0,home:false},F("Команда «Пришли гости»",{}),[
  F("Основной свет включён",{switch2:true}),F("Включён дополнительный контур",{"switch2.2":true}),
  ...(smart?[F("Лента добавляет тёплую подсветку",{strip:[84,"amber"]})]:[]),
  F("Колонка показывает фоновый режим",{home:true}),
],"Комната ярко освещена и готова к встрече.");
const cooking = smart => P({switch2:false,"switch2.2":false,strip:0,home:false},F("Команда «Готовлю»",{}),[
  ...(smart?[F("Лента подсвечивает рабочую поверхность",{strip:[94,"snow"]})]:[]),
  F("Загорается обычный рабочий контур",{switch2:true,"switch2.2":!smart},"switch2"),
  F("Колонка подтверждает",{home:true,$note:"Рабочая зона готова"}),
],"Рабочая поверхность освещена.");
const dinner = smart => P({switch2:true,"switch2.2":false,strip:smart?[94,"snow"]:0,home:false},F("Команда «Время ужина»",{}),[
  F("Рабочий свет гаснет",{switch2:false,"switch2.2":true},"switch2"),
  ...(smart?[F("Лента даёт тёплый свет",{strip:[58,"amber"]})]:[]),
  F("Home включает фоновый режим",{home:true}),
],"Свет у стола подходит для ужина.");

const programs = {
  E04:welcome, E05:motionLight("switch","На проходе был свет. После паузы он выключился."),
  E06:P({button:false,switch:true},F("Долгое нажатие кнопки",{button:true}),[
    F("Выключатель размыкает цепь",{switch:false})],"Свет прихожей выключен. Датчики продолжают работу."),
  E07:P({button:false,speaker:false},F("Нажата кнопка у двери",{button:true}),[
    F("Колонка подаёт сигнал",{speaker:true,$note:"К вам пришли"})],"Звонок слышно в квартире."),
  E03:P({speaker:false},F("Запрошено состояние двери",{}),[
    F("Входная дверь {door}",{speaker:true,$doorRead:true})],"Видно текущее состояние входной двери."),
  E01:P({door:false},F("Входная дверь открывается",{door:true}),[
    F("Датчик передал событие",{$note:"Входная дверь открыта"})],"В телефоне появилось уведомление."),
  E02:P({motion:false},F("Движение в прихожей",{motion:true}),[
    F("Телефон получает сигнал",{$note:"Обнаружено движение"})],"Движение отмечено в телефоне."),
  K01:cooking(true), K02:dinner(true), K03:waterAlarm(true), K06:climate("На кухне постепенно становится теплее."), K07:breakfast(true),
  L01:movies(true), L02:guests(true),
  L08:P({switch2:true,"switch2.2":false,strip:0,home:false,bulb:0},F("Команда «Романтика»",{}),[
    F("Основной свет гаснет",{switch2:false,"switch2.2":true}),
    F("Лента переходит в мягкий цвет",{strip:[36,"purple"]}),F("Зональная лампа приглушена",{bulb:[18,"amber"]},"bulb"),
    F("Home включает фоновый режим",{home:true}),],"Мягкий цвет и фон для вечера."),
  L03:P({switch2:true,strip:0,$window:"1"},F("Начинается закат",{$window:".7"}),[
    F("Обычный рабочий контур гаснет",{switch2:false,$window:".48"}),
    F("Вместо него включается тёплая лента",{strip:[58,"amber"],$window:".3"}),],"В комнате тёплая вечерняя подсветка."),
  L04:P({switch2:true,bulb:0},F("Команда «Время почитать»",{}),[
    F("Верхний свет выключен",{switch2:false}),
    F("Лампа у кресла светит ярче",{bulb:[82,"snow"]}),],"Книга хорошо освещена, остальная комната спокойнее."),
  L05:P({switch2:true,"switch2.2":true,socket:true,strip:60,bulb:45},F("Запущена команда ухода",{}),[
    F("Световые контуры выключаются",{switch2:false,"switch2.2":false,strip:0,bulb:0}),
    F("Розетка отключает выбранный прибор",{socket:false}),],"Выбранный свет и подключённый допустимый прибор выключены."),
  L06:climate("Комната приближается к заданной температуре."),
  L10:P({switch2:false,home:false,robot:false},F("Команда «Начни уборку»",{}),[
    F("Включается обычный свет",{switch2:true}), F("Home подтверждает",{home:true}),
    F("Совместимый робот выезжает с базы",{robot:true},"robot"),],"Обычный свет включён для уборки."),
  B01:bedtime(true), B02:wake(true),
  B03:P({switch2:false,"switch2.2":false,bulb:0},F("Запрошен ночной свет",{}),[
    F("Умная лампа включается на малой яркости",{bulb:[15,"amber"]}),],"У кровати есть свет, потолок остаётся тёмным."),
  B07:P({"switch2":true,"switch2#1":true},F("Нажата клавиша у кровати",{"switch2#1":false,"switch2":false}),[
    F("Тот же контур погас у обеих клавиш",{"switch2":false,"switch2#1":false}),
    F("Клавиша у входа включает тот же контур",{"switch2":true,"switch2#1":true}),],"Один свет управляется из двух мест."),
  N01:P({switch2:true,nightlight:0,home:false,bulb:48,socket:true,temp:22,radiator:62},F("Команда «Пора спать»",{}),[
    F("Обычный свет выключен",{switch2:false,bulb:0}),
    F("Ночник мягко загорается",{nightlight:[37,"amber"]}),
    F("Колонка показывает режим сказки",{home:true,$note:"Сказка перед сном"}),
    F("Настроена ночная температура",warmNight,"radiator"),
    F("Допустимая нагрузка отключена",{socket:false},"socket"),],"Ночник оставляет у кровати мягкий свет."),
  N02:P({nightlight:0,home:false},F("Ребёнок просит включить ночник",{}),[
    F("Ночник загорается",{nightlight:[51,"amber"],home:true,$note:"Таймер выключения · демо"}),
    F("Таймер истёк",{nightlight:0}),],"Ночник включился на время и погас по таймеру."),
  N06:P({nightlight:15,switch2:false,home:false,bulb:0},F("Наступило время собираться",{$window:".68"}),[
    F("Ночник переходит в утренний режим",{nightlight:[50,"snow"]}),
    F("Home напоминает о школе",{home:true,$note:"Пора в школу"}),
    F("Обычный свет включается",{switch2:true,bulb:[68,"snow"],$window:"1"}),],"Комната освещена к сборам."),
  N03:P({switch2:false,bulb:0},F("Выбран режим занятий",{}),[
    F("Загорается рабочая лампа",{bulb:[90,"snow"]}),F("Включается независимый обычный свет",{switch2:true}),],"Рабочее место хорошо освещено."),
  N05:climate("Радиатор работает к цели 22 °C.",true),
  W06:shutoff, W01:waterAlarm(), W03:motionLight("switch2","Свет был включён на время прохода."),
  W04:P({temp:55,"switch2.2":false,$fan:false},F("Влажность выросла до 75%",{temp:75}),[
    F("Второй канал включает вытяжку",{"switch2.2":true,$fan:true}),F("Влажность снижается",{temp:64}),
    F("Вытяжка отключается по порогу",{temp:57,"switch2.2":false,$fan:false}),],"Вентиляция завершила цикл. Свет не менялся."),
  W05:P({floor:22,motion:false,switch2:false},F("Наступило время прогрева",{}),[
    F("Термостат включает нагрев",{floor:25,$target:27}),F("Пол постепенно прогревается",{floor:27}),
    F("При последующем входе загорается свет",{motion:true,switch2:true},"switch2"),],"Тёплый пол работает к заданной температуре."),
  W02:P({temp:55},F("Влажность выросла после душа",{temp:75}),[
    F("Телефон показал новое значение",{$note:"Влажность 75%" }),],"Видно, когда пора проветрить ванную."),
  BK01:cooking(false), BK02:dinner(false), BK03:breakfast(false), BL01:movies(false), BL02:guests(false),
  BB01:bedtime(false), BB02:wake(false),
  BN01:P({switch2:false,home:false},F("Нажата клавиша рабочего света",{}),[
    F("Загорается обычный контур занятий",{switch2:true}),F("Home подтверждает режим",{home:true}),],"Рабочая зона освещена."),
  U01:shutoff,
};

export function scenarioFrames(s) {
  const p=programs[s.id];
  return { ...p, frames:p.frames.filter(f=>!f.only || s.buyRoles.includes(f.only) || s.partners.some(x=>x.type===f.only)) };
}
export function resolveChange(units, s, selector, trigger) {
  const [address, channel] = selector.split(".");
  const [role, ref] = address.split("#");
  if (!s.buyRoles.includes(role) && !s.partners.some(p=>p.type===role)) return null;
  const candidates=unitsFor(units,role);
  const unit=ref ? candidates[Number(ref)] : (s.counts[role] ?? 1)>1 ? candidates[0] : candidates.find(d=>d.id===trigger) ?? candidates[0];
  return unit ? { unit, channel:channel==="2", role } : null;
}
export function apartmentIdeas(activeRows) {
  return globalIdeas.filter(s=>{
    if (!s.requires.every(([room,role])=>have(activeRows.filter(x=>x.room===room),role))) return false;
    if (s.others && !activeRows.some(x=>x.room!=="entry" && s.others.some(role=>matchesRole(x,role)))) return false;
    if (s.oneOf && !s.oneOf.some(role=>have(activeRows,role))) return false;
    if (s.distinct) {
      const [sensor,protection]=s.distinct;
      return activeRows.some(x=>matchesRole(x,sensor) && activeRows.some(y=>y.room!==x.room&&matchesRole(y,protection)));
    }
    return true;
  });
}

export function apartmentFrames(idea, rows, settings = {}) {
  const units = instances(rows);
  const find = (role, room) => units.find(d=>matchesRole(d,role) && (!room || d.room===room));
  const step = (text, changes, options = {}) => ({ text, changes, ...options });
  const note = (device, message) => ({ room:device.room, note:message });
  const button = find("button","entry");
  if (idea.id==="A01") {
    const lights = units.filter(d=>["switch","strip","bulb","nightlight"].some(role=>matchesRole(d,role)));
    const loads = settings.safeLoads ? units.filter(d=>matchesRole(d,"socket")) : [];
    return [step("Долгое нажатие кнопки в прихожей",[[button,true]]),
      ...Array.from(new Set(lights.map(d=>d.room)), room=>step("Свет выключен в выбранной комнате",lights.filter(d=>d.room===room).map(d=>[d,d.kind==="switch"?false:0]),{ from:button })),
      ...(loads.length?[step("Назначенные приборы обесточены",loads.map(d=>[d,false]),{ from:button })]:[]),
      step("Квартира готова к выходу. Хаб и датчики продолжают работу.",[])];
  }
  if (idea.id==="A02") {
    const protection=find("szop");
    const movement=units.find(d=>matchesRole(d,"motion") && find("switch",d.room));
    const light=movement && find("switch",movement.room);
    return [step("Включён режим «Отпуск»",[[button,true]]),
      step("Система защиты закрывает краны",[[protection,true]],{ from:button, ...note(protection,"Краны закрыты · режим «Отпуск»") }),
      ...(light?[step("По расписанию свет включается для эффекта присутствия",[[light,true]],{ from:button }),
        step("По расписанию свет выключается",[[light,false]])]:[]),
      step("Подача воды закрыта. Статус защиты виден в приложении.",[])];
  }
  const signal=units.find(d=>matchesRole(d,"leak") && units.some(v=>matchesRole(v,"szop") && v.room!==d.room));
  const protection=units.find(d=>matchesRole(d,"szop") && d.room!==signal.room);
  const strip=find("strip",signal.room);
  const canLink=settings.linked && (settings.hub || find("hub"));
  return [step("Внешний датчик обнаружил воду",[[signal,true]],note(signal,"Обнаружена вода")),
    step("В приложении появилось уведомление",[],note(signal,"Уведомление о протечке")),
    ...(strip?[step("Лента отмечает зону красным",[[strip,75,"red"]])]:[]),
    ...(canLink?[step("Настроенная связка передаёт сигнал системе защиты",[[protection,false]],{ from:signal, ...note(protection,"Контроллер получил сигнал"), moving:true }),
      step("Приводы закрывают краны в другом помещении",[[protection,true]],{ from:signal, ...note(protection,"Краны закрыты"), moving:false }),
      step("Вода перекрыта. Уведомление показывает обе зоны.",[])]
    : [step("Уведомление получено. Комплектный датчик СЗОП можно проверить в его помещении.",[])])];
}

export class ScenarioPlayer {
  constructor({ schedule=(callback,ms)=>setTimeout(callback,ms), cancel=ms=>clearTimeout(ms), reduce=()=>false }={}) {
    this.schedule=schedule; this.cancel=cancel; this.reduce=reduce; this.token=0; this.timers=[];
  }
  stop() {
    this.token++;
    for (const timer of this.timers) this.cancel(timer);
    this.timers=[];
  }
  start(steps, callback) {
    this.stop();
    const token=this.token;
    const delay=this.reduce()?220:720;
    const phases=steps.map((step,i)=>({...step,phase:i===0?"event":i===steps.length-1?"done":"action"}));
    phases.forEach((step,i)=>{
      const deliver=()=>{ if (token===this.token) callback(step,i); };
      if (!i) deliver();
      else this.timers.push(this.schedule(deliver,i*delay));
    });
  }
}
