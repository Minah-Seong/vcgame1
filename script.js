const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const timerText = document.getElementById("timer");
const goalText = document.getElementById("goal");
const lifeText = document.getElementById("life");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const difficultyText = document.getElementById("difficulty");
const clearNote = document.getElementById("clearNote");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const ground = document.querySelector(".ground");
const resultPopup = document.getElementById("resultPopup");
const pausePopup = document.getElementById("pausePopup");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const rankingBtn = document.getElementById("rankingBtn");
const rankingPopup = document.getElementById("rankingPopup");
const rankingList = document.getElementById("rankingList");
const closeRankingBtn = document.getElementById("closeRankingBtn");
const rankingSaveArea = document.getElementById("rankingSaveArea");
const rankingNicknameInput = document.getElementById("rankingNicknameInput");
const saveRankingBtn = document.getElementById("saveRankingBtn");
const rankingSaveMessage = document.getElementById("rankingSaveMessage");
const mobileLeftBtn = document.getElementById("mobileLeftBtn");
const mobileRightBtn = document.getElementById("mobileRightBtn");
const guideText = document.querySelector(".guide");

let score = 0;
let life = 3;
let playerX = 0;
let playerSpeed = 10;
let gameRunning = false;
let gamePaused = false;
let pauseStartTime = 0;
let timeLeft = 30;
let gameStartTime = 0;
let currentDifficultyLevel = 1;
let soundEnabled = true;
let hasSavedCurrentRanking = false;

let leftPressed = false;
let rightPressed = false;

let items = [];
let itemCreateTimer = null;
let gameLoopTimer = null;
let resultPopupTimer = null;

const defaultPlayerBottom = 49;
const itemSize = 44;
const yellowStarBaseSpeedMin = 3.6;
const yellowStarBaseSpeedRange = 2.2;

const ASSET_PATHS = {
  yellowStar: "images/star-yellow.png",
  redStar: "images/star-red.png",
  rainbowStar: "images/star-rainbow.png",
  meteor: "images/meteor.png"
};

