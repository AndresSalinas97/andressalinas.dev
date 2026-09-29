# Picnic QR

Documentation author: **Codex**. First-party source headers credit Codex;
third-party code and license files retain their original attribution.

A static web app served from `/picnic/`. No build step is required.

## Code layout

- `app.js`: startup, shared navigation, home menu and useful locations.
- `dockLocations.js`: dock selection, location codes and QR navigation.
- `totes.js`: tote validation, display formatting and tote screens.
- `scanner.js`: lazy decoder loading and camera lifecycle.
- `qr.js`: QR encoding and canvas rendering.
- `styles.css`: shared layout and controls, tote styles, then responsive and theme rules.
- `service-worker.js`: offline asset caching.
- `vendor/`: pinned barcode decoder and its licenses.

Scripts load in the order declared in `index.html`. The app initializes last.
When adding a script, update both `index.html` and the service worker asset list.
Change the cache version when changing that asset list.

## Tote codes

Keep the nine-digit tote number as a string to preserve leading zeros.
`TOTE_PARTS` defines side and compartment prefixes. Dots and their styling are
for display only; QR codes always contain the original digits.

Camera access starts only when requested and stops on navigation, when the app
is hidden, or after a valid scan. The decoder is loaded locally on demand.

## Verification

From the repository root:

```sh
node --test tests/picnic-totes.test.cjs
```

Tests cover entry validation, QR decoding, navigation and simulated camera
lifecycle. Real camera behavior and the iPhone keypad need device testing.

## Complete file reference

| File | Purpose and maintenance notes |
| --- | --- |
| `README.md` | Architecture, file and CSS reference, verification instructions. Documentation author: Codex. |
| `index.html` | Accessible app shell, installed-app metadata, stylesheet and ordered classic scripts. |
| `app.js` | Startup, shared Back/Home navigation, edge swipe, title fitting, home and useful-location screens. |
| `dockLocations.js` | Ambient/chill and real/virtual dock selection plus location QR cycling. |
| `totes.js` | Tote prefix definitions, validation, display-only formatting, entry and compartment screens. |
| `scanner.js` | Lazy scanner loading, permission handling, decoded results and camera cleanup. |
| `qr.js` | Byte-mode version 1-M QR encoding, mask selection and canvas rendering. Maximum payload: 14 UTF-8 bytes. |
| `styles.css` | Shared visual rules and component classes listed below. |
| `manifest.webmanifest` | Strict JSON describing the installed app's name, launch URL, scope, standalone display, colors and icons. Documented here because JSON does not allow comments. |
| `service-worker.js` | Versioned offline asset list, cache installation/cleanup and network-first responses. |
| `assets/picnic-icon-180.png` | Apple touch icon referenced by the app shell. |
| `assets/picnic-icon-192.png` | 192px installed-app icon referenced by the manifest. |
| `assets/picnic-icon-512.png` | 512px installed-app icon and the home-screen logo, displayed smaller using CSS. |
| `assets/picnic-qr-logo.png` | Retained legacy image; not currently rendered or precached. |
| `vendor/README.md` | Decoder provenance, version, local loading and license reference. |
| `vendor/zxing-browser.min.js` | Unmodified third-party ZXing browser bundle. Internal functions/classes are maintained upstream; do not hand-edit or attribute them to Codex. |
| `vendor/ZXING-LICENSE` | Original MIT license for the ZXing browser wrapper. |
| `vendor/ZXING-LIBRARY-LICENSE` | Original Apache-2.0 license for the bundled decoder. |
| `../../tests/picnic-totes.test.cjs` | Node regression tests and documented DOM/camera/canvas test doubles. |

PNG files and license texts are documented here without changing their contents.
Function comments beside first-party code describe inputs, results and side effects.
Anonymous DOM listeners and array callbacks operate within their enclosing function's
contract; the test names describe each regression callback's expected behavior.

## Shared script contracts

The scripts use shared classic-script bindings, not ES modules. `qr.js`,
`scanner.js`, `totes.js` and `dockLocations.js` load before `app.js` starts the UI.
Screen functions share `screen`, `bindTopNav`, `fitCurrentTitle` and `drawQr`.
Every screen transition calls `bindTopNav`, which stops any active camera session.

The app's listeners record an edge touch, recognize a right swipe for Back,
refit titles on resize and register the service worker on load. The scanner's
page-hide and visibility listeners stop camera use when the app is left or hidden.
The scanner load/error callbacks resolve or reset the shared library promise;
its result callback accepts only validated tote labels. Camera-start promises can
finish after navigation, so cancellation checks release late streams and controls.

## CSS class reference

| Class or group | Responsibility |
| --- | --- |
| `app-shell` | Full-height column with safe-area padding. |
| `screen-content` | Flexible container for the current screen. |
| `menu` | Centered, width-limited menu content. |
| `home-brand`, `home-title` | Home logo/title layout and centered heading. |
| `button-list` | Vertical grid of menu choices. |
| `nav-button` | Main menu and tote-part card buttons. |
| `button-detail` | Accent-colored secondary code text. |
| `dock-grid`, `dock-button` | Two-column dock selection and its buttons. |
| `direction-button` | Previous/Next and stop-camera controls. |
| `top-nav`, `utility-button`, `home-button` | Persistent navigation bar, pill controls and right-aligned Home button. |
| `home-icon`, `back-icon` | Navigation SVG sizing and spacing. |
| `qr-screen`, `qr-content` | QR screen layout and centered content. |
| `qr-code`, `qr-value`, `qr-controls` | Canvas dimensions, code labels and paired navigation buttons. |
| `dock-qr-content` | Dock-specific QR sizing and spacing. |
| `tote-menu`, `tote-form` | Tote heading spacing and entry form grid. |
| `tote-status`, `tote-error` | Scanner feedback and validation messages; empty messages are hidden. |
| `tote-input-group` | Positioning container for the input's embedded controls. |
| `tote-submit`, `tote-scan-button` | In-field checkmark and scanner buttons with 44px touch targets. |
| `tote-scanner` | Camera preview and stop control. |
| `tote-part` | Part name with its formatted code on a separate line. |
| `tote-qr-content` | Tote QR heading, spacing and viewport-sensitive canvas size. |
| `tote-separator` | Smaller, lighter display dots; not part of QR data. |

Global rules define box sizing, typography and focus outlines. Root variables
control colors. Media rules adjust desktop padding, short-screen spacing and
dark-mode colors. Input padding reserves room for both embedded buttons.
