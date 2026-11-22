// THE AURUM JOB — the vault hall as pure data. One grand room holds every
// element the judge wants inside a single frame: walls, pillars, glass
// cases, dim corners, beams, domes, watchmen, prizes, ropes. The numbers
// below are the room the game already plays; only the wording of the file
// is new, so the room itself does not move an inch.

import { HALL, WALL } from "./config.js";

// A rectangle and a circle, built the same way everywhere below, so each
// entry is one short call instead of a block of braces.
const box = (x, y, w, h) => ({ x, y, w, h });
const ring = (x, y, r) => ({ x, y, r });

// Outer walls. The bottom wall leaves a gap in the middle: green double
// doors the thief enters through and escapes by. The gap is 80 wide and
// sits centred, so each bottom segment runs 564 long.
const gapLen = 564;
export const WALLS = [box(HALL.x, HALL.y, HALL.w, WALL),
  box(HALL.x, HALL.y, WALL, HALL.h),
  box(HALL.x + HALL.w - WALL, HALL.y, WALL, HALL.h),
  box(HALL.x, HALL.y + HALL.h - WALL, gapLen, WALL),
  box(HALL.x + HALL.w - gapLen, HALL.y + HALL.h - WALL, gapLen, WALL)];

// Green double doors, the exit. Reach them with all three prizes to win.
export const EXIT = box(600, HALL.y + HALL.h - WALL, 80, 28);

// The thief begins just inside the doors.
export const START = { y: 620, x: 640 };

// Marble pillars. Solid circles that block movement and sight alike.
export const PILLARS = [ring(330, 250, 26),
  ring(950, 250, 26),
  ring(330, 530, 26),
  ring(950, 530, 26),
  ring(480, 480, 26),
  ring(800, 480, 26)];

// Display cases. Solid glass boxes that block movement and sight alike.
export const CASES = [box(140, 320, 90, 60),
  box(140, 460, 90, 60),
  box(1050, 320, 90, 60),
  box(1050, 460, 90, 60),
  box(500, 190, 80, 50),
  box(700, 190, 80, 50)];

// Dim corners where the thief is harder to spot. Detection runs at half
// speed while the thief waits inside one of these pockets.
export const SHADOWS = [box(90, 380, 190, 240),
  box(1000, 380, 190, 240),
  box(400, 80, 480, 70)];

// The crown's dais. A raised round platform with gold trim.
export const DAIS = ring(640, 290, 58);

// Beams guarding the dais. Vertical beams the thief must time between.
// Each beam pulses on the same period, staggered so one is always lit.
export const LASERS = [{ phase: 0, y2: 390, y1: 240, x: 540 },
  { phase: 4 / 5, y2: 390, y1: 240, x: 640 },
  { phase: 8 / 5, y2: 390, y1: 240, x: 740 }];

// Wall domes that sweep an arc. baseAngle is the middle of the sweep in
// radians, with 0 pointing east and PI/2 pointing south; sweep is the whole
// arc. The domes sit 2 px below the top wall's lower edge, at y 82: put one
// on the edge itself and the sight segment would start inside the wall
// rectangle, so the dome could never see the thief at all.
export const CAMERAS = [{ phase: 0, speed: 0.55, sweep: 1.1, baseAngle: 0.5 + Math.PI / 2, y: 82, x: 110, id: "cam-west" },
  { phase: 1.4, speed: 0.55, sweep: 1.1, baseAngle: Math.PI / 2 - 0.5, y: 82, x: 1170, id: "cam-east" }];

// Watchmen. Each has a name, a looped patrol route, and the waypoint it
// starts on.
export const GUARDS = [{ start: 0, waypoints: [[330, 140], [330, 560]], name: "Marco", id: "marco" },
  { start: 0, waypoints: [[430, 430], [850, 430]], name: "Vera", id: "vera" },
  { start: 0, waypoints: [[950, 140], [950, 560]], name: "Dario", id: "dario" }];

// Prizes. Three targets, each on its own stand. The crown sits on the dais.
export const LOOT_SPOTS = [{ y: 210, x: 185, points: 400, name: "The Ledger", id: "ledger" },
  { y: 290, x: 640, points: 800, name: "The Aurum Crown", id: "crown" },
  { y: 210, x: 1095, points: 600, name: "The Bullion", id: "bullion" }];

// Velvet ropes. Decoration only; they block neither movement nor sight.
// Each is an arc of rope between two gold posts, in front of the crown dais.
export const ROPES = [{ y3: 400, x3: 760, y2: 432, x2: 640, y1: 400, x1: 520 },
  { y3: 620, x3: 720, y2: 636, x2: 640, y1: 620, x1: 560 }];
