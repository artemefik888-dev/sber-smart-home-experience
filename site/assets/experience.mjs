import {
  catalog, rooms, roomKits, layouts, cases, levels, functions, tasks, planLabels, deviceInfo,
  roomName, roomType, count, total, rub, kitRows, planRows, caseRows, makeRow, instances, groupRows,
  recommendedKits, cartRows, applyAdjustments, quantity, questionTypes, caseRoom,
} from "./model.mjs";
import { roomScenes, condition, defaults, stateLabel, devicePosition } from "./scenes.mjs";
import {
  resolveScenes, buyRows, conditions, scenarioFrames, resolveChange, companionDevices,
  sceneAliases, matchesRole, partnerLabel, apartmentIdeas, apartmentFrames, ScenarioPlayer,
} from "./scenario-v2.mjs";
import { renderPlan, geometry, pinGroup } from "./plan.mjs";
import { downloadSpecification } from "./export.mjs";

const app = document.querySelector("#app");
const notice = document.querySelector("#toast");
const nav = document.querySelector("#site-nav");
const storage = "sber-experience:v2";
const legacyKey = "sber-smart-home-experience-v1";
const esc = raw => String(raw ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const attrs = (values = {}) => Object.entries(values).map(([key,val]) => ' data-'+key+'="'+esc(val)+'"').join("");
const asset = id => "./assets/rooms/" + (id==="kitchen_living"?"studio-release-2":rooms[roomType(id)]?.image ?? rooms.living.image) + ".jpg";
const logo = "./assets/sber-smart-home-logo.jpg";
const keys = Object.keys( roomKits );
const sectors = { repair: "Ремонтным компаниям", developer: "Девелоперам" };
const freshProject = () => ({ variant:"max", budget:150000, changes:{}, names:{}, types:{}, stage:"", selectedRooms:[], tasks:["light","climate","safety"] });
const projectTasks = {
  max:["light","climate","safety"], light:["light"], light_climate:["light","climate"],
  safety:["safety"], safety_light:["light","safety"],
};
const freshBusiness = () => ({ color:"white", variants:{}, quantities:{}, options:{}, modules:[], projects:{} });
function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
const old = readStorage(legacyKey);
const saved = readStorage(storage);
const state = {
  color: saved?.color === "carbon" || (!saved && old?.switchColor === "carbon") ? "carbon" : "white",
  kits: saved?.kits ?? {}, selected: saved?.selected ?? {}, controls: saved?.controls ?? {},
  simulation: saved?.simulation ?? {},
  picker: saved?.picker ?? { tasks: ["light","climate","safety"], rooms: [...keys], budget: 100000 },
  b2b: { repair: { ...freshBusiness(), ...saved?.b2b?.repair }, developer: { ...freshBusiness(), ...saved?.b2b?.developer } },
};
const save = () => {
  try { localStorage.setItem(storage, JSON.stringify(state)); } catch { /* session still works */ }
};
function projectFor(id = route.id) {
  const key = layouts[id] ? id : "two";
  const business=state.b2b.repair;
  const caseId=route.name==="project" && route.p.from?.startsWith("case-") && route.p.from.slice(5);
  const source=cases.find(item=>item.audience==="both" && item.id===caseId);
  if (!source) return business.projects[key] ??= freshProject();
  const room=caseRoom(source.id);
  return business.projects[key+":"+source.id] ??= {
    ...freshProject(), caseId:source.id, caseRoom:room, caseOptions:{ ...business.options[source.id] },
    selectedRooms:layouts[key].groups[room] ? [room] : [],
  };
}
function syncProjectRoute() {
  if (route.name!=="project" || !Object.hasOwn(projectTasks,route.p.variant)) return;
  const project=projectFor();
  if (project.variant===route.p.variant) return;
  project.variant=route.p.variant;
  project.tasks=[...projectTasks[project.variant]];
  save();
}
const debug = new URLSearchParams(location.search).has("debug");
const events = [];
if (debug) window.sberExperienceEvents = events;
function track(name, detail = {}) {
  if (debug) events.push({ name, ms: Math.round(performance.now()), route: location.hash || "#/home", ...detail });
}
let toastTimer;
function toast(text) {
  notice.textContent = text;
  notice.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => notice.classList.remove("visible"), 2500);
}
const path = (name, id = "", params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== ""));
  return "#/" + name + (id ? "/" + encodeURIComponent(id) : "") + (query.size ? "?" + query.toString() : "");
};
function parseRoute() {
  const [url, options] = location.hash.slice(1).split("?");
  const [name, id] = url.replace(/^\//, "").split("/");
  let decoded = "";
  try { decoded = decodeURIComponent(id ?? ""); } catch { /* bad route */ }
  return { name: name || "home", id: decoded, p: Object.fromEntries(new URLSearchParams(options)) };
}
let route = parseRoute();
let sceneRun = null;
let mapRun = null;
let voiceOpen = false;
let lastRoute = "";
const scrollPositions = new Map();
addEventListener("scroll", () => scrollPositions.set(history.state?.key,scrollY), { passive:true });
const lastSimulation = new Map();
let audioContext;
let audioGain;
function prepareAudio() {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume().catch(()=>{});
  } catch { /* visual status is still available */ }
}
function playCue() {
  if (audioContext?.state !== "running") return;
  audioGain?.disconnect();
  audioGain = audioContext.createGain();
  audioGain.connect(audioContext.destination);
  const now=audioContext.currentTime;
  audioGain.gain.setValueAtTime(0,now);
  audioGain.gain.linearRampToValueAtTime(.034,now+.09);
  audioGain.gain.exponentialRampToValueAtTime(.001,now+1.65);
  [261.63,329.63,392].forEach((hz,i)=>{
    const tone=audioContext.createOscillator();
    tone.frequency.value=hz;
    tone.connect(audioGain);
    tone.start(now+i*.075);
    tone.stop(now+1.7);
  });
}
function reply(text) {
  const speech = window.speechSynthesis;
  const voice = speech?.getVoices().find(candidate=>candidate.localService && candidate.lang.startsWith("ru"));
  if (!voice) {
    playCue();
    return;
  }
  const phrase = new SpeechSynthesisUtterance(text);
  phrase.lang="ru-RU";
  phrase.voice=voice;
  phrase.rate=1.08;
  speech.speak(phrase);
}
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const timeline = new ScenarioPlayer({ reduce:reduced });
function stop() {
  timeline.stop();
  sceneRun = null;
  mapRun = null;
  window.speechSynthesis?.cancel();
  if (audioGain) { audioGain.disconnect(); audioGain=null; }
}
function go(url, { replace = false, retainScroll = false, keepRun = false } = {}) {
  if (url === (location.hash || "#/home")) {
    render();
    return;
  }
  scrollPositions.set(history.state?.key, scrollY);
  if (!keepRun) stop();
  const entry = replace ? { ...history.state } : { key:crypto.randomUUID(), from:location.hash || "#/home" };
  history[replace ? "replaceState" : "pushState"](entry, "", url);
  route = parseRoute();
  syncProjectRoute();
  lastRoute = location.hash;
  render();
  if (!retainScroll && !replace) {
    window.scrollTo(0,0);
    app.focus({ preventScroll:true });
  }
}
if (!history.state?.key) history.replaceState({ key:crypto.randomUUID() }, "");
history.scrollRestoration = "manual";
function pop() {
  const now = location.hash;
  if (now === lastRoute) return;
  lastRoute = now;
  stop();
  route = parseRoute();
  syncProjectRoute();
  track("back");
  render();
  window.scrollTo(0,scrollPositions.get(history.state?.key) ?? 0);
}
addEventListener("popstate", pop);
addEventListener("hashchange", pop);

