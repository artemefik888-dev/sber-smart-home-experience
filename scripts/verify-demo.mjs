import assert from "node:assert/strict";
import { createDemoSnapshot, DemoTimeline, sceneActionText, sceneVisualMode } from "../site/assets/demo-engine.mjs";

const light = { id: "light", trigger: "Есть движение", result: "Основной свет включён", effect: "motion", products: ["SBDV-00029", "SWITCH_2"] };
const lightOff = { id: "off", trigger: "Команда «Я ушёл»", result: "Освещение выключено", effect: "away", products: ["SWITCH_1"] };
const heat = { id: "heat", trigger: "Становится холоднее выбранной температуры", result: "Терморегулятор увеличивает подачу тепла", effect: "climate", products: ["SBDV-00079", "SBDV-00185"] };
const monitor = { id: "monitor", trigger: "Влажность изменилась", result: "Показания видны в приложении", effect: "climate", products: ["SBDV-00079"] };
const leak = { id: "leak", trigger: "Появилась вода", result: "Пришло уведомление", effect: "water", products: ["SBDV-00154"] };
const waterStop = { id: "stop", trigger: "Комплект обнаружил протечку", result: "Приводы закрыли краны", effect: "water", products: ["O2U152W1R"] };

assert.equal(sceneVisualMode(light), "motion-light");
assert.equal(sceneVisualMode(heat), "heat");
assert.equal(sceneVisualMode(monitor), "monitor");
assert.equal(sceneVisualMode(leak), "leak-alert");
assert.equal(sceneVisualMode(waterStop), "water-stop");
assert.equal(sceneActionText(heat), "Терморегулятор увеличивает подачу тепла");

const heatIdle = createDemoSnapshot(heat, "idle");
const heatEvent = createDemoSnapshot(heat, "event");
const heatAction = createDemoSnapshot(heat, "action");
const heatDone = createDemoSnapshot(heat, "done");
assert.equal(heatIdle.card.temperature, 22, "До события температура совпадает с целью");
assert.equal(heatEvent.card.temperature, 19, "Событие показывает заметное похолодание");
assert.ok(heatAction.card.valvePercent > heatIdle.card.valvePercent, "Терморегулятор увеличивает подачу тепла");
assert.ok(heatDone.card.temperature > heatEvent.card.temperature && heatDone.card.temperature < heatDone.card.targetTemperature, "Температура растёт к цели");
assert.equal(heatDone.steps.result, "active", "Конечный результат остаётся активным");

const monitorDone = createDemoSnapshot(monitor, "done");
assert.equal(monitorDone.card.valvePercent, null, "Датчик без терморегулятора не показывает управление отоплением");
assert.equal(monitorDone.mode, "monitor");

const leakDone = createDemoSnapshot(leak, "done");
const stopDone = createDemoSnapshot(waterStop, "done");
assert.equal(leakDone.card.valve, null, "Обычный датчик не заявляет перекрытие воды");
assert.equal(stopDone.card.valve, "Закрыто", "Полный комплект показывает закрытые краны");
assert.equal(createDemoSnapshot(light, "done").card.on, true, "Сценарий света заканчивается включённым светом");
assert.equal(createDemoSnapshot(lightOff, "done").card.on, false, "Сценарий ухода заканчивается выключённым светом");

function fakeClock() {
  let sequence = 0;
  const tasks = [];
  return {
    schedule(fn, delay) { const task = { id: ++sequence, fn, delay, cancelled: false }; tasks.push(task); return task; },
    cancel(task) { task.cancelled = true; },
    flush() { tasks.sort((a, b) => a.delay - b.delay || a.id - b.id).forEach((task) => { if (!task.cancelled) task.fn(); }); },
    tasks,
  };
}

const clock = fakeClock();
const phases = [];
const timeline = new DemoTimeline({
  onPhase: (phase, context) => phases.push(`${context.sceneId}:${phase}`),
  schedule: clock.schedule,
  cancel: clock.cancel,
  reducedMotion: () => false,
});
timeline.start({ roomId: "entry", sceneId: "home" });
assert.deepEqual(phases, ["home:event"], "Клик даёт мгновенную реакцию");
timeline.start({ roomId: "living", sceneId: "heat" });
clock.flush();
assert.deepEqual(phases, ["home:event", "heat:event", "heat:action", "heat:done"], "Быстрое переключение отменяет старую цепочку");

const reducedClock = fakeClock();
const reducedPhases = [];
const reducedTimeline = new DemoTimeline({
  onPhase: (phase) => reducedPhases.push(phase),
  schedule: reducedClock.schedule,
  cancel: reducedClock.cancel,
  reducedMotion: () => true,
});
reducedTimeline.start({ roomId: "nursery", sceneId: "monitor" });
reducedClock.flush();
assert.deepEqual(reducedPhases, ["event", "action", "done"], "Reduced motion сохраняет все состояния и результат");
assert.ok(reducedClock.tasks[0].delay >= 400, "Фазы остаются читаемыми при reduced motion");

console.log("Проверено: автозапуск, фазы событий, отмена таймеров, климат, свет, протечки и reduced motion.");
