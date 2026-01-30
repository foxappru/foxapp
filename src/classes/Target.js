import { setFont } from "../procedures/helpers.js";

export class Target {
  constructor(pair, lang, x, playEffect) {
    this.pair = pair;
    this.lang = lang;
    this.text = pair[lang];
    this.x = x;
    this.vy = 0.5;
    this.y = -Math.random() * 300 - 40;
    this.w = 0; // will calculate in draw()
    this.h = 16 + 18;
    this.dead = false;
    this.playEffect = playEffect;

    this.isSpecial = false;
    this.specialType = null;
  }

  makeRock() {
    this.isSpecial = true;
    this.specialType = "ROCK";
    this.text = "ROCK";
  }

  update(canvasLogicalHeight) {
    this.y += this.vy;

    // // fell below canvas
    if (this.y - this.h / 2 > canvasLogicalHeight) {
      this.dead = true;
    }
  }

  draw(ctx) {
    setFont(ctx);

    ctx.fillStyle = this.isSpecial ? "#909090" : "#401f1fff";
    ctx.strokeStyle = this.isSpecial
      ? "#b7b7b7"
      : "rgba(255, 102, 117, 1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
  }
}
