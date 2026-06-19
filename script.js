const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const timerText = document.getElementById("timer");
const goalText = document.getElementById("goal");
const lifeText = document.getElementById("life");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const difficultyText = document.getElementById("difficulty");
const clearNote = document.getElementById("clearNote");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const ground = document.querySelector(".ground");
const resultPopup = document.getElementById("resultPopup");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

let score = 0;
let life = 3;
let playerX = 0;
let playerSpeed = 10;
let gameRunning = false;
let timeLeft = 30;
let gameStartTime = 0;
let currentDifficultyLevel = 2;
let soundEnabled = true;

let leftPressed = false;
let rightPressed = false;

let items = [];
let itemCreateTimer = null;
let gameLoopTimer = null;
let resultPopupTimer = null;

const playerBottom = 49;
const itemSize = 44;
const yellowStarBaseSpeedMin = 3.6;
const yellowStarBaseSpeedRange = 2.2;

const difficultySettings = {
  1: {
    key: "1",
    level: 1,
    label: "1단계",
    timeLimit: 30,
    winScore: 100,
    startLife: 3,
    itemCreateInterval: 900,
    extraItemChance: 0,
    isInfinite: false
  },
  2: {
    key: "2",
    level: 2,
    label: "2단계",
    timeLimit: 30,
    winScore: 200,
    startLife: 3,
    itemCreateInterval: 900,
    extraItemChance: 0,
    isInfinite: false
  },
  3: {
    key: "3",
    level: 3,
    label: "3단계",
    timeLimit: 30,
    winScore: 300,
    startLife: 3,
    itemCreateInterval: 520,
    extraItemChance: 0.55,
    isInfinite: false
  },
  infinite: {
    key: "infinite",
    level: "∞",
    label: "무한모드",
    timeLimit: null,
    winScore: null,
    startLife: 3,
    itemCreateInterval: 900,
    minItemCreateInterval: 320,
    extraItemChance: 0,
    maxExtraItemChance: 0.65,
    itemFrequencyGrowthPerSecond: 0.016,
    extraItemChanceGrowthPerSecond: 0.006,
    isInfinite: true,
    speedGrowthPerSecond: 0.012,
    maxSpeedScale: 2.6
  }
};

function getCurrentDifficulty() {
  return difficultySettings[String(currentDifficultyLevel)] || difficultySettings[2];
}

function isInfiniteMode() {
  return Boolean(getCurrentDifficulty().isInfinite);
}

function getGameTimeLimit() {
  return getCurrentDifficulty().timeLimit;
}

function getWinScore() {
  return getCurrentDifficulty().winScore;
}

function getStartLife() {
  return getCurrentDifficulty().startLife || 3;
}

function getElapsedSeconds() {
  if (!gameStartTime) return 0;

  return Math.floor((Date.now() - gameStartTime) / 1000);
}

function getCurrentSpeedScale() {
  const difficulty = getCurrentDifficulty();

  if (!difficulty.isInfinite || !gameRunning || !gameStartTime) {
    return 1;
  }

  const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
  const speedScale = 1 + elapsedSeconds * difficulty.speedGrowthPerSecond;

  return Math.min(difficulty.maxSpeedScale, speedScale);
}

function getCurrentItemCreateInterval() {
  const difficulty = getCurrentDifficulty();

  if (!difficulty.isInfinite || !gameRunning || !gameStartTime) {
    return difficulty.itemCreateInterval;
  }

  const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
  const frequencyScale = 1 + elapsedSeconds * difficulty.itemFrequencyGrowthPerSecond;
  const nextInterval = difficulty.itemCreateInterval / frequencyScale;

  return Math.max(difficulty.minItemCreateInterval, Math.floor(nextInterval));
}

