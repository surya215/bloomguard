// Bloomguard's world: the garden, its plants, the walking blight, and the rules
// that decide a win or a loss. Pure state + step(): rendering lives in
// render.js, input in input.js, sound in audio.js. The step returns the events
// that happened this tick so main.js can play sounds for them.
import { CANVAS, GRID, GATE_X, START, WAVES_TOTAL, BUILD_SECONDS, EARLY_CALL_BONUS_SUN, PLANTS, ENEMIES, waveSpec, SCORE } from './config.js';
import { makeRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PAUSE = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

export function tileCenter(row, col) {
  return {
    x: GRID.x0 + col * GRID.tileW + GRID.tileW / 2,
    y: GRID.y0 + row * GRID.tileH + GRID.tileH / 2,
  };
}
export function tileAt(px, py) {
  const col = Math.floor((px - GRID.x0) / GRID.tileW);
  const row = Math.floor((py - GRID.y0) / GRID.tileH);
  if (row < 0 || row >= GRID.rows || col < 0 || col >= GRID.cols) return null;
  return { row, col };
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    sun: START.sun,
    hearts: START.hearts,
    score: 0,
    wave: 0,
    phase: 'build', // 'build' (calm) or 'wave' (enemies walking in)
    buildTimer: BUILD_SECONDS,
    spec: null,
    spawnQueue: [],
    spawnTimer: 0,
    plants: [], // plants[row][col] or null
    enemies: [],
    projectiles: [],
    particles: [],
    floaters: [],
    selected: 'thornshot',
    kills: 0,
    plantedCount: 0,
    shotsFired: 0,
    best: 0,
  };
  for (let r = 0; r < GRID.rows; r += 1) world.plants.push(new Array(GRID.cols).fill(null));
  return world;
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

function addParticle(world, p) {
  world.particles.push({ life: 0.6, maxLife: 0.6, size: 4, vx: 0, vy: -30, kind: 'dot', ...p });
}
function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color ?? '#fff', life: 1.1, maxLife: 1.1 });
}
function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    addParticle(world, { x, y, color, size: world.rng.range(2, 5), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: world.rng.range(0.3, 0.7), maxLife: 0.7 });
  }
}

export function canPlant(world, row, col) {
  return world.screen === SCREEN_PLAY && world.phase !== undefined && world.plants[row][col] === null;
}

export function plantAt(world, row, col, kind) {
  const def = PLANTS[kind];
  if (!def || !canPlant(world, row, col)) return null;
  if (world.sun < def.cost) return 'poor';
  const { x, y } = tileCenter(row, col);
  world.sun -= def.cost;
  const plant = { kind, hp: def.hp, maxHp: def.hp, timer: def.interval * 0.6, x, y, row, col, born: world.time };
  world.plants[row][col] = plant;
  world.plantedCount += 1;
  burst(world, x, y, def.color, 10, 70);
  return plant;
}

export function callWaveEarly(world) {
  if (world.screen !== SCREEN_PLAY || world.phase !== 'build') return false;
  world.sun += EARLY_CALL_BONUS_SUN;
  addFloater(world, CANVAS.width / 2, GRID.y0 - 18, `+${EARLY_CALL_BONUS_SUN} sun — early call!`, '#ffd94d');
  startWave(world);
  return true;
}

function startWave(world) {
  world.wave += 1;
  world.spec = waveSpec(world.wave);
  world.spawnQueue = [...world.spec.mix];
  // Shuffle the walk-in order with the seeded rng so a seed replays the same.
  for (let i = world.spawnQueue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng.next() * (i + 1));
    [world.spawnQueue[i], world.spawnQueue[j]] = [world.spawnQueue[j], world.spawnQueue[i]];
  }
  world.spawnTimer = 0.5;
  world.phase = 'wave';
}

function spawnEnemy(world, kind) {
  const def = ENEMIES[kind];
  const row = world.rng.int(0, GRID.rows - 1);
  const hp = Math.round(def.hp * world.spec.hpScale);
  world.enemies.push({
    kind,
    hp,
    maxHp: hp,
    x: GRID.x1 + 30 + world.rng.range(0, 40),
    y: GRID.y0 + row * GRID.tileH + GRID.tileH / 2,
    row,
    speed: def.speed * world.spec.speedScale,
    slowUntil: 0,
    biteTimer: 0,
    wobble: world.rng.range(0, Math.PI * 2),
    def,
  });
}

function damageEnemy(world, enemy, dmg, events) {
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    world.kills += 1;
    world.score += enemy.def.score;
    world.sun += enemy.def.sunDrop;
    burst(world, enemy.x, enemy.y, enemy.def.color, 14, 110);
    addFloater(world, enemy.x, enemy.y - 18, `+${enemy.def.score}`, '#fff');
    if (enemy.def.sunDrop > 0) addFloater(world, enemy.x, enemy.y + 6, `+${enemy.def.sunDrop} sun`, '#ffd94d');
    events.push('pop');
  }
}