function btn(text, action, data = {}, style = "button", more = "") {
  return '<button type="button" class="'+style+'" data-do="'+action+'"'+attrs(data)+" "+more+">"+text+"</button>";
}
function link(text, href, style = "button") {
  return '<a class="'+style+'" href="'+esc(href)+'">'+text+'</a>';
}
const eyebrow = text => '<p class="kicker">'+text+'</p>';
const title = (name, lead, kicker = "") => '<header class="section-head">'+(kicker?eyebrow(kicker):"")+'<h1>'+name+'</h1>'+(lead?'<p class="lead">'+lead+'</p>':"")+'</header>';
const fmtColor = color => color === "carbon" ? "Карбон" : "Белый";
const storyTasks = { ...tasks, comfort:"Комфорт" };
const storyCategory = s => s.label || storyTasks[s.category] || "Умный дом";
const price = amount => '<strong class="price">'+rub(amount)+'</strong>';
const image = (room, className = "") => '<img class="'+className+'" src="'+asset(room)+'" alt="Интерьер: '+esc(roomName(room))+'" decoding="async">';
const chip = (label, active, action, data) => btn(label, action, data, "chip" + (active ? " on" : ""), 'aria-pressed="'+active+'"');
const back = fallback => btn("← Назад", "back", { fallback }, "back");
const select = (options, value, data, label) => '<select aria-label="'+esc(label)+'"'+attrs(data)+'>'+options.map(([id,text]) => '<option value="'+esc(id)+'"'+(id===value?' selected':'')+'>'+esc(text)+'</option>').join("")+'</select>';
function toggler(color, segment = "") {
  return '<div class="color-switch" role="group" aria-label="Цвет электроустановочных изделий">'+
    chip('<i class="swatch white"></i> Белый',color==="white","color",{ segment, value:"white" })+
    chip('<i class="swatch carbon"></i> Карбон',color==="carbon","color",{ segment, value:"carbon" })+'</div>';
}
const primaryPaths = [
  ["Попробовать в квартире", path("room","living")],
  ["Подобрать комплект", path("pick")],
  ["Смотреть сценарии", path("stories")],
];
const readyCart = () => cartRows(state.kits,state.selected,state.color);
function shell() {
  nav.innerHTML = primaryPaths.map(([label,url]) => link(label,url,"nav-link")).join("")
    + link("Для бизнеса",path("business"),"nav-link business-link")
    + link("Мой комплект <span>"+count(readyCart())+"</span>",path("cart"),"button cart-link");
}
function home(shop = false) {
  const contents = shop
    ? '<div class="shop-banner"><div>'+eyebrow("Витрина умного дома")+'<h1>Посмотри, как работает умный дом</h1><p class="lead">Попробуйте сценарии в комнатах и соберите комплект под свои задачи.</p>'+link("Открыть интерактивную квартиру",path("home","",{ from:"shop" }),"button primary")+'</div>'+image("living")+'</div>'
    : '<section class="hero"><div class="hero-copy"><img src="'+logo+'" class="hero-logo" alt="Умный дом Sber">'+eyebrow("Интерактивная квартира")+
      '<h1>Умный дом<br>в действии</h1><p class="lead">Включите свет, запустите сценарий и посмотрите, как квартира реагирует. Подберите устройства для своего дома.</p>'+
      '<div class="hero-actions">'+primaryPaths.map(([label,url]) => link(label,url,"button primary")).join("")+'</div>'+
      '<div class="hero-minor">'+link("Вся квартира в 3D",path("tour"),"text-link")+link("Витрина магазина",path("shop"),"text-link")+'</div></div>'+
      '<figure class="hero-photo">'+image("living")+'<figcaption><span class="signal-dot"></span> Гостиная <span>·</span> Время отдыха</figcaption></figure></section>';
  if (shop) {
    const picks = ["SBDV-00171G","SBDV-00079","SBDV-00033","SBDV-00154"];
    return '<div class="wrap page">'+back(path("home"))+contents+'<section class="pad-top"><h2>Устройства умного дома</h2><div class="grid four">'+picks.map(sku => {
      const d = makeRow("living",sku,1,state.color);
      return '<article class="shop-product">'+productImage(d)+ '<h3>'+esc(deviceInfo[d.kind][0])+'</h3>'+price(d.price)+'</article>';
    }).join("")+'</div><p class="muted">Макет витрины для оценки точки входа.</p></section></div>';
  }
  return '<div class="wrap">'+contents+'<section class="home-rooms"><div class="row heading-row"><h2>Выберите комнату</h2>'+link("Открыть план",path("tour"),"text-link")+'</div><div class="room-tiles">'+
    Object.entries(rooms).filter(([id]) => roomKits[id]).map(([id,room]) => link(image(id)+'<span>'+esc(room.name)+'</span>',path("room",id),"room-tile")).join("")+'</div></section></div>';
}
function productImage(d, cls = "") {
  if (d.image) return '<img src="./assets/products/'+esc(d.image)+'" class="product-img '+cls+'" alt="" decoding="async">';
  const code = { switch:"▣", relay:"▤", lamp:"◉", strip:"≈", night:"◕", water:"◈", valve:"◈", curtain:"◧", robot:"◎", kettle:"♨", humidifier:"≋" }[d.kind] ?? "◦";
  return '<span class="product-symbol '+cls+'" aria-hidden="true">'+code+'</span>';
}
function list(rows, { detail = true, names = {} } = {}) {
  if (!rows.length) return '<p class="muted">В этой комплектации нет устройств.</p>';
  return '<ul class="product-list">'+rows.map(row => '<li>'+productImage(row)+'<div><strong>'+esc(detail?row.title:deviceInfo[row.kind][0])+'</strong><small>'+
    esc(row.sku)+(row.color?" · "+row.color:"")+(row.location?" · "+esc(row.location):"")+'</small></div><span>× '+row.qty+'</span><b>'+rub(row.price*row.qty)+'</b></li>').join("")+'</ul>';
}
function disclosures(rows, label = "Состав комплекта", opts = {}) {
  return '<details class="disclosure"><summary>'+label+' <span>'+count(rows)+' шт.</span></summary>'+list(rows,opts)+'</details>';
}
function groups(rows, names = {}, onRoom) {
  return Object.entries(groupRows(rows)).map(([id,items]) =>
    '<details class="disclosure room-breakdown"><summary>'+esc(roomName(id,names))+' <span>'+rub(total(items))+' · '+count(items)+' шт.</span></summary>'+
    (onRoom ? '<div class="breakdown-actions">'+onRoom(id)+'</div>' : "")+list(items,{ names })+'</details>').join("");
}
function scopeFor(segment, plan, room) { return segment ? segment+":"+plan+":"+room : "b2c:"+room; }
function currentValue(scope, d) { return state.controls[scope]?.[d.id] ?? defaults[d.kind] ?? false; }
function controlValues(scope) { return state.controls[scope] ??= {}; }
function put(scope, d, value) {
  if (!d) return;
  controlValues(scope)[d.id] = value;
}
function applyFrame({ scope, scene, units, trigger }, values, sound = false) {
  const affected = [];
  for (const [selector,value] of Object.entries(values)) {
    if (selector.startsWith("$")) {
      controlValues(scope)[selector] = value;
      if (selector==="$water" || selector==="$valveMoving") {
        affected.push(...units.filter(unit=>selector==="$water"?unit.component:matchesRole(unit,"szop")).map(unit=>unit.id));
      }
      continue;
    }
    const target = scene.requires ? resolveChange(units,scene,selector,trigger) : { unit:units.find(d=>d.kind===selector) };
    if (!target?.unit) continue;
    const { unit, channel } = target;
    const controls = controlValues(scope);
    if (Array.isArray(value)) {
      put(scope,unit,value[0]);
      controls[unit.id+":accent"] = value[1];
    } else if (channel) controls[unit.id+":secondary"] = value;
    else put(scope,unit,value);
    if (sound && unit.kind==="speaker" && value===true) {
      if (values.$note) reply(values.$note);
      else playCue();
    }
    affected.push(unit.id);
  }
  return affected;
}
function chooseScene(context) {
  return sceneAliases(route.p.scene,context.scenes) ?? context.scenes[0];
}
function setRoomQuery(params, options = {}) {
  go(path(route.name,route.id,{ ...route.p, ...params }),options);
}
function run(context, scenario, voice, trigger = "") {
  if (!scenario) return;
  const repeated = sceneRun?.scene.id === scenario.id;
  const { scope, room, segment } = context;
  const scopeValues = controlValues(scope);
  const door = context.units.find(d=>d.kind==="door");
  const doorState = door && currentValue(scope,door);
  stop();
  if (route.p.scene !== scenario.id) setRoomQuery({ scene:scenario.id },{ replace:true, keepRun:true });
  const units = context.units.filter(unit=>unit.partner || unit.component || !context.allowed || context.allowed.has(unit.id));
  const payload = { ...context, units, scene:scenario, voice, trigger };
  const previous = lastSimulation.get(scope);
  if (previous) applyFrame(previous.payload,previous.seed);
  for (const key of Object.keys(scopeValues).filter(key=>key.startsWith("$"))) delete scopeValues[key];
  const program = scenario.requires ? scenarioFrames(scenario) : {
    seed:scenario.before, event:{text:scenario.event,changes:{}},
    frames:[{text:scenario.action,changes:scenario.after}], result:scenario.result,
  };
  if (scenario.id==="E03") put(scope,door,Boolean(doorState));
  lastSimulation.set(scope,{ payload,seed:program.seed });
  if (context.units.some(d=>d.kind==="speaker")) prepareAudio();
  sceneRun = { ...payload, affected:[] };
  applyFrame(payload,program.seed);
  if (voice) reply("Включаю сценарий");
  track(repeated?"scenario_repeat":"scenario_start",{ id:scenario.id, room, segment, voice });
  timeline.start([program.event,...program.frames,{ text:program.result,changes:{} }], (step,index) => {
    const affected = applyFrame(payload,step.changes,true);
    const message = step.text.replace("{door}",doorState?"открыта":"закрыта");
    sceneRun = { ...sceneRun, phase:step.phase, message, index, affected };
    if (step.phase==="done") {
      track("scenario_complete",{ id:scenario.id, room, segment });
      save();
    }
    render();
  });
}
function toggleDevice(context, device) {
  const { kind, id } = device;
  const next=!currentValue(context.scope,device);
  const flavors={ water:["K03","W01"], valve:["U01","W06"], motion:["W03","E05","E02"], door:["E04","E01"] }[kind];
  const story=next && (!context.allowed||context.allowed.has(id)) && context.scenes.find(s=>flavors?.includes(s.id));
  track("device_control",{unit:id,room:context.room});
  if (story) return run(context,story,false,id);
  stop();
  put(context.scope,device,next);
  const controls=controlValues(context.scope);
  if (kind==="valve") controls.$water=false;
  if (["valve","water","door","motion"].includes(kind)) delete controls.$note;
  if (kind==="speaker" && next) { prepareAudio(); playCue(); }
  return updateState();
}
function roomContext(room, level, rows, opts = {}) {
  const units = instances(opts.demoRows ?? rows);
  const visualRoom = opts.type || room;
  const source = opts.source || "room";
  const scope = scopeFor(opts.segment,opts.scopePlan || opts.plan,room);
  const settings = state.simulation[scope] ?? {};
  const scenes = resolveScenes(room,rows,{
    mode:source==="room"?"customer":source, level: level||"max", plan:opts.plan,
    variant:opts.variant, type:opts.type, settings,
  });
  if (source==="case") {
    const handled = new Set(scenes.flatMap(s=>s.required));
    scenes.push(...roomScenes(visualRoom,rows,false).filter(s=>s.required.some(kind=>!handled.has(kind)) &&
      (!scenes.length || ["relay","media","power","lamp","cook"].includes(s.id))));
  }
  units.push(...companionDevices(visualRoom,scenes,source==="room" && !level).map(unit=>({ ...unit,id:room+":partner:"+unit.kind,room })));
  if (scenes.some(s=>s.id==="W06"||s.id==="U01")) units.push({ id:room+":szop:detector",room,kind:"water",index:0,component:true });
  return {
    room, level, rows, units, segment:opts.segment || "", plan:opts.plan || "",
    scope, scenes, settings, selectable:opts.selectable ?? true,
    name:roomName(room,opts.names), type:visualRoom, allowed:opts.allowed, source,
  };
}

