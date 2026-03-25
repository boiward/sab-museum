/**
 * Museum Interior Zone — expanded multi-room exhibition.
 *
 * Map: 40 cols × 32 rows
 *
 * Room layout (low gy = back of building, high gy = entrance):
 *
 *   gy 0-1   : outer wall (back)
 *   gy 2-7   : LEFT WING (gx 1-13) | ROTUNDA (gx 15-24) | RIGHT WING (gx 26-38)
 *   gy 8     : divider wall — doors at gx 4-6, 15-24, 33-35
 *   gy 9-12  : UPPER CORRIDOR (full width)
 *   gy 13-22 : MAIN GALLERY (full width, columns at gy 14 & 21)
 *   gy 23-26 : STAIRCASE LANDING
 *   gy 27    : divider wall — wide door at gx 14-25
 *   gy 28-29 : ENTRY HALL (carpet)
 *   gy 30    : EXIT PORTAL row (gx 16-23 = E)
 *   gy 31    : outer wall (front)
 *
 * Tile key:
 *   'w' museum wall (blocked)   'm' marble (walkable)
 *   'c' carpet (walkable)       'E' exit portal (walkable)
 */

// ── Grid builder ─────────────────────────────────────────────────────────────
function buildGrid() {
  const COLS = 40, ROWS = 32;

  // Start full of walls
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('w'));

  // Shorthand fill helper
  const fill = (gx1, gy1, gx2, gy2, ch) => {
    for (let gy = gy1; gy <= gy2; gy++)
      for (let gx = gx1; gx <= gx2; gx++)
        g[gy][gx] = ch;
  };

  // ── Back rooms (gy 2-7) ─────────────────────────────────────────────────
  fill(1,  2, 13, 7, 'm'); // Left Wing
  fill(15, 2, 24, 7, 'c'); // Rotunda (special carpet)
  fill(26, 2, 38, 7, 'm'); // Right Wing
  // Internal vertical walls between wings (gx 14 and 25) stay 'w' (default)

  // ── Divider wall gy=8 (with 3 doors) ────────────────────────────────────
  fill(4,  8, 6,  8, 'm'); // Left Wing door
  fill(15, 8, 24, 8, 'm'); // Rotunda door (wide)
  fill(33, 8, 35, 8, 'm'); // Right Wing door

  // ── Upper Corridor gy=9-12 (full open width) ─────────────────────────────
  fill(1, 9, 38, 12, 'm');

  // ── Main Gallery gy=13-22 ────────────────────────────────────────────────
  fill(1, 13, 38, 22, 'm');

  // ── Staircase Landing gy=23-26 ───────────────────────────────────────────
  fill(1, 23, 38, 26, 'm');

  // ── Entry Hall divider gy=27 (wide door gx 14-25) ───────────────────────
  fill(14, 27, 25, 27, 'm'); // door opening

  // ── Entry Hall gy=28-29 (carpet) ─────────────────────────────────────────
  fill(1, 28, 38, 29, 'c');

  // ── Exit portal row gy=30 ────────────────────────────────────────────────
  fill(1,  30, 38, 30, 'c'); // carpet base
  fill(16, 30, 23, 30, 'E'); // portal tiles (8 wide, cols 16-23)

  return g.map(row => row.join(''));
}

const tileGrid = buildGrid();

