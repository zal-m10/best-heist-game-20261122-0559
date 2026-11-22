// THE AURUM JOB — the world: game state and one fixed step of simulation.
// Pure logic, no drawing and no sound: the autopilot and the live game step
// the same world. Guards patrol, grow suspicious, then chase; cameras sweep
// and raise HEAT; lasers pulse; tools cost their count; HEAT is the alarm.

import {
  CAMERA, GRACE_SECONDS, GUARD, HALL, HEAT, LASER, LOOT, SCORE,
  STRIKES_MAX, THIEF, TOOLS,
} from './config.js';
import {
  CAMERAS, CASES, DAIS, EXIT, GUARDS, LASERS, LOOT_SPOTS, PILLARS, SHADOWS,
  START, WALLS,
} from './levels.js';

const TAU = Math.PI * 2;

export const EVENT_LOOT = 1;
export const EVENT_STRIKE = 2;
export const EVENT_ALARM = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_SPOTTED = 32;
export const EVENT_LASER = 64;
export const EVENT_TOOL = 128;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function pointInCircle(x, y, c) {
  return dist(x, y, c.x, c.y) <= c.r;
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? (Either end inside,
// or it cuts one of the four edges.)
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  return (
    segmentsCross(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Does the segment pass within the circle? (Distance from the centre to the
// segment, against the radius.)
function segmentHitsCircle(x1, y1, x2, y2, c) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((c.x - x1) * dx + (c.y - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(x1 + dx * t, y1 + dy * t, c.x, c.y) <= c.r;
}

// Push a circle (x, y, r) out of a rectangle it overlaps. Returns true if it moved.
function pushOutOfRect(body, r) {
  const closestX = clamp(body.x, r.x, r.x + r.w);
  const closestY = clamp(body.y, r.y, r.y + r.h);
  const dx = body.x - closestX;
  const dy = body.y - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= body.r * body.r) return false;
  if (d2 === 0) {
    // Centre inside the rectangle: push out along the shortest side.
    const left = body.x - r.x;
    const right = r.x + r.w - body.x;
    const top = body.y - r.y;
    const bottom = r.y + r.h - body.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) body.x = r.x - body.r;
    else if (min === right) body.x = r.x + r.w + body.r;
    else if (min === top) body.y = r.y - body.r;
    else body.y = r.y + r.h + body.r;
    return true;
  }
  const d = Math.sqrt(d2);
  body.x = closestX + (dx / d) * body.r;
  body.y = closestY + (dy / d) * body.r;
  return true;
}

function pushOutOfCircle(body, c) {
  const dx = body.x - c.x;
  const dy = body.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = body.r + c.r;
  if (d >= min || d === 0) return false;
  body.x = c.x + (dx / d) * min;
  body.y = c.y + (dy / d) * min;
  return true;
}

// Is the point inside a shadow zone (detection is slower there)?
function inShadow(x, y) {
  for (const s of SHADOWS) if (pointInRect(x, y, s)) return true;
  return false;
}

export function createWorld(random) {
  const thief = {
    x: START.x, y: START.y, r: THIEF.radius,
    face: -Math.PI / 2, moving: false, sneaking: false, sprinting: false,
    grace: 0, grabProgress: 0, grabbing: null,
  };
  const guards = GUARDS.map((g, index) => ({
    id: g.id, name: g.name,
    x: g.waypoints[g.start][0], y: g.waypoints[g.start][1], r: GUARD.radius,
    waypoints: g.waypoints, waypoint: (g.start + 1) % g.waypoints.length,
    face: 0, state: 'patrol', detect: 0,
    lastSeenX: 0, lastSeenY: 0, investigateTimer: 0, chaseTimer: 0,
    index,
  }));
  const cameras = CAMERAS.map((c) => ({
    id: c.id, x: c.x, y: c.y, baseAngle: c.baseAngle, sweep: c.sweep,
    speed: c.speed, phase: c.phase, angle: c.baseAngle, jammedUntil: 0,
  }));
  const lasers = LASERS.map((l) => ({ ...l, on: false, cooldown: 0 }));
  const loot = LOOT_SPOTS.map((s) => ({ ...s, taken: false }));
  const smokes = [];
  const coins = [];

  const state = {
    thief, guards, cameras, lasers, loot, smokes, coins,
    heat: 0, strikes: 0, score: 0, elapsed: 0,
    coinsLeft: TOOLS.coins, smokeLeft: TOOLS.smoke, jammersLeft: TOOLS.jammers,
    lockdownUntil: 0, alarmFlash: 0, won: false, over: false,
    spotted: false, ghost: true, noiseX: 0, noiseY: 0, noiseUntil: 0,
    winScore: 0, winBreakdown: '',
  };

  function reset() {
    thief.x = START.x;
    thief.y = START.y;
    thief.face = -Math.PI / 2;
    thief.moving = false;
    thief.sneaking = false;
    thief.sprinting = false;
    thief.grace = 0;
    thief.grabProgress = 0;
    thief.grabbing = null;
    for (const g of guards) {
      g.x = g.waypoints[0][0];
      g.y = g.waypoints[0][1];
      g.waypoint = 1 % g.waypoints.length;
      g.face = 0;
      g.state = 'patrol';
      g.detect = 0;
      g.investigateTimer = 0;
      g.chaseTimer = 0;
    }
    for (const c of cameras) {
      c.angle = c.baseAngle;
      c.jammedUntil = 0;
    }
    for (const l of lasers) {
      l.on = false;
      l.cooldown = 0;
    }
    for (const item of loot) item.taken = false;
    smokes.length = 0;
    coins.length = 0;
    state.heat = 0;
    state.strikes = 0;
    state.score = 0;
    state.elapsed = 0;
    state.coinsLeft = TOOLS.coins;
    state.smokeLeft = TOOLS.smoke;
    state.jammersLeft = TOOLS.jammers;
    state.lockdownUntil = 0;
    state.alarmFlash = 0;
    state.won = false;
    state.over = false;
    state.spotted = false;
    state.ghost = true;
    state.noiseUntil = 0;
    state.winScore = 0;
    state.winBreakdown = '';
  }

  // True when nothing solid stands between the two points. Smoke also blocks
  // sight: a segment through a smoke cloud sees nothing past it.
  function hasLineOfSight(x1, y1, x2, y2) {
    for (const w of WALLS) if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
    for (const p of PILLARS) if (segmentHitsCircle(x1, y1, x2, y2, p)) return false;
    for (const c of CASES) if (segmentHitsRect(x1, y1, x2, y2, c)) return false;
    for (const s of smokes) if (segmentHitsCircle(x1, y1, x2, y2, { x: s.x, y: s.y, r: s.r })) return false;
    return true;
  }

  function moveBody(body, dx, dy, solidDais) {
    body.x += dx;
    body.y += dy;
    for (const w of WALLS) pushOutOfRect(body, w);
    for (const p of PILLARS) pushOutOfCircle(body, p);
    for (const c of CASES) pushOutOfRect(body, c);
    // The dais is a raised platform: the thief steps onto it to take the
    // crown, but the watch walks around it.
    if (solidDais) pushOutOfRect(body, DAIS);
    body.x = clamp(body.x, HALL.x + body.r, HALL.x + HALL.w - body.r);
    body.y = clamp(body.y, HALL.y + body.r, HALL.y + HALL.h - body.r);
  }

  function inCone(ox, oy, face, range, halfAngle, tx, ty) {
    const d = dist(ox, oy, tx, ty);
    if (d > range) return false;
    if (d < 1) return true;
    return Math.abs(angleDiff(Math.atan2(ty - oy, tx - ox), face)) <= halfAngle;
  }

  function strike(reason) {
    state.strikes += 1;
    state.heat = HEAT.strikeReset;
    state.lockdownUntil = state.elapsed + HEAT.lockdownSeconds;
    state.alarmFlash = 1;
    state.ghost = false;
    thief.grabProgress = 0;
    thief.grabbing = null;
    // The guard drags the thief back to the doors; the room resets its watch.
    thief.x = START.x;
    thief.y = START.y;
    thief.grace = GRACE_SECONDS;
    for (const g of guards) {
      g.state = 'patrol';
      g.detect = 0;
      g.waypoint = 0;
      g.x = g.waypoints[0][0];
      g.y = g.waypoints[0][1];
    }
    if (state.strikes >= STRIKES_MAX) {
      state.over = true;
      return EVENT_STRIKE | EVENT_OVER;
    }
    return EVENT_STRIKE | EVENT_ALARM;
  }

  function throwCoin(tx, ty) {
    if (state.coinsLeft <= 0) return 0;
    state.coinsLeft -= 1;
    coins.push({ x: thief.x, y: thief.y, tx, ty, t: 0, landed: false });
    return EVENT_TOOL;
  }

  function throwSmoke() {
    if (state.smokeLeft <= 0) return 0;
    state.smokeLeft -= 1;
    smokes.push({ x: thief.x, y: thief.y, r: 95, left: TOOLS.smokeSeconds });
    return EVENT_TOOL;
  }

  function jamCameras() {
    if (state.jammersLeft <= 0) return 0;
    state.jammersLeft -= 1;
    for (const c of cameras) c.jammedUntil = state.elapsed + CAMERA.jamSeconds;
    return EVENT_TOOL;
  }

  /**
   * One fixed step. `move` is {x, y} (a unit-ish direction), `sneak` and
   * `sprint` are held keys, `grab` is E held, `coin` is a click point or null,
   * `smoke`/`jam` are one-shot actions. Returns event flags.
   */
  function step(dt, move, sneak, sprint, grab, coin, smoke, jam) {
    let events = 0;
    if (state.won || state.over) return events;
    state.elapsed += dt;
    if (state.alarmFlash > 0) state.alarmFlash = Math.max(0, state.alarmFlash - dt * 1.5);

    if (coin) events |= throwCoin(coin.x, coin.y);
    if (smoke) events |= throwSmoke();
    if (jam) events |= jamCameras();

    // --- the thief -------------------------------------------------------
    const speed = sneak ? THIEF.sneakSpeed : sprint ? THIEF.sprintSpeed : THIEF.walkSpeed;
    thief.sneaking = sneak;
    thief.sprinting = sprint;
    thief.moving = move.x !== 0 || move.y !== 0;
    if (thief.moving) {
      const len = Math.hypot(move.x, move.y) || 1;
      const nx = move.x / len;
      const ny = move.y / len;
      thief.face = Math.atan2(ny, nx);
      moveBody(thief, nx * speed * dt, ny * speed * dt);
      if (sprint) {
        state.noiseX = thief.x;
        state.noiseY = thief.y;
        state.noiseUntil = state.elapsed + 0.35;
      }
    }
    if (thief.grace > 0) thief.grace = Math.max(0, thief.grace - dt);

    // Smoke clouds fade.
    for (let i = smokes.length - 1; i >= 0; i -= 1) {
      smokes[i].left -= dt;
      if (smokes[i].left <= 0) smokes.splice(i, 1);
    }
    // Coins fly to their target, then clink and draw the nearest guard.
    for (let i = coins.length - 1; i >= 0; i -= 1) {
      const c = coins[i];
      if (!c.landed) {
        c.t += dt * 3;
        if (c.t >= 1) {
          c.landed = true;
          c.x = c.tx;
          c.y = c.ty;
          let best = null;
          let bestD = TOOLS.coinHearRadius;
          for (const g of guards) {
            const d = dist(g.x, g.y, c.x, c.y);
            if (d < bestD) {
              bestD = d;
              best = g;
            }
          }
          if (best) {
            best.state = 'investigate';
            best.lastSeenX = c.x;
            best.lastSeenY = c.y;
            best.investigateTimer = GUARD.investigateSeconds;
          }
        } else {
          c.x = thief.x + (c.tx - thief.x) * c.t;
          c.y = thief.y + (c.ty - thief.y) * c.t;
        }
      } else {
        c.left = (c.left ?? 0.6) - dt;
        if (c.left <= 0) coins.splice(i, 1);
      }
    }

    // --- lasers ----------------------------------------------------------
    const laserPhase = (state.elapsed % LASER.period) / LASER.period;
    for (const l of lasers) {
      const local = (laserPhase + l.phase / LASER.period) % 1;
      l.on = local < LASER.onFraction;
      if (l.cooldown > 0) l.cooldown -= dt;
      if (l.on && l.cooldown <= 0) {
        // The thief's circle crossing the beam segment.
        const dx = 0;
        const dy = l.y2 - l.y1;
        const len2 = dy * dy;
        let t = len2 === 0 ? 0 : ((thief.x - l.x) * dx + (thief.y - l.y1) * dy) / len2;
        t = clamp(t, 0, 1);
        const d = dist(thief.x, thief.y, l.x, l.y1 + dy * t);
        if (d < thief.r + 3) {
          l.cooldown = 0.6;
          state.heat = Math.min(HEAT.max, state.heat + LASER.heatOnCross);
          events |= EVENT_LASER;
          // The zap draws the nearest guard to the dais.
          let best = null;
          let bestD = Infinity;
          for (const g of guards) {
            const gd = dist(g.x, g.y, l.x, l.y1 + dy * t);
            if (gd < bestD) {
              bestD = gd;
              best = g;
            }
          }
          if (best && best.state !== 'chase') {
            best.state = 'investigate';
            best.lastSeenX = l.x;
            best.lastSeenY = l.y1 + dy * t;
            best.investigateTimer = GUARD.investigateSeconds;
          }
        }
      }
    }

    // --- cameras ---------------------------------------------------------
    let cameraSees = false;
    for (const c of cameras) {
      const jammed = state.elapsed < c.jammedUntil;
      if (!jammed) {
        c.angle = c.baseAngle + Math.sin(state.elapsed * c.speed + c.phase) * (c.sweep / 2);
        if (
          thief.grace === 0 &&
          inCone(c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle, thief.x, thief.y) &&
          hasLineOfSight(c.x, c.y, thief.x, thief.y)
        ) {
          cameraSees = true;
        }
      }
    }
    if (cameraSees) state.heat = Math.min(HEAT.max, state.heat + CAMERA.heatPerSecond * dt);

    // --- guards ----------------------------------------------------------
    let anyAlert = false;
    for (const g of guards) {
      const sees =
        thief.grace === 0 &&
        inCone(g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle, thief.x, thief.y) &&
        hasLineOfSight(g.x, g.y, thief.x, thief.y);
      const shadow = inShadow(thief.x, thief.y);
      if (sees) {
        const rate = (sneak ? GUARD.detectSneak : sprint ? GUARD.detectSprint : GUARD.detectWalk) * (shadow ? GUARD.detectShadow : 1);
        g.detect = Math.min(1, g.detect + rate * dt);
        g.lastSeenX = thief.x;
        g.lastSeenY = thief.y;
      } else {
        g.detect = Math.max(0, g.detect - GUARD.detectFalloff * dt);
      }

      if (g.detect >= GUARD.alertAt) {
        if (g.state !== 'chase') {
          g.state = 'chase';
          g.chaseTimer = 0;
          if (!state.spotted) {
            state.spotted = true;
            events |= EVENT_SPOTTED;
          }
        }
      } else if (g.detect >= GUARD.suspiciousAt && g.state === 'patrol') {
        g.state = 'investigate';
        g.investigateTimer = GUARD.investigateSeconds;
      }

      // Sprint noise draws a nearby patrol guard to the sound.
      if (state.elapsed < state.noiseUntil && g.state === 'patrol' && dist(g.x, g.y, state.noiseX, state.noiseY) < 260) {
        g.state = 'investigate';
        g.lastSeenX = state.noiseX;
        g.lastSeenY = state.noiseY;
        g.investigateTimer = GUARD.investigateSeconds;
      }

      // Move by state.
      if (g.state === 'patrol') {
        const target = g.waypoints[g.waypoint];
        const d = dist(g.x, g.y, target[0], target[1]);
        if (d < 6) {
          g.waypoint = (g.waypoint + 1) % g.waypoints.length;
        } else {
          const nx = (target[0] - g.x) / d;
          const ny = (target[1] - g.y) / d;
          g.face = Math.atan2(ny, nx);
          moveBody(g, nx * GUARD.patrolSpeed * dt, ny * GUARD.patrolSpeed * dt, true);
        }
      } else if (g.state === 'investigate') {
        const d = dist(g.x, g.y, g.lastSeenX, g.lastSeenY);
        if (d < 10) {
          g.investigateTimer -= dt;
          // Look around while searching.
          g.face += dt * 1.6;
          if (g.investigateTimer <= 0) {
            g.state = 'patrol';
            g.detect = Math.min(g.detect, GUARD.suspiciousAt - 0.05);
          }
        } else {
          const nx = (g.lastSeenX - g.x) / d;
          const ny = (g.lastSeenY - g.y) / d;
          g.face = Math.atan2(ny, nx);
          moveBody(g, nx * GUARD.investigateSpeed * dt, ny * GUARD.investigateSpeed * dt, true);
        }
      } else if (g.state === 'chase') {
        const d = dist(g.x, g.y, thief.x, thief.y);
        if (d > 1) {
          const nx = (thief.x - g.x) / d;
          const ny = (thief.y - g.y) / d;
          g.face = Math.atan2(ny, nx);
          moveBody(g, nx * GUARD.chaseSpeed * dt, ny * GUARD.chaseSpeed * dt, true);
        }
        g.chaseTimer += dt;
        if (g.detect < GUARD.suspiciousAt && g.chaseTimer > 2.5) {
          g.state = 'investigate';
          g.investigateTimer = GUARD.investigateSeconds;
          g.chaseTimer = 0;
        }
        anyAlert = true;
        // Caught: a chasing guard touches the thief.
        if (thief.grace === 0 && dist(g.x, g.y, thief.x, thief.y) < GUARD.touchDistance) {
          return events | strike('caught');
        }
      }
    }

    // HEAT: an alert guard drives it up fast; otherwise it cools off.
    if (anyAlert) state.heat = Math.min(HEAT.max, state.heat + HEAT.guardAlertPerSecond * dt);
    else if (!cameraSees) state.heat = Math.max(0, state.heat - HEAT.falloffPerSecond * dt);

    // The alarm trips at full HEAT.
    if (state.heat >= HEAT.max) {
      return events | strike('alarm');
    }

    // --- loot ------------------------------------------------------------
    const nearLoot = loot.find((item) => !item.taken && dist(thief.x, thief.y, item.x, item.y) < 46);
    if (grab && nearLoot && thief.grace === 0) {
      if (thief.grabbing !== nearLoot.id) {
        thief.grabbing = nearLoot.id;
        thief.grabProgress = 0;
      }
      thief.grabProgress += dt / THIEF.grabSeconds;
      if (thief.grabProgress >= 1) {
        nearLoot.taken = true;
        state.score += nearLoot.points;
        thief.grabProgress = 0;
        thief.grabbing = null;
        events |= EVENT_LOOT;
      }
    } else {
      thief.grabProgress = 0;
      thief.grabbing = null;
    }

    // --- win ---------------------------------------------------------------
    const allLoot = loot.every((item) => item.taken);
    const locked = state.elapsed < state.lockdownUntil;
    if (allLoot && !locked && pointInRect(thief.x, thief.y, EXIT)) {
      state.won = true;
      const timeBonus = Math.max(0, Math.round(SCORE.timeBonusMax * (1 - state.elapsed / SCORE.timeBonusSeconds)));
      const ghostBonus = state.ghost ? SCORE.ghostBonus : 0;
      state.winScore = state.score + timeBonus + ghostBonus;
      state.winBreakdown = `Loot ${state.score} + Speed ${timeBonus}${ghostBonus ? ` + Ghost ${ghostBonus}` : ''}`;
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  // How dangerous a point is right now: 1 in a guard's cone with sight, 0.7
  // in a camera's cone with sight, 0.5 on a live laser beam, 0 otherwise.
  // The screenshot autopilot steers by it; the live game never calls it.
  function threatAt(x, y) {
    let threat = 0;
    for (const g of guards) {
      if (inCone(g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle, x, y) && hasLineOfSight(g.x, g.y, x, y)) {
        threat = Math.max(threat, 1);
      }
    }
    for (const c of cameras) {
      if (state.elapsed < c.jammedUntil) continue;
      if (inCone(c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle, x, y) && hasLineOfSight(c.x, c.y, x, y)) {
        threat = Math.max(threat, 0.7);
      }
    }
    for (const l of lasers) {
      if (!l.on) continue;
      if (Math.abs(x - l.x) < THIEF.radius + 3 && y >= l.y1 && y <= l.y2) threat = Math.max(threat, 0.5);
    }
    return threat;
  }

  return { state, reset, step, hasLineOfSight, threatAt };
}
