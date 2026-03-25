import { GameMap } from './Map.js';

/**
 * ZoneManager — registers zones and triggers transitions.
 *
 * Zone definition shape:
 * {
 *   id:          string,
 *   name:        string,          // display name shown in HUD
 *   bgColor:     string,          // CSS background color
 *   cols:        number,
 *   rows:        number,
 *   playerStart: { x, y },        // default spawn point
 *   tileGrid:    string[],        // raw row strings (decoded by GameMap)
 *   objects:     Object[],        // { id, type, gx, gy, ...data }
 *   portals:     Portal[],        // { gx, gy, targetZone, spawnX, spawnY }
 * }
 *
 * To add a new zone:
 *   1. Create src/zones/myZone.js exporting a zone object.
 *   2. In Game.js, import it and call zoneManager.register(myZone).
 *   3. Add a portal in another zone pointing to it.
 */
export class ZoneManager {
  constructor() {
    this._zones            = new Map();
    this.currentZoneId     = null;
    this._transitionCb     = null;
  }

  /** Register a zone definition. Safe to call multiple times. */
  register(zone) {
    this._zones.set(zone.id, zone);
  }

  get current() { return this._zones.get(this.currentZoneId) ?? null; }
  getZone(id)   { return this._zones.get(id) ?? null; }

  /** Set callback: (targetZoneId, spawnX, spawnY) => void */
  onTransition(callback) { this._transitionCb = callback; }

  /**
   * Call this every time the player settles on a new tile.
   * If the tile is a portal, fires the transition callback.
   */
  checkPortal(gx, gy) {
    const zone = this.current;
    if (!zone?.portals) return;
    const portal = zone.portals.find(p => p.gx === gx && p.gy === gy);
    if (portal && this._transitionCb) {
      this._transitionCb(portal.targetZone, portal.spawnX, portal.spawnY);
    }
  }

  /**
   * Build a GameMap from a zone definition.
   * Also auto-generates tree objects from 'T' tiles in the grid.
   * Returns { map, treeObjects }
   */
  buildMap(zone) {
    const map         = GameMap.fromZone(zone);
    const treeObjects = [];
    const treeRows    = zone.tileGrid;

    for (let gy = 0; gy < treeRows.length; gy++) {
      const row = treeRows[gy];
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === 'T') {
          treeObjects.push({ id: `tree_${gx}_${gy}`, type: 'tree', gx, gy });
        }
        if (row[gx] === 'B') {
          treeObjects.push({ id: `bush_${gx}_${gy}`, type: 'bush', gx, gy });
        }
      }
    }

    return { map, treeObjects };
  }
}
