import type { ThemeDef } from '../types'

export const jungleTheme: ThemeDef = {
  id: 'jungle',
  name: 'Jungle',
  sky: {
    top: '#1a1040',
    bottom: '#1a5535',
    mountainDark: '#0e2a16',
    mountainLight: '#1a3a22',
  },
  tileColors: {
    grassA: [20, 90, 25, 255],
    grassB: [35, 110, 35, 255],
    road: [170, 150, 110, 255],
    roadEdge: [230, 210, 60, 255],
    building: [180, 70, 70, 255],
    roadCenter: [255, 255, 200, 255],
  },
  fogColor: [20, 70, 40],
  lightRays: {
    color: '#ffee88',
    rayCount: 7,
    walkAlpha: 0.1,
    runAlphaMin: 0.05,
    runAlphaMax: 0.2,
    flickerSpeed: 0.025,
  },
  sprites: {
    treeDark: { primary: '#2a1a08', secondary: '#1a5518', tertiary: '#1a6a20' },
    treeLight: { primary: '#3a2a10', secondary: '#2a6a28', tertiary: '#3a8a35' },
    bush: { primary: '#1a5520', secondary: '#30783a' },
    rock: { primary: '#5a5a58', secondary: '#707068' },
    building: {
      body: '#6a5a48',
      roof: '#a04030',
      roofDark: '#7a2a1a',
      door: '#4a3a28',
      window: '#ffe86d',
    },
  },
  minimap: {
    trackColor: '#8a7a5a',
    playerColor: '#95e86b',
    directionColor: '#ffffff',
  },
  clouds: {
    count: 4,
    minSpeed: 0.3,
    maxSpeed: 0.7,
    color: '#2a5a3a',
    shadowColor: '#1a3a22',
  },
  particles: {
    count: 10,
    color: '#ccff88',
    minAlpha: 0.15,
    maxAlpha: 0.6,
    pulseSpeed: 0.03,
  },
}
