'use strict';

// Menú de pausa: se carga ANTES de game.js. game.js usa estos ganchos:
// startLevel, openPauseMenu(), closePauseMenu(), isInputBlocked().

const START_LEVEL_KEY = 'tetris-start-level';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;
const RESUME_INPUT_LOCK_MS = 150;

const pauseMenu = document.getElementById('pause-menu');
const pmResumeBtn = document.getElementById('pm-resume');
const pmRestartBtn = document.getElementById('pm-restart');
const pmControlsBtn = document.getElementById('pm-controls-toggle');
const pmControlsPanel = document.getElementById('pm-controls');
const pmLevelRow = document.getElementById('pm-level-row');
const pmLevelDown = document.getElementById('pm-level-down');
const pmLevelUp = document.getElementById('pm-level-up');
const pmLevelValue = document.getElementById('pm-level-value');

let startLevel = loadStartLevel();
let inputLockedUntil = 0;

function clampStartLevel(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return MIN_START_LEVEL;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, n));
}

function loadStartLevel() {
  try {
    const raw = localStorage.getItem(START_LEVEL_KEY);
    if (raw !== null) return clampStartLevel(raw);
  } catch (err) { /* localStorage no disponible */ }
  return MIN_START_LEVEL;
}

function setStartLevel(n) {
  startLevel = clampStartLevel(n);
  pmLevelValue.textContent = startLevel;
  try {
    localStorage.setItem(START_LEVEL_KEY, String(startLevel));
  } catch (err) { /* ignorar */ }
}

function isPauseMenuOpen() {
  return !pauseMenu.classList.contains('hidden');
}

function isInputBlocked() {
  return isPauseMenuOpen() || performance.now() < inputLockedUntil;
}

function pauseMenuItems() {
  return [pmResumeBtn, pmRestartBtn, pmControlsBtn, pmLevelDown, pmLevelUp];
}

function openPauseMenu() {
  pmControlsPanel.classList.add('hidden');
  pmControlsBtn.setAttribute('aria-expanded', 'false');
  pmLevelValue.textContent = startLevel;
  pauseMenu.classList.remove('hidden');
  pmResumeBtn.focus();
}

// Cierra el menú (reanudar o reiniciar): bloquea inputs un instante y quita el foco.
function closePauseMenu(lockInput) {
  const wasOpen = isPauseMenuOpen();
  pauseMenu.classList.add('hidden');
  if (lockInput) inputLockedUntil = performance.now() + RESUME_INPUT_LOCK_MS;
  if (!wasOpen) return;
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
}

pmResumeBtn.addEventListener('click', () => { if (paused) togglePause(); });
pmRestartBtn.addEventListener('click', () => { init(); });
pmControlsBtn.addEventListener('click', () => {
  const hidden = pmControlsPanel.classList.toggle('hidden');
  pmControlsBtn.setAttribute('aria-expanded', String(!hidden));
});
pmLevelDown.addEventListener('click', () => setStartLevel(startLevel - 1));
pmLevelUp.addEventListener('click', () => setStartLevel(startLevel + 1));

// Navegación propia del menú (las demás teclas las ignora el juego).
document.addEventListener('keydown', e => {
  if (!isPauseMenuOpen()) return;
  const items = pauseMenuItems();
  const idx = items.indexOf(document.activeElement);
  const inLevelRow = pmLevelRow.contains(document.activeElement);
  switch (e.code) {
    case 'ArrowDown':
    case 'ArrowUp': {
      e.preventDefault();
      // Las dos flechas del selector cuentan como una sola parada vertical.
      const stops = [pmResumeBtn, pmRestartBtn, pmControlsBtn, pmLevelDown];
      const cur = inLevelRow ? stops.length - 1 : stops.indexOf(document.activeElement);
      const step = e.code === 'ArrowDown' ? 1 : -1;
      const nxt = cur < 0 ? (step > 0 ? 0 : stops.length - 1) : (cur + step + stops.length) % stops.length;
      stops[nxt].focus();
      break;
    }
    case 'ArrowLeft':
    case 'ArrowRight':
      if (inLevelRow) {
        e.preventDefault();
        setStartLevel(startLevel + (e.code === 'ArrowRight' ? 1 : -1));
      }
      break;
    case 'Space':
      // Evita scroll; Enter/Espacio sobre un botón enfocado lo activa de forma nativa.
      if (idx < 0) e.preventDefault();
      break;
  }
});
