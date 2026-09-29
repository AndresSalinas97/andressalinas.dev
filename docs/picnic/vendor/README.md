# Barcode scanner dependency

Documentation author: **Codex**. Library authorship remains with ZXing contributors.

`zxing-browser.min.js` is the unmodified UMD bundle of `@zxing/browser` 0.1.5,
from https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js.

Project and API documentation: https://github.com/zxing-js/browser

The bundle is loaded only when scanning is requested and cached for offline use.
Camera frames are decoded locally in the browser.

The browser wrapper is MIT licensed (see `ZXING-LICENSE`). Its bundled
`@zxing/library` decoder is Apache-2.0 licensed (see `ZXING-LIBRARY-LICENSE`).

## Files and API used by the app

- `zxing-browser.min.js`: pinned, unmodified library distribution. Its internal
  functions and classes are documented and maintained in the upstream project.
- `ZXING-LICENSE`: verbatim license for the browser wrapper; do not replace its attribution.
- `ZXING-LIBRARY-LICENSE`: verbatim license for the bundled decoding library.
- `README.md`: local provenance and integration documentation.

`BrowserMultiFormatReader` reads 1D barcodes and 2D codes. Picnic calls
`decodeFromStream(stream, video, callback)` with a camera stream and preview
video. The callback receives scan results; `result.getText()` supplies the
payload. The returned controls expose `stop()` to stop decoding. Picnic also
stops its media tracks to release the camera.

Tests use `BrowserQRCodeReader.decodeFromCanvas(canvas)` to independently
check the QR encoder's pixels. No other vendor API is used directly.