function roomRail() {
  return '<nav class="room-rail" aria-label="Комнаты">'+Object.entries(rooms).filter(([id])=>roomKits[id])
    .map(([id, meta]) => link(image(id)+'<span>'+esc(meta.name)+'</span>',
      path("room",id,route.p.level && id===route.id?{ level:route.p.level }:{}),
      "rail-item"+(id===route.id?" active":""))).join("")+'</nav>';
}
function stage(context, chosen) {
  const { scope, units } = context;
  const controls = state.controls[scope] ?? {};
  const vals = type => units.filter(d=>d.kind===type).map(d=>currentValue(scope,d));
  const lighting = units.filter(d=>["strip","lamp","night"].includes(d.kind))
    .sort((a,b)=>currentValue(scope,b)-currentValue(scope,a));
  const glow = lighting.length ? currentValue(scope,lighting[0]) : 0;
  const ordinary = vals("switch").includes(true) || vals("relay").includes(true);
  const warm = vals("heat").some(v=>v>50) || vals("floor").some(v=>v>23);
  const play = sceneRun?.scope===scope ? sceneRun : null;
  const phase = play?.phase || "";
  const valveClosed = vals("valve").includes(true);
  const water = vals("water").includes(true) || controls.$water;
  const wetSensor = units.find(d=>d.kind==="water" && currentValue(scope,d));
  const leak = devicePosition(context.type,controls.$water ? units.find(d=>d.component) ?? {kind:"water",index:0} : wetSensor ?? { kind:"water",index:0 }) ?? [55,87];
  const heating = devicePosition(context.type,{ kind:"heat",index:0 }) ?? [78,68];
  const smoke = vals("humidifier").some(v=>v>35);
  const color = lighting.length ? state.controls[scope]?.[lighting[0].id+":accent"] || "amber" : "amber";
  const effectColors = { amber:"#ffc071", mint:"#74efb3", purple:"#c1a2ff", snow:"#f2f5f8", red:"#ff415c" };
  const secondary = !controls.$fan && units.some(d=>d.kind==="switch" && controls[d.id+":secondary"]);
  const strip = lighting.some(d=>d.kind==="strip" && currentValue(scope,d));
  const classList = [!ordinary && units.some(d=>d.kind==="switch")?"dim":"",glow?"glow":"",warm?"warm":"",water?"wet":"",valveClosed?"closed-water":"",
    vals("socket").includes(false)?"power-off":"",vals("speaker").includes(true)?"playing":"",vals("media").includes(true)?"media-on":"",
    vals("curtain").some(v=>v<60)?"curtain-down":"",vals("robot").includes(true)?"cleaning":"",
    vals("kettle").some(v=>v>25)?"boiling":"",smoke?"mist":"",vals("floor").some(v=>v>23)?"floor-warm":"",
    vals("door").includes(true)?"door-open":"",vals("motion").includes(true)?"motion-now":"",
    strip?"strip-on":"",secondary?"secondary-on":"",controls.$fan?"fan-on":"",controls.$valveMoving?"valve-moving":"",
    controls.$window?"window-active":"",color==="red"&&strip?"red-alert":""].join(" ");
  const marker = unit => {
    const point = devicePosition(context.type,unit);
    if (!point) return "";
    const [x,y] = point;
    const pulse = play?.affected.includes(unit.id);
    const live = chosen?.id === unit.id;
    const label = esc(unit.component?"Комплектный датчик СЗОП":deviceInfo[unit.kind][0] + (unit.index ? " " + (unit.index+1) : ""));
    const muted = !unit.partner && !unit.component && context.allowed && !context.allowed.has(unit.id);
    return btn(productImage(unit)+'<span class="pin-caption">'+label+'</span>',"device",
      { unit:unit.id }, "scene-pin"+(live?" chosen":"")+(pulse?" pulse":"")+(muted?" neutral":"")+(unit.partner?" partner-pin":""),
      'aria-label="'+label+'" aria-pressed="'+live+'" style="--x:'+x+'%;--y:'+y+'%"');
  };
  const focus = chosen && currentValue(scope, chosen);
  const thermostat = units.find(d=>d.kind==="heat");
  const temperature = vals("climate").find(v=>v<36);
  const text = controls.$doorRead ? "Входная дверь "+(vals("door").includes(true)?"открыта":"закрыта")
    : water ? (valveClosed?"Краны закрыты":controls.$valveMoving?"Краны закрываются":"Обнаружена вода")
    : controls.$fan ? "Вытяжка работает · "+(vals("climate")[0] ?? 75)+"% влажности"
    : play && controls.$target ? (temperature && thermostat ? temperature+" °C · клапан "+currentValue(scope,thermostat)+"%" : "Цель "+controls.$target+" °C")
    : play?.affected.some(id=>units.some(d=>d.id===id && d.partner)) ? play.message
    : (play?.phase==="action" && play.affected.length ? play.message : controls.$note) || (chosen ? (chosen.component?"Датчик СЗОП":deviceInfo[chosen.kind][0])+" · "+stateLabel(chosen.kind,focus) : "");
  const ratio = roomType(context.type)==="kitchen"?"640/572":["living","utility"].includes(roomType(context.type))?"4/3":"589/440";
  return '<div class="scene-image '+classList+'" data-phase="'+phase+'" data-scope="'+esc(scope)+'" style="--scene-ratio:'+ratio+';--strength:'+(glow/100)+';--light:'+effectColors[color]+';--window:'+(controls.$window ?? 0)+';--leak-x:'+leak[0]+'%;--leak-y:'+leak[1]+'%;--heat-x:'+heating[0]+'%;--heat-y:'+heating[1]+'%">'+
    image(context.type)+'<div class="effect lighting"></div><div class="effect strip"></div><div class="effect puddle"></div><div class="effect heat"></div>'+
    '<div class="effect floor"></div><div class="effect curtains"></div><div class="effect vacuum"></div><div class="effect steam"></div><div class="effect humid"></div>'+
    '<div class="effect window-light"></div><div class="effect secondary-light"></div><div class="effect fan"></div><div class="effect media-screen"></div>'+
    '<div class="effect door"></div><div class="effect motion"></div><div class="effect audio"><i></i><i></i><i></i></div><div class="effect appliance"></div>'+
    '<div class="scene-pins">'+units.map(marker).join("")+'</div>'+
    (text?'<span class="image-caption"><span class="signal-dot"></span> '+esc(text)+'</span>':"")+'</div>';
}
function inventory(context, roomLink = false) {
  const { units, scope, allowed } = context;
  const prods = units.filter(d=>!d.partner && !d.component);
  const partners = units.filter(d=>d.partner);
  const layout = unit => {
    const label = deviceInfo[unit.kind][0] + (unit.index ? " " + (unit.index+1) : "");
    const tone = allowed && !allowed.has(unit.id) ? " neutral" : "";
    return btn(productImage(unit)+'<span><b>'+esc(label)+'</b><small>'+esc(tone?"Не входит в выбранный набор":stateLabel(unit.kind,currentValue(scope,unit)))+(devicePosition(context.type,unit)?"":" · Вне кадра")+'</small></span>',
      "device",{ unit:unit.id },"device-row"+tone);
  };
  return '<details class="disclosure" '+(roomLink?'open':'')+'><summary>Устройства в интерьере <span>'+prods.length+'</span></summary>'+
    '<div class="device-grid">'+prods.map(layout).join("")+'</div></details>'+
    (partners.length?'<details class="disclosure"><summary>Совместимые устройства <span>'+partners.length+'</span></summary><p class="muted">'+partnerLabel+'</p><div class="device-grid">'+partners.map(layout).join("")+'</div></details>':"");
}
const actionLabels = {
  relay:["Включить свет","Выключить свет"], switch:["Включить свет","Выключить свет"],
  socket:["Подать питание","Отключить питание"], speaker:["Включить звук","Пауза"], media:["Включить","Выключить"],
  motion:["Имитировать движение","Сбросить событие"], door:["Открыть дверь","Закрыть дверь"],
  button:["Нажать кнопку","Сбросить сигнал"], water:["Имитировать протечку","Высушить датчик"],
  valve:["Имитировать перекрытие","Открыть краны"], robot:["Начать уборку","На базу"], hub:["Восстановить связь","Проверить связь"],
};
const sliders = {
  strip:[0,100,5,"Яркость ленты"], lamp:[0,100,5,"Яркость лампы"], night:[0,100,5,"Яркость ночника"],
  heat:[0,100,1,"Открытие клапана"], floor:[18,31,1,"Цель тёплого пола"], curtain:[0,100,10,"Открытие штор"],
  kettle:[22,99,1,"Температура воды"], humidifier:[30,65,1,"Влажность"],
};
function devicePanel(context, selected) {
  if (!selected) return "";
  const { kind, id } = selected;
  if (selected.component) {
    const story = context.scenes.find(s=>s.id==="W06"||s.id==="U01");
    return '<div class="device-control">'+btn('К сценариям',"device-close",{},"text-link")+
      '<h3>Комплектный датчик СЗОП</h3><p>Входит в систему защиты. Сигнал отправляется её контроллеру.</p>'+
      btn("Имитировать воду под датчиком","device-run",{ id:story.id,unit:id },"button primary")+'</div>';
  }
  const actual = currentValue(context.scope,selected);
  const meta = deviceInfo[kind];
  const slider = sliders[kind];
  const labels = actionLabels[kind] || ["Включить","Выключить"];
  let controls = slider
    ? '<label class="control-range"><span>'+slider[3]+'</span><input type="range" min="'+slider[0]+'" max="'+slider[1]+'" step="'+slider[2]+'" value="'+actual+'" data-control="'+esc(id)+'" aria-label="'+slider[3]+'"></label>'
    : btn(esc(labels[Number(Boolean(actual))]),"toggle-device",{ unit:id },"button soft");
  if (kind==="climate") {
    controls = btn("Изменить показания датчика","sample-climate",{ unit:id },"button soft");
  }
  if (kind==="extension") controls = '<p class="muted">Увеличивает длину ленты. Настройки доступны на основной ленте.</p>';
  if (matchesRole(selected,"switch2")) {
    const isFan=context.room==="bath" && context.settings.ventilation;
    const isOn=Boolean(state.controls[context.scope]?.[id+":secondary"]);
    controls += btn(isFan ? (isOn?"Выключить вытяжку":"Включить вытяжку") :
      (isOn?"Выключить второй контур":"Включить второй контур"),"secondary",{unit:id},"button soft", 'aria-pressed="'+isOn+'"');
  }
  if (kind==="heat") {
    const values = state.controls[context.scope];
    const target = values?.$target ?? values?.[id+":target"] ?? 22;
    controls = '<label class="control-range"><span>Целевая температура <b>'+target+' °C</b></span><input type="range" min="16" max="28" value="'+target+'" data-target="'+esc(id)+'" aria-label="Целевая температура"></label>'+controls;
  }
  if (["strip","lamp","night"].includes(kind)) {
    controls += '<div class="mini-colors" aria-label="Оттенок света">'+Object.entries({ amber:"Тёплый",mint:"Мятный",purple:"Сиреневый",snow:"Белый" })
      .map(([v,label]) => chip(label,(state.controls[context.scope]?.[id+":accent"] ?? "amber")===v,"accent",{ unit:id,value:v })).join("")+'</div>';
  }
  const connected = context.scenes.filter(s=>s.requires ? s.requires.some(role=>matchesRole(selected,role)) : s.required.includes(kind));
  const included = context.allowed && !context.allowed.has(id) ? '<p class="mini-note">Не входит в выбранный набор. Управление доступно для демонстрации.</p>' : "";
  return '<div class="device-control">'+btn('К сценариям',"device-close",{},"text-link")+
    '<div class="control-head">'+productImage(selected)+'<div><h3>'+meta[0]+'</h3><p>'+esc(stateLabel(kind,actual))+'</p></div></div>'+
    '<p class="muted">'+esc(selected.location||meta[2])+(selected.sku?' · '+esc(selected.sku):"")+'</p>'+
    (selected.partner?'<p class="mini-note">'+partnerLabel+'</p>':included)+controls+
    (connected.length && !included?'<h4>Запустить этим устройством</h4><div class="short-actions">'+connected.map(s=>btn(esc(s.name),"device-run",{ id:s.id,unit:id },"chip")).join("")+'</div>':"")+'</div>';
}
function phone(context, active) {
  if (!voiceOpen) return "";
  return '<section class="phone" aria-label="Демонстрация приложения Салют"><div class="phone-top"><div><i></i><b>Салют</b></div>'+
    btn("Закрыть","voice-toggle",{},"text-link")+'</div><small>Умный дом · '+esc(context.name)+'</small><h3>Управление комнатой</h3>'+
    (active && context.units.some(d=>d.kind==="speaker" && (!context.allowed||context.allowed.has(d.id)))
      ?btn("«Салют, "+esc(active.name.toLowerCase())+"»","voice",{ id:active.id },"button primary"):"")+
    '<p class="voice-feedback" aria-live="polite">'+(sceneRun?.voice && sceneRun?.scope===context.scope ? "Салют: включаю сценарий «"+esc(sceneRun.scene.name)+"»." : "Демонстрация голосовой команды")+'</p>'+
    '<div class="phone-stories">'+context.scenes.filter(s=>!s.partner && s!==active).slice(0,3).map(s=>btn(esc(s.name),"scene",{id:s.id},"chip")).join("")+'</div>'+
    (state.controls[context.scope]?.$note?'<p class="phone-alert" role="status">'+esc(state.controls[context.scope].$note)+'</p>':"")+
    '<div class="phone-devices">'+context.units.filter(d=>!d.component && (d.partner||!context.allowed||context.allowed.has(d.id))).map(d=>btn('<b>'+esc(deviceInfo[d.kind][0])+'</b><span>'+esc(stateLabel(d.kind,currentValue(context.scope,d)))+(d.partner?" · Партнёрское":"")+'</span>',
      "phone-device",{unit:d.id},"phone-device")).join("")+'</div></section>';
}
function scenePanel(context, active, chosen) {
  if (chosen) return devicePanel(context,chosen);
  if (!active) return '<p class="muted">Выберите устройство, чтобы управлять им вручную.</p>';
  const play = sceneRun?.scope === context.scope && sceneRun.scene.id===active.id ? sceneRun : null;
  const phase = play?.phase ?? "idle";
  const preview = active.requires ? scenarioFrames(active).frames[0]?.text : active.action;
  const steps = [["event","Событие",active.event],["action","Устройства",preview],["done","Результат",active.result]];
  const note = active.requires ? conditions(active,context.rows,context.settings.hub) : condition(active,context.rows);
  const sourceRows = active.requires ? buyRows(active,context.rows) : [];
  const selectedKey = context.room+":"+active.id;
  const member = state.selected[selectedKey];
  const segment = context.segment;
  const focus = context.units.find(d=>active.requires ? matchesRole(d,active.requires[0])&&(d.partner||!context.allowed||context.allowed.has(d.id)) : d.kind===active.required[0]);
  const url = segment ? context.source==="case" ? "" : path(context.source,route.id,{ ...route.p, interior:"", room:context.room, unit:focus?.id }) :
    path("tour","",{ room:context.room, level:context.level, scene:active.id, unit:focus?.id });
  return eyebrow(esc(storyCategory(active)))+'<h2>'+esc(active.name)+'</h2>'+
    '<ol class="phase-list" aria-live="polite">'+steps.map(([key,label,text],i)=>
      '<li class="'+(phase===key?"is-current":steps.findIndex(s=>s[0]===phase)>i?"is-done":"")+'"><span class="phase-dot"></span><div><small>'+label+'</small><b>'+esc(phase===key?play.message:text)+'</b></div></li>').join("")+'</ol>'+
    (active.partners?.length?'<div class="companion-note">'+active.partners.map(p=>'<div><small>'+partnerLabel+'</small><b>'+esc(deviceInfo[p.type][0])+'</b><p>'+esc(p.text)+'</p></div>').join("")+'</div>':"")+
    (note?'<p class="mini-note">'+esc(note)+'</p>':"")+
    '<div class="action-row">'+btn(phase==="idle"?"Запустить":phase==="done"?"Повторить":"Запустить заново","run",{ id:active.id },"button primary")+
      (context.units.some(d=>d.kind==="speaker")?btn("Салют","voice-toggle",{},"button"):"")+'</div>'+
    (url?link("Открыть на плане",url,"text-link"):"")+
    (context.selectable && sourceRows.length?'<div class="add-scene"><div><b>'+rub(total(sourceRows))+'</b><small>Устройства для сценария</small></div>'+
      btn(member?"Убрать сценарий":"Добавить сценарий","add-scene",{ id:active.id },"button soft")+'</div>':"");
}
function sceneWorkspace(context) {
  const active = chooseScene(context);
  const chosen = context.units.find(d=>d.id===route.p.unit);
  const contexts = context.selectable ? (context.level ? levels[context.level] : "Свободная демонстрация · Максимум") : "Демонстрация оборудования";
  const featured = [...context.scenes.filter(s=>s.featured),...context.scenes.filter(s=>!s.featured)].slice(0,2);
  const more = context.scenes.filter(s=>!featured.includes(s));
  const choice = s=>btn('<span>'+esc(s.name)+'</span><small>'+esc(storyCategory(s))+(s.partners?.length?" · с партнёрским эффектом":"")+'</small>',
    "scene",{ id:s.id },"story-choice"+(active?.id===s.id&&!chosen?" on":""),'aria-pressed="'+(active?.id===s.id&&!chosen)+'"');
  const settings = [
    ["ventilation","Подключена совместимая вытяжка",context.scenes.some(s=>["W02","W04"].includes(s.id)) && context.rows.some(d=>matchesRole(d,"switch2"))],
    ["safeLoads","Назначить допустимую нагрузку розетке",context.rows.some(d=>matchesRole(d,"socket")) && context.scenes.some(s=>["K03","B01","BB01","N01"].includes(s.id))],
    ["hub","Уже есть совместимый хаб Zigbee",context.selectable && context.scenes.some(s=>s.requires && conditions(s,context.rows).includes("Zigbee"))],
  ].filter(([, , show])=>show);
  return '<div class="scene-layout"><section class="scene-main"><div class="scene-head"><div>'+eyebrow(esc(contexts))+
    '<h1>'+esc(context.name)+'</h1></div><div class="action-row">'+btn("Приложение «Салют»","voice-toggle",{},"button")+
    (!context.segment ? toggler(state.color) : "")+'</div></div>'+
    stage(context,chosen)+'<div class="scene-below">'+inventory(context)+'</div></section>'+
    '<aside class="scene-sidebar">'+(voiceOpen?phone(context,active)+(chosen?devicePanel(context,chosen):
      (sceneRun?.scope===context.scope && sceneRun.phase==="done"?'<p class="mini-note">'+esc(sceneRun.scene.result)+'</p>':"")):scenePanel(context,active,chosen))+
    (featured.length?'<div class="story-choices featured-stories" aria-label="Главные сценарии">'+featured.map(choice).join("")+'</div>':"")+
    (more.length?'<details class="disclosure"><summary>Ещё сценарии <span>'+more.length+'</span></summary><div class="story-choices">'+more.map(choice).join("")+'</div></details>':"")+
    (settings.length?'<details class="disclosure"><summary>Условия демонстрации</summary><div class="pills">'+
      settings.map(([id,label])=>chip(label,Boolean(context.settings[id]),"scenario-setting",{id})).join("")+'</div></details>':"")+
    (context.selectable?'<section class="room-kit">'+disclosures(context.rows)+
      '<div class="add-scene"><div>'+price(total(context.rows))+'<small>'+esc(levels[context.level || "max"])+'</small></div>'+
      btn(state.kits[context.room]===(context.level||"max")?"В комплекте ✓":"Добавить набор","add-kit",{ room:context.room,level:context.level||"max" },"button soft")+'</div>'+
      link("Другие комплектации",path("pick","",{ room:context.room, task:active?.category }),"text-link")+
      (context.level?link("Посмотреть все возможности",path("room",context.room),"text-link"):"")+'</section>':"")+'</aside></div>';
}
function customerRoom() {
  const id = roomKits[route.id]?route.id:"living";
  const level = levels[route.p.level]?route.p.level:"";
  const context = roomContext(id,level,kitRows(id,level||"max",state.color));
  activeContext = context;
  return '<div class="wrap page">'+back(level?path("pick","",{room:id}):path("home"))+
    '<div class="row heading-row room-rail-head">'+roomRail()+link("Вся квартира в 3D",path("tour","",{room:id,level,scene:route.p.scene,unit:route.p.unit}),"button")+'</div>'+
    sceneWorkspace(context)+'</div>';
}

