const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { BrowserQRCodeReader } = require('../docs/picnic/vendor/zxing-browser.min.js');
const appDirectory = path.join(__dirname, '../docs/picnic');

class Element {
  constructor() {
    this.children = new Map();
    this.listeners = {};
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }
  querySelectorAll() { return []; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { delete this[name]; }
  focus() {}
}

function loadApp() {
  const app = new Element();
  const document = new Element();
  document.querySelector = () => app;
  const window = new Element();
  window.isSecureContext = true;
  const context = vm.createContext({
    document, window, navigator: { mediaDevices: {} }, TextEncoder, console,
    requestAnimationFrame() {},
  });
  const html = fs.readFileSync(path.join(appDirectory, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(appDirectory, file), 'utf8'), context);
  }
  return { context, screen: app.querySelector('.screen-content') };
}

test('accepts base and all five prefixes while preserving leading zeros', () => {
  const { context } = loadApp();
  for (const tote of ['300900123', '000000001', '130090012']) {
    assert.equal(context.parseToteNumber(tote), tote);
    for (const prefix of ['1', '3', '5', '7', '9']) {
      assert.equal(context.parseToteNumber(` ${prefix}${tote}\n`), tote);
    }
  }
  for (const input of ['', '300123', '30090012', '2300900123', '0300900123',
    '13009001234', '300 900123', '30090012a', 'https://example.com/300900123']) {
    assert.equal(context.parseToteNumber(input), null, input);
  }
});

test('manual submission validates input and lists every expected code', () => {
  const { context, screen } = loadApp();
  context.toteMenu();
  const form = screen.querySelector('form');
  const input = form.querySelector('input');
  input.value = '2300900123';
  form.listeners.submit({ preventDefault() {} });
  assert.equal(input['aria-invalid'], 'true');
  input.value = '7.300.900.123abc';
  input.listeners.input();
  assert.equal(input.value, '7300900123');
  form.listeners.submit({ preventDefault() {} });
  for (const value of ['1300900123', '3300900123', '5300900123', '7300900123', '9300900123']) {
    assert.ok(screen.innerHTML.includes(context.toteCodeMarkup(value)));
  }
});

// Capture actual canvas pixels and decode them independently with ZXing.
function makeCanvas() {
  let pixels;
  const canvas = { width: 0, height: 0 };
  const drawing = {
    fillStyle: '#fff',
    fillRect(x, y, width, height) {
      pixels ||= new Uint8ClampedArray(canvas.width * canvas.height * 4);
      const color = this.fillStyle === '#fff' ? 255 : 0;
      for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
          const index = (row * canvas.width + column) * 4;
          pixels.set([color, color, color, 255], index);
        }
      }
    },
    getImageData() { return { data: pixels }; },
  };
  canvas.getContext = () => drawing;
  return canvas;
}

test('all generated tote QR codes decode to the exact expected number', () => {
  const { context } = loadApp();
  const reader = new BrowserQRCodeReader();
  for (const tote of ['300900123', '000000001']) {
    for (const prefix of ['1', '3', '5', '7', '9']) {
      const value = prefix + tote;
      const canvas = makeCanvas();
      context.drawQr(canvas, value);
      assert.equal(reader.decodeFromCanvas(canvas).getText(), value);
    }
  }
});

function scannerSetup() {
  const app = loadApp();
  const form = new Element();
  let stoppedTracks = 0;
  let stoppedControls = 0;
  const stream = { getTracks: () => [{ stop() { stoppedTracks++; } }] };
  let callback;
  app.context.loadScannerLibrary = async () => ({
    BrowserMultiFormatReader: class {
      async decodeFromStream(_stream, _video, onResult) {
        callback = onResult;
        return { stop() { stoppedControls++; } };
      }
    },
  });
  app.context.navigator.mediaDevices.getUserMedia = async () => stream;
  return {
    ...app, form, stream,
    result(value) { callback({ getText: () => value }); },
    get stoppedTracks() { return stoppedTracks; },
    get stoppedControls() { return stoppedControls; },
  };
}

test('scanning rejects unrelated codes, accepts a compartment and releases the camera', async () => {
  const app = scannerSetup();
  await app.context.startToteScanner(app.form);
  app.result('<script>not a tote</script>');
  assert.match(app.form.querySelector('[data-scan-status]').textContent, /not a tote/);
  assert.equal(app.stoppedTracks, 0);
  app.result('9300900123');
  assert.match(app.screen.innerHTML.replace(/<[^>]*>/g, ''), /Tote 300\.900\.123/);
  assert.equal(app.stoppedTracks, 1);
  assert.equal(app.stoppedControls, 1);
});

test('late camera permission after leaving stops the new stream', async () => {
  const app = scannerSetup();
  let allowCamera;
  app.context.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { allowCamera = resolve; });
  const starting = app.context.startToteScanner(app.form);
  await new Promise(resolve => setImmediate(resolve));
  app.context.menu('home');
  allowCamera(app.stream);
  await starting;
  assert.equal(app.stoppedTracks, 1);
  assert.match(app.screen.innerHTML, /Picnic QR/);
});

test('camera denial leaves manual entry and retry available', async () => {
  const app = scannerSetup();
  app.context.navigator.mediaDevices.getUserMedia = async () => {
    throw Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
  };
  await app.context.startToteScanner(app.form);
  assert.match(app.form.querySelector('[data-scan-status]').textContent, /permission was denied/);
  assert.equal(app.form.querySelector('[data-scan]').disabled, false);
  assert.equal(app.form.querySelector('.tote-scanner').hidden, true);
});

test('QR navigation wraps between sides and compartments and Back returns to the tote', () => {
  const { context, screen } = loadApp();
  screen.children.set('canvas', makeCanvas());
  context.showToteQr('300900123', 0);
  assert.match(screen.innerHTML.replace(/<[^>]*>/g, ''), /1\.300\.900\.123/);
  screen.querySelector('[data-previous]').listeners.click();
  assert.match(screen.innerHTML.replace(/<[^>]*>/g, ''), /9\.300\.900\.123/);
  screen.querySelector('[data-next]').listeners.click();
  assert.match(screen.innerHTML.replace(/<[^>]*>/g, ''), /1\.300\.900\.123/);
  vm.runInContext('activeBack()', context);
  assert.match(screen.innerHTML.replace(/<[^>]*>/g, ''), /Tote 300\.900\.123/);
});

test('hiding the app stops scanning', async () => {
  const app = scannerSetup();
  await app.context.startToteScanner(app.form);
  app.context.document.hidden = true;
  app.context.document.listeners.visibilitychange();
  assert.equal(app.stoppedTracks, 1);
  assert.equal(app.stoppedControls, 1);
});