// ── Objects ───────────────────────────────────────────────────────────────────
// Paintings: artworkId must match an entry in data/artworks.json.
// To add more: append here. No other file needs changing.
const objects = [

  // ════ LEFT WING (gx 1-13, gy 2-7) ═══════════════════════════════════════
  // Top wall (near gy=0)
  { id: 'lw_t1', type: 'painting', gx: 3,  gy: 2, artworkId: 'art_01', facing: 'sw' },
  { id: 'lw_t2', type: 'painting', gx: 7,  gy: 2, artworkId: 'art_02', facing: 'sw' },
  { id: 'lw_t3', type: 'painting', gx: 11, gy: 2, artworkId: 'art_03', facing: 'sw' },
  // Left outer wall (near gx=0)
  { id: 'lw_l1', type: 'painting', gx: 1, gy: 3,  artworkId: 'art_04', facing: 'se' },
  { id: 'lw_l2', type: 'painting', gx: 1, gy: 5,  artworkId: 'art_05', facing: 'se' },
  // Right inner wall (near gx=14)
  { id: 'lw_r1', type: 'painting', gx: 13, gy: 3, artworkId: 'art_06', facing: 'sw' },
  { id: 'lw_r2', type: 'painting', gx: 13, gy: 5, artworkId: 'art_07', facing: 'sw' },
  // Bench inside left wing
  { id: 'lw_bench', type: 'bench', gx: 7, gy: 5 },
  // Vases in corners
  { id: 'lw_v1', type: 'vase', gx: 2,  gy: 2 },
  { id: 'lw_v2', type: 'vase', gx: 12, gy: 2 },

  // ════ ROTUNDA — central back room (gx 15-24, gy 2-7) ════════════════════
  // Top wall
  { id: 'ro_t1', type: 'painting', gx: 17, gy: 2, artworkId: 'art_08', facing: 'sw' },
  { id: 'ro_t2', type: 'painting', gx: 20, gy: 2, artworkId: 'art_09', facing: 'sw' },
  { id: 'ro_t3', type: 'painting', gx: 23, gy: 2, artworkId: 'art_10', facing: 'sw' },
  // Left wall (near gx=14)
  { id: 'ro_l1', type: 'painting', gx: 15, gy: 4, artworkId: 'art_11', facing: 'se' },
  // Right wall (near gx=25)
  { id: 'ro_r1', type: 'painting', gx: 24, gy: 4, artworkId: 'art_12', facing: 'sw' },
  // Center bench & vases
  { id: 'ro_bench', type: 'bench', gx: 19, gy: 5 },
  { id: 'ro_v1', type: 'vase', gx: 15, gy: 2 },
  { id: 'ro_v2', type: 'vase', gx: 24, gy: 2 },
  { id: 'ro_v3', type: 'vase', gx: 15, gy: 7 },
  { id: 'ro_v4', type: 'vase', gx: 24, gy: 7 },

  // ════ RIGHT WING (gx 26-38, gy 2-7) ══════════════════════════════════════
  // Top wall
  { id: 'rw_t1', type: 'painting', gx: 28, gy: 2, artworkId: 'art_13', facing: 'sw' },
  { id: 'rw_t2', type: 'painting', gx: 32, gy: 2, artworkId: 'art_14', facing: 'sw' },
  { id: 'rw_t3', type: 'painting', gx: 36, gy: 2, artworkId: 'art_15', facing: 'sw' },
  // Left inner wall (near gx=25)
  { id: 'rw_l1', type: 'painting', gx: 26, gy: 3, artworkId: 'art_16', facing: 'se' },
  { id: 'rw_l2', type: 'painting', gx: 26, gy: 5, artworkId: 'art_17', facing: 'se' },
  // Right outer wall (near gx=39)
  { id: 'rw_r1', type: 'painting', gx: 38, gy: 3, artworkId: 'art_18', facing: 'sw' },
  { id: 'rw_r2', type: 'painting', gx: 38, gy: 5, artworkId: 'art_19', facing: 'sw' },
  // Bench & vases
  { id: 'rw_bench', type: 'bench', gx: 32, gy: 5 },
  { id: 'rw_v1', type: 'vase', gx: 27, gy: 2 },
  { id: 'rw_v2', type: 'vase', gx: 37, gy: 2 },

  // ════ UPPER CORRIDOR (gy 9-12) ════════════════════════════════════════════
  { id: 'uc_l1', type: 'painting', gx: 1,  gy: 10, artworkId: 'art_20', facing: 'se' },
  { id: 'uc_r1', type: 'painting', gx: 38, gy: 10, artworkId: 'art_21', facing: 'sw' },
  { id: 'uc_l2', type: 'painting', gx: 1,  gy: 12, artworkId: 'art_22', facing: 'se' },
  { id: 'uc_r2', type: 'painting', gx: 38, gy: 12, artworkId: 'art_23', facing: 'sw' },
  // Lamp posts along corridor
  { id: 'uc_lamp1', type: 'lamp', gx: 10, gy: 10 },
  { id: 'uc_lamp2', type: 'lamp', gx: 19, gy: 10 },
  { id: 'uc_lamp3', type: 'lamp', gx: 29, gy: 10 },

  // ════ MAIN GALLERY (gy 13-22) ═════════════════════════════════════════════
  // Left outer wall
  { id: 'mg_l1', type: 'painting', gx: 1, gy: 14, artworkId: 'art_24', facing: 'se' },
  { id: 'mg_l2', type: 'painting', gx: 1, gy: 16, artworkId: 'art_25', facing: 'se' },
  { id: 'mg_l3', type: 'painting', gx: 1, gy: 18, artworkId: 'art_26', facing: 'se' },
  { id: 'mg_l4', type: 'painting', gx: 1, gy: 20, artworkId: 'art_27', facing: 'se' },
  // Right outer wall
  { id: 'mg_r1', type: 'painting', gx: 38, gy: 14, artworkId: 'art_28', facing: 'sw' },
  { id: 'mg_r2', type: 'painting', gx: 38, gy: 16, artworkId: 'art_29', facing: 'sw' },
  { id: 'mg_r3', type: 'painting', gx: 38, gy: 18, artworkId: 'art_30', facing: 'sw' },
  { id: 'mg_r4', type: 'painting', gx: 38, gy: 20, artworkId: 'art_31', facing: 'sw' },

  // Marble columns — two rows (gy=14 and gy=21), 4 columns each
  { id: 'col_1',  type: 'column', gx: 8,  gy: 14 },
  { id: 'col_2',  type: 'column', gx: 15, gy: 14 },
  { id: 'col_3',  type: 'column', gx: 24, gy: 14 },
  { id: 'col_4',  type: 'column', gx: 31, gy: 14 },
  { id: 'col_5',  type: 'column', gx: 8,  gy: 21 },
  { id: 'col_6',  type: 'column', gx: 15, gy: 21 },
  { id: 'col_7',  type: 'column', gx: 24, gy: 21 },
  { id: 'col_8',  type: 'column', gx: 31, gy: 21 },

  // Center benches in gallery
  { id: 'mg_b1', type: 'bench', gx: 19, gy: 15 },
  { id: 'mg_b2', type: 'bench', gx: 19, gy: 18 },
  { id: 'mg_b3', type: 'bench', gx: 19, gy: 21 },
  // Lamps
  { id: 'mg_lamp1', type: 'lamp', gx: 4,  gy: 17 },
  { id: 'mg_lamp2', type: 'lamp', gx: 35, gy: 17 },

  // ════ STAIRCASE LANDING (gy 23-26) ════════════════════════════════════════
  // Stair objects going up from gy=26 to gy=23
  { id: 'stair_l', type: 'stair', gx: 12, gy: 24, direction: 'ne' },
  { id: 'stair_c', type: 'stair', gx: 19, gy: 24, direction: 'ne' },
  { id: 'stair_r', type: 'stair', gx: 26, gy: 24, direction: 'ne' },
  // Lamps flanking stairs
  { id: 'sl_lamp1', type: 'lamp', gx: 8,  gy: 25 },
  { id: 'sl_lamp2', type: 'lamp', gx: 30, gy: 25 },
  // Vases on landing
  { id: 'sl_v1', type: 'vase', gx: 5,  gy: 24 },
  { id: 'sl_v2', type: 'vase', gx: 33, gy: 24 },

  // ════ ENTRY HALL (gy 28-29) ════════════════════════════════════════════════
  // Paintings on divider wall (near gy=27)
  { id: 'eh_t1', type: 'painting', gx: 4,  gy: 28, artworkId: 'art_32', facing: 'sw' },
  { id: 'eh_t2', type: 'painting', gx: 10, gy: 28, artworkId: 'art_33', facing: 'sw' },
  { id: 'eh_t3', type: 'painting', gx: 29, gy: 28, artworkId: 'art_34', facing: 'sw' },
  { id: 'eh_t4', type: 'painting', gx: 35, gy: 28, artworkId: 'art_35', facing: 'sw' },
  // Benches in entry hall
  { id: 'eh_b1', type: 'bench', gx: 7,  gy: 29 },
  { id: 'eh_b2', type: 'bench', gx: 32, gy: 29 },
  // Lamps
  { id: 'eh_lamp1', type: 'lamp', gx: 2,  gy: 29 },
  { id: 'eh_lamp2', type: 'lamp', gx: 37, gy: 29 },
  // Welcome vases flanking exit portal
  { id: 'eh_v1', type: 'vase', gx: 14, gy: 29 },
  { id: 'eh_v2', type: 'vase', gx: 25, gy: 29 },

  // ════ EXIT PORTAL visual markers ═══════════════════════════════════════════
  ...([16, 17, 18, 19, 20, 21, 22, 23].map(gx => ({
    id: `portal_exit_${gx}`, type: 'portal', gx, gy: 30,
  }))),
];

// ── Portals ───────────────────────────────────────────────────────────────────
const portals = [
  ...[16, 17, 18, 19, 20, 21, 22, 23].map(gx => ({
    gx,
    gy:         30,
    targetZone: 'exterior',
    spawnX:     15,
    spawnY:     4,
  })),
];

export const museumZone = {
  id:          'museum',
  name:        'Museo SAB — Galería Principal',
  bgColor:     '#12101a',
  cols:        40,
  rows:        32,
  playerStart: { x: 19, y: 29 },
  tileGrid,
  objects,
  portals,
};
