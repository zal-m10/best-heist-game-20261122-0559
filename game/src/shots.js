// The staged frames behind ?shot=cover|sneak|alarm|getaway. Every scene runs
// the live rules ahead from a clean world for a set number of steps, driven
// by a guide that reads the world's danger map (never a fixed pose), so the
// frame is what a real run looks like and one seed always yields one frame.
// The cover holds the whole vault in one view: the thief inside, watchmen
// and domes sweeping, all three prizes glowing, the alarm meter alive.

import { STEP, THIEF } from './config.js';
import { EXIT } from './levels.js';
import { EVENT_LOOT, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const TICK = 1 / 30;
const MOVES = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Choose a step for the guide: head for the current goal (the closest prize
 * still on its stand, then the doors), but never walk into a cone it can
 * see. When a watchman gives chase, run for the nearest dim corner instead.
 * Returns the step and whether to sneak.
 */
function guide(world) {
  const { state } = world;
  const thief = state.thief;
  // Fleeing: a chasing watchman means run for the doors once the prizes are
  // in hand, else for the far dim corner away from the chaser.
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
  // Close to a prize: hold still and lift it.
  const near = state.loot.find((item) => !item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < 46);
  if (near && !chaser) return { move: { x: 0, y: 0 }, sneak: false, grab: true, sprint: false };

  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;
  const allLoot = state.loot.every((item) => item.taken);
  // Prizes in hand, the thief sprints for the doors and takes the risk;
  // before that, a cone is worth a wide berth. Too stiff a penalty would
  // strand the thief whenever the only way out crosses a sweep.
  const threatWeight = allLoot ? 60 : 300;
  for (const [dx, dy] of MOVES) {
    const nx = thief.x + dx * THIEF.walkSpeed * TICK;
    const ny = thief.y + dy * TICK * THIEF.walkSpeed;
    const threat = world.threatAt(nx, ny);
    const toTarget = Math.hypot(target.x - nx, target.y - ny);
    // Danger counts against a step; closing on the goal counts for it;
    // holding still only pays when every step is dangerous.
    const score = -toTarget - threat * threatWeight - (dx === 0 && dy === 0 ? 4 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = { x: dx, y: dy };
    }
  }
  // Sneak once a watchman is near enough to care about.
  const nearestGuard = Math.min(...state.guards.map((g) => Math.hypot(g.x - thief.x, g.y - thief.y)));
  return { move: best, sneak: nearestGuard < 240, grab: false, sprint: allLoot || !!chaser };
}

/**
 * Run the world ahead for `seconds`, steered by the guide, and hand back
 * the events that fired. Stops early on a win or a bust.
 */
function runAhead(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  let events = 0;
  for (let index = 0; index < steps; index += 1) {
    const choice = guide(world);
    events = world.step(STEP, choice.move, choice.sneak, choice.sprint, choice.grab, null, false, false);
    if (events & (EVENT_WIN | EVENT_OVER)) break;
  }
  return events;
}

/**
 * Put `world` into the named scene and hand back the screen to paint over it
 * and the best score to show. Any other name stages the cover.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'sneak') {
    // Mid-job, deep in the left aisle: the thief flat against a pillar while
    // Marco's cone sweeps by. Twelve seconds in, the job is still alive.
    runAhead(world, 12);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // The tense beat: the thief caught out in the open by Vera, HEAT rising
    // and a watchman closing in. Set the thief on Vera's patrol line in the
    // open hall and hold still: she walks into him, her wariness builds, she
    // chases, and HEAT climbs. No repositioning — moving the thief clears her
    // wariness, so the chase never starts.
    runAhead(world, 10);
    const { state } = world;
    const vera = state.guards[1];
    // Set the thief on Vera's patrol line at the end farthest from her, so
    // she spots him from afar and gives chase: set on top of her, she lays
    // a hand on him in the same step she starts chasing.
    const [w0, w1] = vera.waypoints;
    const far = Math.hypot(vera.x - w0[0], vera.y - w0[1]) > Math.hypot(vera.x - w1[0], vera.y - w1[1]) ? w0 : w1;
    state.thief.x = far[0];
    state.thief.y = far[1];
    state.thief.face = Math.PI;
    for (let index = 0; index < Math.floor(12 / STEP); index += 1) {
      // Once Vera gives chase, the thief sprints straight away from her: he
      // outruns her (320 vs 205), so HEAT climbs while she closes in behind
      // him instead of catching him at once, which would end the scene.
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
      // Stop the moment Vera is chasing with HEAT plainly climbing (amber).
      if (vera.state === 'chase' && state.heat >= 45) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'getaway') {
    // The whole job, won: the guide lifts all three prizes and reaches the
    // doors. If it somehow fails, fall back to a long run-ahead instead.
    const events = runAhead(world, 280);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.winScore };
    runAhead(world, 120);
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.winScore || 0 };
  }
  // Cover: the whole vault at once, eight seconds into the job — the thief
  // is inside, the Crown is still on its stand, and the cones are sweeping.
  runAhead(world, 8);
  return { screen: SCREEN_PLAY, best: 0 };
}
