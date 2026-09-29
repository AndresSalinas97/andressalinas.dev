/**
 * @file Initializes Picnic QR and owns shared navigation, home and useful-location screens.
 * @author Codex
 */

const app = document.querySelector('#app');

const sections = {
  home: {
    title: 'Picnic QR',
    items: [
      { label: 'Useful Locations', target: 'useful' },
      { label: 'Ambient Docks', target: 'ambient' },
      { label: 'Chill Docks', target: 'chill' },
      { label: 'Tote Compartments', target: 'totes' },
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

/**
 * Build the persistent Back and Home navigation markup.
 * @returns {string}
 */
function topNav() {
  return `<nav class="top-nav" aria-label="Page navigation">
    <button class="utility-button" type="button" data-nav="back"><svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 10H8.2l5.6-5.6L11 1.6 1.1 11.5a.7.7 0 0 0 0 1L11 22.4l2.8-2.8L8.2 14h12.3v-4Z"/></svg> Back</button>
    <button class="utility-button home-button" type="button" data-nav="home">Home <svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 10.7 12 2.9l9.2 7.8v9.8c0 .9-.7 1.6-1.6 1.6h-5.1v-7.2h-5v7.2H4.4c-.9 0-1.6-.7-1.6-1.6v-9.8Z"/></svg></button>
  </nav>`;
}

let activeBack = null;
app.innerHTML = `${topNav()}<div class="screen-content"></div>`;
const persistentNav = app.querySelector('.top-nav');
const screen = app.querySelector('.screen-content');
persistentNav.querySelector('[data-nav="back"]').addEventListener('click', () => activeBack?.());
persistentNav.querySelector('[data-nav="home"]').addEventListener('click', () => menu('home'));

let swipeStart = null;
app.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  swipeStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
app.addEventListener('touchend', event => {
  if (!swipeStart || !activeBack) return;
  const touch = event.changedTouches[0];
  const horizontalDistance = touch.clientX - swipeStart.x;
  const verticalDistance = Math.abs(touch.clientY - swipeStart.y);
  if (swipeStart.x <= 36 && horizontalDistance >= 72 && verticalDistance <= 70) activeBack();
  swipeStart = null;
}, { passive: true });

/**
 * Stop scanning, set the Back action and hide navigation on the home screen.
 * @param {(() => void)|null} onBack Back action; null hides navigation.
 * @returns {void}
 */
function bindTopNav(onBack) {
  stopToteScanner();
  activeBack = onBack;
  persistentNav.hidden = !onBack;
}

/**
 * Shrink a heading until it fits, with an 18px lower limit.
 * @param {HTMLElement|null} title Heading to resize; defaults to the current screen heading.
 * @returns {void}
 */
function fitTitle(title = screen.querySelector('h1')) {
  if (!title) return;
  title.style.fontSize = '';
  let size = parseFloat(getComputedStyle(title).fontSize);
  while (title.scrollWidth > title.clientWidth && size > 18) {
    size -= 1;
    title.style.fontSize = `${size}px`;
  }
}

/**
 * Schedule heading measurement after the current screen has rendered.
 * @returns {void}
 */
function fitCurrentTitle() {
  requestAnimationFrame(() => fitTitle());
}

/**
 * Render a configured menu and connect its navigation and QR buttons.
 * @param {'home'|'useful'} name Menu key in sections.
 * @returns {void}
 */
function menu(name) {
  const section = sections[name];
  bindTopNav(name === 'home' ? null : () => menu('home'));
  screen.innerHTML = `
    <section class="menu">
      ${name === 'home'
    ? `<div class="home-brand"><img src="assets/picnic-icon-512.png" alt="Picnic QR logo" width="512" height="512" /><h1 class="home-title">${section.title}</h1></div>`
    : `<h1>${section.title}</h1>`}
      <div class="button-list">
        ${section.items.map(item => `<button class="nav-button" type="button" ${item.target ? `data-target="${item.target}"` : `data-value="${item.value}"`}>${item.label}</button>`).join('')}
      </div>
    </section>`;
  screen.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.target === 'chill' || button.dataset.target === 'ambient') dockTypeMenu(button.dataset.target);
    else if (button.dataset.target === 'totes') toteMenu();
    else menu(button.dataset.target);
  }));
  screen.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => {
    showQr(button.dataset.value);
  }));
  fitCurrentTitle();
}

/**
 * Render a useful-location QR code with Back returning to useful locations.
 * @param {string} value Short location label to encode.
 * @returns {void}
 */
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
