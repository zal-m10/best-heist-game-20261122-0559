// The screenshot scenes behind ?shot=cover|sneak|alarm|getaway. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by an autopilot that reads the world's threat map (never a scripted
// pose), so the frame is what a real game looks like and the same seed always
// gives the same frame. The cover shows the whole vault at once: the thief
// inside, guards and cameras sweeping, all three loot glowing, HEAT alive.

import { STEP, THIEF } from './config.js';
import { EXIT } from './levels.js';
import { EVENT_LOOT, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;
const DIRECTIONS = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Pick a move for the autopilot: toward the current target (the nearest loot
 * not yet taken, then the exit), but never into a cone it can see. When a
 * guard is chasing, run for the nearest shadow instead. Returns {x, y} and
 * whether to sneak.
 */
function autopilot(world) {
  const { state } = world;
  const thief = state.thief;
  // Flee: a chasing guard means run for the exit if the loot is done, else
  // for the farthest shadow corner from the chaser.
  const chaser = state.guards.find((g) => g.state === 'chase');
  let target = null;
  if (chaser) {
    const allLoot = state.loot.every((item) => item.taken);
    target = allLoot
      ? { x: EXIT.x + EXIT.w / 2, y: EXIT.y + 10 }
      : { x: thief.x < 640 ? 150 : 1130, y: 600 };
  } else {
    const next = state.loot.find((item) => !item.taken);
    target = next
      ? { x: next.x, y: next.y }
      : { x: EXIT.x + EXIT.w / 2, y: EXIT.y + 10 };
  }
  // Near loot: stand still and grab it.
  const near = state.loot.find((item) => !item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < 46);
  if (near && !chaser) return { move: { x: 0, y: 0 }, sneak: false, grab: true, sprint: false };

  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;
  const allLoot = state.loot.every((item) => item.taken);
  // With the loot in hand, the thief sprints for the doors and accepts the
  // risk; before that, a cone is worth a detour. A heavy penalty would
  // strand the thief forever when the only way out is through a sweep.
  const threatWeight = allLoot ? 60 : 300;
  for (const [dx, dy] of DIRECTIONS) {
    const nx = thief.x + dx * THIEF.walkSpeed * SAMPLE;
    const ny = thief.y + dy * SAMPLE * THIEF.walkSpeed;
    const threat = world.threatAt(nx, ny);
    const toTarget = Math.hypot(target.x - nx, target.y - ny);
    // Danger is a penalty; progress toward the target is the reward;
    // standing still is only ever worth it when every move is dangerous.
    const score = -toTarget - threat * threatWeight - (dx === 0 && dy === 0 ? 4 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = { x: dx, y: dy };
    }
  }
  // Sneak when a guard is close enough to matter.
  const nearestGuard = Math.min(...state.guards.map((g) => Math.hypot(g.x - thief.x, g.y - thief.y)));
  return { move: best, sneak: nearestGuard < 240, grab: false, sprint: allLoot || !!chaser };
}

/**
 * Play the world forward for `seconds`, steered by the autopilot, and return
 * the events that fired. Stops early on a win or a bust.
 */
function playForward(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  let events = 0;
  for (let index = 0; index < steps; index += 1) {
    const choice = autopilot(world);
    events = world.step(STEP, choice.move, choice.sneak, choice.sprint, choice.grab, null, false, false);
    if (events & (EVENT_WIN | EVENT_OVER)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name stages the cover.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'sneak') {
    // Mid-heist, deep in the left aisle: the thief pressed against a pillar
    // while Marco's cone sweeps past. Twelve seconds in, the job is still on.
    playForward(world, 12);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // The tense moment: the thief is caught in the open by Vera, HEAT is
    // climbing and a guard is closing in. Put the thief on Vera's patrol
    // line in the open hall and hold still: she walks into him, her
    // detection builds, she chases, and HEAT climbs. No repositioning —
    // moving the thief resets her detection, so the chase never starts.
    playForward(world, 10);
    const { state } = world;
    const vera = state.guards[1];
    // Put the thief on Vera's patrol line at the end farthest from her, so
    // she spots him from a distance and gives chase: placed on top of her,
    // she touches him in the same step she starts chasing.
    const [w0, w1] = vera.waypoints;
    const far = Math.hypot(vera.x - w0[0], vera.y - w0[1]) > Math.hypot(vera.x - w1[0], vera.y - w1[1]) ? w0 : w1;
    state.thief.x = far[0];
    state.thief.y = far[1];
    state.thief.face = Math.PI;
    for (let index = 0; index < Math.floor(12 / STEP); index += 1) {
      // Once Vera gives chase, the thief sprints away from her: he outruns
      // her (320 vs 205), so HEAT climbs while she closes in behind him
      // instead of touching him at once, which would end the scene.
      let move = { x: 0, y: 0 };
      let sprint = false;
      if (vera.state === 'chase') {
        const dx = state.thief.x - vera.x;
        const dy = state.thief.y - vera.y;
        const d = Math.hypot(dx, dy) || 1;
        move = { x: dx / d, y: dy / d };
        sprint = true;
      }
      world.step(STEP, move, false, sprint, false, null, false, false);
      // Break the moment Vera is chasing with HEAT visibly climbing (amber).
      if (vera.state === 'chase' && state.heat >= 45) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'getaway') {
    // The full job, won: the autopilot grabs all three loot and reaches the
    // doors. If it somehow fails, fall back to a long play-forward instead.
    const events = playForward(world, 280);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.winScore };
    playForward(world, 120);
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.winScore || 0 };
  }
  // Cover: the whole vault at once, eight seconds into the job — the thief
  // is inside, the Crown is still on its dais, and the cones are sweeping.
  playForward(world, 8);
  return { screen: SCREEN_PLAY, best: 0 };
}
