import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, access, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  catalog, layouts, cases, levels, rooms, roomKits, planRows, kitRows, caseRows, total,
  normSku, baseSku, instances, cartRows, applyAdjustments, recommendedKits, count,
} from "../site/assets/model.mjs";
import { colorPairs } from "../site/assets/release-data.mjs";
import { roomScenes, partnersFor, sceneRows, condition } from "../site/assets/scenes.mjs";
import { geometry, renderPlan } from "../site/assets/plan.mjs";
import { specificationXlsx } from "../site/assets/export.mjs";

const path = file => new URL("../" + file, import.meta.url);
const expected = JSON.parse(await readFile(path("scripts/expected-rrc.json"),"utf8"));
assert.equal(Object.keys(catalog).length,56);
assert.equal(Object.keys(roomKits).length,6);
assert.equal(new Set(Object.keys(catalog).map(s=>s.toUpperCase())).size,56);
assert.equal(normSku(" sbdv-00090A "), "SBDV-00090a");
assert.equal(baseSku("atn001053z"),"ATN000153Z");
assert.equal(normSku("UNKNOWN"),undefined);
for (const product of Object.values(catalog)) {
  assert.ok(Number.isSafeInteger(product.rrc) && product.rrc>0);
  assert.ok(product.title && Object.hasOwn(product,"description"));
  assert.ok(Object.keys(product).every(x=>["title","description","rrc","image"].includes(x)));
  if (product.image) await access(path("site/assets/products/"+product.image));
}
for (const data of Object.values(rooms)) await access(path("site/assets/rooms/"+data.image+".jpg"));
for (const [white, carbon] of Object.entries(colorPairs)) {
  assert.ok(catalog[white].image && catalog[carbon].image);
  assert.notEqual(catalog[white].image,catalog[carbon].image);
  assert.equal(baseSku(carbon),white);
}
for (const [room, kits] of Object.entries(expected.b2cExpectedTotals)) {
  assert.deepEqual(Object.keys(roomKits[room]),Object.keys(levels));
  for (const [level, colors] of Object.entries(kits)) {
    for (const [color, price] of Object.entries(colors)) {
      const rs = kitRows(room,level,color);
      assert.equal(total(rs),price,[room,level,color].join("/"));
      assert.equal(count(rs),instances(rs).length);
      assert.ok(roomScenes(room,rs,false).some(s=>!s.partner));
      for (const s of roomScenes(room,rs,false)) assert.equal(sceneRows(s,rs).length,s.required.length);
    }
  }
}
const bskFingerprints = {
  studio:"e3d2d5940c3942b23231ea1ff78c02d4f3369faeba69901e672461769cb44ff3",
  one:"98a6695109afc6ca7f53ad87b61c780c2add6330c10462ddbc8fffa1416afb91",
  two:"9efb43b7cf74265bba271b82d4de6c979c7059b8e2c98ae2c1e39d45db88309a",
  three:"c9fdbf6f0d2c04cc79786db031f054e7192d78760e0117844fc1d5d9e638e2db",
};
assert.equal(Object.values(layouts).reduce((n,x)=>n+x.rows.length,0),103);
for (const [plan, variants] of Object.entries(expected.b2bExpectedTotals)) {
  const source = layouts[plan];
  assert.equal(createHash("sha256").update(JSON.stringify(source.rows)).digest("hex"),bskFingerprints[plan],plan+" room, SKU, quantity and L–O membership");
  assert.deepEqual(Object.keys(geometry[plan]).sort(),Object.keys(source.groups).sort());
  assert.match(renderPlan(plan).markup,/iso-window/);
  for (const [variant, colors] of Object.entries(variants)) {
    for (const [color, price] of Object.entries(colors)) {
      const rs=planRows(plan,variant,color);
      assert.equal(total(rs),price,[plan,variant,color].join("/"));
      assert.equal(new Set(instances(rs).map(d=>d.id)).size,count(rs));
    }
    assert.deepEqual(planRows(plan,variant,"white").map(r=>r.id),planRows(plan,variant,"carbon").map(r=>r.id));
  }
}
assert.equal(total(planRows("studio","max").filter(r=>r.room==="kitchen_living")),25120);
assert.equal(planRows("studio","max","white").find(r=>r.base==="ATN000145Z").qty,2);
assert.equal(total(planRows("studio","light","white",{ "entry:ATN000115Z":2 })),30300+2590);
for (const c of cases) {
  const rr=expected.caseTotals[c.id];
  if (!rr) continue;
  for (const [color, amount] of Object.entries(rr)) assert.equal(total(caseRows(c.id,color)),amount,c.id+" "+color);
}
assert.equal(total(caseRows("safety","white",{protection:"O2U152W1R"})),43550);
assert.equal(total(caseRows("light","white",{ "SBDV-00302":2,"ATN000117Z":1 })),7570);
assert.equal(caseRows("light","white").length,0);
assert.equal(cases.filter(x=>x.audience==="both").length,6);
assert.equal(cases.filter(x=>x.audience==="developer").length,7);