function getCurrentExtraItemChance() {
  const difficulty = getCurrentDifficulty();

  if (!difficulty.isInfinite || !gameRunning || !gameStartTime) {
    return difficulty.extraItemChance;
  }

  const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
  const nextChance = difficulty.extraItemChance + elapsedSeconds * difficulty.extraItemChanceGrowthPerSecond;

  return Math.min(difficulty.maxExtraItemChance, nextChance);
}

function scheduleNextItemWave() {
  if (!gameRunning) return;

  itemCreateTimer = setTimeout(() => {
    createItemWave();
    scheduleNextItemWave();
  }, getCurrentItemCreateInterval());
}

function updateDifficultyDisplay() {
  const difficulty = getCurrentDifficulty();

  if (difficultyText) {
    difficultyText.textContent = difficulty.level;
  }

  if (clearNote) {
    if (difficulty.isInfinite) {
      clearNote.textContent = "무한모드: 목표 점수 없이 계속 플레이! 시간이 지날수록 속도와 등장 빈도가 증가합니다!";
    } else {
      clearNote.textContent = `${difficulty.label}: ${difficulty.timeLimit}초 안에 ${difficulty.winScore}점 이상을 넘기면 CLEAR!`;
    }
  }

  difficultyButtons.forEach(button => {
    const isActive = String(button.dataset.level) === String(difficulty.key);
    button.classList.toggle("active", isActive);
  });
}

function selectDifficulty(level) {
  const nextLevel = String(level);

  if (!difficultySettings[nextLevel]) return;

  currentDifficultyLevel = nextLevel;
  gameRunning = false;

  clearGameTimers();
  stopBgm();
  resetGameState();

  startBtn.style.display = "inline-block";
  restartBtn.style.display = "none";
}

function getGameWidth() {
  return gameArea.clientWidth;
}

function getGameHeight() {
  return gameArea.clientHeight;
}

function getGroundTop() {
  const groundHeight = ground ? ground.offsetHeight : 43;
  return getGameHeight() - groundHeight;
}

function getPlayerWidth() {
  return player.offsetWidth || 108;
}

function getPlayerHeight() {
  return player.offsetHeight || 60;
}

function getCenteredPlayerX() {
  return Math.floor((getGameWidth() - getPlayerWidth()) / 2);
}

function clampPlayerPosition() {
  const maxPlayerX = getGameWidth() - getPlayerWidth();

  if (playerX < 0) {
    playerX = 0;
  }

  if (playerX > maxPlayerX) {
    playerX = maxPlayerX;
  }

  player.style.left = playerX + "px";
}

const colors = {
  B: "#13001f",
  Y: "#ffd91f",
  L: "#fff36a",
  O: "#ffae00",
  W: "#ffffff",
  C: "#cfffff",
  A: "#9ff1ff",
  D: "#6ddcff",
  S: "#d9faff",
  G: "#72c9e8",
  K: "#1e1b22",
  M: "#5e5655",
  N: "#8a7d73",
  H: "#b8ada1",
  E: "#302b31",
  R: "#ff3d2e",
  T: "transparent"
};

const starMap = [
  "TTTTTBTTTTT",
  "TTTTLBLTTTT",
  "TTTTLYLTTTT",
  "TTTBLYLBTTT",
  "BBLYYYYOLBB",
  "TBBLYYYOBBT",
  "TTBLYYYOBTT",
  "TTBYOYOBTTT",
  "TBYOBOYBTTT",
  "BYOBTBOYBTT",
  "BBTTTTTBBTT"
];

const meteorMap = [
  "TTTTTTOORRT",
  "TTTTTOORRRT",
  "TTTTOORRTTT",
  "TTTKKKKTTTT",
  "TTKNNNKTTTT",
  "TKNNHNNKTTT",
  "TKNNEHNKKTT",
  "TKNNNNNNKTT",
  "TTKNEHNKTTT",
  "TTTKNNKTTTT",
  "TTTTKKTTTTT"
];

