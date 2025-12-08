import { LevelConfig, UnitType, Faction } from '../../types';

export const level4: LevelConfig = {
    id: 4,
    name: "Skirmish: The Siege",
    description: "Breach the defenses. 3 Turns.",
    width: 20,
    height: 8,
    maxTurns: 3,
    walls: [
        // Fortress Box
        // Top Wall (y=8 -> 2)
        { x: 13, y: 2 }, { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 17, y: 2 }, { x: 18, y: 2 }, { x: 19, y: 2 },
        // Bottom Wall (y=12 -> 6)
        { x: 13, y: 6 }, { x: 14, y: 6 }, { x: 15, y: 6 }, { x: 16, y: 6 }, { x: 17, y: 6 }, { x: 18, y: 6 }, { x: 19, y: 6 },
        // Back Wall (x=19)
        { x: 19, y: 3 }, { x: 19, y: 4 }, { x: 19, y: 5 },
        // Front Wall (x=13) - partial, with gap at y=4
        { x: 13, y: 3 }, { x: 13, y: 5 }
    ],
    units: [
        // Player Squad (Mid-Left)
        {
            id: 'hero_2',
            name: 'Sir Alaric',
            portrait: '/pixel-tactics/assets/portraits/alaric.png',
            type: UnitType.KNIGHT,
            faction: Faction.PLAYER,
            position: { x: 4, y: 4 }, // Was 10
            hp: 2,
            maxHp: 2,
            moveRange: 5,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false
        },
        {
            id: 'ranger_2',
            name: 'Hawkeye',
            portrait: '/pixel-tactics/assets/portraits/archer.png',
            type: UnitType.ARCHER,
            faction: Faction.PLAYER,
            position: { x: 4, y: 3 }, // Was 9
            hp: 1,
            maxHp: 1,
            moveRange: 4,
            attackRangeMin: 2,
            attackRangeMax: 2, // Standard Range
            hasMoved: false
        },
        {
            id: 'merlin_2',
            name: 'Merlin',
            portrait: '/pixel-tactics/assets/portraits/wizard.png',
            type: UnitType.WIZARD,
            faction: Faction.PLAYER,
            position: { x: 4, y: 5 }, // Was 11
            hp: 1,
            maxHp: 1,
            moveRange: 3,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false,
            castingPortrait: 'wizard_casting.png',
            spells: [
                { id: 'fireball', name: 'Fireball', range: 3, radius: 1, damage: 1, vfxType: 'FIREBALL' } // Standard Range
            ]
        },

        // Enemy Defenses (Shifted Left -1)
        // The Captain (Target)
        {
            id: 'captain_1',
            name: 'Captain',
            portrait: '/pixel-tactics/assets/portraits/enemy_soldier.png',
            type: UnitType.KNIGHT,
            faction: Faction.ENEMY,
            position: { x: 14, y: 4 }, // Was 10
            hp: 4,
            maxHp: 4,
            moveRange: 0,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false,
            facing: 'LEFT'
        },
        {
            id: 'guard_1',
            name: 'Guard',
            portrait: '/pixel-tactics/assets/portraits/enemy_soldier.png',
            type: UnitType.KNIGHT,
            faction: Faction.ENEMY,
            position: { x: 14, y: 3 }, // Was 9
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false,
            facing: 'LEFT'
        },
        {
            id: 'guard_2',
            name: 'Guard',
            portrait: '/pixel-tactics/assets/portraits/enemy_soldier.png',
            type: UnitType.KNIGHT,
            faction: Faction.ENEMY,
            position: { x: 14, y: 5 }, // Was 11
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 1,
            attackRangeMax: 1,
            hasMoved: false,
            facing: 'LEFT'
        },
        // Sniper
        {
            id: 'sniper_1',
            name: 'Sniper',
            portrait: '/pixel-tactics/assets/portraits/enemy_soldier.png',
            type: UnitType.ARCHER,
            faction: Faction.ENEMY,
            position: { x: 18, y: 4 }, // Was 10
            hp: 1,
            maxHp: 1,
            moveRange: 0,
            attackRangeMin: 2,
            attackRangeMax: 4,
            hasMoved: false,
            facing: 'LEFT'
        }
    ]
};
