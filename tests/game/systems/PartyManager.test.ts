/**
 * Unit tests for PartyManager class
 * Tests party composition integration with character loss system
 */

import { PartyManager } from '../../../game/src/systems/PartyManager';
import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { Unit, GameplayError } from '../../../game/src/types/gameplay';
import {
  PartyValidationResult,
  LostCharacter,
  LossCause,
  LossCauseType,
  DangerLevel,
} from '../../../game/src/types/characterLoss';

// Mock Phaser scene
const mockScene = {
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  add: {
    graphics: jest.fn(() => ({
      setDepth: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
    })),
  },
} as any;

// Mock character loss manager
const createMockCharacterLossManager = () => {
  const mockManager = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    getAvailableCharacters: jest.fn(() => ['char1', 'char2', 'char3']),
    getLostCharacters: jest.fn(() => []),
    isCharacterLost: jest.fn(() => false),
    validatePartyComposition: jest.fn(),
  };
  return mockManager as any;
};

// Test data
const createTestCharacter = (
  id: string,
  name: string,
  level: number = 1,
  faction: 'player' | 'enemy' = 'player'
): Unit => ({
  id,
  name,
  position: { x: 0, y: 0 },
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
  level,
  faction,
  hasActed: false,
  hasMoved: false,
});

const createTestLostCharacter = (id: string, name: string): LostCharacter => ({
  characterId: id,
  name,
  lostAt: Date.now(),
  turn: 1,
  cause: {
    type: LossCauseType.BATTLE_DEFEAT,
    description: 'Test loss',
    timestamp: Date.now(),
  },
  level: 1,
  wasRecruited: false,
});