/** Advance the world by dt seconds. Returns the sound events of this tick. */
export function stepWorld(world, dt) {
  const events = [];
  if (world.screen !== SCREEN_PLAY) return events;
  world.time += dt;

  // Wave flow.
  if (world.phase === 'build') {
    world.buildTimer -= dt;
    if (world.buildTimer <= 0) {
      startWave(world);
      events.push('horn');
    }
  } else if (world.phase === 'wave') {
    if (world.spawnQueue.length > 0) {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        spawnEnemy(world, world.spawnQueue.shift());
        world.spawnTimer = world.spec.interval * world.rng.range(0.85, 1.15);
      }
    } else if (world.enemies.length === 0) {
      // Wave cleared.
      const bonus = SCORE.waveClear(world.wave);
      world.score += bonus;
      addFloater(world, CANVAS.width / 2, GRID.y0 - 18, `Wave ${world.wave} clear! +${bonus}`, '#9be89b');
      events.push('waveclear');
      if (world.wave >= WAVES_TOTAL) {
        world.score += world.hearts * SCORE.winHeartBonus;
        world.screen = SCREEN_WON;
        world.phase = 'won';
        events.push('win');
        return events;
      }
      world.phase = 'build';
      world.buildTimer = BUILD_SECONDS;
    }
  }

  // Plants act.
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      const plant = world.plants[r][c];
      if (!plant) continue;
      const def = PLANTS[plant.kind];
      plant.timer -= dt;
      if (plant.timer > 0) continue;
      if (plant.kind === 'sunbloom') {
        plant.timer = def.interval;
        world.sun += def.sunPerBloom;
        addParticle(world, { x: plant.x, y: plant.y - 20, color: '#ffe98a', size: 6, vy: -50, life: 0.9, maxLife: 0.9, kind: 'sun' });
        addFloater(world, plant.x, plant.y - 34, `+${def.sunPerBloom}`, '#ffd94d');
        events.push('sun');
      } else if (plant.kind === 'thornshot') {
        plant.timer = def.interval;
        let target = null;
        for (const e of world.enemies) {
          if (e.row === r && e.x > plant.x && e.x < GRID.x1 + 40 && (!target || e.x < target.x)) target = e;
        }
        if (target) {
          world.projectiles.push({ x: plant.x + 26, y: plant.y - 6, row: r, speed: def.projectileSpeed, damage: def.damage });
          world.shotsFired += 1;
          events.push('shoot');
        } else {
          plant.timer = 0.25; // no target: check again soon
        }
      } else if (plant.kind === 'frostbell') {
        plant.timer = def.interval;
        let rang = false;
        for (const e of world.enemies) {
          if (e.row === r) {
            e.slowUntil = world.time + def.slowSeconds;
            rang = true;
          }
        }
        if (rang) {
          addParticle(world, { x: plant.x, y: plant.y, color: '#bfe6ff', size: 60, vy: 0, vx: 0, life: 0.5, maxLife: 0.5, kind: 'ring' });
          events.push('frost');
        } else {
          plant.timer = 0.5;
        }
      }
    }
  }

  // Projectiles fly and hit the first enemy they meet in their row.
  for (const p of world.projectiles) {
    p.x += p.speed * dt;
    for (const e of world.enemies) {
      if (e.row === p.row && e.hp > 0 && Math.abs(e.x - p.x) < e.def.radius + 6 && Math.abs(e.y - p.y) < 26) {
        damageEnemy(world, e, p.damage, events);
        events.push('hit');
        p.dead = true;
        burst(world, p.x, p.y, '#cfe8a0', 4, 60);
        break;
      }
    }
    if (p.x > GRID.x1 + 50) p.dead = true;
  }
  world.projectiles = world.projectiles.filter((p) => !p.dead);
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // Enemies walk left; when one reaches a plant it stops and chews it.
  for (const e of world.enemies) {
    const slowed = world.time < e.slowUntil;
    const col = Math.floor((e.x - GRID.x0) / GRID.tileW);
    const plant = col >= 0 && col < GRID.cols ? world.plants[e.row][col] : null;
    const blocked = plant && e.x - e.def.radius < GRID.x0 + (col + 1) * GRID.tileW + 6;
    if (blocked) {
      e.biteTimer -= dt;
      if (e.biteTimer <= 0) {
        e.biteTimer = 0.5;
        plant.hp -= e.def.bite * 0.5;
        burst(world, e.x - e.def.radius, e.y, '#ffb3a0', 3, 40);
        if (plant.hp <= 0) {
          world.plants[e.row][col] = null;
          burst(world, plant.x, plant.y, '#9be89b', 12, 90);
        }
      }
    } else {
      e.x -= e.speed * (slowed ? 0.5 : 1) * dt;
      e.wobble += dt * 6;
    }
    if (e.x < GATE_X) {
      e.dead = true;
      world.hearts -= 1;
      burst(world, GATE_X, e.y, '#ff6b6b', 16, 130);
      addFloater(world, GATE_X + 60, e.y, 'The garden is breached!', '#ff8a8a');
      events.push('breach');
      if (world.hearts <= 0) {
        world.screen = SCREEN_LOST;
        world.phase = 'lost';
        events.push('lose');
        return events;
      }
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);

  // Particles and floating texts age out.
  for (const p of world.particles) {
    p.life -= dt;
    p.x += (p.vx ?? 0) * dt;
    p.y += (p.vy ?? 0) * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) {
    f.life -= dt;
    f.y -= 24 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  return events;
}

/** Begin a fresh run from the title screen. */
export function startRun(world) {
  const seed = world.seed;
  resetWorld(world, seed);
  world.screen = SCREEN_PLAY;
  world.phase = 'build';
  world.buildTimer = BUILD_SECONDS;
}
