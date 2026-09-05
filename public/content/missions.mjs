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
      { id: 'press-socket', objectiveId: 'press-cork-delivered', kind: 'socket', position: [477, 760], radius: 62 },
      { id: 'press-vent-west', objectiveId: 'press-vent-west', kind: 'vent', position: [350, 585], radius: 46 },
      { id: 'press-vent-east', objectiveId: 'press-vent-east', kind: 'vent', position: [600, 585], radius: 46 },
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
  width: 1800,
  floor: 590,
  spawn: { x: 110, y: 520 },
  exitX: 1690,
  platforms: [
    { x: 0, y: 590, width: 510 },
    { x: 600, y: 570, width: 360 },
    { x: 1015, y: 610, width: 360 },
    { x: 1440, y: 530, width: 360 },
  ],
  checkpoints: [110, 650, 1065, 1490],
});