const itemTypes = [
  {
    id: "yellow",
    itemClass: "item-yellow",
    imageSrc: ASSET_PATHS.yellowStar,
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
    imageSrc: ASSET_PATHS.redStar,
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
    imageSrc: ASSET_PATHS.rainbowStar,
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
    imageSrc: ASSET_PATHS.meteor,
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

const difficultyUnlockOrder = ["1", "2", "3", "infinite"];
const UNLOCK_STORAGE_KEY = "starCloudMaxUnlockedStageIndex";
const RANKING_STORAGE_KEY = "starCloudInfiniteRankings";
let maxUnlockedStageIndex = loadMaxUnlockedStageIndex();

function loadMaxUnlockedStageIndex() {
  try {
    const savedValue = Number(localStorage.getItem(UNLOCK_STORAGE_KEY));

    if (Number.isInteger(savedValue) && savedValue >= 0 && savedValue < difficultyUnlockOrder.length) {
      return savedValue;
    }
  } catch (error) {
    console.warn("해금 진행도를 불러올 수 없습니다.", error);
  }

  return 0;
}

function saveMaxUnlockedStageIndex() {
  try {
    localStorage.setItem(UNLOCK_STORAGE_KEY, String(maxUnlockedStageIndex));
  } catch (error) {
    console.warn("해금 진행도를 저장할 수 없습니다.", error);
  }
}

function getDifficultyUnlockIndex(level) {
  return difficultyUnlockOrder.indexOf(String(level));
}

function isDifficultyUnlocked(level) {
  const unlockIndex = getDifficultyUnlockIndex(level);

  return unlockIndex >= 0 && unlockIndex <= maxUnlockedStageIndex;
}

function unlockNextDifficulty(clearedLevel) {
  const clearedIndex = getDifficultyUnlockIndex(clearedLevel);
  const nextIndex = clearedIndex + 1;

  if (clearedIndex < 0 || nextIndex >= difficultyUnlockOrder.length) {
    return null;
  }

  if (nextIndex > maxUnlockedStageIndex) {
    maxUnlockedStageIndex = nextIndex;
    saveMaxUnlockedStageIndex();
    updateDifficultyDisplay();

    return difficultySettings[difficultyUnlockOrder[nextIndex]];
  }

  return null;
}

function addUnlockMessage(message, unlockedDifficulty) {
  if (!unlockedDifficulty) {
    return message;
  }

  return `${message} ${unlockedDifficulty.label}가 해금되었습니다!`;
}

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

function loadRankings() {
  try {
    const savedRankings = JSON.parse(localStorage.getItem(RANKING_STORAGE_KEY) || "[]");

    if (!Array.isArray(savedRankings)) {
      return [];
    }

    return savedRankings
      .map(ranking => ({
        nickname: sanitizeRankingNickname(ranking.nickname || "이름없음"),
        score: Number(ranking.score) || 0,
        savedAt: Number(ranking.savedAt) || Date.now()
      }))
      .sort((a, b) => b.score - a.score || a.savedAt - b.savedAt)
      .slice(0, 10);
  } catch (error) {
    console.warn("랭킹을 불러올 수 없습니다.", error);
    return [];
  }
}

function saveRankings(rankings) {
  try {
    const topRankings = rankings
      .map(ranking => ({
        nickname: sanitizeRankingNickname(ranking.nickname || "이름없음"),
        score: Number(ranking.score) || 0,
        savedAt: Number(ranking.savedAt) || Date.now()
      }))
      .sort((a, b) => b.score - a.score || a.savedAt - b.savedAt)
      .slice(0, 10);

    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(topRankings));
  } catch (error) {
    console.warn("랭킹을 저장할 수 없습니다.", error);
  }
}

function sanitizeRankingNickname(nickname) {
  return String(nickname || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 10);
}

function escapeHtml(value) {
  const escapeTarget = document.createElement("div");
  escapeTarget.textContent = String(value);
  return escapeTarget.innerHTML;
}

function renderRankings() {
  if (!rankingList) return;

  const rankings = loadRankings();

  if (rankings.length === 0) {
    rankingList.innerHTML = '<div class="ranking-empty">아직 저장된 랭킹이 없습니다.<br />무한모드에서 최고 점수에 도전해보세요!</div>';
    return;
  }

  rankingList.innerHTML = rankings
    .map((ranking, index) => {
      const rank = index + 1;
      const nickname = escapeHtml(ranking.nickname || "이름없음");
      const scoreValue = Number(ranking.score) || 0;

      return `
        <div class="ranking-row">
          <span class="ranking-rank">#${rank}</span>
          <span class="ranking-nickname">${nickname}</span>
          <span class="ranking-score">${scoreValue}점</span>
        </div>
      `;
    })
    .join("");
}

function showRankingPopup() {
  if (!rankingPopup) return;

  renderRankings();
  rankingPopup.classList.remove("hidden");
  rankingPopup.setAttribute("aria-hidden", "false");
}

function hideRankingPopup() {
  if (!rankingPopup) return;

  rankingPopup.classList.add("hidden");
  rankingPopup.setAttribute("aria-hidden", "true");
}

function hideRankingSaveArea() {
  if (!rankingSaveArea) return;

  rankingSaveArea.classList.add("hidden");

  if (rankingNicknameInput) {
    rankingNicknameInput.value = "";
    rankingNicknameInput.disabled = false;
  }

  if (saveRankingBtn) {
    saveRankingBtn.disabled = false;
  }

  if (rankingSaveMessage) {
    rankingSaveMessage.textContent = "";
  }
}

function showRankingSaveArea() {
  if (!rankingSaveArea) return;

  rankingSaveArea.classList.remove("hidden");
  hasSavedCurrentRanking = false;

  if (rankingNicknameInput) {
    rankingNicknameInput.value = "";
    rankingNicknameInput.disabled = false;
    setTimeout(() => rankingNicknameInput.focus(), 80);
  }

  if (saveRankingBtn) {
    saveRankingBtn.disabled = false;
  }

  if (rankingSaveMessage) {
    rankingSaveMessage.textContent = "닉네임을 입력하면 무한모드 Top 10 랭킹에 저장됩니다.";
  }
}

function saveCurrentRanking() {
  if (!isInfiniteMode() || hasSavedCurrentRanking || !rankingNicknameInput) return;

  const nickname = sanitizeRankingNickname(rankingNicknameInput.value) || "이름없음";
  const rankings = loadRankings();

  rankings.push({
    nickname,
    score,
    savedAt: Date.now()
  });

  saveRankings(rankings);
  renderRankings();
  hasSavedCurrentRanking = true;

  rankingNicknameInput.value = nickname;
  rankingNicknameInput.disabled = true;

  if (saveRankingBtn) {
    saveRankingBtn.disabled = true;
  }

  if (rankingSaveMessage) {
    rankingSaveMessage.textContent = `${nickname}님의 ${score}점 기록이 저장되었습니다!`;
  }
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
      const nextDifficulty = difficultySettings[difficultyUnlockOrder[getDifficultyUnlockIndex(difficulty.key) + 1]];
      const unlockText = nextDifficulty ? ` 클리어하면 ${nextDifficulty.label} 해금!` : "";
      clearNote.textContent = `${difficulty.label}: ${difficulty.timeLimit}초 안에 ${difficulty.winScore}점 이상을 넘기면 CLEAR!${unlockText}`;
    }
  }

  difficultyButtons.forEach(button => {
    const levelKey = String(button.dataset.level);
    const buttonDifficulty = difficultySettings[levelKey];
    const isActive = levelKey === String(difficulty.key);
    const isUnlocked = isDifficultyUnlocked(levelKey);

    button.classList.toggle("active", isActive);
    button.classList.toggle("locked", !isUnlocked);
    button.disabled = !isUnlocked;
    button.setAttribute("aria-disabled", String(!isUnlocked));
    button.title = isUnlocked ? `${buttonDifficulty.label} 선택 가능` : "이전 단계를 먼저 클리어해야 합니다";
    button.textContent = isUnlocked ? buttonDifficulty.label : `${buttonDifficulty.label} 🔒`;
  });
}

