import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { beats, START_BEAT_ID, validateBeats, BEATS_VERSION } from '../public/eutopia/beats.mjs';

const root = resolve(import.meta.dirname, '..');

test('Eutopia entry files exist for static deploy', () => {
  for (const file of [
    'public/eutopia/index.html',
    'public/eutopia/eutopia.js',
    'public/eutopia/eutopia.css',
    'public/eutopia/beats.mjs',
    'docs/EUTOPIA.md',
  ]) {
    const path = resolve(root, file);
    assert.ok(existsSync(path), `missing ${file}`);
    assert.ok(statSync(path).size > 40, `${file} unexpectedly empty`);
  }
});

test('beat schema validates and start beat is playable', () => {
  assert.equal(BEATS_VERSION, 1);
  const errors = validateBeats(beats);
  assert.deepEqual(errors, []);
  assert.equal(beats[START_BEAT_ID].kind, 'beat');
  assert.ok(beats[START_BEAT_ID].doors.left.next);
  assert.ok(beats[START_BEAT_ID].doors.right.next);
});

test('vertical slice reaches brochure and glitch endings', () => {
  const endings = Object.values(beats).filter((b) => b.kind === 'ending');
  assert.ok(endings.some((e) => e.id === 'ending-brochure' && e.mood === 'brochure'));
  assert.ok(endings.some((e) => e.id === 'ending-glitch' && e.mood === 'glitch'));
  assert.ok(endings.every((e) => typeof e.epilogue === 'string' && e.epilogue.length > 20));
});

test('eutopia HTML pins three via import map and loads local module', () => {
  const html = readFileSync(resolve(root, 'public/eutopia/index.html'), 'utf8');
  assert.match(html, /"three":\s*"https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/build\/three\.module\.js"/);
  assert.match(html, /src="\.\/eutopia\.js"/);
  assert.match(html, /type="importmap"/);
  const js = readFileSync(resolve(root, 'public/eutopia/eutopia.js'), 'utf8');
  assert.match(js, /from 'three'/);
  assert.match(js, /from '\.\/beats\.mjs'/);
  assert.doesNotMatch(js, /journey\.js|game\.js|campaign\.mjs/);
});

test('main start screen links Eutopia without rewriting 2D campaign files for story', () => {
  const index = readFileSync(resolve(root, 'public/index.html'), 'utf8');
  assert.match(index, /href="\.\/eutopia\/"/);
  // Campaign modules remain the 2D source of truth — eutopia must not live there.
  const campaign = readFileSync(resolve(root, 'public/content/campaign.mjs'), 'utf8');
  assert.doesNotMatch(campaign, /eutopia|Eutopia|Narrator Sommelier/i);
});
