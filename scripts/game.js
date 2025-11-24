const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const fishEl = document.getElementById("fish");
const bestEl = document.getElementById("best");
const messageEl = document.getElementById("message");
const actionButton = document.getElementById("action");

const GROUND_HEIGHT = 110;
const PENGUIN_SIZE = { width: 70, height: 80 };
const FISH_SIZE = { width: 36, height: 24 };
const START_SPEED = 6;

const input = {
  jump: false,
  duck: false,
};

const state = {
  running: false,
  gameOver: false,
  speed: START_SPEED,
  score: 0,
  fish: 0,
  best: Number.parseInt(localStorage.getItem("superPenguinBest") ?? "0", 10),
  time: 0,
};

class Penguin {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 140;
    this.baseY = canvas.height - GROUND_HEIGHT - PENGUIN_SIZE.height;
    this.y = this.baseY;
    this.width = PENGUIN_SIZE.width;
    this.height = PENGUIN_SIZE.height;
    this.velocityY = 0;
    this.gravity = 0.7;
    this.jumpForce = 14;
    this.ducking = false;
    this.flashTimer = 0;
  }

  get hitbox() {
    const height = this.ducking ? this.height * 0.6 : this.height;
    return {
      x: this.x,
      y: this.y + (this.height - height),
      width: this.width,
      height,
    };
  }

  update() {
    if (input.duck && this.onGround()) {
      this.ducking = true;
    } else {
      this.ducking = false;
    }

    if (input.jump && this.onGround()) {
      this.velocityY = -this.jumpForce;
      input.jump = false;
    }

    this.velocityY += this.gravity;
    this.y += this.velocityY;

    if (this.y > this.baseY) {
      this.y = this.baseY;
      this.velocityY = 0;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= 1;
    }
  }

  onGround() {
    return this.y >= this.baseY - 0.01;
  }

  render() {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(this.width / 2, this.height, this.width / 2.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, this.height * -0.02);
    const flicker = this.flashTimer > 0 ? (this.flashTimer % 6 < 3 ? 1 : 0.3) : 1;
    ctx.globalAlpha = flicker;

    // Body
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--penguin").trim();
    ctx.beginPath();
    ctx.roundRect(0, this.height * 0.1, this.width, this.height * 0.9, 16);
    ctx.fill();

    // Belly
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--penguin-belly").trim();
    ctx.beginPath();
    ctx.roundRect(this.width * 0.15, this.height * 0.32, this.width * 0.7, this.height * 0.58, 30);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#f7a21b";
    ctx.beginPath();
    ctx.moveTo(this.width * 0.72, this.height * 0.42);
    ctx.lineTo(this.width * 0.92, this.height * 0.48);
    ctx.lineTo(this.width * 0.72, this.height * 0.54);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = "#0b1b35";
    ctx.beginPath();
    ctx.arc(this.width * 0.62, this.height * 0.38, 5, 0, Math.PI * 2);
    ctx.fill();

    // Flippers
    ctx.fillStyle = "#0d1729";
    ctx.beginPath();
    ctx.roundRect(-14, this.height * 0.45, 22, 60, 10);
    ctx.roundRect(this.width - 8, this.height * 0.42, 20, 64, 10);
    ctx.fill();

    // Feet
    ctx.fillStyle = "#f7a21b";
    ctx.beginPath();
    ctx.roundRect(this.width * 0.18, this.height * 0.94, 20, 10, 4);
    ctx.roundRect(this.width * 0.64, this.height * 0.94, 20, 10, 4);
    ctx.fill();

    ctx.restore();
  }
}

class Obstacle {
  constructor(x, width, height) {
    this.x = x;
    this.width = width;
    this.height = height;
    this.speedBoost = Math.random() * 0.8;
  }

  get y() {
    return canvas.height - GROUND_HEIGHT - this.height;
  }

  get hitbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update(delta) {
    this.x -= (state.speed + this.speedBoost) * delta;
  }

  render() {
    ctx.fillStyle = "#b9e4ff";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e9f7ff";
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.28, this.y + this.height * 0.65);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height * 0.35);
    ctx.lineTo(this.x + this.width * 0.72, this.y + this.height * 0.65);
    ctx.closePath();
    ctx.fill();
  }
}

