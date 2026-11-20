// scripts/pwa/build-icons.mjs – App-Icons aus dem Motiv „F.“ (Paket P, P-8)
//
// Aufruf: npm run pwa:icons   (manuell, nicht bei jedem Build)
//
// 1. Baut assets/icon-master.svg (1024 × 1024, volle Fläche, keine runden Ecken, keine Transparenz):
//    Waldgrün, heller Kreis oben rechts, Serifen-„F“ aus DM Serif Display (als Pfad) und Punkt.
// 2. Rendert daraus mit sharp (kommt mit @vite-pwa/assets-generator):
//      public/icons/pwa-192.png, pwa-512.png      purpose any
//      public/icons/pwa-maskable-512.png         purpose maskable (Motiv liegt in der sicheren Zone)
//      public/apple-touch-icon-180.png           iOS (ohne Transparenz)
//      public/favicon.svg                        Browser-Tab
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const SIZE = 1024;
const GREEN = '#2D5A4E';          // --color-accent
const DOT = '#8FA9A2';            // gedämpftes Grün-Grau wie im bisherigen Icon
const FONT = resolve('node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff');

const font = opentype.loadSync(FONT);
const glyph = font.charToGlyph('F');
const box = glyph.getBoundingBox();                     // Einheiten: unitsPerEm
const capH = box.y2 - box.y1;
const H = SIZE * 0.35;                                   // Höhe des F wie im bisherigen Icon (~35 %)
const scale = H / capH;
const W = (box.x2 - box.x1) * scale;
const dotR = H * 0.11;

// F und Punkt zusammen waagerecht mittig, F senkrecht mittig
const groupW = W + dotR * 0.6;
const left = (SIZE - groupW) / 2;
const baseline = SIZE / 2 + H / 2;
const fontSize = font.unitsPerEm * scale;
const path = glyph.getPath(left - box.x1 * scale, baseline, fontSize);   // y wächst nach unten
const d = path.toPathData(2);
const dotX = left + W * 0.86;
const dotY = baseline - dotR * 1.15;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${GREEN}"/>
  <circle cx="${SIZE * 0.77}" cy="${SIZE * 0.2}" r="${SIZE * 0.25}" fill="#FFFFFF" fill-opacity="0.09"/>
  <path d="${d}" fill="#FFFFFF"/>
  <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${dotR.toFixed(2)}" fill="${DOT}"/>
</svg>
`;

mkdirSync('assets', { recursive: true });
mkdirSync('public/icons', { recursive: true });
writeFileSync('assets/icon-master.svg', svg);
copyFileSync('assets/icon-master.svg', 'public/favicon.svg');

const render = (size, out) => sharp(Buffer.from(svg)).resize(size, size).flatten({ background: GREEN }).png().toFile(out);
await render(192, 'public/icons/pwa-192.png');
await render(512, 'public/icons/pwa-512.png');
await render(512, 'public/icons/pwa-maskable-512.png');   // Motiv liegt innerhalb des inneren 80-%-Kreises
await render(180, 'public/apple-touch-icon-180.png');
console.log('OK: assets/icon-master.svg, public/favicon.svg, public/icons/pwa-*.png, public/apple-touch-icon-180.png');
