// THE AURUM JOB — the painter, rewritten: the world state in, pixels out.
// A single 1280 by 720 vault hall, fitted and centred in the window. Deep
// navy floor with a gold medallion, marble pillars, glass cases, velvet
// rope, the crown dais, green doors, amber watch cones, red domes, three
// glowing prizes, and two upright three-quarter figures — the hooded thief
// and the uniformed watch. Gold means loot, amber means a guard's sight,
// red means a camera or a beam, green means the way out. The HUD rides the
// top edge, hints ride the bottom, and the title, pause, getaway and bust
// screens paint over the hall.

import {
  BOTTOM_BAR_H, CAMERA, FONT, GUARD, HALL, HEAT, PALETTE, STRIKES_MAX,
  TOP_BAR_H, VIEW_H, VIEW_W,
} from './config.js';
import {
  CAMERAS, CASES, DAIS, EXIT, LASERS, LOOT_SPOTS, PILLARS, ROPES, SHADOWS,
  WALLS,
} from './levels.js';

export const SCREEN_TITLE = "title";
export const SCREEN_PLAY = "play";
export const SCREEN_PAUSED = "paused";
export const SCREEN_WIN = "win";
export const SCREEN_OVER = "over";

// The New Game button on the title screen, in 1280 by 720 view coordinates.
// main.js hit-tests clicks against these bounds.
export const NEW_GAME_BUTTON = { x: 490, y: 352, w: 300, h: 68 };

const TAU = Math.PI * 2;
const DARK_VEIL = "rgba(7, 10, 18, 0.82)";

// ---- small drawing helpers (top level, context passed in) ----

function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function hoop(ctx, x, y, r, stroke, w) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

function box(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function frame(ctx, x, y, w, h, stroke, lw) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

const fontCache = new Map();
function label(ctx, str, x, y, px, fill, align, base) {
  if (!fontCache.has(px)) fontCache.set(px, px + "px " + FONT);
  ctx.font = fontCache.get(px);
  ctx.fillStyle = fill;
  ctx.textAlign = align || "left";
  ctx.textBaseline = base || "alphabetic";
  ctx.fillText(str, x, y);
}

// A wedge path from (x, y) facing `face`, spanning `range` and `half`
// radians either side. The caller fills or strokes it.
function fan(ctx, x, y, face, range, half) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, face - half, face + half);
  ctx.closePath();
}

