import { useState, useRef, useEffect } from 'react';
import { Unit, Position, TileData, Faction, GameStatus, LevelConfig, UnitType, TerrainType, Spell } from '../types';
import { generateMap, getReachableTiles, getValidAttackTargets, getAdjacentTiles, getTilesInRange, getTilesInRadius, DEFAULT_WIDTH, DEFAULT_HEIGHT } from '../services/gameLogic';

interface HistorySnapshot {
    units: Unit[];
    turn: number;
    gameStatus: GameStatus;
    systemMessage: string;
}

export type InteractionMode = 'MOVEMENT' | 'ACTION_SELECT' | 'TARGETING_ATTACK' | 'SPELL_MENU' | 'TARGETING_SPELL';

export const useGameEngine = () => {
    // Global Game State
    const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
    const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);

    // Map/Unit State
    const [map, setMap] = useState<TileData[][]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    // Ref to hold latest units state for async actions
    const unitsRef = useRef<Unit[]>([]);
    useEffect(() => { unitsRef.current = units; }, [units]);

    const [turn, setTurn] = useState(1);

    // Interaction State
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('MOVEMENT');
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
    const [reachableTiles, setReachableTiles] = useState<Position[]>([]);
    const [attackRange, setAttackRange] = useState<Position[]>([]); // Visual only
    const [actionTargets, setActionTargets] = useState<Position[]>([]); // Clickable targets (Red tiles)

    // UI State
    const [systemMessage, setSystemMessage] = useState("Welcome, Commander.");
    const [history, setHistory] = useState<HistorySnapshot[]>([]);
    const [preMoveState, setPreMoveState] = useState<HistorySnapshot | null>(null); // For 'Cancel Move'
    const [isBusy, setIsBusy] = useState(false);

    // --- Helpers ---
    const createSnapshot = (): HistorySnapshot => ({
        units: JSON.parse(JSON.stringify(unitsRef.current)),
        turn,
        gameStatus,
        systemMessage
    });

    const restoreSnapshot = (snapshot: HistorySnapshot) => {
        setUnits(snapshot.units);
        setTurn(snapshot.turn);
        setGameStatus(snapshot.gameStatus);
        setSystemMessage(snapshot.systemMessage);

        // Reset local interaction state
        setSelectedUnitId(null);
        setInteractionMode('MOVEMENT');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
        setPreMoveState(null);
    };

    const checkWinLoss = (currentUnits: Unit[], currentTurn: number) => {
        // We count ALL units, including 0 HP ones, to ensure victory only triggers
        // after they are actively removed from the board (after animation).
        const enemies = currentUnits.filter(u => u.faction === Faction.ENEMY);
        const players = currentUnits.filter(u => u.faction === Faction.PLAYER);

        if (enemies.length === 0) {
            setGameStatus(GameStatus.VICTORY);
            setSystemMessage("Victory achieved!");
        } else if (players.length === 0) {
            setGameStatus(GameStatus.DEFEAT);
            setSystemMessage("All units lost.");
        } else if (currentLevel?.maxTurns && currentTurn > currentLevel.maxTurns) {
            setGameStatus(GameStatus.DEFEAT);
            setSystemMessage("Turn limit reached.");
        }
    };

    // --- Core Actions ---

    const startLevel = (config: LevelConfig) => {
        setCurrentLevel(config);

        let initialMap = generateMap(config.width, config.height);

        // Apply walls
        if (config.walls) {
            initialMap = initialMap.map(row => row.map(tile => {
                if (config.walls?.some(w => w.x === tile.x && w.y === tile.y)) {
                    return { ...tile, terrain: TerrainType.CLOSED };
                }
                return tile;
            }));
        }

        setMap(initialMap);
        setUnits(JSON.parse(JSON.stringify(config.units)));
        setTurn(1);
        setGameStatus(GameStatus.PLAYING);
        setSystemMessage(config.description);
        setHistory([]);
        setPreMoveState(null);

        // Ensure clean slate interactions
        setSelectedUnitId(null);
        setInteractionMode('MOVEMENT');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
        setIsBusy(false);
    };

    const returnToMenu = () => {
        setGameStatus(GameStatus.MENU);
        setCurrentLevel(null);
        setUnits([]);
        setMap([]);
        setHistory([]);
        setPreMoveState(null);

        // Reset Interaction State
        setSelectedUnitId(null);
        setInteractionMode('MOVEMENT');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
        setIsBusy(false);
    };

    const selectUnit = (id: string) => {
        const unit = units.find(u => u.id === id);
        if (!unit) return;

        // If selecting different unit, switch.
        setSelectedUnitId(id);
        setInteractionMode('MOVEMENT');

        // Allow selecting moved units for inspection
        if (unit.hasMoved) {
            setReachableTiles([]);
            setActionTargets([]);
            setAttackRange([]);
            setSystemMessage(`${unit.name} (Waiting)`);
            return;
        }

        // Calculate movement range
        const tiles = getReachableTiles(unit, units, map);
        setReachableTiles(tiles);
        setAttackRange([]);
        setActionTargets([]);
        setSystemMessage(`${unit.name} selected.`);
    };

    const deselect = () => {
        setSelectedUnitId(null);
        setInteractionMode('MOVEMENT');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
    };

    const enterAttackMode = (unit: Unit, currentUnits: Unit[]) => {
        setInteractionMode('TARGETING_ATTACK');
        setReachableTiles([]);


        // Visual Range
        const rangeTiles = getTilesInRange(unit.position, unit.attackRangeMin, unit.attackRangeMax, map[0].length, map.length);
        setAttackRange(rangeTiles);

        // Valid Targets (Red Tiles)
        const targets = getValidAttackTargets(unit, currentUnits, map[0].length, map.length);
        setActionTargets(targets);

        setSystemMessage("Select a target.");
    };

    const enterSpellMenu = () => {
        setInteractionMode('SPELL_MENU');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
        setSystemMessage("Select a spell.");
    };

    const enterSpellTargeting = (spell: Spell) => {
        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return;

        setSelectedSpell(spell);
        setInteractionMode('TARGETING_SPELL');

        // Show Range
        const rangeTiles = getTilesInRange(unit.position, 0, spell.range, map[0].length, map.length);
        setAttackRange(rangeTiles);

        // Valid Targets: For spells, any tile in range is usually a valid target center?
        setActionTargets(rangeTiles);

        setSystemMessage(`Select target for ${spell.name}.`);
    };

    const moveUnit = (target: Position) => {
        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return;

        // Save State BEFORE moving (for Cancel Move)
        setPreMoveState(createSnapshot());

        const updatedUnits = units.map(u => u.id === unit.id ? { ...u, position: target } : u);
        setUnits(updatedUnits);
        setReachableTiles([]);

        // Determine next state
        // If Wizard (has spells) -> Action Menu
        if (unit.spells && unit.spells.length > 0) {
            setInteractionMode('ACTION_SELECT');
            setSystemMessage("Choose action.");
            setAttackRange([]);
            setActionTargets([]);
        } else {
            // Default Knight/Archer -> Straight to Attack Mode
            // Update the unit ref for the helper
            const movedUnit = updatedUnits.find(u => u.id === unit.id)!;
            enterAttackMode(movedUnit, updatedUnits);
        }
    };

    const attackUnit = (attackerId: string, targetPos: Position) => {
        const attacker = unitsRef.current.find(u => u.id === attackerId);
        const targetUnit = unitsRef.current.find(u => u.position.x === targetPos.x && u.position.y === targetPos.y);

        if (!attacker || !targetUnit) return { success: false };

        // Push to permanent history (committing the move if we had a preMoveState)
        if (preMoveState) {
            setHistory(prev => [...prev, preMoveState]);
        }

        const damage = 1;
        const newHp = targetUnit.hp - damage;
        let nextUnits = [...unitsRef.current];
        let message = "";
        let isKill = false;

        if (newHp <= 0) {
            message = `${targetUnit.name} destroyed!`;
            isKill = true;
            // Keep unit in state for animation, handle removal in UI layer
            nextUnits = unitsRef.current.map(u => {
                if (u.id === targetUnit.id) return { ...u, hp: 0 };
                if (u.id === attackerId) return { ...u, hasMoved: true };
                return u;
            });
        } else {
            message = `${targetUnit.name} took ${damage} damage.`;
            nextUnits = unitsRef.current.map(u => {
                if (u.id === targetUnit.id) return { ...u, hp: newHp };
                if (u.id === attackerId) return { ...u, hasMoved: true };
                return u;
            });
        }

        setUnits(nextUnits);
        setSystemMessage(message);

        // Cleanup
        endUnitAction(attackerId, nextUnits);
        // checkWinLoss REMOVED here to allow animation to finish
        return { success: true, damage, isKill };
    };

    const castSpell = (targetPos: Position) => {
        const attacker = unitsRef.current.find(u => u.id === selectedUnitId);
        if (!attacker || !selectedSpell) return;

        // Commit Move
        if (preMoveState) {
            setHistory(prev => [...prev, preMoveState]);
        }

        // Calculate AOE
        const affectedTiles = getTilesInRadius(targetPos, selectedSpell.radius, map[0].length, map.length);

        let nextUnits = [...unitsRef.current];
        let hitCount = 0;

        // Apply Damage
        // We need to process hits carefully to avoid mutating nextUnits in loop weirdly
        // Better: calc new HP state for all units
        const deadUnitIds: string[] = [];

        nextUnits = nextUnits.map(u => {
            const isInAOE = affectedTiles.some(t => t.x === u.position.x && t.y === u.position.y);
            if (isInAOE) {
                hitCount++;
                const newHp = u.hp - selectedSpell.damage;
                if (newHp <= 0) deadUnitIds.push(u.id);
                // Clamp to 0 if dead, but keep in array
                return { ...u, hp: Math.max(0, newHp) };
            }
            return u;
        });

        // Filter dead - DEFER to UI for animation (removed filter)

        // Mark caster as moved
        nextUnits = nextUnits.map(u => u.id === attacker.id ? { ...u, hasMoved: true } : u);

        setUnits(nextUnits);
        setSystemMessage(`Cast ${selectedSpell.name}! Hit ${hitCount} units.`);

        endUnitAction(attacker.id, nextUnits);
        // checkWinLoss REMOVED here to allow animation to finish
    };

    const endUnitAction = (unitId: string, currentUnits = units) => {
        // Ensure hasMoved is set if not already (safeguard)
        setUnits(prev => prev.map(u => u.id === unitId ? { ...u, hasMoved: true } : u));

        setSelectedUnitId(null);
        setSelectedSpell(null);
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
        setInteractionMode('MOVEMENT');
        setPreMoveState(null);
    };

    const waitUnit = (unitId: string) => {
        if (preMoveState) {
            setHistory(prev => [...prev, preMoveState]);
        }
        setSystemMessage("Unit holding position.");
        endUnitAction(unitId);
    };

    const endTurn = () => {
        if (currentLevel && currentLevel.maxTurns > 0 && turn >= currentLevel.maxTurns) {
            setGameStatus(GameStatus.DEFEAT);
            return;
        }
        // Turn change is a major checkpoint; clear undo history
        setHistory([]);
        setPreMoveState(null);

        const resetUnits = units.map(u => ({ ...u, hasMoved: false }));
        setUnits(resetUnits);
        setTurn(prev => prev + 1);
        setSystemMessage(`Turn ${turn + 1} started.`);
        setSelectedUnitId(null);
        setInteractionMode('MOVEMENT');
        setReachableTiles([]);
        setActionTargets([]);
        setAttackRange([]);
    };

    const undo = () => {
        // 0. Cancel Selection (Right Click during Move Phase)
        if (interactionMode === 'MOVEMENT' && selectedUnitId && !preMoveState) {
            deselect();
            return;
        }

        // 1. Cancel Selection/Menu
        if (interactionMode === 'SPELL_MENU') {
            setInteractionMode('ACTION_SELECT');
            return;
        }
        if (interactionMode === 'TARGETING_SPELL') {
            setInteractionMode('SPELL_MENU');
            setSelectedSpell(null);
            setAttackRange([]);
            return; // Stay in menu
        }
        if (interactionMode === 'TARGETING_ATTACK' && preMoveState) {
            // If we came from ACTION_SELECT (Wizard), go back to Menu
            const unit = units.find(u => u.id === selectedUnitId);
            if (unit && unit.spells && unit.spells.length > 0) {
                setInteractionMode('ACTION_SELECT');
                setAttackRange([]);
                setActionTargets([]);
                return;
            }
            // Else fall through to full undo (Knight/Archer)
        }

        // 2. Cancel Move (Full Reset)
        if ((interactionMode === 'TARGETING_ATTACK' || interactionMode === 'ACTION_SELECT') && preMoveState) {
            restoreSnapshot(preMoveState);
            return;
        }

        // 3. Undo Last Action (Turn History)
        if (interactionMode === 'MOVEMENT' && !selectedUnitId && history.length > 0) {
            const lastState = history[history.length - 1];
            restoreSnapshot(lastState);
            setHistory(prev => prev.slice(0, -1));
        }
    };

    return {
        state: {
            gameStatus,
            currentLevel,
            map,
            units,
            turn,
            interactionMode,
            selectedUnitId,
            selectedSpell,
            reachableTiles,
            attackRange,
            actionTargets,
            systemMessage,
            history,
            isBusy // Exposed
        },
        actions: {
            startLevel,
            returnToMenu,
            selectUnit,
            deselect,
            moveUnit,
            attackUnit,
            waitUnit,
            endTurn,
            undo,
            setIsBusy,
            enterAttackMode: () => {
                const u = units.find(unit => unit.id === selectedUnitId);
                if (u) enterAttackMode(u, units);
            },
            enterSpellMenu,
            enterSpellTargeting,
            castSpell,
            removeUnits: (unitIds: string[]) => {
                const nextUnits = unitsRef.current.filter(u => !unitIds.includes(u.id));
                setUnits(nextUnits);
                checkWinLoss(nextUnits, turn);
            }
        },
        combatState: { // Exposed Stub for now to satisfy App.tsx
            shakingUnitId: null,
            dyingUnitIds: [],
            attackerId: null,
            attackOffset: { x: 0, y: 0 }
        }
    };
};
