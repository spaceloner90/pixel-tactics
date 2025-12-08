import { LevelConfig, UnitType, Faction } from '../../types';

export const level3: LevelConfig = {
    id: 3,
    name: "Inferno Trial",
    description: "Defeat all 9 dummies with one spell.",
    width: 7,
    height: 7,
    maxTurns: 1,
    units: [
        {
            id: 'merlin_1',
            name: 'Merlin',
            portrait: '/pixel-tactics/assets/portraits/wizard.png',
            type: UnitType.WIZARD,
            faction: Faction.PLAYER,
            position: { x: 3, y: 1 },
            hp: 1,
            maxHp: 1,
            moveRange: 3,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false,
            castingPortrait: 'wizard_casting.png',
            spells: [
                { id: 'fireball', name: 'Fireball', range: 3, radius: 1, damage: 1, vfxType: 'FIREBALL' }
            ]
        },
        // 9 Dummies in 3x3 block centered at 3,5
        ...Array.from({ length: 9 }).map((_, i) => ({
            id: `dummy_${i}`,
            name: 'Dummy',
            portrait: '/pixel-tactics/assets/portraits/dummy.png',
            type: UnitType.DUMMY,
            faction: Faction.ENEMY,
            position: { x: 2 + (i % 3), y: 4 + Math.floor(i / 3) }, // 2,4 to 4,6
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 0,
            attackRangeMax: 0,
            hasMoved: false
        }))
    ]
};
