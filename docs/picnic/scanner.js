/**
 * @file Loads the local barcode decoder on demand and manages camera startup, cancellation and teardown.
 * @author Codex
 */

let scannerLibrary;
let stopActiveScanner = null;

/**
 * Stop the active scan and clear its cleanup callback. Safe when no scanner is active.
 * @returns {void}
 */
function stopToteScanner() {
  stopActiveScanner?.();
  stopActiveScanner = null;
}

/**
 * Reuse a single decoder-loading promise. Reset it after a loading failure so the next scan can retry.
 * @returns {Promise<object>}
 */
function loadScannerLibrary() {
  if (!scannerLibrary) {
    scannerLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/zxing-browser.min.js';
      script.onload = () => resolve(window.ZXingBrowser);
      script.onerror = () => {
        script.remove();
        scannerLibrary = null;
        reject(new Error('Scanner could not load. Please type the tote number.'));
      };
      document.head.append(script);
    });
  }
  return scannerLibrary;
}

/**
 * Request a rear-facing camera, decode tote labels locally and open valid results. Surface camera errors in the form and release late streams after cancellation.
 * @param {HTMLFormElement} form Mounted tote form containing camera controls and status elements.
 * @returns {Promise<void>}
 */
async function startToteScanner(form) {
  stopToteScanner();
  const status = form.querySelector('[data-scan-status]');
  const scanButton = form.querySelector('[data-scan]');
  const preview = form.querySelector('.tote-scanner');
  const video = preview.querySelector('video');
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    status.textContent = 'Camera scanning is unavailable here. Open this app over HTTPS or type the tote number.';
    return;
  }

  let cancelled = false;
  let stream;
  let controls;
  // Session cleanup also marks pending asynchronous work as cancelled.
  stopActiveScanner = () => {
    cancelled = true;
    controls?.stop();
    stream?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    preview.hidden = true;
    scanButton.disabled = false;
    status.textContent = 'Camera stopped. You can scan again or type a number.';
  };
  scanButton.disabled = true;
  preview.hidden = false;
  status.textContent = 'Starting camera…';

  try {
    const library = await loadScannerLibrary();
    if (cancelled) return;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
    });
    // Permission can resolve after the user has already left the screen.
    if (cancelled) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    const reader = new library.BrowserMultiFormatReader();
    status.textContent = 'Point the camera at a tote barcode or QR code.';
    // Ignore empty frames; valid results navigate away and stop this session.
    controls = await reader.decodeFromStream(stream, video, result => {
      if (cancelled || !result) return;
      const tote = parseToteNumber(result.getText());
      if (tote) showToteParts(tote);
      else status.textContent = 'That code is not a tote number. Try a tote side or compartment label.';
    });
    if (cancelled) controls.stop();
  } catch (error) {
    if (cancelled) return;
    stopToteScanner();
    const messages = {
      NotAllowedError: 'Camera permission was denied. Allow camera access in your browser settings, or type the number.',
      NotFoundError: 'No camera was found. Please type the tote number.',
      NotReadableError: 'The camera is busy. Close other camera apps and try again, or type the number.',
    };
    status.textContent = messages[error.name] || 'Could not start scanning. Try again or type the tote number.';
  }
}

window.addEventListener('pagehide', stopToteScanner);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopToteScanner();
});
