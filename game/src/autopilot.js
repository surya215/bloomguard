// The screenshot scenes behind ?shot=title|play|win|lose. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (plant sun in the back, shooters where the blight is
// thickest, chill a crowded row, call a wave early when ready), so the frame
// is what a real game looks like and the same seed always gives the same frame.
// The win scene's pilot starts with a full purse; the lose scene's plants
// nothing at all, as a player who never plants would.
import { GRID, PLANTS } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON, SCREEN_LOST, resetWorld, startRun, plantAt, callWaveEarly, stepWorld } from './world.js';

const STEP = 1 / 30;
const LIMIT_SECONDS = 900;

function countPlants(world, kind) {
  let n = 0;
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if (world.plants[r][c] && world.plants[r][c].kind === kind) n += 1;
    }
  }
  return n;
}

function enemiesInRow(world, row) {
  let n = 0;
  for (const e of world.enemies) if (e.row === row) n += 1;
  return n;
}

function firstFreeTile(world, cols) {
  for (let r = 0; r < GRID.rows; r += 1) {
    for (const c of cols) {
      if (!world.plants[r][c]) return { row: r, col: c };
    }
  }
  return null;
}

function leftmostEnemyX(world, row) {
  let x = Infinity;
  for (const e of world.enemies) if (e.row === row && e.x < x) x = e.x;
  return x;
}

/**
 * Plant a Thornshot in `row` where it can actually shoot: left of the row's
 * leftmost blight (thorns fly right, so a shooter planted ahead of an enemy
 * that already walked past it can never hit it). Returns true when planted.
 */
function plantShooter(world, row) {
  const front = leftmostEnemyX(world, row);
  const cols = [2, 3, 4, 5, 6, 7, 1];
  let best = null;
  for (const c of cols) {
    if (world.plants[row][c]) continue;
    const cx = GRID.x0 + c * GRID.tileW + GRID.tileW / 2;
    if (front !== Infinity && cx > front - 20) continue;
    if (best === null || cx > best.cx) best = { col: c, cx };
  }
  if (!best && front === Infinity) {
    for (const c of cols) {
      if (!world.plants[row][c]) {
        best = { col: c, cx: 0 };
        break;
      }
    }
  }
  if (!best) return false;
  const result = plantAt(world, row, best.col, 'thornshot');
  return result !== null && result !== 'poor';
}

/** One autopilot decision per tick: plant where it helps most, else wait. */
function autopilot(world, purse) {
  if (world.screen !== SCREEN_PLAY) return;
  const sunblooms = countPlants(world, 'sunbloom');
  const shooters = countPlants(world, 'thornshot');
  if (purse === 'rich') {
    // Win scene: keep the back row full of sun, then shooters everywhere.
    if (world.sun >= PLANTS.sunbloom.cost && sunblooms < 6) {
      const tile = firstFreeTile(world, [0, 1]);
      if (tile) plantAt(world, tile.row, tile.col, 'sunbloom');
      return;
    }
    if (world.sun >= PLANTS.thornshot.cost) {
      let bestRow = 0;
      let bestN = -1;
      for (let r = 0; r < GRID.rows; r += 1) {
        const n = enemiesInRow(world, r);
        if (n > bestN) {
          bestN = n;
          bestRow = r;
        }
      }
      if (plantShooter(world, bestRow)) return;
    }
    if (world.sun >= PLANTS.frostbell.cost) {
      for (let r = 0; r < GRID.rows; r += 1) {
        if (enemiesInRow(world, r) >= 3) {
          for (const c of [5, 6, 4]) {
            if (!world.plants[r][c]) {
              plantAt(world, r, c, 'frostbell');
              return;
            }
          }
        }
      }
    }
  } else {
    // Play scene: modest economy, a few shooters, never call early unready.
    if (world.sun >= PLANTS.sunbloom.cost && sunblooms < 4) {
      const tile = firstFreeTile(world, [0, 1]);
      if (tile) {
        plantAt(world, tile.row, tile.col, 'sunbloom');
        return;
      }
    }
    if (world.sun >= PLANTS.thornshot.cost && shooters < 6) {
      let bestRow = 0;
      let bestN = -1;
      for (let r = 0; r < GRID.rows; r += 1) {
        const n = enemiesInRow(world, r);
        if (n > bestN) {
          bestN = n;
          bestRow = r;
        }
      }
      if (plantShooter(world, bestRow)) return;
    }
    // A crowded row earns a chill.
    if (world.sun >= PLANTS.frostbell.cost) {
      for (let r = 0; r < GRID.rows; r += 1) {
        if (enemiesInRow(world, r) >= 3) {
          for (const c of [5, 6, 4]) {
            if (!world.plants[r][c]) {
              plantAt(world, r, c, 'frostbell');
              return;
            }
          }
        }
      }
    }
  }
  if (world.phase === 'build' && world.buildTimer <= 2 && (purse === 'rich' || countPlants(world, 'thornshot') >= 2)) {
    callWaveEarly(world);
  }
}

/**
 * Set `world` to the named scene (title, play, win or lose; any other name is
 * title) and return the screen to draw over it and the score to show.
 */
export function stageShot(name, world) {
  resetWorld(world, world.seed);
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    world.screen = SCREEN_TITLE;
    // Let the sky breathe a little so the title frame is alive.
    for (let i = 0; i < 5 / STEP; i += 1) world.time += STEP;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  startRun(world);
  if (name === 'win') world.sun = 600;
  if (name === 'play') {
    // Stop mid-combat: wave 2 underway with blight on the field, so the frame
    // shows the fight, not the calm between waves.
    for (let i = 0; i < 240 / STEP; i += 1) {
      if (world.screen !== SCREEN_PLAY) break;
      autopilot(world, 'modest');
      stepWorld(world, STEP);
      if (world.wave >= 2 && world.phase === 'wave' && world.enemies.length >= 3) break;
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  const seconds = LIMIT_SECONDS;
  const purse = name === 'win' ? 'rich' : 'modest';
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.screen !== SCREEN_PLAY) break;
    if (name !== 'lose') autopilot(world, purse);
    else if (world.phase === 'build') callWaveEarly(world);
    stepWorld(world, STEP);
  }
  const screen = world.screen === SCREEN_WON ? SCREEN_WON : world.screen === SCREEN_LOST ? SCREEN_LOST : SCREEN_PLAY;
  return { screen, best: world.score };
}