function selectDifficulty(level) {
  const nextLevel = String(level);

  if (!difficultySettings[nextLevel] || !isDifficultyUnlocked(nextLevel)) return;

  currentDifficultyLevel = nextLevel;
  gameRunning = false;
  gamePaused = false;
  pauseStartTime = 0;

  clearGameTimers();
  stopBgm();
  resetGameState();
  resetPauseControl();

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

function getPlayerBottom() {
  const bottomValue = parseFloat(window.getComputedStyle(player).bottom);

  return Number.isFinite(bottomValue) ? bottomValue : defaultPlayerBottom;
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

/* =========================
   MP3 BGM / 효과음 설정
   ========================= */

const SOUND_PATHS = {
  bgm: "sounds/bgm.mp3",
  catch: "sounds/catch.mp3",
  meteor: "sounds/meteor-hit.mp3",
  burst: "sounds/burst.mp3",
  unlock: "sounds/silent.mp3"
};

const SOUND_VOLUMES = {
  bgm: 0.34,
  catch: 0.72,
  meteor: 0.76,
  burst: 0.68,
  unlock: 0
};

const SFX_POOL_SIZE = 4;

let bgmAudio = null;
let unlockAudio = null;
let sfxAudioPools = {};
let audioInitialized = false;
let audioUnlocked = false;
let pendingBgmStart = false;

document.addEventListener("pointerdown", handleAudioUserGesture, { passive: true, capture: true });
document.addEventListener("touchstart", handleAudioUserGesture, { passive: true, capture: true });
document.addEventListener("click", handleAudioUserGesture, { passive: true, capture: true });
document.addEventListener("keydown", handleAudioUserGesture, { capture: true });

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
window.addEventListener("resize", resizeGameHandler);
window.addEventListener("blur", releaseAllControls);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseAllControls();
    stopBgm(false);
    return;
  }

  if (soundEnabled && gameRunning && !gamePaused) {
    startBgm(false);
  }
});

