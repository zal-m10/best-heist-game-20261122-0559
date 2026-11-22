# The Aurum Job

A complete stealth heist game that plays offline in a desktop browser.
One thief, one gilded vault hall, three pieces of loot — and a night watch
that is always looking.

## The job

You slip in through the green double doors at the bottom of the hall and
must steal all three:

- **The Ledger** — 400 points, left wing
- **The Aurum Crown** — 800 points, centre dais, behind three pulsing lasers
- **The Bullion** — 600 points, right wing

Then get back to the green doors with everything. Score is loot plus a
speed bonus (up to 600) and a Ghost bonus of 500 if nobody ever spots you.
Your best score is kept in the browser.

## The watch

- **Guards** — Marco, Vera and Dario patrol the hall with amber vision
  cones. A guard who half-sees you grows suspicious (`?`) and comes to
  look; one who fully spots you gives chase (`!`) and drives the HEAT
  meter up. Touching you while chasing is a strike.
- **Cameras** — two wall domes sweep red cones across the hall. Being
  seen raises HEAT.
- **Lasers** — three beams guard the crown dais, pulsing on a 2.4 second
  cycle. Crossing a live beam adds 34 HEAT and draws the nearest guard.
- **HEAT** — the alarm meter in the top bar. It rises from guards,
  cameras and lasers, and cools when you stay hidden. At 100 the alarm
  trips: a strike, the thief is dragged back to the doors, the doors seal
  for 6 seconds (LOCKDOWN) and HEAT resets to 50. Three strikes and you
  are BUSTED.

## Cover and tools

- **Shadow zones** (dim corners and the balcony) halve how fast a guard
  spots you. Pillars and display cases block both movement and sight.
- **Coins** (click to throw, 3) — the nearest guard investigates where
  the coin lands.
- **Smoke** (Q, 2) — a 4 second cloud that blocks sight.
- **Jammer** (F, 1) — disables both cameras for 6 seconds.
- **Sneak** (Shift) — slow and quiet, harder to spot. **Sprint**
  (Space) — fast, but loud: nearby guards hear it.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak |
| Space | Sprint (also starts the game) |
| E (hold) | Grab loot (0.8 s) |
| Click | Throw a coin at that spot |
| Q | Throw smoke |
| F | Jam the cameras |
| R | Retry |
| P / Esc | Pause |
| M | Mute |

## How to play

Serve the `game/` folder with any static server (or open
`game/index.html` from disk) and open it in a desktop browser. No
network connection is needed: the game is plain HTML, CSS and JavaScript
with synthesized WebAudio sound — no libraries, no fetched assets, no
tracking.

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

## Files

- `game/index.html` — the page: a canvas and the module script.
- `game/src/config.js` — all tuning numbers and the palette.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/levels.js` — the hall: walls, pillars, cases, shadows, dais,
  lasers, cameras, guard patrols, loot spots, ropes.
- `game/src/world.js` — the simulation: movement and collision, line of
  sight, guard AI, detection, cameras, lasers, HEAT, strikes, loot, tools.
- `game/src/render.js` — art-deco drawing: the vault, vision cones, HUD
  (HEAT bar, strikes, loot pips, tool counts), title/paused/win/lose.
- `game/src/audio.js` — WebAudio synth (steps, coin, loot, alarm, win).
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=`) and
  the autopilot that plays them by the real rules.
- `game/src/main.js` — boot and the fixed-step game loop.
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `vendor/makefun-game.ts` — the make.fun library, unchanged from the kit.
- `screenshots/` — four real renders of this game (cover, sneak, alarm,
  getaway).