// The same rgba colour with a different alpha, for gradients.
function tint(rgba, alpha) {
  const m = /rgba\((\d+),\s*(\d+),\s*(\d+)/.exec(rgba);
  if (!m) return rgba;
  return "rgba(" + m[1] + ", " + m[2] + ", " + m[3] + ", " + alpha + ")";
}

// A cone of light: bright at the eye, fading to nothing at its range, so
// the room reads through it instead of being painted over.
function coneGlow(ctx, x, y, range, color, peak) {
  const g = ctx.createRadialGradient(x, y, 6, x, y, range);
  g.addColorStop(0, tint(color, peak));
  g.addColorStop(0.55, tint(color, peak * 0.5));
  g.addColorStop(1, tint(color, 0));
  return g;
}

// A rounded-rectangle path, drawn by hand so it works in any canvas.
function softRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---- the hall ----

function paintFloor(ctx) {
  box(ctx, 0, 0, VIEW_W, VIEW_H, PALETTE.floor);
  // Gold border inlay around the hall.
  ctx.strokeStyle = PALETTE.floorGold;
  ctx.lineWidth = 2;
  ctx.strokeRect(HALL.x + 8, HALL.y + 8, HALL.w - 16, HALL.h - 16);
  ctx.strokeStyle = "rgba(201, 162, 39, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(HALL.x + 16, HALL.y + 16, HALL.w - 32, HALL.h - 32);
  // The medallion: concentric gold rings under the crown dais, with spokes.
  const cx = DAIS.x;
  const cy = DAIS.y;
  ctx.strokeStyle = "rgba(201, 162, 39, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(201, 162, 39, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    ctx.lineTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150);
    ctx.stroke();
  }
  // Diamond inlays on the floor.
  ctx.fillStyle = "rgba(201, 162, 39, 0.18)";
  for (const pos of [[220, 560], [1060, 560], [220, 130], [1060, 130]]) {
    ctx.save();
    ctx.translate(pos[0], pos[1]);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
}

function paintShadows(ctx) {
  for (const s of SHADOWS) {
    box(ctx, s.x, s.y, s.w, s.h, PALETTE.shadowZone);
    ctx.strokeStyle = PALETTE.shadowEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  }
}

function paintWalls(ctx) {
  for (const w of WALLS) {
    box(ctx, w.x, w.y, w.w, w.h, PALETTE.wall);
    box(ctx, w.x, w.y, w.w, 3, PALETTE.wallTop);
  }
  // Gold trim along the top of the walls.
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(HALL.x, HALL.y + WALLS[0].h);
  ctx.lineTo(HALL.x + HALL.w, HALL.y + WALLS[0].h);
  ctx.stroke();
}

function paintCases(ctx) {
  for (const c of CASES) {
    box(ctx, c.x, c.y, c.w, c.h, PALETTE.caseBase);
    box(ctx, c.x + 3, c.y + 3, c.w - 6, c.h - 6, PALETTE.caseGlass);
    ctx.strokeStyle = PALETTE.caseFrame;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // A glint of gold inside each case.
    disc(ctx, c.x + c.w / 2, c.y + c.h / 2, 6, PALETTE.loot);
  }
}

function paintPillars(ctx) {
  for (const p of PILLARS) {
    disc(ctx, p.x, p.y, p.r + 3, PALETTE.pillarGold);
    disc(ctx, p.x, p.y, p.r, PALETTE.pillar);
    disc(ctx, p.x - 7, p.y - 7, p.r - 10, PALETTE.pillarDark);
    hoop(ctx, p.x, p.y, p.r - 4, PALETTE.pillarGold, 2);
  }
}

function paintRopes(ctx) {
  for (const r of ROPES) {
    ctx.strokeStyle = PALETTE.ropePost;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1 - 8);
    ctx.lineTo(r.x1, r.y1 + 8);
    ctx.moveTo(r.x3, r.y3 - 8);
    ctx.lineTo(r.x3, r.y3 + 8);
    ctx.stroke();
    disc(ctx, r.x1, r.y1 - 10, 4, PALETTE.ropePost);
    disc(ctx, r.x3, r.y3 - 10, 4, PALETTE.ropePost);
    ctx.strokeStyle = PALETTE.rope;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.quadraticCurveTo(r.x2, r.y2, r.x3, r.y3);
    ctx.stroke();
  }
}

function paintDais(ctx) {
  disc(ctx, DAIS.x, DAIS.y, DAIS.r + 6, PALETTE.floorGold);
  disc(ctx, DAIS.x, DAIS.y, DAIS.r, "#1a2340");
  hoop(ctx, DAIS.x, DAIS.y, DAIS.r - 6, PALETTE.floorGoldBright, 2);
}

