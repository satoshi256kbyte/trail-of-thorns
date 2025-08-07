/**
 * Unit tests for CharacterLossState class
 * Tests chapter-based character state management functionality
 */

import { CharacterLossState } from '../../../game/src/systems/CharacterLossState';
import {
  LossCause,
  LossCauseType,
  StatusEffectType,
  ChapterLossData,
  CharacterLossError,
  CharacterLossUtils,
} from '../../../game/src/types/characterLoss';
import { Unit } from '../../../game/src/types/gameplay';

describe('CharacterLossState', () => {
  let lossState: CharacterLossState;
  let mockUnit: Unit;
  let mockLossCause: LossCause;

  beforeEach(() => {
    lossState = new CharacterLossState();

    mockUnit = {
      id: 'test-character-1',
      name: 'Test Character',
      position: { x: 5, y: 5 },
      level: 10,
      wasRecruited: false,
      currentHP: 50,
      maxHP: 100,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
      },
      currentMP: 50,
    };

    mockLossCause = CharacterLossUtils.createBattleDefeatCause('enemy-1', 'Orc Warrior', 25);
  });

  describe('Chapter Initialization', () => {
    test('should initialize chapter with valid ID', () => {
      const chapterId = 'chapter-1';

      lossState.initializeChapter(chapterId);

      expect(lossState.isChapterInitialized()).toBe(true);
      expect(lossState.getCurrentChapterId()).toBe(chapterId);
      expect(lossState.getTotalLosses()).toBe(0);
      expect(lossState.isPerfectChapter()).toBe(true);
      expect(lossState.getCurrentTurn()).toBe(1);
    });

    test('should throw error for empty chapter ID', () => {
      expect(() => {
        lossState.initializeChapter('');
      }).toThrow();

      expect(() => {
        lossState.initializeChapter('   ');
      }).toThrow();
    });

    test('should clear previous state when initializing new chapter', () => {
      // Initialize first chapter and add some data
      lossState.initializeChapter('chapter-1');
      lossState.addParticipatingCharacter('char-1');
      lossState.recordLoss(mockUnit, mockLossCause);

      expect(lossState.getTotalLosses()).toBe(1);

      // Initialize new chapter
      lossState.initializeChapter('chapter-2');

      expect(lossState.getCurrentChapterId()).toBe('chapter-2');
      expect(lossState.getTotalLosses()).toBe(0);
      expect(lossState.isPerfectChapter()).toBe(true);
      expect(lossState.getParticipatingCharacters().size).toBe(0);
    });

    test('should track chapter start time', () => {
      const beforeInit = Date.now();
      lossState.initializeChapter('chapter-1');
      const afterInit = Date.now();

      const startTime = lossState.getChapterStartTime();
      expect(startTime).toBeGreaterThanOrEqual(beforeInit);
      expect(startTime).toBeLessThanOrEqual(afterInit);
    });
  });

  describe('Chapter State Reset', () => {
    test('should reset chapter state while keeping chapter ID', () => {
      lossState.initializeChapter('chapter-1');
      lossState.addParticipatingCharacter('char-1');
      lossState.recordLoss(mockUnit, mockLossCause);
      lossState.setCurrentTurn(5);

      expect(lossState.getTotalLosses()).toBe(1);
      expect(lossState.getCurrentTurn()).toBe(5);

      lossState.resetChapterState();

      expect(lossState.getCurrentChapterId()).toBe('chapter-1');
      expect(lossState.getTotalLosses()).toBe(0);
      expect(lossState.isPerfectChapter()).toBe(true);
      expect(lossState.getParticipatingCharacters().size).toBe(0);
    });

    test('should handle reset on uninitialized chapter gracefully', () => {
      expect(() => {
        lossState.resetChapterState();
      }).not.toThrow();

      expect(lossState.isChapterInitialized()).toBe(false);
    });

    test('should update chapter start time on reset', () => {
      lossState.initializeChapter('chapter-1');
      const originalStartTime = lossState.getChapterStartTime();

      // Wait a bit to ensure time difference
      setTimeout(() => {
        lossState.resetChapterState();
        const newStartTime = lossState.getChapterStartTime();

        expect(newStartTime).toBeGreaterThan(originalStartTime);
      }, 10);
    });
  });

  describe('Character Loss Recording', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should record character loss successfully', () => {
      lossState.recordLoss(mockUnit, mockLossCause);

      expect(lossState.isLost(mockUnit.id)).toBe(true);
      expect(lossState.getTotalLosses()).toBe(1);
      expect(lossState.isPerfectChapter()).toBe(false);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter).not.toBeNull();
      expect(lostCharacter!.characterId).toBe(mockUnit.id);
      expect(lostCharacter!.name).toBe(mockUnit.name);
      expect(lostCharacter!.level).toBe(mockUnit.level);
      expect(lostCharacter!.wasRecruited).toBe(mockUnit.wasRecruited);
      expect(lostCharacter!.cause).toEqual(mockLossCause);
    });

    test('should throw error when recording loss without chapter initialization', () => {
      const uninitializedState = new CharacterLossState();

      expect(() => {
        uninitializedState.recordLoss(mockUnit, mockLossCause);
      }).toThrow();
    });

    test('should throw error for invalid unit', () => {
      const invalidUnit = { ...mockUnit, id: '' };

      expect(() => {
        lossState.recordLoss(invalidUnit, mockLossCause);
      }).toThrow();
    });

    test('should throw error for invalid loss cause', () => {
      const invalidCause = {
        type: 'invalid_type' as any,
        description: 'Invalid cause',
        timestamp: Date.now(),
      };

      expect(() => {
        lossState.recordLoss(mockUnit, invalidCause);
      }).toThrow();
    });

    test('should handle duplicate loss recording gracefully', () => {
      lossState.recordLoss(mockUnit, mockLossCause);
      expect(lossState.getTotalLosses()).toBe(1);

      // Try to record the same character loss again
      lossState.recordLoss(mockUnit, mockLossCause);
      expect(lossState.getTotalLosses()).toBe(1); // Should still be 1
    });

    test('should record multiple character losses', () => {
      const unit2: Unit = { ...mockUnit, id: 'test-character-2', name: 'Test Character 2' };
      const unit3: Unit = { ...mockUnit, id: 'test-character-3', name: 'Test Character 3' };

      lossState.recordLoss(mockUnit, mockLossCause);
      lossState.recordLoss(unit2, mockLossCause);
      lossState.recordLoss(unit3, mockLossCause);

      expect(lossState.getTotalLosses()).toBe(3);
      expect(lossState.isLost(mockUnit.id)).toBe(true);
      expect(lossState.isLost(unit2.id)).toBe(true);
      expect(lossState.isLost(unit3.id)).toBe(true);
    });

    test('should record loss with current turn number', () => {
      lossState.setCurrentTurn(7);
      lossState.recordLoss(mockUnit, mockLossCause);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter!.turn).toBe(7);
    });

    test('should add character to participating characters when recording loss', () => {
      expect(lossState.getParticipatingCharacters().has(mockUnit.id)).toBe(false);

      lossState.recordLoss(mockUnit, mockLossCause);

      expect(lossState.getParticipatingCharacters().has(mockUnit.id)).toBe(true);
    });

    test('should record loss history', () => {
      lossState.recordLoss(mockUnit, mockLossCause);

      const history = lossState.getLossHistory();
      expect(history).toHaveLength(1);
      expect(history[0].characterId).toBe(mockUnit.id);
      expect(history[0].chapterId).toBe('chapter-1');
    });
  });

  describe('Loss State Queries', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should return false for non-lost characters', () => {
      expect(lossState.isLost('non-existent-character')).toBe(false);
      expect(lossState.isLost('')).toBe(false);
    });

    test('should return null for non-lost character data', () => {
      expect(lossState.getLostCharacter('non-existent-character')).toBeNull();
      expect(lossState.getLostCharacter('')).toBeNull();
    });

    test('should return cloned lost character data', () => {
      lossState.recordLoss(mockUnit, mockLossCause);

      const lostCharacter1 = lossState.getLostCharacter(mockUnit.id);
      const lostCharacter2 = lossState.getLostCharacter(mockUnit.id);

      expect(lostCharacter1).toEqual(lostCharacter2);
      expect(lostCharacter1).not.toBe(lostCharacter2); // Different objects
    });

    test('should return all lost characters', () => {
      const unit2: Unit = { ...mockUnit, id: 'test-character-2', name: 'Test Character 2' };

      lossState.recordLoss(mockUnit, mockLossCause);
      lossState.recordLoss(unit2, mockLossCause);

      const lostCharacters = lossState.getLostCharacters();
      expect(lostCharacters).toHaveLength(2);

      const characterIds = lostCharacters.map(char => char.characterId);
      expect(characterIds).toContain(mockUnit.id);
      expect(characterIds).toContain(unit2.id);
    });

    test('should return complete loss history', () => {
      const unit2: Unit = { ...mockUnit, id: 'test-character-2', name: 'Test Character 2' };

      lossState.recordLoss(mockUnit, mockLossCause);
      lossState.setCurrentTurn(2);
      lossState.recordLoss(unit2, mockLossCause);

      const history = lossState.getLossHistory();
      expect(history).toHaveLength(2);
      expect(history[0].turn).toBe(1);
      expect(history[1].turn).toBe(2);
    });

    test('should calculate perfect chapter correctly', () => {
      expect(lossState.isPerfectChapter()).toBe(true);

      lossState.recordLoss(mockUnit, mockLossCause);
      expect(lossState.isPerfectChapter()).toBe(false);
    });
  });

  describe('Chapter Summary', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should generate chapter summary for perfect chapter', () => {
      lossState.addParticipatingCharacter('char-1');
      lossState.addParticipatingCharacter('char-2');
      lossState.setCurrentTurn(10);

      const summary = lossState.getChapterSummary();

      expect(summary.chapterId).toBe('chapter-1');
      expect(summary.totalCharacters).toBe(2);
      expect(summary.lostCharacters).toHaveLength(0);
      expect(summary.survivedCharacters).toHaveLength(2);
      expect(summary.isPerfectClear).toBe(true);
      expect(summary.totalTurns).toBe(10);
    });

    test('should generate chapter summary with losses', () => {
      lossState.addParticipatingCharacter('char-1');
      lossState.addParticipatingCharacter('char-2');
      lossState.recordLoss(mockUnit, mockLossCause); // This adds mockUnit.id to participating characters
      lossState.setCurrentTurn(15);

      const summary = lossState.getChapterSummary();

      expect(summary.chapterId).toBe('chapter-1');
      expect(summary.totalCharacters).toBe(3); // char-1, char-2, and mockUnit.id
      expect(summary.lostCharacters).toHaveLength(1);
      expect(summary.survivedCharacters).toHaveLength(2); // char-1 and char-2 survived
      expect(summary.isPerfectClear).toBe(false);
      expect(summary.totalTurns).toBe(15);
      expect(summary.lostCharacters[0].characterId).toBe(mockUnit.id);
    });

    test('should throw error when getting summary without initialization', () => {
      const uninitializedState = new CharacterLossState();

      expect(() => {
        uninitializedState.getChapterSummary();
      }).toThrow();
    });

    test('should include chapter duration in summary', () => {
      const summary = lossState.getChapterSummary();

      expect(summary.chapterDuration).toBeGreaterThan(0);
      expect(summary.completedAt).toBeGreaterThan(lossState.getChapterStartTime());
    });
  });

  describe('Data Serialization', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should serialize empty state', () => {
      const serialized = lossState.serialize();

      expect(serialized.chapterId).toBe('chapter-1');
      expect(serialized.lostCharacters).toEqual({});
      expect(serialized.lossHistory).toHaveLength(0);
      expect(serialized.chapterStartTime).toBe(lossState.getChapterStartTime());
      expect(serialized.version).toBe('1.0.0');
    });

    test('should serialize state with losses', () => {
      lossState.recordLoss(mockUnit, mockLossCause);

      const serialized = lossState.serialize();

      expect(serialized.chapterId).toBe('chapter-1');
      expect(Object.keys(serialized.lostCharacters)).toHaveLength(1);
      expect(serialized.lostCharacters[mockUnit.id]).toBeDefined();
      expect(serialized.lossHistory).toHaveLength(1);
    });

    test('should throw error when serializing uninitialized state', () => {
      const uninitializedState = new CharacterLossState();

      expect(() => {
        uninitializedState.serialize();
      }).toThrow();
    });
  });

  describe('Data Deserialization', () => {
    test('should deserialize valid data', () => {
      const data: ChapterLossData = {
        chapterId: 'chapter-2',
        lostCharacters: {
          'char-1': {
            characterId: 'char-1',
            name: 'Lost Character',
            lostAt: Date.now(),
            turn: 5,
            cause: mockLossCause,
            level: 8,
            wasRecruited: true,
          },
        },
        lossHistory: [
          {
            characterId: 'char-1',
            name: 'Lost Character',
            lostAt: Date.now(),
            turn: 5,
            cause: mockLossCause,
            level: 8,
            wasRecruited: true,
            chapterId: 'chapter-2',
            stageId: 'stage-1',
            recoverable: false,
          },
        ],
        chapterStartTime: Date.now() - 10000,
        version: '1.0.0',
      };

      lossState.deserialize(data);

      expect(lossState.getCurrentChapterId()).toBe('chapter-2');
      expect(lossState.isLost('char-1')).toBe(true);
      expect(lossState.getTotalLosses()).toBe(1);
      expect(lossState.getLossHistory()).toHaveLength(1);
      expect(lossState.getParticipatingCharacters().has('char-1')).toBe(true);
    });

    test('should throw error for invalid data', () => {
      const invalidData = {
        chapterId: '',
        lostCharacters: 'invalid',
        lossHistory: 'invalid',
        chapterStartTime: -1,
        version: '',
      };

      expect(() => {
        lossState.deserialize(invalidData as any);
      }).toThrow();
    });

    test('should update current turn based on loss history', () => {
      const data: ChapterLossData = {
        chapterId: 'chapter-2',
        lostCharacters: {},
        lossHistory: [
          {
            characterId: 'char-1',
            name: 'Lost Character',
            lostAt: Date.now(),
            turn: 15,
            cause: mockLossCause,
            level: 8,
            wasRecruited: true,
            chapterId: 'chapter-2',
            stageId: 'stage-1',
            recoverable: false,
          },
        ],
        chapterStartTime: Date.now() - 10000,
        version: '1.0.0',
      };

      lossState.deserialize(data);

      expect(lossState.getCurrentTurn()).toBe(15);
    });
  });

  describe('State Validation', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should validate correct state', () => {
      lossState.recordLoss(mockUnit, mockLossCause);

      expect(lossState.validateState()).toBe(true);
      expect(lossState.getStateErrors()).toHaveLength(0);
    });

    test('should detect uninitialized state', () => {
      const uninitializedState = new CharacterLossState();

      expect(uninitializedState.validateState()).toBe(false);

      const errors = uninitializedState.getStateErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].error).toBe(CharacterLossError.CHAPTER_NOT_INITIALIZED);
    });

    test('should validate empty state', () => {
      expect(lossState.validateState()).toBe(true);
      expect(lossState.getStateErrors()).toHaveLength(0);
    });
  });

  describe('Turn Management', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should set and get current turn', () => {
      expect(lossState.getCurrentTurn()).toBe(1);

      lossState.setCurrentTurn(5);
      expect(lossState.getCurrentTurn()).toBe(5);
    });

    test('should ignore invalid turn numbers', () => {
      lossState.setCurrentTurn(5);
      lossState.setCurrentTurn(0);
      expect(lossState.getCurrentTurn()).toBe(5);

      lossState.setCurrentTurn(-1);
      expect(lossState.getCurrentTurn()).toBe(5);
    });
  });

  describe('Participating Characters Management', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should add participating characters', () => {
      lossState.addParticipatingCharacter('char-1');
      lossState.addParticipatingCharacter('char-2');

      const participating = lossState.getParticipatingCharacters();
      expect(participating.size).toBe(2);
      expect(participating.has('char-1')).toBe(true);
      expect(participating.has('char-2')).toBe(true);
    });

    test('should ignore empty character IDs', () => {
      lossState.addParticipatingCharacter('');
      lossState.addParticipatingCharacter('   ');

      expect(lossState.getParticipatingCharacters().size).toBe(0);
    });

    test('should handle duplicate character IDs', () => {
      lossState.addParticipatingCharacter('char-1');
      lossState.addParticipatingCharacter('char-1');

      expect(lossState.getParticipatingCharacters().size).toBe(1);
    });

    test('should return cloned set of participating characters', () => {
      lossState.addParticipatingCharacter('char-1');

      const set1 = lossState.getParticipatingCharacters();
      const set2 = lossState.getParticipatingCharacters();

      expect(set1).toEqual(set2);
      expect(set1).not.toBe(set2);
    });
  });

  describe('Chapter Duration Tracking', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should track chapter duration', () => {
      const duration = lossState.getChapterDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test('should have increasing duration over time', done => {
      const initialDuration = lossState.getChapterDuration();

      setTimeout(() => {
        const laterDuration = lossState.getChapterDuration();
        expect(laterDuration).toBeGreaterThan(initialDuration);
        done();
      }, 10);
    });
  });

  describe('Different Loss Cause Types', () => {
    beforeEach(() => {
      lossState.initializeChapter('chapter-1');
    });

    test('should handle status effect loss cause', () => {
      const statusCause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.POISON, 10);

      lossState.recordLoss(mockUnit, statusCause);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter!.cause.type).toBe(LossCauseType.STATUS_EFFECT);
      expect(lostCharacter!.cause.statusType).toBe(StatusEffectType.POISON);
    });

    test('should handle critical damage loss cause', () => {
      const criticalCause = CharacterLossUtils.createCriticalDamageCause(
        'boss-1',
        'Dragon Lord',
        100
      );

      lossState.recordLoss(mockUnit, criticalCause);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter!.cause.type).toBe(LossCauseType.CRITICAL_DAMAGE);
      expect(lostCharacter!.cause.damageAmount).toBe(100);
    });

    test('should handle environmental loss cause', () => {
      const environmentalCause: LossCause = {
        type: LossCauseType.ENVIRONMENTAL,
        description: 'Fell into lava',
        timestamp: Date.now(),
        damageAmount: 999,
      };

      lossState.recordLoss(mockUnit, environmentalCause);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter!.cause.type).toBe(LossCauseType.ENVIRONMENTAL);
      expect(lostCharacter!.cause.description).toBe('Fell into lava');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unit with missing optional properties', () => {
      lossState.initializeChapter('chapter-1');

      const minimalUnit: Unit = {
        id: 'minimal-unit',
        name: '',
        position: { x: 0, y: 0 },
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        stats: {
          maxHP: 100,
          maxMP: 50,
          attack: 20,
          defense: 15,
          speed: 10,
          movement: 3,
        },
        currentHP: 50,
        currentMP: 25,
      };

      lossState.recordLoss(minimalUnit, mockLossCause);

      const lostCharacter = lossState.getLostCharacter(minimalUnit.id);
      expect(lostCharacter).not.toBeNull();
      expect(lostCharacter!.name).toBe('Character minimal-unit');
      expect(lostCharacter!.level).toBe(1);
      expect(lostCharacter!.wasRecruited).toBe(false);
    });

    test('should handle loss cause with missing optional properties', () => {
      lossState.initializeChapter('chapter-1');

      const minimalCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'Defeated in battle',
        timestamp: Date.now(),
      };

      lossState.recordLoss(mockUnit, minimalCause);

      const lostCharacter = lossState.getLostCharacter(mockUnit.id);
      expect(lostCharacter).not.toBeNull();
      expect(lostCharacter!.cause.sourceId).toBeUndefined();
      expect(lostCharacter!.cause.sourceName).toBeUndefined();
      expect(lostCharacter!.cause.damageAmount).toBeUndefined();
    });
  });
});
