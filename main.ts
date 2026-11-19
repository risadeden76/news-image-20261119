// 19 November 2026 — World News in One Image
// make.fun competition news-image-20261119.
//
// A Node 22, standard-library-only program. It draws a 1024x1024 infographic
// of the day's world news (researched 19 Nov 2026, baked in below — no
// network at runtime) and writes it deterministically to entry.png.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Embedded stroke font. Each glyph is a list of strokes; a stroke is a list
// of "x,y" points on a 10-wide, 14-tall grid (y down, baseline at y=14).
// Strokes are separated by ";", points by a space. Uppercase + digits +
// punctuation only — the whole poster is set in capitals, like a newspaper.
// ---------------------------------------------------------------------------
const FONT: Record<string, string> = {
  A: '1,14 5,0 9,14;3,9 7,9',
  B: '1,0 1,14;1,0 7,0 9,2 9,5 7,7 1,7;1,7 7,7 9,9 9,12 7,14 1,14',
  C: '9,2 7,0 3,0 1,2 1,12 3,14 7,14 9,12',
  D: '1,0 1,14;1,0 7,0 9,2 9,12 7,14 1,14',
  E: '9,0 1,0 1,14 9,14;1,7 7,7',
  F: '9,0 1,0 1,14;1,7 7,7',
  G: '9,2 7,0 3,0 1,2 1,12 3,14 7,14 9,12 9,8 6,8',
  H: '1,0 1,14;9,0 9,14;1,7 9,7',
  I: '5,0 5,14;2,0 8,0;2,14 8,14',
  J: '5,0 9,0 9,12 7,14 3,14 1,12',
  K: '1,0 1,14;9,0 1,7 9,14',
  L: '1,0 1,14 9,14',
  M: '1,14 1,0 5,8 9,0 9,14',
  N: '1,14 1,0 9,14 9,0',
  O: '3,0 7,0 9,2 9,12 7,14 3,14 1,12 1,2 3,0',
  P: '1,14 1,0 7,0 9,2 9,5 7,7 1,7',
  Q: '3,0 7,0 9,2 9,12 7,14 3,14 1,12 1,2 3,0;6,10 9,14',
  R: '1,14 1,0 7,0 9,2 9,5 7,7 1,7;6,7 9,14',
  S: '9,1 7,0 3,0 1,2 1,5 3,7 7,7 9,9 9,12 7,14 3,14 1,13',
  T: '1,0 9,0;5,0 5,14',
  U: '1,0 1,12 3,14 7,14 9,12 9,0',
  V: '1,0 5,14 9,0',
  W: '1,0 3,14 5,7 7,14 9,0',
  X: '1,0 9,14;9,0 1,14',
  Y: '1,0 5,7 9,0;5,7 5,14',
  Z: '1,0 9,0 1,14 9,14',
  '0': '3,0 7,0 9,2 9,12 7,14 3,14 1,12 1,2 3,0;7,3 3,11',
  '1': '3,2 5,0 5,14;2,14 8,14',
  '2': '1,2 3,0 7,0 9,2 9,6 1,14 9,14',
  '3': '2,0 8,0 9,2 9,5 6,7 9,9 9,12 8,14 2,14',
  '4': '7,0 1,9 9,9;7,0 7,14',
  '5': '9,0 1,0 1,7 7,7 9,9 9,12 7,14 1,14',
  '6': '9,1 7,0 3,0 1,2 1,12 3,14 7,14 9,12 9,9 7,7 1,7',
  '7': '1,0 9,0 4,14',
  '8': '3,0 7,0 9,2 9,5 7,7 3,7 1,5 1,2 3,0;3,7 7,7 9,9 9,12 7,14 3,14 1,12 1,9 3,7',
  '9': '1,5 3,7 7,7 9,5 9,2 7,0 3,0 1,2 1,5;9,7 9,14',
  ' ': '',
  '.': '5,12 5,14',
  ',': '5,11 5,13 3,15',
  ':': '5,3 5,5;5,11 5,13',
  ';': '5,3 5,5;5,11 5,13 3,15',
  "'": '5,0 4,4',
  '"': '3,0 2,4;7,0 6,4',
  '-': '1,7 9,7',
  '\u2013': '1,7 9,7',
  '\u2014': '0,7 10,7',
  '(': '7,0 4,2 3,7 4,12 7,14',
  ')': '3,0 6,2 7,7 6,12 3,14',
  '/': '8,0 2,14',
  '&': '8,1 6,0 3,0 1,2 1,5 3,7 8,7 9,9 9,12 7,14 3,14 1,12;3,7 8,13',
  '%': '2,1 4,1 4,3 2,3 2,1;6,11 8,11 8,13 6,13 6,11;8,0 2,14',
  '+': '5,3 5,11;1,7 9,7',
  '?': '2,2 4,0 7,0 9,2 9,5 7,7 5,7 5,10;5,13 5,14',
  '!': '5,0 5,10;5,13 5,14',
  '$': '9,2 7,0 3,0 1,2 1,5 3,7 7,7 9,9 9,12 7,14 3,14 1,12;5,0 5,14',
  '#': '3,0 2,14;7,0 6,14;1,5 9,5;1,10 9,10',
  '*': '5,1 5,13;1,4 9,4;2,2 8,12;8,2 2,12',
  '=': '1,5 9,5;1,10 9,10',
  _: '1,14 9,14',
  '\u2022': '4,6 6,6 6,8 4,8 4,6',
};

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with tiny drawing primitives.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;

