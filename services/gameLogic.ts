import { Position, Unit, TerrainType, TileData, Faction } from '../types';

// Default maximums for random generation, but levels can override
export const DEFAULT_WIDTH = 20;
export const DEFAULT_HEIGHT = 20;

// Terrain costs (movement points required to enter)
export const TERRAIN_COST: Record<TerrainType, number> = {
  [TerrainType.OPEN]: 1,
  [TerrainType.CLOSED]: 999, // Impassable
};

export const getDistance = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export const generateMap = (width: number, height: number): TileData[][] => {
  const map: TileData[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < width; x++) {
      let terrain = TerrainType.OPEN;

      // Random generation removed to respect Level Design
      // if (width > 10 && height > 10) { ... }

      row.push({ x, y, terrain });
    }
    map.push(row);
  }
  return map;
};

// Helper to get raw adjacent tiles (bounds checked)
export const getAdjacentTiles = (pos: Position, mapWidth: number, mapHeight: number): Position[] => {
  const { x, y } = pos;
  const neighbors = [
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];
  return neighbors.filter(n => n.x >= 0 && n.x < mapWidth && n.y >= 0 && n.y < mapHeight);
};

// BFS to find all reachable tiles within movement range
export const getReachableTiles = (
  unit: Unit,
  units: Unit[],
  map: TileData[][]
): Position[] => {
  const mapHeight = map.length;
  const mapWidth = map[0].length;
  const start = unit.position;
  const range = unit.moveRange;
  const reachable: Position[] = [];

  // Include self (staying in place is a valid move)
  reachable.push({ x: start.x, y: start.y });

  const visited = new Set<string>();
  // Queue stores { x, y, remainingMovement }
  const queue: { x: number; y: number; cost: number }[] = [
    { x: start.x, y: start.y, cost: 0 }
  ];

  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Check neighbors
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const n of neighbors) {
      // Bounds check
      if (n.x < 0 || n.x >= mapWidth || n.y < 0 || n.y >= mapHeight) continue;

      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;

      // Obstacle check: Terrain
      const tile = map[n.y][n.x];
      const moveCost = TERRAIN_COST[tile.terrain];

      // Blocked by terrain
      if (moveCost > range) continue;

      // Obstacle check: Units
      const occupyingUnit = units.find(u => u.position.x === n.x && u.position.y === n.y && u.id !== unit.id && u.hp > 0);

      if (occupyingUnit) {
        // Cannot move through enemies
        if (occupyingUnit.faction !== unit.faction) continue;

        // Allies: Can move through, but cost applies. 
        // Note: We continue to processed queue, but decide on 'reachable' below.
      }

      const newCost = current.cost + moveCost;

      if (newCost <= range) {
        visited.add(key);

        // Valid move destination ONLY if not occupied
        if (!occupyingUnit) {
          reachable.push(n);
        }

        // Process neighbors from here (pathing through)
        queue.push({ x: n.x, y: n.y, cost: newCost });
      }
    }
  }

  return reachable;
};

// Helper to get tiles within attack range (Manhattan distance, handling min/max)
export const getTilesInRange = (
  center: Position,
  minRange: number,
  maxRange: number,
  mapWidth: number,
  mapHeight: number
): Position[] => {
  const tiles: Position[] = [];

  // Naive iteration for small tactics maps is fine.
  // For MaxRange 2, it's a small diamond.
  for (let x = -maxRange; x <= maxRange; x++) {
    for (let y = -maxRange; y <= maxRange; y++) {
      const dist = Math.abs(x) + Math.abs(y);
      if (dist >= minRange && dist <= maxRange) {
        const targetX = center.x + x;
        const targetY = center.y + y;

        if (targetX >= 0 && targetX < mapWidth && targetY >= 0 && targetY < mapHeight) {
          tiles.push({ x: targetX, y: targetY });
        }
      }
    }
  }
  return tiles;
};

export const getTilesInRadius = (
  center: Position,
  radius: number,
  mapWidth: number,
  mapHeight: number
): Position[] => {
  const tiles: Position[] = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      // 3x3 block implies Square radius (Chebyshev) or Manhattan?
      // "3x3 block" usually means square.
      // Manhattan radius 1 would be a '+' shape.
      // User said "3x3 block", so let's use Square logic (Chebyshev distance).
      const targetX = center.x + x;
      const targetY = center.y + y;

      if (targetX >= 0 && targetX < mapWidth && targetY >= 0 && targetY < mapHeight) {
        tiles.push({ x: targetX, y: targetY });
      }
    }
  }
  return tiles;
};

// Get valid attack targets
export const getValidAttackTargets = (
  attacker: Unit,
  units: Unit[],
  mapWidth: number,
  mapHeight: number
): Position[] => {
  // defaulting to 1-1 if not specified (legacy support during refactor)
  const min = attacker.attackRangeMin ?? 1;
  const max = attacker.attackRangeMax ?? 1;

  const validTiles = getTilesInRange(attacker.position, min, max, mapWidth, mapHeight);
  const targets: Position[] = [];

  for (const t of validTiles) {
    const enemy = units.find(u =>
      u.position.x === t.x &&
      u.position.y === t.y &&
      u.faction !== attacker.faction
    );

    if (enemy) {
      targets.push(t);
    }
  }

  return targets;
};