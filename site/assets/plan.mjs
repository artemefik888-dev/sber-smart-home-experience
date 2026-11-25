import { roomType } from "./model.mjs";

// Illustrative geometry, one layout per assortment. Coordinates are in metres on the floor plane.
export const geometry = {
  demo: { bedroom:[0,0,4.3,3.7], nursery:[4.3,0,3.8,3.7], living:[8.1,0,5.4,5.4], entry:[4.3,3.7,3.8,3.7], bath:[0,3.7,4.3,3.7], kitchen:[8.1,5.4,5.4,3.6] },
  studio: { kitchen_living:[0,0,7,4.8], entry:[3,4.8,4,2.1], bath:[0,4.8,2.55,2.6], utility:[2.55,4.8,.9,1.1] },
  one: { room:[0,0,5.3,4.5], kitchen:[5.3,0,4.2,3.6], entry:[3.3,4.5,6.2,2], bath:[0,4.5,2.55,2.3], utility:[2.55,4.5,.75,1.35] },
  two: { bedroom:[0,0,4.5,4.2], living:[4.5,0,6.4,4.2], bath:[0,4.2,2.6,3.1], utility:[2.6,4.2,1,1.2], entry:[3.6,4.2,2.8,3.1], kitchen:[6.4,4.2,4.5,3.1] },
  three: { bedroom:[0,0,4.2,3.8], nursery:[4.2,0,3.8,3.8], living:[8,0,5,5.3], bath:[0,3.8,3.1,3], utility:[3.1,3.8,1.1,1.1], entry:[4.2,3.8,3.8,3], kitchen:[8,5.3,5,3.2] },
};
const palettes = {
  living:["#ded1b4","#7a8269","#f0e7d5"], entry:["#dfd9cd","#a58b73","#ede9df"],
  bedroom:["#e5d5c0","#b1aaa1","#fbf4e9"], nursery:["#d7dfcf","#899c87","#f6eadc"],
  kitchen:["#e3d4be","#9a755d","#f7eee0"], bath:["#d7dbd5","#a5b0aa","#faf7f0"], utility:["#d8d9d6","#647a71","#f1f2ee"],
};
const climatePins = new Set(["heat","climate","floor"]);
const lightPins = new Set(["switch","lamp","strip","night","relay"]);
export const pinGroup = unit => climatePins.has(unit.kind) ? "climate" : lightPins.has(unit.kind) ? "light"
  : ["water","valve","door","motion"].includes(unit.kind) ? "safety" : "controls";

function projection(rects, flat) {
  const transform = flat ? (x, y, z) => [x * 58, y * 58 - z * 3]
    : (x, y, z) => [(x - y) * 48, (x + y) * 24 - z * 46];
  const points = Object.values(rects).flatMap(([x,y,w,h]) => [transform(x,y,2), transform(x+w,y,0), transform(x,y+h,0), transform(x+w,y+h,0)]);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const left = Math.min(...xs) - 28;
  const top = Math.min(...ys) - 14;
  const width = Math.max(...xs) - left + 28;
  const height = Math.max(...ys) - top + 24;
  return { project:(x,y,z=0) => { const [a,b] = transform(x,y,z); return [a-left,b-top]; }, width, height };
}

function shape(project, points, fill, extra = "") {
  return '<polygon points="' + points.map(point => project(...point).map(n => n.toFixed(1)).join(",")).join(" ") + '" fill="' + fill + '" ' + extra + '/>';
}

function furnish(project, [x,y,w,h], type, palette) {
  const [,dark,pale] = palette;
  function box(a,b,c,d,height,top=dark,base=0) {
    const x0=x+w*a, y0=y+h*b, x1=x+w*c, y1=y+h*d, z=height+base;
    const topFace=[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]];
    return shape(project, [[x0,y1,base],[x1,y1,base],[x1,y1,z],[x0,y1,z]], top, 'class="iso-front"')
      + shape(project, [[x1,y0,base],[x1,y1,base],[x1,y1,z],[x1,y0,z]], top, 'class="iso-right"')
      + shape(project, topFace, top, 'class="iso-top"');
  }
  const seat = (a,b) => box(a,b,a+.11,b+.13,.34,pale) + box(a,b,a+.11,b+.04,.20,dark,.34);
  if (type === "kitchen_living") {
    return box(.10,.10,.88,.27,.7,"#b5a88d") + box(.10,.10,.88,.28,.06,"#f5f0df",.7)
      + box(.67,.13,.81,.23,.025,"#9eb2aa",.76) + box(.16,.38,.39,.58,.53,"#9a7b54")
      + seat(.24,.59) + box(.55,.47,.83,.81,.025,"#d0c4a8") + box(.78,.44,.91,.82,.37,"#e0d1b4")
      + box(.86,.44,.91,.82,.42,"#e7dfc9",.37) + box(.59,.56,.73,.69,.28,"#9a7b54");
  }
  if (type === "living") {
    return box(.20,.24,.76,.83,.025,"#d5cbba") + box(.12,.15,.68,.34,.45,pale)
      + box(.12,.12,.69,.19,.40,pale,.45) + box(.12,.17,.19,.35,.15,pale,.45)
      + box(.61,.17,.68,.35,.15,pale,.45) + box(.32,.47,.56,.62,.35,"#a78970")
      + box(.78,.65,.91,.83,.46,"#758c6b");
  }
  if (type === "bedroom" || type === "nursery") {
    return box(.30,.19,.73,.78,.20,dark) + box(.31,.18,.72,.74,.20,pale,.20)
      + box(.31,.15,.73,.22,.48,dark,.22) + box(.33,.23,.48,.36,.08,"#ffffff",.40)
      + box(.55,.23,.70,.36,.08,"#fffaf2",.40) + box(.31,.44,.72,.74,.035,type==="nursery"?"#8caa98":"#c1a48a",.40)
      + box(.12,.19,.27,.38,.38,"#ac8e71") + box(.76,.19,.90,.37,.38,"#ac8e71");
  }
  if (type === "kitchen") {
    return box(.10,.12,.92,.32,.72,"#a78972") + box(.10,.10,.92,.33,.05,"#f0e9db",.72)
      + box(.65,.16,.82,.26,.02,"#8d9997",.77) + box(.31,.48,.68,.73,.64,"#b09070")
      + seat(.35,.31) + seat(.60,.74);
  }
  if (type === "bath") {
    return box(.10,.12,.44,.62,.42,"#f5f5f3") + box(.15,.16,.39,.56,.01,"#b8ccc8",.43)
      + box(.64,.12,.87,.46,.60,"#a98973") + box(.64,.10,.87,.48,.07,"#f7f6ef",.60)
      + box(.63,.64,.84,.84,.35,"#faf9f3");
  }
  if (type === "utility") return box(.19,.12,.76,.67,.9,"#97aba2");
  return box(.12,.14,.28,.75,.52,"#a5866a") + box(.61,.31,.86,.70,.04,"#8d9687");
}

