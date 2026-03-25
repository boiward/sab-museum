/**
 * Configuración de red para el modo multijugador.
 *
 * SERVER_URL: URL del servidor WebSocket en Render.com
 *   → Actualiza esta URL después de hacer deploy en Render.
 *   → También se puede sobrescribir con el parámetro ?server= en la URL del juego.
 *
 * ROOM_ID: nombre de la sala privada.
 *   → Ambos jugadores deben usar la misma sala.
 *   → También se puede sobrescribir con ?room= en la URL.
 */
export const SERVER_URL = 'https://sab-museum.onrender.com';
export const ROOM_ID    = 'sab';
