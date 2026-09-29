# Picnic QR

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
