import { Character }          from './Character.js';
import { Renderer }           from './Renderer.js';
import { Camera }             from './Camera.js';
import { ObjectManager }      from './ObjectManager.js';
import { ZoneManager }        from './ZoneManager.js';
import { PhotoViewer }        from './PhotoViewer.js';
import { InteractionSystem }  from './InteractionSystem.js';
import { screenToGrid }       from './utils.js';

import { exteriorZone }       from './zones/exterior.js';
import { museumZone }         from './zones/museum.js';

export class Game {
  constructor(canvas) {
    this.canvas   = canvas;
    this.renderer = new Renderer(canvas);
    this.camera   = new Camera();

    this.objectManager  = new ObjectManager();
    this.zoneManager    = new ZoneManager();
    this.photoViewer    = new PhotoViewer();

    this._artworks      = new Map();   // artworkId -> artwork data
    this._imageCache    = new Map();   // artworkId -> HTMLImageElement

    this.interactionSystem = new InteractionSystem(
      this.objectManager,
      this.photoViewer,
      this._artworks,
    );

    this.map        = null;
    this.player     = null;
    this.characters = [];

    this.cursor     = { x: 0, y: 0, alpha: 0 };

    this._lastTime  = null;
    this._animFrame = null;
    this._transitioning = false; // guard against double-trigger
    this._characterSelected = false; // blocks input until character is chosen
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async init() {
    this.renderer.resize();

    // Register all zones
    this.zoneManager.register(exteriorZone);
    this.zoneManager.register(museumZone);

    // Set up zone transition callback
    this.zoneManager.onTransition((targetZoneId, spawnX, spawnY) => {
      if (!this._transitioning) this._enterZone(targetZoneId, spawnX, spawnY);
    });

    // Load artworks metadata
    await this._loadArtworks();

    // Start in the exterior zone (game runs in background while selector shows)
    this._enterZone('exterior');

    this._bindEvents();
    this._loop(performance.now());

    // Show character selector on top
    this._showCharacterSelector();
  }

  // ── Character selector ─────────────────────────────────────────────────────

  _showCharacterSelector() {
    const overlay = document.getElementById('char-select');
    if (!overlay) return;

    // Render previews into each mini canvas
    const previews = overlay.querySelectorAll('.char-preview-canvas');
    previews.forEach(canvas => {
      this.renderer.drawCharacterPreview(canvas, canvas.dataset.style);
    });

    // Bind card clicks
    const cards = overlay.querySelectorAll('.char-card');
    cards.forEach(card => {
      card.addEventListener('click', () => this._selectCharacter(card.dataset.style));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') this._selectCharacter(card.dataset.style);
      });
    });
  }

  _selectCharacter(style) {
    if (!this.player) return;
    this.player.characterStyle = style;
    this.player.name = style === 'sabibi' ? 'Sabibi' : 'Edwdw';
    this._characterSelected = true;

    const overlay = document.getElementById('char-select');
    if (overlay) overlay.classList.add('hidden');
  }

  // ── Zone loading ───────────────────────────────────────────────────────────

  _enterZone(zoneId, spawnX, spawnY) {
    this._transitioning = true;

    const zone = this.zoneManager.getZone(zoneId);
    if (!zone) { console.warn(`Zone "${zoneId}" not registered.`); return; }

    this.zoneManager.currentZoneId = zoneId;

    // Build map from zone grid
    const { map, treeObjects } = this.zoneManager.buildMap(zone);
    this.map = map;

    // Load objects (trees auto-generated + explicit objects)
    this.objectManager.loadFromZone([...treeObjects, ...zone.objects]);

    // Cache images for paintings in this zone
    this._cacheZoneImages(zone);

    // Determine spawn position
    const sx = spawnX ?? zone.playerStart.x;
    const sy = spawnY ?? zone.playerStart.y;

    // Create or reposition player
    if (!this.player) {
      this.player = new Character('player', sx, sy, '#4ecdc4');
      this.player.characterStyle = 'edwdw'; // Edwdw — gray coat, glasses, dark hair
      this.player.name = 'Edwdw';
      this.characters = [this.player];
    } else {
      this.player.gx = sx;
      this.player.gy = sy;
      this.player.path   = [];
      this.player.moving = false;
    }

    // Snap camera instantly (no lerp on zone transition)
    this.camera.snapTo(sx, sy, this.canvas.width, this.canvas.height);
    this.player.snapToGrid(); // world-space, no camera arg needed

    // Update HUD zone name
    const nameEl = document.getElementById('zone-name');
    if (nameEl) nameEl.textContent = zone.name;

    // Update body background
    document.body.style.backgroundColor = zone.bgColor ?? '#0d1f0d';

    // Brief guard so rapid portal re-entry doesn't trigger twice
    setTimeout(() => { this._transitioning = false; }, 600);
  }

  // ── Artwork loading ────────────────────────────────────────────────────────

  async _loadArtworks() {
    try {
      const res  = await fetch('data/artworks.json');
      const data = await res.json();
      for (const art of data.artworks ?? []) {
        this._artworks.set(art.id, art);
      }
      this.interactionSystem.setArtworks(this._artworks);
    } catch (e) {
      console.warn('Could not load artworks.json — paintings will show placeholders.', e);
    }
  }

  /** Pre-load images for all paintings in a zone so they draw immediately. */
  _cacheZoneImages(zone) {
    for (const obj of zone.objects) {
      if (obj.type !== 'painting' || !obj.artworkId) continue;
      if (this._imageCache.has(obj.artworkId)) {
        // Attach to the live object in ObjectManager
        this._attachCachedImage(obj.artworkId);
        continue;
      }
      const artwork = this._artworks.get(obj.artworkId);
      if (!artwork?.image) continue;

      const img = new Image();
      img.src   = artwork.image;
      img.onload = () => this._attachCachedImage(obj.artworkId);
      this._imageCache.set(obj.artworkId, img);
    }
  }

  _attachCachedImage(artworkId) {
    const img = this._imageCache.get(artworkId);
    if (!img) return;
    // Find the matching painting object and attach the image reference
    for (const obj of this.objectManager.allSorted()) {
      if (obj.type === 'painting' && obj.artworkId === artworkId) {
        obj._cachedImage = img;
      }
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.camera.onResize(
        this.player.gx, this.player.gy,
        this.canvas.width, this.canvas.height,
      );
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this._characterSelected) return;
      if (this.photoViewer.isOpen) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const grid = screenToGrid(mx, my, this.camera.offsetX, this.camera.offsetY);

      // Try interaction first (double-click equivalent — single click opens nearby paintings)
      const interacted = this.interactionSystem.tryInteractAt(grid.x, grid.y);
      if (interacted) return;

      // Otherwise move player
      if (!this.map.isWalkable(grid.x, grid.y)) return;

      this.cursor = { x: grid.x, y: grid.y, alpha: 1 };
      this.player.moveTo(grid.x, grid.y, this.map);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const grid = screenToGrid(mx, my, this.camera.offsetX, this.camera.offsetY);
      const coordEl = document.getElementById('coords');
      if (coordEl) coordEl.textContent = `(${grid.x}, ${grid.y})`;
    });

    // E key = interact
    window.addEventListener('keydown', (e) => {
      if (!this._characterSelected) return;
      if (e.key === 'e' || e.key === 'E') {
        this.interactionSystem.interactWithNearest();
      }
    });
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  _loop(timestamp) {
    const dt = this._lastTime
      ? Math.min((timestamp - this._lastTime) / 1000, 0.05)
      : 0;
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();

    this._animFrame = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.camera.follow(
      this.player.gx, this.player.gy,
      this.canvas.width, this.canvas.height,
    );
    this.camera.update(dt);
    this.renderer.tick(dt);

    const prevGx = this.player.gx;
    const prevGy = this.player.gy;

    for (const c of this.characters) {
      c.update(dt);
    }

    // Check portals whenever player steps onto a new tile
    const tileChanged = this.player.gx !== prevGx || this.player.gy !== prevGy;
    if (tileChanged && !this._transitioning) {
      this.zoneManager.checkPortal(this.player.gx, this.player.gy);
    }

    // Interaction proximity
    this.interactionSystem.update(this.player.gx, this.player.gy);

    // Fade cursor
    if (this.cursor.alpha > 0) {
      this.cursor.alpha = Math.max(0, this.cursor.alpha - dt * 2);
    }
  }

  _draw() {
    const zone = this.zoneManager.current;
    this.renderer.clear(zone?.bgColor ?? '#0d1f0d');
    this.renderer.drawMap(this.map, this.camera);

    if (this.cursor.alpha > 0) {
      this.renderer.drawCursor(
        this.cursor.x, this.cursor.y, this.cursor.alpha, this.camera,
      );
    }

    this.renderer.drawWorld(
      this.objectManager,
      this.characters,
      this.camera,
      this.interactionSystem,
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Add an NPC to the current zone. */
  addNPC(id, gx, gy, color = '#ff6b6b') {
    const npc = new Character(id, gx, gy, color);
    npc.snapToGrid();
    this.characters.push(npc);
    return npc;
  }

  /** Teleport to any registered zone. */
  goToZone(zoneId, spawnX, spawnY) {
    this._enterZone(zoneId, spawnX, spawnY);
  }
}
