// Keyboard and mouse: WASD/arrows to move, Shift to sneak, Space to sprint,
// E to grab loot, click to throw a coin, Q for smoke, F to jam the cameras,
// R to retry, P/Esc to pause, M to mute. One-shot actions are consumed by
// takeActions() so the loop sees each press exactly once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RETRY = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let clickConsumed = true;

  function keyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'r') actions |= ACTION_RETRY;
    if (key === 'm') actions |= ACTION_MUTE;
  }

  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    clickConsumed = false;
  }

  function blur() {
    keys.clear();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('pointerdown', onClick);

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  // The click point, in canvas pixels, once per click (null afterwards).
  function takeClick() {
    if (clickConsumed || !click) return null;
    clickConsumed = true;
    return click;
  }

  function held(key) {
    return keys.has(key);
  }

  return { direction, takeActions, takeClick, held };
}
