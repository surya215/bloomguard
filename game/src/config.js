// Bloomguard tuning: canvas, grid, economy, combat. One place for every number
// a designer would want to change; the rest of the game reads from here.
export const CANVAS = { width: 1280, height: 720 };

export const GRID = {
  rows: 5,
  cols: 9,
  x0: 150, // left edge of the first tile (garden gate sits left of this)
  y0: 96, // top edge of the first tile (below the HUD bar)
  tileW: 112,
  tileH: 104,
};
GRID.x1 = GRID.x0 + GRID.cols * GRID.tileW;
GRID.y1 = GRID.y0 + GRID.rows * GRID.tileH;

// Garden gate: enemies that cross this x eat one heart.
export const GATE_X = GRID.x0 - 26;

export const HUD = { height: 84 };
export const CARDS = { y: 640, height: 68, width: 190, gap: 14, x0: 150 };

export const START = { sun: 150, hearts: 5 };
export const WAVES_TOTAL = 10;
export const BUILD_SECONDS = 14; // calm time before a wave walks in
export const EARLY_CALL_BONUS_SUN = 50; // sun for starting a wave early

// Plants. hp: how much bite damage a plant survives. interval: seconds between
// actions. damage / slow: what the action does. rangePx: how far down its row
// a shooter reaches (whole row here); a bell rings its whole row.
export const PLANTS = {
  sunbloom: {
    key: 'sunbloom',
    name: 'Sunbloom',
    cost: 50,
    hp: 120,
    interval: 6,
    sunPerBloom: 25,
    color: '#ffd94d',
    blurb: 'Grows +25 sun',
  },
  thornshot: {
    key: 'thornshot',
    name: 'Thornshot',
    cost: 100,
    hp: 140,
    interval: 1.1,
    damage: 20,
    projectileSpeed: 430,
    color: '#7ee081',
    blurb: 'Shoots thorns',
  },
  frostbell: {
    key: 'frostbell',
    name: 'Frostbell',
    cost: 75,
    hp: 130,
    interval: 2.6,
    slowFactor: 0.5, // enemies move at half speed
    slowSeconds: 3,
    color: '#8ecdf5',
    blurb: 'Chills its row',
  },
};
export const PLANT_ORDER = ['sunbloom', 'thornshot', 'frostbell'];

// Enemies. speed: px per second. score: points for the kill. sunDrop: sun the
// kill leaves behind. bite: damage per second while chewing a plant.
export const ENEMIES = {
  mite: {
    key: 'mite',
    name: 'Mite',
    hp: 60,
    speed: 24,
    score: 50,
    sunDrop: 10,
    bite: 12,
    radius: 15,
    color: '#c98a4b',
  },
  ant: {
    key: 'ant',
    name: 'Swift Ant',
    hp: 40,
    speed: 48,
    score: 80,
    sunDrop: 10,
    bite: 10,
    radius: 13,
    color: '#b8452f',
  },
  beetle: {
    key: 'beetle',
    name: 'Armored Beetle',
    hp: 210,
    speed: 15,
    score: 150,
    sunDrop: 25,
    bite: 20,
    radius: 21,
    color: '#5a6b8a',
  },
};

// Wave n (1-based): how many walk in, how fast, and what mix. hpScale grows
// the challenge as the player gets better; the mix shifts from mites to ants
// and then beetles so no single planting answers every wave.
export function waveSpec(n) {
  const count = 5 + 2 * n;
  const interval = Math.max(0.9, 2.3 - 0.12 * n);
  const hpScale = 1 + 0.12 * (n - 1);
  const speedScale = 1 + 0.02 * (n - 1);
  const mix = [];
  for (let i = 0; i < count; i += 1) {
    const roll = (i * 37 + n * 11) % 100;
    if (n >= 5 && roll < 18) mix.push('beetle');
    else if (n >= 3 && roll < 55) mix.push('ant');
    else mix.push('mite');
  }
  return { n, count, interval, hpScale, speedScale, mix };
}

export const SCORE = {
  waveClear: (n) => 100 + 50 * n,
  winHeartBonus: 250,
};
