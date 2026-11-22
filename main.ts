// Best-heist-game entry point. The bounty intake runs this file with Node 22.
// All it does is gather the finished game and its screenshots into the output
// directory, then hand that directory to the vendored make.fun helper so it
// can write the dossier.json the graders read. Nothing here reaches the network.
import {
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import {
  join,
} from 'node:path';
import {
  fileURLToPath,
} from 'node:url';
import {
  buildDossier,
} from './vendor/makefun-game.ts';

// The folder this file lives in; the game and screenshots sit beside it.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The harness points MAKEFUN_OUTPUT_DIR at the bundle folder. When the
// variable is missing we use the container's default location instead.
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Make sure the destination exists before we copy anything into it.
mkdirSync(outputRoot, { recursive: true });

// Copy the playable game, exactly as it is on disk.
cpSync(
  join(repoRoot, 'game'),
  join(outputRoot, 'game'),
  { recursive: true },
);

// Copy the screenshots, when the folder is there to copy from.
const shotsTarget = join(outputRoot, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
const shotsSource = join(repoRoot, 'screenshots');
if (existsSync(shotsSource)) {
  cpSync(shotsSource, shotsTarget, { recursive: true });
}

// Ask the vendored helper for the dossier text and save it.
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: {
    max: 4,
    max_bytes: 262144,
  },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