function paintLasers(ctx, state) {
  for (const l of state.lasers) {
    // Emitter posts at each end.
    box(ctx, l.x - 4, l.y1 - 6, 8, 12, PALETTE.cameraBody);
    box(ctx, l.x - 4, l.y2 - 6, 8, 12, PALETTE.cameraBody);
    if (l.on) {
      ctx.strokeStyle = PALETTE.laserGlow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y1);
      ctx.lineTo(l.x, l.y2);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.laser;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y1);
      ctx.lineTo(l.x, l.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = PALETTE.laserOff;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(l.x, l.y1);
      ctx.lineTo(l.x, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function paintExit(ctx, state) {
  const sealed = state.elapsed < state.lockdownUntil;
  const color = sealed ? PALETTE.exitLocked : PALETTE.exit;
  box(ctx, EXIT.x, EXIT.y, EXIT.w, EXIT.h, color);
  box(ctx, EXIT.x + 4, EXIT.y + 4, EXIT.w - 8, EXIT.h - 8, PALETTE.exitDark);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  // The two doors.
  ctx.strokeStyle = PALETTE.hudText;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(EXIT.x + EXIT.w / 2, EXIT.y + 4);
  ctx.lineTo(EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h - 4);
  ctx.stroke();
  label(ctx, sealed ? "SEALED" : "EXIT", EXIT.x + EXIT.w / 2, EXIT.y - 8, 13, sealed ? PALETTE.hudAmber : PALETTE.hudGreen, "center");
  if (sealed) {
    const left = Math.ceil(state.lockdownUntil - state.elapsed);
    label(ctx, left + "s", EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h + 18, 13, PALETTE.hudAmber, "center");
  }
}

// ---- loot, cameras, guards, thief, tools ----

function paintLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    // Pulsing gold halo.
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 3 + item.x);
    ctx.fillStyle = "rgba(255, 217, 74, " + 0.22 * pulse + ")";
    ctx.beginPath();
    ctx.arc(item.x, item.y, 30 + 6 * pulse, 0, TAU);
    ctx.fill();
    if (item.id === "ledger") {
      // A big ledger: crimson cover, cream pages, gold spine and clasp,
      // ruled page lines, and a red ribbon bookmark.
      box(ctx, item.x - 15, item.y - 19, 30, 38, "#7a1f2b");
      box(ctx, item.x - 12, item.y - 16, 24, 32, "#f5e6c4");
      ctx.strokeStyle = PALETTE.loot;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(item.x - 13, item.y - 16);
      ctx.lineTo(item.x - 13, item.y + 16);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(item.x - 8, item.y - 8);
      ctx.lineTo(item.x + 8, item.y - 8);
      ctx.moveTo(item.x - 8, item.y);
      ctx.lineTo(item.x + 8, item.y);
      ctx.moveTo(item.x - 8, item.y + 8);
      ctx.lineTo(item.x + 8, item.y + 8);
      ctx.stroke();
      // Gold clasp on the fore-edge.
      box(ctx, item.x + 13, item.y - 3, 4, 6, PALETTE.loot);
      // Ribbon bookmark hanging from the bottom.
      ctx.fillStyle = "#a4123f";
      ctx.beginPath();
      ctx.moveTo(item.x + 4, item.y + 19);
      ctx.lineTo(item.x + 8, item.y + 19);
      ctx.lineTo(item.x + 8, item.y + 26);
      ctx.lineTo(item.x + 6, item.y + 23);
      ctx.lineTo(item.x + 4, item.y + 26);
      ctx.closePath();
      ctx.fill();
    } else if (item.id === "crown") {
      // The Aurum Crown, bigger and jewelled, on a velvet cushion.
      box(ctx, item.x - 23, item.y + 14, 46, 9, "#7a1f2b");
      ctx.strokeStyle = PALETTE.floorGoldBright;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(item.x - 23, item.y + 14, 46, 9);
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.moveTo(item.x - 20, item.y + 12);
      ctx.lineTo(item.x - 20, item.y - 6);
      ctx.lineTo(item.x - 14, item.y + 2);
      ctx.lineTo(item.x - 10, item.y - 14);
      ctx.lineTo(item.x - 5, item.y + 2);
      ctx.lineTo(item.x, item.y - 18);
      ctx.lineTo(item.x + 5, item.y + 2);
      ctx.lineTo(item.x + 10, item.y - 14);
      ctx.lineTo(item.x + 14, item.y + 2);
      ctx.lineTo(item.x + 20, item.y - 6);
      ctx.lineTo(item.x + 20, item.y + 12);
      ctx.closePath();
      ctx.fill();
      box(ctx, item.x - 20, item.y + 12, 40, 5, "#b8860b");
      // Ruby gems set in the band, and a gold orb on the tallest point.
      disc(ctx, item.x - 10, item.y + 6, 2.5, "#ff5a5a");
      disc(ctx, item.x, item.y + 6, 2.5, "#ff5a5a");
      disc(ctx, item.x + 10, item.y + 6, 2.5, "#ff5a5a");
      disc(ctx, item.x, item.y - 20, 2.5, PALETTE.loot);
    } else {
      // Bullion: two rows of gold bars with highlights, and loose coins.
      ctx.fillStyle = PALETTE.loot;
      for (const off of [[-16, 6], [0, 6], [16, 6], [-8, -2], [8, -2]]) {
        const bx = off[0];
        const by = off[1];
        ctx.beginPath();
        ctx.moveTo(item.x + bx - 8, item.y + by + 7);
        ctx.lineTo(item.x + bx - 5, item.y + by);
        ctx.lineTo(item.x + bx + 5, item.y + by);
        ctx.lineTo(item.x + bx + 8, item.y + by + 7);
        ctx.closePath();
        ctx.fill();
        // Highlight along the bar's top edge.
        ctx.strokeStyle = "#fff3b0";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(item.x + bx - 5, item.y + by + 1);
        ctx.lineTo(item.x + bx + 5, item.y + by + 1);
        ctx.stroke();
      }
      // Loose coins beside the stack.
      for (const off of [[-26, 14], [26, 14]]) {
        disc(ctx, item.x + off[0], item.y + off[1], 4, PALETTE.loot);
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(item.x + off[0], item.y + off[1], 4, 0, TAU);
        ctx.stroke();
      }
    }
    // A gold ring under the loot and its name.
    const ringR = item.id === "crown" ? 32 : item.id === "bullion" ? 30 : 28;
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(item.x, item.y, ringR, 0, TAU);
    ctx.stroke();
    label(ctx, item.name, item.x, item.y + 40, 12, PALETTE.hudGold, "center");
  }
}

