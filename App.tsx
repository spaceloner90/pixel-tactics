import React, { useState, useEffect } from 'react';
import { GameMap } from './components/GameMap';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { MapEditor } from './components/MapEditor';
import { useGameEngine } from './hooks/useGameEngine';
import { GameStatus, Position, Unit, Faction } from './types';
import { RetroBox } from './components/RetroUI';
import { TurnBanner } from './components/TurnBanner';

const App: React.FC = () => {
  const { state, actions, combatState } = useGameEngine();
  const [isLocalBusy, setIsLocalBusy] = useState(false);
  const [inspectedUnit, setInspectedUnit] = useState<Unit | undefined>(undefined);

  // Animation Helper for local UI moves (e.g. selection)
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Sync inspected unit with selection
  useEffect(() => {
    if (state.selectedUnitId) {
      const u = state.units.find(u => u.id === state.selectedUnitId);
      if (u) setInspectedUnit(u);
    }
  }, [state.selectedUnitId, state.units]);

  const handleHover = (pos: Position | null) => {
    if (pos) {
      const u = state.units.find(u => u.position.x === pos.x && u.position.y === pos.y);
      if (u) {
        setInspectedUnit(u);
      }
    }
  };

  const handleTileClick = async (pos: Position) => {
    // Blocks interaction if busy
    if (state.gameStatus !== GameStatus.PLAYING || state.isBusy || isLocalBusy) return;

    // MODE: MOVEMENT (Select or Move)
    if (state.interactionMode === 'MOVEMENT') {
      const unitAtTile = state.units.find(u => u.position.x === pos.x && u.position.y === pos.y);

      // Select Friendly Unit
      if (unitAtTile && unitAtTile.faction === Faction.PLAYER) {
        actions.selectUnit(unitAtTile.id);
        return;
      }

      // Move Selected Unit
      if (state.selectedUnitId) {
        const isReachable = state.reachableTiles.some(t => t.x === pos.x && t.y === pos.y);
        if (isReachable) {
          // Visual move
          setIsLocalBusy(true);
          await wait(200);
          actions.moveUnit(pos);
          setIsLocalBusy(false);
        } else {
          actions.deselect();
        }
      } else {
        actions.deselect();
      }
    }
    // MODE: TARGETING (Attack)
    else if (state.interactionMode === 'TARGETING_ATTACK') {
      const isTarget = state.actionTargets.some(t => t.x === pos.x && t.y === pos.y);

      if (isTarget) {
        if (state.selectedUnitId) {
          // Engine handles animation and state updates
          await actions.attackUnit(state.selectedUnitId, pos);
        }
      } else {
        if (state.selectedUnitId) {
          actions.waitUnit(state.selectedUnitId);
        }
      }
    }
    // MODE: SPELL TARGETING
    else if (state.interactionMode === 'TARGETING_SPELL') {
      const isTarget = state.actionTargets.some(t => t.x === pos.x && t.y === pos.y);
      if (isTarget) {
        if (state.selectedUnitId) {
          // Engine handles everything
          await actions.castSpell(pos);
        }
      } else {
        actions.deselect();
      }
    }
    // MODE: ACTION SELECT
    else if (state.interactionMode === 'ACTION_SELECT') {
      if (state.selectedUnitId) {
        actions.waitUnit(state.selectedUnitId);
      }
    }
  };

  if (state.gameStatus === GameStatus.EDITOR) {
    return <MapEditor onExit={actions.returnToMenu} />;
  }

  if (state.gameStatus === GameStatus.MENU) {
    return <MainMenu onStartLevel={actions.startLevel} onEnterEditor={actions.enterEditor} />;
  }

  return (
    <div
      className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden relative"
      style={{ backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)' }}
    >

      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white z-10 relative">
        <h1 className="text-2xl font-pixel text-yellow-400 drop-shadow-md tracking-wider">
          {state.currentLevel?.name}
        </h1>
        <RetroBox className="px-4 py-2 flex items-center gap-2">
          <span className="text-yellow-400 font-bold">TURN</span>
          <span className="text-2xl">
            {state.turn} {state.currentLevel?.maxTurns ? `/ ${state.currentLevel.maxTurns}` : ''}
          </span>
        </RetroBox>
      </div>

      <div className="relative z-10 flex gap-8 items-start">

        {/* Game Area */}
        <div
          className="relative flex justify-center items-center bg-black/20 rounded-lg border-2 border-white/5"
          style={{ width: 960, height: 768 }}
        >
          {state.map.length > 0 && (
            <GameMap
              map={state.map}
              units={state.units}
              selectedUnitId={state.selectedUnitId}
              reachableTiles={state.reachableTiles}
              attackRange={state.attackRange}
              actionTargets={state.actionTargets}
              onTileClick={handleTileClick}
              onHover={handleHover}
              onRightClick={actions.undo}
              combatState={combatState} // Passed directly from engine
              interactionMode={state.interactionMode}
              selectedSpell={state.selectedSpell}
            />
          )}
        </div>

        {/* HUD */}
        <GameHUD
          turn={state.turn}
          maxTurns={state.currentLevel?.maxTurns || 0}
          levelName={state.currentLevel?.name}
          gameStatus={state.gameStatus}
          selectedUnit={inspectedUnit} // Use inspected unit
          activeUnit={state.units.find(u => u.id === state.selectedUnitId)} // Actual acting unit
          systemMessage={state.systemMessage}
          interactionMode={state.interactionMode}
          isBusy={state.isBusy || isLocalBusy} // Combined Busy State
          onEndTurn={actions.endTurn}
          onQuit={actions.returnToMenu}
          onEnterAttack={actions.enterAttackMode}
          onEnterSpellMenu={actions.enterSpellMenu}
          onSelectSpell={actions.enterSpellTargeting}
          onWait={() => state.selectedUnitId && actions.waitUnit(state.selectedUnitId)}
          onUndo={actions.undo}
        />

        {/* Victory/Defeat Overlays */}
        {state.gameStatus === GameStatus.VICTORY && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 pointer-events-auto">
            <h2 className="text-4xl font-pixel text-yellow-400 mb-2">VICTORY</h2>
            <button onClick={actions.returnToMenu} className="text-white border px-4 py-2 mt-4 hover:bg-white/10">RETURN</button>
          </div>
        )}
        {state.gameStatus === GameStatus.DEFEAT && (
          <div className="absolute inset-0 z-50 bg-red-900/80 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 pointer-events-auto">
            <h2 className="text-4xl font-pixel text-red-400 mb-2">DEFEAT</h2>
            <button onClick={actions.returnToMenu} className="text-white border px-4 py-2 mt-4 hover:bg-white/10">RETREAT</button>
          </div>
        )}

        {/* Turn Banner Overlay */}
        <TurnBanner turn={state.turn} maxTurns={state.currentLevel?.maxTurns || 0} activeFaction={state.activeFaction} />

      </div>
    </div>
  );
};

export default App;