const starPalettes = {
  yellow: {
    B: "#13001f",
    Y: "#ffd91f",
    L: "#fff36a",
    O: "#ffae00"
  },
  red: {
    B: "#2b0616",
    Y: "#ff4d5d",
    L: "#ff9aa5",
    O: "#c9002b"
  },
  rainbow: {
    B: "#160022",
    Y: "#7dfcff",
    L: "#fff2a8",
    O: "#ff7cf7"
  }
};

const itemTypes = [
  {
    id: "yellow",
    itemClass: "item-yellow",
    map: starMap,
    artClass: "star-art star-art-yellow",
    palette: starPalettes.yellow,
    scoreValue: 10,
    chance: 40,
    speedMultiplier: 1,
    loseLifeOnGround: false,
    burstType: "yellow",
    isObstacle: false
  },
  {
    id: "red",
    itemClass: "item-red",
    map: starMap,
    artClass: "star-art star-art-red",
    palette: starPalettes.red,
    scoreValue: 20,
    chance: 20,
    speedMultiplier: 1.875,
    loseLifeOnGround: false,
    burstType: "red",
    isObstacle: false
  },
  {
    id: "rainbow",
    itemClass: "item-rainbow",
    map: starMap,
    artClass: "star-art star-art-rainbow",
    palette: starPalettes.rainbow,
    scoreValue: 50,
    chance: 10,
    speedMultiplier: 2.325,
    loseLifeOnGround: false,
    burstType: "rainbow",
    isObstacle: false
  },
  {
    id: "meteor",
    itemClass: "item-meteor",
    map: meteorMap,
    artClass: "meteor-art",
    palette: colors,
    scoreValue: -50,
    chance: 30,
    speedMultiplier: 1,
    loseLifeOnGround: false,
    burstType: "meteor",
    isObstacle: true
  }
];

const burstPalettes = {
  yellow: ["#ffd91f", "#fff36a", "#ffffff", "#ffae00", "#ffd91f", "#fff36a", "#ffae00", "#ffffff"],
  red: ["#ff4d5d", "#ff9aa5", "#ffffff", "#ff2144", "#c9002b", "#ff9aa5", "#ff4d5d", "#ffffff"],
  rainbow: ["#7dfcff", "#ff7cf7", "#fff2a8", "#8affc1", "#9f8cff", "#ffffff", "#67e8ff", "#ff9af8"],
  meteor: ["#ff3d2e", "#ffae00", "#ffe66b", "#8a7d73", "#5e5655", "#302b31", "#ff6b35", "#c6b8a9"]
};

/*
  구름 픽셀맵
  모든 줄이 18칸으로 동일해야 깨지지 않음
*/
const cloudMap = [
  "TTTTTTBBBBTTTTTTTT",
  "TTTTBBWWWWBBTTTTTT",
  "TTBBWWWWWWWWBBTTTT",
  "TBBWWWWWWWWWWBBTTT",
  "BBWWWWWWWWWWWWBBTT",
  "BWWWWCWWWWCWWWWBBT",
  "BBWWWAWWWWAWWWWBBT",
  "TBBDAAAAWWAAAADBBT",
  "TTBBDDAAAAAADBBTTT",
  "TTTTBBBBBBBBBBTTTT"
];

/* =========================
   8비트 BGM / 효과음 설정
   ========================= */

let audioContext = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let bgmTimer = null;
let bgmStep = 0;

const MASTER_VOLUME = 0.22;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const bgmMelody = [
  659.25, 783.99, 987.77, 1174.66,
  987.77, 783.99, 659.25, 523.25,
  587.33, 698.46, 880.00, 1046.50,
  880.00, 698.46, 587.33, 523.25
];

const bgmBass = [
  130.81,
  164.81,
  196.00,
  220.00
];

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
window.addEventListener("resize", resizeGameHandler);

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", toggleSound);
}
difficultyButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectDifficulty(button.dataset.level);
  });
});

createPixelArt(player, cloudMap, "cloud-art");
updateSoundButton();
resetGameState();

