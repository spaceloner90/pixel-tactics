import React, { useState } from 'react';
import { TileData, Unit, Position, TerrainType, Faction, UnitType, Spell } from '../types';
import { Swords, Skull, Crosshair, Zap } from 'lucide-react';

const TILE_SIZE = 48; // px
const VIEWPORT_WIDTH = 15; // tiles
const VIEWPORT_HEIGHT = 12; // tiles

interface CombatVisualState {
    shakingUnitId: string | null;
    dyingUnitIds: string[];
    attackerId: string | null;
    attackOffset: { x: number; y: number };
}

interface GameMapProps {
    map: TileData[][];
    units: Unit[];
    selectedUnitId: string | null;
    reachableTiles: Position[];
    attackRange: Position[]; // Visual range
    actionTargets: Position[]; // Valid click targets
    onTileClick: (pos: Position) => void;
    onHover?: (pos: Position | null) => void;
    onRightClick?: () => void;
    combatState: CombatVisualState;
    interactionMode?: string;
    selectedSpell?: Spell | null;
}

export const GameMap: React.FC<GameMapProps> = ({
    map,
    units,
    selectedUnitId,
    reachableTiles,
    attackRange,
    actionTargets,
    onTileClick,
    onHover,
    onRightClick,
    combatState,
    interactionMode,
    selectedSpell
}) => {
    const [hoverPos, setHoverPos] = useState<Position | null>(null);
    const [camera, setCamera] = useState({ x: 0, y: 0 });

    // Drag Panning Refs
    const isMouseDownRef = React.useRef(false);
    const isDraggingRef = React.useRef(false);
    const dragStartRef = React.useRef({ x: 0, y: 0 });
    const camStartRef = React.useRef({ x: 0, y: 0 });
    const clickBlockerRef = React.useRef(false);

    const getTerrainColor = (type: TerrainType) => {
        switch (type) {
            case TerrainType.OPEN: return 'bg-emerald-900 border-emerald-950'; // Grass-like
            case TerrainType.CLOSED: return 'bg-stone-800 border-stone-950'; // Wall
            default: return 'bg-gray-900';
        }
    };

    const width = map[0]?.length || 0;
    const height = map.length || 0;

    // Viewport Limits
    const maxScrollX = Math.max(0, (width * TILE_SIZE) - (VIEWPORT_WIDTH * TILE_SIZE));
    const maxScrollY = Math.max(0, (height * TILE_SIZE) - (VIEWPORT_HEIGHT * TILE_SIZE));

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isMouseDownRef.current) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                // Threshold to detect drag
                if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    isDraggingRef.current = true;
                    document.body.style.cursor = 'grabbing';
                }

                if (isDraggingRef.current) {
                    const newX = camStartRef.current.x - dx;
                    const newY = camStartRef.current.y - dy;

                    setCamera({
                        x: Math.round(Math.max(0, Math.min(newX, maxScrollX))),
                        y: Math.round(Math.max(0, Math.min(newY, maxScrollY)))
                    });
                }
            }
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                clickBlockerRef.current = true;
                setTimeout(() => clickBlockerRef.current = false, 50);
                document.body.style.cursor = 'default';
            }
            isMouseDownRef.current = false;
            isDraggingRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [maxScrollX, maxScrollY]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        isMouseDownRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        camStartRef.current = { x: camera.x, y: camera.y };
        isDraggingRef.current = false;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onRightClick) onRightClick();
    };

    const onWrapperClick = (x: number, y: number) => {
        if (!clickBlockerRef.current) {
            onTileClick({ x, y });
        }
    };

    const handleMouseEnterTile = (pos: Position) => {
        setHoverPos(pos);
        if (onHover) onHover(pos);
    };

    const handleMouseLeaveMap = () => {
        setHoverPos(null);
        if (onHover) onHover(null);
    };

    return (
        <div
            className="relative bg-black shadow-2xl rounded overflow-hidden select-none border-4 border-gray-800 box-content"
            style={{
                width: Math.min(width, VIEWPORT_WIDTH) * TILE_SIZE,
                height: Math.min(height, VIEWPORT_HEIGHT) * TILE_SIZE
            }}
            onMouseLeave={handleMouseLeaveMap}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
        >
            <div
                className="absolute top-0 left-0 transition-transform duration-0"
                style={{ transform: `translate(-${camera.x}px, -${camera.y}px)` }}
            >
                {map.map((row, y) => (
                    row.map((tile, x) => {
                        const isReachable = reachableTiles.some(p => p.x === x && p.y === y);
                        const isInAttackRange = attackRange.some(p => p.x === x && p.y === y);
                        const isAttackTarget = actionTargets.some(p => p.x === x && p.y === y);
                        const isClosed = tile.terrain === TerrainType.CLOSED;

                        // AOE Visualization
                        let isAOE = false;

                        if (interactionMode === 'TARGETING_SPELL' && selectedSpell && hoverPos) {
                            // 1. Is the HOVERED tile a valid target center?
                            const isHoverValid = actionTargets.some(p => p.x === hoverPos.x && p.y === hoverPos.y);

                            // 2. If valid, check if THIS tile is in radius
                            if (isHoverValid) {
                                const radius = selectedSpell.radius;
                                const distX = Math.abs(x - hoverPos.x);
                                const distY = Math.abs(y - hoverPos.y);
                                // Square AOE
                                if (distX <= radius && distY <= radius) {
                                    isAOE = true;
                                }
                            }
                        }

                        return (
                            <div
                                key={`${x}-${y}`}
                                className={`
                    absolute border-r border-b border-black/20
                    ${isClosed ? '' : 'cursor-pointer hover:brightness-110'}
                    ${getTerrainColor(tile.terrain)}
                    transition-all duration-100
                `}
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    left: x * TILE_SIZE,
                                    top: y * TILE_SIZE
                                }}
                                onClick={() => onWrapperClick(x, y)}
                                onMouseEnter={() => handleMouseEnterTile({ x, y })}
                            >
                                {isClosed && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                        <div className="w-4 h-4 bg-black/40 rounded-full"></div>
                                    </div>
                                )}
                                {isReachable && (
                                    <div className="absolute inset-0 bg-blue-500/40 animate-pulse border-2 border-blue-300 z-10"></div>
                                )}
                                {isInAttackRange && !isAOE && (
                                    <div className="absolute inset-0 bg-red-500/20 z-10"></div>
                                )}
                                {isAttackTarget && !isAOE && (
                                    <div className="absolute inset-0 border-2 border-red-500/50 z-20"></div>
                                )}
                                {isAOE && (
                                    <div className="absolute inset-0 bg-purple-500/60 animate-pulse border-2 border-purple-300 z-30 flex items-center justify-center">
                                        <Zap size={24} className="text-white opacity-80" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                ))}

                {/* Layer 2: Units */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
                    {units.map(unit => {
                        const isSelected = unit.id === selectedUnitId;
                        const isShaking = unit.id === combatState.shakingUnitId;
                        const isDying = combatState.dyingUnitIds.includes(unit.id);
                        const isAttacker = unit.id === combatState.attackerId;

                        // Apply Lunge Offset if attacking
                        const transformStyle = isAttacker
                            ? `translate(${combatState.attackOffset.x}px, ${combatState.attackOffset.y}px)`
                            : 'translate(0,0)';

                        return (
                            <div
                                key={unit.id}
                                className={`
                    absolute flex items-center justify-center transition-all duration-300 ease-in-out
                    ${isDying ? 'scale-0 opacity-0 delay-300' : 'scale-100 opacity-100'}
                    `}
                                style={{
                                    left: unit.position.x * TILE_SIZE,
                                    top: unit.position.y * TILE_SIZE,
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                }}
                            >
                                <div
                                    className={`
                        relative w-[90%] h-[90%] flex flex-col items-center justify-center rounded-sm shadow-md transition-transform duration-100
                        ${unit.faction === Faction.PLAYER ? 'bg-blue-600' : 'bg-red-700'}
                        ${unit.hasMoved ? 'grayscale brightness-75' : ''}
                        ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                        ${isShaking ? 'shake' : ''}
                    `}
                                    style={{ transform: transformStyle }}
                                >
                                    {/* Top HP Bar */}
                                    <div className="absolute top-0 left-0 right-0 h-3 bg-red-900 border-b border-black/50 overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 transition-all duration-300"
                                            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold leading-none shadow-black drop-shadow-md">
                                            {unit.hp}/{unit.maxHp}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-center justify-center mt-2">
                                        {((unit.faction === Faction.PLAYER && unit.type === UnitType.KNIGHT) || unit.type === UnitType.KNIGHT) && <Swords size={20} className="text-white" />}
                                        {unit.faction === Faction.PLAYER && unit.type === UnitType.ARCHER && <Crosshair size={20} className="text-white" />}
                                        {unit.faction === Faction.PLAYER && unit.type === UnitType.WIZARD && <Zap size={20} className="text-white" />}
                                        {unit.faction === Faction.ENEMY && unit.type !== UnitType.KNIGHT && <Skull size={20} className="text-white" />}
                                    </div>

                                    {/* Bottom Name */}
                                    <div className="mb-1 text-[8px] text-white font-bold text-center leading-none px-1 shadow-black drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                        {unit.name}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
