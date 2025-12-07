import React, { useState, useEffect } from 'react';
import { GameMap } from './GameMap';
import { RetroBox, RetroButton } from './RetroUI';
import { TileData, Unit, Position, TerrainType, UnitType, Faction } from '../types';
import { generateMap } from '../services/gameLogic';

interface MapEditorProps {
    onExit: () => void;
}

type Tool = 'WALL' | 'OPEN' | 'DELETE_UNIT' | 'KNIGHT' | 'ARCHER' | 'WIZARD';

export const MapEditor: React.FC<MapEditorProps> = ({ onExit }) => {
    // Editor State
    const [width, setWidth] = useState(20);
    const [height, setHeight] = useState(12);
    const [map, setMap] = useState<TileData[][]>([]);
    const [units, setUnits] = useState<Unit[]>([]);

    // Config State
    const [levelName, setLevelName] = useState("Custom Level");
    const [description, setDescription] = useState("Created with Map Editor");
    const [maxTurns, setMaxTurns] = useState(0);

    // Tool State
    const [selectedTool, setSelectedTool] = useState<Tool>('WALL');
    const [paletteFaction, setPaletteFaction] = useState<Faction>(Faction.PLAYER);
    const [notification, setNotification] = useState("");

    // Initialize Map
    useEffect(() => {
        setMap(generateMap(width, height));
    }, [width, height]);

    // Helpers
    const getNextUnitId = (type: UnitType, faction: Faction) => {
        const count = units.filter(u => u.type === type && u.faction === faction).length + 1;
        return `${type.toLowerCase()}_${faction === Faction.PLAYER ? 'p' : 'e'}_${count}_${Date.now()}`; // Unique ID
    };

    const getPortrait = (type: UnitType, faction: Faction) => {
        if (faction === Faction.PLAYER) {
            if (type === UnitType.KNIGHT) return '/pixel-tactics/assets/portraits/alaric.png';
            if (type === UnitType.ARCHER) return '/pixel-tactics/assets/portraits/archer.png';
            if (type === UnitType.WIZARD) return '/pixel-tactics/assets/portraits/wizard.png';
        } else {
            return '/pixel-tactics/assets/portraits/enemy_soldier.png';
        }
        return undefined;
    };

    const handleTileClick = (pos: Position) => {
        // Handle Terrain Editing
        if (selectedTool === 'WALL' || selectedTool === 'OPEN') {
            const newMap = map.map(row => row.map(tile => {
                if (tile.x === pos.x && tile.y === pos.y) {
                    return { ...tile, terrain: selectedTool === 'WALL' ? TerrainType.CLOSED : TerrainType.OPEN };
                }
                return tile;
            }));
            setMap(newMap);
        }

        // Handle Unit Placement
        if (['KNIGHT', 'ARCHER', 'WIZARD'].includes(selectedTool)) {
            // Remove existing unit at pos
            const filteredUnits = units.filter(u => u.position.x !== pos.x || u.position.y !== pos.y);

            // Add new unit
            const type = selectedTool as UnitType;
            const newUnit: Unit = {
                id: getNextUnitId(type, paletteFaction),
                name: `${paletteFaction === Faction.PLAYER ? 'Hero' : 'Enemy'} ${type}`,
                type: type,
                faction: paletteFaction,
                position: pos,
                hp: 1, // Default
                maxHp: 1,
                moveRange: type === UnitType.KNIGHT ? 5 : 3,
                attackRangeMin: type === UnitType.ARCHER ? 2 : 1,
                attackRangeMax: type === UnitType.ARCHER ? 4 : 1,
                hasMoved: false,
                portrait: getPortrait(type, paletteFaction),
                spells: type === UnitType.WIZARD ? [{ id: 'fireball', name: 'Fireball', range: 3, radius: 1, damage: 1 }] : undefined
            };
            setUnits([...filteredUnits, newUnit]);
        }

        // Handle Delete Unit
        if (selectedTool === 'DELETE_UNIT') {
            setUnits(units.filter(u => u.position.x !== pos.x || u.position.y !== pos.y));
        }
    };

    const handleExport = () => {
        const walls = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (map[y][x].terrain === TerrainType.CLOSED) {
                    walls.push({ x, y });
                }
            }
        }

        const config = {
            id: Date.now(),
            name: levelName,
            description: description,
            width,
            height,
            maxTurns,
            walls: walls.length > 0 ? walls : undefined,
            units: units.map(u => ({
                ...u,
                id: u.id, // Keep generated ID or simplify? Generated is fine.
                hasMoved: false
            }))
        };

        const json = JSON.stringify(config, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            setNotification("JSON Copied to Clipboard!");
            setTimeout(() => setNotification(""), 3000);
        });
        console.log("Exported Level:", config);
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center p-4 font-sans text-white overflow-hidden">
            {/* Header */}
            <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-pixel text-yellow-400">MAP EDITOR</h1>
                    <div className="flex gap-2">
                        <input
                            value={levelName}
                            onChange={e => setLevelName(e.target.value)}
                            className="bg-neutral-800 border border-neutral-600 px-2 py-1 text-sm rounded"
                            placeholder="Level Name"
                        />
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="bg-neutral-800 border border-neutral-600 px-2 py-1 text-sm rounded w-64"
                            placeholder="Description"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <RetroButton onClick={handleExport} className="bg-green-700 border-green-900 text-xs">
                        EXPORT JSON
                    </RetroButton>
                    <RetroButton onClick={onExit} className="bg-red-700 border-red-900 text-xs">
                        EXIT
                    </RetroButton>
                </div>
            </div>

            <div className="flex gap-4 h-[calc(100vh-100px)] w-full max-w-6xl">
                {/* Sidebar */}
                <RetroBox title="TOOLS" className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto">
                    {/* Terrain Tools */}
                    <div>
                        <div className="text-xs text-blue-400 mb-2 font-bold">TERRAIN</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setSelectedTool('WALL')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'WALL' ? 'bg-blue-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                WALL (BLOCK)
                            </button>
                            <button
                                onClick={() => setSelectedTool('OPEN')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'OPEN' ? 'bg-blue-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                OPEN (ERASE)
                            </button>
                        </div>
                    </div>

                    {/* Unit Tools */}
                    <div>
                        <div className="text-xs text-blue-400 mb-2 font-bold">UNITS</div>
                        <div className="flex gap-2 mb-2 bg-neutral-900 p-1 rounded">
                            <button
                                onClick={() => setPaletteFaction(Faction.PLAYER)}
                                className={`flex-1 text-xs py-1 rounded ${paletteFaction === Faction.PLAYER ? 'bg-blue-600' : 'text-neutral-500'}`}
                            >
                                PLAYER
                            </button>
                            <button
                                onClick={() => setPaletteFaction(Faction.ENEMY)}
                                className={`flex-1 text-xs py-1 rounded ${paletteFaction === Faction.ENEMY ? 'bg-red-600' : 'text-neutral-500'}`}
                            >
                                ENEMY
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setSelectedTool('KNIGHT')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'KNIGHT' ? 'bg-yellow-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                KNIGHT
                            </button>
                            <button
                                onClick={() => setSelectedTool('ARCHER')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'ARCHER' ? 'bg-yellow-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                ARCHER
                            </button>
                            <button
                                onClick={() => setSelectedTool('WIZARD')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'WIZARD' ? 'bg-yellow-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                WIZARD
                            </button>
                            <button
                                onClick={() => setSelectedTool('DELETE_UNIT')}
                                className={`p-2 border rounded text-xs ${selectedTool === 'DELETE_UNIT' ? 'bg-red-900 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                            >
                                DELETE UNIT
                            </button>
                        </div>
                    </div>

                    {/* Resize Config */}
                    <div className="mt-auto border-t border-neutral-700 pt-4">
                        <div className="text-xs text-blue-400 mb-2 font-bold">MAP SIZE (RESETS)</div>
                        <div className="flex gap-2 items-center">
                            <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-12 bg-neutral-800 text-xs p-1" />
                            <span className="text-xs">x</span>
                            <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-12 bg-neutral-800 text-xs p-1" />
                        </div>
                    </div>
                </RetroBox>

                {/* Canvas Preserved */}
                <div className="flex-1 bg-black/50 border-2 border-white/10 rounded flex items-center justify-center overflow-hidden relative">
                    {/* Notification Overlay */}
                    {notification && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-bounce">
                            {notification}
                        </div>
                    )}

                    {map.length > 0 && (
                        <GameMap
                            map={map}
                            units={units}
                            selectedUnitId={null}
                            reachableTiles={[]}
                            attackRange={[]}
                            actionTargets={[]}
                            onTileClick={handleTileClick}
                            onHover={() => { }}
                            combatState={{ shakingUnitId: null, dyingUnitIds: [], attackerId: null, attackOffset: { x: 0, y: 0 }, attackTarget: null }}
                            interactionMode="MOVEMENT" // Default look
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
