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

function qrMatrix(data, mask) {
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

  const stream = data.flatMap(byte => byte.toString(2).padStart(8, '0').split('').map(bit => bit === '1'));
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
  const data = qrData(text);
  let modules;
  let lowestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = qrMatrix(data, mask);
    const penalty = qrPenalty(candidate);
    if (penalty < lowestPenalty) {
      modules = candidate;
      lowestPenalty = penalty;
    }
  }
  const scale = 20, quiet = 4, size = (QR_SIZE + quiet * 2) * scale;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  modules.forEach((row, y) => row.forEach((isDark, x) => { if (isDark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale); }));
}
