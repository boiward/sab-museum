/**
 * GameMap — holds the tile grid.
 * Each tile: { walkable: bool, type: string }
 *
 * Tile type → rendering colour is defined in Renderer.js (TILE_COLORS).
 * To add a new tile type: add the char to a zone's tileGrid and add its
 * colour to TILE_COLORS in Renderer.js. No changes needed here.
 */
export class GameMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = this._buildEmpty(cols, rows);
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  /**
   * Build a GameMap from a zone definition object.
   *
   * Zone's tileGrid is an array of strings (one per row).
   * Each character maps to a tile type via TILE_CHARS below.
   */
  static fromZone(zone) {
    const map = new GameMap(zone.cols, zone.rows);
    const rows = zone.tileGrid;

    for (let gy = 0; gy < rows.length && gy < zone.rows; gy++) {
      const row = rows[gy];
      for (let gx = 0; gx < row.length && gx < zone.cols; gx++) {
        map.grid[gy][gx] = GameMap._charToTile(row[gx]);
      }
    }

    return map;
  }

  /** Maps a single tileGrid character to a tile definition. */
  static _charToTile(char) {
    const CHARS = {
      ' ': { walkable: true,  type: 'grass'      },
      'F': { walkable: true,  type: 'flower'     },
      '.': { walkable: true,  type: 'path'       },
      'E': { walkable: true,  type: 'entrance'   },
      'm': { walkable: true,  type: 'marble'     },
      'c': { walkable: true,  type: 'carpet'     },
      'W': { walkable: false, type: 'wall'       },
      'w': { walkable: false, type: 'museumwall'  },
      '~': { walkable: false, type: 'water'      },
      'T': { walkable: false, type: 'grass'      }, // tree — tile is grass, object is separate
      'B': { walkable: false, type: 'grass'      }, // bush — same pattern
    };
    return { ...(CHARS[char] ?? CHARS[' ']) };
  }

  // ── Instance API ───────────────────────────────────────────────────────────

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.grid[y][x];
  }

  setTile(x, y, props) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    Object.assign(this.grid[y][x], props);
  }

  isWalkable(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.walkable : false;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _buildEmpty(cols, rows) {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ walkable: true, type: 'grass' }))
    );
  }
}
