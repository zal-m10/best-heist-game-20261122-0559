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

// The New Game button on the title screen, in view coordinates (1280x720).
// main.js uses these bounds to tell whether a click hit the button.
export const NEW_GAME_BUTTON = { x: 490, y: 352, w: 300, h: 68 };

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

  // A rounded-rectangle path (for the New Game button), drawn manually so
  // it works in any canvas, not only in browsers with ctx.roundRect.
  function roundRectPath(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.arcTo(x + w, y, x + w, y + r, r);
    context.lineTo(x + w, y + h - r);
    context.arcTo(x + w, y + h, x + w - r, y + h, r);
    context.lineTo(x + r, y + h);
    context.arcTo(x, y + h, x, y + h - r, r);
    context.lineTo(x, y + r);
    context.arcTo(x, y, x + r, y, r);
    context.closePath();
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
      // The loot itself, drawn as its own detailed icon.
      if (item.id === 'ledger') {
        // A big ledger: crimson cover, cream pages, gold spine and clasp,
        // ruled page lines, and a red ribbon bookmark.
        rect(item.x - 15, item.y - 19, 30, 38, '#7a1f2b');
        rect(item.x - 12, item.y - 16, 24, 32, '#f5e6c4');
        context.strokeStyle = PALETTE.loot;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(item.x - 13, item.y - 16);
        context.lineTo(item.x - 13, item.y + 16);
        context.stroke();
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(item.x - 8, item.y - 8);
        context.lineTo(item.x + 8, item.y - 8);
        context.moveTo(item.x - 8, item.y);
        context.lineTo(item.x + 8, item.y);
        context.moveTo(item.x - 8, item.y + 8);
        context.lineTo(item.x + 8, item.y + 8);
        context.stroke();
        // Gold clasp on the fore-edge.
        rect(item.x + 13, item.y - 3, 4, 6, PALETTE.loot);
        // Ribbon bookmark hanging from the bottom.
        context.fillStyle = '#a4123f';
        context.beginPath();
        context.moveTo(item.x + 4, item.y + 19);
        context.lineTo(item.x + 8, item.y + 19);
        context.lineTo(item.x + 8, item.y + 26);
        context.lineTo(item.x + 6, item.y + 23);
        context.lineTo(item.x + 4, item.y + 26);
        context.closePath();
        context.fill();
      } else if (item.id === 'crown') {
        // The Aurum Crown, bigger and jewelled, on a velvet cushion.
        rect(item.x - 23, item.y + 14, 46, 9, '#7a1f2b');
        context.strokeStyle = PALETTE.floorGoldBright;
        context.lineWidth = 1.5;
        context.strokeRect(item.x - 23, item.y + 14, 46, 9);
        context.fillStyle = PALETTE.loot;
        context.beginPath();
        context.moveTo(item.x - 20, item.y + 12);
        context.lineTo(item.x - 20, item.y - 6);
        context.lineTo(item.x - 14, item.y + 2);
        context.lineTo(item.x - 10, item.y - 14);
        context.lineTo(item.x - 5, item.y + 2);
        context.lineTo(item.x, item.y - 18);
        context.lineTo(item.x + 5, item.y + 2);
        context.lineTo(item.x + 10, item.y - 14);
        context.lineTo(item.x + 14, item.y + 2);
        context.lineTo(item.x + 20, item.y - 6);
        context.lineTo(item.x + 20, item.y + 12);
        context.closePath();
        context.fill();
        rect(item.x - 20, item.y + 12, 40, 5, '#b8860b');
        // Ruby gems set in the band, and a gold orb on the tallest point.
        circle(item.x - 10, item.y + 6, 2.5, '#ff5a5a');
        circle(item.x, item.y + 6, 2.5, '#ff5a5a');
        circle(item.x + 10, item.y + 6, 2.5, '#ff5a5a');
        circle(item.x, item.y - 20, 2.5, PALETTE.loot);
      } else {
        // Bullion: two rows of gold bars with highlights, and loose coins.
        context.fillStyle = PALETTE.loot;
        for (const [bx, by] of [[-16, 6], [0, 6], [16, 6], [-8, -2], [8, -2]]) {
          context.beginPath();
          context.moveTo(item.x + bx - 8, item.y + by + 7);
          context.lineTo(item.x + bx - 5, item.y + by);
          context.lineTo(item.x + bx + 5, item.y + by);
          context.lineTo(item.x + bx + 8, item.y + by + 7);
          context.closePath();
          context.fill();
          // Highlight along the bar's top edge.
          context.strokeStyle = '#fff3b0';
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(item.x + bx - 5, item.y + by + 1);
          context.lineTo(item.x + bx + 5, item.y + by + 1);
          context.stroke();
        }
        // Loose coins beside the stack.
        for (const [cx, cy] of [[-26, 14], [26, 14]]) {
          circle(item.x + cx, item.y + cy, 4, PALETTE.loot);
          context.strokeStyle = '#b8860b';
          context.lineWidth = 1;
          context.beginPath();
          context.arc(item.x + cx, item.y + cy, 4, 0, TAU);
          context.stroke();
        }
      }
      // A gold ring under the loot and its name.
      const ringR = item.id === 'crown' ? 32 : item.id === 'bullion' ? 30 : 28;
      context.strokeStyle = PALETTE.loot;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(item.x, item.y, ringR, 0, TAU);
      context.stroke();
      text(item.name, item.x, item.y + 40, 12, PALETTE.hudGold, 'center');
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
      // The wall mount: a fixed dark base on the wall.
      circle(c.x, c.y, 9, PALETTE.cameraBody);
      context.strokeStyle = PALETTE.wallTrim;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(c.x, c.y, 9, 0, TAU);
      context.stroke();
      // The camera itself, aiming along its sweep: a housing that turns
      // with the lens, a red lens at the front, a gold screw on the body.
      context.save();
      context.translate(c.x, c.y);
      context.rotate(c.angle);
      context.fillStyle = PALETTE.cameraBody;
      context.strokeStyle = PALETTE.wallTrim;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(-6, -6);
      context.lineTo(10, -4);
      context.lineTo(13, 0);
      context.lineTo(10, 4);
      context.lineTo(-6, 6);
      context.closePath();
      context.fill();
      context.stroke();
      circle(12, 0, 4, jammed ? PALETTE.hudDim : PALETTE.cameraLens);
      circle(12, 0, 1.8, jammed ? PALETTE.hudDim : '#ff8a8a');
      circle(-2, 0, 1.5, PALETTE.wallTrim);
      context.restore();
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
      // Detection ring, outside the figure.
      if (g.detect > 0.05) {
        context.strokeStyle = alert ? PALETTE.hudRed : PALETTE.hudAmber;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(g.x, g.y, GUARD.radius + 19, -Math.PI / 2, -Math.PI / 2 + g.detect * TAU);
        context.stroke();
      }
      // The guard as an upright three-quarter standing figure: big head
      // with a face and peaked cap, uniformed torso, arms, legs. The body
      // is drawn upright (head up, feet down) so it reads as a person at a
      // glance; the facing direction is shown by the vision cone and by the
      // flashlight, which points along g.face.
      const fx = Math.cos(g.face);
      const fy = Math.sin(g.face);
      // Drop shadow under the feet.
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      context.beginPath();
      context.ellipse(g.x, g.y + 24, 18, 7, 0, 0, TAU);
      context.fill();
      // Legs: two dark navy legs with shoes.
      context.fillStyle = '#141a2e';
      context.fillRect(g.x - 10, g.y + 10, 7, 12);
      context.fillRect(g.x + 3, g.y + 10, 7, 12);
      context.fillRect(g.x - 11, g.y + 20, 9, 4);
      context.fillRect(g.x + 2, g.y + 20, 9, 4);
      // Torso: navy uniform, wide shoulders, gold trim.
      context.fillStyle = PALETTE.guardSuit;
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(g.x, g.y + 2, 15, 11, 0, 0, TAU);
      context.fill();
      context.stroke();
      // Gold belt across the waist.
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x - 14, g.y + 4);
      context.lineTo(g.x + 14, g.y + 4);
      context.stroke();
      // Epaulettes on the shoulders.
      context.fillStyle = PALETTE.guardTrim;
      context.fillRect(g.x - 14, g.y - 8, 7, 3);
      context.fillRect(g.x + 7, g.y - 8, 7, 3);
      // Badge: a gold diamond on the chest.
      context.beginPath();
      context.moveTo(g.x - 3, g.y - 2);
      context.lineTo(g.x, g.y + 1);
      context.lineTo(g.x + 3, g.y - 2);
      context.lineTo(g.x, g.y - 5);
      context.closePath();
      context.fill();
      // Arms from the shoulders down to the hands.
      context.strokeStyle = PALETTE.guardSuit;
      context.lineWidth = 5;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(g.x - 13, g.y - 4);
      context.lineTo(g.x - 11, g.y + 10);
      context.moveTo(g.x + 13, g.y - 4);
      context.lineTo(g.x + 11, g.y + 10);
      context.stroke();
      context.lineCap = 'butt';
      // Hands, with a gold cuff at each wrist so the arms read.
      circle(g.x - 11, g.y + 10, 3.5, PALETTE.guardTrim);
      circle(g.x + 11, g.y + 10, 3.5, PALETTE.guardTrim);
      circle(g.x - 11, g.y + 10, 2.5, PALETTE.guardFace);
      circle(g.x + 11, g.y + 10, 2.5, PALETTE.guardFace);
      // Neck.
      context.fillStyle = PALETTE.guardFace;
      context.fillRect(g.x - 3, g.y - 12, 6, 6);
      // Head: skin, with the peaked cap over the top half.
      circle(g.x, g.y - 18, 11, PALETTE.guardFace);
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y - 18, 11, Math.PI, TAU);
      context.fill();
      // Gold cap band along the cap's lower edge.
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(g.x - 11, g.y - 18);
      context.lineTo(g.x + 11, g.y - 18);
      context.stroke();
      // Face: two dark eyes on clean skin, below the cap band.
      circle(g.x - 4, g.y - 9, 1.8, '#1a1206');
      circle(g.x + 4, g.y - 9, 1.8, '#1a1206');
      // Flashlight: held in the right hand, pointing along the facing direction.
      context.strokeStyle = PALETTE.cameraBody;
      context.lineWidth = 4;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(g.x + 11, g.y + 10);
      context.lineTo(g.x + 11 + fx * 14, g.y + 10 + fy * 14);
      context.stroke();
      context.lineCap = 'butt';
      circle(g.x + 11 + fx * 14, g.y + 10 + fy * 14, 2.5, '#fff8c9');
      circle(g.x + 11 + fx * 14, g.y + 10 + fy * 14, 1.2, '#ffffff');
      // State mark and name, clear of the figure.
      if (alert || suspicious) {
        text(alert ? '!' : '?', g.x, g.y - GUARD.radius - 26, 22, alert ? PALETTE.hudRed : PALETTE.hudAmber, 'center');
      }
      text(g.name, g.x, g.y + GUARD.radius + 26, 11, PALETTE.hudDim, 'center');
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
    context.arc(t.x, t.y, t.r + 20, 0, TAU);
    context.stroke();
    // The thief as an upright three-quarter hooded figure: big hooded head
    // with a face, cloaked torso, arms, legs, and a loot sack slung over
    // one shoulder. The body is drawn upright (head up, feet down) so it
    // reads as a person at a glance; the facing direction is the vision
    // cone's, and the figure turns with it only in the sense that the game
    // moves it that way.
    // Drop shadow under the feet.
    context.fillStyle = 'rgba(0, 0, 0, 0.35)';
    context.beginPath();
    context.ellipse(t.x, t.y + 24, 18, 7, 0, 0, TAU);
    context.fill();
    // Legs: two dark teal legs with shoes.
    context.fillStyle = '#0a4f4a';
    context.fillRect(t.x - 10, t.y + 10, 7, 12);
    context.fillRect(t.x + 3, t.y + 10, 7, 12);
    context.fillRect(t.x - 11, t.y + 20, 9, 4);
    context.fillRect(t.x + 2, t.y + 20, 9, 4);
    // Cloak: dark teal, wide shoulders, light teal trim.
    context.fillStyle = PALETTE.thiefDark;
    context.strokeStyle = PALETTE.thief;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(t.x, t.y + 2, 15, 11, 0, 0, TAU);
    context.fill();
    context.stroke();
    // Cloak seam down the front.
    context.strokeStyle = '#0a4f4a';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(t.x, t.y - 8);
    context.lineTo(t.x, t.y + 10);
    context.stroke();
    // Gold clasp at the cloak's neck.
    circle(t.x, t.y - 6, 2, PALETTE.loot);
    // Arms from the shoulders down to the hands.
    context.strokeStyle = PALETTE.thiefDark;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(t.x - 13, t.y - 4);
    context.lineTo(t.x - 11, t.y + 10);
    context.moveTo(t.x + 13, t.y - 4);
    context.lineTo(t.x + 11, t.y + 10);
    context.stroke();
    context.lineCap = 'butt';
    circle(t.x - 11, t.y + 10, 2.5, PALETTE.thiefDark);
    circle(t.x + 11, t.y + 10, 2.5, PALETTE.thiefDark);
    // Loot sack slung over the left shoulder: a bulging tan sack with a
    // tied top and a strap to the torso, coins peeking out.
    context.strokeStyle = '#5c4517';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(t.x - 15, t.y - 6);
    context.lineTo(t.x - 6, t.y + 0);
    context.stroke();
    context.fillStyle = '#8a6a2f';
    context.strokeStyle = '#5c4517';
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(t.x - 17, t.y - 6, 7, 6, -0.4, 0, TAU);
    context.fill();
    context.stroke();
    // Tied top of the sack.
    context.fillStyle = '#5c4517';
    context.beginPath();
    context.moveTo(t.x - 22, t.y - 10);
    context.lineTo(t.x - 19, t.y - 13);
    context.lineTo(t.x - 17, t.y - 9);
    context.closePath();
    context.fill();
    // Coins peeking from the sack.
    circle(t.x - 19, t.y - 9, 1.8, PALETTE.loot);
    circle(t.x - 16, t.y - 10, 1.8, PALETTE.loot);
    // Neck.
    context.fillStyle = '#d9a066';
    context.fillRect(t.x - 3, t.y - 12, 6, 6);
    // Hood: a large dark-teal hood around a skin face, with a peaked tip.
    context.fillStyle = PALETTE.thiefDark;
    context.beginPath();
    context.moveTo(t.x - 5, t.y - 28);
    context.lineTo(t.x, t.y - 34);
    context.lineTo(t.x + 5, t.y - 28);
    context.closePath();
    context.fill();
    circle(t.x, t.y - 19, 11, PALETTE.thiefDark);
    context.strokeStyle = PALETTE.thief;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(t.x, t.y - 19, 11, 0, TAU);
    context.stroke();
    // Face: warm skin inside the hood.
    circle(t.x, t.y - 17, 7, '#d9a066');
    // Two dark eyes, high contrast on the skin.
    circle(t.x - 3, t.y - 18, 1.6, '#1a1206');
    circle(t.x + 3, t.y - 18, 1.6, '#1a1206');
    context.restore();
    // Grab progress ring, outside the figure.
    if (t.grabbing) {
      context.strokeStyle = PALETTE.loot;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(t.x, t.y, t.r + 24, -Math.PI / 2, -Math.PI / 2 + t.grabProgress * TAU);
      context.stroke();
    }
    // Grace blink after being caught.
    if (t.grace > 0 && Math.floor(t.grace * 8) % 2 === 0) {
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(t.x, t.y, t.r + 22, 0, TAU);
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

  // Title screen: dark, like the original. A full-screen dark overlay
  // (82% opaque) dims the room behind it, and the game name sits above a
  // yellow New Game button with black text — the name and the button are
  // the focus. One small instruction line sits under the button.
  function drawTitle(best) {
    // Dark overlay over the whole view, so the room is only dimly visible.
    rect(0, 0, VIEW_W, VIEW_H, 'rgba(7, 10, 18, 0.82)');

    // Game name, large and gold, above the button.
    text('THE AURUM JOB', VIEW_W / 2, 300, 64, PALETTE.hudGold, 'center');
    // A thin gold rule under the name, with diamond ornaments at the ends.
    context.strokeStyle = PALETTE.hudGold;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(480, 322);
    context.lineTo(800, 322);
    context.stroke();
    for (const dx of [480, 800]) {
      context.save();
      context.translate(dx, 322);
      context.rotate(Math.PI / 4);
      context.fillStyle = PALETTE.hudGold;
      context.fillRect(-4, -4, 8, 8);
      context.restore();
    }

    // New Game button: yellow background, black text, centred below the name.
    const b = NEW_GAME_BUTTON;
    roundRectPath(b.x, b.y, b.w, b.h, 10);
    context.fillStyle = PALETTE.loot;
    context.fill();
    context.strokeStyle = '#b8860b';
    context.lineWidth = 2;
    context.stroke();
    // A darker bottom edge so the button reads as raised.
    context.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(b.x + 10, b.y + b.h - 2);
    context.lineTo(b.x + b.w - 10, b.y + b.h - 2);
    context.stroke();
    text('New Game', b.x + b.w / 2, b.y + b.h / 2, 26, '#000000', 'center', 'middle');

    // One small instruction line under the button, then the Space hint.
    text(
      'Steal the Ledger, the Aurum Crown and the Bullion — past three guards, two cameras and the lasers — then vanish through the green doors.',
      VIEW_W / 2, 462, 15, PALETTE.hudText, 'center',
    );
    text('or press Space', VIEW_W / 2, 490, 14, PALETTE.hudDim, 'center');
    if (best > 0) {
      text(bestLabel(best), VIEW_W / 2, 518, 14, PALETTE.hudDim, 'center');
    }
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
      drawTitle(best);
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

  // Convert a point in canvas device pixels (what input.js reports for a
  // click) to view coordinates (1280x720), for hit-testing the New Game button.
  function toView(canvasX, canvasY) {
    return { x: (canvasX - view.x) / view.scale, y: (canvasY - view.y) / view.scale };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toView };
}
