// Startup and the single loop. Each frame reads the input, advances the
// world in fixed 1/60 s steps — several in a slow frame, none in a fast
// one — and paints what is there. The game moves between five screens:
// title, play, paused, win and game over. Sound starts on first input.
//
// ?seed=N pins the layout's randomness. ?shot=cover|sneak|alarm|getaway,
// with &seed=N, stages that scene instead of running the loop, paints it
// twice, and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from "./config.js";
import { createRandom } from "./random.js";
import { createWorld, EVENT_ALARM, EVENT_LASER, EVENT_LOOT, EVENT_OVER, EVENT_SPOTTED, EVENT_TOOL, EVENT_WIN } from "./world.js";
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RETRY, createInput } from "./input.js";
import { createAudio } from "./audio.js";
import { createRenderer, NEW_GAME_BUTTON, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from "./render.js";
import { stageShot } from "./shots.js";

// Longest frame the loop catches up on. A longer stall, such as a hidden
// tab, is dropped rather than replayed.
const MAX_FRAME = 0.25;

const query = new URLSearchParams(window.location.search);
const shotName = query.get("shot");
const seedRaw = Number.parseInt(query.get("seed") ?? "", 10);
const seed = Number.isInteger(seedRaw) ? seedRaw : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById("game");
const statusLine = document.getElementById("status");
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function fetchBest() {
  try {
    const stored = window.localStorage.getItem(BEST_KEY) ?? "0";
    return Number.parseInt(stored, 10) || 0;
  } catch {
    return 0;
  }
}

function keepBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off in private windows. The best score then lasts
    // this visit only.
  }
}

function showShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  const paint = () => {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
}

function runLoop() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = fetchBest();
  let accumulator = 0;
  let last = performance.now();
  let smokeWasDown = false;
  let jamWasDown = false;

  // Screen readers, and anyone watching the page text, hear the screen
  // changes and each hit.
  const tell = (message) => {
    statusLine.textContent = message;
  };

  const startRun = () => {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    tell("Playing. Steal the Ledger, the Crown and the Bullion, then reach the green doors.");
  };

  const endRun = (won) => {
    if (won) {
      screen = SCREEN_WIN;
      if (world.state.winScore > best) {
        best = world.state.winScore;
        keepBest(best);
      }
      audio.win();
      tell(`Clean getaway. Score ${world.state.winScore}. Best ${best}.`);
      return;
    }
    screen = SCREEN_OVER;
    audio.lose();
    tell(`Busted. Score ${world.state.score}. Best ${best}.`);
  };

  const readActions = () => {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      tell(audio.toggleMute() ? "Muted." : "Sound on.");
    }
    if (screen === SCREEN_TITLE) {
      const click = input.takeClick();
      if (click) {
        const point = renderer.toView(click.x, click.y);
        const hitX = point.x >= NEW_GAME_BUTTON.x && point.x <= NEW_GAME_BUTTON.x + NEW_GAME_BUTTON.w;
        const hitY = point.y >= NEW_GAME_BUTTON.y && point.y <= NEW_GAME_BUTTON.y + NEW_GAME_BUTTON.h;
        if (hitX && hitY) {
          audio.resume();
          startRun();
          return;
        }
      }
    }
    const canRetry = screen === SCREEN_PLAY || screen === SCREEN_OVER || screen === SCREEN_WIN;
    if (actions & ACTION_RETRY && canRetry) {
      startRun();
      return;
    }
    const canConfirm = screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN;
    if (actions & ACTION_CONFIRM && canConfirm) {
      audio.resume();
      startRun();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      tell("Paused.");
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      tell("Playing.");
    }
  };

  const tickWorld = () => {
    if (screen === SCREEN_TITLE) return;
    const click = input.takeClick();
    const move = input.direction();
    const sneak = input.held("shift");
    const sprint = input.held(" ");
    const grab = input.held("e");
    const smokeDown = input.held("q");
    const jamDown = input.held("f");
    const smoke = smokeDown && !smokeWasDown;
    const jam = jamDown && !jamWasDown;
    smokeWasDown = smokeDown;
    jamWasDown = jamDown;
    const events = world.step(STEP, move, sneak, sprint, grab, click, smoke, jam);
    if (move.x !== 0 || move.y !== 0) audio.step(sneak, STEP);
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_LASER) audio.laser();
    if (events & EVENT_ALARM) audio.alarm();
    if (events & EVENT_TOOL) audio.coin();
    if (events & EVENT_WIN) endRun(true);
    else if (events & EVENT_OVER) endRun(false);
  };

  const frame = (now) => {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    readActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        tickWorld();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  };

  // Leaving the tab pauses a running game instead of letting the watch
  // close in unseen.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      tell("Paused.");
    }
  });

  tell("The Aurum Job. Press Space or click New Game to start.");
  requestAnimationFrame(frame);
}

if (shotName) showShot(shotName);
else runLoop();
