/**
 * A* pathfinder on a 2D grid.
 * Returns an array of {x, y} steps from start (exclusive) to end (inclusive),
 * or null if no path exists.
 */
export function findPath(grid, start, end) {
  const cols = grid[0].length;
  const rows = grid.length;

  if (!inBounds(end.x, end.y, cols, rows)) return null;
  if (!grid[end.y][end.x].walkable) return null;

  const key = (x, y) => `${x},${y}`;

  const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const openSet = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = key(start.x, start.y);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));
  openSet.set(startKey, start);

  while (openSet.size > 0) {
    // Pick node with lowest fScore
    let currentKey = null;
    let lowestF = Infinity;
    for (const [k] of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < lowestF) { lowestF = f; currentKey = k; }
    }

    const current = openSet.get(currentKey);
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(cameFrom, currentKey);
    }

    openSet.delete(currentKey);

    for (const [nx, ny] of neighbors(current.x, current.y, cols, rows)) {
      if (!grid[ny][nx].walkable) continue;

      const neighborKey = key(nx, ny);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, { key: currentKey, x: current.x, y: current.y });
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic({ x: nx, y: ny }, end));
        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, { x: nx, y: ny });
        }
      }
    }
  }

  return null; // no path
}

function reconstructPath(cameFrom, endKey) {
  const path = [];
  let current = cameFrom.get(endKey);
  // Walk back, building path in reverse
  // We need to include the end node
  const endNode = endKey.split(',').map(Number);
  path.push({ x: endNode[0], y: endNode[1] });

  while (current) {
    path.push({ x: current.x, y: current.y });
    current = cameFrom.get(current.key);
  }

  path.reverse();
  // Remove the start node (character is already there)
  path.shift();
  return path;
}

function neighbors(x, y, cols, rows) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  return dirs
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => inBounds(nx, ny, cols, rows));
}

function inBounds(x, y, cols, rows) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}
