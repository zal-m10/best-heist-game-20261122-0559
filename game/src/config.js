// THE AURUM JOB — every tuning number and the whole palette in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// fit the window, so no rule below depends on the screen size.

// Logical playfield (the canvas is scaled to fit the window).
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Layout: a top HUD bar, the vault hall, a bottom hint bar.
export const TOP_BAR_H = 48;
export const BOTTOM_BAR_H = 28;
export const PLAY_W = VIEW_W;
export const PLAY_H = VIEW_H - TOP_BAR_H - BOTTOM_BAR_H; // 644
export const PLAY_Y = TOP_BAR_H;

// The vault hall: outer walls, in play-area coordinates (y already includes TOP_BAR_H).
export const HALL = { x: 36, y: PLAY_Y + 16, w: 1208, h: 600 };
export const WALL = 16;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

// The thief.
export const THIEF = {
  radius: 13,
  walkSpeed: 210,
  sneakSpeed: 110,
  sprintSpeed: 320,
  grabSeconds: 0.8,
};

// Guards: patrol speed, chase speed, vision cone, detection rates.
export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  investigateSpeed: 130,
  chaseSpeed: 205,
  visionRange: 265,
  visionHalfAngle: 0.56, // ~32 degrees
  detectWalk: 0.75,
  detectSneak: 0.38,
  detectSprint: 1.25,
  detectShadow: 0.5, // multiplier while the thief stands in a shadow zone
  detectFalloff: 0.55,
  suspiciousAt: 0.45,
  alertAt: 1.0,
  touchDistance: 30,
  investigateSeconds: 4,
};

// Cameras: a wall dome that sweeps an arc and raises HEAT when it sees the thief.
export const CAMERA = {
  range: 305,
  halfAngle: 0.46, // ~26 degrees
  heatPerSecond: 13,
  jamSeconds: 6,
};

// Lasers: beams across the crown dais that pulse on and off.
export const LASER = {
  period: 2.4,
  onFraction: 0.55,
  heatOnCross: 34,
};

// HEAT (the alarm meter): 0 to 100. At 100 the alarm trips a strike.
export const HEAT = {
  max: 100,
  guardAlertPerSecond: 26,
  falloffPerSecond: 6,
  strikeReset: 50,
  lockdownSeconds: 6,
};

export const STRIKES_MAX = 3;

// Tools, each with a limited count. A tool's cost is the count itself.
export const TOOLS = {
  coins: 3,
  smoke: 2,
  jammers: 1,
  smokeSeconds: 4,
  coinHearRadius: 320,
};

// Loot: three targets, each worth its own score.
export const LOOT = [
  { id: 'ledger', name: 'The Ledger', points: 400 },
  { id: 'crown', name: 'The Aurum Crown', points: 800 },
  { id: 'bullion', name: 'The Bullion', points: 600 },
];

export const SCORE = { timeBonusMax: 600, timeBonusSeconds: 240, ghostBonus: 500 };

/** Seconds a strike's invulnerability lasts after the thief is dragged back. */
export const GRACE_SECONDS = 2;

// Palette — a gilded vault at night: deep navy floor, gold inlay, velvet red,
// amber guard cones, red camera cones, green safe exit. Safe, danger and loot
// are a different colour each, readable at a glance.
export const PALETTE = {
  backdrop: '#070a12',
  floor: '#0e1424',
  floorInlay: '#1a2340',
  floorGold: '#8a6a2f',
  floorGoldBright: '#c9a227',
  wall: '#232c4a',
  wallTop: '#3d4a73',
  wallTrim: '#c9a227',
  pillar: '#c8ccd8',
  pillarDark: '#7d8296',
  pillarGold: '#c9a227',
  caseGlass: 'rgba(140, 190, 230, 0.16)',
  caseFrame: '#c9a227',
  caseBase: '#1c2438',
  rope: '#a4123f',
  ropePost: '#c9a227',
  shadowZone: 'rgba(10, 16, 40, 0.55)',
  shadowEdge: 'rgba(90, 120, 200, 0.25)',
  // Vision cones: amber for guards, red for cameras. Suspicion warms the amber.
  coneGuard: 'rgba(255, 183, 77, 0.20)',
  coneGuardEdge: 'rgba(255, 183, 77, 0.55)',
  coneSuspicious: 'rgba(255, 170, 40, 0.34)',
  coneSuspiciousEdge: 'rgba(255, 170, 40, 0.9)',
  coneAlert: 'rgba(255, 74, 74, 0.40)',
  coneAlertEdge: 'rgba(255, 74, 74, 0.95)',
  coneCamera: 'rgba(255, 92, 92, 0.18)',
  coneCameraEdge: 'rgba(255, 92, 92, 0.6)',
  coneJammed: 'rgba(120, 130, 150, 0.10)',
  laser: '#ff3b3b',
  laserOff: 'rgba(255, 59, 59, 0.14)',
  laserGlow: 'rgba(255, 59, 59, 0.35)',
  thief: '#2dd4bf',
  thiefDark: '#0f766e',
  thiefRing: '#5eead4',
  guard: '#2b3350',
  guardSuit: '#1c2338',
  guardTrim: '#f2b544',
  guardFace: '#e8b34a',
  cameraBody: '#232c4a',
  cameraLens: '#ff4d4d',
  loot: '#ffd94a',
  lootGlow: 'rgba(255, 217, 74, 0.35)',
  exit: '#2ee06f',
  exitDark: '#14532d',
  exitLocked: '#5b4a1e',
  smoke: 'rgba(190, 200, 220, 0.4)',
  coin: '#ffd94a',
  hudBg: '#0a0e1a',
  hudPanel: '#111830',
  hudLine: '#232c4a',
  hudText: '#e8ecf4',
  hudDim: '#8a93ad',
  hudGold: '#ffd94a',
  hudGreen: '#2ee06f',
  hudRed: '#ff5a5a',
  hudAmber: '#ffb74d',
  heatLow: '#2ee06f',
  heatMid: '#ffb74d',
  heatHigh: '#ff5a5a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'aurum-job.best';