function paintCameras(ctx, state) {
  for (const c of state.cameras) {
    const jammed = state.elapsed < c.jammedUntil;
    if (!jammed) {
      fan(ctx, c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle);
      ctx.fillStyle = coneGlow(ctx, c.x, c.y, CAMERA.range, PALETTE.coneCamera, 0.5);
      ctx.fill();
      ctx.strokeStyle = PALETTE.coneCameraEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // The wall mount: a fixed dark base on the wall.
    disc(ctx, c.x, c.y, 9, PALETTE.cameraBody);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, TAU);
    ctx.stroke();
    // The camera itself, aiming along its sweep: a housing that turns
    // with the lens, a red lens at the front, a gold screw on the body.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = PALETTE.cameraBody;
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(10, -4);
    ctx.lineTo(13, 0);
    ctx.lineTo(10, 4);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    disc(ctx, 12, 0, 4, jammed ? PALETTE.hudDim : PALETTE.cameraLens);
    disc(ctx, 12, 0, 1.8, jammed ? PALETTE.hudDim : "#ff8a8a");
    disc(ctx, -2, 0, 1.5, PALETTE.wallTrim);
    ctx.restore();
    if (jammed) label(ctx, "JAMMED", c.x, c.y + 26, 11, PALETTE.hudDim, "center");
  }
}

// Which cone colours a guard gets right now, by how sure he is.
function guardCone(g) {
  if (g.state === "chase") return { fill: PALETTE.coneAlert, edge: PALETTE.coneAlertEdge };
  if (g.state === "investigate") return { fill: PALETTE.coneSuspicious, edge: PALETTE.coneSuspiciousEdge };
  return { fill: PALETTE.coneGuard, edge: PALETTE.coneGuardEdge };
}

