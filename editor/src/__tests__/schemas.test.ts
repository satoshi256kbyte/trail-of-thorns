import {
  CharacterSchema,
  ItemSchema,
  StageSchema,
  GameDataSchema,
  CharacterStatsSchema,
  ItemStatsSchema,
  SpriteConfigSchema,
} from '../schemas';

describe('Character Schema Validation', () => {
  const validCharacter = {
    id: 'char-001',
    name: 'Test Hero',
    description: 'A brave warrior',
    stats: {
      level: 1,
      hp: 100,
      mp: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      luck: 5,
    },
    abilities: ['sword-slash', 'heal'],
    sprite: {
      path: '/sprites/hero.png',
      frameWidth: 32,
      frameHeight: 32,
    },
    rarity: 'common' as const,
    tags: ['hero', 'warrior'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should validate a valid character', () => {
    expect(() => CharacterSchema.parse(validCharacter)).not.toThrow();
  });

  it('should reject character with missing required fields', () => {
    const invalidCharacter = { ...validCharacter };
    delete (invalidCharacter as any).name;

    expect(() => CharacterSchema.parse(invalidCharacter)).toThrow();
  });

  it('should reject character with invalid stats', () => {
    const invalidCharacter = {
      ...validCharacter,
      stats: { ...validCharacter.stats, hp: -1 },
    };

    expect(() => CharacterSchema.parse(invalidCharacter)).toThrow();
  });

  it('should reject character with name too long', () => {
    const invalidCharacter = {
      ...validCharacter,
      name: 'A'.repeat(51), // Exceeds 50 character limit
    };

    expect(() => CharacterSchema.parse(invalidCharacter)).toThrow();
  });

  it('should reject character with invalid rarity', () => {
    const invalidCharacter = {
      ...validCharacter,
      rarity: 'invalid' as any,
    };

    expect(() => CharacterSchema.parse(invalidCharacter)).toThrow();
  });
});

describe('Character Stats Schema Validation', () => {
  it('should validate valid character stats', () => {
    const validStats = {
      level: 50,
      hp: 500,
      mp: 200,
      attack: 100,
      defense: 80,
      speed: 60,
      luck: 40,
    };

    expect(() => CharacterStatsSchema.parse(validStats)).not.toThrow();
  });

  it('should reject stats with values out of range', () => {
    const invalidStats = {
      level: 101, // Exceeds max of 100
      hp: 500,
      mp: 200,
      attack: 100,
      defense: 80,
      speed: 60,
      luck: 40,
    };

    expect(() => CharacterStatsSchema.parse(invalidStats)).toThrow();
  });

  it('should reject stats with negative values', () => {
    const invalidStats = {
      level: 1,
      hp: -1, // Negative value
      mp: 200,
      attack: 100,
      defense: 80,
      speed: 60,
      luck: 40,
    };

    expect(() => CharacterStatsSchema.parse(invalidStats)).toThrow();
  });
});

describe('Item Schema Validation', () => {
  const validItem = {
    id: 'item-001',
    name: 'Iron Sword',
    description: 'A sturdy iron sword',
    type: 'weapon' as const,
    rarity: 'common' as const,
    stats: {
      attack: 25,
      defense: 5,
    },
    effects: [
      {
        type: 'buff' as const,
        value: 10,
        duration: 300,
        target: 'self' as const,
      },
    ],
    icon: '/icons/iron-sword.png',
    stackable: false,
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
  };

  it('should validate a valid item', () => {
    expect(() => ItemSchema.parse(validItem)).not.toThrow();
  });

  it('should reject item with invalid type', () => {
    const invalidItem = {
      ...validItem,
      type: 'invalid' as any,
    };

    expect(() => ItemSchema.parse(invalidItem)).toThrow();
  });

  it('should reject item with negative prices', () => {
    const invalidItem = {
      ...validItem,
      sellPrice: -1,
    };

    expect(() => ItemSchema.parse(invalidItem)).toThrow();
  });

  it('should validate item with optional stats', () => {
    const itemWithOptionalStats = {
      ...validItem,
      stats: {
        hp: 50, // Only HP stat provided
      },
    };

    expect(() => ItemSchema.parse(itemWithOptionalStats)).not.toThrow();
  });
});