const manual = { leak: { room:"bath", name:"Протечка замечена", items:[["SBDV-00154",1]] } };
assert.equal(cartRows({bath:"max"},manual,"white").find(x=>x.kind==="water").qty,3);
assert.equal(cartRows({bath:"basic"},manual,"white").find(x=>x.kind==="water").qty,2);
assert.ok(!cartRows({bath:"basic"},manual,"white").some(x=>x.kind==="valve"));
assert.equal(cartRows({},manual,"white").find(x=>x.kind==="water").qty,1);
const separated=cartRows({bath:"basic",kitchen:"basic"},{},"white").filter(x=>x.kind==="water");
assert.equal(count(separated),4);
assert.equal(separated.length,2);
assert.ok(!kitRows("entry","max").some(x=>x.kind==="hub"));
assert.equal(kitRows("entry","basic").some(x=>x.kind==="switch"),false);
assert.equal(recommendedKits(["bath"],["climate","safety"],5000,"white").surcharge,370);
const updated=applyAdjustments(planRows("studio","max"),{
  "utility:O2U152W1R":{room:"utility",oldSku:"O2U152W1R",sku:"O2U202W1R",qty:2,location:"Вне кадра"},
},"white");
assert.equal(total(updated),91380-29990+31690*2);
assert.equal(updated.find(r=>r.kind==="valve").location,"Вне кадра");

const basicBath=kitRows("bath","basic");
const basicScenes=roomScenes("bath",basicBath,false);
const maxScenes=roomScenes("bath",kitRows("bath","max"),false);
assert.ok(basicScenes.some(s=>s.id==="leak"));
assert.ok(!basicScenes.some(s=>s.id==="protect"||s.id==="floor"));
assert.ok(maxScenes.some(s=>s.id==="protect"));
assert.match(condition(basicScenes.find(s=>s.id==="leak"),basicBath),/приводами/);
const living=kitRows("living","max");
const livingStories=roomScenes("living",living,true);
assert.deepEqual(livingStories.find(x=>x.id==="rest").required,["switch","strip","speaker"]);
assert.equal(livingStories.find(x=>x.id==="away").after.socket,false);
assert.equal(partnersFor("living").length,2);
assert.ok(livingStories.filter(x=>x.partner).every(s=>!sceneRows(s,living).length));

const sample=planRows("studio","max","carbon");
const bytes=specificationXlsx(sample,{title:"Тест < 30 & 40",selection:"Максимум",names:layouts.studio.groups});
const decoder=new TextDecoder();
const archive=new DataView(bytes.buffer);
let pos=0;
const files=new Map();
while(archive.getUint32(pos,true)===0x04034b50) {
  const size=archive.getUint32(pos+18,true);
  const nameSize=archive.getUint16(pos+26,true);
  const name=decoder.decode(bytes.subarray(pos+30,pos+30+nameSize));
  const start=pos+30+nameSize;
  files.set(name,decoder.decode(bytes.subarray(start,start+size)));
  pos=start+size;
}
assert.equal(files.size,6);
assert.equal(archive.getUint32(pos,true),0x02014b50);
const worksheet=files.get("xl/worksheets/sheet1.xml");
assert.match(worksheet,/<c r="B5" s="2"><v>96080<\/v>/);
assert.match(worksheet,/<f>SUM\(G8:G25\)<\/f><v>96080<\/v>/);
assert.match(worksheet,/Тест &lt; 30 &amp; 40/);
assert.match(worksheet,/ATN001045Z/);
if (process.env.SBER_TEST_SAMPLE) await writeFile(process.env.SBER_TEST_SAMPLE,bytes);

const page=await readFile(path("site/index.html"),"utf8");
assert.match(page,/\.\/assets\/experience\.mjs\?v=\d+\.\d+/);
assert.match(page,/\.\/assets\/experience\.css\?v=\d+\.\d+/);
for (const file of await readdir(path("site"),{recursive:true})) {
  assert.ok(!/\.(xlsx?|docx?|pdf|env)$/i.test(file),file+" must not ship");
}
console.log("56 SKU, 18 B2C kits × 2 colors, 20 B2B sets × 2 colors, 103 source rows, 13 cases, cart, assets and XLSX passed.");