function paintGuards(ctx, state) {
  for (const g of state.guards) {
    const alert = g.state === "chase";
    const suspicious = g.state === "investigate";
    const cone = guardCone(g);
    fan(ctx, g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle);
    ctx.fillStyle = coneGlow(ctx, g.x, g.y, GUARD.visionRange, cone.fill, alert ? 0.6 : 0.42);
    ctx.fill();
    ctx.strokeStyle = cone.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Detection ring, outside the figure.
    if (g.detect > 0.05) {
      ctx.strokeStyle = alert ? PALETTE.hudRed : PALETTE.hudAmber;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius + 19, -Math.PI / 2, -Math.PI / 2 + g.detect * TAU);
      ctx.stroke();
    }
    // The guard as an upright three-quarter standing figure: big head
    // with a face and peaked cap, uniformed torso, arms, legs. The body
    // is drawn upright (head up, feet down) so it reads as a person at a
    // glance; the facing direction is shown by the vision cone and by the
    // flashlight, which points along g.face.
    const fx = Math.cos(g.face);
    const fy = Math.sin(g.face);
    // Drop shadow under the feet.
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 24, 18, 7, 0, 0, TAU);
    ctx.fill();
    // Legs: two dark navy legs with shoes.
    ctx.fillStyle = "#141a2e";
    ctx.fillRect(g.x - 10, g.y + 10, 7, 12);
    ctx.fillRect(g.x + 3, g.y + 10, 7, 12);
    ctx.fillRect(g.x - 11, g.y + 20, 9, 4);
    ctx.fillRect(g.x + 2, g.y + 20, 9, 4);
    // Torso: navy uniform, wide shoulders, gold trim.
    ctx.fillStyle = PALETTE.guardSuit;
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 2, 15, 11, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Gold belt across the waist.
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x - 14, g.y + 4);
    ctx.lineTo(g.x + 14, g.y + 4);
    ctx.stroke();
    // Epaulettes on the shoulders.
    ctx.fillStyle = PALETTE.guardTrim;
    ctx.fillRect(g.x - 14, g.y - 8, 7, 3);
    ctx.fillRect(g.x + 7, g.y - 8, 7, 3);
    // Badge: a gold diamond on the chest.
    ctx.beginPath();
    ctx.moveTo(g.x - 3, g.y - 2);
    ctx.lineTo(g.x, g.y + 1);
    ctx.lineTo(g.x + 3, g.y - 2);
    ctx.lineTo(g.x, g.y - 5);
    ctx.closePath();
    ctx.fill();
    // Arms from the shoulders down to the hands.
    ctx.strokeStyle = PALETTE.guardSuit;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(g.x - 13, g.y - 4);
    ctx.lineTo(g.x - 11, g.y + 10);
    ctx.moveTo(g.x + 13, g.y - 4);
    ctx.lineTo(g.x + 11, g.y + 10);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Hands, with a gold cuff at each wrist so the arms read.
    disc(ctx, g.x - 11, g.y + 10, 3.5, PALETTE.guardTrim);
    disc(ctx, g.x + 11, g.y + 10, 3.5, PALETTE.guardTrim);
    disc(ctx, g.x - 11, g.y + 10, 2.5, PALETTE.guardFace);
    disc(ctx, g.x + 11, g.y + 10, 2.5, PALETTE.guardFace);
    // Neck.
    ctx.fillStyle = PALETTE.guardFace;
    ctx.fillRect(g.x - 3, g.y - 12, 6, 6);
    // Head: skin, with the peaked cap over the top half.
    disc(ctx, g.x, g.y - 18, 11, PALETTE.guardFace);
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 18, 11, Math.PI, TAU);
    ctx.fill();
    // Gold cap band along the cap's lower edge.
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x - 11, g.y - 18);
    ctx.lineTo(g.x + 11, g.y - 18);
    ctx.stroke();
    // Face: two dark eyes on clean skin, below the cap band.
    disc(ctx, g.x - 4, g.y - 9, 1.8, "#1a1206");
    disc(ctx, g.x + 4, g.y - 9, 1.8, "#1a1206");
    // Flashlight: held in the right hand, pointing along the facing direction.
    ctx.strokeStyle = PALETTE.cameraBody;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(g.x + 11, g.y + 10);
    ctx.lineTo(g.x + 11 + fx * 14, g.y + 10 + fy * 14);
    ctx.stroke();
    ctx.lineCap = "butt";
    disc(ctx, g.x + 11 + fx * 14, g.y + 10 + fy * 14, 2.5, "#fff8c9");
    disc(ctx, g.x + 11 + fx * 14, g.y + 10 + fy * 14, 1.2, "#ffffff");
    // State mark and name, clear of the figure.
    if (alert || suspicious) {
      label(ctx, alert ? "!" : "?", g.x, g.y - GUARD.radius - 26, 22, alert ? PALETTE.hudRed : PALETTE.hudAmber, "center");
    }
    label(ctx, g.name, g.x, g.y + GUARD.radius + 26, 11, PALETTE.hudDim, "center");
  }
}

