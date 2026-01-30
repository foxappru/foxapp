import { Target } from "./classes/Target.js";
import { resizeCanvas, setFont } from "./procedures/helpers.js";
import { drawGun, drawTopInfo, drawGameOver } from "./procedures/draw.js";
import {
  initAudio,
  setAudioEnabled,
  playEffect,
  audioEnabled,
  loadAllSounds,
} from "./procedures/sounds.js";
import { renderDictionaries } from "./procedures/dictionaries.js";
import { addGuy, guys, initGuys, updateGuys } from "./procedures/guys.js";
import { projectiles, updateProjectiles } from "./procedures/projectiles.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let canvasLogicalWidth, canvasLogicalHeight;

const input = document.getElementById("input");
const searchBtn = document.getElementById("search");
const resetBtn = document.getElementById("reset");
const dictList = document.getElementById("dictionaries");
const startScreen = document.querySelector(".startScreen");
const audioCheckbox = document.getElementById("audioCheckbox");
const hasCursor = window.matchMedia("(pointer: fine)").matches;
let nextGuyAt = performance.now() + (10 + Math.random() * 30) * 1000;
const colors = ["#eb8ddd", "#be8deb", "#8d8eeb", "#8acbe3", "#8ae3c7", "#e3d08a", "#5bc88f", "#e3968a"];
export const rocks = [];
const GROUND_Y_OFFSET = 80;

const state = {
  activeWords: [],
  isStarted: false,
  loopRunning: false,
  isPaused: false,
};

const guyImgs = [0, 1, 2].map((i) =>
  Object.assign(new Image(), { src: `assets/img/guy/bibi${i}.png` }),
);

let isAiming = false;
let pointerX = canvasLogicalWidth / 2;
let pointerY = canvasLogicalHeight - 40;

canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchend", (e) => e.preventDefault(), { passive: false });

// pointer/mouse move
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = e.clientX - rect.left;
  pointerY = e.clientY - rect.top;
});

// pointer up → shoot
canvas.addEventListener("pointerup", (e) => {
  // if (!hasCursor && !isAiming) return;
  isAiming = false;
  const rect = canvas.getBoundingClientRect();
  shootAt(e.clientX - rect.left, e.clientY - rect.top);
});

initAudio();
audioCheckbox.checked = audioEnabled;
audioCheckbox.addEventListener("change", () =>
  setAudioEnabled(audioCheckbox.checked),
);
loadAllSounds();

let currentUsername = localStorage.getItem("foxappUsername") || "foxappru";
if (currentUsername !== "foxappru") input.value = currentUsername;

// ================== CANVAS ==================
function onResize() {
  const result = resizeCanvas(canvas);
  canvasLogicalWidth = result.canvasLogicalWidth;
  canvasLogicalHeight = result.canvasLogicalHeight;
}
window.addEventListener("resize", onResize);
onResize();

const pauseBtn = {
  x: canvasLogicalWidth - 50,
  y: 10,
  w: 40,
  h: 40,
};

function drawPauseButton(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  const gap = 8;
  const barW = 3;
  const barH = pauseBtn.h - gap * 2;

  ctx.fillRect(pauseBtn.x + gap, pauseBtn.y + gap, barW, barH);
  ctx.fillRect(pauseBtn.x + gap + barW + gap, pauseBtn.y + gap, barW, barH);
  ctx.restore();
}

initGuys(canvasLogicalWidth, canvasLogicalHeight);

// ================== GAME STATE ==================
let current = null;
let lastBottomWord = null;
let targets = [];
export let repeatedCount = { value: 0 };
let isGameOver = false;
let gunWordIndexRef = { value: 0 };
let gunQueue = [];
let waveNumber = 0;
let nextSpawnY = 0;

// ================== DICTIONARIES ==================
renderDictionaries(currentUsername, dictList, startScreen, null, null, state);

// ================== START GAME ==================
export function startGame(words) {
  // state.activeWords.length = 0;
  state.activeWords = [...words];

  startScreen.style.opacity = 0;
  startScreen.style.pointerEvents = "none";
  state.isStarted = true;
  state.isPaused = false;
  waveNumber = 0;
  gunWordIndexRef = { value: 0 };
  targets.length = 0;
  projectiles.length = 0;
  gunQueue.length = 0;
  isGameOver = false;
  repeatedCount = { value: 0 };
  initGuys(canvasLogicalWidth, canvasLogicalHeight);

  spawnWave();
  if (!state.loopRunning) {
    state.loopRunning = true;
    loop();
  }
}

// ================== SEARCH / RESET ==================
searchBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (!username) return;
  currentUsername = username;
  localStorage.setItem("foxappUsername", username);
  renderDictionaries(username, dictList);
});