function updateSoundButton() {
  if (!soundToggleBtn) return;

  soundToggleBtn.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
  soundToggleBtn.setAttribute("aria-pressed", String(soundEnabled));
  soundToggleBtn.classList.toggle("muted", !soundEnabled);
}

function applySoundState() {
  updateSoundButton();

  if (masterGain) {
    masterGain.gain.value = soundEnabled ? MASTER_VOLUME : 0;
  }

  if (!soundEnabled) {
    stopBgm();
    return;
  }

  if (gameRunning) {
    resumeAudio()
      .then(() => {
        startBgm();
      })
      .catch(error => {
        console.warn("오디오를 다시 시작할 수 없습니다.", error);
      });
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  applySoundState();
}

function initializeAudio() {
  if (audioContext || !AudioContextClass) return;

  audioContext = new AudioContextClass();

  masterGain = audioContext.createGain();
  bgmGain = audioContext.createGain();
  sfxGain = audioContext.createGain();

  masterGain.gain.value = soundEnabled ? MASTER_VOLUME : 0;
  bgmGain.gain.value = 0.36;
  sfxGain.gain.value = 0.7;

  bgmGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audioContext.destination);
}

function resumeAudio() {
  initializeAudio();

  if (!audioContext) {
    return Promise.resolve();
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume();
  }

  return Promise.resolve();
}

