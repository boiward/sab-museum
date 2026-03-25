/**
 * Exterior Zone — Park and garden leading to the museum entrance.
 *
 * Tile key (each character = one tile, 32 chars per row, 28 rows):
 *   ' '  grass     walkable
 *   '.'  path      walkable  (stone)
 *   'W'  wall      blocked   (museum building exterior)
 *   '~'  water     blocked   (fountain basin)
 *   'T'  tree      blocked   (auto-converted to tree object by ZoneManager)
 *   'E'  entrance  walkable  (portal trigger → museum interior)
 *   'F'  flower    walkable  (decorative garden beds)
 *   'B'  bush      blocked   (auto-converted to bush object)
 *
 * Map: 32 columns × 28 rows
 * Player starts at (15, 25) on the central path.
 * Museum entrance portal covers gx=13..18, gy=2.
 *
 * To expand: increase cols/rows, extend tileGrid rows accordingly,
 * adjust playerStart if needed, and add/move portals in the portals array.
 */

// Each string must be exactly 32 characters.
const tileGrid = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // gy=0  museum back wall
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // gy=1  museum front wall
  'WWWWWWWWWWWWWEEEEEEWWWWWWWWWWWWW', // gy=2  entrance portal (cols 13-18)
  'TTTTTTTTTTTTT......TTTTTTTTTTTTT', // gy=3  dense trees near museum
  'T           T......T           T', // gy=4
  'T  T        T......T        T  T', // gy=5
  'T    TT     T......T     TT    T', // gy=6
  'T   F       T......T       F   T', // gy=7
  'T           T......T           T', // gy=8
  'T   F       T......T       F   T', // gy=9
  'T   ~~~~    T......T    ~~~~   T', // gy=10 fountain left & right
  'T  ~~~~~~   T......T   ~~~~~~  T', // gy=11
  'T   ~~~~    T......T    ~~~~   T', // gy=12
  'T   F       T......T       F   T', // gy=13
  'T           T......T           T', // gy=14
  'T  T        T......T        T  T', // gy=15
  'T    TT     T......T     TT    T', // gy=16
  'T   F       T......T       F   T', // gy=17
  'T           T......T           T', // gy=18
  'T  T        T......T        T  T', // gy=19
  'T           T......T           T', // gy=20
  'T   F  T    T......T    T  F   T', // gy=21
  'T           T......T           T', // gy=22
  'T  T        T......T        T  T', // gy=23
  '             ......             ', // gy=24 entry plaza (open)
  '             ......             ', // gy=25 player spawn
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // gy=26 bottom tree border
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // gy=27 bottom solid wall
];

/** Portal tiles: all 6 entrance columns at gy=2 lead to the museum. */
const portals = [13, 14, 15, 16, 17, 18].map(gx => ({
  gx,
  gy:         2,
  targetZone: 'museum',
  spawnX:     15,
  spawnY:     24,
}));

/** Explicit non-tree objects in this zone. */
const objects = [
  // Benches flanking the central path
  { id: 'bench_l1', type: 'bench', gx: 11, gy: 8  },
  { id: 'bench_r1', type: 'bench', gx: 20, gy: 8  },
  { id: 'bench_l2', type: 'bench', gx: 11, gy: 18 },
  { id: 'bench_r2', type: 'bench', gx: 20, gy: 18 },

  // Lamp posts along the path
  { id: 'lamp_l1', type: 'lamp', gx: 12, gy: 5  },
  { id: 'lamp_r1', type: 'lamp', gx: 19, gy: 5  },
  { id: 'lamp_l2', type: 'lamp', gx: 12, gy: 13 },
  { id: 'lamp_r2', type: 'lamp', gx: 19, gy: 13 },
  { id: 'lamp_l3', type: 'lamp', gx: 12, gy: 21 },
  { id: 'lamp_r3', type: 'lamp', gx: 19, gy: 21 },

  // Portal visual markers at museum entrance
  ...([13, 14, 15, 16, 17, 18].map(gx => ({
    id:   `portal_ext_${gx}`,
    type: 'portal',
    gx,
    gy:   2,
  }))),
];

export const exteriorZone = {
  id:          'exterior',
  name:        'Jardín del Museo SAB',
  bgColor:     '#0d1f0d',
  cols:        32,
  rows:        28,
  playerStart: { x: 15, y: 25 },
  tileGrid,
  objects,
  portals,
};
