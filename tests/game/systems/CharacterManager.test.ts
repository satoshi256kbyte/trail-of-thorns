/**
 * Unit tests for CharacterManager
 * Tests character loading, selection, movement, and display functionality
 */

import { CharacterManager } from '../../../game/src/systems/CharacterManager';
import {
  Unit,
  Position,
  StageData,
  MapData,
  GameplayError,
} from '../../../game/src/types/gameplay';

// Mock Phaser objects
const mockScene = {
  add: {
    sprite: jest.fn(),
    graphics: jest.fn(),
  },
  tweens: {
    add: jest.fn(),
  },
  textures: {
    exists: jest.fn().mockReturnValue(false),
  },
} as any;

const mockSprite = {
  unitId: '',
  setScale: jest.fn().mockReturnThis(),
  setDepth: jest.fn().mockReturnThis(),
  setTint: jest.fn().mockReturnThis(),
  setInteractive: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  setAlpha: jest.fn().mockReturnThis(),
  setPosition: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
} as any;

const mockGraphics = {
  setDepth: jest.fn().mockReturnThis(),
  clear: jest.fn().mockReturnThis(),
  lineStyle: jest.fn().mockReturnThis(),
  strokeRect: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
} as any;

const mockEventEmitter = {
  emit: jest.fn(),
} as any;

// Mock data
const createMockUnit = (id: string, faction: 'player' | 'enemy', position: Position): Unit => ({
  id,
  name: `Unit ${id}`,
  position: { ...position },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 3,
  },
  currentHP: 100,
  currentMP: 50,
  faction,
  hasActed: false,
  hasMoved: false,
});

const createMockMapData = (): MapData => ({
  width: 10,
  height: 10,
  tileSize: 32,
  layers: [
    {
      name: 'background',
      type: 'background',
      data: Array(10).fill(Array(10).fill(0)),
      visible: true,
      opacity: 1,
    },
  ],
  playerSpawns: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  enemySpawns: [
    { x: 8, y: 8 },
    { x: 9, y: 8 },
  ],
});

const createMockStageData = (): StageData => ({
  id: 'test-stage',
  name: 'Test Stage',
  description: 'A test stage',
  mapData: createMockMapData(),
  playerUnits: [
    createMockUnit('player1', 'player', { x: 0, y: 0 }),
    createMockUnit('player2', 'player', { x: 1, y: 0 }),
  ],
  enemyUnits: [
    createMockUnit('enemy1', 'enemy', { x: 8, y: 8 }),
    createMockUnit('enemy2', 'enemy', { x: 9, y: 8 }),
  ],
  victoryConditions: [
    {
      type: 'defeat_all',
      description: 'Defeat all enemies',
    },
  ],
});