function paintThief(ctx, state) {
  const t = state.thief;
  const alpha = t.sneaking ? 0.75 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  // A teal glow and a bright ring so the thief is findable at a glance.
  const glow = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 34);
  glow.addColorStop(0, "rgba(44, 230, 200, 0.45)");
  glow.addColorStop(1, "rgba(44, 230, 200, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 34, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r + 20, 0, TAU);
  ctx.stroke();
  // The thief as an upright three-quarter hooded figure: big hooded head
  // with a face, cloaked torso, arms, legs, and a loot sack slung over
  // one shoulder. The body is drawn upright (head up, feet down) so it
  // reads as a person at a glance; the facing direction is the vision
  // cone's, and the figure turns with it only in the sense that the game
  // moves it that way.
  // Drop shadow under the feet.
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 24, 18, 7, 0, 0, TAU);
  ctx.fill();
  // Legs: two dark teal legs with shoes.
  ctx.fillStyle = "#0a4f4a";
  ctx.fillRect(t.x - 10, t.y + 10, 7, 12);
  ctx.fillRect(t.x + 3, t.y + 10, 7, 12);
  ctx.fillRect(t.x - 11, t.y + 20, 9, 4);
  ctx.fillRect(t.x + 2, t.y + 20, 9, 4);
  // Cloak: dark teal, wide shoulders, light teal trim.
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 2, 15, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Cloak seam down the front.
  ctx.strokeStyle = "#0a4f4a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - 8);
  ctx.lineTo(t.x, t.y + 10);
  ctx.stroke();
  // Gold clasp at the cloak's neck.
  disc(ctx, t.x, t.y - 6, 2, PALETTE.loot);
  // Arms from the shoulders down to the hands.
  ctx.strokeStyle = PALETTE.thiefDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(t.x - 13, t.y - 4);
  ctx.lineTo(t.x - 11, t.y + 10);
  ctx.moveTo(t.x + 13, t.y - 4);
  ctx.lineTo(t.x + 11, t.y + 10);
  ctx.stroke();
  ctx.lineCap = "butt";
  disc(ctx, t.x - 11, t.y + 10, 2.5, PALETTE.thiefDark);
  disc(ctx, t.x + 11, t.y + 10, 2.5, PALETTE.thiefDark);
  // Loot sack slung over the left shoulder: a bulging tan sack with a
  // tied top and a strap to the torso, coins peeking out.
  ctx.strokeStyle = "#5c4517";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t.x - 15, t.y - 6);
  ctx.lineTo(t.x - 6, t.y + 0);
  ctx.stroke();
  ctx.fillStyle = "#8a6a2f";
  ctx.strokeStyle = "#5c4517";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(t.x - 17, t.y - 6, 7, 6, -0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Tied top of the sack.
  ctx.fillStyle = "#5c4517";
  ctx.beginPath();
  ctx.moveTo(t.x - 22, t.y - 10);
  ctx.lineTo(t.x - 19, t.y - 13);
  ctx.lineTo(t.x - 17, t.y - 9);
  ctx.closePath();
  ctx.fill();
  // Coins peeking from the sack.
  disc(ctx, t.x - 19, t.y - 9, 1.8, PALETTE.loot);
  disc(ctx, t.x - 16, t.y - 10, 1.8, PALETTE.loot);
  // Neck.
  ctx.fillStyle = "#d9a066";
  ctx.fillRect(t.x - 3, t.y - 12, 6, 6);
  // Hood: a large dark-teal hood around a skin face, with a peaked tip.
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.moveTo(t.x - 5, t.y - 28);
  ctx.lineTo(t.x, t.y - 34);
  ctx.lineTo(t.x + 5, t.y - 28);
  ctx.closePath();
  ctx.fill();
  disc(ctx, t.x, t.y - 19, 11, PALETTE.thiefDark);
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.y - 19, 11, 0, TAU);
  ctx.stroke();
  // Face: warm skin inside the hood.
  disc(ctx, t.x, t.y - 17, 7, "#d9a066");
  // Two dark eyes, high contrast on the skin.
  disc(ctx, t.x - 3, t.y - 18, 1.6, "#1a1206");
  disc(ctx, t.x + 3, t.y - 18, 1.6, "#1a1206");
  ctx.restore();
  // Grab progress ring, outside the figure.
  if (t.grabbing) {
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 24, -Math.PI / 2, -Math.PI / 2 + t.grabProgress * TAU);
    ctx.stroke();
  }
  // Grace blink after being caught.
  if (t.grace > 0 && Math.floor(t.grace * 8) % 2 === 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 22, 0, TAU);
    ctx.stroke();
  }
}

function paintTools(ctx, state) {
  for (const s of state.smokes) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 230, 250, 0.25)";
    ctx.beginPath();
    ctx.arc(s.x - 20, s.y - 12, 34, 0, TAU);
    ctx.arc(s.x + 24, s.y + 10, 30, 0, TAU);
    ctx.fill();
  }
  for (const c of state.coins) {
    disc(ctx, c.x, c.y, 6, PALETTE.coin);
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, TAU);
    ctx.stroke();
  }
  // Sprint noise ring.
  if (state.elapsed < state.noiseUntil) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.noiseX, state.noiseY, 34, 0, TAU);
    ctx.stroke();
  }
}

// ---- HUD, bottom bar, title, panel ----

function heatShade(heat) {
  if (heat < 45) return PALETTE.heatLow;
  if (heat < 75) return PALETTE.heatMid;
  return PALETTE.heatHigh;
}

