const app = document.querySelector('#app');

const sections = {
  home: {
    title: 'Picnic QR',
    items: [
      { label: 'Useful Locations', target: 'useful' },
      { label: 'Ambient Docks', target: 'ambient' },
      { label: 'Chill Docks', target: 'chill' },
    ],
  },
  useful: {
    title: 'Useful Locations',
    items: [
      { label: 'UNKNOWN', value: 'UNKNOWN' },
      { label: 'CONSOLIDATION', value: 'CONSOLIDATION' },
    ],
  },
};

function topNav() {
  return `<nav class="top-nav" aria-label="Page navigation">
    <button class="utility-button" type="button" data-nav="back"><span aria-hidden="true">←</span> Back</button>
    <button class="brand-button" type="button" data-nav="home" aria-label="Go to Picnic QR home"><img src="assets/picnic-icon-512.png" alt="" /></button>
  </nav>`;
}

let activeBack = null;
app.innerHTML = `${topNav()}<div class="screen-content"></div>`;
const persistentNav = app.querySelector('.top-nav');
const screen = app.querySelector('.screen-content');
persistentNav.querySelector('[data-nav="back"]').addEventListener('click', () => activeBack?.());
persistentNav.querySelector('[data-nav="home"]').addEventListener('click', () => menu('home'));

function bindTopNav(onBack) {
  activeBack = onBack;
  persistentNav.hidden = !onBack;
}

function fitTitle(title = screen.querySelector('h1')) {
  if (!title) return;
  title.style.fontSize = '';
  let size = parseFloat(getComputedStyle(title).fontSize);
  while (title.scrollWidth > title.clientWidth && size > 18) {
    size -= 1;
    title.style.fontSize = `${size}px`;
  }
}

function fitCurrentTitle() {
  requestAnimationFrame(() => fitTitle());
}

function menu(name) {
  const section = sections[name];
  bindTopNav(name === 'home' ? null : () => menu('home'));
  screen.innerHTML = `
    <section class="menu">
      ${name === 'home'
    ? `<div class="home-brand"><img src="assets/picnic-qr-logo.png" alt="Picnic QR logo" /><h1>${section.title}</h1></div>`
    : `<h1>${section.title}</h1>`}
      <div class="button-list">
        ${section.items.map(item => `<button class="nav-button ${item.disabled ? 'coming-soon' : ''}" type="button" ${item.disabled ? 'disabled' : ''} data-target="${item.target || ''}" data-value="${item.value || ''}">${item.label}</button>`).join('')}
      </div>
    </section>`;
  screen.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.target === 'chill' || button.dataset.target === 'ambient') dockTypeMenu(button.dataset.target);
    else if (button.dataset.target) menu(button.dataset.target);
  }));
  screen.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.value) showQr(button.dataset.value);
  }));
  fitCurrentTitle();
}

function showQr(value) {
  bindTopNav(() => menu('useful'));
  screen.innerHTML = `
    <section class="qr-screen">
      <div class="qr-content">
        <canvas class="qr-code" role="img" aria-label="QR code containing ${value}"></canvas>
        <p class="qr-value">${value}</p>
      </div>
    </section>`;
  drawQr(screen.querySelector('.qr-code'), value);
}

function dockTypeMenu(kind) {
  const title = kind === 'chill' ? 'Chill Docks' : 'Ambient Docks';
  bindTopNav(() => menu('home'));
  screen.innerHTML = `
    <section class="menu">
      <h1>${title}</h1>
      <div class="button-list">
        <button class="nav-button" type="button" data-prefix="D">Real (<span class="button-detail">D-</span>)</button>
        <button class="nav-button" type="button" data-prefix="V">Virtual (<span class="button-detail">V-</span>)</button>
      </div>
    </section>`;
  screen.querySelectorAll('[data-prefix]').forEach(button => button.addEventListener('click', () => dockMenu(kind, button.dataset.prefix)));
  fitCurrentTitle();
}

