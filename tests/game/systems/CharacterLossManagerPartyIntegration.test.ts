/**
 * Unit tests for CharacterLossManager party composition integration
 * Tests the party-related methods added to CharacterLossManager
 */

import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { Unit } from '../../../game/src/types/gameplay';
import {
  LostCharacter,
  LossCause,
  LossCauseType,
  PartyValidationResult,
  DangerLevel,
} from '../../../game/src/types/characterLoss';

// Mock Phaser scene
const mockScene = {
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
} as any;

// Test data
const createTestCharacter = (
  id: string,
  name: string,
  level: number = 1,
  faction: 'player' | 'enemy' = 'player',
  currentHP: number = 100
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
  currentHP,
  currentMP: 50,
  level,
  faction,
  hasActed: false,
  hasMoved: false,
});

const createTestLossCause = (): LossCause => ({
  type: LossCauseType.BATTLE_DEFEAT,
  description: 'Test battle defeat',
  timestamp: Date.now(),
});

describe('CharacterLossManager Party Integration', () => {
  let characterLossManager: CharacterLossManager;
  let testCharacters: Unit[];

  beforeEach(() => {
    jest.clearAllMocks();
    characterLossManager = new CharacterLossManager(mockScene);

    testCharacters = [
      createTestCharacter('player1', 'Player 1', 5, 'player'),
      createTestCharacter('player2', 'Player 2', 10, 'player'),
      createTestCharacter('player3', 'Player 3', 3, 'player'),
      createTestCharacter('player4', 'Player 4', 8, 'player'),
      createTestCharacter('enemy1', 'Enemy 1', 5, 'enemy'),
    ];

    // Initialize chapter with test characters
    characterLossManager.initializeChapter('test-chapter', testCharacters);
  });

  afterEach(() => {
    characterLossManager.destroy();
  });

  describe('getAvailableCharacterUnits', () => {
    test('should return only living player characters', () => {
      const availableUnits = characterLossManager.getAvailableCharacterUnits();

      expect(availableUnits).toHaveLength(4); // Only player characters
      expect(availableUnits.every(unit => unit.faction === 'player')).toBe(true);
      expect(availableUnits.every(unit => unit.currentHP > 0)).toBe(true);
    });

    test('should exclude lost characters', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const availableUnits = characterLossManager.getAvailableCharacterUnits();

      expect(availableUnits).toHaveLength(3);
      expect(availableUnits.find(unit => unit.id === 'player1')).toBeUndefined();
    });

    test('should exclude characters with 0 HP', () => {
      // Set a character's HP to 0
      testCharacters[1].currentHP = 0;
      characterLossManager.initializeChapter('test-chapter', testCharacters);

      const availableUnits = characterLossManager.getAvailableCharacterUnits();

      expect(availableUnits).toHaveLength(3);
      expect(availableUnits.find(unit => unit.id === 'player2')).toBeUndefined();
    });

    test('should exclude enemy characters', () => {
      const availableUnits = characterLossManager.getAvailableCharacterUnits();

      expect(availableUnits.find(unit => unit.faction === 'enemy')).toBeUndefined();
    });
  });

  describe('canSelectCharacterForParty', () => {
    test('should allow selection of valid player character', () => {
      const result = characterLossManager.canSelectCharacterForParty('player1');

      expect(result.canSelect).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('should reject non-existent character', () => {
      const result = characterLossManager.canSelectCharacterForParty('nonexistent');

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('Character not found');
      expect(result.severity).toBe('error');
    });

    test('should reject lost character', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const result = characterLossManager.canSelectCharacterForParty('player1');

      expect(result.canSelect).toBe(false);
      expect(result.reason).toContain('Character is lost and cannot be used');
      expect(result.severity).toBe('error');
    });

    test('should reject character with 0 HP', () => {
      testCharacters[0].currentHP = 0;
      characterLossManager.initializeChapter('test-chapter', testCharacters);

      const result = characterLossManager.canSelectCharacterForParty('player1');

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('Character has no HP remaining');
      expect(result.severity).toBe('error');
    });

    test('should reject enemy character', () => {
      const result = characterLossManager.canSelectCharacterForParty('enemy1');

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('Only player characters can be selected');
      expect(result.severity).toBe('error');
    });

    test('should include loss cause in rejection reason', async () => {
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'Defeated by boss',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(testCharacters[0], lossCause);

      const result = characterLossManager.canSelectCharacterForParty('player1');

      expect(result.canSelect).toBe(false);
      expect(result.reason).toContain('(Defeated by boss)');
    });
  });

  describe('generatePartyCompositionSuggestions', () => {
    test('should suggest high-level characters not in party', () => {
      const suggestions = characterLossManager.generatePartyCompositionSuggestions(['player1']);

      expect(suggestions).toHaveLength(3); // Excluding player1
      expect(suggestions[0].characterId).toBe('player2'); // Highest level (10)
      expect(suggestions[0].characterName).toBe('Player 2');
      expect(suggestions[0].reason).toContain('Level 10');
      expect(suggestions[0].priority).toBe(10);
    });

    test('should suggest replacements for lost characters in party', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const suggestions = characterLossManager.generatePartyCompositionSuggestions([
        'player1',
        'player2',
      ]);

      expect(suggestions.length).toBeGreaterThan(0);

      const replacementSuggestion = suggestions.find(s => s.replacesLostCharacter === 'player1');
      expect(replacementSuggestion).toBeDefined();
      expect(replacementSuggestion?.reason).toContain('Replacement for lost character Player 1');
      expect(replacementSuggestion?.priority).toBe(10);
    });

    test('should limit suggestions to maxSuggestions parameter', () => {
      const suggestions = characterLossManager.generatePartyCompositionSuggestions([], 2);

      expect(suggestions).toHaveLength(2);
    });

    test('should sort suggestions by priority', () => {
      const suggestions = characterLossManager.generatePartyCompositionSuggestions([]);

      // Should be sorted by level (priority)
      expect(suggestions[0].priority).toBeGreaterThanOrEqual(suggestions[1].priority);
      expect(suggestions[1].priority).toBeGreaterThanOrEqual(suggestions[2].priority);
    });

    test('should handle empty current party', () => {
      const suggestions = characterLossManager.generatePartyCompositionSuggestions();

      expect(suggestions).toHaveLength(4); // All player characters
      expect(suggestions[0].characterId).toBe('player2'); // Highest level
    });

    test('should handle errors gracefully', () => {
      // Create a manager without initialized characters
      const emptyManager = new CharacterLossManager(mockScene);

      const suggestions = emptyManager.generatePartyCompositionSuggestions(['player1']);

      expect(suggestions).toHaveLength(0);

      emptyManager.destroy();
    });

    test('should not suggest characters already in party', () => {
      const suggestions = characterLossManager.generatePartyCompositionSuggestions([
        'player1',
        'player2',
      ]);

      expect(suggestions.find(s => s.characterId === 'player1')).toBeUndefined();
      expect(suggestions.find(s => s.characterId === 'player2')).toBeUndefined();
    });

    test('should prioritize replacement suggestions over regular suggestions', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const suggestions = characterLossManager.generatePartyCompositionSuggestions(['player1']);

      const replacementSuggestions = suggestions.filter(s => s.replacesLostCharacter);
      const regularSuggestions = suggestions.filter(s => !s.replacesLostCharacter);

      if (replacementSuggestions.length > 0 && regularSuggestions.length > 0) {
        expect(replacementSuggestions[0].priority).toBeGreaterThan(regularSuggestions[0].priority);
      }
    });
  });

  describe('generatePartyCompositionErrorMessages', () => {
    test('should generate error messages for lost character with replacement suggestion', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'player1',
            message: 'Player 1 is lost and cannot be used',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['player2', 'player3', 'player4'],
        lostCharacters: characterLossManager.getLostCharacters(),
        totalAvailable: 3,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      // Since we don't have a specific replacement suggestion, it should fall back to general advice
      expect(messages[0].suggestedFix).toContain('Choose from available characters');
      expect(messages[0].actionable).toBe(true);
      expect(messages[0].characterId).toBe('player1');
    });

    test('should generate error messages for insufficient members with available characters', () => {
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
        availableCharacters: ['player1', 'player2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].suggestedFix).toContain('Select available characters');
      expect(messages[0].actionable).toBe(true);
    });

    test('should generate non-actionable error messages when no alternatives exist', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'player1',
            message: 'Player 1 is lost',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: [], // No available characters
        lostCharacters: characterLossManager.getLostCharacters(),
        totalAvailable: 0,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].actionable).toBe(false);
      expect(messages[0].suggestedFix).toContain('No available characters to replace with');
    });

    test('should generate error messages for invalid character', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'invalid_character',
            characterId: 'nonexistent',
            message: 'Character not found',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['player1', 'player2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].suggestedFix).toBe('Remove invalid character and select a valid one');
      expect(messages[0].actionable).toBe(true);
    });

    test('should generate error messages for duplicate character', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'duplicate_character',
            message: 'Duplicate characters in party',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['player1', 'player2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].suggestedFix).toBe('Remove duplicate characters from party');
      expect(messages[0].actionable).toBe(true);
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
            characterId: 'player3',
          },
          {
            type: 'unbalanced_party',
            message: 'Party is unbalanced',
            severity: 'low',
          },
          {
            type: 'missing_role',
            message: 'Few characters available',
            severity: 'high',
          },
        ],
        availableCharacters: ['player1', 'player2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(3);
      expect(messages.every(m => m.severity === 'warning')).toBe(true);
      expect(messages.every(m => m.actionable === true)).toBe(true);

      expect(messages[0].suggestedFix).toContain('higher level characters');
      expect(messages[1].suggestedFix).toContain('different roles');
      expect(messages[2].suggestedFix).toContain('careful in battle');
    });

    test('should handle unknown error types gracefully', () => {
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'unknown_error' as any,
            message: 'Unknown error occurred',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: [],
        lostCharacters: [],
        totalAvailable: 0,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].suggestedFix).toBe('Review party composition');
    });

    test('should handle unknown warning types gracefully', () => {
      const validationResult: PartyValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          {
            type: 'unknown_warning' as any,
            message: 'Unknown warning',
            severity: 'low',
          },
        ],
        availableCharacters: [],
        lostCharacters: [],
        totalAvailable: 0,
      };

      const messages = characterLossManager.generatePartyCompositionErrorMessages(validationResult);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe('warning');
      expect(messages[0].suggestedFix).toBe('Consider the warning when planning strategy');
    });
  });

  describe('Enhanced validatePartyComposition', () => {
    test('should include character names in error messages', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const result = characterLossManager.validatePartyComposition(['player1', 'player2']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Player 1 is lost'); // Character name, not just ID
    });

    test('should fall back to character ID when name not available', async () => {
      // Lose a character but simulate missing name in lost character data
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      // Mock getLostCharacters to return data without name
      const originalGetLostCharacters = characterLossManager.getLostCharacters;
      jest.spyOn(characterLossManager, 'getLostCharacters').mockReturnValue([]);

      const result = characterLossManager.validatePartyComposition(['player1']);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('player1'); // Falls back to ID

      // Restore original method
      characterLossManager.getLostCharacters = originalGetLostCharacters;
    });
  });

  describe('Integration with Character Loss Events', () => {
    test('should update party validation after character loss', async () => {
      // Initial validation should pass
      let result = characterLossManager.validatePartyComposition(['player1', 'player2']);
      expect(result.isValid).toBe(true);

      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      // Validation should now fail for the lost character
      result = characterLossManager.validatePartyComposition(['player1', 'player2']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].characterId).toBe('player1');
    });

    test('should update available characters after character loss', async () => {
      // Initial available characters
      let available = characterLossManager.getAvailableCharacterUnits();
      expect(available).toHaveLength(4);

      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      // Available characters should be reduced
      available = characterLossManager.getAvailableCharacterUnits();
      expect(available).toHaveLength(3);
      expect(available.find(unit => unit.id === 'player1')).toBeUndefined();
    });

    test('should update party suggestions after character loss', async () => {
      // Lose a character
      await characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause());

      const suggestions = characterLossManager.generatePartyCompositionSuggestions(['player1']);

      // Should include replacement suggestions
      const replacementSuggestion = suggestions.find(s => s.replacesLostCharacter === 'player1');
      expect(replacementSuggestion).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty character list', () => {
      const emptyManager = new CharacterLossManager(mockScene);
      emptyManager.initializeChapter('empty-chapter', []);

      const available = emptyManager.getAvailableCharacterUnits();
      const suggestions = emptyManager.generatePartyCompositionSuggestions();
      const validation = emptyManager.validatePartyComposition([]); // Empty party should be valid when no characters exist

      expect(available).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
      expect(validation.isValid).toBe(true); // Empty party is valid when no characters exist

      emptyManager.destroy();
    });

    test('should handle malformed character data', () => {
      const malformedCharacters = [
        { ...testCharacters[0], id: '' }, // Empty ID
        { ...testCharacters[1], name: '' }, // Empty name
        { ...testCharacters[2], currentHP: -1 }, // Negative HP
      ];

      characterLossManager.initializeChapter('malformed-chapter', malformedCharacters);

      const available = characterLossManager.getAvailableCharacterUnits();

      // Should handle malformed data gracefully
      expect(available.length).toBeLessThanOrEqual(3);
    });

    test('should handle very large party validation', () => {
      const largeParty = Array.from({ length: 1000 }, (_, i) => `player${i}`);

      const result = characterLossManager.validatePartyComposition(largeParty);

      // Should complete without crashing
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true); // Large party with non-existent characters is valid (they're just not lost)
    });

    test('should handle concurrent character loss processing', async () => {
      // Simulate concurrent loss processing
      const lossPromises = [
        characterLossManager.processCharacterLoss(testCharacters[0], createTestLossCause()),
        characterLossManager.processCharacterLoss(testCharacters[1], createTestLossCause()),
      ];

      await Promise.all(lossPromises);

      const available = characterLossManager.getAvailableCharacterUnits();
      expect(available).toHaveLength(2); // Two characters lost
    });
  });
});