resetBtn.addEventListener("click", (e) => {
  e.preventDefault();
  input.value = "";
  currentUsername = "foxappru";
  localStorage.removeItem("foxappUsername");
  renderDictionaries(currentUsername, dictList);
});

// ================== SPAWN ==================
function spawnWave() {
  if (!state.activeWords.length) return;
  nextSpawnY = -40;
  targets.length = 0;
  const speedFactor = 1 + waveNumber * 0.04;

  for (let i = 0; i < 5; i++) {
    const t = spawnWord(
      state.activeWords[Math.floor(Math.random() * state.activeWords.length)],
    );
    t.vy *= speedFactor;
  }

  gunQueue = [...targets].sort(() => Math.random() - 0.5);
  pickGunWord();
  waveNumber++;
}

function spawnWord(pair) {
  const langs = Object.keys(pair);
  const lang = langs[Math.floor(Math.random() * langs.length)];
  const temp = new Target(pair, lang, 0);
  setFont(ctx);
  temp.w = ctx.measureText(temp.text).width + 24;
  const x = Math.random() * (canvasLogicalWidth - temp.w) + temp.w / 2;
  if (!targets.length || targets[targets.length - 1].y > 0) nextSpawnY = -40;
  const t = new Target(pair, lang, x, playEffect);
  t.w = temp.w;
  t.y = nextSpawnY;
  nextSpawnY -= t.h + 10;
  targets.push(t);
  const insertIndex = Math.floor(Math.random() * (gunQueue.length + 1));
  gunQueue.splice(insertIndex, 0, t);
  return t;
}

// ================== INPUT ==================
canvas.addEventListener("pointerdown", async (e) => {
  // if (!hasCursor) isAiming = true;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // pause button
  if (
    px >= pauseBtn.x &&
    px <= pauseBtn.x + pauseBtn.w &&
    py >= pauseBtn.y &&
    py <= pauseBtn.y + pauseBtn.h
  ) {
    state.isPaused = true;
    startScreen.style.opacity = 1;
    startScreen.style.pointerEvents = "auto";

    // remove old resume button if exists
    const old = document.getElementById("resumeBtn");
    if (old) old.remove();

    // create resume button
    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Resume";
    resumeBtn.id = "resumeBtn";
    resumeBtn.style.marginTop = "10px";
    resumeBtn.addEventListener("click", () => {
      if (state.activeWords.length) {
        // spawnWave();
        state.isPaused = false;
        startScreen.style.opacity = 0;
        startScreen.style.pointerEvents = "none";
      }
      resumeBtn.remove();
    });
    startScreen.appendChild(resumeBtn);

    return; // pause clicked
  }

  // normal shooting
  if (isGameOver) return startGame(state.activeWords);
  // shootAt(px, py);
});

// ================== SHOOT ==================

function shootAt(targetX, targetY) {
  if (!current) return;
  const startX = canvasLogicalWidth / 2;
  const startY = canvasLogicalHeight - 40;

  const projectileWord = current.text;
  const projectilePair = lastBottomWord.pair;

  gunWordIndexRef.value += targetX > canvasLogicalWidth / 2 ? 1 : -1;
  pickGunWord();

  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = 10;

  projectiles.push({
    x: startX,
    y: startY,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    color: colors[Math.floor(Math.random() * colors.length)],
    word: projectileWord,
    pair: projectilePair,
  });

  playEffect("shot");
}

