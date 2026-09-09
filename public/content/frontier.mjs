// The Grand Vintage chapter: a grape's ambition, a town, and useful expeditions.
import { sideviewDefinition as vineRoute } from './missions.mjs';
const floor = (points, width, height) => points.map(([x,y]) => [x / 1448 * width, y / 1086 * height]);

export const rangerMaps = Object.freeze({
  town: { id: 'town', name: 'Bunchborough', subtitle: 'Small grapes. Enormous ambitions.', image: 'town', width: 3200, height: 2400, spawn: [1600, 1770], color: '#d9ff45',
    outer: floor([[420,260],[510,210],[622,240],[787,233],[912,219],[1020,305],[1130,364],[1290,416],[1290,454],[1440,467],[1440,526],[1290,538],[1140,666],[1010,821],[995,900],[910,900],[842,950],[815,1080],[650,1080],[640,957],[585,900],[480,784],[442,691],[337,671],[234,563],[168,543],[8,525],[8,474],[180,459],[297,389],[384,367],[434,300]],3200,2400), holes: [],
    people: [
      { id: 'registrar', name: 'Ranger Ruby', role: 'Grand Vintage registrar', at: [1530,1180], hue: 0, icon: '★' },
      { id: 'post', name: 'Pip', role: 'Vine post', at: [900,1370], hue: 55, icon: '✉' },
      { id: 'smith', name: 'Corky', role: 'Ranger equipment', at: [2310,1260], hue: 135, icon: '⚒' },
      { id: 'gardener', name: 'Tansy', role: 'Irrigation keeper', at: [1950,1770], hue: 80, icon: '♧' },
      { id: 'elder', name: 'Sir Raisin', role: 'Retired candidate', at: [1280,1800], hue: 240, icon: '…' },
    ],
    places: [
      { id: 'terraces-gate', kind: 'gate', name: 'Sunlit Terraces', at: [260,1105], to: 'terraces', icon: '↗' },
      { id: 'fair-gate', kind: 'gate', name: 'Harvest Fair', at: [3040,1100], to: 'fair', icon: '↗' },
      { id: 'town-rest', kind: 'rest', name: 'Fountain · recover', at: [1110,1760], icon: '+' },
    ], encounters: [],
  },
  terraces: { id: 'terraces', name: 'Sunlit Terraces', subtitle: 'Take the scenic root.', image: 'terraces', width: 3600, height: 2700, spawn: [2900,1450], color: '#ffcd54',
    outer: floor([[350,270],[510,260],[580,160],[660,8],[734,8],[755,238],[856,274],[1050,277],[1200,317],[1238,434],[1440,446],[1440,573],[1272,587],[1159,657],[1040,712],[829,718],[750,840],[723,1080],[590,1080],[598,892],[541,766],[438,660],[237,588],[8,558],[8,479],[185,431],[276,350]],3600,2700), holes: [floor([[349,366],[411,329],[490,342],[551,392],[549,438],[477,474],[401,461],[346,422]],3600,2700),floor([[851,343],[951,301],[1030,339],[1090,406],[1070,454],[957,480],[869,441]],3600,2700)],
    people: [
      { id: 'scout', name: 'Ranger Véra', role: 'Canopy lookout', at: [2900,900], hue: 175, icon: '⌁' },
      { id: 'grower', name: 'Merle', role: 'A very proud table grape', at: [1920,1900], hue: 295, icon: '…' },
    ],
    places: [
      { id: 'town-gate', kind: 'gate', name: 'Bunchborough', at: [3220,1340], to: 'town', icon: '⌂' },
      { id: 'canopy-entry', kind: 'expedition', name: 'Canopy Post · vine delivery', at: [1740,850], route: 'canopy', icon: '⌁' },
      { id: 'aqueduct-entry', kind: 'expedition', name: 'Bottle Aqueduct · aroma trail', at: [1460,2100], route: 'aqueduct', icon: '⌁' },
      { id: 'sprayer', kind: 'collect', name: 'Corkscatter parts', at: [630,1000], flag: 'sprayer-found', guard: 'sprayer-guard', icon: '⚒' },
      { id: 'water-west', kind: 'switch', name: 'West irrigation valve', at: [780,1390], flag: 'water-west', icon: '◉' },
      { id: 'water-east', kind: 'switch', name: 'East irrigation valve', at: [2730,1510], flag: 'water-east', icon: '◉' },
      { id: 'terrace-rest', kind: 'rest', name: 'Spring · recover', at: [2410,1410], icon: '+' },
      { id: 'terrace-cache', kind: 'cache', name: 'Ranger cache', at: [1410,1900], flag: 'terrace-cache', icon: '◆' },
    ],
    encounters: [
      { id: 'sprayer-guard', at: [730,1130], types: ['brute','moth','sourling'] },
      { id: 'west-moths', at: [1190,1510], types: ['moth','moth'] },
      { id: 'north-thorns', at: [2920,1180], types: ['brute','sourling'] },
    ],
  },
  fair: { id: 'fair', name: 'Harvest Fair', subtitle: 'Excellent wine starts with a little nerve.', image: 'fair', width: 3200, height: 2400, spawn: [520,1330], color: '#ff8ec7',
    outer: floor([[330,310],[515,270],[705,275],[925,294],[1092,362],[1224,462],[1301,590],[1271,740],[1123,883],[875,957],[581,934],[384,849],[260,689],[170,625],[8,610],[8,530],[171,527],[226,405]],3200,2400), holes: [],
    people: [
      { id: 'judge', name: 'Ranger Rosé', role: 'Footwork steward', at: [1500,1410], hue: 320, icon: '★' },
      { id: 'blender', name: 'Madame Merlot', role: 'Grand Vintage selector', at: [2540,1120], hue: 30, icon: '♜' },
      { id: 'rival', name: 'Chadonnay', role: 'Already rehearsing his tasting notes', at: [950,1800], hue: 110, icon: '…' },
    ],
    places: [
      { id: 'fair-town', kind: 'gate', name: 'Bunchborough', at: [310,1280], to: 'town', icon: '⌂' },
      { id: 'fair-rest', kind: 'rest', name: 'Refreshment stand', at: [2280,1850], icon: '+' },
      { id: 'fair-cache', kind: 'cache', name: 'Lost tips', at: [2490,1800], flag: 'fair-cache', icon: '◆' },
    ], encounters: [],
  },
});