function stories() {
  const filter = storyTasks[route.p.task] ? route.p.task : "";
  const room = roomKits[route.p.room] ? route.p.room : "";
  const entries = keys.filter(id=>!room||id===room).flatMap(id => roomContext(id,"",kitRows(id,"max",state.color)).scenes.map(s=>({ ...s, room:id })));
  const cards = entries.filter(s=>!filter||(filter==="curtains"?s.partners.some(p=>p.type==="curtain"):s.category===filter)).map(s => {
    const id = s.id;
    const homeRoom = s.room;
    return '<article class="scenario-card">'+image(homeRoom)+'<div>'+eyebrow(esc(storyCategory(s)))+
      '<h3>'+esc(s.name)+'</h3><p>'+esc(s.result)+'</p>'+link("Смотреть сценарий",path("room",homeRoom,{scene:id}),"button")+'</div></article>';
  }).join("");
  return '<div class="wrap page">'+back(path("home"))+title("Сценарии умного дома","Выберите ситуацию и попробуйте её в интерьере.")+
    '<div class="filters"><div class="pills">'+[["","Все задачи"],...Object.entries(storyTasks)].map(([id,label])=>link(label,path("stories","",{room,task:id}),"chip"+(id===filter?" on":""))).join("")+
    '</div>'+select([["","Все комнаты"],...keys.map(id=>[id,roomName(id)])],room,{ change:"story-room" },"Комната")+
    link("Вся квартира в 3D",path("tour","",{room}),"button")+'</div><div class="grid three">'+(cards||'<p class="muted">Для этой пары фильтров сценариев нет. Выберите другую комнату или задачу.</p>')+'</div></div>';
}

function picker() {
  const p = state.picker;
  const rec = recommendedKits(p.rooms,p.tasks,p.budget,state.color);
  let rows = "";
  for (const room of keys.filter(id=>p.rooms.includes(id))) {
    rows += '<section class="kit-room" id="kit-'+room+'"><div class="kit-room-intro">'+image(room)+'<div><h2>'+esc(roomName(room))+'</h2><p>'+esc(rooms[room].pitch)+'</p></div></div>'+
      '<div class="grid three">'+Object.entries(levels).map(([level,label]) => {
        const items=kitRows(room,level,state.color);
        const scenarios=resolveScenes(room,items,{level});
        const recommended=rec.chosen[room]===level;
        return '<article class="kit-card '+(recommended?"recommended":"")+'"><div class="row"><h3>'+label+'</h3>'+
          (recommended?'<small class="badge">По задачам</small>':"")+'</div>'+price(total(items))+
          '<p>'+scenarios.slice(0,2).map(s=>esc(s.name)).join(" · ")+'<small class="body-small">Сценариев: '+scenarios.length+'</small></p>'+
          disclosures(items,"Состав",{ detail:false })+'<div class="action-row">'+link("Попробовать",path("room",room,{level}),"button")+
          btn(state.kits[room]===level?"В комплекте ✓":"Добавить в комплект","add-kit",{room,level},"button soft")+'</div></article>';
      }).join("")+'</div></section>';
  }
  const budgetActions = [15000,25000,40000,70000,100000,150000].map(value=>chip(rub(value),p.budget===value,"budget",{value})).join("");
  return '<div class="wrap page">'+back(path("home"))+title("Соберите свой комплект","Выберите комнаты, задачи и комфортный бюджет.")+
    '<div class="picker-filters"><section class="surface filter-card"><h3>Какие задачи важны</h3><div class="pills">'+Object.entries(tasks).map(([id,label])=>chip(label,p.tasks.includes(id),"pick-task",{id})).join("")+'</div>'+
    (p.tasks.includes("curtains")?'<p class="muted">'+link("Попробовать управление шторами",path("stories","",{task:"curtains"}),"text-link")+' · совместимое устройство</p>':"")+
    '<h3>Где установить</h3><div class="pills">'+keys.map(id=>chip(esc(roomName(id)),p.rooms.includes(id),"pick-room",{id})).join("")+'</div></section>'+
    '<section class="surface filter-card"><div class="row"><h3>Бюджет</h3>'+price(p.budget)+'</div><input type="range" min="5000" max="150000" step="1000" value="'+p.budget+'" data-change="budget" aria-label="Бюджет">'+
    '<div class="pills">'+budgetActions+'</div><div class="color-line"><b>Цвет ЭУИ</b>'+toggler(state.color)+'</div></section></div>'+
    '<div class="recommend-row"><div><b>'+(rec.sum?"Предложение по выбранным комнатам":"Выберите хотя бы одну комнату и задачу")+'</b>'+
    (rec.sum?'<span>'+rub(rec.sum)+(rec.surcharge?' · доплата '+rub(rec.surcharge):' · в пределах бюджета')+'</span>':"")+'</div>'+
    link("Вся квартира в 3D",path("tour"),"button")+'</div>'+
    rows+'</div>';
}

function cart(checkout = false) {
  const rows = readyCart();
  if (checkout && route.p.done === "1") {
    return '<section class="wrap page">'+back(path("cart"))+'<article class="success surface"><span class="success-icon">✓</span>'+
      title("Комплект собран","Демонстрационное оформление завершено.")+link("Вернуться к комплекту",path("cart"),"button primary")+'</article></section>';
  }
  if (!rows.length) return '<div class="wrap page">'+back(path("home"))+title("Мой комплект","Выберите набор в комнате или добавьте устройства для сценария.")+
    '<div class="surface empty">'+link("Подобрать комплект",path("pick"),"button primary")+'</div></div>';
  return '<div class="wrap page">'+back(checkout?path("cart"):path("pick"))+
    title(checkout?"Демо-оформление":"Мой комплект",checkout?"Проверьте состав перед демонстрационным подтверждением.":"Устройства сгруппированы по комнатам и источникам выбора.")+
    '<div class="summary-layout"><div class="surface cart-content">'+
      Object.entries(groupRows(rows)).map(([room,items])=>{
        const sources = Object.entries(state.selected).filter(([,s])=>s.room===room);
        return '<section><div class="row"><h2>'+esc(roomName(room))+'</h2>'+price(total(items))+'</div>'+
          (checkout?"":'<div class="pills">'+(state.kits[room]?btn(levels[state.kits[room]]+" ×","remove-kit",{room},"chip",'aria-label="Убрать набор '+esc(roomName(room))+'"'):"")+
            sources.map(([id,s])=>btn(esc(s.name)+" ×","remove-scene",{id},"chip",'aria-label="Убрать сценарий '+esc(s.name)+'"')).join("")+'</div>')+
          disclosures(items,"Устройства")+'</section>';
      }).join("")+'</div>'+
    '<aside class="surface order-panel"><h2>Итого</h2><p>'+count(rows)+' шт. · РРЦ с НДС</p>'+price(total(rows))+
    (checkout?'<p class="mini-note">Демонстрационный заказ</p>'+btn("Подтвердить демо-заказ","order",{},"button primary"):
      toggler(state.color)+link("В демо-корзину",path("checkout"),"button primary")+'</aside></div></div>')+
    (checkout?'</aside></div></div>':"");
}

