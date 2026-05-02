import { Character }          from './Character.js';
import { Renderer }           from './Renderer.js';
import { Camera }             from './Camera.js';
import { ObjectManager }      from './ObjectManager.js';
import { ZoneManager }        from './ZoneManager.js';
import { PhotoViewer }        from './PhotoViewer.js';
import { InteractionSystem }  from './InteractionSystem.js';
import { Network }            from './Network.js';
import { AudioManager }       from './AudioManager.js';
import { screenToGrid }       from './utils.js';
import { SERVER_URL, ROOM_ID } from './config.js';

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

    // Audio
    this.audio = new AudioManager();

    // Emoji picker
    this._emojiPickerOpen = false;
    this._emojiPickerEl   = null;

    // Multiplayer
    this.network      = new Network();
    this.remotePlayer = null;   // Character instance for the partner
    this._netTimer    = 0;      // throttle sends to ~20 Hz
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

    // Register music tracks (royalty-free, Pixabay)
    this.audio.register('exterior', './assets/audio/BeeGeesHowDeepIsYourLove.mp3');
    this.audio.register('museum',   './assets/audio/Bonsai.mp3');

    // Start in the exterior zone (game runs in background while selector shows)
    this._enterZone('exterior');

    this._bindEvents();
    this._buildEmojiPicker();
    this._loop(performance.now());

    // Show character selector on top
    this._showCharacterSelector();

    // Connect to multiplayer server
    this._initNetwork();
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

    // Primera interacción del usuario — ahora el navegador permite autoplay
    this.audio.switchTo(this.zoneManager.currentZoneId);
  }

  // ── Multiplayer ────────────────────────────────────────────────────────────

  _initNetwork() {
    // URL params override config (useful para testing)
    const params    = new URLSearchParams(window.location.search);
    const serverUrl = params.get('server') || SERVER_URL;
    const roomId    = params.get('room')   || ROOM_ID;

    this.network.connect(serverUrl, roomId);

    // Partner connected → crear su personaje
    this.network.onPartnerJoined(() => {
      if (this.remotePlayer) return; // ya existe
      this._createRemotePlayer(null);
    });

    // Partner desconectado → remover de la escena
    this.network.onPartnerLeft(() => {
      if (!this.remotePlayer) return;
      this.characters = this.characters.filter(c => c !== this.remotePlayer);
      this.remotePlayer = null;
      this._setPartnerHUD(false);
    });

    // Sala llena (tercera persona intentando entrar)
    this.network.onRoomFull(() => {
      this._setPartnerHUD(false);
    });

    // Recibir emoji del compañero
    this.network.onEmoji((msg) => {
      if (this.remotePlayer) this.remotePlayer.triggerEmoji(msg.glyph);
    });

    // Recibir estado del compañero
    this.network.onPartnerState((state) => {
      // Crear personaje remoto si aún no existe (join tardío)
      if (!this.remotePlayer) this._createRemotePlayer(state);

      // Aplicar estado recibido directamente (sin pathfinding)
      const r = this.remotePlayer;
      r.gx             = state.gx;
      r.gy             = state.gy;
      r.sx             = state.sx;
      r.sy             = state.sy;
      r.facing         = state.facing;
      r.walkFrame      = state.walkFrame;
      r.moving         = state.moving;
      r.characterStyle = state.characterStyle;
      r._zoneId        = state.zoneId;

      // Mostrar solo si están en la misma zona
      const sameZone = state.zoneId === this.zoneManager.currentZoneId;
      const inList   = this.characters.includes(r);
      if (sameZone && !inList) {
        this.characters.push(r);
      } else if (!sameZone && inList) {
        this.characters = this.characters.filter(c => c !== r);
      }

      this._setPartnerHUD(true);
    });
  }

  /** Crea el objeto Character para el jugador remoto. */
  _createRemotePlayer(state) {
    // El compañero usa el personaje opuesto al nuestro
    const myStyle     = this.player?.characterStyle ?? 'edwdw';
    const remoteStyle = state?.characterStyle ?? (myStyle === 'sabibi' ? 'edwdw' : 'sabibi');

    const gx = state?.gx ?? 0;
    const gy = state?.gy ?? 0;

    const remote = new Character('remote', gx, gy, '#ffffff');
    remote.characterStyle = remoteStyle;
    remote.name           = remoteStyle === 'sabibi' ? 'Sabibi' : 'Edwdw';
    remote._zoneId        = state?.zoneId ?? null;

    if (state) {
      remote.sx = state.sx ?? remote.sx;
      remote.sy = state.sy ?? remote.sy;
    } else {
      remote.snapToGrid();
    }

    this.remotePlayer = remote;
    // Solo se agrega al array cuando coincida la zona (ver onPartnerState)
  }

  /** Pequeño indicador en el HUD: "compañero conectado / desconectado". */
  _setPartnerHUD(online) {
    let el = document.getElementById('partner-status');
    if (!el) {
      el = document.createElement('span');
      el.id = 'partner-status';
      const toolbar = document.getElementById('toolbar');
      if (toolbar) toolbar.appendChild(el);
    }
    el.textContent = online ? '● compañero conectado' : '○ esperando compañero…';
    el.style.color = online ? '#7effa0' : '#aaa';
  }

  // ── Zone loading ───────────────────────────────────────────────────────────

  _enterZone(zoneId, spawnX, spawnY) {
    this._transitioning = true;

    const zone = this.zoneManager.getZone(zoneId);
    if (!zone) { console.warn(`Zone "${zoneId}" not registered.`); return; }

    this.zoneManager.currentZoneId = zoneId;

    // Cambiar música de la zona (solo si el usuario ya eligió personaje)
    if (this._characterSelected) this.audio.switchTo(zoneId);

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
      // Rebuild characters list: player always first, remote only if same zone
      this.characters = [this.player];
      if (this.remotePlayer && this.remotePlayer._zoneId === zoneId) {
        this.characters.push(this.remotePlayer);
      }
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

    // E key = interact | Q/Tab = emoji picker | Escape = cerrar picker
    window.addEventListener('keydown', (e) => {
      if (!this._characterSelected) return;

      if (e.key === 'q' || e.key === 'Q' || e.key === 'Tab') {
        e.preventDefault();
        if (this._emojiPickerOpen) this._closeEmojiPicker();
        else                       this._openEmojiPicker();
        return;
      }

      if (e.key === 'Escape' && this._emojiPickerOpen) {
        this._closeEmojiPicker();
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        this.interactionSystem.interactWithNearest();
      }
    });

    // Controles de volumen
    document.getElementById('mute-btn')?.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      const btn   = document.getElementById('mute-btn');
      if (btn) btn.textContent = muted ? '🔇' : '🔊';
    });

    document.getElementById('vol-slider')?.addEventListener('input', (e) => {
      this.audio.setVolume(parseFloat(e.target.value));
    });
  }

  // ── Emoji picker ───────────────────────────────────────────────────────────

  _buildEmojiPicker() {
    const EMOJIS = ['❤️', '👋', '😮', '😄', '🎨', '👏', '✨', '🤔'];
    const panel  = document.createElement('div');
    panel.id     = 'emoji-picker';
    panel.classList.add('hidden');

    EMOJIS.forEach(glyph => {
      const btn         = document.createElement('button');
      btn.className     = 'emoji-btn';
      btn.textContent   = glyph;
      btn.title         = glyph;
      btn.addEventListener('click', () => {
        this._sendEmoji(glyph);
        this._closeEmojiPicker();
      });
      panel.appendChild(btn);
    });

    document.body.appendChild(panel);
    this._emojiPickerEl = panel;
  }

  _openEmojiPicker() {
    this._emojiPickerOpen = true;
    if (this._emojiPickerEl) {
      // Re-crear el elemento para que la animación CSS se reproduzca de nuevo
      const parent = this._emojiPickerEl.parentNode;
      parent.removeChild(this._emojiPickerEl);
      this._emojiPickerEl.classList.remove('hidden');
      parent.appendChild(this._emojiPickerEl);
    }

    // Cerrar al hacer click fuera
    const onOutsideClick = (e) => {
      if (!this._emojiPickerEl?.contains(e.target)) {
        this._closeEmojiPicker();
        document.removeEventListener('mousedown', onOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 0);
  }

  _closeEmojiPicker() {
    this._emojiPickerOpen = false;
    this._emojiPickerEl?.classList.add('hidden');
  }

  _sendEmoji(glyph) {
    if (!this.player) return;
    this.player.triggerEmoji(glyph);
    this.network.sendEmoji(glyph);
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

    // Enviar posición propia ~20 veces/segundo
    if (this._characterSelected) {
      this._netTimer += dt;
      if (this._netTimer >= 0.05) {
        this._netTimer = 0;
        this.network.sendState({
          gx:             this.player.gx,
          gy:             this.player.gy,
          sx:             this.player.sx,
          sy:             this.player.sy,
          facing:         this.player.facing,
          walkFrame:      this.player.walkFrame,
          moving:         this.player.moving,
          characterStyle: this.player.characterStyle,
          zoneId:         this.zoneManager.currentZoneId,
        });
      }
    }

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
