/**
 * InteractionSystem — proximity-based interaction with paintings.
 *
 * Each frame, scans tiles within RADIUS of the player for a 'painting' object.
 * Shows/hides an on-screen hint. Fires viewer.show() when player presses E
 * or double-clicks on/near the painting.
 */
const RADIUS = 1; // tiles around player to check

export class InteractionSystem {
  constructor(objectManager, photoViewer, artworksMap) {
    this._objects   = objectManager;
    this._viewer    = photoViewer;
    this._artworks  = artworksMap; // Map<artworkId, artworkData>
    this._hintEl    = document.getElementById('interaction-hint');
    this._nearPainting = null;
  }

  /** Call each frame after player position is settled. */
  update(playerGx, playerGy) {
    if (this._viewer.isOpen) return;

    let found = null;
    outer:
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const obj = this._objects.getAt(playerGx + dx, playerGy + dy);
        if (obj?.type === 'painting') { found = obj; break outer; }
      }
    }

    if (found !== this._nearPainting) {
      this._nearPainting = found;
      if (found) {
        this._hintEl.textContent = '[ E ]  Ver obra';
        this._hintEl.classList.add('visible');
      } else {
        this._hintEl.classList.remove('visible');
      }
    }
  }

  /** Call on E keypress — interacts with the nearest painting. */
  interactWithNearest() {
    if (!this._nearPainting) return;
    this._openPainting(this._nearPainting);
  }

  /**
   * Call when the player clicks on a tile (gx, gy).
   * If a painting is within radius of the click, opens it.
   * Returns true if an interaction was triggered.
   */
  tryInteractAt(gx, gy) {
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const obj = this._objects.getAt(gx + dx, gy + dy);
        if (obj?.type === 'painting') {
          this._openPainting(obj);
          return true;
        }
      }
    }
    return false;
  }

  /** Replace the artworks map (e.g. after async load). */
  setArtworks(artworksMap) {
    this._artworks = artworksMap;
  }

  // ── private ────────────────────────────────────────────────────────────

  _openPainting(paintingObj) {
    const artwork = this._artworks.get(paintingObj.artworkId);
    if (artwork) {
      this._viewer.show(artwork);
    } else {
      // Show placeholder if artwork not yet configured
      this._viewer.show({
        title:       paintingObj.artworkId ?? 'Obra sin título',
        description: 'Agrega la imagen y descripción en data/artworks.json',
        image:       null,
      });
    }
  }

  /** Returns the currently highlighted painting (or null). Used by Renderer. */
  get nearPainting() { return this._nearPainting; }
}
