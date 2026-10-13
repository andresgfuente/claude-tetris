'use strict';

// Skins / temas visuales. Cada skin define:
//   colors[]   paleta indexada por tipo de pieza (índice 0 sin uso)
//   background color de fondo del tablero y de la vista previa
//   gridColor  color de las líneas de la cuadrícula
//   drawBlock(ctx, px, py, size, color, alpha)  dibuja un bloque en píxeles
const SKIN_STORAGE_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

// Traza un rectángulo redondeado (roundRect si existe; si no, arcos manuales).
function skinRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    background: '#1a1a25',
    gridColor: '#22222e',
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px + 1, py + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    },
  },

  neon: {
    name: 'Neon',
    colors: [null, '#00fff2', '#fff200', '#d400ff', '#39ff14', '#ff1744', '#4d6bff', '#ff9100'],
    background: '#000000',
    gridColor: '#101018',
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, size - 6, size - 6);
      ctx.restore(); // restaura shadowBlur/shadowColor/globalAlpha
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1b0', '#e0bbf0', '#c1ecc4', '#f9b8b8', '#b9c2f2', '#ffd9a8'],
    background: '#fdf6f0',
    gridColor: '#eee4dc',
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      skinRoundRectPath(ctx, px + 2, py + 2, size - 4, size - 4, 8);
      ctx.fill();
      ctx.strokeStyle = alpha < 1 ? '#b09a9a' : 'rgba(255,255,255,0.8)'; // la ghost necesita contraste
      ctx.lineWidth = 2;
      skinRoundRectPath(ctx, px + 4, py + 4, size - 8, size - 8, 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [null, '#29b6f6', '#fdd835', '#ab47bc', '#66bb6a', '#ef5350', '#5c6bc0', '#ffa726'],
    background: '#14141c',
    gridColor: '#1f1f2b',
    drawBlock(ctx, px, py, size, color, alpha) {
      const s = size - 2;
      const x = px + 1;
      const y = py + 1;
      const t = 4; // tamaño del "píxel" de la textura
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, s, s);
      // patrón de damero 4 px (claro/oscuro) sobre el interior
      for (let i = t; i < s - t; i += t) {
        for (let j = t; j < s - t; j += t) {
          if (((i / t) + (j / t)) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
          }
          ctx.fillRect(x + i, y + j, t, t);
        }
      }
      // bordes claros (arriba/izquierda) y oscuros (abajo/derecha)
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x, y, s, t);
      ctx.fillRect(x, y, t, s);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y + s - t, s, t);
      ctx.fillRect(x + s - t, y, t, s);
      ctx.globalAlpha = 1;
    },
  },
};

let activeSkinKey = DEFAULT_SKIN;

function getSkin() {
  return SKINS[activeSkinKey] || SKINS[DEFAULT_SKIN];
}

function loadSavedSkin() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE_KEY);
    if (saved && Object.prototype.hasOwnProperty.call(SKINS, saved)) return saved;
  } catch (e) { /* localStorage no disponible */ }
  return DEFAULT_SKIN;
}

function saveSkin(key) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, key);
  } catch (e) { /* localStorage no disponible */ }
}

// Aplica la skin al instante y redibuja si el juego ya tiene estado.
function applySkin(key, persist) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, key)) key = DEFAULT_SKIN;
  activeSkinKey = key;
  if (persist) saveSkin(key);
  const select = document.getElementById('skin-select');
  if (select && select.value !== key) select.value = key;
  document.body.dataset.skin = key;
  // el juego puede estar en pausa (sin bucle) o aún sin inicializar
  try {
    if (typeof draw === 'function' && board && current && next) {
      draw();
      drawNext();
    }
  } catch (e) { /* el juego aún no está listo */ }
}

(function initSkins() {
  const select = document.getElementById('skin-select');
  if (select) {
    select.innerHTML = '';
    Object.keys(SKINS).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = SKINS[key].name;
      select.appendChild(opt);
    });
    // si conserva el foco sin cambiar, las flechas/espacio no deben manejarlo el select
    select.addEventListener('keydown', e => {
      if (e.code.startsWith('Arrow') || e.code === 'Space') {
        e.preventDefault();
        select.blur();
      }
    });
    select.addEventListener('change', () => {
      applySkin(select.value, true);
      select.blur(); // evita que las flechas cambien el selector
    });
  }
  applySkin(loadSavedSkin(), false);
})();