describe('Stage Schema Validation', () => {
  const validStage = {
    id: 'stage-001',
    name: 'Forest Path',
    description: 'A peaceful forest path',
    size: { width: 3, height: 3 },
    tiles: [
      [
        { id: 'tile-1', type: 'grass', passable: true },
        { id: 'tile-2', type: 'grass', passable: true },
        { id: 'tile-3', type: 'grass', passable: true },
      ],
      [
        { id: 'tile-4', type: 'grass', passable: true },
        { id: 'tile-5', type: 'stone', passable: false },
        { id: 'tile-6', type: 'grass', passable: true },
      ],
      [
        { id: 'tile-7', type: 'grass', passable: true },
        { id: 'tile-8', type: 'grass', passable: true },
        { id: 'tile-9', type: 'grass', passable: true },
      ],
    ],
    objects: [
      {
        id: 'chest-1',
        type: 'chest' as const,
        position: { x: 1, y: 1 },
        properties: { locked: false },
      },
    ],
    enemies: [
      {
        enemyId: 'goblin-001',
        position: { x: 2, y: 2 },
        level: 1,
      },
    ],
    objectives: [
      {
        id: 'obj-1',
        type: 'defeat' as const,
        description: 'Defeat all enemies',
        target: 'all-enemies',
        value: 1,
      },
    ],
    rewards: [
      {
        type: 'experience' as const,
        amount: 100,
      },
      {
        type: 'item' as const,
        itemId: 'potion-001',
        amount: 1,
      },
    ],
    difficulty: 1,
  };

  it('should validate a valid stage', () => {
    expect(() => StageSchema.parse(validStage)).not.toThrow();
  });

  it('should reject stage with mismatched tile dimensions', () => {
    const invalidStage = {
      ...validStage,
      size: { width: 2, height: 2 }, // Size doesn't match tiles array
    };

    expect(() => StageSchema.parse(invalidStage)).toThrow();
  });

  it('should reject stage without objectives', () => {
    const invalidStage = {
      ...validStage,
      objectives: [],
    };

    expect(() => StageSchema.parse(invalidStage)).toThrow();
  });

  it('should reject item reward without itemId', () => {
    const invalidStage = {
      ...validStage,
      rewards: [
        {
          type: 'item' as const,
          // Missing itemId
          amount: 1,
        },
      ],
    };

    expect(() => StageSchema.parse(invalidStage)).toThrow();
  });

  it('should validate non-item rewards without itemId', () => {
    const validStageWithExpReward = {
      ...validStage,
      rewards: [
        {
          type: 'experience' as const,
          amount: 100,
        },
      ],
    };

    expect(() => StageSchema.parse(validStageWithExpReward)).not.toThrow();
  });
});

describe('Game Data Schema Validation', () => {
  const validGameData = {
    characters: {
      'char-001': {
        id: 'char-001',
        name: 'Hero',
        description: 'Main character',
        stats: {
          level: 1,
          hp: 100,
          mp: 50,
          attack: 20,
          defense: 15,
          speed: 10,
          luck: 5,
        },
        abilities: ['slash'],
        sprite: {
          path: '/sprites/hero.png',
          frameWidth: 32,
          frameHeight: 32,
        },
        rarity: 'common' as const,
        tags: ['hero'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    items: {
      'item-001': {
        id: 'item-001',
        name: 'Sword',
        description: 'A basic sword',
        type: 'weapon' as const,
        rarity: 'common' as const,
        stats: { attack: 10 },
        effects: [],
        icon: '/icons/sword.png',
        stackable: false,
        maxStack: 1,
        sellPrice: 50,
        buyPrice: 100,
      },
    },
    stages: {
      'stage-001': {
        id: 'stage-001',
        name: 'Tutorial',
        description: 'First stage',
        size: { width: 2, height: 2 },
        tiles: [
          [
            { id: 'tile-1', type: 'grass', passable: true },
            { id: 'tile-2', type: 'grass', passable: true },
          ],
          [
            { id: 'tile-3', type: 'grass', passable: true },
            { id: 'tile-4', type: 'grass', passable: true },
          ],
        ],
        objects: [],
        enemies: [],
        objectives: [
          {
            id: 'obj-1',
            type: 'reach' as const,
            description: 'Reach the end',
            target: 'exit',
            value: 1,
          },
        ],
        rewards: [],
        difficulty: 1,
      },
    },
  };

  it('should validate valid game data', () => {
    expect(() => GameDataSchema.parse(validGameData)).not.toThrow();
  });

  it('should reject game data with invalid character', () => {
    const invalidGameData = {
      ...validGameData,
      characters: {
        'char-001': {
          ...validGameData.characters['char-001'],
          name: '', // Invalid empty name
        },
      },
    };

    expect(() => GameDataSchema.parse(invalidGameData)).toThrow();
  });
});

describe('Sprite Config Schema Validation', () => {
  it('should validate valid sprite config', () => {
    const validSprite = {
      path: '/sprites/character.png',
      frameWidth: 32,
      frameHeight: 32,
    };

    expect(() => SpriteConfigSchema.parse(validSprite)).not.toThrow();
  });

  it('should reject sprite config with empty path', () => {
    const invalidSprite = {
      path: '',
      frameWidth: 32,
      frameHeight: 32,
    };

    expect(() => SpriteConfigSchema.parse(invalidSprite)).toThrow();
  });

  it('should reject sprite config with negative dimensions', () => {
    const invalidSprite = {
      path: '/sprites/character.png',
      frameWidth: -1,
      frameHeight: 32,
    };

    expect(() => SpriteConfigSchema.parse(invalidSprite)).toThrow();
  });
});

describe('Item Stats Schema Validation', () => {
  it('should validate item stats with all optional fields', () => {
    const validStats = {
      attack: 10,
      defense: 5,
      speed: 3,
      hp: 20,
      mp: 15,
    };

    expect(() => ItemStatsSchema.parse(validStats)).not.toThrow();
  });

  it('should validate item stats with only some fields', () => {
    const validStats = {
      attack: 10,
      defense: 5,
    };

    expect(() => ItemStatsSchema.parse(validStats)).not.toThrow();
  });

  it('should validate empty item stats', () => {
    const validStats = {};

    expect(() => ItemStatsSchema.parse(validStats)).not.toThrow();
  });

  it('should reject item stats with negative values', () => {
    const invalidStats = {
      attack: -1,
    };

    expect(() => ItemStatsSchema.parse(invalidStats)).toThrow();
  });
});
