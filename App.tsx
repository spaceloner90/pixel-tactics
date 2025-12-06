import React, { useState, useEffect } from 'react';
import { GameMap } from './components/GameMap';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { useGameEngine } from './hooks/useGameEngine';
import { GameStatus, Position, Unit, Faction } from './types';
import { RetroBox } from './components/RetroUI';

const App: React.FC = () => {
  const { state, actions, combatState } = useGameEngine();
  const [isLocalBusy, setIsLocalBusy] = useState(false);
  const [inspectedUnit, setInspectedUnit] = useState<Unit | undefined>(undefined);

  // Animation Helper
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

  const animateMove = async (unitId: string, path: Position[]) => {
    // Current implementation moves instantly logic-wise, visual interpolation handled by CSS
    // If we want step-by-step, we'd block interaction
    setIsLocalBusy(true);
    await wait(300); // Mock travel time
    setIsLocalBusy(false);
  };

  const animateAttack = async (attackerId: string, targetPos: Position) => {
    setIsLocalBusy(true);
    await wait(300); // Lunge
    await wait(200); // Impact
    setIsLocalBusy(false);
  };

  const handleTileClick = async (pos: Position) => {
    // Blocks interaction if busy
    if (state.gameStatus !== GameStatus.PLAYING || state.isBusy || isLocalBusy) return;

    // MODE: MOVEMENT (Select or Move)
    if (state.interactionMode === 'MOVEMENT') {
      const unitAtTile = state.units.find(u => u.position.x === pos.x && u.position.y === pos.y);

      // Select Friendly Unit
      if (unitAtTile && unitAtTile.faction === Faction.PLAYER) {
        // Allow selecting even if hasMoved (for inspection) - handled by selectUnit logic now
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
          // Deselect if clicking elsewhere (empty or enemy)
          actions.deselect();
        }
      } else {
        // Nothing selected, clicked empty/enemy -> just Deselect to be sure
        actions.deselect();
      }
    }
    // MODE: TARGETING (Attack)
    else if (state.interactionMode === 'TARGETING_ATTACK') {
      // Check if valid target
      const isTarget = state.actionTargets.some(t => t.x === pos.x && t.y === pos.y);

      if (isTarget) {
        setIsLocalBusy(true);
        if (state.selectedUnitId) {
          const targetUnit = state.units.find(u => u.position.x === pos.x && u.position.y === pos.y);

          // Animate First (Lunge) - State hasn't changed yet
          await animateAttack(state.selectedUnitId, pos);

          const result = await actions.attackUnit(state.selectedUnitId, pos);

          if (result?.success) {
            // Check for Kill
            if (result?.isKill && targetUnit) {
              await wait(450); // Wait for death animation (delayed 300ms + duration 300ms)
              actions.removeUnits([targetUnit.id]);
            }
          }
        }
        setIsLocalBusy(false);
      } else {
        // Any click on a non-target tile interprets as "Wait" / "Cancel Attack" -> End Turn
        if (state.selectedUnitId) {
          actions.waitUnit(state.selectedUnitId);
        }
      }
    }
    // MODE: SPELL TARGETING
    else if (state.interactionMode === 'TARGETING_SPELL') {
      const isTarget = state.actionTargets.some(t => t.x === pos.x && t.y === pos.y);
      if (isTarget) {
        setIsLocalBusy(true);
        if (state.selectedUnitId) {
          await animateAttack(state.selectedUnitId, pos); // Re-using attack animation
          actions.castSpell(pos);

          // Check for spell kills (delayed)
          if (state.selectedSpell) {
            const spell = state.selectedSpell;
            const targets = state.units.filter(u => {
              const radius = spell.radius;
              const distX = Math.abs(u.position.x - pos.x);
              const distY = Math.abs(u.position.y - pos.y);
              return distX <= radius && distY <= radius;
            });

            // Wait for animation
            // Wait for animation
            const deadUnits = targets.filter(t => t.hp - spell.damage <= 0);
            if (deadUnits.length > 0) {
              await wait(450);
              actions.removeUnits(deadUnits.map(t => t.id));
            }
          }
        }
        setIsLocalBusy(false);
      } else {
        // Cancel spell targeting
        actions.deselect();
      }
    }
    // MODE: ACTION SELECT (e.g. Wizard Menu)
    else if (state.interactionMode === 'ACTION_SELECT') {
      // User requested: "skip the turn by clicking on the map before choosing an action"
      if (state.selectedUnitId) {
        actions.waitUnit(state.selectedUnitId);
      }
    }
  };

  if (state.gameStatus === GameStatus.MENU) {
    return <MainMenu onStartLevel={actions.startLevel} />;
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
        <div className="relative">
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
              combatState={combatState}
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
          isBusy={isLocalBusy}
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

      </div>
    </div>
  );
};

export default App;