startBtn.addEventListener("click", startGame);
if (pauseBtn) {
  pauseBtn.addEventListener("click", togglePause);
}
restartBtn.addEventListener("click", restartGame);
if (rankingBtn) {
  rankingBtn.addEventListener("click", showRankingPopup);
}
if (closeRankingBtn) {
  closeRankingBtn.addEventListener("click", hideRankingPopup);
}
if (saveRankingBtn) {
  saveRankingBtn.addEventListener("click", saveCurrentRanking);
}
if (rankingNicknameInput) {
  rankingNicknameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentRanking();
    }
  });
}
if (rankingPopup) {
  rankingPopup.addEventListener("click", event => {
    if (event.target === rankingPopup) {
      hideRankingPopup();
    }
  });
}
if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", toggleSound);
}
setupMobileControlButton(mobileLeftBtn, "left");
setupMobileControlButton(mobileRightBtn, "right");
difficultyButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectDifficulty(button.dataset.level);
  });
});

initializeAudio();
updateInputGuide();
updateSoundButton();
resetGameState();

function createManagedAudio(src, volume = 1, loop = false) {
  const audio = new Audio(src);

  audio.preload = "auto";
  audio.loop = loop;
  audio.volume = soundEnabled ? volume : 0;
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");

  return audio;
}

function createSfxPool(src, volume) {
  return Array.from({ length: SFX_POOL_SIZE }, () => createManagedAudio(src, volume, false));
}

function initializeAudio() {
  if (audioInitialized) return;

  bgmAudio = createManagedAudio(SOUND_PATHS.bgm, SOUND_VOLUMES.bgm, true);
  unlockAudio = createManagedAudio(SOUND_PATHS.unlock, SOUND_VOLUMES.unlock, false);

  sfxAudioPools = {
    catch: createSfxPool(SOUND_PATHS.catch, SOUND_VOLUMES.catch),
    meteor: createSfxPool(SOUND_PATHS.meteor, SOUND_VOLUMES.meteor),
    burst: createSfxPool(SOUND_PATHS.burst, SOUND_VOLUMES.burst)
  };

  audioInitialized = true;
  preloadSounds();
}

function preloadSounds() {
  if (!audioInitialized) return;

  const audioList = [
    bgmAudio,
    unlockAudio,
    ...Object.values(sfxAudioPools).flat()
  ].filter(Boolean);

  audioList.forEach(audio => {
    try {
      audio.load();
    } catch (error) {
      console.warn("사운드 파일을 미리 불러올 수 없습니다.", error);
    }
  });
}

function updateSoundButton() {
  if (!soundToggleBtn) return;

  soundToggleBtn.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
  soundToggleBtn.setAttribute("aria-pressed", String(soundEnabled));
  soundToggleBtn.classList.toggle("muted", !soundEnabled);
}

function updateAudioVolumes() {
  if (!audioInitialized) return;

  if (bgmAudio) {
    bgmAudio.volume = soundEnabled ? SOUND_VOLUMES.bgm : 0;
  }

  Object.entries(sfxAudioPools).forEach(([key, pool]) => {
    const nextVolume = soundEnabled ? SOUND_VOLUMES[key] : 0;

    pool.forEach(audio => {
      audio.volume = nextVolume;
    });
  });
}

function applySoundState() {
  updateSoundButton();
  initializeAudio();
  updateAudioVolumes();

  if (!soundEnabled) {
    stopBgm();
    return;
  }

  resumeAudio();

  if (gameRunning && !gamePaused) {
    startBgm(false);
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  applySoundState();
}

function handleAudioUserGesture() {
  resumeAudio();

  if (pendingBgmStart && soundEnabled && gameRunning && !gamePaused) {
    startBgm(false);
  }
}

function resumeAudio() {
  initializeAudio();
  updateAudioVolumes();

  if (!audioUnlocked && unlockAudio) {
    audioUnlocked = true;

    unlockAudio.currentTime = 0;

    const unlockPromise = unlockAudio.play();

    if (unlockPromise && typeof unlockPromise.catch === "function") {
      unlockPromise
        .then(() => {
          unlockAudio.pause();
          unlockAudio.currentTime = 0;
        })
        .catch(error => {
          audioUnlocked = false;
          console.warn("첫 입력에서 오디오를 활성화할 수 없습니다. 다음 입력에서 다시 시도합니다.", error);
        });
    }
  }

  return Promise.resolve();
}

function startBgm(restartTrack = true) {
  if (!soundEnabled) return;

  initializeAudio();
  updateAudioVolumes();

  if (!bgmAudio) return;

  if (restartTrack || bgmAudio.ended) {
    bgmAudio.currentTime = 0;
  }

  pendingBgmStart = false;

  const playPromise = bgmAudio.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(error => {
      pendingBgmStart = true;
      console.warn("BGM 재생이 브라우저에 의해 보류되었습니다. 화면을 한 번 더 터치하면 재생됩니다.", error);
    });
  }
}