// ================== LOOP ==================
function loop() {
  if (!state.isStarted) return;
  if (state.isPaused) {
    requestAnimationFrame(loop);
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTopInfo(ctx, repeatedCount, waveNumber);

  if (isGameOver) {
    drawGameOver(ctx, canvas, canvasLogicalWidth, canvasLogicalHeight, repeatedCount, waveNumber);
    requestAnimationFrame(loop);
    return;
  }


  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.update(canvasLogicalHeight);

    for (const g of guys) {
      if (g.falling || t.vy <= 0) continue;

      const prevBottom = t.y + t.h / 2 - t.vy;
      const currBottom = t.y + t.h / 2;
      const horizontalHit = t.x + t.w / 2 > g.x && t.x - t.w / 2 < g.x + 32;

      if (!t.isSpecial && prevBottom < g.y + 2 && currBottom >= g.y && horizontalHit) {
        playEffect("error");
        g.falling = true;
        g.vy = 2;
        g.rot = 0;
      }
    }

    t.draw(ctx);
    if (t.dead) {

      const qi = gunQueue.indexOf(t);

      if (qi !== -1) {
        if (qi <= gunWordIndexRef.value) gunWordIndexRef.value--;
        gunQueue.splice(qi, 1);
      }

      targets.splice(i, 1);

      pickGunWord();

      if (!targets.length) spawnWave();
    }

  }

  ctx.fillStyle = "#14182bff";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

  for (const r of rocks) {
    if (!r.resting) {
      r.vy += 0.15;               // gravity
      r.y += r.vy;                 // move down

      const groundY = canvasLogicalHeight - GROUND_Y_OFFSET;
      if (r.y + r.radius >= groundY) {
        r.y = groundY - r.radius;
        r.vy = 0;
        r.resting = true;
      }

      // check collision with targets
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const hit =
          r.x + r.radius >= t.x - t.w / 2 &&
          r.x - r.radius <= t.x + t.w / 2 &&
          r.y + r.radius >= t.y - t.h / 2 &&
          r.y - r.radius <= t.y + t.h / 2;

        if (hit) {
          targets.splice(i, 1);
          rocks.splice(rocks.indexOf(r), 1);
          playEffect("hit");
          break;
        }
      }
    }
  }


  // draw rocks
  ctx.fillStyle = "#b7dbff";
  for (const r of rocks) {
    if (!r.vertices) {
      // generate fixed irregular shape once
      r.vertices = [
        { x: -r.radius * 0.8, y: -r.radius * 0.6 },
        { x: r.radius * 0.7, y: -r.radius * 0.8 },
        { x: r.radius * 0.9, y: r.radius * 0.3 },
        { x: r.radius * 0.5, y: r.radius * 0.9 },
        { x: -r.radius * 0.6, y: r.radius * 0.7 },
        { x: -r.radius * 0.9, y: -r.radius * 0.2 },
      ];
    }

    ctx.beginPath();
    r.vertices.forEach((v, i) => {
      const px = r.x + v.x;
      const py = r.y + v.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }

  updateGuys(ctx, canvasLogicalWidth, canvasLogicalHeight, guyImgs);

  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];

    for (const g of guys) {
      // only pick if not holding
      if (g.heldRock) continue;

      if (
        r.x + r.radius > g.x &&
        r.x - r.radius < g.x + 32 &&   // horizontal overlap
        r.y + r.radius >= g.y &&        // rock bottom at or below guy feet
        r.y - r.radius <= g.y + 32          // feet
      ) {
        g.heldRock = { ...r };
        rocks.splice(i, 1);
        break;
      }
    }
  }

  for (const g of guys) {
    if (g.heldRock) {
      const r = g.heldRock;

      ctx.fillStyle = "#b7dbff";
      if (!r.vertices) {
        // generate fixed shape once
        r.vertices = [
          { x: -r.radius * 0.8, y: -r.radius * 0.6 },
          { x: r.radius * 0.7, y: -r.radius * 0.8 },
          { x: r.radius * 0.9, y: r.radius * 0.3 },
          { x: r.radius * 0.5, y: r.radius * 0.9 },
          { x: -r.radius * 0.6, y: r.radius * 0.7 },
          { x: -r.radius * 0.9, y: -r.radius * 0.2 },
        ];
      }

      ctx.beginPath();
      r.vertices.forEach((v, i) => {
        const px = g.x + 16 + v.x;
        const py = g.y - 7 + v.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
  }

  if (guys.length === 0) {
    isGameOver = true;
  }

  updateProjectiles(
    targets,
    gunQueue,
    gunWordIndexRef,
    canvasLogicalWidth,
    canvasLogicalHeight,
    spawnWave,
    spawnWord,
    state.activeWords,
  );

  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hasCursor || isAiming) {
    ctx.save();
    ctx.strokeStyle = "#ffffff33";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 50]);

    const startX = canvasLogicalWidth / 2;
    const startY = canvasLogicalHeight - 40;

    // top intersection point
    const t = (0 - startY) / (pointerY - startY);
    const topX = startX + (pointerX - startX) * t;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(pointerX, pointerY); // middle point
    ctx.lineTo(topX, 0);           // top of canvas
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  const now = performance.now();
  if (now >= nextGuyAt) {
    if (guys.length < 5) {
      addGuy(canvasLogicalWidth, canvasLogicalHeight);
    }
    nextGuyAt = now + (5 + Math.random() * 3) * 1000;
  }

  drawGun(ctx, current, canvasLogicalWidth, canvasLogicalHeight);
  drawPauseButton(ctx);
  requestAnimationFrame(loop);
}

// ================== PICK GUN WORD ==================
export function pickGunWord(index = gunWordIndexRef.value) {
  if (!gunQueue.length) {
    current = { text: "bang!" };
    return;
  }

  index = (index + gunQueue.length) % gunQueue.length;

  gunWordIndexRef.value = index;

  const t = gunQueue[gunWordIndexRef.value];

  if (!t) return;

  const langs = Object.keys(t.pair);
  const oppositeLang = langs.find((l) => l !== t.lang);
  current = { pair: t.pair, lang: oppositeLang, text: t.pair[oppositeLang] };
  lastBottomWord = current;
}
