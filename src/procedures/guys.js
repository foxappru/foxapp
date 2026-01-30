import { rocks } from "../main.js";

export let guys = [];

export function initGuys(canvasLogicalWidth, canvasLogicalHeight, count = 5) {
  guys = Array.from({ length: count }, () => ({
    x: Math.random() * canvasLogicalWidth,
    y: canvasLogicalHeight - 112, // floor
    dir: Math.random() < 0.5 ? -1 : 1,
    frame: Math.floor(Math.random() * 3),
    t: 0,
    hue: Math.floor(Math.random() * 360),
    falling: false,
    vy: 0,
    rot: 0,
    speed: 0.3 + Math.random() * 0.4,
    heldRock: null,
  }));
}

export function addGuy(canvasLogicalWidth, canvasLogicalHeight) {
  guys.push({
    x: Math.random() * canvasLogicalWidth,
    y: canvasLogicalHeight - 112,
    dir: Math.random() < 0.5 ? -1 : 1,
    frame: Math.floor(Math.random() * 3),
    t: 0,
    hue: Math.floor(Math.random() * 360),
    falling: false,
    vy: 0,
    rot: 0,
    speed: 0.3 + Math.random() * 0.4,
    heldRock: null,
  });
}

export function updateGuys(
  ctx,
  canvasLogicalWidth,
  canvasLogicalHeight,
  guyImgs,
) {
  for (let i = guys.length - 1; i >= 0; i--) {
    const g = guys[i];

    if (g.falling) {
      g.vy += 0.4;
      g.y += g.vy;
      g.rot += 0.1;
      if (g.y > canvasLogicalHeight + 40) {
        guys.splice(i, 1);
        continue;
      }
    } else {
      if (Math.random() < 0.001) g.dir *= -1;
      g.x += g.dir * g.speed;
      g.x = Math.min(Math.max(g.x, 0), canvasLogicalWidth - 32);
      if (g.x <= 0) g.dir = 1;
      if (g.x >= canvasLogicalWidth - 32) g.dir = -1;
      // g.t++;
      // if (g.t % 10 === 0) g.frame = 1 - g.frame;
      if (i == 0) {
        // g.rot = 10;
        // console.log(g.throwCooldown);
      }
      // ================= THROW ROCK =================
      if (g.heldRock && !g.throwCooldown) {
        if (Math.random() < 0.005) { // tweak probability
          g.throwCooldown = Math.floor(100 + Math.random() * 50); // frames before next throw
          rocks.push({
            x: g.x + 16,
            y: g.y - 16,
            // vx: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.5), // left/right
            vy: -3 - Math.random() * 3, // upward
            radius: g.heldRock.radius,
            resting: false,
          });
          g.heldRock = null;
        }
      } else if (g.throwCooldown) {
        g.throwCooldown--; // countdown
      }
    }

    ctx.save();
    ctx.translate(g.x + 16, g.y + 16);
    ctx.rotate(g.rot || 0);
    // ctx.scale(g.dir < 0 ? 1 : -1, 1);
    // ctx.filter = `hue-rotate(${g.hue}deg)`;
    ctx.drawImage(guyImgs[g.frame], -16, -16, 38, 32);
    ctx.restore();
  }
}
