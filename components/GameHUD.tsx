import React from 'react';
import { Unit, Faction, UnitType, GameStatus } from '../types';
import { RetroBox, RetroButton } from './RetroUI';
import { Info } from 'lucide-react';

interface GameHUDProps {
    turn: number;
    maxTurns: number;
    levelName?: string;
    gameStatus: GameStatus;
    selectedUnit: Unit | undefined; // For Display (Intel)
    activeUnit?: Unit | undefined; // For Actions (Menus)
    systemMessage: string;
    interactionMode: string;
    isBusy: boolean;
    onEndTurn: () => void;
    onQuit: () => void;
    onEnterAttack?: () => void;
    onEnterSpellMenu?: () => void;
    onSelectSpell?: (spell: any) => void;
    onWait?: () => void;
    onUndo?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
    turn,
    maxTurns,
    levelName,
    gameStatus,
    selectedUnit,
    activeUnit,
    systemMessage,
    interactionMode,
    isBusy,
    onEndTurn,
    onQuit,
    onEnterAttack,
    onEnterSpellMenu,
    onSelectSpell,
    onWait,
    onUndo
}) => {
    return (
        <div className="flex flex-col gap-4 w-80 shrink-0 pointers-events-auto">
            {/* Note: pointers-events-auto in case parent disables them */}

            <RetroBox title="UNIT INTEL" className="h-[320px]">
                {selectedUnit ? (
                    <div className="flex flex-col h-full gap-3">
                        {/* Header */}
                        <div className="flex gap-3 border-b border-blue-700 pb-2">
                            {selectedUnit.portrait && (
                                <div className="w-16 h-16 shrink-0 bg-black/40 border border-blue-600 rounded overflow-hidden">
                                    <img
                                        src={selectedUnit.portrait}
                                        alt={selectedUnit.name}
                                        className="w-full h-full object-cover"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                            )}
                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <span className="text-yellow-400 font-bold text-xl truncate">{selectedUnit.name}</span>
                                <span className="text-xs bg-blue-800 px-2 py-0.5 rounded text-blue-200 uppercase tracking-wider w-fit">{selectedUnit.type}</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between bg-blue-900/50 p-1 px-2 rounded">
                                <span className="text-blue-300">HP</span>
                                <span className="text-white font-bold">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
                            </div>
                            <div className="flex justify-between bg-blue-900/50 p-1 px-2 rounded">
                                <span className="text-blue-300">MOVE</span>
                                <span className="text-white font-bold">{selectedUnit.moveRange}</span>
                            </div>
                            <div className="flex justify-between bg-blue-900/50 p-1 px-2 rounded">
                                <span className="text-blue-300">RANGE</span>
                                <span className="text-white font-bold">
                                    {selectedUnit.attackRangeMin !== selectedUnit.attackRangeMax
                                        ? `${selectedUnit.attackRangeMin}-${selectedUnit.attackRangeMax}`
                                        : selectedUnit.attackRangeMax}
                                </span>
                            </div>
                            {selectedUnit.faction === Faction.PLAYER && (
                                <div className="flex justify-between bg-blue-900/50 p-1 px-2 rounded">
                                    <span className="text-blue-300">ACT</span>
                                    <span className={`font-bold ${selectedUnit.hasMoved ? 'text-red-400' : 'text-green-400'}`}>
                                        {selectedUnit.hasMoved ? 'DONE' : 'READY'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Spells List (Intel) */}
                        {selectedUnit.spells && selectedUnit.spells.length > 0 && (
                            <div className="mt-2">
                                <div className="text-blue-400 text-xs mb-1">SPELLS</div>
                                <div className="flex flex-col gap-1">
                                    {selectedUnit.spells.map(s => (
                                        <div key={s.id} className="text-xs bg-purple-900/50 px-2 py-1 rounded border border-purple-500/30 text-purple-200">
                                            {s.name} <span className="text-purple-400 opacity-75 ml-1">({s.range}R)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fluff / Description placeholder */}
                        <div className="mt-auto pt-2 text-xs text-blue-300 italic opacity-60 border-t border-blue-800/50">
                            {selectedUnit.faction === Faction.PLAYER ? "Ready for command." : "Enemy unit detected."}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-blue-400 opacity-70">
                        <Info size={48} />
                        <span className="mt-4 text-sm uppercase tracking-widest">Select Unit</span>
                    </div>
                )}
            </RetroBox>

            {/* Contextual Menus - Fixed Height Container with Right Click Undo */}
            <div
                className="flex flex-col min-h-[200px] justify-end gap-2"
                onContextMenu={(e) => { e.preventDefault(); onUndo && onUndo(); }}
            >
                {interactionMode === 'SPELL_MENU' && activeUnit?.spells && (
                    <>
                        {activeUnit.spells.map(spell => (
                            <RetroButton key={spell.id} onClick={() => onSelectSpell && onSelectSpell(spell)} className="w-full bg-purple-600 border-purple-800">
                                {spell.name}
                            </RetroButton>
                        ))}
                        <RetroButton onClick={onUndo} className="w-full text-xs">
                            BACK
                        </RetroButton>
                    </>
                )}

                {/* ACTION PHASE (Attack Default) */}
                {interactionMode === 'TARGETING_ATTACK' && (
                    <>
                        {/* Magic */}
                        {activeUnit?.spells && activeUnit.spells.length > 0 && (
                            <RetroButton onClick={onEnterSpellMenu} className="w-full bg-purple-700 border-purple-900">
                                MAGIC
                            </RetroButton>
                        )}

                        {/* Wait - Standard Style */}
                        <RetroButton onClick={onWait} className="w-full">
                            WAIT
                        </RetroButton>

                        {/* Cancel - Warning Style */}
                        <RetroButton onClick={onUndo} className="w-full text-sm bg-red-600 border-red-800 hover:bg-red-500">
                            CANCEL MOVE
                        </RetroButton>
                    </>
                )}

                {/* MOVEMENT PHASE */}
                {interactionMode === 'MOVEMENT' && (
                    <>
                        <RetroButton onClick={onEndTurn} disabled={gameStatus !== GameStatus.PLAYING || isBusy} className="w-full text-lg">
                            END TURN
                        </RetroButton>

                        <RetroButton onClick={onQuit} disabled={isBusy} className="w-full text-sm bg-red-600 border-red-800 hover:bg-red-500">
                            QUIT MISSION
                        </RetroButton>
                    </>
                )}

                {/* SPELL TARGETING */}
                {interactionMode === 'TARGETING_SPELL' && (
                    <RetroButton onClick={onUndo} className="w-full text-xs">
                        CANCEL CAST
                    </RetroButton>
                )}
            </div>

            <div className="text-neutral-500 text-xs text-center font-mono mt-4 flex flex-col gap-1">
                {interactionMode === 'MOVEMENT' && <span>CLICK UNIT TO SELECT • CLICK BLUE TO MOVE</span>}
                {interactionMode === 'TARGETING_ATTACK' && <span className="text-red-400 font-bold">CLICK TARGET TO ATTACK</span>}
                {interactionMode === 'TARGETING_SPELL' && <span className="text-purple-400 font-bold">CLICK TARGET TO CAST</span>}
                {interactionMode === 'ACTION_SELECT' && <span className="text-yellow-400">CHOOSE ACTION</span>}
                <span className="text-neutral-400 mt-2">RIGHT CLICK TO UNDO / CANCEL</span>
            </div>
        </div>
    );
};