function dockMenu(kind, prefix) {
  const title = kind === 'chill' ? 'Chill Docks' : 'Ambient Docks';
  const docks = Array.from({ length: 10 }, (_, index) => index + 11);
  bindTopNav(() => dockTypeMenu(kind));
  screen.innerHTML = `
    <section class="menu">
      <h1>${prefix === 'D' ? 'Real' : 'Virtual'} ${title}</h1>
      <div class="dock-grid">
        ${docks.map(dock => `<button class="dock-button" type="button" data-dock="${dock}">${prefix}-${dock}</button>`).join('')}
      </div>
    </section>`;
  screen.querySelectorAll('[data-dock]').forEach(button => button.addEventListener('click', () => showDockQr(kind, prefix, Number(button.dataset.dock), 0)));
  fitCurrentTitle();
}

function showDockQr(kind, prefix, dock, locationIndex) {
  bindTopNav(() => dockMenu(kind, prefix));
  screen.innerHTML = `
    <section class="qr-screen">
      <div class="qr-content dock-qr-content"></div>
    </section>`;
  renderDockQrContent(kind, prefix, dock, locationIndex);
}

function renderDockQrContent(kind, prefix, dock, locationIndex) {
  const locations = Array.from({ length: 12 }, (_, index) => String((kind === 'ambient' ? 2 : 1) + index * 2).padStart(2, '0'));
  const location = locations[locationIndex];
  const previousLocation = locations[(locationIndex - 1 + locations.length) % locations.length];
  const nextLocation = locations[(locationIndex + 1) % locations.length];
  const value = `${prefix}-${dock}-${location}`;
  const content = screen.querySelector('.dock-qr-content');
  content.innerHTML = `
    <canvas class="qr-code" role="img" aria-label="QR code containing ${value}"></canvas>
    <p class="qr-value">${value}</p>
    <div class="qr-controls" aria-label="Location controls">
      <button class="direction-button" type="button" data-direction="previous" aria-label="Previous location: ${previousLocation}">← ${previousLocation}</button>
      <button class="direction-button" type="button" data-direction="next" aria-label="Next location: ${nextLocation}">${nextLocation} →</button>
    </div>`;
  drawQr(content.querySelector('.qr-code'), value);
  content.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => {
    const nextIndex = button.dataset.direction === 'next'
      ? (locationIndex + 1) % locations.length
      : (locationIndex - 1 + locations.length) % locations.length;
    renderDockQrContent(kind, prefix, dock, nextIndex);
  }));
}

// A compact QR encoder for the short, fixed labels in this app.
// It creates version 1 / medium-error-correction QR codes directly on a canvas.
const QR_SIZE = 21;
const qrExp = new Array(512).fill(0);
const qrLog = new Array(256).fill(0);
for (let i = 0, number = 1; i < 255; i += 1) {
  qrExp[i] = number;
  qrLog[number] = i;
  number = (number << 1) ^ (number & 0x80 ? 0x11d : 0);
}
for (let i = 255; i < 512; i += 1) qrExp[i] = qrExp[i - 255];

function qrMultiply(left, right) {
  return !left || !right ? 0 : qrExp[qrLog[left] + qrLog[right]];
}

function qrData(text) {
  const bytes = new TextEncoder().encode(text);
  const bits = [...'0100', ...bytes.length.toString(2).padStart(8, '0')].map(Number);
  bytes.forEach(byte => bits.push(...byte.toString(2).padStart(8, '0').split('').map(Number)));
  bits.push(...new Array(Math.min(4, 128 - bits.length)).fill(0));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const padding = [0xec, 0x11];
  while (data.length < 16) data.push(padding[(data.length - bytes.length) % 2]);

  let polynomial = [1];
  for (let i = 0; i < 10; i += 1) {
    const next = new Array(polynomial.length + 1).fill(0);
    polynomial.forEach((item, index) => {
      next[index] ^= item;
      next[index + 1] ^= qrMultiply(item, qrExp[i]);
    });
    polynomial = next;
  }
  const remainder = new Array(10).fill(0);
  data.forEach(byte => {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    for (let i = 0; i < 10; i += 1) remainder[i] ^= qrMultiply(polynomial[i + 1], factor);
  });
  return [...data, ...remainder];
}

