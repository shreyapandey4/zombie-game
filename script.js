 // Constants for the canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const scoreEl = document.querySelector('#scoreEl');
const startGameBtn = document.querySelector('#startEl');
const modal = document.querySelector('#modalEl');

const shootSound = new Audio("audio/fire.mp3"); // Shooting sound
const zombieHitSound = new Audio("audio/killed_zombie.mp3"); // Zombie hit sound
const gameOverSound = new Audio("audio/zombieEat.mp3");
// Game variables
let keys = {};
let projectiles = [];
let zombies = [];
let particles = [];
let gameOver = false;
let lastZombieSpawn = Date.now();
let zombieSpawnInterval = 2000; // Start with a 2-second spawn interval
let score = 0;

// Sprite sheet dimensions
const SPRITE_SIZE = 64; // Assuming 64x64 tiles in the sprite sheet
const ANIMATION_SPEED = 10; // Slower animation speed

// Particle Effect
function createParticles(x, y) {
  const numParticles = 20; // Number of particles per explosion
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: x,
      y: y,
      size: Math.random() * 5 + 2, // Random size between 2-7
      dx: (Math.random() - 0.5) * 6, // Random horizontal speed
      dy: (Math.random() - 0.5) * 6, // Random vertical speed
      alpha: 1, // Opacity
      lifespan: 100, // Lifespan in frames
    });
  }
}

function updateParticles() {
  particles.forEach((particle, index) => {
    particle.x += particle.dx;
    particle.y += particle.dy;
    particle.alpha -= 0.02; // Gradually fade out
    particle.lifespan--;

    // Remove particles that have faded or expired
    if (particle.alpha <= 0 || particle.lifespan <= 0) {
      particles.splice(index, 1);
    }
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = particle.alpha; // Set particle transparency
    ctx.fillStyle = "red"; // Blood effect color
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1; // Reset transparency
  });
}

// Character setup
const characterSprite = new Image();
characterSprite.src = "images/characterSprite.png";
const character = {
  x: canvas.width / 2 - SPRITE_SIZE / 2,
  y: canvas.height / 2 - SPRITE_SIZE / 2,
  width: SPRITE_SIZE * 1.5,
  height: SPRITE_SIZE * 1.5,
  frameX: 0,
  frameY: 2, // Default to facing forward (front side)
  direction: "down",
};

// Cat setup
const catSprite = new Image();
catSprite.src = "images/catSprite.png";
const cat = {
  x: character.x + SPRITE_SIZE, // Positioned to the right of the character
  y: character.y + SPRITE_SIZE / 10, // Vertically aligned with character
  width: SPRITE_SIZE * 1.7, // Slightly larger than the character
  height: SPRITE_SIZE * 1.7,
  frameX: 0, // Single frame
  frameY: 0, // Direction-based frame
};

function updateCatSprite(direction) {
  // Update cat's frameY based on the direction
  switch (direction) {
    case "up":
      cat.frameY = 0; // Backward-facing frame
      break;
    case "down":
      cat.frameY = 1; // Forward-facing frame
      break;
    case "left":
      cat.frameY = 0; // Left-facing frame
      break;
    case "right":
      cat.frameY = 1; // Right-facing frame
      break;
    default:
      cat.frameY = 0; // Default to a valid frame
  }
}

function updateCatPosition() {
  cat.x = character.x + SPRITE_SIZE / 2; // Adjust to stay with the player
  cat.y = character.y; // Align vertically
}

// Zombie setup
const zombieSprite = new Image();
zombieSprite.src = "images/zombieSprite.png";

// Helper functions
function spawnZombie() {
  const side = Math.floor(Math.random() * 4); // 0 = top, 1 = right, 2 = bottom, 3 = left
  let x, y;
  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -SPRITE_SIZE;
  } else if (side === 1) {
    x = canvas.width;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height;
  } else {
    x = -SPRITE_SIZE;
    y = Math.random() * canvas.height;
  }

  zombies.push({
    x,
    y,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    frameX: 0,
    frameY: 0,
    frameCount: 0,
    speed: 2,
  });
}

