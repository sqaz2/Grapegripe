export const missionDefinitions = Object.freeze({
  root: {
    anchor: [478, 1325],
    props: [
      { id: 'companion-cage', objectiveId: 'root-companion', kind: 'cage', position: [478, 1255], radius: 54 },
      { id: 'relay-west', objectiveId: 'root-relay-west', kind: 'relay', position: [350, 1040], radius: 52 },
      { id: 'relay-east', objectiveId: 'root-relay-east', kind: 'relay', position: [600, 600], radius: 52 },
      { id: 'root-lift', kind: 'lift', position: [486, 320], radius: 54 },
    ],
    encounters: [
      { id: 'root-guard', objectiveId: 'root-guard', position: [445, 680], trigger: 105, types: ['sourling', 'moth', 'brute'] },
    ],
  },
  vineway: {
    anchor: [464, 1450],
    props: [
      { id: 'vineway-fork-left', objectiveId: 'vineway-route', kind: 'route-left', position: [330, 1160], radius: 70, routeChoice: 'long' },
      { id: 'vineway-fork-right', objectiveId: 'vineway-route', kind: 'route-right', position: [610, 1050], radius: 70, routeChoice: 'bridge' },
      { id: 'vineway-passage', objectiveId: 'vineway-passage', kind: 'passage', position: [268, 575], radius: 62 },
      { id: 'vineway-exit', kind: 'lift', position: [501, 270], radius: 54 },
    ],
    encounters: [
      { id: 'vineway-guardian', objectiveId: 'vineway-guardian', position: [527, 849], trigger: 120, types: ['moth', 'moth', 'brute', 'sourling'] },
    ],
  },
  press: {
    anchor: [477, 1240],
    props: [
      { id: 'press-cork', objectiveId: 'press-cork-found', kind: 'cork', position: [477, 1150], radius: 56 },
      { id: 'press-clue-seen', objectiveId: 'press-clue-seen', kind: 'clue-seen', position: [430, 1060], radius: 52 },
      { id: 'press-clue-read', objectiveId: 'press-clue-read', kind: 'clue-read', position: [700, 900], radius: 52 },
      { id: 'press-clue-wanted', objectiveId: 'press-clue-wanted', kind: 'clue-wanted', position: [255, 700], radius: 52 },
      { id: 'press-socket', objectiveId: 'press-cork-delivered', kind: 'socket', position: [477, 760], radius: 62 },
      { id: 'press-vent-west', objectiveId: 'press-vent-west', kind: 'vent', position: [350, 585], radius: 46 },
      { id: 'press-vent-east', objectiveId: 'press-vent-east', kind: 'vent', position: [600, 585], radius: 46 },
      { id: 'press-verdict', objectiveId: 'press-verdict', kind: 'verdict', position: [480, 470], radius: 68 },
      { id: 'press-exit', kind: 'lift', position: [491, 369], radius: 54 },
    ],
    encounters: [
      { id: 'press-ambush', position: [478, 920], trigger: 118, types: ['sourling', 'brute', 'moth'] },
    ],
  },
  sourwood: {
    anchor: [465, 1475],
    props: [
      { id: 'sourwood-creature', objectiveId: 'sourwood-rescue', kind: 'cage', position: [500, 1160], radius: 58 },
      { id: 'sourwood-root', objectiveId: 'sourwood-route', kind: 'relay', position: [600, 1000], radius: 56 },
      { id: 'maw-vent-west', objectiveId: 'sourwood-vent-west', kind: 'vent', position: [400, 650], radius: 48 },
      { id: 'maw-vent-east', objectiveId: 'sourwood-vent-east', kind: 'vent', position: [555, 650], radius: 48 },
      { id: 'sourwood-exit', kind: 'lift', position: [494, 357], radius: 54 },
    ],
    encounters: [
      { id: 'sourwood-thorns', position: [455, 900], trigger: 110, types: ['brute', 'moth', 'sourling'] },
      { id: 'gripe-maw', objectiveId: 'sourwood-maw', position: [489, 500], trigger: 125, types: ['boss'] },
    ],
  },
});

export const sideviewDefinition = Object.freeze({
  width: 3000,
  floor: 590,
  spawn: { x: 110, y: 520 },
  exitX: 2865,
  platforms: [
    { id: 'ground-1', x: 0, y: 590, width: 480, kind: 'stone' },
    { id: 'ground-2', x: 570, y: 565, width: 350, kind: 'stone' },
    { id: 'ground-3', x: 1010, y: 610, width: 325, kind: 'stone' },
    { id: 'ground-4', x: 1430, y: 555, width: 340, kind: 'stone' },
    { id: 'ground-5', x: 1870, y: 600, width: 320, kind: 'stone' },
    { id: 'ground-6', x: 2290, y: 540, width: 300, kind: 'stone' },
    { id: 'ground-7', x: 2690, y: 505, width: 310, kind: 'stone' },
    { id: 'ledge-1', x: 315, y: 445, width: 285, kind: 'vine' },
    { id: 'ledge-2', x: 735, y: 375, width: 255, kind: 'vine' },
    { id: 'ledge-3', x: 1100, y: 455, width: 285, kind: 'vine' },
    { id: 'ledge-4', x: 1520, y: 365, width: 300, kind: 'vine' },
    { id: 'ledge-5', x: 1960, y: 430, width: 285, kind: 'vine' },
    { id: 'ledge-6', x: 2400, y: 350, width: 280, kind: 'vine' },
  ],
  vines: [
    { x: 455, y: 270, length: 300 },
    { x: 875, y: 175, length: 285 },
    { x: 1305, y: 245, length: 300 },
    { x: 1710, y: 165, length: 285 },
    { x: 2150, y: 225, length: 300 },
    { x: 2580, y: 150, length: 280 },
  ],
  receipts: [
    { x: 500, y: 355, tilt: -0.18 },
    { x: 895, y: 285, tilt: 0.14 },
    { x: 1265, y: 350, tilt: -0.1 },
    { x: 1695, y: 270, tilt: 0.2 },
    { x: 2115, y: 325, tilt: -0.16 },
    { x: 2570, y: 255, tilt: 0.12 },
  ],
  flies: [
    { x: 1080, y: 300, range: 82, phase: 0.4 },
    { x: 1850, y: 260, range: 105, phase: 2.1 },
    { x: 2460, y: 235, range: 92, phase: 4.3 },
  ],
  checkpoints: [110, 625, 1065, 1485, 1930, 2360, 2745],
});
