// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. The vault
// is drawn art-deco — deep navy floor with a gold medallion, marble pillars,
// glass cases, velvet rope — so cover, danger and loot read at a glance:
// gold is loot, amber is a guard's cone, red is a camera or a laser, green
// is the way out. Text that holds a number is rebuilt only when it changes.

import {
  BOTTOM_BAR_H, CAMERA, FONT, GUARD, HALL, HEAT, LASER, PALETTE,
  STRIKES_MAX, TOP_BAR_H, VIEW_H, VIEW_W,
} from './config.js';
import { CAMERAS, CASES, DAIS, EXIT, LASERS, PILLARS, ROPES, SHADOWS, WALLS } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function wedge(ctx, x, y, face, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, face - halfAngle, face + halfAngle);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const timeLabel = cachedLabel('');
  const lootLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

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

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function rect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, TAU);
    context.fill();
  }

  // The same rgba colour with a different alpha, for gradients.
  function withAlpha(rgba, alpha) {
    const match = /rgba\((\d+),\s*(\d+),\s*(\d+)/.exec(rgba);
    if (!match) return rgba;
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }

  // A cone of light: bright at the eye, fading to nothing at its range, so
  // the room reads through it instead of being painted over.
  function coneFill(x, y, range, color, peak) {
    const gradient = context.createRadialGradient(x, y, 6, x, y, range);
    gradient.addColorStop(0, withAlpha(color, peak));
    gradient.addColorStop(0.55, withAlpha(color, peak * 0.5));
    gradient.addColorStop(1, withAlpha(color, 0));
    return gradient;
  }

  function drawFloor() {
    rect(0, 0, VIEW_W, VIEW_H, PALETTE.floor);
    // Gold border inlay around the hall.
    context.strokeStyle = PALETTE.floorGold;
    context.lineWidth = 2;
    context.strokeRect(HALL.x + 8, HALL.y + 8, HALL.w - 16, HALL.h - 16);
    context.strokeStyle = 'rgba(201, 162, 39, 0.35)';
    context.lineWidth = 1;
    context.strokeRect(HALL.x + 16, HALL.y + 16, HALL.w - 32, HALL.h - 32);
    // The medallion: concentric gold rings under the crown dais.
    const cx = DAIS.x;
    const cy = DAIS.y;
    context.strokeStyle = 'rgba(201, 162, 39, 0.28)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, 150, 0, TAU);
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, 120, 0, TAU);
    context.stroke();
    context.strokeStyle = 'rgba(201, 162, 39, 0.16)';
    context.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU;
      context.beginPath();
      context.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
      context.lineTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150);
      context.stroke();
    }
    // Diamond inlays on the floor.
    context.fillStyle = 'rgba(201, 162, 39, 0.18)';
    for (const [dx, dy] of [[220, 560], [1060, 560], [220, 130], [1060, 130]]) {
      context.save();
      context.translate(dx, dy);
      context.rotate(Math.PI / 4);
      context.fillRect(-7, -7, 14, 14);
      context.restore();
    }
    // A crimson carpet runner from the green doors to the crown dais.
    rect(600, DAIS.y + DAIS.h / 2, 80, HALL.y + HALL.h - (DAIS.y + DAIS.h / 2) - 24, 'rgba(122, 31, 43, 0.55)');
    context.strokeStyle = 'rgba(255, 217, 74, 0.5)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(604, DAIS.y + DAIS.h / 2);
    context.lineTo(604, HALL.y + HALL.h - 24);
    context.moveTo(676, DAIS.y + DAIS.h / 2);
    context.lineTo(676, HALL.y + HALL.h - 24);
    context.stroke();
  }

  function drawShadows() {
    for (const s of SHADOWS) {
      rect(s.x, s.y, s.w, s.h, PALETTE.shadowZone);
      context.strokeStyle = PALETTE.shadowEdge;
      context.lineWidth = 1;
      context.strokeRect(s.x, s.y, s.w, s.h);
    }
  }

  function drawWalls() {
    for (const w of WALLS) {
      rect(w.x, w.y, w.w, w.h, PALETTE.wall);
      rect(w.x, w.y, w.w, 3, PALETTE.wallTop);
    }
    // Gold trim along the top of the walls.
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(HALL.x, HALL.y + WALLS[0].h);
    context.lineTo(HALL.x + HALL.w, HALL.y + WALLS[0].h);
    context.stroke();
  }

  function drawCases() {
    for (const c of CASES) {
      rect(c.x, c.y, c.w, c.h, PALETTE.caseBase);
      rect(c.x + 3, c.y + 3, c.w - 6, c.h - 6, PALETTE.caseGlass);
      context.strokeStyle = PALETTE.caseFrame;
      context.lineWidth = 2;
      context.strokeRect(c.x, c.y, c.w, c.h);
      // A glint of gold inside each case.
      circle(c.x + c.w / 2, c.y + c.h / 2, 6, PALETTE.loot);
    }
  }

  function drawPillars() {
    for (const p of PILLARS) {
      circle(p.x, p.y, p.r + 3, PALETTE.pillarGold);
      circle(p.x, p.y, p.r, PALETTE.pillar);
      circle(p.x - 7, p.y - 7, p.r - 10, PALETTE.pillarDark);
      context.strokeStyle = PALETTE.pillarGold;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(p.x, p.y, p.r - 4, 0, TAU);
      context.stroke();
    }
  }

  function drawRopes() {
    for (const r of ROPES) {
      context.strokeStyle = PALETTE.ropePost;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(r.x1, r.y1 - 8);
      context.lineTo(r.x1, r.y1 + 8);
      context.moveTo(r.x3, r.y3 - 8);
      context.lineTo(r.x3, r.y3 + 8);
      context.stroke();
      circle(r.x1, r.y1 - 10, 4, PALETTE.ropePost);
      circle(r.x3, r.y3 - 10, 4, PALETTE.ropePost);
      context.strokeStyle = PALETTE.rope;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(r.x1, r.y1);
      context.quadraticCurveTo(r.x2, r.y2, r.x3, r.y3);
      context.stroke();
    }
  }

  function drawDais() {
    circle(DAIS.x, DAIS.y, DAIS.r + 6, PALETTE.floorGold);
    circle(DAIS.x, DAIS.y, DAIS.r, '#1a2340');
    context.strokeStyle = PALETTE.floorGoldBright;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(DAIS.x, DAIS.y, DAIS.r - 6, 0, TAU);
    context.stroke();
  }

  function drawLasers(state) {
    for (const l of state.lasers) {
      // Emitter posts at each end.
      rect(l.x - 4, l.y1 - 6, 8, 12, PALETTE.cameraBody);
      rect(l.x - 4, l.y2 - 6, 8, 12, PALETTE.cameraBody);
      if (l.on) {
        context.strokeStyle = PALETTE.laserGlow;
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(l.x, l.y1);
        context.lineTo(l.x, l.y2);
        context.stroke();
        context.strokeStyle = PALETTE.laser;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(l.x, l.y1);
        context.lineTo(l.x, l.y2);
        context.stroke();
      } else {
        context.strokeStyle = PALETTE.laserOff;
        context.lineWidth = 2;
        context.setLineDash([6, 6]);
        context.beginPath();
        context.moveTo(l.x, l.y1);
        context.lineTo(l.x, l.y2);
        context.stroke();
        context.setLineDash([]);
      }
    }
  }

  function drawExit(state) {
    const locked = state.elapsed < state.lockdownUntil;
    const color = locked ? PALETTE.exitLocked : PALETTE.exit;
    rect(EXIT.x, EXIT.y, EXIT.w, EXIT.h, color);
    rect(EXIT.x + 4, EXIT.y + 4, EXIT.w - 8, EXIT.h - 8, PALETTE.exitDark);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    // The two doors.
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(EXIT.x + EXIT.w / 2, EXIT.y + 4);
    context.lineTo(EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h - 4);
    context.stroke();
    text(locked ? 'SEALED' : 'EXIT', EXIT.x + EXIT.w / 2, EXIT.y - 8, 13, locked ? PALETTE.hudAmber : PALETTE.hudGreen, 'center');
    if (locked) {
      const left = Math.ceil(state.lockdownUntil - state.elapsed);
      text(`${left}s`, EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h + 18, 13, PALETTE.hudAmber, 'center');
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      // Pulsing gold halo.
      const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 3 + item.x);
      context.fillStyle = `rgba(255, 217, 74, ${0.22 * pulse})`;
      context.beginPath();
      context.arc(item.x, item.y, 30 + 6 * pulse, 0, TAU);
      context.fill();
      // The loot itself, drawn as its own icon.
      if (item.id === 'ledger') {
        rect(item.x - 11, item.y - 14, 22, 28, '#7a1f2b');
        rect(item.x - 8, item.y - 11, 16, 22, '#f5e6c4');
        context.strokeStyle = PALETTE.loot;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(item.x - 4, item.y - 4);
        context.lineTo(item.x + 4, item.y - 4);
        context.moveTo(item.x - 4, item.y + 2);
        context.lineTo(item.x + 4, item.y + 2);
        context.stroke();
      } else if (item.id === 'crown') {
        context.fillStyle = PALETTE.loot;
        context.beginPath();
        context.moveTo(item.x - 14, item.y + 10);
        context.lineTo(item.x - 14, item.y - 6);
        context.lineTo(item.x - 7, item.y + 2);
        context.lineTo(item.x, item.y - 12);
        context.lineTo(item.x + 7, item.y + 2);
        context.lineTo(item.x + 14, item.y - 6);
        context.lineTo(item.x + 14, item.y + 10);
        context.closePath();
        context.fill();
        rect(item.x - 14, item.y + 10, 28, 5, '#b8860b');
      } else {
        // Bullion: a stack of gold bars.
        context.fillStyle = PALETTE.loot;
        for (const [bx, by, bw] of [[-13, 4, 26], [-9, -4, 18], [-4, -12, 10]]) {
          context.beginPath();
          context.moveTo(item.x + bx, item.y + by + 8);
          context.lineTo(item.x + bx + 3, item.y + by);
          context.lineTo(item.x + bx + bw - 3, item.y + by);
          context.lineTo(item.x + bx + bw, item.y + by + 8);
          context.closePath();
          context.fill();
        }
      }
      // A small gold ring under the loot and its name.
      context.strokeStyle = PALETTE.loot;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(item.x, item.y, 20, 0, TAU);
      context.stroke();
      text(item.name, item.x, item.y + 38, 12, PALETTE.hudGold, 'center');
    }
  }

  function drawCameras(state) {
    for (const c of state.cameras) {
      const jammed = state.elapsed < c.jammedUntil;
      if (!jammed) {
        wedge(context, c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle);
        context.fillStyle = coneFill(c.x, c.y, CAMERA.range, PALETTE.coneCamera, 0.5);
        context.fill();
        context.strokeStyle = PALETTE.coneCameraEdge;
        context.lineWidth = 1.5;
        context.stroke();
      }
      // The dome on the wall.
      circle(c.x, c.y, 11, PALETTE.cameraBody);
      circle(c.x, c.y, 5, jammed ? PALETTE.hudDim : PALETTE.cameraLens);
      if (jammed) text('JAMMED', c.x, c.y + 26, 11, PALETTE.hudDim, 'center');
    }
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      const alert = g.state === 'chase';
      const suspicious = g.state === 'investigate';
      const coneColor = alert ? PALETTE.coneAlert : suspicious ? PALETTE.coneSuspicious : PALETTE.coneGuard;
      const coneEdge = alert ? PALETTE.coneAlertEdge : suspicious ? PALETTE.coneSuspiciousEdge : PALETTE.coneGuardEdge;
      wedge(context, g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle);
      context.fillStyle = coneFill(g.x, g.y, GUARD.visionRange, coneColor, alert ? 0.6 : 0.42);
      context.fill();
      context.strokeStyle = coneEdge;
      context.lineWidth = 1.5;
      context.stroke();
      // Detection ring: how close this guard is to spotting the thief.
      if (g.detect > 0.05) {
        context.strokeStyle = alert ? PALETTE.hudRed : PALETTE.hudAmber;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(g.x, g.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + g.detect * TAU);
        context.stroke();
      }
      // The guard: a dark halo so he reads as a solid figure against his own
      // cone, then a dark suit, gold trim and a facing tick.
      circle(g.x, g.y, GUARD.radius + 7, 'rgba(7, 10, 18, 0.85)');
      circle(g.x, g.y, GUARD.radius + 2, PALETTE.guardTrim);
      circle(g.x, g.y, GUARD.radius, GUARD.guardSuit);
      context.strokeStyle = PALETTE.guardFace;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.face) * (GUARD.radius + 5), g.y + Math.sin(g.face) * (GUARD.radius + 5));
      context.stroke();
      circle(g.x, g.y, 4, PALETTE.guardFace);
      // State mark: ? when suspicious, ! when alert.
      if (alert || suspicious) {
        text(alert ? '!' : '?', g.x, g.y - GUARD.radius - 10, 22, alert ? PALETTE.hudRed : PALETTE.hudAmber, 'center');
      }
      text(g.name, g.x, g.y + GUARD.radius + 16, 11, PALETTE.hudDim, 'center');
    }
  }

  function drawThief(state) {
    const t = state.thief;
    const alpha = t.sneaking ? 0.75 : 1;
    context.save();
    context.globalAlpha = alpha;
    // A teal glow and a bright ring so the thief is findable at a glance.
    const glow = context.createRadialGradient(t.x, t.y, 4, t.x, t.y, 34);
    glow.addColorStop(0, 'rgba(44, 230, 200, 0.45)');
    glow.addColorStop(1, 'rgba(44, 230, 200, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(t.x, t.y, 34, 0, TAU);
    context.fill();
    context.strokeStyle = PALETTE.thiefRing;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(t.x, t.y, t.r + 5, 0, TAU);
    context.stroke();
    circle(t.x, t.y, t.r, PALETTE.thiefDark);
    circle(t.x, t.y, t.r - 3, PALETTE.thief);
    // Facing tick.
    context.strokeStyle = '#e6fffa';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(t.x, t.y);
    context.lineTo(t.x + Math.cos(t.face) * (t.r + 4), t.y + Math.sin(t.face) * (t.r + 4));
    context.stroke();
    context.restore();
    // Grab progress ring.
    if (t.grabbing) {
      context.strokeStyle = PALETTE.loot;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(t.x, t.y, t.r + 11, -Math.PI / 2, -Math.PI / 2 + t.grabProgress * TAU);
      context.stroke();
    }
    // Grace blink after being caught.
    if (t.grace > 0 && Math.floor(t.grace * 8) % 2 === 0) {
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(t.x, t.y, t.r + 9, 0, TAU);
      context.stroke();
    }
  }

  function drawTools(state) {
    for (const s of state.smokes) {
      context.fillStyle = PALETTE.smoke;
      context.beginPath();
      context.arc(s.x, s.y, s.r, 0, TAU);
      context.fill();
      context.fillStyle = 'rgba(220, 230, 250, 0.25)';
      context.beginPath();
      context.arc(s.x - 20, s.y - 12, 34, 0, TAU);
      context.arc(s.x + 24, s.y + 10, 30, 0, TAU);
      context.fill();
    }
    for (const c of state.coins) {
      circle(c.x, c.y, 6, PALETTE.coin);
      context.strokeStyle = '#b8860b';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(c.x, c.y, 6, 0, TAU);
      context.stroke();
    }
    // Sprint noise ring.
    if (state.elapsed < state.noiseUntil) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.noiseX, state.noiseY, 34, 0, TAU);
      context.stroke();
    }
  }

  function heatColor(heat) {
    if (heat < 45) return PALETTE.heatLow;
    if (heat < 75) return PALETTE.heatMid;
    return PALETTE.heatHigh;
  }

  function drawHud(state, screen) {
    rect(0, 0, VIEW_W, TOP_BAR_H, PALETTE.hudBg);
    rect(0, TOP_BAR_H - 2, VIEW_W, 2, PALETTE.hudLine);
    text('THE AURUM JOB', 18, 30, 22, PALETTE.hudGold, 'left', 'middle');
    // HEAT — the alarm meter, big and central.
    const heatX = 260;
    const heatW = 300;
    const heatY = 14;
    text('HEAT', heatX - 8, 30, 14, PALETTE.hudText, 'right', 'middle');
    rect(heatX, heatY, heatW, 20, PALETTE.hudPanel);
    const heatFrac = state.heat / HEAT.max;
    rect(heatX, heatY, Math.max(0, heatW * heatFrac), 20, heatColor(state.heat));
    context.strokeStyle = PALETTE.hudLine;
    context.lineWidth = 1;
    context.strokeRect(heatX, heatY, heatW, 20);
    // A tick at the alarm line (full).
    context.strokeStyle = PALETTE.hudRed;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(heatX + heatW - 1, heatY - 3);
    context.lineTo(heatX + heatW - 1, heatY + 23);
    context.stroke();
    // Strikes: three diamonds, filled while they remain.
    const strikeX = heatX + heatW + 26;
    text('STRIKES', strikeX, 30, 14, PALETTE.hudText, 'left', 'middle');
    for (let i = 0; i < STRIKES_MAX; i += 1) {
      const cx = strikeX + 78 + i * 26;
      const cy = 24;
      context.save();
      context.translate(cx, cy);
      context.rotate(Math.PI / 4);
      context.fillStyle = i < STRIKES_MAX - state.strikes ? PALETTE.hudRed : PALETTE.hudPanel;
      context.fillRect(-7, -7, 14, 14);
      context.strokeStyle = PALETTE.hudRed;
      context.lineWidth = 1;
      context.strokeRect(-7, -7, 14, 14);
      context.restore();
    }
    // Loot: three pips, gold once taken.
    const lootX = strikeX + 78 + STRIKES_MAX * 26 + 18;
    text('LOOT', lootX, 30, 14, PALETTE.hudText, 'left', 'middle');
    for (let i = 0; i < state.loot.length; i += 1) {
      const cx = lootX + 52 + i * 26;
      const cy = 24;
      context.fillStyle = state.loot[i].taken ? PALETTE.loot : PALETTE.hudPanel;
      context.beginPath();
      context.arc(cx, cy, 8, 0, TAU);
      context.fill();
      context.strokeStyle = PALETTE.loot;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(cx, cy, 8, 0, TAU);
      context.stroke();
    }
    // Tools: coin / smoke / jammer counts.
    const toolX = lootX + 52 + state.loot.length * 26 + 18;
    text(`◉ ${state.coinsLeft}  ☁ ${state.smokeLeft}  ⚡ ${state.jammersLeft}`, toolX, 30, 15, PALETTE.hudText, 'left', 'middle');
    // Score and time, right-aligned.
    text(scoreLabel(state.score), VIEW_W - 150, 30, 18, PALETTE.hudText, 'right', 'middle');
    const minutes = Math.floor(state.elapsed / 60);
    const seconds = Math.floor(state.elapsed % 60);
    text(timeLabel(`${minutes}:${String(seconds).padStart(2, '0')}`), VIEW_W - 18, 30, 18, PALETTE.hudDim, 'right', 'middle');
    // Lockdown banner under the HUD.
    if (state.elapsed < state.lockdownUntil) {
      const left = Math.ceil(state.lockdownUntil - state.elapsed);
      rect(0, TOP_BAR_H, VIEW_W, 26, 'rgba(120, 20, 20, 0.85)');
      text(`LOCKDOWN — the doors are sealed for ${left}s`, VIEW_W / 2, TOP_BAR_H + 18, 15, '#ffd2d2', 'center', 'middle');
    }
  }

  function drawBottomBar() {
    rect(0, VIEW_H - BOTTOM_BAR_H, VIEW_W, BOTTOM_BAR_H, PALETTE.hudBg);
    text(
      'WASD move · Shift sneak · Space sprint · E grab loot · Click throw a coin · Q smoke · F jam cameras · R retry · P pause · M mute',
      VIEW_W / 2, VIEW_H - 9, 13, PALETTE.hudDim, 'center', 'middle',
    );
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (VIEW_W - width) / 2;
    const y = (VIEW_H - height) / 2;
    context.fillStyle = 'rgba(7, 10, 18, 0.82)';
    context.fillRect(0, 0, VIEW_W, VIEW_H);
    rect(x, y, width, height, PALETTE.hudPanel);
    context.strokeStyle = accent || PALETTE.hudGold;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    text(title, VIEW_W / 2, y + 62, 44, accent || PALETTE.hudGold, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW_W / 2, y + 112 + i * 32, 19, PALETTE.hudText, 'center');
    }
    text(prompt, VIEW_W / 2, y + height - 30, 20, PALETTE.hudGold, 'center');
  }

  /** Paint one frame: the hall, the HUD, then a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    rect(0, 0, canvas.width, canvas.height, PALETTE.backdrop);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawShadows();
    drawWalls();
    drawCases();
    drawPillars();
    drawRopes();
    drawDais();
    drawLasers(state);
    drawExit(state);
    drawLoot(state);
    drawCameras(state);
    drawGuards(state);
    drawThief(state);
    drawTools(state);
    drawHud(state, screen);
    drawBottomBar();
    // The alarm flash: a red vignette while the alarm is fresh.
    if (state.alarmFlash > 0) {
      context.fillStyle = `rgba(255, 40, 40, ${0.14 * state.alarmFlash})`;
      context.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (screen === SCREEN_TITLE) {
      drawPanel('THE AURUM JOB', [
        'Steal the Ledger, the Aurum Crown and the Bullion —',
        'past three guards, two cameras and the lasers —',
        'then vanish through the green doors.',
        best > 0 ? bestLabel(best) : '',
      ].filter(Boolean), 'Press Space or click to start', PALETTE.hudGold);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The vault waits for you.'], 'Press P to resume', PALETTE.hudText);
    } else if (screen === SCREEN_WIN) {
      drawPanel('CLEAN GETAWAY', [
        finalLabel(state.winScore),
        state.winBreakdown,
        bestLabel(best),
      ], 'Press Space or click to play again', PALETTE.hudGreen);
    } else if (screen === SCREEN_OVER) {
      drawPanel('BUSTED', [
        'The night watch caught you three times.',
        `Score ${state.score} · Best ${best}`,
      ], 'Press Space or click to try again', PALETTE.hudRed);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
