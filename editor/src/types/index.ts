// Core data types for the admin dashboard
export interface Character {
  id: string;
  name: string;
  description: string;
  stats: CharacterStats;
  abilities: string[];
  sprite: SpriteConfig;
  rarity: Rarity;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterStats {
  level: number;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
}

export interface SpriteConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  stats: ItemStats;
  effects: ItemEffect[];
  icon: string;
  stackable: boolean;
  maxStack: number;
  sellPrice: number;
  buyPrice: number;
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  speed?: number;
  hp?: number;
  mp?: number;
}

export interface ItemEffect {
  type: EffectType;
  value: number;
  duration?: number;
  target: EffectTarget;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  size: { width: number; height: number };
  tiles: TileData[][];
  objects: StageObject[];
  enemies: EnemySpawn[];
  objectives: Objective[];
  rewards: Reward[];
  difficulty: number;
}

export interface StageObject {
  id: string;
  type: ObjectType;
  position: { x: number; y: number };
  properties: Record<string, any>;
}

export interface TileData {
  id: string;
  type: string;
  passable: boolean;
}

export interface EnemySpawn {
  enemyId: string;
  position: { x: number; y: number };
  level: number;
}

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: string;
  value: number;
}

export interface Reward {
  type: RewardType;
  itemId?: string;
  amount: number;
}

// Enums
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'key';
export type EffectType = 'heal' | 'damage' | 'buff' | 'debuff';
export type EffectTarget = 'self' | 'enemy' | 'ally' | 'all';
export type ObjectType = 'chest' | 'door' | 'switch' | 'npc';
export type ObjectiveType = 'defeat' | 'collect' | 'reach' | 'survive';
export type RewardType = 'item' | 'experience' | 'gold';

// Application state types
export type DataSection = 'characters' | 'items' | 'stages';
export type DataType = 'character' | 'item' | 'stage';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  path: string[];
}

export interface GameData {
  characters: Record<string, Character>;
  items: Record<string, Item>;
  stages: Record<string, Stage>;
}
