import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { GameMap } from './GameMap';
import { RetroBox, RetroButton } from './RetroUI';
import { TileData, Unit, Position, TerrainType, UnitType, Faction, LevelConfig } from '../types';
import { generateMap } from '../services/gameLogic';
import { LEVELS } from '../data/levels';

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
    const [activeLayer, setActiveLayer] = useState<'TERRAIN' | 'UNITS'>('TERRAIN');
    const [paletteFaction, setPaletteFaction] = useState<Faction>(Faction.PLAYER);
    const [notification, setNotification] = useState("");

    // Interaction State
    const [clipboard, setClipboard] = useState<{ type: 'TERRAIN' | 'UNIT'; value: any } | null>(null);
    const [hoveredPos, setHoveredPos] = useState<Position | null>(null);

    // History
    const [history, setHistory] = useState<Array<{ map: TileData[][]; units: Unit[] }>>([]);

    // JSON Editor State
    const [showJsonEditor, setShowJsonEditor] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [isJsonFocused, setIsJsonFocused] = useState(false);

    const [jsonError, setJsonError] = useState<string | null>(null);

    const pushHistory = () => {
        setHistory(prev => {
            const newHistory = [...prev, { map: JSON.parse(JSON.stringify(map)), units: JSON.parse(JSON.stringify(units)) }];
            if (newHistory.length > 20) newHistory.shift();
            return newHistory;
        });
    };

    const undo = () => {
        if (history.length === 0) return;
        setHistory(prev => {
            const newHistory = [...prev];
            const state = newHistory.pop();
            if (state) {
                setMap(state.map);
                setUnits(state.units);
                setNotification("Undo");
                setTimeout(() => setNotification(""), 1000);
            }
            return newHistory;
        });
    };

    // Initialize Map
    useEffect(() => {
        // Only regenerate if dimensions actually changed and map is empty or mismatch
        // This prevents blowing up the map when loading from JSON if width/height are set first
        if (map.length === 0 || map.length !== height || map[0].length !== width) {
            const newMap = generateMap(width, height);
            // Preserve walls if possible? For now, clean slate on resize is safer unless we merge.
            // But wait, if we are loading from JSON, we don't want to overwrite with empty map immediately.
            // We'll handle JSON loading separately.
            setMap(newMap);
        }
    }, [width, height]);


    // Helper to generate config object (No callback to ensure always fresh)
    const getLevelConfigFromState = () => {
        const walls: Position[] = [];
        if (map.length > 0) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (map[y] && map[y][x] && map[y][x].terrain === TerrainType.CLOSED) {
                        walls.push({ x, y });
                    }
                }
            }
        }

        return {
            id: Date.now(), // Placeholder ID
            name: levelName,
            description: description,
            width,
            height,
            maxTurns,
            walls: walls.length > 0 ? walls : undefined,
            units: units.map(u => ({
                ...u,
                id: u.id,
                hasMoved: false
            }))
        };
    };

    // Sync State -> JSON
    useEffect(() => {
        if (!isJsonFocused && showJsonEditor) {
            const config = getLevelConfigFromState();
            setJsonText(JSON.stringify(config, null, 2));
        }
    }, [map, units, width, height, levelName, description, maxTurns, isJsonFocused, showJsonEditor]);

    // Load Level Helper
    const loadLevel = (config: LevelConfig) => {
        setLevelName(config.name);
        setDescription(config.description || "");
        setMaxTurns(config.maxTurns || 0);

        // Update Dimensions
        setWidth(config.width);
        setHeight(config.height);

        // Update Map (Walls)
        let newMap = generateMap(config.width, config.height);
        if (config.walls && Array.isArray(config.walls)) {
            newMap = newMap.map(row => row.map(tile => {
                if (config.walls?.some((w: Position) => w.x === tile.x && w.y === tile.y)) {
                    return { ...tile, terrain: TerrainType.CLOSED };
                }
                return tile;
            }));
        }
        setMap(newMap);

        // Update Units
        // Deep copy units to avoid reference issues
        setUnits(JSON.parse(JSON.stringify(config.units || [])));

        setNotification(`Loaded "${config.name}"`);
        setTimeout(() => setNotification(""), 2000);
    };

    // Sync JSON -> State
    const handleJsonChange = (text: string) => {
        setJsonText(text);
        setJsonError(null);

        try {
            const config = JSON.parse(text);

            // Basic Validation
            if (typeof config.width !== 'number' || typeof config.height !== 'number') return;

            // 1. Update Config Props
            setLevelName(config.name || "Custom Level");
            setDescription(config.description || "");
            setMaxTurns(config.maxTurns || 0);

            // 2. Update Dimensions (This triggers map regen effect, but we will overwrite it below immediately? 
            // actually the effect runs after render. We need to be careful.)
            // Let's set dimensions.
            if (config.width !== width) setWidth(config.width);
            if (config.height !== height) setHeight(config.height);

            // 3. Update Map (Walls)
            // We need to construct the map manually here because waiting for useEffect might be too slow or racey
            let newMap = generateMap(config.width, config.height);
            if (config.walls && Array.isArray(config.walls)) {
                newMap = newMap.map(row => row.map(tile => {
                    if (config.walls.some((w: Position) => w.x === tile.x && w.y === tile.y)) {
                        return { ...tile, terrain: TerrainType.CLOSED };
                    }
                    return tile;
                }));
            }
            setMap(newMap);

            // 4. Update Units
            if (config.units && Array.isArray(config.units)) {
                setUnits(config.units);
            } else {
                setUnits([]);
            }

        } catch (e) {
            // Invalid JSON, just ignore until valid
            setJsonError("Invalid JSON");
        }
    };

    const getNextUnitId = (type: UnitType, faction: Faction) => {
        return `${type}_${faction}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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

    const handleHover = (pos: Position | null) => {
        setHoveredPos(pos);
    };

    const handleTileAction = (pos: Position) => {
        pushHistory();

        // Terrain Layer Actions
        if (activeLayer === 'TERRAIN') {
            if (selectedTool === 'WALL' || selectedTool === 'OPEN') {
                const newMap = map.map(row => row.map(tile => {
                    if (tile.x === pos.x && tile.y === pos.y) {
                        return { ...tile, terrain: selectedTool === 'WALL' ? TerrainType.CLOSED : TerrainType.OPEN };
                    }
                    return tile;
                }));
                setMap(newMap);
            }
        }

        // Unit Layer Actions
        if (activeLayer === 'UNITS') {
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

            if (selectedTool === 'DELETE_UNIT') {
                setUnits(units.filter(u => u.position.x !== pos.x || u.position.y !== pos.y));
            }
        }
    };

    const handleExport = () => {
        const config = getLevelConfigFromState();
        const json = JSON.stringify(config, null, 2);

        // Also copy to clipboard for good measure
        navigator.clipboard.writeText(json).then(() => {
            setNotification("JSON Copied to Clipboard!");
            setTimeout(() => setNotification(""), 3000);
        });

        // Also open editor if not open
        if (!showJsonEditor) {
            setShowJsonEditor(true);
            setJsonText(json);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in inputs
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    undo();
                }
                if (e.key === 'x') {
                    e.preventDefault();
                    if (hoveredPos) {
                        // Cut Logic
                        pushHistory();
                        // Determine what is at hoveredPos
                        if (activeLayer === 'UNITS') {
                            const unit = units.find(u => u.position.x === hoveredPos.x && u.position.y === hoveredPos.y);
                            if (unit) {
                                setClipboard({ type: 'UNIT', value: unit });
                                setUnits(prev => prev.filter(u => u.id !== unit.id));
                                setNotification("Cut Unit");
                            }
                        } else if (activeLayer === 'TERRAIN') {
                            if (map[hoveredPos.y] && map[hoveredPos.y][hoveredPos.x]) {
                                setClipboard({ type: 'TERRAIN', value: map[hoveredPos.y][hoveredPos.x].terrain });
                                // Delete by setting to OPEN
                                setMap(prev => prev.map(row => row.map(t => {
                                    if (t.x === hoveredPos.x && t.y === hoveredPos.y) return { ...t, terrain: TerrainType.OPEN };
                                    return t;
                                })));
                                setNotification("Cut Terrain");
                            }
                        }
                    }
                }
                if (e.key === 'c') {
                    e.preventDefault();
                    if (hoveredPos) {
                        if (activeLayer === 'UNITS') {
                            const unit = units.find(u => u.position.x === hoveredPos.x && u.position.y === hoveredPos.y);
                            if (unit) {
                                setClipboard({ type: 'UNIT', value: unit });
                                setNotification("Copied Unit");
                            }
                        } else if (activeLayer === 'TERRAIN') {
                            if (map[hoveredPos.y] && map[hoveredPos.y][hoveredPos.x]) {
                                setClipboard({ type: 'TERRAIN', value: map[hoveredPos.y][hoveredPos.x].terrain });
                                setNotification("Copied Terrain");
                            }
                        }
                    }
                }
                if (e.key === 'v') {
                    e.preventDefault();
                    if (hoveredPos && clipboard) {
                        pushHistory();
                        if (activeLayer === 'UNITS' && clipboard.type === 'UNIT') {
                            const unit = clipboard.value as Unit;
                            // Paste unit as new ID
                            const newUnit = { ...unit, id: getNextUnitId(unit.type, unit.faction), position: hoveredPos };
                            setUnits(prev => [...prev.filter(u => u.position.x !== hoveredPos.x || u.position.y !== hoveredPos.y), newUnit]);
                            setNotification("Pasted Unit");
                        } else if (activeLayer === 'TERRAIN' && clipboard.type === 'TERRAIN') {
                            setMap(prev => prev.map(row => row.map(t => {
                                if (t.x === hoveredPos.x && t.y === hoveredPos.y) return { ...t, terrain: clipboard.value };
                                return t;
                            })));
                            setNotification("Pasted Terrain");
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, hoveredPos, activeLayer, units, map, clipboard, paletteFaction]);

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center p-4 font-sans text-white overflow-hidden">
            {/* Header */}
            <div className="w-full max-w-7xl flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-pixel text-yellow-400">MAP EDITOR</h1>
                    <select
                        className="bg-neutral-800 border border-neutral-600 px-2 py-1 text-xs rounded text-neutral-300"
                        onChange={(e) => {
                            const level = LEVELS.find(l => l.id === Number(e.target.value));
                            if (level) loadLevel(level);
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>LOAD PRESET</option>
                        {LEVELS.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
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
                    <RetroButton
                        onClick={() => setShowJsonEditor(!showJsonEditor)}
                        className={`text-xs ${showJsonEditor ? 'bg-blue-600' : 'bg-blue-800'}`}
                    >
                        {showJsonEditor ? 'HIDE JSON' : 'SHOW JSON'}
                    </RetroButton>
                    <RetroButton onClick={handleExport} className="bg-green-700 border-green-900 text-xs">
                        COPY JSON
                    </RetroButton>
                    <RetroButton onClick={onExit} className="bg-red-700 border-red-900 text-xs">
                        EXIT
                    </RetroButton>
                </div>
            </div>

            <div className="flex gap-4 h-[calc(100vh-100px)] w-full max-w-7xl relative">
                {/* Sidebar */}
                <RetroBox title="TOOLS" className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto z-10">
                    {/* Layer Toggle */}
                    <div className="flex mb-4">
                        <button
                            onClick={() => { setActiveLayer('TERRAIN'); setSelectedTool('WALL'); }}
                            className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeLayer === 'TERRAIN' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-500'}`}
                        >
                            TERRAIN
                        </button>
                        <button
                            onClick={() => { setActiveLayer('UNITS'); setSelectedTool('KNIGHT'); }}
                            className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeLayer === 'UNITS' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-neutral-500'}`}
                        >
                            UNITS
                        </button>
                    </div>

                    {/* Common Tools */}
                    <div>
                        <div className="text-xs text-neutral-400 mb-2 font-bold">COMMON</div>
                        <div className="text-xs text-neutral-500 mb-2 p-2 bg-neutral-800 rounded">
                            <div className="font-bold text-white mb-1">SHORTCUTS</div>
                            <div>CTRL+C: Copy</div>
                            <div>CTRL+X: Cut</div>
                            <div>CTRL+V: Paste</div>
                            <div>CTRL+Z: Undo</div>
                        </div>
                    </div>

                    {/* Terrain Tools */}
                    {activeLayer === 'TERRAIN' && (
                        <div>
                            <div className="text-xs text-blue-400 mb-2 font-bold">TERRAIN</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setSelectedTool('WALL')}
                                    className={`p-2 border rounded text-xs ${selectedTool === 'WALL' ? 'bg-blue-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                                >
                                    WALL
                                </button>
                                <button
                                    onClick={() => setSelectedTool('OPEN')}
                                    className={`p-2 border rounded text-xs ${selectedTool === 'OPEN' ? 'bg-blue-600 border-white' : 'bg-neutral-800 border-neutral-700'}`}
                                >
                                    OPEN (ERASE)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Unit Tools */}
                    {activeLayer === 'UNITS' && (
                        <div>
                            <div className="text-xs text-yellow-400 mb-2 font-bold">UNITS</div>
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
                    )}

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
                <div className="flex-1 bg-black/50 border-2 border-white/10 rounded flex items-center justify-center overflow-hidden relative min-w-[964px]">
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
                            onTileClick={(pos) => handleTileAction(pos)} // Click backup
                            onHover={handleHover}
                            onRightClick={undo}
                            combatState={{ shakingUnitId: null, dyingUnitIds: [], attackerId: null, attackOffset: { x: 0, y: 0 }, attackTarget: null }}
                            interactionMode="EDITOR"
                        />
                    )}

                    {/* JSON Editor Overlay */}
                    {showJsonEditor && (
                        <div className="absolute bottom-4 right-4 top-4 w-96 z-40 flex flex-col">
                            <RetroBox title="JSON DATA" className="flex-1 h-full flex flex-col bg-slate-900/95 shadow-2xl">
                                {jsonError && <div className="text-red-400 text-xs mb-1 font-bold">{jsonError}</div>}
                                <textarea
                                    className="w-full h-full flex-1 bg-black/50 text-green-400 font-mono text-xs p-2 resize-none outline-none border border-white/10"
                                    value={jsonText}
                                    onChange={(e) => handleJsonChange(e.target.value)}
                                    onFocus={() => setIsJsonFocused(true)}
                                    onBlur={() => setIsJsonFocused(false)}
                                    spellCheck={false}
                                />
                                <div className="text-[10px] text-neutral-500 mt-1 text-center">
                                    Edits auto-apply. Invalid JSON is ignored.
                                </div>
                            </RetroBox>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
