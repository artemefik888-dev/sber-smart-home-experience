export const DEMO_PHASES = Object.freeze(["idle", "event", "action", "done"]);

const hasProduct = (scene, product) => (scene?.products || []).includes(product);
const resultIncludes = (scene, value) => String(scene?.result || "").toLocaleLowerCase("ru-RU").includes(value);

export function sceneVisualMode(scene) {
  if (!scene) return "idle";
  if (scene.effect === "climate") return hasProduct(scene, "SBDV-00185") ? "heat" : "monitor";
  if (scene.effect === "water") return hasProduct(scene, "O2U152W1R") || hasProduct(scene, "O2U202W1R") ? "water-stop" : "leak-alert";
  if (scene.effect === "motion") return "motion-light";
  if (scene.effect === "light") return "light-on";
  if (scene.effect === "away") {
    if (resultIncludes(scene, "уведом")) return "opening-alert";
    if (resultIncludes(scene, "розетка")) return "power-off";
    return "light-off";
  }
  return scene.effect || "idle";
}

export function sceneActionText(scene) {
  const mode = sceneVisualMode(scene);
  if (mode === "heat") return "Терморегулятор увеличивает подачу тепла";
  if (mode === "monitor") return "Датчик обновляет показания";
  if (mode === "water-stop") return "Приводы начинают закрывать краны";
  if (mode === "leak-alert") return "Хаб отправляет уведомление";
  if (mode === "opening-alert") return "Хаб отправляет уведомление";
  if (mode === "power-off") return "Розетка отключает питание";
  if (mode === "light-off") return "Выбранные устройства получают команду выключиться";
  if (mode === "motion-light") return "Датчик передаёт сигнал свету";
  if (hasProduct(scene, "SWITCH_1") || hasProduct(scene, "SWITCH_2")) return "Выключатель подаёт питание на свет";
  return "Умный источник света получает команду";
}

export function demoStepState(step, phase) {
  const order = { idle: 0, event: 1, action: 2, done: 3 };
  const target = { before: 0, event: 1, action: 2, result: 3 }[step];
  const current = order[phase] ?? 0;
  if (current === target) return "active";
  return current > target ? "complete" : "pending";
}

function climateReadout(mode, phase) {
  if (mode === "monitor") {
    const humidity = phase === "idle" ? 45 : 58;
    return {
      kind: "climate",
      temperature: 22.1,
      targetTemperature: null,
      humidity,
      valvePercent: null,
      label: phase === "idle" ? "Обычные показания" : phase === "event" ? "Влажность изменилась" : phase === "action" ? "Обновляем данные" : "Показания обновлены",
    };
  }
  const values = {
    idle: { temperature: 22, valvePercent: 28, label: "Температура у цели" },
    event: { temperature: 19, valvePercent: 28, label: "Датчик зафиксировал снижение" },
    action: { temperature: 19.4, valvePercent: 82, label: "Подача тепла увеличена" },
    done: { temperature: 21.4, valvePercent: 82, label: "Нагрев идёт к 22 °C" },
  }[phase] || { temperature: 22, valvePercent: 28, label: "Температура у цели" };
  return { kind: "climate", targetTemperature: 22, humidity: 45, ...values };
}

function stateCard(mode, phase) {
  if (mode === "heat" || mode === "monitor") return climateReadout(mode, phase);
  if (mode === "water-stop") {
    return {
      kind: "water",
      wet: phase !== "idle",
      valve: phase === "done" ? "Закрыто" : phase === "action" ? "Закрывается" : "Открыто",
      notification: phase === "done" ? "Вода перекрыта" : phase === "action" ? "Приводы получили команду" : phase === "event" ? "Обнаружена вода" : "Система в ожидании",
    };
  }
  if (mode === "leak-alert") {
    return {
      kind: "water",
      wet: phase !== "idle",
      valve: null,
      notification: phase === "done" ? "Уведомление доставлено" : phase === "action" ? "Отправляем уведомление" : phase === "event" ? "Обнаружена вода" : "Пол сухой",
    };
  }
  if (mode === "opening-alert") {
    return {
      kind: "alert",
      notification: phase === "done" ? "Уведомление доставлено" : phase === "action" ? "Хаб отправляет уведомление" : phase === "event" ? "Дверь открыта" : "Дверь закрыта",
    };
  }
  if (mode === "power-off") {
    return { kind: "power", on: phase !== "done", notification: phase === "done" ? "Питание отключено" : phase === "action" ? "Розетка выполняет команду" : "Розетка включена" };
  }
  if (mode === "light-off") {
    return { kind: "light", on: phase !== "done", notification: phase === "done" ? "Свет выключен" : phase === "action" ? "Выключаем свет" : "Свет включён" };
  }
  return { kind: "light", on: phase === "done", notification: phase === "done" ? "Свет включён" : phase === "action" ? "Включаем свет" : "Свет выключен" };
}

export function createDemoSnapshot(scene, phase = "idle") {
  const safePhase = DEMO_PHASES.includes(phase) ? phase : "idle";
  const mode = sceneVisualMode(scene);
  const action = sceneActionText(scene);
  const messages = {
    idle: "Готово к запуску",
    event: scene?.trigger || "Событие обнаружено",
    action,
    done: scene?.result || "Сценарий выполнен",
  };
  return {
    phase: safePhase,
    mode,
    message: messages[safePhase],
    action,
    card: stateCard(mode, safePhase),
    steps: {
      before: demoStepState("before", safePhase),
      event: demoStepState("event", safePhase),
      action: demoStepState("action", safePhase),
      result: demoStepState("result", safePhase),
    },
  };
}

export class DemoTimeline {
  constructor({ onPhase, reducedMotion = () => false, schedule = (callback, delay) => globalThis.setTimeout(callback, delay), cancel = (timer) => globalThis.clearTimeout(timer) } = {}) {
    this.onPhase = onPhase || (() => {});
    this.reducedMotion = reducedMotion;
    this.schedule = schedule;
    this.cancel = cancel;
    this.token = 0;
    this.timers = [];
  }

  stop({ emitIdle = false, context = null } = {}) {
    this.token += 1;
    this.timers.forEach((timer) => this.cancel(timer));
    this.timers = [];
    if (emitIdle) this.onPhase("idle", context, this.token);
    return this.token;
  }

  start(context) {
    const token = this.stop();
    const reduced = Boolean(this.reducedMotion());
    const actionDelay = reduced ? 500 : 850;
    const doneDelay = reduced ? 1150 : 1950;
    this.onPhase("event", context, token);
    this.timers.push(this.schedule(() => {
      if (token === this.token) this.onPhase("action", context, token);
    }, actionDelay));
    this.timers.push(this.schedule(() => {
      if (token === this.token) this.onPhase("done", context, token);
    }, doneDelay));
    return token;
  }
}
