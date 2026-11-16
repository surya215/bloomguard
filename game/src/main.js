// Bloomguard's boot: canvas, loop, and the ?shot= scenes. The loop steps the
// world in fixed 1/60 slices so a slow frame never jumps the simulation, and
// draws every frame. ?shot=title|play|win|lose stages a deterministic scene
// for screenshots (see autopilot.js) and sets window.__shotReady when the
// frame is drawn. window.__game is the small test handle the play-test drives.
import { CANVAS } from './config.js';
import { createWorld, stepWorld, startRun, SCREEN_TITLE, SCREEN_PLAY } from './world.js';
import { drawWorld } from './render.js';
import { attachInput } from './input.js';
import { makeAudio } from './audio.js';
import { stageShot } from './autopilot.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '20261116') >>> 0;
const shot = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
const ctx = canvas.getContext('2d');

const world = createWorld(seed);
const audio = makeAudio();
attachInput(canvas, world, audio);

let shotStaged = null;
if (shot) {
  shotStaged = stageShot(shot, world);
  if (shotStaged) world.screen = shotStaged.screen;
}

let last = performance.now();
let shotReady = false;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shot) {
    // Fixed slices: the simulation never leaps on a slow frame.
    let remaining = elapsed;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 60);
      const events = stepWorld(world, dt);
      for (const e of events) {
        if (e === 'shoot') audio.shoot();
        else if (e === 'hit') audio.hit();
        else if (e === 'pop') audio.pop();
        else if (e === 'sun') audio.sun();
        else if (e === 'frost') audio.frost();
        else if (e === 'horn') audio.horn();
        else if (e === 'breach') audio.breach();
        else if (e === 'win') audio.win();
        else if (e === 'lose') audio.lose();
      }
      remaining -= dt;
    }
  }
  drawWorld(ctx, world);
  if (shot && !shotReady) {
    shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test handle: the play-test drives the real game through these, and the
// screenshots page reads the state. Nothing here changes the rules.
window.__game = {
  world,
  start: () => startRun(world),
  state: () => ({
    screen: world.screen,
    sun: world.sun,
    hearts: world.hearts,
    score: world.score,
    wave: world.wave,
    phase: world.phase,
    enemies: world.enemies.length,
    plants: world.plantedCount,
    kills: world.kills,
  }),
  step: (seconds) => {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i += 1) stepWorld(world, 1 / 60);
  },
  clickAt: (x, y) => {
    const rect = canvas.getBoundingClientRect();
    const e = new PointerEvent('pointerdown', {
      clientX: rect.left + (x / CANVAS.width) * rect.width,
      clientY: rect.top + (y / CANVAS.height) * rect.height,
      bubbles: true,
    });
    canvas.dispatchEvent(e);
  },
  key: (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })),
};

if (!shot && world.screen === SCREEN_TITLE) {
  // Title screen: keep the sky alive behind it.
  world.time = 0;
}
