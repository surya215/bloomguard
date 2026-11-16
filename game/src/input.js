// Bloomguard's controls: mouse (cards, tiles, HUD buttons) and keyboard
// (1/2/3 select, Space pause, R restart, M mute, Enter start). All clicks go
// through the canvas; coordinates are scaled to the game's 1280x720 space.
import { CANVAS, PLANT_ORDER } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_WON, SCREEN_LOST, tileAt, plantAt, callWaveEarly, startRun } from './world.js';
import { BUTTONS, cardAt, inRect } from './render.js';

export function attachInput(canvas, world, audio) {
  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS.width,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS.height,
    };
  }

  function start() {
    audio.ensure();
    audio.startMusic();
    startRun(world);
  }

  function onMove(e) {
    const { x, y } = toGame(e);
    world.hover = tileAt(x, y);
  }

  function onClick(e) {
    const { x, y } = toGame(e);
    audio.ensure();
    if (inRect(x, y, BUTTONS.mute)) {
      const muted = audio.toggleMute();
      world.mutedNote = muted ? 'Muted' : 'Sound on';
      return;
    }
    if (world.screen === SCREEN_TITLE || world.screen === SCREEN_WON || world.screen === SCREEN_LOST) {
      audio.click();
      start();
      return;
    }
    if (inRect(x, y, BUTTONS.pause)) {
      audio.click();
      world.screen = world.screen === SCREEN_PAUSE ? SCREEN_PLAY : SCREEN_PAUSE;
      return;
    }
    if (world.screen === SCREEN_PAUSE) return;
    if (world.screen !== SCREEN_PLAY) return;
    if (world.phase === 'build' && inRect(x, y, BUTTONS.callWave)) {
      if (callWaveEarly(world)) audio.horn();
      return;
    }
    const card = cardAt(x, y);
    if (card) {
      world.selected = card;
      audio.click();
      return;
    }
    const tile = tileAt(x, y);
    if (tile) {
      const result = plantAt(world, tile.row, tile.col, world.selected);
      if (result === 'poor') {
        audio.click();
      } else if (result) {
        audio.plant();
      }
    }
  }

  function onKey(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'enter' && (world.screen === SCREEN_TITLE || world.screen === SCREEN_WON || world.screen === SCREEN_LOST)) {
      audio.ensure();
      audio.click();
      start();
      return;
    }
    if (key === 'm') {
      audio.toggleMute();
      return;
    }
    if (key === 'r') {
      if (world.screen !== SCREEN_TITLE) {
        audio.ensure();
        audio.click();
        start();
      }
      return;
    }
    if (key === ' ') {
      e.preventDefault();
      if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSE) {
        audio.click();
        world.screen = world.screen === SCREEN_PAUSE ? SCREEN_PLAY : SCREEN_PAUSE;
      }
      return;
    }
    const index = ['1', '2', '3'].indexOf(key);
    if (index >= 0) {
      world.selected = PLANT_ORDER[index];
      audio.click();
    }
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onClick);
  window.addEventListener('keydown', onKey);
  return function detach() {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onClick);
    window.removeEventListener('keydown', onKey);
  };
}
