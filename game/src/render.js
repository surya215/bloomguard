// Bloomguard's drawing: dusk garden, soil rows, plants, walking blight, HUD,
// and the title / pause / win / lose screens. Everything is drawn with canvas
// shapes — no image assets — so the game stays a handful of small files.
import { CANVAS, GRID, GATE_X, HUD, CARDS, WAVES_TOTAL, BUILD_SECONDS, PLANTS, PLANT_ORDER, ENEMIES } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_WON, SCREEN_LOST, tileCenter } from './world.js';

const SKY_TOP = '#1d2b4f';
const SKY_BOTTOM = '#4a3a6b';
const MOON = { x: 1130, y: 70, r: 34 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.55, SKY_BOTTOM);
  g.addColorStop(1, '#2c2a44');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  // Moon with a soft halo.
  const halo = ctx.createRadialGradient(MOON.x, MOON.y, 4, MOON.x, MOON.y, 90);
  halo.addColorStop(0, 'rgba(255, 244, 200, 0.5)');
  halo.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(MOON.x - 90, MOON.y - 90, 180, 180);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(MOON.x, MOON.y, MOON.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210, 190, 130, 0.5)';
  ctx.beginPath();
  ctx.arc(MOON.x - 10, MOON.y - 6, 7, 0, Math.PI * 2);
  ctx.arc(MOON.x + 12, MOON.y + 10, 5, 0, Math.PI * 2);
  ctx.fill();
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 40; i += 1) {
    const sx = (i * 197.3) % CANVAS.width;
    const sy = (i * 89.7) % 220;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(world.time * 0.7 + i));
    ctx.globalAlpha = tw * 0.7;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Fireflies drift over the lawn.
  for (let i = 0; i < 14; i += 1) {
    const fx = (i * 173.1 + Math.sin(world.time * 0.4 + i * 2.1) * 26 + 1200) % CANVAS.width;
    const fy = 420 + ((i * 61.7) % 220) + Math.cos(world.time * 0.5 + i) * 14;
    ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(world.time + i * 1.3));
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLawn(ctx) {
  // Soil rows the blight walks down, with a grass strip above and below.
  ctx.fillStyle = '#3d5a34';
  ctx.fillRect(0, GRID.y0 - 14, CANVAS.width, GRID.y1 - GRID.y0 + 28);
  for (let r = 0; r < GRID.rows; r += 1) {
    const y = GRID.y0 + r * GRID.tileH;
    ctx.fillStyle = r % 2 === 0 ? '#5d4a2f' : '#54432b';
    ctx.fillRect(GRID.x0, y, GRID.cols * GRID.tileW, GRID.tileH);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(GRID.x0 + 0.5, y + 0.5, GRID.cols * GRID.tileW, GRID.tileH);
  }
  // Garden gate on the left: what the plants protect.
  ctx.fillStyle = '#7a5c33';
  ctx.fillRect(GATE_X - 34, GRID.y0 - 8, 30, GRID.y1 - GRID.y0 + 16);
  ctx.fillStyle = '#8ecdf5';
  for (let r = 0; r < GRID.rows; r += 1) {
    ctx.beginPath();
    ctx.arc(GATE_X - 19, GRID.y0 + r * GRID.tileH + GRID.tileH / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#cfe8ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(46, (GRID.y0 + GRID.y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('MOON GARDEN', 0, 0);
  ctx.restore();
}

function drawPlant(ctx, plant, world) {
  const { x, y } = plant;
  const def = PLANTS[plant.kind];
  const sway = Math.sin(world.time * 2 + plant.row * 1.7 + plant.col) * 2;
  ctx.save();
  ctx.translate(x + sway, y);
  // Stem.
  ctx.strokeStyle = '#4e9a51';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.quadraticCurveTo(4, 10, 0, -6);
  ctx.stroke();
  // Leaves.
  ctx.fillStyle = '#5cb85f';
  ctx.beginPath();
  ctx.ellipse(-12, 18, 12, 6, -0.5, 0, Math.PI * 2);
  ctx.ellipse(12, 22, 12, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  if (plant.kind === 'sunbloom') {
    // A sunflower face, glowing when a bloom is near.
    const glow = plant.timer < 1.2 ? 0.35 + 0.3 * Math.sin(world.time * 6) : 0.12;
    ctx.fillStyle = `rgba(255, 217, 77, ${glow})`;
    ctx.beginPath();
    ctx.arc(0, -14, 26, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 20, -14 + Math.sin(a) * 20, 8, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.arc(0, -14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath();
    ctx.arc(-4, -16, 1.8, 0, Math.PI * 2);
    ctx.arc(4, -16, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (plant.kind === 'thornshot') {
    // A spiky shooter head that leans toward the enemy side.
    ctx.fillStyle = '#2f7d32';
    ctx.beginPath();
    ctx.arc(2, -14, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ee081';
    for (let i = 0; i < 7; i += 1) {
      const a = -0.9 + (i / 6) * 1.8;
      ctx.beginPath();
      ctx.moveTo(2 + Math.cos(a) * 12, -14 + Math.sin(a) * 12);
      ctx.lineTo(2 + Math.cos(a) * 24, -14 + Math.sin(a) * 24);
      ctx.lineTo(2 + Math.cos(a + 0.25) * 12, -14 + Math.sin(a + 0.25) * 12);
      ctx.fill();
    }
    ctx.fillStyle = '#1b4d1e';
    ctx.beginPath();
    ctx.arc(14, -14, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Frostbell: a hanging bell flower, pale blue, shivering with cold.
    ctx.strokeStyle = '#bfe6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -16);
    ctx.stroke();
    ctx.fillStyle = '#8ecdf5';
    ctx.beginPath();
    ctx.moveTo(-13, -16);
    ctx.quadraticCurveTo(0, -34, 13, -16);
    ctx.quadraticCurveTo(0, -8, -13, -16);
    ctx.fill();
    ctx.fillStyle = '#eaf7ff';
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(191, 230, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, -12, 20 + Math.sin(world.time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Health bar when hurt.
  if (plant.hp < plant.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 20, y + 36, 40, 5);
    ctx.fillStyle = '#7ee081';
    ctx.fillRect(x - 20, y + 36, 40 * (plant.hp / plant.maxHp), 5);
  }
}

function drawEnemy(ctx, e, world) {
  const def = e.def;
  const bob = Math.sin(e.wobble) * 2;
  const slowed = world.time < e.slowUntil;
  ctx.save();
  ctx.translate(e.x, e.y + bob);
  // Legs scuttle.
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    const ph = Math.sin(e.wobble + i * 2) * 5;
    ctx.beginPath();
    ctx.moveTo(i * 8, 0);
    ctx.lineTo(i * 8 - 6 + ph, 10);
    ctx.moveTo(i * 8, 0);
    ctx.lineTo(i * 8 + 6 - ph, -10);
    ctx.stroke();
  }
  if (e.kind === 'beetle') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d4a63';
    ctx.beginPath();
    ctx.ellipse(0, -4, 18, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3550';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 14);
    ctx.stroke();
  } else if (e.kind === 'ant') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(-12, 0, 9, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(12, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5e1f14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.quadraticCurveTo(26, -10, 30, -6);
    ctx.moveTo(18, 2);
    ctx.quadraticCurveTo(26, 10, 30, 6);
    ctx.stroke();
  } else {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Eyes look toward the garden (left).
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-8, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-9, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  if (slowed) {
    ctx.fillStyle = 'rgba(142, 205, 245, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, def.radius + 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Health bar when hurt.
  if (e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - 18, e.y - e.def.radius - 14, 36, 5);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(e.x - 18, e.y - e.def.radius - 14, 36 * (e.hp / e.maxHp), 5);
  }
}

function drawProjectiles(ctx, world) {
  ctx.fillStyle = '#d6f5a0';
  for (const p of world.projectiles) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ee081';
    ctx.beginPath();
    ctx.moveTo(p.x + 9, p.y);
    ctx.lineTo(p.x + 16, p.y - 3);
    ctx.lineTo(p.x + 16, p.y + 3);
    ctx.fill();
    ctx.fillStyle = '#d6f5a0';
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + (1 - a) * 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'sun') {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawCards(ctx, world) {
  ctx.textAlign = 'left';
  for (let i = 0; i < PLANT_ORDER.length; i += 1) {
    const key = PLANT_ORDER[i];
    const def = PLANTS[key];
    const x = CARDS.x0 + i * (CARDS.width + CARDS.gap);
    const y = CARDS.y;
    const afford = world.sun >= def.cost;
    const selected = world.selected === key;
    ctx.fillStyle = selected ? 'rgba(255, 217, 77, 0.22)' : 'rgba(10, 16, 32, 0.55)';
    roundRect(ctx, x, y, CARDS.width, CARDS.height, 10);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = selected ? 3 : 1.5;
    roundRect(ctx, x, y, CARDS.width, CARDS.height, 10);
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x + 26, y + 22, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(def.name, x + 44, y + 20);
    ctx.fillStyle = afford ? '#ffd94d' : '#ff8a8a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`☀ ${def.cost}`, x + 44, y + 42);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '12px sans-serif';
    ctx.fillText(def.blurb, x + 12, y + 60);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`[${i + 1}]`, x + CARDS.width - 28, y + 20);
  }
  // Hint line on the right of the cards.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Click a card, then a tile to plant · 1/2/3 select · Space pause · R restart · M mute', CANVAS.width - 24, CARDS.y + 40);
  ctx.textAlign = 'left';
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(8, 12, 26, 0.72)';
  ctx.fillRect(0, 0, CANVAS.width, HUD.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('🌻 BLOOMGUARD', 24, 34);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('Defend the Moon Garden', 24, 56);
  // Sun.
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(340, 30, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(340, 30, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(String(world.sun), 362, 38);
  // Hearts.
  let hx = 470;
  ctx.font = '22px sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < world.hearts ? '#ff6b81' : 'rgba(255,255,255,0.18)';
    ctx.fillText('♥', hx, 38);
    hx += 30;
  }
  // Wave + score.
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Wave ${Math.max(1, world.wave)} / ${WAVES_TOTAL}`, 650, 34);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  const phaseText =
    world.phase === 'build'
      ? `Next wave in ${Math.max(0, Math.ceil(world.buildTimer))}s — click CALL WAVE for +${50} sun`
      : world.phase === 'wave'
        ? `${world.enemies.length + world.spawnQueue.length} blight left`
        : '';
  ctx.fillText(phaseText, 650, 56);
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score ${world.score}`, CANVAS.width - 170, 34);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(`${world.kills} blight popped`, CANVAS.width - 170, 56);
  ctx.textAlign = 'left';
  // Pause + mute buttons (top-right).
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, CANVAS.width - 150, 14, 56, 30, 8);
  ctx.fill();
  roundRect(ctx, CANVAS.width - 86, 14, 62, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.screen === SCREEN_PAUSE ? '▶' : '❚❚', CANVAS.width - 122, 35);
  ctx.fillText('🔊', CANVAS.width - 55, 35);
  ctx.textAlign = 'left';
  // Call-wave button during build phase.
  if (world.phase === 'build' && world.screen === SCREEN_PLAY) {
    const bw = 150;
    const bx = CANVAS.width / 2 - bw / 2;
    const by = GRID.y0 - 34;
    ctx.fillStyle = '#ffd94d';
    roundRect(ctx, bx, by, bw, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#3a2a12';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔ CALL WAVE', CANVAS.width / 2, by + 18);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 10, 24, 0.66)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, CANVAS.width / 2, 250);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, CANVAS.width / 2, 300 + i * 32));
  ctx.textAlign = 'left';
}

export function drawWorld(ctx, world) {
  drawSky(ctx, world);
  drawLawn(ctx);
  // Ghost preview of the selected plant on the hovered tile.
  if (world.hover && world.screen === SCREEN_PLAY) {
    const { row, col } = world.hover;
    if (world.plants[row][col] === null) {
      const { x, y } = tileCenter(row, col);
      const def = PLANTS[world.selected];
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = world.sun >= def.cost ? 'rgba(255,255,255,0.7)' : 'rgba(255,107,107,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(GRID.x0 + col * GRID.tileW + 2, GRID.y0 + row * GRID.tileH + 2, GRID.tileW - 4, GRID.tileH - 4);
    }
  }
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      const plant = world.plants[r][c];
      if (plant) drawPlant(ctx, plant, world);
    }
  }
  for (const e of world.enemies) drawEnemy(ctx, e, world);
  drawProjectiles(ctx, world);
  drawParticles(ctx, world);
  drawHud(ctx, world);
  drawCards(ctx, world);

  if (world.screen === SCREEN_TITLE) {
    overlay(ctx, '🌻 BLOOMGUARD', [
      'The blight marches on the Moon Garden. Plant defenders,',
      'grow sun, and hold the gate for 10 waves.',
      '',
      'Click a card, then a tile to plant. Thornshot shoots,',
      'Sunbloom grows sun, Frostbell chills a whole row.',
      '',
      'Click anywhere or press Enter to start',
    ], '#ffd94d');
  } else if (world.screen === SCREEN_PAUSE) {
    overlay(ctx, 'PAUSED', ['Take a breath. The blight waits.', '', 'Space to resume · R to restart'], '#fff');
  } else if (world.screen === SCREEN_WON) {
    overlay(ctx, '🌙 THE GARDEN HOLDS!', [
      `All 10 waves turned back — score ${world.score}`,
      `${world.kills} blight popped · ${world.plantedCount} plants grown · ${world.hearts} hearts left`,
      '',
      'Press R or click to play again',
    ], '#9be89b');
  } else if (world.screen === SCREEN_LOST) {
    overlay(ctx, '🥀 THE GARDEN FALLS', [
      `The blight broke through on wave ${Math.max(1, world.wave)} — score ${world.score}`,
      `${world.kills} blight popped · ${world.plantedCount} plants grown`,
      '',
      'Press R or click to try again',
    ], '#ff8a8a');
  }
}

// Hit areas the input layer reads (same numbers the drawing uses).
export const BUTTONS = {
  pause: { x: CANVAS.width - 150, y: 14, w: 56, h: 30 },
  mute: { x: CANVAS.width - 86, y: 14, w: 62, h: 30 },
  callWave: { x: CANVAS.width / 2 - 75, y: GRID.y0 - 34, w: 150, h: 26 },
};
export function cardAt(px, py) {
  if (py < CARDS.y || py > CARDS.y + CARDS.height) return null;
  for (let i = 0; i < PLANT_ORDER.length; i += 1) {
    const x = CARDS.x0 + i * (CARDS.width + CARDS.gap);
    if (px >= x && px <= x + CARDS.width) return PLANT_ORDER[i];
  }
  return null;
}
export function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
export { ENEMIES };