function drawSprite(img, frameX, frameY, x, y, width, height) {
  ctx.drawImage(
    img,
    frameX * SPRITE_SIZE,
    frameY * SPRITE_SIZE,
    SPRITE_SIZE,
    SPRITE_SIZE,
    x,
    y,
    width,
    height
  );
}

function updateZombies() {
  zombies.forEach((zombie, index) => {
    const dx = character.x - zombie.x;
    const dy = character.y - zombie.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    zombie.x += (dx / distance) * zombie.speed;
    zombie.y += (dy / distance) * zombie.speed;

    zombie.frameCount++;
    if (zombie.frameCount >= ANIMATION_SPEED) {
      zombie.frameCount = 0;
      zombie.frameX = (zombie.frameX + 1) % 4;
    }

    if (
      zombie.x < character.x + character.width &&
      zombie.x + zombie.width > character.x &&
      zombie.y < character.y + character.height &&
      zombie.y + zombie.height > character.y
    ) {
      gameOver = true;
    }
  });
}

function playSound(sound) {
  const soundClone = sound.cloneNode(); 
  soundClone.volume = 1; 
  soundClone.play();
}


function shootProjectile(e) {
  playSound(shootSound); // Play shooting sound

  const angle = Math.atan2(
    e.offsetY - (character.y + character.height / 2),
    e.offsetX - (character.x + character.width / 2)
  );

  const speed = 8;
  projectiles.push({
    x: character.x + character.width / 2,
    y: character.y + character.height / 2,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    width: 10,
    height: 10,
  });

  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    character.direction = Math.cos(angle) > 0 ? "right" : "left";
    character.frameY = character.direction === "right" ? 3 : 1;
  } else {
    character.direction = Math.sin(angle) > 0 ? "down" : "up";
    character.frameY = character.direction === "down" ? 2 : 0;
  }

  updateCatSprite(character.direction);
}

// Update zombie hit logic with sound
function updateProjectiles() {
  projectiles.forEach((projectile, index) => {
    projectile.x += projectile.dx;
    projectile.y += projectile.dy;

    if (
      projectile.x < 0 ||
      projectile.x > canvas.width ||
      projectile.y < 0 ||
      projectile.y > canvas.height
    ) {
      projectiles.splice(index, 1);
    }

    zombies.forEach((zombie, zIndex) => {
      if (
        projectile.x < zombie.x + zombie.width &&
        projectile.x + projectile.width > zombie.x &&
        projectile.y < zombie.y + zombie.height &&
        projectile.y + projectile.height > zombie.y
      ) {
        playSound(zombieHitSound); // Play zombie hit sound
        createParticles(zombie.x + zombie.width / 2, zombie.y + zombie.height / 2); // Particle effect
        zombies.splice(zIndex, 1);
        projectiles.splice(index, 1);
        score += 1;
        scoreEl.innerHTML = score;
      }
    });
  });
}

// Add game over sound
function gameLoop() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameOver) {
    playSound(gameOverSound); // Play game over sound
    ctx.fillStyle = "red";
    ctx.font = "48px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
    return;
  }

  updateZombies();
  updateProjectiles();
  updateParticles();

  drawSprite(
    characterSprite,
    character.frameX,
    character.frameY,
    character.x,
    character.y,
    character.width,
    character.height
  );

  drawSprite(
    catSprite,
    cat.frameX,
    cat.frameY,
    cat.x,
    cat.y,
    cat.width,
    cat.height
  );

  zombies.forEach((zombie) => {
    drawSprite(
      zombieSprite,
      zombie.frameX,
      zombie.frameY,
      zombie.x,
      zombie.y,
      zombie.width,
      zombie.height
    );
  });

  projectiles.forEach((projectile) => {
    ctx.fillStyle = "silver";
    ctx.fillRect(
      projectile.x,
      projectile.y,
      projectile.width,
      projectile.height
    );
  });

  drawParticles();

  if (Date.now() - lastZombieSpawn > zombieSpawnInterval) {
    spawnZombie();
    lastZombieSpawn = Date.now();
    if (zombieSpawnInterval > 500) {
      zombieSpawnInterval -= 50; // Gradually increase spawn rate
    }
  }

  requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener("click", shootProjectile);

startGameBtn.addEventListener('click', () => {
  if (!gameOver) {
    gameLoop();
  }
  modal.style.display = 'none';
});