function playTone(frequency, startTime, duration, type, volume, destinationGain) {
  if (!soundEnabled || !audioContext || !destinationGain) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(destinationGain);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playNoise(startTime, duration, volume, destinationGain) {
  if (!soundEnabled || !audioContext || !destinationGain) return;

  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const fade = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * fade;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  filter.type = "highpass";
  filter.frequency.setValueAtTime(1800, startTime);

  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.buffer = buffer;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(destinationGain);

  source.start(startTime);
  source.stop(startTime + duration);
}

function playBgmTick() {
  if (!soundEnabled || !audioContext || !bgmGain || !gameRunning) return;

  const now = audioContext.currentTime;

  const melodyFrequency = bgmMelody[bgmStep % bgmMelody.length];
  playTone(melodyFrequency, now, 0.09, "square", 0.16, bgmGain);

  if (bgmStep % 4 === 0) {
    const bassIndex = Math.floor(bgmStep / 4) % bgmBass.length;
    playTone(bgmBass[bassIndex], now, 0.16, "triangle", 0.1, bgmGain);
  }

  if (bgmStep % 2 === 0) {
    playNoise(now, 0.025, 0.025, bgmGain);
  }

  bgmStep++;
}

function startBgm() {
  if (!soundEnabled || !audioContext || !bgmGain) return;

  stopBgm();

  bgmStep = 0;
  playBgmTick();

  bgmTimer = setInterval(playBgmTick, 150);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function playCatchSound() {
  if (!soundEnabled || !audioContext || !sfxGain) return;

  const now = audioContext.currentTime;

  playTone(987.77, now, 0.055, "square", 0.32, sfxGain);
  playTone(1318.51, now + 0.045, 0.065, "square", 0.26, sfxGain);
  playTone(1760.00, now + 0.1, 0.09, "triangle", 0.2, sfxGain);
  playNoise(now, 0.045, 0.06, sfxGain);
}

function playMeteorCatchSound() {
  if (!soundEnabled || !audioContext || !sfxGain) return;

  const now = audioContext.currentTime;

  playTone(220.00, now, 0.08, "sawtooth", 0.18, sfxGain);
  playTone(146.83, now + 0.04, 0.12, "square", 0.16, sfxGain);
  playTone(98.00, now + 0.1, 0.14, "triangle", 0.14, sfxGain);
  playNoise(now, 0.18, 0.16, sfxGain);
}

function playBurstSound() {
  if (!soundEnabled || !audioContext || !sfxGain) return;

  const now = audioContext.currentTime;

  playTone(329.63, now, 0.08, "square", 0.22, sfxGain);
  playTone(196.00, now + 0.045, 0.1, "triangle", 0.16, sfxGain);
  playNoise(now, 0.11, 0.12, sfxGain);
}

/* =========================
   픽셀아트 생성
   ========================= */

function createPixelArt(target, map, className, palette = colors) {
  target.innerHTML = "";

  const art = createPixelArtElement(map, className, palette);
  target.appendChild(art);
}

function createPixelArtElement(map, className, palette = colors) {
  const width = map[0].length;
  const height = map.length;

  const hasInvalidRow = map.some(row => row.length !== width);

  if (hasInvalidRow) {
    console.error("픽셀맵의 가로 칸 수가 서로 다릅니다. 모든 줄의 글자 수를 동일하게 맞춰주세요.");
  }

  const art = document.createElement("div");
  art.classList.add("pixel-art");

  className.split(" ").forEach(name => {
    if (name) {
      art.classList.add(name);
    }
  });

  art.style.gridTemplateColumns = `repeat(${width}, var(--pixel-size))`;
  art.style.gridTemplateRows = `repeat(${height}, var(--pixel-size))`;

  map.forEach(row => {
    row.split("").forEach(code => {
      const cell = document.createElement("div");
      cell.classList.add("pixel-cell");
      cell.style.backgroundColor = palette[code] || colors[code] || "transparent";
      art.appendChild(cell);
    });
  });

  return art;
}

function createBurstEffect(x, y, burstType = "yellow") {
  const burst = document.createElement("div");
  burst.classList.add("star-burst", `star-burst-${burstType}`);

  burst.style.left = x + "px";
  burst.style.top = y - 6 + "px";

  const positions = [
    { x: -34, y: -16 },
    { x: -24, y: -34 },
    { x: -10, y: -46 },
    { x: 10, y: -44 },
    { x: 25, y: -30 },
    { x: 36, y: -12 },
    { x: -18, y: 8 },
    { x: 18, y: 8 }
  ];

  const palette = burstPalettes[burstType] || burstPalettes.yellow;

  positions.forEach((particleData, index) => {
    const particle = document.createElement("span");
    particle.classList.add("burst-particle");
    particle.style.setProperty("--burst-x", particleData.x + "px");
    particle.style.setProperty("--burst-y", particleData.y + "px");
    particle.style.setProperty("--particle-color", palette[index % palette.length]);
    burst.appendChild(particle);
  });

  gameArea.appendChild(burst);

  setTimeout(() => {
    if (burst.parentNode) {
      burst.parentNode.removeChild(burst);
    }
  }, 520);
}

function clearBurstEffects() {
  gameArea.querySelectorAll(".star-burst").forEach(effect => {
    effect.remove();
  });
}

/* =========================
   입력 처리
   ========================= */

function keyDownHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    leftPressed = true;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    rightPressed = true;
  }
}

function keyUpHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    leftPressed = false;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    rightPressed = false;
  }
}

/* =========================
   게임 로직
   ========================= */

function movePlayer() {
  if (!gameRunning) return;

  if (leftPressed) {
    playerX -= playerSpeed;
  }

  if (rightPressed) {
    playerX += playerSpeed;
  }

  clampPlayerPosition();
}

function getRandomItemType() {
  const randomValue = Math.random() * 100;
  let chanceTotal = 0;

  for (const itemType of itemTypes) {
    chanceTotal += itemType.chance;

    if (randomValue < chanceTotal) {
      return itemType;
    }
  }

  return itemTypes[0];
}

