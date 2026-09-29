/**
 * @file Renders real and virtual dock menus and cycles through their location QR codes.
 * @author Codex
 */

/**
 * Show Real and Virtual choices for the selected dock kind.
 * @param {'ambient'|'chill'} kind Dock temperature category.
 * @returns {void}
 */
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

/**
 * Show docks 11 through 20 and return to the dock-type menu on Back.
 * @param {'ambient'|'chill'} kind Dock temperature category.
 * @param {'D'|'V'} prefix Real or virtual dock prefix.
 * @returns {void}
 */
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

/**
 * Create the dock QR screen and render its initial location.
 * @param {'ambient'|'chill'} kind Dock temperature category.
 * @param {'D'|'V'} prefix Real or virtual dock prefix.
 * @param {number} dock Dock number, 11–20.
 * @param {number} locationIndex Zero-based location index, 0–11.
 * @returns {void}
 */
function showDockQr(kind, prefix, dock, locationIndex) {
  bindTopNav(() => dockMenu(kind, prefix));
  screen.innerHTML = `
    <section class="qr-screen">
      <div class="qr-content dock-qr-content"></div>
    </section>`;
  renderDockQrContent(kind, prefix, dock, locationIndex);
}

/**
 * Render a dock location and wrapping Previous/Next controls. Ambient uses even locations; chill uses odd locations.
 * @param {'ambient'|'chill'} kind Dock temperature category.
 * @param {'D'|'V'} prefix Real or virtual dock prefix.
 * @param {number} dock Dock number, 11–20.
 * @param {number} locationIndex Zero-based location index, 0–11.
 * @returns {void}
 */
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
