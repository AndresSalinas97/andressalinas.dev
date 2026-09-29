/**
 * @file Validates tote numbers, formats display-only separators and renders tote entry and QR screens.
 * @author Codex
 */

const TOTE_PARTS = [
  { label: 'Side A', prefix: '1' },
  { label: 'Side C', prefix: '3' },
  { label: 'Compartment A', prefix: '5' },
  { label: 'Compartment B', prefix: '7' },
  { label: 'Compartment C', prefix: '9' },
];

/**
 * Accept nine digits or ten digits with a known part prefix. Preserve leading zeros and reject nonnumeric payloads.
 * @param {string} value Typed or scanned code; surrounding whitespace is allowed.
 * @returns {string|null}
 */
function parseToteNumber(value) {
  const code = value.trim();
  if (/^\d{9}$/.test(code)) return code;
  const hasKnownPrefix = TOTE_PARTS.some(part => part.prefix === code[0]);
  if (/^\d{10}$/.test(code) && hasKnownPrefix) return code.slice(1);
  return null;
}

/**
 * Group a validated tote code into triplets, separating an optional prefix with a dot. Never use the result as the encoded QR payload.
 * @param {string} code Validated nine- or ten-digit code.
 * @returns {string}
 */
function formatToteCode(code) {
  const prefix = code.length === 10 ? `${code[0]}.` : '';
  const tote = code.length === 10 ? code.slice(1) : code;
  return prefix + tote.replace(/(\d{3})(?=\d)/g, '$1.');
}

/**
 * Wrap display separators for styling. Only pass validated digit strings; this helper does not escape arbitrary HTML.
 * @param {string} code Validated nine- or ten-digit code.
 * @returns {string}
 */
function toteCodeMarkup(code) {
  return formatToteCode(code).replace(/\./g, '<span class="tote-separator">.</span>');
}

/**
 * Render numeric entry with inline submit and scanner controls, validation feedback and a camera preview.
 * @param {string} initialValue Optional nine-digit tote value restored when going Back.
 * @returns {void}
 */
function toteMenu(initialValue = '') {
  bindTopNav(() => menu('home'));
  screen.innerHTML = `
    <section class="menu tote-menu">
      <h1>Tote Compartments</h1>
      <form class="tote-form" novalidate>
        <label for="tote-number">Enter tote number:</label>
        <div class="tote-input-group">
          <input id="tote-number" name="tote" type="text" inputmode="numeric"
            pattern="[0-9]*" enterkeyhint="go"
            autocomplete="off" spellcheck="false"
            aria-describedby="tote-error" />
          <button class="tote-scan-button" type="button" data-scan aria-label="Scan barcode or QR code" title="Scan barcode or QR code">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M8 8v8m4-8v8m4-8v8" /></svg>
          </button>
          <button class="tote-submit" type="submit" aria-label="Show tote QR codes" title="Show QR codes">✓</button>
        </div>
        <p id="tote-error" class="tote-error" role="alert"></p>
        <div class="tote-scanner" hidden>
          <video muted playsinline aria-label="Camera preview"></video>
          <button class="direction-button" type="button" data-stop-scan>Stop camera</button>
        </div>
        <p class="tote-status" data-scan-status role="status"></p>
      </form>
    </section>`;
  const form = screen.querySelector('form');
  const input = form.querySelector('input');
  const error = form.querySelector('#tote-error');
  input.value = initialValue;
  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '');
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const tote = parseToteNumber(input.value);
    if (tote) {
      showToteParts(tote);
    } else {
      error.textContent = 'Use 9 digits, or prefix them with 1, 3, 5, 7 or 9. Example: 1300900123.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  });
  form.querySelector('[data-scan]').addEventListener('click', () => startToteScanner(form));
  form.querySelector('[data-stop-scan]').addEventListener('click', stopToteScanner);
  fitCurrentTitle();
}

/**
 * List the two sides and three compartments for a validated tote.
 * @param {string} tote Validated nine-digit tote number.
 * @returns {void}
 */
function showToteParts(tote) {
  bindTopNav(() => toteMenu(tote));
  screen.innerHTML = `
    <section class="menu tote-menu">
      <h1>Tote ${toteCodeMarkup(tote)}</h1>
      <div class="button-list">
        ${TOTE_PARTS.map((part, index) => `
          <button class="nav-button tote-part" type="button" data-part="${index}">
            ${part.label}<span class="button-detail">${toteCodeMarkup(part.prefix + tote)}</span>
          </button>`).join('')}
      </div>
    </section>`;
  screen.querySelectorAll('[data-part]').forEach(button => {
    button.addEventListener('click', () => showToteQr(tote, Number(button.dataset.part)));
  });
  fitCurrentTitle();
}

/**
 * Render one part QR code and wrap Previous/Next through all five parts. Display dots never enter the QR payload.
 * @param {string} tote Validated nine-digit tote number.
 * @param {number} index Zero-based index into TOTE_PARTS, 0–4.
 * @returns {void}
 */
function showToteQr(tote, index) {
  const part = TOTE_PARTS[index];
  const value = `${part.prefix}${tote}`;
  bindTopNav(() => showToteParts(tote));
  screen.innerHTML = `
    <section class="qr-screen">
      <div class="qr-content tote-qr-content">
        <h1>${part.label}</h1>
        <canvas class="qr-code" role="img" aria-label="${part.label}: QR code containing ${formatToteCode(value)}"></canvas>
        <p class="qr-value">${toteCodeMarkup(value)}</p>
        <div class="qr-controls" aria-label="Sides and compartments">
          <button class="direction-button" type="button" data-previous>← Previous</button>
          <button class="direction-button" type="button" data-next>Next →</button>
        </div>
      </div>
    </section>`;
  drawQr(screen.querySelector('canvas'), value);
  screen.querySelector('[data-previous]').addEventListener('click', () => {
    showToteQr(tote, (index - 1 + TOTE_PARTS.length) % TOTE_PARTS.length);
  });
  screen.querySelector('[data-next]').addEventListener('click', () => {
    showToteQr(tote, (index + 1) % TOTE_PARTS.length);
  });
  fitCurrentTitle();
}
