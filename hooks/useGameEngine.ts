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
    const [activeFaction, setActiveFaction] = useState<Faction>(Faction.PLAYER);

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

    // UI/Visual State
    const [systemMessage, setSystemMessage] = useState("Welcome, Commander.");
    const [history, setHistory] = useState<HistorySnapshot[]>([]);
    const [preMoveState, setPreMoveState] = useState<HistorySnapshot | null>(null); // For 'Cancel Move'
    const [isBusy, setIsBusy] = useState(false);

    // Visuals (Animations)
    const [visuals, setVisuals] = useState<{
        shakingUnitId: string | null;
        dyingUnitIds: string[];
        attackerId: string | null;
        attackTarget: Position | null;
        effectType?: string;
    }>({
        shakingUnitId: null,
        dyingUnitIds: [],
        attackerId: null,
        attackTarget: null
    });

    // --- Helpers ---
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

            // Persist Completion
            if (currentLevel?.id) {
                try {
                    const saved = localStorage.getItem('pixelTactics_completed');
                    const completed = saved ? JSON.parse(saved) : [];
                    if (!completed.includes(currentLevel.id)) {
                        completed.push(currentLevel.id);
                        localStorage.setItem('pixelTactics_completed', JSON.stringify(completed));
                    }
                } catch (e) {
                    console.error("Save failed", e);
                }
            }
        } else if (players.length === 0) {
            setGameStatus(GameStatus.DEFEAT);
            setSystemMessage("All units lost.");
        } else if (currentLevel?.maxTurns && currentTurn > currentLevel.maxTurns) {
            setGameStatus(GameStatus.DEFEAT);
            setSystemMessage("Turn limit reached.");
        }
    };

    // --- Animation Actions ---
    const performAttackAnimation = async (attackerId: string, targetPos: Position, targetId: string, effectType?: string) => {
        // Start Lunge Visual
        setVisuals(prev => ({ ...prev, attackerId, attackTarget: targetPos, effectType }));

        const duration = effectType ? 600 : 250; // Longer for spells
        await wait(duration);

        // Impact / Shake
        setVisuals(prev => ({ ...prev, shakingUnitId: targetId }));
        await wait(100);

        // Reset Lunge
        setVisuals(prev => ({ ...prev, attackerId: null, attackTarget: null, effectType: undefined }));
        await wait(150); // Finish Shake

        setVisuals(prev => ({ ...prev, shakingUnitId: null }));
    };

    const performDeathAnimation = async (unitId: string) => {
        setVisuals(prev => ({ ...prev, dyingUnitIds: [...prev.dyingUnitIds, unitId] }));
        await wait(450);

        // Actually remove unit
        const nextUnits = unitsRef.current.filter(u => u.id !== unitId);
        setUnits(nextUnits);

        setVisuals(prev => ({ ...prev, dyingUnitIds: prev.dyingUnitIds.filter(id => id !== unitId) }));
        checkWinLoss(nextUnits, turn);
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
        setActiveFaction(Faction.PLAYER);

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
        // Block player selection during enemy turn
        if (activeFaction !== Faction.PLAYER) return;

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

        // Default: Straight to Attack Mode (with options in HUD)
        const movedUnit = updatedUnits.find(u => u.id === unit.id)!;
        enterAttackMode(movedUnit, updatedUnits);
        setSystemMessage("Attack or choose option.");
    };

    // Updated attackUnit to be async and handle animations internally (exposed via return/visuals)
    // The previous App.tsx logic is now partly here, but App.tsx loops on `isKill`.
    // Let's consolidate: `executeAttack`

    // Core Logic (Data only)
    const applyDamage = (attackerId: string, targetPos: Position) => {
        const attacker = unitsRef.current.find(u => u.id === attackerId);
        const targetUnit = unitsRef.current.find(u => u.position.x === targetPos.x && u.position.y === targetPos.y);

        if (!attacker || !targetUnit) return { success: false };

        const damage = 1; // Base damage
        const newHp = targetUnit.hp - damage;
        let nextUnits = [...unitsRef.current];
        let message = "";
        let isKill = false;

        if (newHp <= 0) {
            message = `${targetUnit.name} destroyed!`;
            isKill = true;
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

        return { success: true, damage, isKill, targetId: targetUnit.id };
    };

    // Public Action for interactions (async)
    const attackUnit = async (attackerId: string, targetPos: Position) => {
        setIsBusy(true);
        const targetUnit = units.find(u => u.position.x === targetPos.x && u.position.y === targetPos.y);

        if (targetUnit) {
            await performAttackAnimation(attackerId, targetPos, targetUnit.id);
        }

        const result = applyDamage(attackerId, targetPos);

        if (result.success && result.isKill && result.targetId) {
            await performDeathAnimation(result.targetId);
        }

        if (preMoveState) {
            setHistory(prev => [...prev, preMoveState]);
        }

        endUnitAction(attackerId);
        setIsBusy(false);
        return result;
    };


    const castSpell = async (targetPos: Position) => {
        const attacker = unitsRef.current.find(u => u.id === selectedUnitId);
        if (!attacker || !selectedSpell) return;

        setIsBusy(true);

        // Commit Move
        if (preMoveState) {
            setHistory(prev => [...prev, preMoveState]);
        }

        // Animation (Reuse attack/lunge for cast)
        await performAttackAnimation(attacker.id, targetPos, "NONE", "FIREBALL"); // No shake yet

        // Calculate AOE
        const affectedTiles = getTilesInRadius(targetPos, selectedSpell.radius, map[0].length, map.length);

        let nextUnits = [...unitsRef.current];
        let hitCount = 0;
        const deadUnitIds: string[] = [];

        nextUnits = nextUnits.map(u => {
            const isInAOE = affectedTiles.some(t => t.x === u.position.x && t.y === u.position.y);
            if (isInAOE) {
                hitCount++;
                const newHp = u.hp - selectedSpell.damage;
                if (newHp <= 0) deadUnitIds.push(u.id);
                return { ...u, hp: Math.max(0, newHp) };
            }
            return u;
        });

        // Mark caster as moved
        nextUnits = nextUnits.map(u => u.id === attacker.id ? { ...u, hasMoved: true } : u);

        setUnits(nextUnits);
        setSystemMessage(`Cast ${selectedSpell.name}! Hit ${hitCount} units.`);

        // Death Animations (Batch Parallel)
        if (deadUnitIds.length > 0) {
            setVisuals(prev => ({ ...prev, dyingUnitIds: [...prev.dyingUnitIds, ...deadUnitIds] }));
            await wait(450);

            // Batch Remove from latest state
            const survivingUnits = unitsRef.current.filter(u => !deadUnitIds.includes(u.id));
            setUnits(survivingUnits);

            setVisuals(prev => ({ ...prev, dyingUnitIds: prev.dyingUnitIds.filter(id => !deadUnitIds.includes(id)) }));
            checkWinLoss(survivingUnits, turn);
        }

        endUnitAction(attacker.id, nextUnits);
        setIsBusy(false);
    };

    const endUnitAction = (unitId: string, currentUnits = units) => {
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

    // --- Enemy AI ---
    const runEnemyTurn = async () => {
        setIsBusy(true);
        setActiveFaction(Faction.ENEMY);
        setSystemMessage("Enemy Turn...");

        // Initial Delay for Banner
        await wait(2000);

        // Get fresh reference to enemies
        // Note: we must use unitsRef.current in loops to get latest component state if it updates, 
        // but here we are in an async function.
        // Simple AI: Iterate all enemies. If can attack, attack. Else, wait.
        // No movement for now.

        const enemies = unitsRef.current.filter(u => u.faction === Faction.ENEMY);

        for (const enemy of enemies) {
            // Refresh map/units state (though simplistic AI just reads ref)
            const currentUnit = unitsRef.current.find(u => u.id === enemy.id);
            if (!currentUnit || currentUnit.hp <= 0) continue;

            // Check Attack Range FIRST
            const targets = getValidAttackTargets(currentUnit, unitsRef.current, map[0].length, map.length);

            // Skip inactive units
            if (targets.length === 0) continue;

            // Highlight & Focus (Only if acting)
            setSelectedUnitId(currentUnit.id);
            await wait(200);

            // Pick random target
            const targetPos = targets[Math.floor(Math.random() * targets.length)];
            const targetUnit = unitsRef.current.find(u => u.position.x === targetPos.x && u.position.y === targetPos.y);

            if (targetUnit) {
                setSystemMessage(`${currentUnit.name} attacks ${targetUnit.name}!`);

                // Attack!
                await performAttackAnimation(currentUnit.id, targetPos, targetUnit.id);
                const result = applyDamage(currentUnit.id, targetPos);

                if (result.success && result.isKill && result.targetId) {
                    await performDeathAnimation(result.targetId);
                }
            }

            // Mark as moved (internal state update)
            setUnits(prev => prev.map(u => u.id === enemy.id ? { ...u, hasMoved: true } : u));

            await wait(500); // Wait after attack
        }

        // End Enemy Turn
        setTurn(prev => prev + 1);
        setActiveFaction(Faction.PLAYER);

        // Reset Moves
        setUnits(prev => prev.map(u => ({ ...u, hasMoved: false })));

        setSystemMessage(`Turn ${turn + 1} started.`);
        // Note: 'turn' in state is old closure, but settter logic runs on new. 
        // However, the message will lag. Fix:
        setSystemMessage((prev) => "Player Turn Started"); // temporary message

        setHistory([]);
        setSelectedUnitId(null);
        setIsBusy(false);
    };

    const endTurn = () => {
        if (currentLevel && currentLevel.maxTurns > 0 && turn >= currentLevel.maxTurns) {
            setGameStatus(GameStatus.DEFEAT);
            return;
        }

        // Player Ends Turn -> Start Enemy Turn
        deselect();
        runEnemyTurn();
    };

    const undo = () => {
        // 0. Cancel Selection (Right Click during Move Phase)
        if (interactionMode === 'MOVEMENT' && selectedUnitId && !preMoveState) {
            deselect();
            return;
        }

        // 1. Cancel Selection/Menu
        // 1. Cancel Spell Menu -> Back to Attack Mode (Default)
        if (interactionMode === 'SPELL_MENU') {
            const unit = units.find(u => u.id === selectedUnitId);
            if (unit) enterAttackMode(unit, units);
            return;
        }

        // 2. Cancel Spell Targeting -> Back to Spell Menu
        if (interactionMode === 'TARGETING_SPELL') {
            setInteractionMode('SPELL_MENU');
            setSelectedSpell(null);
            setAttackRange([]);
            setSystemMessage("Select a spell.");
            return;
        }

        // 3. Cancel Move (Full Reset)
        if (interactionMode === 'TARGETING_ATTACK' && preMoveState) {
            restoreSnapshot(preMoveState);
            return;
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

    const enterEditor = () => {
        setGameStatus(GameStatus.EDITOR);
    };

    return {
        state: {
            gameStatus,
            currentLevel,
            map,
            units,
            turn,
            activeFaction, // Exposed
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
            enterEditor,
            selectUnit,
            deselect,
            moveUnit,
            attackUnit,
            waitUnit,
            endTurn,
            undo,
            setIsBusy, // kept for now
            enterAttackMode: () => {
                const u = units.find(unit => unit.id === selectedUnitId);
                if (u) enterAttackMode(u, units);
            },
            enterSpellMenu,
            enterSpellTargeting,
            castSpell,
            removeUnits: (unitIds: string[]) => {
                // Deprecated external usage, but kept for safety
                performDeathAnimation(unitIds[0]);
            }
        },
        combatState: { // Real state now
            shakingUnitId: visuals.shakingUnitId,
            dyingUnitIds: visuals.dyingUnitIds,
            attackerId: visuals.attackerId,
            attackOffset: { x: 0, y: 0 },
            attackTarget: visuals.attackTarget,
            effectType: visuals.effectType
        }
    };
};