function paintHud(ctx, state) {
  box(ctx, 0, 0, VIEW_W, TOP_BAR_H, PALETTE.hudBg);
  box(ctx, 0, TOP_BAR_H - 2, VIEW_W, 2, PALETTE.hudLine);
  label(ctx, "THE AURUM JOB", 18, 30, 22, PALETTE.hudGold, "left", "middle");
  // HEAT — the alarm meter, big and central.
  const heatX = 260;
  const heatW = 300;
  const heatY = 14;
  label(ctx, "HEAT", heatX - 8, 30, 14, PALETTE.hudText, "right", "middle");
  box(ctx, heatX, heatY, heatW, 20, PALETTE.hudPanel);
  const heatFrac = state.heat / HEAT.max;
  box(ctx, heatX, heatY, Math.max(0, heatW * heatFrac), 20, heatShade(state.heat));
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(heatX, heatY, heatW, 20);
  // A tick at the alarm line (full).
  ctx.strokeStyle = PALETTE.hudRed;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(heatX + heatW - 1, heatY - 3);
  ctx.lineTo(heatX + heatW - 1, heatY + 23);
  ctx.stroke();
  // Strikes: three diamonds, filled while they remain.
  const strikeX = heatX + heatW + 26;
  label(ctx, "STRIKES", strikeX, 30, 14, PALETTE.hudText, "left", "middle");
  for (let i = 0; i < STRIKES_MAX; i += 1) {
    const cx = strikeX + 78 + i * 26;
    const cy = 24;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < STRIKES_MAX - state.strikes ? PALETTE.hudRed : PALETTE.hudPanel;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = PALETTE.hudRed;
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }
  // Loot: three pips, gold once taken.
  const lootX = strikeX + 78 + STRIKES_MAX * 26 + 18;
  label(ctx, "LOOT", lootX, 30, 14, PALETTE.hudText, "left", "middle");
  for (let i = 0; i < state.loot.length; i += 1) {
    const cx = lootX + 52 + i * 26;
    const cy = 24;
    ctx.fillStyle = state.loot[i].taken ? PALETTE.loot : PALETTE.hudPanel;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, TAU);
    ctx.stroke();
  }
  // Tools: coin / smoke / jammer counts.
  const toolX = lootX + 52 + state.loot.length * 26 + 18;
  label(ctx, "◉ " + state.coinsLeft + "  ☁ " + state.smokeLeft + "  ⚡ " + state.jammersLeft, toolX, 30, 15, PALETTE.hudText, "left", "middle");
  // Score and time, right-aligned.
  label(ctx, "Score " + state.score, VIEW_W - 150, 30, 18, PALETTE.hudText, "right", "middle");
  const minutes = Math.floor(state.elapsed / 60);
  const seconds = Math.floor(state.elapsed % 60);
  label(ctx, minutes + ":" + String(seconds).padStart(2, "0"), VIEW_W - 18, 30, 18, PALETTE.hudDim, "right", "middle");
  // Lockdown banner under the HUD.
  if (state.elapsed < state.lockdownUntil) {
    const left = Math.ceil(state.lockdownUntil - state.elapsed);
    box(ctx, 0, TOP_BAR_H, VIEW_W, 26, "rgba(120, 20, 20, 0.85)");
    label(ctx, "LOCKDOWN — the doors are sealed for " + left + "s", VIEW_W / 2, TOP_BAR_H + 18, 15, "#ffd2d2", "center", "middle");
  }
}

function paintBottom(ctx) {
  box(ctx, 0, VIEW_H - BOTTOM_BAR_H, VIEW_W, BOTTOM_BAR_H, PALETTE.hudBg);
  label(
    ctx,
    "WASD move · Shift sneak · Space sprint · E grab loot · Click throw a coin · Q smoke · F jam cameras · R retry · P pause · M mute",
    VIEW_W / 2, VIEW_H - 9, 13, PALETTE.hudDim, "center", "middle",
  );
}

