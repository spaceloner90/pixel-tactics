export interface Position {
  x: number;
  y: number;
}

export enum UnitType {
  KNIGHT = 'KNIGHT',
  ARCHER = 'ARCHER',
  MAGE = 'MAGE',

  WIZARD = 'WIZARD',
  DUMMY = 'DUMMY'
}

export enum Faction {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY'
}

export interface Spell {
  id: string;
  name: string;
  range: number;
  radius: number;
  damage: number;
  vfxType?: string;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: Faction;
  position: Position;
  hp: number;
  maxHp: number;
  moveRange: number;
  attackRangeMin: number;
  attackRangeMax: number;
  spells?: Spell[];
  hasMoved: boolean;
  name: string;
  portrait?: string;
  castingPortrait?: string;
  facing?: 'LEFT' | 'RIGHT';
}

export enum TerrainType {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface TileData {
  x: number;
  y: number;
  terrain: TerrainType;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  EDITOR = 'EDITOR'
}

export enum VictoryCondition {
  ELIMINATE_ALL = 'ELIMINATE_ALL',
  SURVIVE = 'SURVIVE'
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  maxTurns: number; // 0 for infinite
  units: Unit[]; // Starting units
  walls?: Position[]; // Optional wall placements
  victoryCondition?: VictoryCondition;
}

export interface GameState {
  units: Unit[];
  turn: number;
  activeFaction: Faction;
  selectedUnitId: string | null;
  logs: string[];
}