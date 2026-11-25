import assert from "node:assert/strict";
import { cartRows, instances, kitRows, planRows, count } from "../site/assets/model.mjs";
import { entries, customerAvailability, businessAvailability } from "../site/assets/scenario-data-v2.mjs";
import {
  apartmentFrames, apartmentIdeas, buyRows, companionDevices, conditions, matchesRole, resolveChange,
  resolveScenes, scenarioFrames, sceneAliases, ScenarioPlayer,
} from "../site/assets/scenario-v2.mjs";

const played = new Set();
const ready = { ventilation:true, safeLoads:true, linked:true };

function validate(room, rows, options, allowed) {
  const scenes = resolveScenes(room,rows,options);
  assert.deepEqual(scenes.map(s=>s.id),allowed,JSON.stringify({ room,...options }));
  const units = [...instances(rows),...companionDevices(room,scenes,false)];
  for (const scene of scenes) {
    played.add(scene.id);
    const selection = buyRows(scene,rows);
    const program = scenarioFrames(scene);
    assert.ok(program.event.text && program.result && program.frames.length);
    for (const role of scene.requires) {
      assert.ok(count(selection.filter(row=>matchesRole(row,role))) >= (scene.counts[role] ?? 1),scene.id+" "+role);
    }
    assert.ok(selection.every(row=>row.sku && !row.partner && row.qty<=rows.find(r=>r.id===row.id).qty));
    const frameSteps = [program.event,...program.frames];
    for (const { type } of scene.partners) {
      assert.ok(frameSteps.some(step=>Object.keys(step.changes).some(role=>resolveChange(units,scene,role)?.unit.kind===type)),scene.id+" "+type);
    }
    assert.ok(frameSteps.some(step=>Object.keys(step.changes).some(role=>role.startsWith("$") || resolveChange(units,scene,role))),scene.id);
  }
}

const applicable = (ids, ventilation) => ids.filter(id=>id!==(ventilation && ids.includes("W04")?"W02":"W04"));
for (const [room, selections] of Object.entries(customerAvailability)) {
  for (const [level, ids] of Object.entries(selections)) {
    for (const color of ["white","carbon"]) {
      const rows = kitRows(room,level,color);
      validate(room,rows,{ level },applicable(ids,false));
      validate(room,rows,{ level,settings:ready },applicable(ids,true));
    }
  }
}
for (const [plan, variants] of Object.entries(businessAvailability)) {
  for (const [variant, rooms] of Object.entries(variants)) {
    for (const color of ["white","carbon"]) {
      const rows = planRows(plan,variant,color);
      for (const [room, ids] of Object.entries(rooms)) {
        const roomRows = rows.filter(row=>row.room===room);
        validate(room,roomRows,{ mode:"layout",plan,variant },applicable(ids,false));
        validate(room,roomRows,{ mode:"layout",plan,variant,settings:ready },applicable(ids,true));
      }
    }
  }
}
assert.deepEqual([...played].sort(),entries.map(s=>s.id).sort());

const living = kitRows("living","basic");
const vignette = resolveScenes("living",living,{level:"basic"});
assert.equal(sceneAliases("rest",vignette).id,"L01");
assert.equal(sceneAliases("P01",vignette).id,"L01");
const cinema = buyRows(vignette.find(s=>s.id==="L01"),living);
assert.equal(count(cinema),3);
const bedroom = kitRows("bedroom","basic");
const paired = resolveScenes("bedroom",bedroom,{level:"basic"}).find(s=>s.id==="B07");
assert.equal(count(buyRows(paired,bedroom)),2);
const switches = instances(bedroom).filter(d=>d.kind==="switch");
assert.equal(resolveChange(switches,paired,"switch2",switches[1].id).unit.id,switches[0].id);
assert.equal(resolveChange(switches,paired,"switch2#1",switches[1].id).unit.id,switches[1].id);
assert.ok(!resolveScenes("bedroom",bedroom.map(row=>({...row,qty:1})),{level:"basic"}).some(s=>s.id==="B07"));

const kitchen = kitRows("kitchen","max");
const leak = settings=>resolveScenes("kitchen",kitchen,{settings}).find(s=>s.id==="K03");
const leakSecond = instances(kitchen).filter(d=>d.kind==="water")[1];
assert.equal(resolveChange(instances(kitchen),leak({}),"leak",leakSecond.id).unit.id,leakSecond.id);
assert.ok(!scenarioFrames(leak({})).frames.some(f=>f.changes.socket===false));
assert.ok(scenarioFrames(leak(ready)).frames.some(f=>f.changes.socket===false));
assert.ok(!buyRows(leak({}),kitchen).some(r=>r.kind==="socket"));
const bath = kitRows("bath","basic");
const warning = resolveScenes("bath",bath,{level:"basic"}).find(s=>s.id==="W01");
assert.match(conditions(warning,bath),/Zigbee/);
assert.ok(!scenarioFrames(warning).frames.some(f=>f.changes.szop));
const protection = resolveScenes("bath",kitRows("bath","max")).find(s=>s.id==="W06");
assert.ok(scenarioFrames(protection).event.changes.$water);
assert.ok(scenarioFrames(protection).frames.some(f=>f.changes.szop));
for (const color of ["white","carbon"]) {
  const rows = cartRows({living:"basic"},{ cinema:{room:"living",name:"Киновечер",items:cinema.map(r=>[r.base,r.qty])} },color);
  assert.equal(count(rows),3);
  assert.ok(rows.every(r=>r.sku && r.sources.length===2));
}

const apt = planRows("two","max");
assert.deepEqual(apartmentIdeas(apt).map(s=>s.id),["A01","A02","A03"]);
assert.ok(!apartmentIdeas(planRows("two","light")).some(s=>s.id==="A03"));
const [away,vacation,flood] = apartmentIdeas(apt);
assert.ok(!apartmentFrames(away,apt).some(f=>f.changes.some(([d])=>d.kind==="socket")));
assert.ok(apartmentFrames(away,apt,ready).some(f=>f.changes.some(([d,value])=>d.kind==="socket"&&!value)));
assert.ok(apartmentFrames(vacation,apt).some(f=>f.changes.some(([d,value])=>d.kind==="valve"&&value)));
assert.ok(!apartmentFrames(flood,apt).some(f=>f.changes.some(([d])=>d.kind==="valve")));
const connected = apartmentFrames(flood,apt,ready);
assert.ok(connected.some(f=>f.changes.some(([d,value])=>d.kind==="valve" && value && d.room!==f.from.room)));
assert.ok(!apartmentFrames(flood,apt.filter(r=>!matchesRole(r,"hub")),{linked:true}).some(f=>f.changes.some(([d])=>d.kind==="valve")));

const scheduled = new Map();
let serial = 0;
const player = new ScenarioPlayer({
  reduce:()=>true,
  schedule:(cb,ms)=>{ assert.ok(ms % 220===0); scheduled.set(++serial,cb); return serial; },
  cancel:id=>scheduled.delete(id),
});
const stages = [];
const steps = [{text:"begin"},{text:"effect"},{text:"result"}];
player.start(steps,s=>stages.push(s.phase));
const oldCallbacks = [...scheduled.values()];
player.start(steps,s=>stages.push(s.phase));
oldCallbacks.forEach(cb=>cb());
for (const cb of scheduled.values()) cb();
assert.deepEqual(stages,["event","event","action","done"]);
player.stop();
assert.equal(scheduled.size,0);
console.log("44 V2 room scenes, both availability matrices, 3 apartment stories, partner isolation, physical instances and playback verified.");
