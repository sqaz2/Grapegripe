import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'public/index.html',
  'public/styles.css',
  'public/journey.js',
  'public/assets/arena.webp',
  'public/assets/grape-fighter.webp',
  'public/assets/grape-fighter-back.webp',
  'public/assets/grape-fighter-side.webp',
  'public/assets/hero-walk.webp',
  'public/engine/terrain.mjs',
  'public/engine/terrain-data.mjs',
  'public/engine/animation.mjs',
  'public/engine/hero-atlas.mjs',
  'public/assets/root-cellar.webp',
  'public/assets/vineway.webp',
  'public/assets/sourwood.webp',
  'public/assets/sourling.webp',
  'public/assets/rumor-moth.webp',
  'public/assets/thorn-brute.webp',
  'public/assets/gripe-maw.webp',
  'wrangler.jsonc',
];

const failures = [];
for (const file of required) {
  const path = resolve(root, file);
  if (!existsSync(path)) failures.push(`Missing ${file}`);
  else if (file.endsWith('.webp') && statSync(path).size < 10_000) failures.push(`Image asset is unexpectedly small: ${file}`);
}

if (!failures.length) {
  const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
  const css = readFileSync(resolve(root, 'public/styles.css'), 'utf8');
  const game = readFileSync(resolve(root, 'public/journey.js'), 'utf8');

  for (const reference of [
    './styles.css',
    './journey.js',
    './assets/root-cellar.webp',
    './assets/grape-fighter.webp',
  ]) {
    if (!html.includes(reference)) failures.push(`index.html does not reference ${reference}`);
  }

  const controls = [
    'aria-label="Begin the journey"',
    'aria-label="Movement control"',
    'aria-label="Attack"',
    'aria-label="Dash"',
    'aria-label="Unleash the Grape Gripe"',
    'aria-label="Open journey map"',
    'aria-label="Choose a power"',
    'aria-live="polite"',
    'viewport-fit=cover',
  ];
  for (const marker of controls) {
    if (!html.includes(marker)) failures.push(`Missing accessible control marker: ${marker}`);
  }

  if (!/<script[^>]*type="module"[^>]*src=".\/journey.js"/.test(html)) failures.push('Journey must load as a module');
  for (const match of game.matchAll(/from ['"]([^'"]+)['"]/g)) {
    if (!existsSync(resolve(root, 'public', match[1]))) failures.push(`Missing module ${match[1]}`);
  }

  for (const match of game.matchAll(/\$\('([^']+)'\)/g)) {
    if (!html.includes(`id="${match[1]}"`)) failures.push(`journey.js expects missing element #${match[1]}`);
  }

  if (!css.includes('width: 100px') || !css.includes('height: 100px')) failures.push('Primary attack control is undersized');
  if (!css.includes('width: 126px') || !css.includes('height: 126px')) failures.push('Movement control is undersized');
  if (!css.includes('@media (prefers-reduced-motion: reduce)')) failures.push('Missing reduced-motion handling');
  if (/TODO|lorem ipsum|placeholder/i.test(`${html}\n${css}\n${game}`)) failures.push('Unresolved placeholder text found');
  if (!html.includes('Move in eight directions')) failures.push('Eight-direction movement is not communicated accessibly');
  if (!css.includes('.map-screen')) failures.push('Journey map styling is missing');
  if (/story-sheet|KNOWN|ASSUMED|MISSING|Reach the pulsing branch/.test(`${html}\n${game}`)) failures.push('Old reading-led detective interface remains');

  try {
    execFileSync(process.execPath, ['--check', resolve(root, 'public/journey.js')], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`journey.js syntax check failed: ${error.stderr?.toString().trim() || error.message}`);
  }

  try {
    JSON.parse(readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8'));
  } catch (error) {
    failures.push(`wrangler.jsonc is invalid JSON: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Grape Gripe journey validation passed.');
