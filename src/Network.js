/**
 * Network — cliente WebSocket para el modo multijugador.
 *
 * Se conecta al servidor relay y:
 *   - Envía el estado del jugador local ~20 veces/segundo.
 *   - Recibe el estado del compañero y lo notifica via callbacks.
 *
 * No depende de ningún otro módulo del juego (inyección de deps mínima).
 */
export class Network {
  constructor() {
    this._ws         = null;
    this._connected  = false;
    this.myId        = null;
    this.partnerId   = null;

    // Callbacks
    this._cbPartnerState  = null;
    this._cbPartnerJoined = null;
    this._cbPartnerLeft   = null;
    this._cbRoomFull      = null;
    this._cbEmoji         = null;
  }

  // ── Conexión ──────────────────────────────────────────────────────────────

  connect(serverUrl, roomId) {
    const url = `${serverUrl}?room=${encodeURIComponent(roomId)}`;
    try {
      this._ws = new WebSocket(url);
    } catch (e) {
      console.warn('[Network] No se pudo conectar al servidor:', e);
      return;
    }

    this._ws.addEventListener('open', () => {
      this._connected = true;
      console.log('[Network] Conectado a', url);
    });

    this._ws.addEventListener('message', (e) => {
      try {
        this._handle(JSON.parse(e.data));
      } catch { /* ignore */ }
    });

    this._ws.addEventListener('close', () => {
      this._connected = false;
      this.partnerId  = null;
      this._cbPartnerLeft?.();
    });

    this._ws.addEventListener('error', () => {
      console.warn('[Network] Error de conexión WebSocket');
    });
  }

  // ── Recepción ─────────────────────────────────────────────────────────────

  _handle(msg) {
    switch (msg.type) {
      case 'connected':
        this.myId = msg.id;
        break;

      case 'partner_joined':
        this.partnerId = msg.id;
        this._cbPartnerJoined?.();
        break;

      case 'partner_left':
        this.partnerId = null;
        this._cbPartnerLeft?.();
        break;

      case 'room_full':
        console.warn('[Network] La sala está llena (máx. 2 jugadores).');
        this._cbRoomFull?.();
        break;

      case 'state':
        this._cbPartnerState?.(msg);
        break;

      case 'emoji':
        this._cbEmoji?.(msg);
        break;
    }
  }

  // ── Envío ─────────────────────────────────────────────────────────────────

  /** Envía el estado del jugador local al servidor (que lo relay al compañero). */
  sendState(state) {
    if (!this._connected || this._ws?.readyState !== WebSocket.OPEN) return;
    this._ws.send(JSON.stringify({ type: 'state', ...state }));
  }

  /** Envía una reacción emoji al compañero. */
  sendEmoji(glyph) {
    if (!this._connected || this._ws?.readyState !== WebSocket.OPEN) return;
    this._ws.send(JSON.stringify({ type: 'emoji', glyph }));
  }

  // ── Callbacks ─────────────────────────────────────────────────────────────

  onPartnerState(cb)  { this._cbPartnerState  = cb; }
  onPartnerJoined(cb) { this._cbPartnerJoined = cb; }
  onPartnerLeft(cb)   { this._cbPartnerLeft   = cb; }
  onRoomFull(cb)      { this._cbRoomFull      = cb; }
  onEmoji(cb)         { this._cbEmoji         = cb; }

  get connected() { return this._connected; }
}