function stopBgm(resetTrack = true) {
  pendingBgmStart = false;

  if (!bgmAudio) return;

  bgmAudio.pause();

  if (resetTrack) {
    bgmAudio.currentTime = 0;
  }
}

function getAvailableSfxAudio(type) {
  initializeAudio();

  const pool = sfxAudioPools[type];

  if (!pool || pool.length === 0) return null;

  return pool.find(audio => audio.paused || audio.ended) || pool[0];
}

function playSfx(type) {
  if (!soundEnabled) return;

  const audio = getAvailableSfxAudio(type);

  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = SOUND_VOLUMES[type] ?? 1;

  const playPromise = audio.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(error => {
      console.warn(`${type} 효과음을 재생할 수 없습니다.`, error);
    });
  }
}

function playCatchSound() {
  playSfx("catch");
}

function playMeteorCatchSound() {
  playSfx("meteor");
}

function playBurstSound() {
  playSfx("burst");
}

/* =========================
   픽셀아트 생성
   ========================= */

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

function setMoveDirection(direction, isPressed) {
  if (direction === "left") {
    leftPressed = isPressed;

    if (isPressed) {
      rightPressed = false;
      mobileRightBtn?.classList.remove("pressed");
    }
  }

  if (direction === "right") {
    rightPressed = isPressed;

    if (isPressed) {
      leftPressed = false;
      mobileLeftBtn?.classList.remove("pressed");
    }
  }
}

function releaseAllControls() {
  leftPressed = false;
  rightPressed = false;

  mobileLeftBtn?.classList.remove("pressed");
  mobileRightBtn?.classList.remove("pressed");
}

function setupMobileControlButton(button, direction) {
  if (!button) return;

  const pressButton = event => {
    event.preventDefault();
    button.classList.add("pressed");
    setMoveDirection(direction, true);

    if (event.pointerId !== undefined && button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  };

  const releaseButton = event => {
    event.preventDefault();
    button.classList.remove("pressed");
    setMoveDirection(direction, false);

    if (event.pointerId !== undefined && button.releasePointerCapture && button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
  };

  button.addEventListener("pointerdown", pressButton);
  button.addEventListener("pointerup", releaseButton);
  button.addEventListener("pointercancel", releaseButton);
  button.addEventListener("pointerleave", releaseButton);
  button.addEventListener("contextmenu", event => event.preventDefault());
}

function updateInputGuide() {
  if (!guideText) return;

  const shouldShowMobileGuide = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 760px)").matches;

  guideText.textContent = shouldShowMobileGuide
    ? "화면의 ◀ ▶ 버튼을 누르면 구름이 이동합니다"
    : "← → 방향키 또는 화면의 ◀ ▶ 버튼으로 구름이 이동합니다";
}

function keyDownHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setMoveDirection("left", true);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    setMoveDirection("right", true);
  }
}

function keyUpHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setMoveDirection("left", false);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    setMoveDirection("right", false);
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

  const itemImage = document.createElement("img");
  itemImage.classList.add("item-image");
  itemImage.src = itemType.imageSrc;
  itemImage.alt = "";
  itemImage.draggable = false;

  item.appendChild(light);
  item.appendChild(itemImage);

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
    const playerY = getGameHeight() - getPlayerBottom() - playerHeight;
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
  updateInputGuide();
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
  hasSavedCurrentRanking = false;
  timeLeft = isInfiniteMode() ? 0 : getGameTimeLimit();
  gameStartTime = 0;
  gamePaused = false;
  pauseStartTime = 0;
  playerX = getCenteredPlayerX();

  releaseAllControls();

  scoreText.textContent = score;
  updateTimerDisplay();
  updateGoalDisplay();
  updateLife();
  hideResultPopup();
  hidePausePopup();
  hideRankingSaveArea();
  hideRankingPopup();

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

  if (!isClear && isInfiniteMode()) {
    showRankingSaveArea();
  } else {
    hideRankingSaveArea();
  }
}