describe('CharacterManager', () => {
  let characterManager: CharacterManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock returns
    mockScene.add.sprite.mockReturnValue(mockSprite);
    mockScene.add.graphics.mockReturnValue(mockGraphics);
    mockScene.tweens.add.mockImplementation((config: any) => {
      // Immediately call onComplete if provided
      if (config.onComplete) {
        config.onComplete();
      }
      return { progress: 1 };
    });

    characterManager = new CharacterManager(mockScene, 32, undefined, mockEventEmitter);
  });

  afterEach(() => {
    characterManager.destroy();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(characterManager).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(3); // selection, movement graphics, and placeholder texture
    });

    test('should accept custom configuration', () => {
      const customConfig = { spriteScale: 2.0, selectionColor: 0xff0000 };
      const customManager = new CharacterManager(mockScene, 64, customConfig, mockEventEmitter);

      expect(customManager).toBeDefined();
      customManager.destroy();
    });
  });

  describe('loadCharacters', () => {
    test('should successfully load characters from valid stage data', () => {
      const stageData = createMockStageData();
      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('characters-loaded', {
        playerCount: 2,
        enemyCount: 2,
        totalCount: 4,
      });
    });

    test('should fail with invalid stage data', () => {
      const invalidStageData = {} as StageData;
      const result = characterManager.loadCharacters(invalidStageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });

    test('should fail with duplicate character IDs', () => {
      const stageData = createMockStageData();
      stageData.enemyUnits[0].id = 'player1'; // Duplicate ID

      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.CHARACTER_LOAD_FAILED);
      expect(result.message).toContain('Duplicate unit ID');
    });

    test('should fail with characters at same position', () => {
      const stageData = createMockStageData();
      stageData.playerUnits[1].position = { x: 0, y: 0 }; // Same as player1

      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_POSITION);
      expect(result.message).toContain('Multiple characters at position');
    });

    test('should fail with faction mismatch', () => {
      const stageData = createMockStageData();
      stageData.playerUnits[0].faction = 'enemy'; // Wrong faction

      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.CHARACTER_LOAD_FAILED);
      expect(result.message).toContain('faction mismatch');
    });

    test('should create sprites for all characters', () => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);

      expect(mockScene.add.sprite).toHaveBeenCalledTimes(4); // 2 players + 2 enemies
      expect(mockSprite.setScale).toHaveBeenCalledTimes(4);
      expect(mockSprite.setDepth).toHaveBeenCalledTimes(4);
      expect(mockSprite.setTint).toHaveBeenCalledTimes(4);
    });
  });

  describe('selectCharacter', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should successfully select a character', () => {
      const result = characterManager.selectCharacter('player1');

      expect(result.success).toBe(true);
      expect(characterManager.getSelectedCharacter()?.id).toBe('player1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-selected',
        expect.objectContaining({
          character: expect.objectContaining({ id: 'player1' }),
        })
      );
    });

    test('should fail to select non-existent character', () => {
      const result = characterManager.selectCharacter('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    test('should deselect when passed null', () => {
      characterManager.selectCharacter('player1');
      const result = characterManager.selectCharacter(null);

      expect(result.success).toBe(true);
      expect(characterManager.getSelectedCharacter()).toBeUndefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-deselected');
    });

    test('should clear previous selection when selecting new character', () => {
      characterManager.selectCharacter('player1');
      characterManager.selectCharacter('player2');

      expect(characterManager.getSelectedCharacter()?.id).toBe('player2');
      expect(mockGraphics.clear).toHaveBeenCalled();
    });
  });

  describe('getCharacterAt', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should return character at specified position', () => {
      const character = characterManager.getCharacterAt({ x: 0, y: 0 });

      expect(character).toBeDefined();
      expect(character?.id).toBe('player1');
    });

    test('should return null for empty position', () => {
      const character = characterManager.getCharacterAt({ x: 5, y: 5 });

      expect(character).toBeNull();
    });

    test('should return null for invalid position', () => {
      const character = characterManager.getCharacterAt({ x: -1, y: -1 });

      expect(character).toBeNull();
    });
  });

  describe('moveCharacter', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should successfully move character to empty position', () => {
      const result = characterManager.moveCharacter('player1', { x: 2, y: 2 });

      expect(result.success).toBe(true);

      const character = characterManager.getCharacterById('player1');
      expect(character?.position).toEqual({ x: 2, y: 2 });
      expect(character?.hasMoved).toBe(true);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-moved',
        expect.objectContaining({
          character: expect.objectContaining({ id: 'player1' }),
          newPosition: { x: 2, y: 2 },
        })
      );
    });

    test('should fail to move non-existent character', () => {
      const result = characterManager.moveCharacter('nonexistent', { x: 2, y: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    test('should fail to move to occupied position', () => {
      const result = characterManager.moveCharacter('player1', { x: 1, y: 0 }); // player2's position

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_POSITION);
      expect(result.message).toContain('Position occupied');
    });

    test('should fail with invalid position', () => {
      const result = characterManager.moveCharacter('player1', { x: NaN, y: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_POSITION);
    });

    test('should animate movement when requested', () => {
      characterManager.moveCharacter('player1', { x: 2, y: 2 }, true);

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockSprite,
          duration: 500,
          ease: 'Power2',
        })
      );
    });

    test('should move immediately when animation disabled', () => {
      characterManager.moveCharacter('player1', { x: 2, y: 2 }, false);

      expect(mockSprite.setPosition).toHaveBeenCalled();
      expect(mockScene.tweens.add).not.toHaveBeenCalled();
    });
  });

  describe('updateCharacterDisplay', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should successfully update specific character display', () => {
      const result = characterManager.updateCharacterDisplay('player1');

      expect(result.success).toBe(true);
      expect(mockSprite.setAlpha).toHaveBeenCalled();
      expect(mockSprite.setPosition).toHaveBeenCalled();
    });

    test('should successfully update all character displays', () => {
      const result = characterManager.updateCharacterDisplay();

      expect(result.success).toBe(true);
      expect(mockSprite.setAlpha).toHaveBeenCalledTimes(4); // All 4 characters
    });

    test('should fail to update non-existent character', () => {
      const result = characterManager.updateCharacterDisplay('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    test('should dim sprite for characters that have acted', () => {
      const character = characterManager.getCharacterById('player1');
      if (character) {
        character.hasActed = true;
      }

      characterManager.updateCharacterDisplay('player1');

      expect(mockSprite.setAlpha).toHaveBeenCalledWith(0.6);
    });

    test('should show full opacity for characters that can act', () => {
      characterManager.updateCharacterDisplay('player1');

      expect(mockSprite.setAlpha).toHaveBeenCalledWith(1.0);
    });
  });

  describe('Character queries', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should return all characters', () => {
      const characters = characterManager.getAllCharacters();

      expect(characters).toHaveLength(4);
      expect(characters.map(c => c.id)).toContain('player1');
      expect(characters.map(c => c.id)).toContain('enemy1');
    });

    test('should return characters by faction', () => {
      const playerChars = characterManager.getCharactersByFaction('player');
      const enemyChars = characterManager.getCharactersByFaction('enemy');

      expect(playerChars).toHaveLength(2);
      expect(enemyChars).toHaveLength(2);
      expect(playerChars.every(c => c.faction === 'player')).toBe(true);
      expect(enemyChars.every(c => c.faction === 'enemy')).toBe(true);
    });

    test('should return character by ID', () => {
      const character = characterManager.getCharacterById('player1');

      expect(character).toBeDefined();
      expect(character?.id).toBe('player1');
    });

    test('should return undefined for non-existent character ID', () => {
      const character = characterManager.getCharacterById('nonexistent');

      expect(character).toBeUndefined();
    });

    test('should check if position is occupied', () => {
      expect(characterManager.isPositionOccupied({ x: 0, y: 0 })).toBe(true);
      expect(characterManager.isPositionOccupied({ x: 5, y: 5 })).toBe(false);
    });

    test('should return all occupied positions', () => {
      const positions = characterManager.getOccupiedPositions();

      expect(positions).toHaveLength(4);
      expect(positions).toContainEqual({ x: 0, y: 0 });
      expect(positions).toContainEqual({ x: 8, y: 8 });
    });

    test('should return character counts', () => {
      const counts = characterManager.getCharacterCounts();

      expect(counts).toEqual({
        player: 2,
        enemy: 2,
        total: 4,
      });
    });
  });

  describe('updateCharacterStats', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should successfully update character stats', () => {
      const result = characterManager.updateCharacterStats('player1', {
        currentHP: 80,
        hasActed: true,
      });

      expect(result.success).toBe(true);

      const character = characterManager.getCharacterById('player1');
      expect(character?.currentHP).toBe(80);
      expect(character?.hasActed).toBe(true);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-updated',
        expect.objectContaining({
          character: expect.objectContaining({ id: 'player1' }),
          updatedFields: ['currentHP', 'hasActed'],
        })
      );
    });

    test('should fail to update non-existent character', () => {
      const result = characterManager.updateCharacterStats('nonexistent', { currentHP: 80 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    test('should fail with invalid updated data', () => {
      const result = characterManager.updateCharacterStats('player1', {
        currentHP: -10, // Invalid HP
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('resetCharacterActions', () => {
    beforeEach(() => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);
    });

    test('should reset all character action states', () => {
      // Set some characters as having acted
      const player1 = characterManager.getCharacterById('player1');
      const enemy1 = characterManager.getCharacterById('enemy1');

      if (player1) {
        player1.hasActed = true;
        player1.hasMoved = true;
      }
      if (enemy1) {
        enemy1.hasActed = true;
        enemy1.hasMoved = true;
      }

      characterManager.resetCharacterActions();

      // Check all characters have reset states
      const allCharacters = characterManager.getAllCharacters();
      for (const character of allCharacters) {
        expect(character.hasActed).toBe(false);
        expect(character.hasMoved).toBe(false);
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-actions-reset');
    });
  });

  describe('destroy', () => {
    test('should clean up all resources', () => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);

      characterManager.destroy();

      expect(mockSprite.destroy).toHaveBeenCalledTimes(4); // All sprites destroyed
      expect(mockGraphics.destroy).toHaveBeenCalledTimes(2); // Both graphics objects destroyed
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-manager-destroyed');
    });

    test('should handle destroy when no characters loaded', () => {
      expect(() => characterManager.destroy()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty stage data gracefully', () => {
      const emptyStageData: StageData = {
        ...createMockStageData(),
        playerUnits: [],
        enemyUnits: [],
      };

      const result = characterManager.loadCharacters(emptyStageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });

    test('should handle character with zero stats', () => {
      const stageData = createMockStageData();
      stageData.playerUnits[0].stats.speed = 0; // Invalid speed

      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });

    test('should handle character with negative health', () => {
      const stageData = createMockStageData();
      stageData.playerUnits[0].currentHP = -10; // Invalid HP

      const result = characterManager.loadCharacters(stageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });

    test('should handle character movement to same position', () => {
      const stageData = createMockStageData();
      characterManager.loadCharacters(stageData);

      const result = characterManager.moveCharacter('player1', { x: 0, y: 0 }); // Same position

      expect(result.success).toBe(true); // Should succeed (no-op movement)
    });
  });
});
