import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameStatus, UnitType, Faction } from '../types';

describe('useGameEngine Scenarios', () => {

    it('Scenario 1: Move Right & Kill -> Victory', async () => {
        const { result } = renderHook(() => useGameEngine());

        // 1. Start Level 1 (Training Corridor)
        const level1 = {
            id: 1,
            name: "Test Level",
            description: "Test description",
            width: 6,
            height: 1,
            maxTurns: 1,
            units: [
                {
                    id: 'hero',
                    name: 'Hero',
                    type: UnitType.KNIGHT,
                    faction: Faction.PLAYER,
                    position: { x: 0, y: 0 },
                    hp: 10,
                    maxHp: 10,
                    moveRange: 5,
                    attackRangeMin: 1,
                    attackRangeMax: 1,
                    hasMoved: false
                },
                {
                    id: 'enemy',
                    name: 'Dummy',
                    type: UnitType.ARCHER,
                    faction: Faction.ENEMY,
                    position: { x: 1, y: 0 }, // Right next to hero
                    hp: 1,
                    maxHp: 1,
                    moveRange: 0,
                    attackRangeMin: 1,
                    attackRangeMax: 1,
                    hasMoved: false
                }
            ]
        };

        act(() => {
            result.current.actions.startLevel(level1);
        });

        expect(result.current.state.gameStatus).toBe(GameStatus.PLAYING);

        // 2. Select Hero
        act(() => {
            result.current.actions.selectUnit('hero');
        });

        // 3. Move Right (to x:1, y:0 is occupied, need to attack FROM adjacent)
        // Wait, let's verify positions. Hero at 0,0. Enemy at 1,0.
        // Hero can attack from 0,0 since range is 1. He doesn't even need to move legally?
        // But usually you move then attack.
        // Let's say Hero moves to 0,0 (stays put) then attacks 1,0.

        act(() => {
            result.current.actions.moveUnit({ x: 0, y: 0 });
        });

        // 4. Attack Enemy
        act(() => {
            result.current.actions.attackUnit('hero', { x: 1, y: 0 });
        });

        // 5. Verify Enemy Dead & Victory
        // Since enemy had 1 HP and dmg is 1, it should be dead.
        const enemy = result.current.state.units.find(u => u.id === 'enemy');
        // In our engine, we filter dead units out or mark them?
        // Let's check logic: 'filter(u => u.id !== targetUnit.id)' -> removed from array.
        expect(enemy).toBeUndefined();
        expect(result.current.state.gameStatus).toBe(GameStatus.VICTORY);
    });

    it('Scenario 2: Wait -> Lose by Turn Limit', () => {
        const { result } = renderHook(() => useGameEngine());

        const level1 = {
            id: 1,
            name: "Test Level",
            description: "",
            width: 6,
            height: 1,
            maxTurns: 1, // Strict 1 turn limit
            units: [
                {
                    id: 'hero',
                    name: 'Hero',
                    type: UnitType.KNIGHT,
                    faction: Faction.PLAYER,
                    position: { x: 0, y: 0 },
                    hp: 10,
                    maxHp: 10,
                    moveRange: 5,
                    attackRangeMin: 1,
                    attackRangeMax: 1,
                    hasMoved: false
                }
            ]
        };

        act(() => {
            result.current.actions.startLevel(level1);
        });

        expect(result.current.state.turn).toBe(1);

        // 1. Select Hero
        act(() => {
            result.current.actions.selectUnit('hero');
        });

        // 2. Wait (End Action)
        act(() => {
            result.current.actions.waitUnit('hero');
        });

        // 3. End Turn
        act(() => {
            result.current.actions.endTurn();
        });

        // 4. Verify Defeat
        // MaxTurns is 1. If we end turn 1, we go to turn 2.
        // Logic: if turn >= maxTurns -> Defeat.
        // result.current.state.turn should be 2? Or status updated before increment?
        // Helper: endTurn() checks: if (turn >= maxTurns) { setStatus(DEFEAT); return; }

        // So if turn was 1, and maxTurns is 1. 1 >= 1 is true.
        expect(result.current.state.gameStatus).toBe(GameStatus.DEFEAT);
    });

    it('Scenario 3: Archer Range Attack (Range 2 & Wall)', async () => {
        const { result } = renderHook(() => useGameEngine());

        // Level setup mimicking Scenario 2
        const level2 = {
            id: 2,
            name: "Archer Test",
            description: "",
            width: 6,
            height: 1,
            maxTurns: 1,
            walls: [{ x: 4, y: 0 }],
            units: [
                {
                    id: 'archer',
                    name: 'Hawkeye',
                    type: UnitType.ARCHER,
                    faction: Faction.PLAYER,
                    position: { x: 2, y: 0 },
                    hp: 10,
                    maxHp: 10,
                    moveRange: 4,
                    attackRangeMin: 2,
                    attackRangeMax: 2,
                    hasMoved: false
                },
                {
                    id: 'target',
                    name: 'Target',
                    type: UnitType.KNIGHT,
                    faction: Faction.ENEMY,
                    position: { x: 5, y: 0 }, // Distance 3 from 2,0
                    hp: 1,
                    maxHp: 1,
                    moveRange: 0,
                    attackRangeMin: 1,
                    attackRangeMax: 1,
                    hasMoved: false
                }
            ]
        };

        act(() => {
            result.current.actions.startLevel(level2);
        });

        // 1. Select Archer
        act(() => {
            result.current.actions.selectUnit('archer');
        });

        // 2. Try Move into Wall (should fail or not be in reachable?)
        // Let's just verify Attack from current position (Range is 2.. wait 5-2 = 3).
        // Archer Range is 2. Distance is 3.
        // Need to move closer? 
        // Archer at 2. Target at 5. Distance 3.
        // Archer can move 4.
        // Wall at 4.
        // Archer moves to 3. (2->3 is 1 step).
        // From 3 to 5 is Distance 2. 
        // Wall at 4 is in between 3 and 5? 3, 4, 5. Yes.
        // Can archer fire over wall? Yes. (getTilesInRange uses Manhattan, ignores terrain). 
        // Logic check: getValidAttackTargets calls getTilesInRange.

        act(() => {
            result.current.actions.moveUnit({ x: 3, y: 0 }); // Move next to wall
        });

        // 3. Attack Target (at 5,0) from 3,0
        act(() => {
            result.current.actions.attackUnit('archer', { x: 5, y: 0 });
        });

        // 4. Verify Victory
        const target = result.current.state.units.find(u => u.id === 'target');
        expect(target).toBeUndefined();
        expect(result.current.state.gameStatus).toBe(GameStatus.VICTORY);
    });
});
