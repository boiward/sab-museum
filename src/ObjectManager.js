/**
 * ObjectManager — stores and retrieves all world objects.
 *
 * Object shape (minimum):
 *   { id: string, type: string, gx: number, gy: number, ...extraFields }
 *
 * Supported types:
 *   'tree'     — decorative tree, rendered tall
 *   'bush'     — small decorative bush
 *   'bench'    — sitting bench
 *   'lamp'     — lamp post with glow
 *   'painting' — interactive artwork frame  (requires artworkId)
 *   'portal'   — animated zone-transition indicator
 *
 * Adding new types later: just add an object with the new type string
 * and add a matching draw case in Renderer._drawObject().
 */
export class ObjectManager {
  constructor() {
    this._byId   = new Map(); // id -> object
    this._byTile = new Map(); // 'gx,gy' -> id
  }

  add(obj) {
    if (this._byId.has(obj.id)) this.remove(obj.id);
    this._byId.set(obj.id, { ...obj });
    this._byTile.set(`${obj.gx},${obj.gy}`, obj.id);
    return this._byId.get(obj.id);
  }

  remove(id) {
    const obj = this._byId.get(id);
    if (!obj) return;
    this._byTile.delete(`${obj.gx},${obj.gy}`);
    this._byId.delete(id);
  }

  getById(id)    { return this._byId.get(id) ?? null; }

  getAt(gx, gy) {
    const id = this._byTile.get(`${gx},${gy}`);
    return id ? this._byId.get(id) : null;
  }

  /** Returns objects sorted back-to-front for painter's algorithm. */
  allSorted() {
    return [...this._byId.values()].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  }

  clear() {
    this._byId.clear();
    this._byTile.clear();
  }

  /**
   * Load from a zone's objects array.
   * Any 'T' (tree) tiles in the map grid are also auto-converted to objects
   * by the zone loader in ZoneManager — this just handles explicit objects.
   */
  loadFromZone(objectsArray = []) {
    this.clear();
    for (const obj of objectsArray) this.add(obj);
  }
}
