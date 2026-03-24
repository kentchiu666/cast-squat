import type { TrackDef } from '../types'

export const jungleLoopTrack: TrackDef = {
  id: 'jungle_loop',
  name: 'Jungle Loop',
  controlPoints: [
    { x: 0,    z: 0 },
    { x: 0,    z: -400 },
    { x: 100,  z: -700 },
    { x: 400,  z: -800 },
    { x: 600,  z: -500 },
    { x: 500,  z: -200 },
    { x: 300,  z: 0 },
    { x: 400,  z: 300 },
    { x: 200,  z: 400 },
    { x: 0,    z: 200 },
  ],
  roadHalfWidthTiles: 5,
  objectPlacement: {
    treeSpacing: 80,
    laneOffsetMin: 60,
    laneOffsetMax: 150,
    buildingPositions: [0.3],
  },
}
