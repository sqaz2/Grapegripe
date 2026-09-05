// Logic integration only. This is not a browser, renderer, or device benchmark.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { Terrain } from '../public/engine/terrain.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';
import { createAnimator, advanceAnimator, sampleAnimation } from '../public/engine/animation.mjs';
import { heroAtlas } from '../public/engine/hero-atlas.mjs';
import { campaignChapters, chapterById } from '../public/content/campaign.mjs';
import { missionDefinitions, sideviewDefinition } from '../public/content/missions.mjs';
import { applyCampaignEvent, chapterComplete, createCampaignState, nextObjectives, objectiveAvailable } from '../public/engine/campaign.mjs';
import { loadSave, newSave, removeSave, storeSave } from '../public/engine/save.mjs';

export async function loadGame(options = {}) {
  const elements = new Map();
  const drawnImages = [];
  const context = new Proxy({}, { get: (obj, name) => {
    if (name in obj) return obj[name];
    if (String(name).startsWith('create')) return () => ({ addColorStop() {} });
    if (name === 'measureText') return () => ({ width: 80 });
    if (name === 'drawImage') return (image, ...args) => { if (!image) throw new Error('Missing rendered image'); drawnImages.push({ src: image.src, args }); };
    return () => {};
  }});
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, disabled: false, textContent: '', clientWidth: 430, clientHeight: 860,
      style: { setProperty() {} }, dataset: {}, listeners: {}, children: [], attributes: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name]; },
      querySelectorAll() { return []; }, setPointerCapture() {},
      append(child) { this.children.push(child); },
      getContext() { return context; },
      getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; },
    });
    return elements.get(id);
  }
  class AssetImage {
    set src(value) {
      this.source = value; this.naturalWidth = 941; this.naturalHeight = 1672;
      queueMicrotask(() => options.failAssets ? this.onerror() : this.onload());
    }
    get src() { return this.source; }
  }
  let seed = 34;
  const seededMath = Object.create(Math);
  seededMath.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2**32);
  const storage = options.storage || null;
  const scope = {
    Terrain, terrainDefinitions, createAnimator, advanceAnimator, sampleAnimation, heroAtlas,
    campaignChapters, chapterById, missionDefinitions, sideviewDefinition,
    applyCampaignEvent, chapterComplete, createCampaignState, nextObjectives, objectiveAvailable,
    loadSave, newSave, removeSave, storeSave,
    document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ hidden: false, classList: { toggle() {} } }) },
    window: { addEventListener() {} }, navigator: {}, location: { search: options.debug ? '?terrain=1' : '' },
    matchMedia: () => ({ matches: false }), localStorage: {
      getItem(key) { if (!storage) throw new Error('Blocked storage'); return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { if (!storage) throw new Error('Blocked storage'); storage.set(key, String(value)); },
      removeItem(key) { if (!storage) throw new Error('Blocked storage'); storage.delete(key); },
    },
    devicePixelRatio: 2, Image: AssetImage, performance, URLSearchParams, console,
    requestAnimationFrame() {}, setTimeout, clearTimeout, Math: seededMath,
  };
  // Expose functions in this test context only; production has no debug mutation API.
  const source = readFileSync(new URL('../public/journey.js', import.meta.url), 'utf8').replace(/^import .*?;\n/gm, '');
  vm.runInNewContext(source + `\nglobalThis.game = { state, input, regions, sideviewDefinition, boot, resetGame, enterRegion, moveActor, updateMovement, updateEnemies, updateBolts, updateEncounter, update, resize, draw, frame, clearInput, spawnEnemy, hitEnemy, attack, dash, unleashGripe, fireUltimate, completeRegion, pauseGame, resumeGame, openMap, closeMap, chooseUpgrade, finishGame, completeObjective, useContextTarget, updateContextTarget, startSideview, finishSideview, sideviewAction, showContextHelp, dismissContextHelp, toggleGameplayHelp };`, scope);
  await new Promise(setImmediate);
  return { ...scope.game, element, options, drawnImages };
}
