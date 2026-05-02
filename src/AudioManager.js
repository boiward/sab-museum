/**
 * AudioManager — música de fondo con crossfade entre zonas.
 *
 * Uso:
 *   const audio = new AudioManager();
 *   audio.register('exterior', 'url/a/pista.mp3');
 *   audio.register('museum',   'url/a/otra.mp3');
 *   audio.switchTo('exterior'); // llama dentro de un gesto de usuario
 */
export class AudioManager {
  constructor() {
    this._tracks       = {}; // zoneId -> HTMLAudioElement
    this._current      = null;
    this._currentZone  = null;
    this._volume       = 0.1;
    this._muted        = false;
    this._fadeDuration = 1500; // ms
  }

  /** Registra una pista de audio para una zona. Llama antes de switchTo(). */
  register(zoneId, url) {
    const audio   = new Audio(url);
    audio.loop    = true;
    audio.volume  = 0;
    audio.preload = 'auto';
    this._tracks[zoneId] = audio;
  }

  /** Cambia a la música de la zona indicada con crossfade. */
  switchTo(zoneId) {
    if (zoneId === this._currentZone) return;
    this._currentZone = zoneId;

    const next = this._tracks[zoneId];
    if (!next) return;

    const prev = this._current;
    this._current = next;

    if (prev && prev !== next) {
      this._fadeTo(prev, 0, () => prev.pause());
    }

    next.currentTime = 0;
    next.play().catch(() => {}); // el navegador bloquea autoplay sin gesto de usuario
    this._fadeTo(next, this._muted ? 0 : this._volume);
  }

  /** Fade suave de volumen. onComplete se llama cuando termina. */
  _fadeTo(audio, targetVol, onComplete) {
    const steps    = 30;
    const interval = this._fadeDuration / steps;
    const delta    = (targetVol - audio.volume) / steps;
    let count      = 0;

    const timer = setInterval(() => {
      audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
      count++;
      if (count >= steps) {
        clearInterval(timer);
        audio.volume = targetVol;
        onComplete?.();
      }
    }, interval);
  }

  /** Ajusta el volumen (0..1). */
  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (!this._muted && this._current) {
      this._fadeTo(this._current, this._volume);
    }
  }

  /** Alterna mute. Devuelve el nuevo estado (true = silenciado). */
  toggleMute() {
    this._muted = !this._muted;
    if (this._current) {
      this._fadeTo(this._current, this._muted ? 0 : this._volume);
    }
    return this._muted;
  }

  get muted()  { return this._muted;  }
  get volume() { return this._volume; }
}
