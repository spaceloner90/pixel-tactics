import { LevelConfig, UnitType, Faction } from '../../types';

export const level2: LevelConfig = {
    id: 2,
    name: "Archer's Paradox",
    description: "Hit the target over the wall. Range: 2.",
    width: 6,
    height: 1,
    maxTurns: 1,
    walls: [{ x: 4, y: 0 }],
    units: [
        {
            id: 'ranger_1',
            name: 'Hawkeye',
            portrait: '/pixel-tactics/assets/portraits/archer.png',
            type: UnitType.ARCHER,
            faction: Faction.PLAYER,
            position: { x: 2, y: 0 },
            hp: 1,
            maxHp: 1,
            moveRange: 4,
            attackRangeMin: 2,
            attackRangeMax: 2,
            hasMoved: false
        },
        {
            id: 'target_1',
            name: 'Target',
            portrait: '/pixel-tactics/assets/portraits/enemy_soldier.png',
            type: UnitType.KNIGHT,
            faction: Faction.ENEMY,
            position: { x: 5, y: 0 },
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false
        }
    ]
};