describe('PartyManager', () => {
  let partyManager: PartyManager;
  let mockCharacterLossManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCharacterLossManager = createMockCharacterLossManager();
    partyManager = new PartyManager(mockScene);
    partyManager.setCharacterLossManager(mockCharacterLossManager);
  });

  afterEach(() => {
    partyManager.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with empty party', () => {
      const currentParty = partyManager.getCurrentParty();
      expect(currentParty.members).toEqual([]);
      expect(currentParty.lastUpdated).toBeGreaterThan(0);
    });

    test('should initialize characters successfully', () => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
      ];

      const result = partyManager.initializeCharacters(characters);

      expect(result.success).toBe(true);
      expect(partyManager.getAvailableCharacters()).toHaveLength(3);
    });

    test('should fail to initialize with invalid characters', () => {
      const result = partyManager.initializeCharacters(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });

    test('should fail to initialize with character missing ID', () => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        { ...createTestCharacter('char2', 'Character 2'), id: '' },
      ];

      const result = partyManager.initializeCharacters(characters);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
    });
  });

  describe('Available Characters', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
        createTestCharacter('enemy1', 'Enemy 1', 1, 'enemy'),
      ];
      partyManager.initializeCharacters(characters);
    });

    test('should return available characters from character loss manager', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char1', 'char2']);

      const available = partyManager.getAvailableCharacters();

      expect(available).toHaveLength(2);
      expect(available.map(c => c.id)).toEqual(['char1', 'char2']);
    });

    test('should return all characters when no character loss manager', () => {
      partyManager.setCharacterLossManager(null as any);

      const available = partyManager.getAvailableCharacters();

      expect(available).toHaveLength(4); // All characters including enemy
    });

    test('should return lost characters from character loss manager', () => {
      const lostCharacters = [createTestLostCharacter('char1', 'Character 1')];
      mockCharacterLossManager.getLostCharacters.mockReturnValue(lostCharacters);

      const lost = partyManager.getLostCharacters();

      expect(lost).toEqual(lostCharacters);
    });
  });

  describe('Party Composition Validation', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
      ];
      partyManager.initializeCharacters(characters);
    });

    test('should validate valid party composition', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char1', 'char2', 'char3']);
      mockCharacterLossManager.getLostCharacters.mockReturnValue([]);
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManager.validatePartyComposition(['char1', 'char2']);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.availableCharacters).toEqual(['char1', 'char2', 'char3']);
    });

    test('should reject party with lost characters', () => {
      const lostCharacter = createTestLostCharacter('char1', 'Character 1');
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char2', 'char3']);
      mockCharacterLossManager.getLostCharacters.mockReturnValue([lostCharacter]);
      mockCharacterLossManager.isCharacterLost.mockImplementation((id: string) => id === 'char1');

      const result = partyManager.validatePartyComposition(['char1', 'char2']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('lost_character');
      expect(result.errors[0].characterId).toBe('char1');
      expect(result.errors[0].message).toContain('Character 1 is lost');
    });

    test('should reject empty party', () => {
      const result = partyManager.validatePartyComposition([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('insufficient_members');
    });

    test('should allow empty party when configured', () => {
      const partyManagerWithEmptyAllowed = new PartyManager(mockScene, { allowEmptyParty: true });
      partyManagerWithEmptyAllowed.setCharacterLossManager(mockCharacterLossManager);

      const result = partyManagerWithEmptyAllowed.validatePartyComposition([]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      partyManagerWithEmptyAllowed.destroy();
    });

    test('should reject party exceeding maximum size', () => {
      const partyManagerWithSmallMax = new PartyManager(mockScene, { maxPartySize: 2 });
      partyManagerWithSmallMax.setCharacterLossManager(mockCharacterLossManager);
      partyManagerWithSmallMax.initializeCharacters([
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
      ]);

      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManagerWithSmallMax.validatePartyComposition(['char1', 'char2', 'char3']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('insufficient_members');
      expect(result.errors[0].message).toContain('cannot have more than 2');

      partyManagerWithSmallMax.destroy();
    });

    test('should reject party with duplicate characters', () => {
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManager.validatePartyComposition(['char1', 'char1', 'char2']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('duplicate_character');
    });

    test('should reject party with non-existent characters', () => {
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManager.validatePartyComposition(['char1', 'nonexistent']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('invalid_character');
      expect(result.errors[0].characterId).toBe('nonexistent');
    });

    test('should add warnings for low-level characters', () => {
      const characters = [
        createTestCharacter('char1', 'Character 1', 3), // Low level
        createTestCharacter('char2', 'Character 2', 10),
        createTestCharacter('char3', 'Character 3', 8),
        createTestCharacter('char4', 'Character 4', 7),
      ];
      partyManager.initializeCharacters(characters);
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue([
        'char1',
        'char2',
        'char3',
        'char4',
      ]);
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManager.validatePartyComposition(['char1']);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      const lowLevelWarning = result.warnings.find(w => w.type === 'low_level');
      expect(lowLevelWarning).toBeDefined();
      expect(lowLevelWarning?.message).toContain('Level 3');
    });

    test('should add warnings for insufficient available characters', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char1']);
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);

      const result = partyManager.validatePartyComposition(['char1']);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      const missingRoleWarning = result.warnings.find(w => w.type === 'missing_role');
      expect(missingRoleWarning).toBeDefined();
      expect(missingRoleWarning?.severity).toBe('high');
    });

    test('should handle validation errors gracefully', () => {
      const result = partyManager.validatePartyComposition('invalid' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('invalid_character');
      expect(result.errors[0].message).toContain('must be an array');
    });
  });

  describe('Party Composition Management', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
      ];
      partyManager.initializeCharacters(characters);
      mockCharacterLossManager.isCharacterLost.mockReturnValue(false);
    });

    test('should set valid party composition', () => {
      const result = partyManager.setPartyComposition(['char1', 'char2']);

      expect(result.success).toBe(true);
      expect(partyManager.getCurrentParty().members).toEqual(['char1', 'char2']);
    });

    test('should reject invalid party composition', () => {
      mockCharacterLossManager.isCharacterLost.mockImplementation((id: string) => id === 'char1');

      const result = partyManager.setPartyComposition(['char1', 'char2']);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should set party composition without validation when requested', () => {
      mockCharacterLossManager.isCharacterLost.mockImplementation((id: string) => id === 'char1');

      const result = partyManager.setPartyComposition(['char1', 'char2'], false);

      expect(result.success).toBe(true);
      expect(partyManager.getCurrentParty().members).toEqual(['char1', 'char2']);
    });

    test('should emit party composition updated event', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');

      partyManager.setPartyComposition(['char1', 'char2']);

      expect(emitSpy).toHaveBeenCalledWith(
        'party-composition-updated',
        expect.objectContaining({
          memberCount: 2,
        })
      );
    });

    test('should return current party composition', () => {
      partyManager.setPartyComposition(['char1', 'char2']);

      const currentParty = partyManager.getCurrentParty();

      expect(currentParty.members).toEqual(['char1', 'char2']);
      expect(currentParty.lastUpdated).toBeGreaterThan(0);
    });

    test('should return party statistics', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char1', 'char2']);
      mockCharacterLossManager.getLostCharacters.mockReturnValue([
        createTestLostCharacter('char3', 'Character 3'),
      ]);

      partyManager.setPartyComposition(['char1']);

      const stats = partyManager.getPartyStats();

      expect(stats.totalAvailable).toBe(2);
      expect(stats.totalLost).toBe(1);
      expect(stats.currentPartySize).toBe(1);
      expect(stats.isValid).toBe(true);
    });
  });

  describe('Party Suggestions', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1', 5),
        createTestCharacter('char2', 'Character 2', 10),
        createTestCharacter('char3', 'Character 3', 3),
        createTestCharacter('char4', 'Character 4', 8),
      ];
      partyManager.initializeCharacters(characters);
    });

    test('should generate suggestions for party composition', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue([
        'char1',
        'char2',
        'char3',
        'char4',
      ]);
      mockCharacterLossManager.getLostCharacters.mockReturnValue([]);

      const suggestions = partyManager.getPartySuggestions(['char1']);

      expect(suggestions).toHaveLength(3); // Excluding char1 which is already in party
      expect(suggestions[0].characterId).toBe('char2'); // Highest level
      expect(suggestions[0].reason).toContain('Level 10');
    });

    test('should suggest replacements for lost characters', () => {
      const lostCharacter = createTestLostCharacter('char1', 'Character 1');
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(['char2', 'char3', 'char4']);
      mockCharacterLossManager.getLostCharacters.mockReturnValue([lostCharacter]);

      const suggestions = partyManager.getPartySuggestions(['char1']); // Party contains lost character

      expect(suggestions.length).toBeGreaterThan(0);
      const replacementSuggestion = suggestions.find(s => s.replacesLostCharacter === 'char1');
      expect(replacementSuggestion).toBeDefined();
      expect(replacementSuggestion?.reason).toContain('Replacement for lost character');
    });

    test('should return empty suggestions when disabled', () => {
      const partyManagerNoSuggestions = new PartyManager(mockScene, { suggestAlternatives: false });
      partyManagerNoSuggestions.setCharacterLossManager(mockCharacterLossManager);

      const suggestions = partyManagerNoSuggestions.getPartySuggestions();

      expect(suggestions).toHaveLength(0);

      partyManagerNoSuggestions.destroy();
    });

    test('should handle errors in suggestion generation gracefully', () => {
      // Create a new party manager without initializing characters
      const emptyPartyManager = new PartyManager(mockScene);
      emptyPartyManager.setCharacterLossManager(mockCharacterLossManager);

      const suggestions = emptyPartyManager.getPartySuggestions();

      expect(suggestions).toHaveLength(0);

      emptyPartyManager.destroy();
    });
  });

  describe('Error Message Generation', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
      ];
      partyManager.initializeCharacters(characters);
    });

    test('should generate error messages for lost character', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'char1',
            message: 'Character 1 is lost',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['char2'],
        lostCharacters: [createTestLostCharacter('char1', 'Character 1')],
        totalAvailable: 1,
      };

      const messages = partyManager.generateErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].suggestedFix).toContain('Choose from available characters');
    });

    test('should generate error messages for insufficient members', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'insufficient_members',
            message: 'Party must have at least one character',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['char1', 'char2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = partyManager.generateErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].suggestedFix).toContain('Select available characters');
    });

    test('should generate warning messages', () => {
      const validationResult: PartyValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          {
            type: 'low_level',
            message: 'Character is low level',
            severity: 'medium',
          },
        ],
        availableCharacters: ['char1', 'char2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = partyManager.generateErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('warning');
      expect(messages[0].actionable).toBe(true);
    });

    test('should mark messages as non-actionable when no alternatives exist', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'char1',
            message: 'Character 1 is lost',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: [], // No available characters
        lostCharacters: [createTestLostCharacter('char1', 'Character 1')],
        totalAvailable: 0,
      };

      const messages = partyManager.generateErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].actionable).toBe(false);
      expect(messages[0].suggestedFix).toContain('No available characters');
    });
  });

  describe('Character Loss Integration', () => {
    beforeEach(() => {
      const characters = [
        createTestCharacter('char1', 'Character 1'),
        createTestCharacter('char2', 'Character 2'),
        createTestCharacter('char3', 'Character 3'),
      ];
      partyManager.initializeCharacters(characters);
      partyManager.setPartyComposition(['char1', 'char2']);
    });

    test('should handle character lost event', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');
      const lostCharacter = createTestLostCharacter('char1', 'Character 1');

      // Simulate character loss event
      const characterLossHandler = mockCharacterLossManager.on.mock.calls.find(
        call => call[0] === 'character-loss-processed'
      )?.[1];

      if (characterLossHandler) {
        characterLossHandler({
          unit: { id: 'char1', name: 'Character 1' },
          lostCharacter,
        });
      }

      expect(emitSpy).toHaveBeenCalledWith(
        'party-invalidated',
        expect.objectContaining({
          lostCharacter,
        })
      );
    });

    test('should handle chapter reset event', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');

      // Simulate chapter reset event
      const chapterResetHandler = mockCharacterLossManager.on.mock.calls.find(
        call => call[0] === 'chapter-state-reset'
      )?.[1];

      if (chapterResetHandler) {
        chapterResetHandler({ chapterId: 'chapter1' });
      }

      expect(partyManager.getCurrentParty().members).toHaveLength(0);
      expect(emitSpy).toHaveBeenCalledWith('party-reset', { chapterId: 'chapter1' });
    });

    test('should handle chapter initialized event', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');

      // Simulate chapter initialized event
      const chapterInitHandler = mockCharacterLossManager.on.mock.calls.find(
        call => call[0] === 'chapter-initialized'
      )?.[1];

      if (chapterInitHandler) {
        chapterInitHandler({ chapterId: 'chapter1' });
      }

      expect(emitSpy).toHaveBeenCalledWith(
        'party-revalidated',
        expect.objectContaining({
          chapterId: 'chapter1',
        })
      );
    });

    test('should not emit party invalidated for non-party character loss', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');
      const lostCharacter = createTestLostCharacter('char3', 'Character 3'); // Not in party

      // Simulate character loss event
      const characterLossHandler = mockCharacterLossManager.on.mock.calls.find(
        call => call[0] === 'character-loss-processed'
      )?.[1];

      if (characterLossHandler) {
        characterLossHandler({
          unit: { id: 'char3', name: 'Character 3' },
          lostCharacter,
        });
      }

      expect(emitSpy).not.toHaveBeenCalledWith('party-invalidated', expect.anything());
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up event listeners on destroy', () => {
      partyManager.destroy();

      expect(mockCharacterLossManager.off).toHaveBeenCalledWith(
        'character-loss-processed',
        expect.any(Function)
      );
      expect(mockCharacterLossManager.off).toHaveBeenCalledWith(
        'chapter-state-reset',
        expect.any(Function)
      );
      expect(mockCharacterLossManager.off).toHaveBeenCalledWith(
        'chapter-initialized',
        expect.any(Function)
      );
    });

    test('should emit destroyed event on destroy', () => {
      const emitSpy = jest.spyOn(partyManager, 'emit');

      partyManager.destroy();

      expect(emitSpy).toHaveBeenCalledWith('party-manager-destroyed');
    });

    test('should reset party composition on destroy', () => {
      partyManager.setPartyComposition(['char1', 'char2']);

      partyManager.destroy();

      expect(partyManager.getCurrentParty().members).toHaveLength(0);
    });

    test('should handle destroy when no character loss manager is set', () => {
      const partyManagerNoLoss = new PartyManager(mockScene);

      expect(() => partyManagerNoLoss.destroy()).not.toThrow();

      partyManagerNoLoss.destroy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle party composition with no characters initialized', () => {
      const result = partyManager.validatePartyComposition(['char1']);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      const invalidCharError = result.errors.find(e => e.type === 'invalid_character');
      expect(invalidCharError).toBeDefined();
    });

    test('should handle character loss manager returning null/undefined', () => {
      mockCharacterLossManager.getAvailableCharacters.mockReturnValue(null);
      mockCharacterLossManager.getLostCharacters.mockReturnValue(undefined);

      const available = partyManager.getAvailableCharacters();
      const lost = partyManager.getLostCharacters();

      expect(available).toHaveLength(0);
      expect(lost).toHaveLength(0);
    });

    test('should handle malformed character data gracefully', () => {
      const malformedCharacters = [
        null,
        undefined,
        { id: 'char1' }, // Missing required fields
        createTestCharacter('char2', 'Character 2'),
      ] as any;

      const result = partyManager.initializeCharacters(malformedCharacters);

      expect(result.success).toBe(false);
    });

    test('should handle very large party compositions', () => {
      const largeParty = Array.from({ length: 100 }, (_, i) => `char${i}`);

      const result = partyManager.validatePartyComposition(largeParty);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('cannot have more than'))).toBe(true);
    });
  });
});
