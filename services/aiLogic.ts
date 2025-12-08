import { Unit, TileData, Position, Faction } from '../types';
import { getReachableTiles, getValidAttackTargets, getDistance } from './gameLogic';

interface AIAction {
    action: 'ATTACK' | 'MOVE' | 'WAIT';
    movePos?: Position;
    targetId?: string;
}

export const calculateEnemyAction = (
    unit: Unit,
    allUnits: Unit[],
    map: TileData[][]
): AIAction => {
    const mapWidth = map[0].length;
    const mapHeight = map.length;

    // 1. Get all reachable tiles
    const reachableTiles = getReachableTiles(unit, allUnits, map);

    // 2. Identify potential attacks
    // Structure: { moveTile: Position, targetUnit: Unit, distToTarget: number, moveDist: number }
    const attackOptions: Array<{
        moveTile: Position,
        targetUnit: Unit,
        distToTargetFromStart: number,
        moveDist: number
    }> = [];

    const playerUnits = allUnits.filter(u => u.faction === Faction.PLAYER);

    // Optimization: If no player units, wait.
    if (playerUnits.length === 0) return { action: 'WAIT' };

    reachableTiles.forEach(tile => {
        // Simulate unit at this tile
        const simulatedUnit = { ...unit, position: tile };

        // Check for targets from this position
        // getValidAttackTargets returns POSITIONS. We need to map back to Units.
        const targetPositions = getValidAttackTargets(simulatedUnit, allUnits, mapWidth, mapHeight);

        targetPositions.forEach(targetPos => {
            const targetUnit = allUnits.find(u => u.position.x === targetPos.x && u.position.y === targetPos.y);
            if (targetUnit && targetUnit.faction === Faction.PLAYER) {
                attackOptions.push({
                    moveTile: tile,
                    targetUnit: targetUnit,
                    distToTargetFromStart: getDistance(unit.position, targetUnit.position),
                    moveDist: getDistance(unit.position, tile)
                });
            }
        });
    });

    // 3. Evaluate Attack Options
    if (attackOptions.length > 0) {
        // Strategy: 
        // 1. Pick closest unit (min distToTargetFromStart)
        // 2. Move as far as possible (max moveDist)

        attackOptions.sort((a, b) => {
            // First priority: Closest Target
            if (a.distToTargetFromStart !== b.distToTargetFromStart) {
                return a.distToTargetFromStart - b.distToTargetFromStart;
            }
            // Second priority: Maximize Movement
            return b.moveDist - a.moveDist;
        });

        const bestOption = attackOptions[0];
        return {
            action: 'ATTACK',
            movePos: bestOption.moveTile,
            targetId: bestOption.targetUnit.id
        };
    }

    // 4. No Attacks? Approach closest enemy.
    let closestTarget: Unit | null = null;
    let minGlobalDist = Infinity;

    playerUnits.forEach(pUnit => {
        const dist = getDistance(unit.position, pUnit.position);
        if (dist < minGlobalDist) {
            minGlobalDist = dist;
            closestTarget = pUnit;
        }
    });

    if (closestTarget) {
        // Find reachable tile that minimizes distance to this target
        // Tie-breaker: Maximize movement from start (to close gap aggressively)

        // Sort reachable tiles
        reachableTiles.sort((a, b) => {
            const distA = getDistance(a, closestTarget!.position);
            const distB = getDistance(b, closestTarget!.position);

            if (distA !== distB) return distA - distB; // Minimize dist to target

            // Tie: Maximize move from start
            const moveA = getDistance(unit.position, a);
            const moveB = getDistance(unit.position, b);
            return moveB - moveA;
        });

        const bestMove = reachableTiles[0];
        // If we represent "Move", we pass the target position
        return {
            action: 'MOVE',
            movePos: bestMove
        };
    }

    return { action: 'WAIT' };
};
