// Isometric coordinate conversions
// Grid (gx, gy) <-> Screen (sx, sy)

export const TILE_W = 64;  // full width of a tile diamond
export const TILE_H = 32;  // full height of a tile diamond

/**
 * Convert grid coords to screen (canvas) coords.
 * Returns the center-top of the tile diamond.
 */
export function gridToScreen(gx, gy, offsetX = 0, offsetY = 0) {
  const sx = (gx - gy) * (TILE_W / 2) + offsetX;
  const sy = (gx + gy) * (TILE_H / 2) + offsetY;
  return { x: sx, y: sy };
}

/**
 * Convert screen (canvas) coords to grid coords (floored).
 */
export function screenToGrid(sx, sy, offsetX = 0, offsetY = 0) {
  const rx = sx - offsetX;
  const ry = sy - offsetY;
  // Inverse of the matrix [[TW/2, -TW/2],[TH/2, TH/2]]
  const gx = (rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2;
  const gy = (ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2;
  return { x: Math.floor(gx), y: Math.floor(gy) };
}
