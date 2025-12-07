import { LevelConfig, UnitType, Faction } from '../types';

export const LEVELS: LevelConfig[] = [
    {
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
                type: UnitType.ARCHER,
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
    },
    {
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
    },

    {
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
                type: UnitType.KNIGHT,
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
    },
    {
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
                hasMoved: false
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
                hasMoved: false
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
                hasMoved: false
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
                hasMoved: false
            }
        ]
    }
];