function hideResultPopup() {
  if (!resultPopup) return;

  resultPopup.classList.add("hidden");
  resultPopup.classList.remove("result-clear", "result-game-over");
  resultPopup.setAttribute("aria-hidden", "true");
  hideRankingSaveArea();
}

function showPausePopup() {
  if (!pausePopup) return;

  pausePopup.classList.remove("hidden");
  pausePopup.setAttribute("aria-hidden", "false");
}

function hidePausePopup() {
  if (!pausePopup) return;

  pausePopup.classList.add("hidden");
  pausePopup.setAttribute("aria-hidden", "true");
}

function resetPauseControl() {
  gamePaused = false;
  pauseStartTime = 0;
  hidePausePopup();

  if (!pauseBtn) return;

  pauseBtn.textContent = "PAUSE";
  pauseBtn.classList.remove("paused");
  pauseBtn.style.display = "none";
}

function pauseGame() {
  if (!gameRunning || gamePaused) return;

  gameRunning = false;
  gamePaused = true;
  pauseStartTime = Date.now();

  clearGameTimers();
  stopBgm();

  releaseAllControls();

  if (pauseBtn) {
    pauseBtn.textContent = "RESUME";
    pauseBtn.classList.add("paused");
    pauseBtn.style.display = "inline-block";
  }

  showPausePopup();
}

function resumeGame() {
  if (!gamePaused) return;

  const pausedDuration = pauseStartTime ? Date.now() - pauseStartTime : 0;

  gameRunning = true;
  gamePaused = false;
  pauseStartTime = 0;
  gameStartTime += pausedDuration;

  releaseAllControls();

  hidePausePopup();

  if (pauseBtn) {
    pauseBtn.textContent = "PAUSE";
    pauseBtn.classList.remove("paused");
    pauseBtn.style.display = "inline-block";
  }

  clearGameTimers();
  updateTimerDisplay();
  updateGoalDisplay();
  scheduleNextItemWave();
  gameLoopTimer = setInterval(gameLoop, 20);

  if (soundEnabled) {
    resumeAudio()
      .then(() => {
        startBgm();
      })
      .catch(error => {
        console.warn("오디오를 다시 시작할 수 없습니다.", error);
      });
  }
}

function togglePause() {
  if (gamePaused) {
    resumeGame();
    return;
  }

  pauseGame();
}

function endGame(resultType, message, delay = 100) {
  const clearedLevel = String(currentDifficultyLevel);

  if (resultType === "clear" && !isInfiniteMode()) {
    const unlockedDifficulty = unlockNextDifficulty(clearedLevel);
    message = addUnlockMessage(message, unlockedDifficulty);
  }

  gameRunning = false;
  gamePaused = false;
  pauseStartTime = 0;

  clearGameTimers();
  stopBgm();
  resetPauseControl();

  releaseAllControls();

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
  if (gameRunning || !isDifficultyUnlocked(currentDifficultyLevel)) return;

  gameRunning = true;
  gamePaused = false;
  pauseStartTime = 0;
  timeLeft = isInfiniteMode() ? 0 : getGameTimeLimit();
  gameStartTime = Date.now();
  updateTimerDisplay();
  updateGoalDisplay();

  startBtn.style.display = "none";
  if (pauseBtn) {
    pauseBtn.textContent = "PAUSE";
    pauseBtn.classList.remove("paused");
    pauseBtn.style.display = "inline-block";
  }
  restartBtn.style.display = "none";
  hideResultPopup();
  hidePausePopup();
  hideRankingPopup();

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
  resetPauseControl();
  startGame();
}
