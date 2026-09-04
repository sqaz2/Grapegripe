import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'public/index.html',
  'public/styles.css',
  'public/game.js',
  'wrangler.jsonc',
];

const failures = [];
for (const file of required) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing ${file}`);
}

if (!failures.length) {
  const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
  const css = readFileSync(resolve(root, 'public/styles.css'), 'utf8');
  const game = readFileSync(resolve(root, 'public/game.js'), 'utf8');

  for (const reference of ['./styles.css', './game.js']) {
    if (!html.includes(reference)) failures.push(`index.html does not reference ${reference}`);
  }

  const requiredCopy = [
    'Joystick to drift.',
    'Reach the pulsing branch',
    'COMPANION',
    'MOVE CLOSER',
  ];
  for (const copy of requiredCopy) {
    if (!html.includes(copy)) failures.push(`Missing first-screen copy: ${copy}`);
  }

  const requiredGameStates = [
    "phase: 'approach'",
    "state.phase = 'fragments'",
    "state.phase = 'fork'",
    "state.phase = 'complete'",
    'KNOWN',
    'ASSUMED',
    'MISSING',
  ];
  for (const marker of requiredGameStates) {
    if (!game.includes(marker)) failures.push(`Missing gameplay marker: ${marker}`);
  }

  if (!css.includes('min-height: 56px')) failures.push('Choice and sheet controls are missing 56px touch targets');
  if (!css.includes('height: 112px') && !css.includes('height: 104px')) failures.push('Action control is undersized');
  if (!html.includes('aria-live="polite"')) failures.push('Missing accessible live status updates');
  if (!html.includes('viewport-fit=cover')) failures.push('Missing safe-area viewport support');
  if (/TODO|lorem ipsum|placeholder/i.test(`${html}\n${css}\n${game}`)) failures.push('Unresolved placeholder text found');

  try {
    execFileSync(process.execPath, ['--check', resolve(root, 'public/game.js')], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`game.js syntax check failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Playable Branch validation passed.');