export const rangerJobs = Object.freeze([
  { id: 'courier', giver: 'post', name: 'Neither rain nor raisins', goal: 'Finish Canopy Post, deliver the parcel to Véra, then return to Pip.', needs: ['parcel-delivered'], stamp: 'character', reward: 30, gear: 'courier-boots', quote: 'It is one letter. Please stop calling it your cargo.' },
  { id: 'craft', giver: 'smith', name: 'Under pressure', goal: 'Recover the Corkscatter parts in the western terraces. Bring them to Corky.', needs: ['sprayer-found'], stamp: 'craft', reward: 25, gear: 'corkscatter', quote: 'Made from a cork. Resolves things normally left bottled up.' },
  { id: 'aroma', giver: 'scout', name: 'High notes', goal: 'Collect three aroma tags in Bottle Aqueduct and reach its exit. Return to Véra.', needs: ['aroma-returned'], stamp: 'aroma', reward: 35, gear: null, quote: 'The judges want complexity. I have been having a very complicated morning.' },
  { id: 'water', giver: 'gardener', name: 'A little less dry', goal: 'Open both irrigation valves in the terraces, then return to Tansy.', needs: ['water-west','water-east'], stamp: null, reward: 25, gear: null, quote: 'Dry wine: fashionable. Dry vineyard: a plumbing problem.' },
]);

export const rangerWeapons = Object.freeze({
  seedshot: { name: 'Seedshot', description: 'Quick, accurate three-shot combo.', icon: '•', price: 0 },
  corkscatter: { name: 'Corkscatter', description: 'Three corks in a wide close-range burst.', icon: '⋔', price: 0 },
  pruningLance: { name: 'Pruning lance', description: 'A slower long shot that pierces three pests.', icon: '↟', price: 55 },
});
export const selectionStamps = Object.freeze(['character','craft','aroma','footwork']);
export const frontierFlags = Object.freeze(['intro-seen','canopy-crossed','parcel-delivered','aroma-returned','sprayer-found','water-west','water-east','terrace-cache','fair-cache']);
export const rangerEncounterIds = Object.freeze(Object.values(rangerMaps).flatMap((map) => map.encounters.map((encounter) => encounter.id)));

const stretchRoute = (factor, lift = 0) => ({
  ...vineRoute, width: Math.round(vineRoute.width * factor), exitX: Math.round(vineRoute.exitX * factor),
  spawn: { ...vineRoute.spawn },
  platforms: vineRoute.platforms.map((p) => ({ ...p, x: Math.round(p.x * factor), width: Math.round(p.width * factor), y: p.y - (p.kind === 'vine' ? lift : 0) })),
  vines: vineRoute.vines.map((v) => ({ ...v, x: Math.round(v.x * factor), y: v.y - lift })),
  receipts: vineRoute.receipts.map((r) => ({ ...r, x: Math.round(r.x * factor), y: r.y - lift })),
  flies: vineRoute.flies.map((f) => ({ ...f, x: Math.round(f.x * factor), y: f.y - lift })),
  checkpoints: vineRoute.checkpoints.map((x) => Math.round(x * factor)),
});
export const rangerExpeditions = Object.freeze({
  canopy: { ...stretchRoute(1.1), id: 'canopy', name: 'Canopy Post', goal: 'Carry Pip’s letter over the vines to Ranger Véra.', destination: 'terraces', arrival: [2790,960], requiredTags: 0 },
  aqueduct: { ...stretchRoute(1.2, 25), id: 'aqueduct', name: 'Bottle Aqueduct', goal: 'Collect 3 aroma tags, then reach the far end.', destination: 'fair', arrival: [700,1540], requiredTags: 3 },
});
