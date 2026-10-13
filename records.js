'use strict';

// Tabla de récords local (Top 5) guardada en localStorage.
// Se carga antes que game.js; game.js llama a Records.onGameOver() y
// el botón "Jugar" de la pantalla de inicio llama a init() (definida en game.js).
const Records = (() => {
  const KEY = 'tetris-records';
  const BEST_KEY = 'tetris-records-best';
  const MAX_ENTRIES = 5;
  const NAME_MAX = 12;

  const startScreen = document.getElementById('start-screen');
  const playBtn = document.getElementById('play-btn');
  const startPanel = document.getElementById('start-records');
  const zone = document.getElementById('records-zone');
  const newRecordMsg = document.getElementById('new-record-msg');
  const nameInput = document.getElementById('name-input');
  const overPanel = document.getElementById('over-records');
  const restartButton = document.getElementById('restart-btn');

  let pending = null;   // { score, lines, maxCombo } a la espera de nombre
  let highlight = null; // fecha (string) de la fila recién guardada

  function toInt(v) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function cleanName(s) {
    // eslint-disable-next-line no-control-regex
    return String(s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX);
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* sin almacenamiento: el juego sigue funcionando */ }
  }

  function load() {
    const data = readJSON(KEY);
    if (!Array.isArray(data)) return [];
    return data
      .filter(e => e && typeof e === 'object')
      .map(e => ({
        name: cleanName(e.name ?? '') || 'Anónimo',
        score: toInt(e.score),
        lines: toInt(e.lines),
        maxCombo: toInt(e.maxCombo),
        date: typeof e.date === 'string' ? e.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  }

  function loadBest() {
    const b = readJSON(BEST_KEY);
    const best = { maxCombo: b ? toInt(b.maxCombo) : 0, lines: b ? toInt(b.lines) : 0 };
    // Los récords del top también cuentan como histórico.
    for (const e of load()) {
      best.maxCombo = Math.max(best.maxCombo, e.maxCombo);
      best.lines = Math.max(best.lines, e.lines);
    }
    return best;
  }

  // Posición (0-based) que ocuparía una puntuación; -1 si no entra en el top.
  function rankFor(score, list) {
    if (score <= 0) return -1;
    let idx = list.findIndex(e => score > e.score);
    if (idx === -1) idx = list.length;
    return idx < MAX_ENTRIES ? idx : -1;
  }

  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }

  function renderTable() {
    const list = load();
    const rows = list.map(e => ({ ...e, hl: highlight !== null && e.date === highlight }));
    if (pending) {
      const idx = rankFor(pending.score, list);
      if (idx !== -1) {
        rows.splice(idx, 0, {
          name: nameInput.value.trim() || '(tu nombre)',
          score: pending.score,
          lines: pending.lines,
          maxCombo: pending.maxCombo,
          date: '',
          hl: true,
        });
        rows.length = Math.min(rows.length, MAX_ENTRIES);
      }
    }

    const table = el('table', undefined, 'records-table');
    const head = el('tr');
    ['#', 'Nombre', 'Puntos', 'Líneas', 'Combo'].forEach(h => head.appendChild(el('th', h)));
    table.appendChild(head);

    if (rows.length === 0) {
      const tr = el('tr');
      const td = el('td', 'Aún no hay récords', 'records-empty');
      td.colSpan = 5;
      tr.appendChild(td);
      table.appendChild(tr);
    }
    rows.forEach((r, i) => {
      const tr = el('tr', undefined, r.hl ? 'highlight' : '');
      if (r.date) {
        const d = new Date(r.date);
        if (!isNaN(d)) tr.title = d.toLocaleString('es');
      }
      tr.appendChild(el('td', String(i + 1)));
      tr.appendChild(el('td', r.name, 'rec-name'));
      tr.appendChild(el('td', r.score.toLocaleString()));
      tr.appendChild(el('td', String(r.lines)));
      tr.appendChild(el('td', String(r.maxCombo)));
      table.appendChild(tr);
    });
    return table;
  }

  function renderPanel(container) {
    container.replaceChildren();
    container.appendChild(el('p', 'MEJORES PUNTUACIONES', 'records-title'));
    container.appendChild(renderTable());

    const best = loadBest();
    const stats = el('p', undefined, 'records-best');
    stats.appendChild(el('span', `Mejor combo: ${best.maxCombo}`));
    stats.appendChild(el('span', `Líneas máx.: ${best.lines}`));
    container.appendChild(stats);

    const reset = el('div', undefined, 'records-reset');
    const resetBtn = el('button', 'Resetear récords', 'small-btn');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      reset.replaceChildren();
      reset.appendChild(el('span', '¿Borrar todos los récords?', 'confirm-text'));
      const yes = el('button', 'Sí, borrar', 'small-btn danger');
      const no = el('button', 'Cancelar', 'small-btn');
      yes.type = no.type = 'button';
      yes.addEventListener('click', () => {
        try {
          localStorage.removeItem(KEY);
          localStorage.removeItem(BEST_KEY);
        } catch (e) { /* ignorado */ }
        highlight = null;
        renderAll();
      });
      no.addEventListener('click', () => renderPanel(container));
      reset.append(yes, no);
    });
    reset.appendChild(resetBtn);
    container.appendChild(reset);
  }

  function renderAll() {
    renderPanel(startPanel);
    renderPanel(overPanel);
  }

  function commitPending() {
    if (!pending) return;
    const entry = {
      name: cleanName(nameInput.value) || 'Anónimo',
      score: pending.score,
      lines: pending.lines,
      maxCombo: pending.maxCombo,
      date: new Date().toISOString(),
    };
    pending = null;
    const list = load();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    writeJSON(KEY, list.slice(0, MAX_ENTRIES));
    highlight = entry.date;
    nameInput.classList.add('hidden');
    newRecordMsg.textContent = '¡Récord guardado!';
    renderAll();
  }

  function onGameOver(score, lines, maxCombo) {
    // Histórico de mejor combo / líneas máximas (aunque no entre en el top).
    const best = loadBest();
    writeJSON(BEST_KEY, {
      maxCombo: Math.max(best.maxCombo, maxCombo),
      lines: Math.max(best.lines, lines),
    });

    highlight = null;
    pending = rankFor(score, load()) !== -1 ? { score, lines, maxCombo } : null;
    zone.classList.remove('hidden');
    newRecordMsg.classList.toggle('hidden', !pending);
    nameInput.classList.toggle('hidden', !pending);
    if (pending) {
      newRecordMsg.textContent = '¡Nuevo récord!';
      nameInput.value = '';
    }
    renderAll();
    if (pending) nameInput.focus();
  }

  function hideZone() {
    pending = null;
    highlight = null;
    zone.classList.add('hidden');
  }

  nameInput.addEventListener('input', () => {
    const t = overPanel.querySelector('.records-table');
    if (pending && t) t.replaceWith(renderTable()); // sin tocar el resto del panel
  });
  nameInput.addEventListener('keydown', e => {
    e.stopPropagation(); // el juego no debe interceptar teclas al escribir
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPending();
    }
  });

  // Si se reinicia sin pulsar Enter, se guarda con el nombre escrito (o "Anónimo").
  restartButton.addEventListener('click', () => {
    restartButton.blur(); // que Espacio (caída) no vuelva a activar el botón
    commitPending();
  });
  // Si se cierra o recarga la página con un récord pendiente, se guarda igualmente.
  window.addEventListener('pagehide', commitPending);

  playBtn.addEventListener('click', () => {
    playBtn.blur();
    startScreen.classList.add('hidden');
    init();
  });

  renderAll();

  return { onGameOver, hideZone };
})();
