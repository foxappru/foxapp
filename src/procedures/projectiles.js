// procedures/projectiles.js

import { playEffect } from "./sounds.js";
import { pickGunWord, repeatedCount, rocks } from "../main.js";

export let projectiles = [];

export function updateProjectiles(
  targets,
  gunQueue,
  gunWordIndexRef,
  canvasLogicalWidth,
  canvasLogicalHeight,
  spawnWave,
  spawnWord,
  activeWords,
) {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const proj = projectiles[p];
    proj.x += proj.vx;
    proj.y += proj.vy;

    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];

      if (t.y + t.h / 2 > canvasLogicalHeight - 80) continue;

      const hit =
        proj.x + 6 >= t.x - t.w / 2 &&
        proj.x - 6 <= t.x + t.w / 2 &&
        proj.y + 6 >= t.y - t.h / 2 &&
        proj.y - 6 <= t.y + t.h / 2;

      if (hit) {
        projectiles.splice(p, 1);
        if (t.isSpecial && t.specialType === "ROCK") {
          rocks.push({
            x: t.x,
            y: t.y,
            vy: 0,
            radius: 6,
            resting: false,
          });

          targets.splice(i, 1);
          if (!targets.length) spawnWave();
          // projectiles.splice(p, 1);
          playEffect("hit");
          pickGunWord();
          break;
        }

        if (t.pair === proj.pair && t.text !== proj.word) {
          repeatedCount.value++;
          playEffect("hit");

          if (Math.random() < 0.1) {
            t.makeRock();
          } else {
            targets.splice(i, 1);
          }

          const indexInGun = gunQueue.indexOf(t);
          if (indexInGun !== -1) {
            if (indexInGun < gunWordIndexRef.value) {
              gunWordIndexRef.value--;
            }
            gunQueue.splice(indexInGun, 1);

            if (gunWordIndexRef.value < 0) {
              gunWordIndexRef.value = 0;
            }
            if (gunWordIndexRef.value >= gunQueue.length) {
              gunWordIndexRef.value = 0;
            }
          }
          pickGunWord();

        } else {
          applyPunishment(t, spawnWord, activeWords, targets);
        }

        if (!targets.length) spawnWave();
        break;
      }
    }

    if (
      proj.x < 0 ||
      proj.x > canvasLogicalWidth ||
      proj.y < 0 ||
      proj.y > canvasLogicalHeight
    ) {
      projectiles.splice(p, 1);
    }
  }
}

function applyPunishment(t, spawnWord, activeWords, targets) {
  const punishment = Math.floor(Math.random() * 3);
  if (punishment === 0) t.vy += 0.15;
  else if (punishment === 1 && targets.length < 8) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < count; k++) {
      const pair = activeWords[Math.floor(Math.random() * activeWords.length)];
      spawnWord(pair);
    }
  }
  playEffect("error");
}
