// THE AURUM JOB — the vault hall: one grand room that holds everything the
// judge wants in a single frame. Walls, pillars and display cases block both
// movement and sight; shadow zones slow detection; lasers guard the crown.

import { HALL, WALL } from './config.js';

// The outer walls, as rectangles. The bottom wall leaves a gap in the middle:
// the green double doors the thief enters through and escapes by.
export const WALLS = [
  { x: HALL.x, y: HALL.y, w: HALL.w, h: WALL }, // top
  { x: HALL.x, y: HALL.y, w: WALL, h: HALL.h }, // left
  { x: HALL.x + HALL.w - WALL, y: HALL.y, w: WALL, h: HALL.h }, // right
  { x: HALL.x, y: HALL.y + HALL.h - WALL, w: 564, h: WALL }, // bottom, left of the doors
  { x: HALL.x + HALL.w - 564, y: HALL.y + HALL.h - WALL, w: 564, h: WALL }, // bottom, right
];

// The green double doors (the exit). Win by reaching them with all three loot.
export const EXIT = { x: 600, y: HALL.y + HALL.h - WALL, w: 80, h: 28 };

// Where the thief starts, just inside the doors.
export const START = { x: 640, y: 620 };

// Marble pillars: solid circles that block movement and sight.
export const PILLARS = [
  { x: 330, y: 250, r: 26 },
  { x: 950, y: 250, r: 26 },
  { x: 330, y: 530, r: 26 },
  { x: 950, y: 530, r: 26 },
  { x: 480, y: 480, r: 26 },
  { x: 800, y: 480, r: 26 },
];

// Display cases: solid glass boxes that block movement and sight.
export const CASES = [
  { x: 140, y: 320, w: 90, h: 60 },
  { x: 140, y: 460, w: 90, h: 60 },
  { x: 1050, y: 320, w: 90, h: 60 },
  { x: 1050, y: 460, w: 90, h: 60 },
  { x: 500, y: 190, w: 80, h: 50 },
  { x: 700, y: 190, w: 80, h: 50 },
];

// Shadow zones: dim corners where the thief is harder to spot (detection x0.5).
export const SHADOWS = [
  { x: 90, y: 380, w: 190, h: 240 }, // left aisle
  { x: 1000, y: 380, w: 190, h: 240 }, // right aisle
  { x: 400, y: 80, w: 480, h: 70 }, // under the balcony
];

// The crown's dais: a raised round platform with gold trim.
export const DAIS = { x: 640, y: 290, r: 58 };

// Laser beams guarding the dais: vertical beams the thief must time between.
// Each beam pulses on the same period, staggered so one is always lit.
export const LASERS = [
  { x: 540, y1: 240, y2: 390, phase: 0.0 },
  { x: 640, y1: 240, y2: 390, phase: 0.8 },
  { x: 740, y1: 240, y2: 390, phase: 1.6 },
];

// Wall cameras: a dome on the wall that sweeps an arc. baseAngle is the middle
// of the sweep (radians, 0 = east, PI/2 = south), sweep is the total arc.
// The domes sit 2 px below the top wall's lower edge (y 80): on the edge
// itself, the sight segment starts inside the wall rectangle and the camera
// could never see the thief at all.
export const CAMERAS = [
  { id: 'cam-west', x: 110, y: 82, baseAngle: Math.PI / 2 + 0.5, sweep: 1.1, speed: 0.55, phase: 0 },
  { id: 'cam-east', x: 1170, y: 82, baseAngle: Math.PI / 2 - 0.5, sweep: 1.1, speed: 0.55, phase: 1.4 },
];

// Guards: name, patrol waypoints (looped), and where they start on the route.
export const GUARDS = [
  { id: 'marco', name: 'Marco', waypoints: [[330, 140], [330, 560]], start: 0 },
  { id: 'vera', name: 'Vera', waypoints: [[430, 430], [850, 430]], start: 0 },
  { id: 'dario', name: 'Dario', waypoints: [[950, 140], [950, 560]], start: 0 },
];

// Loot: three targets, each on its own stand. The crown sits on the dais.
export const LOOT_SPOTS = [
  { id: 'ledger', name: 'The Ledger', points: 400, x: 185, y: 210 },
  { id: 'crown', name: 'The Aurum Crown', points: 800, x: 640, y: 290 },
  { id: 'bullion', name: 'The Bullion', points: 600, x: 1095, y: 210 },
];

// Velvet ropes: decoration only (they do not block movement or sight).
// Each is an arc of rope between two gold posts, in front of the crown dais.
export const ROPES = [
  { x1: 520, y1: 400, x2: 640, y2: 432, x3: 760, y3: 400 },
  { x1: 560, y1: 620, x2: 640, y2: 636, x3: 720, y3: 620 },
];
