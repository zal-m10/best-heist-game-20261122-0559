// THE AURUM JOB — all tuning values and the full colour set, in one place.
// The stage is a fixed 1280 by 720 area; the painter scales it to fit the
// window, so no rule here leans on the screen size.

// Stage size (the canvas is scaled to fit the window).
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Layout: a top bar for the HUD, the vault hall, a bottom bar for hints.
export const TOP_BAR_H = 48;
export const BOTTOM_BAR_H = 28;
export const PLAY_W = 1280;
export const PLAY_H = 644;
export const PLAY_Y = 48;

// The vault hall: outer walls, in stage coordinates (y already counts the top bar).
export const HALL = { x: 36, y: 64, w: 1208, h: 600 };
export const WALL = 16;

/** One fixed update, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

// The thief.
export const THIEF = {};
THIEF.radius = 13;
THIEF.walkSpeed = 210;
THIEF.sneakSpeed = 110;
THIEF.sprintSpeed = 320;
THIEF.grabSeconds = 0.8;

// Watchmen: walk speed, chase speed, sight cone, how fast they notice.
export const GUARD = {};
GUARD.radius = 14;
GUARD.patrolSpeed = 78;
GUARD.investigateSpeed = 130;
GUARD.chaseSpeed = 205;
GUARD.visionRange = 265;
GUARD.visionHalfAngle = 0.56; // near 32 degrees
GUARD.detectWalk = 0.75;
GUARD.detectSneak = 0.38;
GUARD.detectSprint = 1.25;
GUARD.detectShadow = 0.5; // factor while the thief waits in a dim pocket
GUARD.detectFalloff = 0.55;
GUARD.suspiciousAt = 0.45;
GUARD.alertAt = 1.0;
GUARD.touchDistance = 30;
GUARD.investigateSeconds = 4;

// Wall domes: they sweep an arc and push HEAT up while they see the thief.
export const CAMERA = {};
CAMERA.range = 305;
CAMERA.halfAngle = 0.46; // near 26 degrees
CAMERA.heatPerSecond = 13;
CAMERA.jamSeconds = 6;

// Light beams across the crown stand that blink on and off.
export const LASER = {};
LASER.period = 2.4;
LASER.onFraction = 0.55;
LASER.heatOnCross = 34;

// HEAT (the alarm meter): 0 to 100. At 100 the alarm sounds a strike.
export const HEAT = {};
HEAT.max = 100;
HEAT.guardAlertPerSecond = 26;
HEAT.falloffPerSecond = 6;
HEAT.strikeReset = 50;
HEAT.lockdownSeconds = 6;

export const STRIKES_MAX = 3;

// Kit items, each with a set count. An item's price is the count itself.
export const TOOLS = {};
TOOLS.coins = 3;
TOOLS.smoke = 2;
TOOLS.jammers = 1;
TOOLS.smokeSeconds = 4;
TOOLS.coinHearRadius = 320;

// Prizes: three targets, each worth its own points.
export const LOOT = [
  { points: 400, id: 'ledger', name: 'The Ledger' },
  { points: 800, id: 'crown', name: 'The Aurum Crown' },
  { points: 600, id: 'bullion', name: 'The Bullion' },
];

export const SCORE = {};
SCORE.timeBonusMax = 600;
SCORE.timeBonusSeconds = 240;
SCORE.ghostBonus = 500;

/** Seconds a strike's shield lasts once the thief is hauled back. */
export const GRACE_SECONDS = 2;

// Colours — a gilded vault after dark: deep navy floor, gold inlay, velvet
// red, amber watch cones, red domes, green safe doors. Safe, danger and
// prizes each get their own colour, readable in one glance.
export const PALETTE = {};
PALETTE.backdrop = '#070a12';
PALETTE.floor = '#0e1424';
PALETTE.floorInlay = '#1a2340';
PALETTE.floorGold = '#8a6a2f';
PALETTE.floorGoldBright = '#c9a227';
PALETTE.wall = '#232c4a';
PALETTE.wallTop = '#3d4a73';
PALETTE.wallTrim = '#c9a227';
PALETTE.pillar = '#c8ccd8';
PALETTE.pillarDark = '#7d8296';
PALETTE.pillarGold = '#c9a227';
PALETTE.caseGlass = 'rgba(140, 190, 230, 0.16)';
PALETTE.caseFrame = '#c9a227';
PALETTE.caseBase = '#1c2438';
PALETTE.rope = '#a4123f';
PALETTE.ropePost = '#c9a227';
PALETTE.shadowZone = 'rgba(10, 16, 40, 0.55)';
PALETTE.shadowEdge = 'rgba(90, 120, 200, 0.25)';
// Sight cones: amber for watchmen, red for domes. Wariness warms the amber.
PALETTE.coneGuard = 'rgba(255, 183, 77, 0.20)';
PALETTE.coneGuardEdge = 'rgba(255, 183, 77, 0.55)';
PALETTE.coneSuspicious = 'rgba(255, 170, 40, 0.34)';
PALETTE.coneSuspiciousEdge = 'rgba(255, 170, 40, 0.9)';
PALETTE.coneAlert = 'rgba(255, 74, 74, 0.40)';
PALETTE.coneAlertEdge = 'rgba(255, 74, 74, 0.95)';
PALETTE.coneCamera = 'rgba(255, 92, 92, 0.18)';
PALETTE.coneCameraEdge = 'rgba(255, 92, 92, 0.6)';
PALETTE.coneJammed = 'rgba(120, 130, 150, 0.10)';
PALETTE.laser = '#ff3b3b';
PALETTE.laserOff = 'rgba(255, 59, 59, 0.14)';
PALETTE.laserGlow = 'rgba(255, 59, 59, 0.35)';
PALETTE.thief = '#2dd4bf';
PALETTE.thiefDark = '#0f766e';
PALETTE.thiefRing = '#5eead4';
PALETTE.guard = '#2b3350';
PALETTE.guardSuit = '#1c2338';
PALETTE.guardTrim = '#f2b544';
PALETTE.guardFace = '#e8b34a';
PALETTE.cameraBody = '#232c4a';
PALETTE.cameraLens = '#ff4d4d';
PALETTE.loot = '#ffd94a';
PALETTE.lootGlow = 'rgba(255, 217, 74, 0.35)';
PALETTE.exit = '#2ee06f';
PALETTE.exitDark = '#14532d';
PALETTE.exitLocked = '#5b4a1e';
PALETTE.smoke = 'rgba(190, 200, 220, 0.4)';
PALETTE.coin = '#ffd94a';
PALETTE.hudBg = '#0a0e1a';
PALETTE.hudPanel = '#111830';
PALETTE.hudLine = '#232c4a';
PALETTE.hudText = '#e8ecf4';
PALETTE.hudDim = '#8a93ad';
PALETTE.hudGold = '#ffd94a';
PALETTE.hudGreen = '#2ee06f';
PALETTE.hudRed = '#ff5a5a';
PALETTE.hudAmber = '#ffb74d';
PALETTE.heatLow = '#2ee06f';
PALETTE.heatMid = '#ffb74d';
PALETTE.heatHigh = '#ff5a5a';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'aurum-job.best';