class Fish {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = FISH_SIZE.width;
    this.height = FISH_SIZE.height;
    this.collected = false;
  }

  get hitbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update(delta) {
    this.x -= state.speed * delta;
  }

  render() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--fish").trim();
    ctx.beginPath();
    ctx.ellipse(this.width / 2, this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.width, this.height / 2);
    ctx.lineTo(this.width + 12, 0);
    ctx.lineTo(this.width + 12, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd6a1";
    ctx.beginPath();
    ctx.arc(this.width * 0.3, this.height * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let penguin = new Penguin();
let obstacles = [];
let fishes = [];
let lastTime = 0;
let spawnTimer = 0;
let fishTimer = 0;

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.speed = START_SPEED;
  state.score = 0;
  state.fish = 0;
  state.time = 0;
  obstacles = [];
  fishes = [];
  penguin.reset();
  messageEl.classList.add("hidden");
  document.body.classList.toggle("dark", false);
}

function update(delta) {
  state.time += delta;
  state.speed = START_SPEED + Math.min(8, state.time * 0.0015);
  spawnTimer += delta;
  fishTimer += delta;

  penguin.update();

  if (spawnTimer > 60) {
    spawnObstacle();
    spawnTimer = 0;
  }

  if (fishTimer > 140) {
    spawnFish();
    fishTimer = 0;
  }

  obstacles.forEach((obstacle) => obstacle.update(delta));
  fishes.forEach((fish) => fish.update(delta));

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
  fishes = fishes.filter((fish) => fish.x + fish.width > -40 && !fish.collected);

  handleCollisions();
  state.score += delta * 0.1;
}

function render() {
  drawBackground();
  drawGround();
  penguin.render();
  obstacles.forEach((obstacle) => obstacle.render());
  fishes.forEach((fish) => fish.render());
  drawHUD();
}

function loop(timestamp) {
  const delta = Math.min(32, timestamp - lastTime || 0) * 0.1;
  lastTime = timestamp;

  if (state.running) {
    update(delta);
    render();
  }

  requestAnimationFrame(loop);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#81caff");
  gradient.addColorStop(1, "#e8f6ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#b4dfff";
  for (let i = 0; i < 3; i += 1) {
    const offset = ((state.time * 0.02 + i * 180) % (canvas.width + 160)) - 160;
    ctx.beginPath();
    ctx.ellipse(canvas.width - offset, 120 + i * 40, 90, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ice").trim();
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ice-shadow").trim();
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 14);

  ctx.strokeStyle = "rgba(12, 45, 76, 0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, canvas.height - GROUND_HEIGHT + 8);
    ctx.lineTo(i + 20, canvas.height - GROUND_HEIGHT + 18);
    ctx.stroke();
  }
}

function drawHUD() {
  scoreEl.textContent = Math.floor(state.score).toString();
  fishEl.textContent = state.fish.toString();
  bestEl.textContent = state.best.toString();
}

function spawnObstacle() {
  const height = 40 + Math.random() * 60;
  const width = 30 + Math.random() * 30;
  const spacing = 240 + Math.random() * 180;
  const x = canvas.width + spacing;
  obstacles.push(new Obstacle(x, width, height));
}

function spawnFish() {
  const y = canvas.height - GROUND_HEIGHT - (Math.random() * 120 + 80);
  const x = canvas.width + 120;
  fishes.push(new Fish(x, y));
}

function handleCollisions() {
  const penguinBox = penguin.hitbox;

  for (const obstacle of obstacles) {
    if (rectsOverlap(penguinBox, obstacle.hitbox)) {
      return endGame();
    }
  }

  for (const fish of fishes) {
    if (!fish.collected && rectsOverlap(penguinBox, fish.hitbox)) {
      fish.collected = true;
      state.fish += 1;
      state.score += 50;
      penguin.flashTimer = 18;
    }
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("superPenguinBest", state.best.toString());
  messageEl.textContent = `You crashed! Score ${Math.floor(state.score)} · Fish ${state.fish}. Press R to restart.`;
  messageEl.classList.remove("hidden");
  document.body.classList.toggle("dark", true);
}

function handlePress() {
  if (!state.running) {
    resetGame();
  }
  input.jump = true;
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    handlePress();
  }

  if (event.code === "ArrowDown") {
    input.duck = true;
  }

  if (event.code === "KeyR") {
    resetGame();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") {
    input.duck = false;
  }
});

actionButton.addEventListener("click", handlePress);
canvas.addEventListener("pointerdown", handlePress);

resetGame();
requestAnimationFrame(loop);