type RGB = [number, number, number];

class Canvas {
  buf = new Uint8Array(W * H * 3);

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w));
    const y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
        i += 3;
      }
    }
  }

  // Vertical gradient, drawn as one-pixel-high strips.
  vGradient(y0: number, y1: number, top: RGB, bottom: RGB): void {
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0 - 1);
      const c: RGB = [
        Math.round(top[0] + (bottom[0] - top[0]) * t),
        Math.round(top[1] + (bottom[1] - top[1]) * t),
        Math.round(top[2] + (bottom[2] - top[2]) * t),
      ];
      this.fillRect(0, y, W, 1, c);
    }
  }

  // Thick line: Bresenham with a square brush.
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    const r = Math.floor(t / 2);
    for (;;) {
      this.fillRect(x - r, y - r, t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  polyline(pts: Array<[number, number]>, t: number, c: RGB): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.line(
        Math.round(pts[i][0]), Math.round(pts[i][1]),
        Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), t, c,
      );
    }
  }

  circle(cx: number, cy: number, r: number, t: number, c: RGB): void {
    const steps = Math.max(48, Math.round(r * 6));
    let px = cx + r;
    let py = cy;
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + r * Math.cos(a));
      const y = Math.round(cy + r * Math.sin(a));
      this.line(Math.round(px), Math.round(py), x, y, t, c);
      px = x;
      py = y;
    }
  }

  filledCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      this.fillRect(cx - w, cy + dy, w * 2 + 1, 1, c);
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoding (hand-written chunks + node:zlib deflate), deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // One scanline per row: filter byte 0 (None) + RGB pixels.
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(cv.buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Text: measure, draw and word-wrap with the stroke font.
// ---------------------------------------------------------------------------
const ADVANCE = 11; // glyph advance, in font units

function textWidth(text: string, scale: number): number {
  return text.length * ADVANCE * scale;
}

function drawGlyph(cv: Canvas, ch: string, x: number, y: number, scale: number, t: number, c: RGB): void {
  const def = FONT[ch];
  if (!def) return;
  for (const stroke of def.split(';')) {
    const pts: Array<[number, number]> = stroke
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((p) => {
        const [gx, gy] = p.split(',').map(Number);
        return [x + gx * scale, y + gy * scale] as [number, number];
      });
    if (pts.length === 1) {
      cv.fillRect(Math.round(pts[0][0] - t / 2), Math.round(pts[0][1] - t / 2), t, t, c);
    } else if (pts.length > 1) {
      cv.polyline(pts, t, c);
    }
  }
}

function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, c: RGB): void {
  const t = Math.max(1, Math.round(scale * 1.5));
  let cx = x;
  for (const ch of text.toUpperCase()) {
    drawGlyph(cv, ch, cx, y, scale, t, c);
    cx += ADVANCE * scale;
  }
}

