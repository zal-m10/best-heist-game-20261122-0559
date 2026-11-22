// A small seeded random number generator (mulberry32): the same seed always
// gives the same stream, so a screenshot scene is reproducible.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}