function createItem() {
  if (!gameRunning) return;

  const itemType = getRandomItemType();
  const item = document.createElement("div");
  item.classList.add("item", itemType.itemClass);

  const light = document.createElement("div");
  light.classList.add("fall-light");

  const itemArt = createPixelArtElement(itemType.map, itemType.artClass, itemType.palette);

  item.appendChild(light);
  item.appendChild(itemArt);

  const maxItemX = Math.max(0, getGameWidth() - itemSize);
  const randomX = Math.floor(Math.random() * maxItemX);
  const randomBaseSpeed = yellowStarBaseSpeedMin + Math.random() * yellowStarBaseSpeedRange;

  item.style.left = randomX + "px";
  item.style.top = "-20px";

  gameArea.appendChild(item);

  items.push({
    element: item,
    x: randomX,
    y: -20,
    speed: randomBaseSpeed * itemType.speedMultiplier,
    scoreValue: itemType.scoreValue,
    loseLifeOnGround: itemType.loseLifeOnGround,
    burstType: itemType.burstType,
    isObstacle: itemType.isObstacle
  });
}

function createItemWave() {
  if (!gameRunning) return;

  const extraItemChance = getCurrentExtraItemChance();

  createItem();

  if (extraItemChance > 0 && Math.random() < extraItemChance) {
    createItem();
  }
}

function removeItemAt(index) {
  const item = items[index];

  if (item.element.parentNode) {
    gameArea.removeChild(item.element);
  }

  items.splice(index, 1);
}

function catchItem(item, index) {
  score += item.scoreValue;
  scoreText.textContent = score;

  createBurstEffect(item.x + itemSize / 2, item.y + itemSize / 2, item.burstType);

  if (item.isObstacle) {
    life--;
    updateLife();
    playMeteorCatchSound();
  } else {
    playCatchSound();
  }

  removeItemAt(index);

  if (life <= 0) {
    const gameOverMessage = isInfiniteMode()
      ? `무한모드 종료! 최종 점수는 ${score}점입니다.`
      : "운석에 맞아 목숨을 모두 잃었습니다.";

    endGame("game-over", gameOverMessage, 180);
    return;
  }

  if (isInfiniteMode()) {
    return;
  }

  const targetScore = getWinScore();

  if (score >= targetScore) {
    endGame("clear", `${targetScore}점 이상을 달성했습니다!`);
  }
}

function hitGround(item, index, groundTop) {
  createBurstEffect(item.x + itemSize / 2, groundTop, item.burstType);
  playBurstSound();

  removeItemAt(index);
}

function updateTimerDisplay() {
  if (timerText) {
    timerText.textContent = timeLeft;
  }
}

function updateGoalDisplay() {
  if (goalText) {
    goalText.textContent = isInfiniteMode() ? "∞" : getWinScore();
  }

  updateDifficultyDisplay();
}

function updateGameTimer() {
  if (!gameRunning) return;

  const elapsedSeconds = getElapsedSeconds();

  if (isInfiniteMode()) {
    if (elapsedSeconds !== timeLeft) {
      timeLeft = elapsedSeconds;
      updateTimerDisplay();
    }

    return;
  }

  const nextTimeLeft = Math.max(0, getGameTimeLimit() - elapsedSeconds);

  if (nextTimeLeft !== timeLeft) {
    timeLeft = nextTimeLeft;
    updateTimerDisplay();
  }

  if (timeLeft <= 0) {
    const targetScore = getWinScore();

    if (score >= targetScore) {
      endGame("clear", `${targetScore}점 이상을 달성했습니다!`);
    } else {
      endGame("game-over", `시간 종료! ${targetScore}점 이상을 넘지 못했습니다.`);
    }
  }
}

function gameLoop() {
  if (!gameRunning) return;

  updateGameTimer();

  if (!gameRunning) return;

  movePlayer();

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    item.y += item.speed * getCurrentSpeedScale();
    item.element.style.top = item.y + "px";

    const playerWidth = getPlayerWidth();
    const playerHeight = getPlayerHeight();
    const playerY = getGameHeight() - playerBottom - playerHeight;
    const groundTop = getGroundTop();

    const isHit =
      item.x < playerX + playerWidth &&
      item.x + itemSize > playerX &&
      item.y < playerY + playerHeight &&
      item.y + itemSize > playerY;

    const isGroundHit = item.y + itemSize >= groundTop;

    if (isHit) {
      catchItem(item, i);

      if (!gameRunning) return;
    } else if (isGroundHit) {
      hitGround(item, i, groundTop);

      if (!gameRunning) return;
    }
  }
}