function palettePins(planId, names, mapRows, chosen, active, opts = {}) {
  const art = renderPlan(planId,chosen,opts.flat,opts.highlights);
  const play = mapRun?.scope===activeMap?.scope ? mapRun : null;
  const roomLinks = Object.keys(geometry[planId]).map(room => {
    const [x,y] = art.point(room,.52,.56,opts.flat?0:.18);
    const stack = mapRows.filter(d=>d.room===room);
    const enabled = stack.filter(d=>!active || active.has(d.id));
    const availableGroups = [...new Set(stack.map(pinGroup))];
    const linkTo = opts.href(room);
    const pulse=play?.units.some(unit=>unit.room===room) || play?.from?.room===room;
    return '<div class="map-pin-group '+(chosen===room?"chosen":"")+(!opts.flat&&!enabled.length?" neutral":"")+(pulse?" signal-room":"")+'" data-room="'+room+'" style="--x:'+x+'%;--y:'+y+'%">'+
      link(esc(roomName(room,names)),linkTo,"map-room")+
      (opts.flat?"":'<div class="map-parts">'+availableGroups.map(group=>{
        const devices = stack.filter(d=>pinGroup(d)===group);
        const on = devices.filter(d=>!active || active.has(d.id));
        const chosenPin = devices.find(d=>d.id===route.p.unit);
        const device=chosenPin || on[0] || devices[0];
        const name={light:"Свет",climate:"Климат",safety:"Безопасность",controls:"Управление"}[group];
        const unitValue = currentValue(scopeFor(opts.segment,opts.plan,room),device);
        const status = on.length ? stateLabel(device.kind,unitValue) : "Не входит в выбранный набор";
        return '<a href="'+esc((opts.deviceHref ?? opts.href)(room,device.id))+'" class="map-part '+group+(on.length?"":" neutral")+
          (chosenPin?" pin-active":"")+'" title="'+esc(name+" · "+status)+'" aria-label="'+esc(roomName(room,names)+" · "+name+" · "+status)+'">'+
          ({light:"✺",climate:"◒",safety:"◈",controls:"◉"}[group])+devices.length+'</a>';
      }).join("")+'</div>')+'</div>';
  }).join("");
  const coords = mapRows.filter(d=>(d.xy || route.p.unit===d.id) && d.room===chosen).map(d=>{
    const [fx,fy] = d.xy ?? planMarkerPosition(d);
    const [x,y] = art.point(d.room,fx,fy,.05);
    return '<a class="map-device-pin" href="'+esc((opts.deviceHref ?? opts.href)(d.room,d.id))+'" title="'+esc(deviceInfo[d.kind][0])+'" style="--x:'+x+'%;--y:'+y+'%">'+productImage(d)+'</a>';
  }).join("");
  const anchor = d=>art.point(d.room,...(d.xy ?? planMarkerPosition(d)),.15);
  const lines=play?.from ? play.units.filter(unit=>unit.room!==play.from.room).map(unit=>{
    const [x1,y1]=anchor(play.from), [x2,y2]=anchor(unit);
    return '<path d="M'+x1+' '+y1+' Q'+((Number(x1)+Number(x2))/2)+' '+(Math.min(y1,y2)-13)+' '+x2+' '+y2+'"/>';
  }).join(""):"";
  const effects=play?.units.map(d=>{
    const [x,y]=anchor(d);
    return '<span class="map-effect" style="--x:'+x+'%;--y:'+y+'%">'+productImage(d)+'</span>';
  }).join("") ?? "";
  return '<div class="map-visual '+(opts.flat?"flat":"")+'" style="--plan-ratio:'+art.width+'/'+art.height+'">'+art.markup+
    (lines?'<svg class="map-signals" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+lines+'</svg>':"")+roomLinks+coords+effects+'</div>';
}
function planMarkerPosition(d) {
  const type=d.kind;
  const base={
    switch:[.18,.78], relay:[.22,.78], door:[.28,.86], motion:[.79,.17], water:[.62,.73], valve:[.8,.61],
    heat:[.38,.19], floor:[.11,.55], climate:[.68,.24], socket:[.81,.42], strip:[.55,.1], lamp:[.54,.45],
  }[type] || [.38,.58];
  return {
    "У входа":[.16,.78],"На полу в мокрой зоне":[.51,.78],"На внутренней стене":[.7,.15],"У радиатора":[.35,.12],"Вне кадра":[.81,.65],
  }[d.location] || [Math.min(.9,base[0]+d.index*.08),base[1]];
}
let activeMap;
const mapScope = (segment,plan) => segment ? segment+":"+plan : "b2c:apartment";
function setMapContext(plan, rows, opts = {}) {
  const { segment="",scopePlan=plan,names={} }=opts;
  const scope=mapScope(segment,scopePlan);
  activeMap = { plan,scopePlan,rows,segment,names,scope,settings:state.simulation[scope] ?? {},ideas:apartmentIdeas(rows) };
}
function mapStoryPanel(context, href) {
  if (!context?.ideas.length) return "";
  const play=mapRun?.scope===context.scope ? mapRun : null;
  const canLink=context.settings.hub || context.rows.some(d=>matchesRole(d,"hub"));
  const widgets = [
    ["safeLoads","У розеток назначены допустимые нагрузки",context.ideas.some(s=>s.id==="A01") && context.rows.some(d=>matchesRole(d,"socket"))],
    ["hub","Есть совместимый хаб Zigbee",context.ideas.some(s=>s.id==="A03") && !context.rows.some(d=>matchesRole(d,"hub"))],
    ["linked","Связка с СЗОП настроена, есть интернет",context.ideas.some(s=>s.id==="A03") && canLink],
  ].filter(([, , visible])=>visible);
  const valve=play?.id==="A03" && context.rows.find(d=>matchesRole(d,"szop"));
  const related=valve && play.phase==="done" && !(context.settings.linked&&canLink);
  return '<section class="map-stories"><div class="map-stories-heading"><h3>Сценарии всей квартиры</h3><span class="signal-dot"></span></div>'+
    '<div class="story-choices">'+context.ideas.map(s=>btn('<span>'+esc(s.name)+'</span><small>'+esc(s.event)+'</small>',
      "map-run",{id:s.id},"story-choice"+(s.id===play?.id?" on":""))).join("")+'</div>'+
    (play?'<div class="map-status" role="status"><small>'+({event:"Событие",action:"Устройства",done:"Результат"}[play.phase])+'</small><b>'+esc(play.text)+'</b>'+
      (play.room?'<small>'+esc(roomName(play.room,context.names))+'</small>':"")+
      (related?link("Проверить защиту в помещении",href(valve.room),"text-link"):"")+'</div>':"")+
    (widgets.length?'<details class="disclosure"><summary>Условия демонстрации</summary><div class="pills">'+widgets.map(([id,label])=>chip(label,Boolean(context.settings[id]),"map-setting",{id})).join("")+'</div></details>':"")+
    '</section>';
}
function runApartment(context, idea) {
  stop();
  const steps = apartmentFrames(idea,context.rows,context.settings);
  if (idea.id==="A03") {
    for (const row of context.rows.filter(d=>matchesRole(d,"szop"))) {
      const scope=scopeFor(context.segment,context.scopePlan,row.room);
      for (const unit of instances([row])) put(scope,unit,false);
      controlValues(scope).$valveMoving=false;
      controlValues(scope).$water=false;
    }
  }
  track("apartment_start",{id:idea.id,plan:context.plan,segment:context.segment});
  timeline.start(steps, step=>{
    for (const [unit,value,accent] of step.changes) {
      const scope=scopeFor(context.segment,context.scopePlan,unit.room);
      put(scope,unit,value);
      if (unit.kind==="switch" && value===false) controlValues(scope)[unit.id+":secondary"]=false;
      if (accent) controlValues(scope)[unit.id+":accent"]=accent;
    }
    if (step.room) {
      const controls=controlValues(scopeFor(context.segment,context.scopePlan,step.room));
      controls.$note=step.note;
      if (step.moving!=null) controls.$valveMoving=step.moving;
    }
    mapRun={ ...step,id:idea.id,scope:context.scope,units:step.changes.map(([unit])=>unit) };
    if (step.phase==="done") {
      track("apartment_complete",{id:idea.id,plan:context.plan,segment:context.segment});
      save();
    }
    render();
  });
}
function tour() {
  const room = keys.includes(route.p.room) ? route.p.room : "living";
  const level = levels[route.p.level] ? route.p.level : "";
  const anchor = keys.includes(route.p.anchor) ? route.p.anchor : room;
  const picked = id => id===anchor&&level ? level : level ? state.kits[id] : "max";
  const demoRows = keys.flatMap(id=>kitRows(id,"max",state.color));
  const pickedRows = keys.flatMap(id=>picked(id)?kitRows(id,picked(id),state.color):[]);
  const selectedScenarios=level ? cartRows({},state.selected,state.color).filter(row=>row.room!==anchor) : [];
  const activeRows=[...new Map([...selectedScenarios,...pickedRows].map(r=>[r.id,r])).values()];
  const available = instances(demoRows);
  const active = level ? new Set(instances(activeRows).map(d=>d.id)) : null;
  const detail = kitRows(room,picked(room) || "max",state.color);
  setMapContext("demo",activeRows);
  const href = (id, unit) => path("tour","",{ room:id,anchor,level,unit,scene:route.p.scene });
  const deviceHref = (id,unit) => path("room",id,{ level:level?picked(id):"",unit,scene:id===room?route.p.scene:"" });
  const target = unit => deviceHref(room,unit);
  return '<div class="wrap page">'+back(path("room",room,{level}))+
    '<div class="row heading-row">'+title("Вся квартира в 3D",level?"Подсвечены устройства выбранного набора.":"Выберите комнату или тип устройства для просмотра.")+toggler(state.color)+'</div>'+
    '<div class="scene-layout"><div class="surface map-panel">'+palettePins("demo",{},available,room,active,{href,deviceHref})+'</div>'+
    '<aside class="scene-sidebar">'+eyebrow(level?levels[level]:"Свободная демонстрация")+'<h2>'+esc(roomName(room))+'</h2>'+
    '<p class="muted">'+esc(rooms[room].pitch)+'</p>'+price(total(detail))+
    link("Открыть интерьер",target(route.p.unit),"button primary")+mapStoryPanel(activeMap,deviceHref)+
    '<div class="map-room-devices">'+instances(detail).map(d=>link(productImage(d)+'<span><b>'+deviceInfo[d.kind][0]+
      (d.index?' '+(d.index+1):"")+'</b><small>'+esc(stateLabel(d.kind,currentValue(scopeFor("","",room),d)))+'</small></span>',target(d.id),
      "device-row"+(route.p.unit===d.id?" on":""))).join("")+'</div></aside></div></div>';
}

const caseDescription = {
  entry:"Свет у входа и уведомления об открытии двери.",
  nursery:"Ночник и комфортная температура в детской.",
  bedroom:"Мягкий свет перед сном и управление климатом.",
  climate:"Радиаторы и тёплый пол под управлением.",
  light:"Выключатели и реле под количество световых групп.",
  safety:"События дома и опциональное перекрытие воды.",
  S:"Оснащение студии или однокомнатной квартиры.",
  M:"Оснащение просторной однокомнатной или двухкомнатной квартиры.",
  L:"Оснащение квартиры от двух комнат.",
  module_safety:"Автоматическое перекрытие воды на вводе.",
  module_climate:"Отдельное управление радиатором и тёплым полом.",
  module_light:"Атмосферная подсветка и лампа Matter.",
  module_media:"Колонка и медиаприставка для гостиной.",
};
const sector = () => sectors[route.p.segment] ? route.p.segment : "repair";
const casesFor = segment => cases.filter(c => c.audience==="both" || segment==="developer");
const featureText = {
  studio:"Вход, кухня-гостиная и защита мокрых зон.",
  one:"Отдельный свет на кухне и в комнате, контроль климата.",
  two:"Сценарии для кухни, гостиной, спальни и ванной.",
  three:"Свет, тепло и защита для квартиры с двумя спальнями.",
};
let activeContext;
let exportData;
function businessEntry() {
  const content = {
    repair:["Согласуйте оснащение с заказчиком","Выберите типовую квартиру или начните с проекта. Уточните оборудование и скачайте состав для сметы.","kitchen"],
    developer:["Покажите будущему жителю, как работает квартира","Сравните готовые комплектации и скачайте спецификацию для одного объекта.","living"],
  };
  return '<div class="wrap page">'+back(path("home"))+title("Умный дом для бизнеса","Покажите сценарии в интерьере и соберите спецификацию на одну квартиру.")+
    '<div class="grid two">'+Object.entries(sectors).map(([id,label])=>{
      const [header,desc,pic]=content[id];
      return '<article class="sector-card">'+image(pic)+'<div>'+eyebrow(label)+'<h2>'+header+'</h2><p>'+desc+'</p>'+
        link("Перейти к планировкам",path("sector",id),"button primary")+'</div></article>';
    }).join("")+'</div></div>';
}
function libraryCard(item, segment, color) {
  const rows=caseRows(item.id,color);
  return '<article class="scenario-card case-card">'+image(caseRoom(item.id))+'<div><h3>'+esc(item.name)+'</h3><p>'+esc(caseDescription[item.id])+'</p>'+
    '<div class="row">'+(item.variableProducts?'<b>Под расчёт</b>':price(total(rows)))+
    link("Попробовать",path("case",item.id,{segment}),"button")+'</div></div></article>';
}
function sectorScreen() {
  const segment = sectors[route.id]?route.id:"repair";
  const color = state.b2b[segment].color;
  const roomsCases=casesFor(segment).filter(c=>c.audience==="both");
  const otherCases=casesFor(segment).filter(c=>c.audience==="developer");
  return '<div class="wrap page">'+back(path("business"))+title("Типовые квартиры","Откройте планировку с полным оснащением. Внутри можно сравнить пять комплектаций.",sectors[segment])+
    '<div class="grid four plans-grid">'+Object.entries(planLabels).map(([id,[name,area]]) =>
      '<article class="plan-card"><div class="plan-thumb">'+renderPlan(id).markup+'</div><div class="plan-card-body"><small>'+area+'</small><h2>'+name+'</h2><p>'+esc(featureText[id])+'</p>'+
      price(total(planRows(id,"max",color)))+'<small>Максимальная комплектация</small>'+
      link("Открыть квартиру",path("layout",id,{segment}),"button primary")+'</div></article>').join("")+'</div>'+
    (segment==="repair"?'<section class="project-strip"><div><h2>Подобрать под проект</h2><p>Уточните задачи, зоны воды и оборудование по комнатам.</p>'+link("Перейти к подбору",path("project","two",{segment}),"button")+'</div>'+
      '<div><h2>Загрузить свою планировку с ИИ</h2><p>Демонстрация на подготовленном примере 2-комнатной квартиры.</p>'+
      link("Попробовать на примере",path("recognize","two",{segment}),"button primary")+'</div></section>':"")+
    '<section class="pad-top"><h2>Готовые решения для комнат</h2><div class="grid three">'+roomsCases.map(c=>libraryCard(c,segment,color)).join("")+'</div></section>'+
    (otherCases.length?'<section class="pad-top"><h2>Решения для всей квартиры</h2><div class="grid three">'+otherCases.filter(c=>!c.id.startsWith("module_")).map(c=>libraryCard(c,segment,color)).join("")+
      '</div><h2 class="pad-top">Дополнительные модули</h2><div class="grid four">'+otherCases.filter(c=>c.id.startsWith("module_")).map(c=>libraryCard(c,segment,color)).join("")+'</div></section>':"")+'</div>';
}
function exportButton(label, rows, info) {
  exportData = { rows, info };
  return btn(label,"export",{},"button primary",rows.length?"":"disabled");
}
function variantTabs(variant, url, rowsFor) {
  return '<div class="variant-tabs">'+Object.entries(functions).map(([id,label]) =>
    link('<b>'+esc(label)+'</b><span>'+rub(total(rowsFor(id)))+'</span>',url(id),"variant-tab"+(variant===id?" on":""))).join("")+'</div>';
}
function layoutScreen() {
  const segment = sector(), business = state.b2b[segment];
  const id = layouts[route.id]?route.id:"two";
  const variant = functions[route.p.variant]?route.p.variant:business.variants[id] || "max";
  const names = layouts[id].groups;
  const selectedRoom = names[route.p.room]?route.p.room:Object.keys(names)[0];
  const color=business.color;
  const adjustments=segment==="repair" ? business.quantities[id+":"+variant] ?? {} : {};
  const rows=planRows(id,variant,color,adjustments);
  const full=planRows(id,"max",color);
  const allowed=new Set(instances(rows).map(d=>d.id));
  const expanded = full.map(row => ({...row,qty:Math.max(row.qty,rows.find(x=>x.id===row.id)?.qty || 0)}));
  const units=instances(expanded);
  const href=(room,unit) => path("layout",id,{ segment, variant, room, unit });
  const deviceHref=(room,unit) => path("layout",id,{ segment, variant, room, unit, interior:"1" });
  const roomRows=expanded.filter(r=>r.room===selectedRoom);
  const context=roomContext(selectedRoom,null,rows.filter(row=>row.room===selectedRoom),{
    segment,plan:id,names,variant,selectable:false,allowed,source:"layout",demoRows:roomRows,
  });
  if (route.p.interior==="1") activeContext=context;
  else setMapContext(id,rows,{ segment,names });
  const label=planLabels[id].join(" · ");
  const variantUrl = v => path("layout",id,{segment,variant:v,room:selectedRoom});
  return '<div class="wrap page">'+back(path("sector",segment))+
    '<div class="row heading-row">'+title(esc(label),featureText[id],sectors[segment])+toggler(color,segment)+'</div>'+
    variantTabs(variant,variantUrl,v=>planRows(id,v,color,segment==="repair"?business.quantities[id+":"+v]:undefined))+
    (route.p.interior==="1" ? '<div class="above">'+link("На плане квартиры",href(selectedRoom,route.p.unit),"button")+'</div>'+sceneWorkspace(context) :
    '<div class="scene-layout"><div class="surface map-panel">'+palettePins(id,names,units,selectedRoom,allowed,{ href,deviceHref,segment,plan:id })+
    '<p class="map-key"><span class="signal-dot"></span> Входит в комплектацию <span class="muted">· Остальные устройства видны в полном туре</span></p></div>'+
    '<aside class="scene-sidebar">'+eyebrow("На одну квартиру")+'<h2>'+esc(functions[variant])+'</h2>'+price(total(rows))+
      '<p class="muted">'+count(rows)+' устройств · РРЦ с НДС</p>'+
      exportButton(segment==="repair"?"Скачать состав для сметы":"Скачать спецификацию",rows,{ title:label, selection:functions[variant], names })+
      mapStoryPanel(activeMap,room=>path("layout",id,{segment,variant,room,interior:"1"}))+
      '<hr><h3>'+esc(names[selectedRoom])+'</h3>'+
      link("Управлять в интерьере",path("layout",id,{segment,variant,room:selectedRoom,interior:"1",unit:route.p.unit}),"button")+
      '<div class="map-room-devices">'+instances(roomRows).map(d=>link(productImage(d)+'<span><b>'+deviceInfo[d.kind][0]+(d.index?" "+(d.index+1):"")+'</b><small>'+
        (allowed.has(d.id)?esc(stateLabel(d.kind,currentValue(context.scope,d))):"Не входит в выбранный набор")+'</small></span>',
        deviceHref(selectedRoom,d.id),"device-row"+(allowed.has(d.id)?"":" neutral")+(route.p.unit===d.id?" on":""))).join("")+'</div></aside></div>')+
    '<section class="pad-top"><div class="row heading-row"><h2>Состав по помещениям</h2>'+
    (segment==="repair"?link("Подобрать под проект",path("project",id,{segment,variant}),"button"):"")+'</div>'+
    (rows.length?groups(rows,names,room=>segment==="repair"?
      '<div class="inline-qty">'+rows.filter(r=>r.room===room).map(r=>'<label><span>'+esc(deviceInfo[r.kind][0])+'</span><input type="number" inputmode="numeric" min="0" max="30" data-change="layout-qty"'+attrs({ id:r.id,plan:id+":"+variant })+' value="'+r.qty+'"></label>').join("")+'</div>':""):'<p class="muted">В комплектации пока нет устройств.</p>')+'</section></div>';
}
function developerCaseRows(item, business) {
  const base=caseRows(item.id,business.color,business.options[item.id]);
  if (!["S","M","L"].includes(item.id)) return base;
  const enabled = business.modules.filter(id=>id.startsWith("module_"));
  const result = new Map(base.map(row=>[row.base,row]));
  for (const row of enabled.flatMap(id=>caseRows(id,business.color))) {
    const existing = result.get(row.base);
    if (!existing) result.set(row.base,row);
    else result.set(row.base,{...existing,qty:Math.max(row.qty,existing.qty)});
  }
  return [...result.values()];
}
function caseScreen() {
  const segment=sector(), business=state.b2b[segment];
  const item=casesFor(segment).find(c=>c.id===route.id);
  if (!item) return sectorScreen();
  const options=business.options[item.id] ?? {};
  const rows=developerCaseRows(item,business);
  const room=caseRoom(item.id);
  const hasProtection=item.id==="safety" && rows.some(d=>matchesRole(d,"szop"));
  const cabinet=hasProtection && route.p.zone==="utility";
  const demoRoom=cabinet?"utility":room;
  const demoRows=hasProtection ? rows.filter(d=>matchesRole(d,"szop")===cabinet) : rows;
  const project = segment==="repair" && rows.length
    ? link("Подобрать под проект",path("project",room==="nursery"?"three":"two",{segment,room,from:"case-"+item.id}),"button")
    : "";
  activeContext=roomContext(demoRoom,null,demoRows,{segment,plan:"case-"+item.id,selectable:false,source:"case"});
  return '<div class="wrap page">'+back(path("sector",segment))+
    '<div class="row heading-row">'+title(esc(item.name),esc(caseDescription[item.id]),sectors[segment])+toggler(business.color,segment)+'</div>'+
    (item.variableProducts ? '<div class="surface option-panel"><h3>Количество по световым группам</h3><p class="muted">Реле в прайсе с 9 декабря 2026. Проверьте наличие и подключение нейтрали.</p><div class="inline-qty">'+
      item.variableProducts.map(sku=>'<label><span>'+esc(catalog[sku].title)+'</span><input type="number" min="0" max="30" value="'+(options[sku]||0)+'" data-change="case-qty"'+attrs({ sku })+'></label>').join("")+'</div></div>' : "")+
    (item.id==="safety"?'<div class="surface option-panel"><label>Система защиты '+select([["","Без СЗОП"],["O2U152W1R","С СЗОП 1/2″"],["O2U202W1R","С СЗОП 3/4″"]],options.protection || "",{change:"case-protection"},"Система защиты")+'</label></div>':"")+
    (hasProtection?'<div class="action-row above">'+link("События дома",path("case",item.id,{segment}),"chip"+(!cabinet?" on":""))+
      link("Защита в сантехническом шкафу",path("case",item.id,{segment,zone:"utility"}),"chip"+(cabinet?" on":""))+'</div>':"")+
    (["S","M","L"].includes(item.id)?'<div class="surface option-panel"><h3>Дополнительные модули</h3><div class="pills">'+
      cases.filter(c=>c.id.startsWith("module_")).map(c=>chip(esc(c.name),business.modules.includes(c.id),"module",{id:c.id})).join("")+
      '</div><p class="muted">Совпадающие артикулы считаются общими в пределах выбранного решения. Чтобы учесть отдельные экземпляры, проверьте состав перед выгрузкой.</p></div>':"")+
    sceneWorkspace(activeContext)+'<section class="pad-top"><div class="row heading-row"><h2>Спецификация решения</h2>'+project+
    (rows.length?price(total(rows)):"<b>Под расчёт</b>")+exportButton(segment==="repair"?"Скачать состав для сметы":"Скачать спецификацию",rows,{ title:item.name,selection:fmtColor(business.color) })+
    '</div>'+(item.qtyAssumption?'<p class="muted">'+esc(item.variableProducts?"Задайте количество для каждой позиции.":item.qtyAssumption)+'</p>':"")+disclosures(rows)+'</section></div>';
}

function projectRows(id, p, color) {
  const built = planRows(id,p.variant,color);
  const allRooms = Object.keys(layouts[id].groups);
  const scope = p.selectedRooms.length ? p.selectedRooms : allRooms;
  const rows = [];
  for (const room of scope) {
    const override = p.types[room];
    if (p.caseId && room===p.caseRoom && !override) {
      const seed=caseRows(p.caseId,color,p.caseOptions);
      rows.push(...seed.filter(r=>p.variant==="max" || pinGroup(r)==="controls" ||
        (p.variant.includes("light") && pinGroup(r)==="light") || (p.variant.includes("climate") && pinGroup(r)==="climate") ||
        (p.variant.includes("safety") && pinGroup(r)==="safety")));
      continue;
    }
    if (!override || override===roomType(room) || override==="utility") {
      rows.push(...built.filter(row=>row.room===room));
      continue;
    }
    const analogue = allRooms.find(id=>roomType(id)===override && id!==room);
    if (analogue) {
      rows.push(...built.filter(r=>r.room===analogue).map(r=>makeRow(room,r.base,r.qty,color)));
    } else {
      const full = kitRows(override,"max",color);
      const include = {
        max:["light","climate","safety","controls"], light:["light","controls"],
        light_climate:["light","climate","controls"], safety:["safety","controls"], safety_light:["safety","light","controls"],
      }[p.variant];
      rows.push(...full.filter(r=>include.includes(pinGroup(r))).map(r=>makeRow(room,r.base,r.qty,color)));
    }
  }
  return applyAdjustments(rows,p.changes,color).filter(r=>scope.includes(r.room));
}
function projectChoices(p, id, room) {
  const rooms = Object.keys(layouts[id].groups);
  const names = { ...layouts[id].groups, ...p.names };
  const selected = p.selectedRooms.length ? p.selectedRooms : rooms;
  return '<div class="surface option-panel"><h3>Задачи проекта</h3><div class="pills">'+["light","climate","safety"].map(k=>chip(tasks[k],p.tasks.includes(k),"project-task",{id:k})).join("")+'</div>'+
    '<h3>Помещения</h3><div class="pills">'+rooms.map(k=>chip(esc(names[k]),selected.includes(k),"project-room-toggle",{id:k})).join("")+'</div>'+
    '<div class="project-controls"><label>Бюджет <input type="number" min="5000" max="1500000" step="1000" value="'+p.budget+'" data-change="project-budget"></label>'+
    '<label>Стадия ремонта '+select([["","Уточнить"],["rough","Черновая"],["finish","Чистовая"],["ready","Ремонт завершён"]],p.stage,{change:"project-stage"},"Стадия ремонта")+'</label>'+
    '<label>Текущее помещение '+select(Object.entries(names),room,{change:"project-room"},"Текущее помещение")+'</label></div></div>';
}
function quantityEditor(rows, room, p, layout) {
  const fromCurrent=rows.filter(r=>r.room===room);
  const groups=Object.entries(questionTypes).map(([type,def])=>{
    let items=fromCurrent.filter(r=>r.kind===type);
    if (!items.length) {
      if ((type==="valve"&&!["utility","bath"].includes(room)) || (type==="floor"&&room!=="bath") || (type==="hub"&&room!=="entry")) return "";
      items=[{ id:room+":"+def.options[0], base:def.options[0], qty:0 }];
    }
    return '<details class="disclosure"><summary>'+def.label+' <span>'+items.reduce((n,r)=>n+r.qty,0)+' шт.</span></summary><p class="muted">'+esc(def.help)+'</p>'+
      items.map(row=>{
        const current = Object.values(p.changes).find(change=>change.room===room && change.sku===row.base);
        const key=room+":"+(current?.oldSku || row.base);
        const skuOpts=def.options.map(sku=>[sku,catalog[sku].title]);
        return '<div class="adjust-line"><label>Модель'+select(skuOpts,row.base,{change:"project-sku",key,qty:row.qty},"Модель · "+def.label)+'</label><label>Количество'+
          '<input type="number" min="0" max="30" data-change="project-qty"'+attrs({ key,sku:row.base })+' value="'+row.qty+'"></label></div>';
      }).join("")+'</details>';
  }).join("");
  const names={...layout.groups,...p.names};
  const configuredRows=new Map(fromCurrent.map(r=>[r.base,r]));
  const known = planRows(route.id,p.variant,state.b2b.repair.color).filter(r=>r.room===room);
  for (const r of known) if (!configuredRows.has(r.base) && p.changes[r.id]?.qty===0) configuredRows.set(r.base,{...r,qty:0});
  return '<div class="surface option-panel"><h3>Опросный лист · '+esc(names[room])+'</h3><p class="muted">Уточняйте параметры на объекте. Варианты меняют строки текущей спецификации.</p>'+
    (!p.stage?'<p class="mini-note">Уточните стадию ремонта и доступ к монтажным коробкам.</p>':"")+groups+
    '<details class="disclosure" open><summary>Количество и размещение</summary>'+([ ...configuredRows.values() ].map(row=>{
      const change=Object.values(p.changes).find(x=>x.room===room && x.sku===row.base);
      const key=room+":"+(change?.oldSku || row.base);
      const locations= [["","По шаблону"],["У входа","У входа"],["На полу в мокрой зоне","На полу в мокрой зоне"],["На внутренней стене","На внутренней стене"],["У радиатора","У радиатора"],["Вне кадра","Вне кадра"]];
      const xy = row.xy ?? planMarkerPosition({...row,index:0});
      return '<div class="adjust-line placement"><div><b>'+esc(deviceInfo[row.kind][0])+'</b><br><small>'+esc(row.sku)+'</small></div>'+
        '<label>Кол-во<input type="number" min="0" max="30" value="'+row.qty+'" data-change="project-qty"'+attrs({key,sku:row.base})+'></label>'+
        '<label>Где установить'+select(locations,row.location||"",{change:"project-location",key,sku:row.base,qty:row.qty},"Размещение · "+deviceInfo[row.kind][0])+'</label>'+
        '<div class="placement-points">'+["По ширине помещения","По глубине помещения"].map((label,i)=>
          '<label>'+label+'<input type="range" min="10" max="90" step="5" value="'+Math.round(xy[i]*100)+'" data-change="project-point"'+attrs({key,sku:row.base,qty:row.qty,axis:i,coords:xy.join(",")})+' aria-label="'+label+' · '+esc(deviceInfo[row.kind][0])+'"></label>').join("")+'</div></div>';
    }).join("") || '<p class="muted">Выберите помещение или укажите количество в опросном листе.</p>')+'</details></div>';
}
function projectScreen() {
  if (sector()==="developer") return sectorScreen();
  const id = layouts[route.id]?route.id:"two";
  const business=state.b2b.repair, p=projectFor(id), layout=layouts[id];
  const room = layout.groups[route.p.room]?route.p.room:Object.keys(layout.groups)[0];
  const names = { ...layout.groups, ...p.names };
  const activeRows = projectRows(id,p,business.color);
  const projectScope = "project-"+id+(p.caseId?"-"+p.caseId:"");
  const maxRows = planRows(id,"max",business.color);
  const byId = new Map(maxRows.map(r=>[r.id,r]));
  for (const row of activeRows) byId.set(row.id,{...row,qty:Math.max(row.qty,byId.get(row.id)?.qty ?? 0)});
  const all=instances([...byId.values()]);
  const active=new Set(instances(activeRows).map(d=>d.id));
  const href = (room,unit) => path("project",id,{segment:"repair",room,unit,variant:p.variant,from:route.p.from});
  const deviceHref = (room,unit) => path("project",id,{segment:"repair",room,unit,variant:p.variant,from:route.p.from,interior:"1"});
  const roomRows = activeRows.filter(row=>row.room===room);
  const sceneRoom = p.types[room] ? { [room]:names[room] } : names;
  const context = roomContext(room,null,roomRows,{
    segment:"repair",plan:id,scopePlan:projectScope,names:sceneRoom,type:p.types[room],variant:p.variant,selectable:false,allowed:active,source:"project",
    demoRows:[...byId.values()].filter(row=>row.room===room),
  });
  if (route.p.interior==="1") activeContext=context;
  else setMapContext(id,activeRows,{ segment:"repair",scopePlan:projectScope,names });
  const delta = total(activeRows) - p.budget;
  return '<div class="wrap page">'+back(path("sector","repair"))+ '<div class="row heading-row">'+
    title("Подбор под проект",planLabels[id].join(" · ")+(route.p.from==="example"?" · подтверждённый демо-план":p.caseId?" · "+esc(cases.find(c=>c.id===p.caseId).name):""),sectors.repair)+toggler(business.color,"repair")+'</div>'+
    projectChoices(p,id,room)+variantTabs(p.variant,v=>path("project",id,{...route.p,variant:v}),v=>projectRows(id,{...p,variant:v},business.color))+
    (route.p.interior==="1"?'<div class="above">'+link("На плане квартиры",href(room),"button")+'</div>'+sceneWorkspace(context):
    '<div class="scene-layout"><div class="surface map-panel">'+palettePins(id,names,all,room,active,{href,deviceHref,segment:"repair",plan:projectScope})+
    '<p class="map-key">Позиции расставлены по типу комнаты. Уточните точки установки перед монтажом.</p></div><aside class="scene-sidebar">'+
      eyebrow("Расчёт на квартиру")+'<h2>'+esc(names[room])+'</h2>'+price(total(activeRows))+'<p class="muted">'+count(activeRows)+' устройств · '+
      (delta>0?"доплата к бюджету "+rub(delta):"в пределах бюджета")+'</p>'+
      link("Сценарии в интерьере",path("project",id,{...route.p,room,interior:"1"}),"button")+
      exportButton("Скачать состав для сметы",activeRows,{title:planLabels[id].join(" · "),selection:functions[p.variant]+" · "+p.tasks.map(t=>tasks[t]).join(", "),names})+
      mapStoryPanel(activeMap,next=>path("project",id,{...route.p,room:next,interior:"1"}))+
      (route.p.from==="example"?link("Изменить разметку примера",path("recognize",id,{segment:"repair",step:"review"}),"text-link"):"")+'</aside></div>')+
    '<div class="pad-top project-panels">'+quantityEditor(activeRows,room,p,layout)+'<div class="surface option-panel"><h3>Итоги по помещениям</h3>'+groups(activeRows,names)+'</div></div></div>';
}
const detected = { entry:"Входная дверь и проход", kitchen:"Мойка и рабочая зона", living:"Окно и радиатор", bedroom:"Окно и зона у кровати", bath:"Мокрая зона и тёплый пол", utility:"Ввод воды и краны" };
let recognitionTimer;
function recognition() {
  if (sector()==="developer") return sectorScreen();
  const step=route.p.step==="review"?"review":route.p.step==="scan"?"scan":"intro";
  const p=projectFor("two");
  const names = { ...layouts.two.groups, ...p.names };
  const room = names[route.p.room]?route.p.room:"kitchen";
  const href = room => path("recognize","two",{segment:"repair",step,room});
  const marks = {entry:"#dfdfcb",kitchen:"#c2e5d1",living:"#f5e5ac",bedroom:"#cfdaf4",bath:"#b6dce4",utility:"#e6cfe9"};
  const edit = Object.keys(names).map(key=>'<div class="review-row"><div class="review-marker" style="background:'+marks[key]+'"></div><div><label>Название<input type="text" maxlength="45" value="'+esc(names[key])+'" data-change="detect-name"'+attrs({room:key})+'></label><small>'+esc(detected[key])+'</small></div><label>Тип помещения'+
    select(Object.entries(rooms).map(([id,v])=>[id,v.name]),p.types[key]||roomType(key),{change:"detect-type",room:key},"Тип · "+names[key])+'</label></div>').join("");
  return '<div class="wrap page">'+back(path("sector","repair"))+title("Разметка планировки", "Демонстрация на подготовленном примере двухкомнатной квартиры.", "Ремонтным компаниям")+
    '<div class="scene-layout"><div class="surface map-panel recognition '+(step==="scan"?"scanning":"")+'">'+
    palettePins("two", names,[],room,null,{href,flat:true,highlights:step==="review"?marks:{}})+
    (step==="scan"?'<div class="scan-line" aria-hidden="true"></div>':"")+'</div><aside class="scene-sidebar">'+
    (step==="intro"?'<h2>Пример 2К · 60 м²</h2><p>Слева исходная схема. После запуска появятся контуры комнат, найденные объекты и вопросы для уточнения.</p>'+
      btn("Распознать пример","recognize-start",{},"button primary"):
    step==="scan"?'<h2 role="status">Размечаем комнаты</h2><p>Выделяем окна, двери и мокрые зоны.</p>':
    '<h2>Проверьте разметку</h2><p>'+Object.keys(names).length+' помещений. Уточните типы, названия и точки установки.</p>'+
      '<div class="mini-note"><b>Что уточнить на объекте</b><br>Число радиаторов, диаметр ввода воды и наличие нейтрали.</div>'+
      btn("Подтвердить и подобрать","recognize-confirm",{},"button primary"))+'</aside></div>'+
    (step==="review"?'<section class="surface option-panel pad-top"><h2>Найденные помещения</h2>'+edit+'</section>':"")+'</div>';
}

const pages = {
  home, shop:()=>home(true), room:customerRoom, stories, pick:picker, tour,
  cart, checkout:()=>cart(true), business:businessEntry, sector:sectorScreen,
  layout:layoutScreen, case:caseScreen, project:projectScreen, recognize:recognition,
};
let openDisclosure = new Map();
function render() {
  activeContext = null;
  activeMap = null;
  exportData = null;
  const oldFocus = document.activeElement;
  const priorStage = app.querySelector(".scene-image");
  const focusedButton = oldFocus?.closest("#app button[data-do]");
  const focused = focusedButton ? JSON.stringify(focusedButton.dataset) : null;
  const previouslyIn = app.dataset.key;
  const currentKey = route.name + "/" + route.id + "/" + (route.p.interior ?? "") + "/" + (route.p.unit ?? "");
  const previousDetails = [...app.querySelectorAll("details")].map(el=>el.open);
  if (previouslyIn) openDisclosure.set(previouslyIn,previousDetails);
  shell();
  app.innerHTML = Object.hasOwn(pages,route.name) ? pages[route.name]() : home();
  const nextStage = app.querySelector(".scene-image");
  if (priorStage && nextStage?.dataset.scope === priorStage.dataset.scope
    && nextStage.querySelector("img").src===priorStage.querySelector("img").src) {
    priorStage.className=nextStage.className;
    priorStage.dataset.phase=nextStage.dataset.phase;
    priorStage.style.cssText=nextStage.style.cssText;
    priorStage.querySelector(".scene-pins").replaceWith(nextStage.querySelector(".scene-pins"));
    priorStage.querySelector(".image-caption")?.remove();
    const caption=nextStage.querySelector(".image-caption");
    if (caption) priorStage.append(caption);
    nextStage.replaceWith(priorStage);
  }
  app.dataset.key = currentKey;
  const details = openDisclosure.get(currentKey);
  if (details) app.querySelectorAll("details").forEach((el,i)=>{ if (i < details.length) el.open=details[i]; });
  const restore = focused && [...app.querySelectorAll("button[data-do]")].find(el=>JSON.stringify(el.dataset)===focused);
  if (restore) restore.focus({ preventScroll:true });
}

function revealStage() {
  const stage = app.querySelector(".scene-image");
  if (!stage) return;
  const bounds = stage.getBoundingClientRect();
  if (bounds.bottom < 170 || bounds.top > innerHeight-180) {
    stage.scrollIntoView({ block:"center", behavior:reduced()?"instant":"smooth" });
  }
}
function switchIn(list,id) { return list.includes(id)?list.filter(x=>x!==id):[...list,id]; }
function updateState() { save(); render(); }
function setProjectTask(tasks) {
  const lighting=tasks.includes("light"), climate=tasks.includes("climate"), safety=tasks.includes("safety");
  if (climate) return safety?"max":"light_climate";
  if (safety) return lighting?"safety_light":"safety";
  return "light";
}
function activateLink(href, anchor) {
  const dest = href.split("?")[0];
  const params = new URLSearchParams(href.split("?")[1]);
  if (dest==="#/pick" && (params.get("room") || params.get("task"))) {
    if (keys.includes(params.get("room"))) state.picker.rooms=[params.get("room")];
    if (tasks[params.get("task")]) state.picker.tasks=[params.get("task")];
    save();
  }
  if (dest.startsWith("#/layout/") && params.get("variant")) {
    const segment=params.get("segment") || "repair";
    if (state.b2b[segment]) state.b2b[segment].variants[dest.split("/").at(-1)]=params.get("variant");
    save();
  }
  const name = dest.split("/")[1];
  const labels = {room:"open_room",tour:"open_3d",pick:"picker_open",stories:"catalog_open",sector:"segment_select",layout:"layout_select",case:"library_select",checkout:"demo_cart",shop:"shop_open"};
  if (labels[name]) track(labels[name],{ source:location.hash||"direct", id:dest.split("/")[2], variant:params.get("variant"), segment:params.get("segment") });
  if (anchor?.classList.contains("variant-tab")) track("category_select",{variant:params.get("variant")});
  go(href);
  if (params.get("from")==="shop") track("entry",{ source:"shop" });
  if (params.get("scene")) track("scenario_view",{ id:params.get("scene"),room:dest.split("/")[2] });
}
document.addEventListener("click", event => {
  const anchor = event.target.closest('a[href^="#/"]');
  if (anchor && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button===0) {
    event.preventDefault();
    activateLink(anchor.getAttribute("href"),anchor);
    return;
  }
  const button = event.target.closest("[data-do]");
  if (!button) return;
  const { do:action, id, room, level, unit, segment, value, fallback } = button.dataset;
  const p=projectFor();
  const context = activeContext;
  const device = context?.units.find(u=>u.id===unit);
  if (action==="back") {
    track("back");
    scrollPositions.set(history.state?.key,scrollY);
    if (history.state?.from) history.back();
    else go(fallback || path("home"),{replace:true});
    return;
  }
  if (action==="color") {
    if (segment && state.b2b[segment]) state.b2b[segment].color=value;
    else state.color=value;
    track("color_select",{segment,value});
    return updateState();
  }
  if (action==="pick-task" || action==="pick-room") {
    const field=action==="pick-task"?"tasks":"rooms";
    state.picker[field]=switchIn(state.picker[field],id);
    track("picker_filter",{ field,id });
    return updateState();
  }
  if (action==="budget") {
    state.picker.budget=Number(value);
    track("budget_select",{ budget:state.picker.budget });
    return updateState();
  }
  if (action==="add-kit") {
    const replacing=state.kits[room] && state.kits[room]!==level;
    state.kits[room]=level;
    track("kit_add",{room,level});
    updateState();
    return toast(replacing?"Комплектация комнаты заменена":"Набор в комплекте");
  }
  if (action==="remove-kit" || action==="remove-scene") {
    if (action==="remove-kit") delete state.kits[room];
    else delete state.selected[id];
    track(action,{room,id});
    return updateState();
  }
  if (action==="add-scene" && context?.selectable) {
    const s = context.scenes.find(s=>s.id===id);
    if (!s?.requires) return;
    const key = context.room+":"+id;
    const existing = Boolean(state.selected[key]);
    if (existing) delete state.selected[key];
    else state.selected[key]={room:context.room,name:s.name,items:buyRows(s,context.rows).map(r=>[r.base,r.qty])};
    track(existing?"scenario_remove":"scenario_add",{id,room:context.room});
    updateState();
    return toast(existing?"Сценарий удалён":"Сценарий в комплекте");
  }
  if (action==="voice-toggle") {
    voiceOpen=!voiceOpen;
    track("voice_widget",{ open:voiceOpen });
    return render();
  }
  if (action==="map-setting" && activeMap) {
    stop();
    const settings = state.simulation[activeMap.scope] ??= {};
    settings[id]=!settings[id];
    return updateState();
  }
  if (action==="map-run" && activeMap) {
    const idea=activeMap.ideas.find(s=>s.id===id);
    if (idea) runApartment(activeMap,idea);
    return;
  }
  if (action==="device-close") return setRoomQuery({unit:""},{replace:true,keepRun:true});
  if ((action==="device" || action==="phone-device") && device) {
    track("device_open",{unit,room:context.room});
    setRoomQuery({unit},{replace:true,keepRun:true});
    if (action==="phone-device" && !sliders[device.kind] && device.kind!=="climate" && device.kind!=="extension") toggleDevice(context,device);
    return;
  }
  if (action==="toggle-device" && device) return toggleDevice(context,device);
  if (action==="secondary" && device) {
    stop();
    const controls=controlValues(context.scope);
    controls[unit+":secondary"]=!controls[unit+":secondary"];
    if (context.room==="bath" && context.settings.ventilation) controls.$fan=controls[unit+":secondary"];
    track("device_control",{unit,room:context.room,channel:2});
    return updateState();
  }
  if (action==="sample-climate" && device) {
    const story = (!context.allowed || context.allowed.has(device.id)) && context.scenes.find(s=>["W04","W02","K06","L06","N05"].includes(s.id));
    if (story) return run(context,story,false,device.id);
    stop();
    put(context.scope,device,currentValue(context.scope,device)===58?45:58);
    track("device_control",{unit,room:context.room});
    return updateState();
  }
  if (action==="accent" && device) {
    stop();
    state.controls[context.scope] ??= {};
    state.controls[context.scope][device.id+":accent"]=value;
    if (!currentValue(context.scope,device)) put(context.scope,device,55);
    track("device_control",{unit,room:context.room});
    return updateState();
  }
  if (action==="scenario-setting" && context) {
    stop();
    const settings = state.simulation[context.scope] ??= {};
    settings[id] = !settings[id];
    if (id==="ventilation") {
      if (!settings[id]) {
        const controls=controlValues(context.scope);
        delete controls.$fan;
        for (const device of context.units.filter(d=>matchesRole(d,"switch2"))) delete controls[device.id+":secondary"];
      }
      save();
      return setRoomQuery({scene:settings[id]?"W04":"W02",unit:""},{replace:true});
    }
    return updateState();
  }
  if (["scene","run","voice","device-run"].includes(action) && context) {
    const s=context.scenes.find(s=>s.id===id);
    if (!s) return;
    setRoomQuery({unit:action==="device-run"?unit:"",scene:id},{replace:true,keepRun:true});
    if (action==="voice") track("voice_command",{id,room:context.room});
    run(context,s,action==="voice",action==="device-run"?unit:"");
    return revealStage();
  }
  if (action==="order") {
    track("demo_order",{ total:total(readyCart()) });
    return setRoomQuery({done:"1"});
  }
  if (action==="export" && exportData?.rows.length) {
    track("xlsx_download",{ segment:sector(),count:count(exportData.rows),amount:total(exportData.rows) });
    downloadSpecification(exportData.rows,exportData.info);
    return toast("Спецификация подготовлена");
  }
  if (action==="module") {
    state.b2b.developer.modules=switchIn(state.b2b.developer.modules,id);
    track("module_select",{id});
    return updateState();
  }
  if (action==="project-task") {
    p.tasks=switchIn(p.tasks,id);
    p.variant=setProjectTask(p.tasks);
    track("project_recalculate",{task:id,variant:p.variant});
    save();
    return setRoomQuery({variant:p.variant},{replace:true,retainScroll:true});
  }
  if (action==="project-room-toggle") {
    const rooms=Object.keys(layouts[route.id].groups);
    const next=switchIn(p.selectedRooms.length?p.selectedRooms:rooms,id);
    if (!next.length) return toast("Оставьте хотя бы одно помещение");
    p.selectedRooms=next;
    track("project_recalculate",{room:id});
    return updateState();
  }
  if (action==="recognize-start") {
    track("ai_demo_start");
    setRoomQuery({step:"scan"},{replace:true});
    clearTimeout(recognitionTimer);
    recognitionTimer=setTimeout(()=>{
      if (route.name==="recognize" && route.p.step==="scan") setRoomQuery({step:"review"},{replace:true});
    },reduced()?250:1100);
    return;
  }
  if (action==="recognize-confirm") {
    track("ai_demo_confirm");
    p.selectedRooms=Object.keys(layouts.two.groups);
    save();
    return go(path("project","two",{segment:"repair",room:route.p.room,from:"example"}));
  }
});

function setChange(key, fields, redraw = true) {
  const p=projectFor();
  const [room, oldSku]=key.split(":");
  p.changes[key]={ room,oldSku,sku:oldSku,qty:0,...p.changes[key],...fields };
  track("project_recalculate",{room,sku:p.changes[key].sku});
  if (redraw) updateState();
  else save();
}
const liveTimers = new WeakMap();
document.addEventListener("input",event=>{
  const field=event.target;
  const { change,key,sku,room }=field.dataset;
  if (change==="detect-name") {
    const name=field.value.trim().slice(0,45);
    const p=projectFor("two");
    if (name) p.names[room]=name;
    else delete p.names[room];
    const label=app.querySelector('.map-pin-group[data-room="'+CSS.escape(room)+'"] .map-room');
    if (label) label.textContent=name || layouts.two.groups[room];
    save();
  }
  if (change==="project-qty" && field.value!=="") {
    setChange(key,{sku,qty:Math.min(30,quantity(field.value))},false);
    clearTimeout(liveTimers.get(field));
    liveTimers.set(field,setTimeout(()=>{ if (field.isConnected) render(); },450));
  }
});
document.addEventListener("change",event=>{
  const field=event.target;
  const { change,control,target,room,id,plan,sku,key,qty }=field.dataset;
  const v=field.value;
  const p=projectFor();
  if (control || target) {
    const context=activeContext;
    const device=context?.units.find(d=>d.id===(control||target));
    if (!device) return;
    stop();
    if (control) put(context.scope,device,Number(v));
    else {
      state.controls[context.scope] ??= {};
      state.controls[context.scope][target+":target"]=Number(v);
      delete state.controls[context.scope].$target;
      const sensor=context.units.find(d=>d.kind==="climate");
      if (sensor) put(context.scope,sensor,Number(v)-0.4);
    }
    track("device_control",{unit:device.id,room:context.room});
    return updateState();
  }
  if (change==="story-room") return setRoomQuery({room:v});
  if (change==="budget") {
    state.picker.budget=Number(v);
    track("budget_select",{budget:Number(v)});
  }
  if (change==="layout-qty") {
    const business=state.b2b.repair;
    business.quantities[plan] ??= {};
    business.quantities[plan][id]=Math.min(30,quantity(v));
    track("layout_recalculate",{id,qty:business.quantities[plan][id]});
  }
  if (change==="case-qty" || change==="case-protection") {
    const business=state.b2b[sector()];
    business.options[route.id] ??= {};
    business.options[route.id][sku||"protection"]=sku?Math.min(30,quantity(v)):v;
    track("case_recalculate",{id:route.id});
  }
  if (change==="project-budget") p.budget=Math.min(1500000,Math.max(5000,Number(v)||5000));
  if (change==="project-stage") p.stage=v;
  if (change==="project-room") return setRoomQuery({room:v,unit:""});
  if (change==="project-sku") return setChange(key,{sku:v,qty:Math.min(30,quantity(qty))});
  if (change==="project-qty") return setChange(key,{sku,qty:Math.min(30,quantity(v))});
  if (change==="project-location") return setChange(key,{sku,qty:Math.min(30,quantity(qty)),location:v,xy:null});
  if (change==="project-point") {
    const xy=field.dataset.coords.split(",").map(Number);
    xy[Number(field.dataset.axis)]=Number(v)/100;
    return setChange(key,{sku,qty:Math.min(30,quantity(qty)),xy});
  }
  if (change==="detect-name") {
    const name=v.trim().slice(0,45);
    if (name) p.names[room]=name;
    else delete p.names[room];
    track("ai_demo_correct",{field:"name",room});
  }
  if (change==="detect-type" && rooms[v]) {
    p.types[room]=v;
    track("ai_demo_correct",{field:"type",room});
  }
  if (change) updateState();
});

track("entry",{source:route.p.from==="shop"?"shop":route.name==="home"?"direct":"deep_link"});
syncProjectRoute();
if (old && !saved && old.selectedScenes?.length) {
  toast("Релиз 2 использует новые наборы. Выберите комплект заново.");
}
save();
lastRoute=location.hash;
render();
