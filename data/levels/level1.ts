import { LevelConfig, UnitType, Faction } from '../../types';

export const level1: LevelConfig = {
    id: 1,
    name: "Training Corridor",
    description: "Eliminate the target in 1 turn.",
    width: 6,
    height: 1,
    maxTurns: 1,
    units: [
        {
            id: 'hero_1',
            name: 'Alaric',
            portrait: '/pixel-tactics/assets/portraits/alaric.png',
            type: UnitType.KNIGHT,
            faction: Faction.PLAYER,
            position: { x: 0, y: 0 },
            hp: 1,
            maxHp: 1,
            moveRange: 5,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false
        },
        {
            id: 'dummy_1',
            name: 'Dummy',
            portrait: '/pixel-tactics/assets/portraits/dummy.png',
            type: UnitType.DUMMY,
            faction: Faction.ENEMY,
            position: { x: 5, y: 0 },
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 1,
            attackRangeMax: 2,
            hasMoved: false
        }
    ]
};
