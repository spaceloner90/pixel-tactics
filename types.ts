export interface Position {
  x: number;
  y: number;
}

export enum UnitType {
  KNIGHT = 'KNIGHT',
  ARCHER = 'ARCHER',
  MAGE = 'MAGE',
  WIZARD = 'WIZARD'
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

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  maxTurns: number; // 0 for infinite
  units: Unit[]; // Starting units
  walls?: Position[]; // Optional wall placements
}

export interface GameState {
  units: Unit[];
  turn: number;
  activeFaction: Faction;
  selectedUnitId: string | null;
  logs: string[];
}