function drawTextCentered(cv: Canvas, text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, text, cx - textWidth(text, scale) / 2, y, scale, c);
}

// Greedy word wrap. Returns at most maxLines lines; the last line gets "..."
// when text is cut off.
function wrapText(text: string, maxWidth: number, scale: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  const ellipsize = (s: string): string => {
    let out = s;
    while (out && textWidth(out + '...', scale) > maxWidth) {
      const cut = out.lastIndexOf(' ');
      out = cut > 0 ? out.slice(0, cut) : out.slice(0, -1);
    }
    return out ? out + '...' : '...';
  };
  for (const word of words) {
    const next = cur ? cur + ' ' + word : word;
    if (textWidth(next, scale) <= maxWidth) {
      cur = next;
      continue;
    }
    if (lines.length < maxLines - 1) {
      // Room for another line: commit the current one and keep going.
      if (cur) lines.push(cur);
      cur = textWidth(word, scale) <= maxWidth ? word : ellipsize(word);
      continue;
    }
    // This is the last allowed line: fit what we can, then stop.
    lines.push(ellipsize(next));
    return lines;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

// ---------------------------------------------------------------------------
// Small line icons, drawn in white inside a story card's tag bar.
// kind: burst | bridge | chart | globe | scales | star
// ---------------------------------------------------------------------------
function drawIcon(cv: Canvas, kind: string, cx: number, cy: number, s: number, c: RGB): void {
  const t = 2;
  if (kind === 'burst') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      cv.line(cx, cy, Math.round(cx + 11 * s * Math.cos(a)), Math.round(cy + 11 * s * Math.sin(a)), t, c);
    }
    cv.filledCircle(cx, cy, Math.max(2, Math.round(2.5 * s)), c);
  } else if (kind === 'bridge') {
    cv.line(cx - 12 * s, cy + 6 * s, cx + 12 * s, cy + 6 * s, t, c);
    cv.polyline(
      [[cx - 12 * s, cy + 6 * s], [cx - 6 * s, cy - 6 * s], [cx + 6 * s, cy - 6 * s], [cx + 12 * s, cy + 6 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
    for (const dx of [-6, 0, 6]) cv.line(cx + dx * s, cy - 6 * s, cx + dx * s, cy + 6 * s, t, c);
  } else if (kind === 'chart') {
    cv.polyline(
      [[cx - 11 * s, cy + 7 * s], [cx - 4 * s, cy + 1 * s], [cx + 1 * s, cy + 4 * s], [cx + 11 * s, cy - 8 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
    cv.line(cx + 11 * s, cy - 8 * s, cx + 5 * s, cy - 8 * s, t, c);
    cv.line(cx + 11 * s, cy - 8 * s, cx + 11 * s, cy - 2 * s, t, c);
  } else if (kind === 'globe') {
    cv.circle(cx, cy, 10 * s, t, c);
    cv.line(cx - 10 * s, cy, cx + 10 * s, cy, t, c);
    cv.polyline(
      [[cx, cy - 10 * s], [cx + 5 * s, cy - 5 * s], [cx + 5 * s, cy + 5 * s], [cx, cy + 10 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
    cv.polyline(
      [[cx, cy - 10 * s], [cx - 5 * s, cy - 5 * s], [cx - 5 * s, cy + 5 * s], [cx, cy + 10 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
  } else if (kind === 'scales') {
    cv.line(cx, cy - 9 * s, cx, cy + 9 * s, t, c);
    cv.line(cx - 10 * s, cy - 6 * s, cx + 10 * s, cy - 6 * s, t, c);
    cv.line(cx - 10 * s, cy - 6 * s, cx - 10 * s, cy + 2 * s, t, c);
    cv.line(cx + 10 * s, cy - 6 * s, cx + 10 * s, cy + 2 * s, t, c);
    cv.polyline(
      [[cx - 14 * s, cy + 6 * s], [cx - 10 * s, cy + 2 * s], [cx - 6 * s, cy + 6 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
    cv.polyline(
      [[cx + 6 * s, cy + 6 * s], [cx + 10 * s, cy + 2 * s], [cx + 14 * s, cy + 6 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
  } else {
    // star: four-point sparkle + orbit ring
    cv.polyline(
      [[cx, cy - 11 * s], [cx + 2 * s, cy - 2 * s], [cx + 11 * s, cy], [cx + 2 * s, cy + 2 * s], [cx, cy + 11 * s], [cx - 2 * s, cy + 2 * s], [cx - 11 * s, cy], [cx - 2 * s, cy - 2 * s], [cx, cy - 11 * s]].map(
        ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
      ),
      t,
      c,
    );
  }
}

// ---------------------------------------------------------------------------
// The day's news — Thursday 19 November 2026, as reported that day
// (BBC, NYT, Al Jazeera, Reuters, Sky News). Six stories, across regions
// and fields, plus an "also today" strip.
// ---------------------------------------------------------------------------
type Story = { tag: string; color: RGB; icon: string; headline: string; summary: string };

const STORIES: Story[] = [
  {
    tag: 'CONFLICT \u2022 GAZA',
    color: [176, 58, 46],
    icon: 'burst',
    headline: 'ISRAEL LAUNCHES RARE GROUND RAID IN GAZA',
    summary: "Troops cross the ceasefire 'Yellow Line' in central Gaza; displaced families flee shelters.",
  },
  {
    tag: 'CONFLICT \u2022 CRIMEA',
    color: [125, 60, 152],
    icon: 'bridge',
    headline: 'CRIMEAN BRIDGE ATTACKED AGAIN',
    summary: 'Traffic halts on the bridge linking Crimea to Russia after a fresh attack, officials say.',
  },
  {
    tag: 'TECH \u2022 AI',
    color: [17, 122, 101],
    icon: 'chart',
    headline: 'ANTHROPIC IN BIGGEST IPO EVER',
    summary: 'The Claude-maker raises $81.3bn at $83 a share, the largest stock market debut ever.',
  },
  {
    tag: 'DIPLOMACY',
    color: [31, 97, 141],
    icon: 'globe',
    headline: 'TRUMP, XI AND PUTIN MEET IN CHINA',
    summary: 'The three leaders shake hands in China, with trade and security high on the agenda.',
  },
  {
    tag: 'JUSTICE',
    color: [30, 132, 73],
    icon: 'scales',
    headline: 'UN COURT TO RULE ON ROHINGYA CASE',
    summary: 'Myanmar faces a historic verdict at the UN court over alleged massacres of the Rohingya.',
  },
  {
    tag: 'SPACE',
    color: [74, 35, 90],
    icon: 'star',
    headline: 'VOYAGER 1 REACHES A LIGHT-DAY',
    summary: "NASA's 1977 probe passes one light-day from Earth - the farthest object humans ever built.",
  },
];

const NAVY_TOP: RGB = [12, 27, 46];
const NAVY_BOTTOM: RGB = [18, 42, 68];
const GOLD: RGB = [232, 180, 74];
const INK: RGB = [16, 30, 51];
const BODY: RGB = [58, 74, 94];
const CARD: RGB = [255, 255, 255];
const CARD_BORDER: RGB = [216, 222, 230];
const WHITE: RGB = [255, 255, 255];
const MUTED: RGB = [180, 196, 214];

function render(): Canvas {
  const cv = new Canvas();
  cv.vGradient(0, H, NAVY_TOP, NAVY_BOTTOM);

  // ---- Header -------------------------------------------------------------
  drawText(cv, '19 NOVEMBER 2026', 40, 34, 4.0, WHITE);
  drawText(cv, 'WORLD NEWS IN ONE IMAGE', 42, 108, 2.0, GOLD);
  // Globe mark, top right.
  const gx = 924;
  const gy = 78;
  cv.circle(gx, gy, 54, 3, GOLD);
  cv.circle(gx, gy, 54, 3, GOLD);
  cv.line(gx - 54, gy, gx + 54, gy, 2, GOLD);
  cv.polyline(
    [[gx, gy - 54], [gx + 26, gy - 26], [gx + 26, gy + 26], [gx, gy + 54]],
    2,
    GOLD,
  );
  cv.polyline(
    [[gx, gy - 54], [gx - 26, gy - 26], [gx - 26, gy + 26], [gx, gy + 54]],
    2,
    GOLD,
  );
  cv.line(gx - 40, gy - 30, gx + 40, gy - 30, 2, GOLD);
  cv.line(gx - 40, gy + 30, gx + 40, gy + 30, 2, GOLD);
  drawText(cv, 'THURSDAY', 40, 148, 1.2, MUTED);
  cv.fillRect(0, 168, W, 4, GOLD);

  // ---- Story cards: 2 columns x 3 rows -----------------------------------
  const cardW = 476;
  const cardH = 236;
  const xs = [24, 524];
  const ys = [184, 432, 680];
  STORIES.forEach((s, i) => {
    const x = xs[i % 2];
    const y = ys[Math.floor(i / 2)];
    cv.fillRect(x, y, cardW, cardH, CARD);
    cv.fillRect(x, y, cardW, 34, s.color);
    drawText(cv, s.tag, x + 16, y + 8, 1.5, WHITE);
    drawIcon(cv, s.icon, x + cardW - 26, y + 17, 1, WHITE);
    // Thin border around the card.
    cv.fillRect(x, y, cardW, 2, CARD_BORDER);
    cv.fillRect(x, y + cardH - 2, cardW, 2, CARD_BORDER);
    cv.fillRect(x, y, 2, cardH, CARD_BORDER);
    cv.fillRect(x + cardW - 2, y, 2, cardH, CARD_BORDER);
    const headLines = wrapText(s.headline, cardW - 32, 1.85, 2);
    headLines.forEach((ln, li) => drawText(cv, ln, x + 16, y + 52 + li * 33, 1.85, INK));
    const sumLines = wrapText(s.summary, cardW - 32, 1.3, 4);
    sumLines.forEach((ln, li) => drawText(cv, ln, x + 16, y + 130 + li * 24, 1.3, BODY));
  });

  // ---- Also today ----------------------------------------------------------
  drawText(cv, 'ALSO TODAY:', 40, 934, 1.2, GOLD);
  drawText(cv, 'GTA VI ROLLS OUT WORLDWIDE \u2022 CYCLONE AKVAN NEARS INDIA', 40, 956, 1.2, WHITE);
  drawText(cv, "VAN GOGH SELLS FOR A RECORD $190.4M \u2022 JEFFRIES TO BE FIRST BLACK SPEAKER", 40, 978, 1.2, WHITE);

  // ---- Footer --------------------------------------------------------------
  cv.fillRect(0, 1000, W, 1, [60, 80, 104]);
  drawTextCentered(cv, 'SOURCES: BBC \u2022 NYT \u2022 AL JAZEERA \u2022 REUTERS \u2022 SKY NEWS', 512, 1008, 1.0, MUTED);

  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG(render()));