function qrMatrix(text, mask) {
  const modules = Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(null));
  const set = (row, column, value) => { if (row >= 0 && row < QR_SIZE && column >= 0 && column < QR_SIZE) modules[row][column] = value; };
  const finder = (row, column) => {
    for (let y = -1; y <= 7; y += 1) for (let x = -1; x <= 7; x += 1) {
      set(row + y, column + x, y >= 0 && y <= 6 && x >= 0 && x <= 6 && (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4)));
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);
  for (let i = 8; i < 13; i += 1) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

  const formatPosition = index => [
    index < 6 ? index : index < 8 ? index + 1 : QR_SIZE - 15 + index,
    8,
  ];
  const formatSidePosition = index => [8, index < 8 ? QR_SIZE - index - 1 : index < 9 ? 15 - index : 14 - index];
  for (let i = 0; i < 15; i += 1) { set(...formatPosition(i), false); set(...formatSidePosition(i), false); }
  set(QR_SIZE - 8, 8, false);

  const stream = qrData(text).flatMap(byte => byte.toString(2).padStart(8, '0').split('').map(bit => bit === '1'));
  const masks = [
    (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r * c) % 3 + (r + c) % 2) % 2 === 0,
  ];
  let bitIndex = 0;
  for (let columnStart = 20, upward = true; columnStart > 0; columnStart -= 2, upward = !upward) {
    if (columnStart === 6) columnStart -= 1;
    for (let step = 0; step < QR_SIZE; step += 1) {
      const row = upward ? QR_SIZE - 1 - step : step;
      for (const column of [columnStart, columnStart - 1]) {
        if (modules[row][column] === null) modules[row][column] = stream[bitIndex++] !== masks[mask](row, column);
      }
    }
  }
  let format = mask << 10;
  let remainder = format;
  while (remainder.toString(2).length >= 11) remainder ^= 0x537 << (remainder.toString(2).length - 11);
  format = (format | remainder) ^ 0x5412;
  for (let i = 0; i < 15; i += 1) {
    const bit = Boolean((format >> i) & 1);
    set(...formatPosition(i), bit); set(...formatSidePosition(i), bit);
  }
  set(QR_SIZE - 8, 8, true);
  return modules;
}

function qrPenalty(modules) {
  let score = 0;
  for (const lines of [modules, modules[0].map((_, column) => modules.map(row => row[column]))]) {
    lines.forEach(line => {
      let run = 1;
      for (let i = 1; i < QR_SIZE; i += 1) {
        if (line[i] === line[i - 1]) run += 1;
        else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    });
  }
  for (let row = 0; row < QR_SIZE - 1; row += 1) for (let column = 0; column < QR_SIZE - 1; column += 1) {
    if (modules[row][column] === modules[row + 1][column] && modules[row][column] === modules[row][column + 1] && modules[row][column] === modules[row + 1][column + 1]) score += 3;
  }
  return score;
}

function drawQr(canvas, text) {
  const modules = Array.from({ length: 8 }, (_, mask) => qrMatrix(text, mask)).sort((a, b) => qrPenalty(a) - qrPenalty(b))[0];
  const scale = 20, quiet = 4, size = (QR_SIZE + quiet * 2) * scale;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  modules.forEach((row, y) => row.forEach((isDark, x) => { if (isDark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale); }));
}

menu('home');
window.addEventListener('resize', () => fitTitle());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './', updateViaCache: 'none' });
      registration.update();
    } catch (error) {
      console.warn('Offline support could not be enabled.', error);
    }
  });
}