function updateLife() {
  let lifeDisplay = "";

  for (let i = 0; i < life; i++) {
    lifeDisplay += "❤";
  }

  lifeText.textContent = lifeDisplay;
}

function resizeGameHandler() {
  clampPlayerPosition();

  items.forEach(item => {
    const maxItemX = Math.max(0, getGameWidth() - itemSize);

    if (item.x > maxItemX) {
      item.x = maxItemX;
      item.element.style.left = item.x + "px";
    }
  });
}

function clearGameTimers() {
  if (itemCreateTimer) {
    clearTimeout(itemCreateTimer);
    itemCreateTimer = null;
  }

  if (gameLoopTimer) {
    clearInterval(gameLoopTimer);
    gameLoopTimer = null;
  }

  if (resultPopupTimer) {
    clearTimeout(resultPopupTimer);
    resultPopupTimer = null;
  }
}

function resetGameState() {
  score = 0;
  life = getStartLife();
  timeLeft = isInfiniteMode() ? 0 : getGameTimeLimit();
  gameStartTime = 0;
  playerX = getCenteredPlayerX();

  leftPressed = false;
  rightPressed = false;

  scoreText.textContent = score;
  updateTimerDisplay();
  updateGoalDisplay();
  updateLife();
  hideResultPopup();

  clampPlayerPosition();

  items.forEach(item => {
    if (item.element.parentNode) {
      gameArea.removeChild(item.element);
    }
  });

  items = [];

  clearBurstEffects();
}

function showResultPopup(resultType, message) {
  if (!resultPopup || !resultTitle || !resultMessage) return;

  const isClear = resultType === "clear";

  resultTitle.textContent = isClear ? "CLEAR" : "GAME OVER";
  resultMessage.textContent = message;

  resultPopup.classList.remove("hidden", "result-clear", "result-game-over");
  resultPopup.classList.add(isClear ? "result-clear" : "result-game-over");
  resultPopup.setAttribute("aria-hidden", "false");
}

function hideResultPopup() {
  if (!resultPopup) return;

  resultPopup.classList.add("hidden");
  resultPopup.classList.remove("result-clear", "result-game-over");
  resultPopup.setAttribute("aria-hidden", "true");
}

function endGame(resultType, message, delay = 100) {
  gameRunning = false;

  clearGameTimers();
  stopBgm();

  leftPressed = false;
  rightPressed = false;

  if (resultPopupTimer) {
    clearTimeout(resultPopupTimer);
  }

  resultPopupTimer = setTimeout(() => {
    showResultPopup(resultType, message);
    restartBtn.style.display = "inline-block";
    resultPopupTimer = null;
  }, delay);
}

function startGame() {
  if (gameRunning) return;

  gameRunning = true;
  timeLeft = isInfiniteMode() ? 0 : getGameTimeLimit();
  gameStartTime = Date.now();
  updateTimerDisplay();
  updateGoalDisplay();

  startBtn.style.display = "none";
  restartBtn.style.display = "none";
  hideResultPopup();

  clearGameTimers();

  if (soundEnabled) {
    resumeAudio()
      .then(() => {
        startBgm();
      })
      .catch(error => {
        console.warn("오디오를 시작할 수 없습니다.", error);
      });
  } else {
    stopBgm();
  }

  createItemWave();
  scheduleNextItemWave();

  gameLoopTimer = setInterval(gameLoop, 20);
}

function restartGame() {
  gameRunning = false;

  clearGameTimers();
  stopBgm();
  resetGameState();
  startGame();
}
