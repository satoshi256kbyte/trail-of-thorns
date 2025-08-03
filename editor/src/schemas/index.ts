import { z } from 'zod';

// Base validation schemas
export const RaritySchema = z.enum([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);
export const ItemTypeSchema = z.enum(['weapon', 'armor', 'consumable', 'key']);
export const EffectTypeSchema = z.enum(['heal', 'damage', 'buff', 'debuff']);
export const EffectTargetSchema = z.enum(['self', 'enemy', 'ally', 'all']);
export const ObjectTypeSchema = z.enum(['chest', 'door', 'switch', 'npc']);
export const ObjectiveTypeSchema = z.enum([
  'defeat',
  'collect',
  'reach',
  'survive',
]);
export const RewardTypeSchema = z.enum(['item', 'experience', 'gold']);

// Character validation schemas
export const CharacterStatsSchema = z.object({
  level: z.number().int().min(1).max(100),
  hp: z.number().int().min(1).max(9999),
  mp: z.number().int().min(0).max(999),
  attack: z.number().int().min(1).max(999),
  defense: z.number().int().min(1).max(999),
  speed: z.number().int().min(1).max(999),
  luck: z.number().int().min(1).max(999),
});

export const SpriteConfigSchema = z.object({
  path: z.string().min(1, 'Sprite path is required'),
  frameWidth: z.number().int().min(1, 'Frame width must be positive'),
  frameHeight: z.number().int().min(1, 'Frame height must be positive'),
});

export const CharacterSchema = z.object({
  id: z.string().min(1, 'Character ID is required'),
  name: z
    .string()
    .min(1, 'Character name is required')
    .max(50, 'Character name too long'),
  description: z.string().max(500, 'Description too long'),
  stats: CharacterStatsSchema,
  abilities: z.array(z.string().min(1, 'Ability name cannot be empty')),
  sprite: SpriteConfigSchema,
  rarity: RaritySchema,
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Item validation schemas
export const ItemStatsSchema = z.object({
  attack: z.number().int().min(0).max(999).optional(),
  defense: z.number().int().min(0).max(999).optional(),
  speed: z.number().int().min(0).max(999).optional(),
  hp: z.number().int().min(0).max(9999).optional(),
  mp: z.number().int().min(0).max(999).optional(),
});

export const ItemEffectSchema = z.object({
  type: EffectTypeSchema,
  value: z.number().min(0, 'Effect value must be non-negative'),
  duration: z.number().int().min(1).optional(),
  target: EffectTargetSchema,
});

export const ItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(50, 'Item name too long'),
  description: z.string().max(500, 'Description too long'),
  type: ItemTypeSchema,
  rarity: RaritySchema,
  stats: ItemStatsSchema,
  effects: z.array(ItemEffectSchema),
  icon: z.string().min(1, 'Icon path is required'),
  stackable: z.boolean(),
  maxStack: z.number().int().min(1).max(999),
  sellPrice: z.number().int().min(0),
  buyPrice: z.number().int().min(0),
});

// Stage validation schemas
export const TileDataSchema = z.object({
  id: z.string().min(1, 'Tile ID is required'),
  type: z.string().min(1, 'Tile type is required'),
  passable: z.boolean(),
});

export const StageObjectSchema = z.object({
  id: z.string().min(1, 'Object ID is required'),
  type: ObjectTypeSchema,
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
  }),
  properties: z.record(z.any()),
});

export const EnemySpawnSchema = z.object({
  enemyId: z.string().min(1, 'Enemy ID is required'),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
  }),
  level: z.number().int().min(1).max(100),
});

export const ObjectiveSchema = z.object({
  id: z.string().min(1, 'Objective ID is required'),
  type: ObjectiveTypeSchema,
  description: z.string().min(1, 'Objective description is required').max(200),
  target: z.string().min(1, 'Objective target is required'),
  value: z.number().int().min(1),
});

export const RewardSchema = z
  .object({
    type: RewardTypeSchema,
    itemId: z.string().optional(),
    amount: z.number().int().min(1),
  })
  .refine(
    data => {
      // If reward type is 'item', itemId must be provided
      if (data.type === 'item') {
        return data.itemId && data.itemId.length > 0;
      }
      return true;
    },
    {
      message: 'Item ID is required for item rewards',
      path: ['itemId'],
    }
  );

export const StageSchema = z
  .object({
    id: z.string().min(1, 'Stage ID is required'),
    name: z
      .string()
      .min(1, 'Stage name is required')
      .max(50, 'Stage name too long'),
    description: z.string().max(500, 'Description too long'),
    size: z.object({
      width: z.number().int().min(1).max(100),
      height: z.number().int().min(1).max(100),
    }),
    tiles: z.array(z.array(TileDataSchema)),
    objects: z.array(StageObjectSchema),
    enemies: z.array(EnemySpawnSchema),
    objectives: z
      .array(ObjectiveSchema)
      .min(1, 'At least one objective is required'),
    rewards: z.array(RewardSchema),
    difficulty: z.number().int().min(1).max(10),
  })
  .refine(
    data => {
      // Validate that tiles array matches the specified size
      if (data.tiles.length !== data.size.height) {
        return false;
      }
      return data.tiles.every(row => row.length === data.size.width);
    },
    {
      message: 'Tiles array must match the specified stage size',
      path: ['tiles'],
    }
  );

// Game data validation schema
export const GameDataSchema = z.object({
  characters: z.record(z.string(), CharacterSchema),
  items: z.record(z.string(), ItemSchema),
  stages: z.record(z.string(), StageSchema),
});

// Export types inferred from schemas
export type CharacterInput = z.input<typeof CharacterSchema>;
export type ItemInput = z.input<typeof ItemSchema>;
export type StageInput = z.input<typeof StageSchema>;
export type GameDataInput = z.input<typeof GameDataSchema>;
