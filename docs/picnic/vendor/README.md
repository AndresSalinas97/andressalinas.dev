# Barcode scanner dependency

`zxing-browser.min.js` is the unmodified UMD bundle of `@zxing/browser` 0.1.5,
from https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js.

Project and API documentation: https://github.com/zxing-js/browser

The bundle is loaded only when scanning is requested and cached for offline use.
Camera frames are decoded locally in the browser.

The browser wrapper is MIT licensed (see `ZXING-LICENSE`). Its bundled
`@zxing/library` decoder is Apache-2.0 licensed (see `ZXING-LIBRARY-LICENSE`).