function blueprintDetails(project,[x,y,w,h],type,recognized) {
  const point=(a,b)=>[x+w*a,y+h*b,0];
  const wire=(points,color="#adb8ae")=>'<polyline fill="none" stroke="'+color+'" stroke-width="2.1" points="'+
    points.map(([a,b])=>project(...point(a,b)).join(",")).join(" ")+'"/>';
  const frame=(a,b,c,d)=>wire([[a,b],[c,b],[c,d],[a,d],[a,b]]);
  const entry=wire([[.55,1],[.55,.73],[.65,.75],[.73,.82],[.78,.91],[.80,1]]);
  const window=wire([[.27,.018],[.77,.018]],"#7ea6b0");
  let built=entry;
  if (["bedroom","living","kitchen","nursery"].includes(type)) built+=window;
  if (type==="kitchen") built+=frame(.14,.08,.93,.24)+frame(.63,.106,.78,.21)+frame(.40,.67,.68,.86);
  if (type==="bath") built+=frame(.08,.08,.38,.61)+frame(.58,.13,.88,.34)+frame(.66,.55,.84,.77);
  if (type==="utility") built+=frame(.15,.14,.85,.8);
  if (!recognized) return built;
  const [mx,my]=project(...point(...({kitchen:[.70,.16],bath:[.23,.38],utility:[.50,.42],entry:[.66,.89]}[type] ?? [.51,.03])));
  return built+'<circle cx="'+mx+'" cy="'+my+'" r="7" fill="#1c8c68" stroke="white" stroke-width="3"/>';
}

export function renderPlan(id, active = "", flat = false, highlights = {}) {
  const rects = geometry[id] ?? geometry.demo;
  const { project, width, height } = projection(rects, flat);
  const byDepth = Object.entries(rects).sort(([,a],[,b]) => a[0]+a[1]-b[0]-b[1]);
  function floor([key, rect]) {
    const [x,y,w,h] = rect;
    const palette = palettes[roomType(key)] ?? palettes.living;
    const surface = [[x,y,0],[x+w,y,0],[x+w,y+h,0],[x,y+h,0]];
    const floorColor = flat ? (highlights[key] ?? palette[0]) : palette[0];
    const walls = flat ? "" : shape(project, [[x,y,0],[x,y+h,0],[x,y+h,1.05],[x,y,1.05]], "#e5e1d5", 'class="iso-wall"')
      + shape(project, [[x,y,0],[x+w,y,0],[x+w,y,1.05],[x,y,1.05]], "#f9f5e8", 'class="iso-wall"')
      + (w>2 ? shape(project, [[x+w*.22,y,.38],[x+w*.79,y,.38],[x+w*.79,y,.88],[x+w*.22,y,.88]], "#bbd6d2", 'class="iso-window"') : "");
    const base = flat ? "" : shape(project, [[x,y+h,0],[x+w,y+h,0],[x+w,y+h,-.18],[x,y+h,-.18]], "#a5a28e")
      + shape(project, [[x+w,y,0],[x+w,y+h,0],[x+w,y+h,-.18],[x+w,y,-.18]], "#8c9588");
    const line = active === key ? "#117756" : flat ? "#8f9c94" : "#c5bea8";
    return '<g class="iso-room" data-space="'+key+'">' + base + shape(project,surface,floorColor,'stroke="'+line+'" stroke-width="'+(flat?3:1.5)+'"')
      + (flat ? blueprintDetails(project,rect,roomType(key),Object.hasOwn(highlights,key)) : walls+furnish(project,rect,key==="kitchen_living"?key:roomType(key),palette)) + '</g>';
  }
  const markup = '<svg class="iso-art" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+(flat?"Схема демонстрационной квартиры":"Изометрия квартиры с мебелью")+'">'
    + (flat ? '<defs><pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 H 0 V 20" fill="none" stroke="#cedad2" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#blueprint-grid)"/>' : "")
    + byDepth.map(floor).join("") + '</svg>';
  return {
    markup, width, height,
    point(room, fx=.5, fy=.5, z=0) {
      const [x,y,w,h] = rects[room] ?? [0,0,1,1];
      const [px,py] = project(x+w*fx,y+h*fy,z);
      return [(px/width*100).toFixed(2),(py/height*100).toFixed(2)];
    },
  };
}