// Title screen: dark, like the original. A full-screen dark overlay
// (82% opaque) dims the room behind it, and the game name sits above a
// yellow New Game button with black text — the name and the button are
// the focus. One small instruction line sits under the button.
function paintTitle(ctx, best) {
  // Dark overlay over the whole view, so the room is only dimly visible.
  box(ctx, 0, 0, VIEW_W, VIEW_H, DARK_VEIL);

  // Game name, large and gold, above the button.
  label(ctx, "THE AURUM JOB", VIEW_W / 2, 300, 64, PALETTE.hudGold, "center");
  // A thin gold rule under the name, with diamond ornaments at the ends.
  ctx.strokeStyle = PALETTE.hudGold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(480, 322);
  ctx.lineTo(800, 322);
  ctx.stroke();
  for (const dx of [480, 800]) {
    ctx.save();
    ctx.translate(dx, 322);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  // New Game button: yellow background, black text, centred below the name.
  const b = NEW_GAME_BUTTON;
  softRect(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = PALETTE.loot;
  ctx.fill();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 2;
  ctx.stroke();
  // A darker bottom edge so the button reads as raised.
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(b.x + 10, b.y + b.h - 2);
  ctx.lineTo(b.x + b.w - 10, b.y + b.h - 2);
  ctx.stroke();
  label(ctx, "New Game", b.x + b.w / 2, b.y + b.h / 2, 26, "#000000", "center", "middle");

  // One small instruction line under the button, then the Space hint.
  label(
    ctx,
    "Steal the Ledger, the Aurum Crown and the Bullion — past three guards, two cameras and the lasers — then vanish through the green doors.",
    VIEW_W / 2, 462, 15, PALETTE.hudText, "center",
  );
  label(ctx, "or press Space", VIEW_W / 2, 490, 14, PALETTE.hudDim, "center");
  if (best > 0) {
    label(ctx, "Best " + best, VIEW_W / 2, 518, 14, PALETTE.hudDim, "center");
  }
}

function paintPanel(ctx, title, lines, prompt, accent) {
  const width = 640;
  const height = 150 + lines.length * 32;
  const x = (VIEW_W - width) / 2;
  const y = (VIEW_H - height) / 2;
  ctx.fillStyle = DARK_VEIL;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  box(ctx, x, y, width, height, PALETTE.hudPanel);
  ctx.strokeStyle = accent || PALETTE.hudGold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  label(ctx, title, VIEW_W / 2, y + 62, 44, accent || PALETTE.hudGold, "center");
  for (let i = 0; i < lines.length; i += 1) {
    label(ctx, lines[i], VIEW_W / 2, y + 112 + i * 32, 19, PALETTE.hudText, "center");
  }
  label(ctx, prompt, VIEW_W / 2, y + height - 30, 20, PALETTE.hudGold, "center");
}

// ---- the renderer ----

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW_W, height / VIEW_H);
    view.x = (width - VIEW_W * view.scale) / 2;
    view.y = (height - VIEW_H * view.scale) / 2;
  }

  // Paint one frame: the hall, the HUD, then a panel for the screen the game is on.
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    box(context, 0, 0, canvas.width, canvas.height, PALETTE.backdrop);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    paintFloor(context);
    paintShadows(context);
    paintWalls(context);
    paintCases(context);
    paintPillars(context);
    paintRopes(context);
    paintDais(context);
    paintLasers(context, state);
    paintExit(context, state);
    paintLoot(context, state);
    paintCameras(context, state);
    paintGuards(context, state);
    paintThief(context, state);
    paintTools(context, state);
    paintHud(context, state);
    paintBottom(context);
    // The alarm flash: a red vignette while the alarm is fresh.
    if (state.alarmFlash > 0) {
      context.fillStyle = "rgba(255, 40, 40, " + 0.14 * state.alarmFlash + ")";
      context.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (screen === SCREEN_TITLE) {
      paintTitle(context, best);
    } else if (screen === SCREEN_PAUSED) {
      paintPanel(context, "Paused", ["The vault waits for you."], "Press P to resume", PALETTE.hudText);
    } else if (screen === SCREEN_WIN) {
      paintPanel(context, "CLEAN GETAWAY", [
        "Score " + state.winScore,
        state.winBreakdown,
        "Best " + best,
      ], "Press Space or click to play again", PALETTE.hudGreen);
    } else if (screen === SCREEN_OVER) {
      paintPanel(context, "BUSTED", [
        "The night watch caught you three times.",
        "Score " + state.score + " · Best " + best,
      ], "Press Space or click to try again", PALETTE.hudRed);
    }
  }

  // Convert a point in canvas device pixels (what input.js reports for a
  // click) to view coordinates (1280x720), for hit-testing the New Game button.
  function toView(canvasX, canvasY) {
    return { x: (canvasX - view.x) / view.scale, y: (canvasY - view.y) / view.scale };
  }

  resize();
  window.addEventListener("resize", resize);
  return { draw, toView };
}
