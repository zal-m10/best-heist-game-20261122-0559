// Staged frames for ?shot=cover|sneak|alarm|getaway. Each scene runs the
// live rules forward from a clean world for a fixed number of steps, guided
// by a driver that reads the world's danger map rather than a fixed pose.
// That way the frame is what a real run looks like, and one seed always
// yields one frame. The cover holds the whole vault in a single view: the
// thief inside, watchmen and domes sweeping, all three prizes glowing, the
// alarm meter alive.

import { STEP, THIEF } from "./config.js";
import { EXIT } from "./levels.js";
import { EVENT_LOOT, EVENT_OVER, EVENT_WIN } from "./world.js";
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from "./render.js";

const AHEAD_STEP = 1 / 30;
const DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Choose a step for the driver. It heads for the current goal — the closest
// prize still on its stand, then the doors — but never walks into a cone it
// can see. When a watchman gives chase, it runs for the nearest dim corner
// instead. Returns the step plus whether to sneak.
function steer(world) {
  const state = world.state;
  const thief = state.thief;
  const chaser = state.guards.find((guard) => guard.state === "chase");
  const prizesLeft = state.loot.some((prize) => !prize.taken);
  const doorPoint = { x: EXIT.x + EXIT.w / 2, y: EXIT.y + 10 };
  let goal;
  if (chaser) {
    goal = prizesLeft ? { x: thief.x < 640 ? 150 : 1130, y: 600 } : doorPoint;
  } else {
    const next = state.loot.find((prize) => !prize.taken);
    goal = next ? { x: next.x, y: next.y } : doorPoint;
  }
  const close = state.loot.find((prize) => {
    return !prize.taken && Math.hypot(thief.x - prize.x, thief.y - prize.y) < 46;
  });
  if (close && !chaser) {
    return { move: { x: 0, y: 0 }, sneak: false, grab: true, sprint: false };
  }
  const dangerWeight = prizesLeft ? 300 : 60;
  let choice = { x: 0, y: 0 };
  let choiceScore = -Infinity;
  for (const dir of DIRS) {
    const nx = thief.x + dir[0] * THIEF.walkSpeed * AHEAD_STEP;
    const ny = thief.y + dir[1] * AHEAD_STEP * THIEF.walkSpeed;
    const danger = world.threatAt(nx, ny);
    const closing = Math.hypot(goal.x - nx, goal.y - ny);
    const still = dir[0] === 0 && dir[1] === 0 ? 4 : 0;
    const score = -closing - danger * dangerWeight - still;
    if (score > choiceScore) {
      choiceScore = score;
      choice = { x: dir[0], y: dir[1] };
    }
  }
  const nearest = Math.min(...state.guards.map((guard) => {
    return Math.hypot(guard.x - thief.x, guard.y - thief.y);
  }));
  return {
    move: choice,
    sneak: nearest < 240,
    grab: false,
    sprint: !prizesLeft || Boolean(chaser),
  };
}

// Run the world forward for `seconds`, steered by the driver, and hand back
// the events that fired. Stops early on a win or a bust.
function advance(world, seconds) {
  const total = Math.floor(seconds / STEP);
  let fired = 0;
  for (let index = 0; index < total; index += 1) {
    const pick = steer(world);
    fired = world.step(STEP, pick.move, pick.sneak, pick.sprint, pick.grab, null, false, false);
    if (fired & (EVENT_WIN | EVENT_OVER)) break;
  }
  return fired;
}

// Put `world` into the named scene and hand back the screen to paint over
// it and the best score to show. Any other name stages the cover.
export function stageShot(name, world) {
  world.reset();
  if (name === "sneak") {
    advance(world, 12);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === "alarm") {
    advance(world, 10);
    const state = world.state;
    const vera = state.guards[1];
    let far = vera.waypoints[0];
    let farDist = -1;
    for (const point of vera.waypoints) {
      const dist = Math.hypot(vera.x - point[0], vera.y - point[1]);
      if (dist > farDist) {
        farDist = dist;
        far = point;
      }
    }
    state.thief.x = far[0];
    state.thief.y = far[1];
    state.thief.face = Math.PI;
    for (let index = 0; index < Math.floor(12 / STEP); index += 1) {
      let move = { x: 0, y: 0 };
      let sprint = false;
      if (vera.state === "chase") {
        const dx = state.thief.x - vera.x;
        const dy = state.thief.y - vera.y;
        const dist = Math.hypot(dx, dy) || 1;
        move = { x: dx / dist, y: dy / dist };
        sprint = true;
      }
      world.step(STEP, move, false, sprint, false, null, false, false);
      if (vera.state === "chase" && state.heat >= 45) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === "getaway") {
    const fired = advance(world, 280);
    if (fired & EVENT_WIN) {
      return { screen: SCREEN_WIN, best: world.state.winScore };
    }
    advance(world, 120);
    return {
      screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY,
      best: world.state.winScore || 0,
    };
  }
  advance(world, 8);
  return { screen: SCREEN_PLAY, best: 0 };
}
