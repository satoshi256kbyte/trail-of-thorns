/**
 * Unit tests for Character Loss System type definitions
 * Tests all type validators, utility functions, and data structures
 */

import {
  DangerLevel,
  LossCauseType,
  StatusEffectType,
  CharacterLossError,
  LossCause,
  LostCharacter,
  LossRecord,
  ChapterLossSummary,
  ChapterLossData,
  PartyValidationResult,
  PartyValidationError,
  PartyValidationWarning,
  LossContext,
  CharacterLossErrorDetails,
  LossWarningConfig,
  LossAnimationConfig,
  CharacterLossStatistics,
  LossTrackingUnit,
  CharacterLossTypeValidators,
  CharacterLossUtils,
} from '../../../game/src/types/characterLoss';
import { Position } from '../../../game/src/types/gameplay';

describe('CharacterLoss Type Definitions', () => {
  describe('Enums', () => {
    test('DangerLevel enum should have correct values', () => {
      expect(DangerLevel.NONE).toBe('none');
      expect(DangerLevel.LOW).toBe('low');
      expect(DangerLevel.MEDIUM).toBe('medium');
      expect(DangerLevel.HIGH).toBe('high');
      expect(DangerLevel.CRITICAL).toBe('critical');
    });

    test('LossCauseType enum should have correct values', () => {
      expect(LossCauseType.BATTLE_DEFEAT).toBe('battle_defeat');
      expect(LossCauseType.CRITICAL_DAMAGE).toBe('critical_damage');
      expect(LossCauseType.STATUS_EFFECT).toBe('status_effect');
      expect(LossCauseType.ENVIRONMENTAL).toBe('environmental');
      expect(LossCauseType.SACRIFICE).toBe('sacrifice');
    });

    test('StatusEffectType enum should have correct values', () => {
      expect(StatusEffectType.POISON).toBe('poison');
      expect(StatusEffectType.BURN).toBe('burn');
      expect(StatusEffectType.FREEZE).toBe('freeze');
      expect(StatusEffectType.CURSE).toBe('curse');
      expect(StatusEffectType.DRAIN).toBe('drain');
    });

    test('CharacterLossError enum should have correct values', () => {
      expect(CharacterLossError.INVALID_CHARACTER).toBe('invalid_character');
      expect(CharacterLossError.ALREADY_LOST).toBe('already_lost');
      expect(CharacterLossError.CHAPTER_NOT_INITIALIZED).toBe('chapter_not_initialized');
      expect(CharacterLossError.SAVE_DATA_CORRUPTED).toBe('save_data_corrupted');
      expect(CharacterLossError.SYSTEM_ERROR).toBe('system_error');
      expect(CharacterLossError.INVALID_LOSS_CAUSE).toBe('invalid_loss_cause');
      expect(CharacterLossError.LOSS_PROCESSING_FAILED).toBe('loss_processing_failed');
      expect(CharacterLossError.UI_UPDATE_FAILED).toBe('ui_update_failed');
    });
  });

  describe('Type Validators', () => {
    describe('isValidLossCause', () => {
      test('should validate correct loss cause', () => {
        const validCause: LossCause = {
          type: LossCauseType.BATTLE_DEFEAT,
          sourceId: 'enemy_001',
          sourceName: 'Orc Warrior',
          damageAmount: 50,
          description: 'Defeated by Orc Warrior',
          timestamp: Date.now(),
        };

        expect(CharacterLossTypeValidators.isValidLossCause(validCause)).toBe(true);
      });

      test('should reject invalid loss cause - missing required fields', () => {
        const invalidCause = {
          type: LossCauseType.BATTLE_DEFEAT,
          // missing description and timestamp
        };

        expect(CharacterLossTypeValidators.isValidLossCause(invalidCause)).toBe(false);
      });

      test('should reject invalid loss cause - invalid type', () => {
        const invalidCause = {
          type: 'invalid_type',
          description: 'Test description',
          timestamp: Date.now(),
        };

        expect(CharacterLossTypeValidators.isValidLossCause(invalidCause)).toBe(false);
      });

      test('should reject invalid loss cause - negative damage', () => {
        const invalidCause: LossCause = {
          type: LossCauseType.BATTLE_DEFEAT,
          damageAmount: -10,
          description: 'Test description',
          timestamp: Date.now(),
        };

        expect(CharacterLossTypeValidators.isValidLossCause(invalidCause)).toBe(false);
      });

      test('should reject invalid loss cause - invalid timestamp', () => {
        const invalidCause = {
          type: LossCauseType.BATTLE_DEFEAT,
          description: 'Test description',
          timestamp: 0,
        };

        expect(CharacterLossTypeValidators.isValidLossCause(invalidCause)).toBe(false);
      });
    });

    describe('isValidLostCharacter', () => {
      test('should validate correct lost character', () => {
        const validLostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
          position: { x: 5, y: 3 },
        };

        expect(CharacterLossTypeValidators.isValidLostCharacter(validLostCharacter)).toBe(true);
      });

      test('should reject invalid lost character - missing required fields', () => {
        const invalidLostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          // missing other required fields
        };

        expect(CharacterLossTypeValidators.isValidLostCharacter(invalidLostCharacter)).toBe(false);
      });

      test('should reject invalid lost character - invalid level', () => {
        const invalidLostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 0, // Invalid level
          wasRecruited: false,
        };

        expect(CharacterLossTypeValidators.isValidLostCharacter(invalidLostCharacter)).toBe(false);
      });

      test('should reject invalid lost character - invalid turn', () => {
        const invalidLostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 0, // Invalid turn
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
        };

        expect(CharacterLossTypeValidators.isValidLostCharacter(invalidLostCharacter)).toBe(false);
      });
    });

    describe('isValidLossRecord', () => {
      test('should validate correct loss record', () => {
        const validLossRecord: LossRecord = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
          chapterId: 'chapter_001',
          stageId: 'stage_001',
          recoverable: false,
        };

        expect(CharacterLossTypeValidators.isValidLossRecord(validLossRecord)).toBe(true);
      });

      test('should reject invalid loss record - missing chapter/stage info', () => {
        const invalidLossRecord = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
          // missing chapterId, stageId, recoverable
        };

        expect(CharacterLossTypeValidators.isValidLossRecord(invalidLossRecord)).toBe(false);
      });
    });

    describe('isValidChapterLossSummary', () => {
      test('should validate correct chapter loss summary', () => {
        const validSummary: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'The Beginning',
          totalCharacters: 6,
          lostCharacters: [],
          survivedCharacters: ['char_001', 'char_002', 'char_003'],
          chapterDuration: 1800000, // 30 minutes
          totalTurns: 25,
          isPerfectClear: true,
          completedAt: Date.now(),
        };

        expect(CharacterLossTypeValidators.isValidChapterLossSummary(validSummary)).toBe(true);
      });

      test('should reject invalid chapter loss summary - inconsistent perfect clear', () => {
        const invalidSummary: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'The Beginning',
          totalCharacters: 6,
          lostCharacters: [
            {
              characterId: 'char_001',
              name: 'Hero',
              lostAt: Date.now(),
              turn: 5,
              cause: {
                type: LossCauseType.BATTLE_DEFEAT,
                description: 'Defeated in battle',
                timestamp: Date.now(),
              },
              level: 10,
              wasRecruited: false,
            },
          ],
          survivedCharacters: ['char_002', 'char_003'],
          chapterDuration: 1800000,
          totalTurns: 25,
          isPerfectClear: true, // Should be false since there are lost characters
          completedAt: Date.now(),
        };

        expect(CharacterLossTypeValidators.isValidChapterLossSummary(invalidSummary)).toBe(false);
      });
    });

    describe('isValidPartyValidationResult', () => {
      test('should validate correct party validation result', () => {
        const validResult: PartyValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          availableCharacters: ['char_001', 'char_002', 'char_003'],
          lostCharacters: [],
          totalAvailable: 3,
        };

        expect(CharacterLossTypeValidators.isValidPartyValidationResult(validResult)).toBe(true);
      });

      test('should validate party validation result with errors', () => {
        const resultWithErrors: PartyValidationResult = {
          isValid: false,
          errors: [
            {
              type: 'lost_character',
              characterId: 'char_001',
              message: 'Character is lost',
              severity: 'error',
            },
          ],
          warnings: [
            {
              type: 'low_level',
              message: 'Party level is low',
              severity: 'medium',
            },
          ],
          availableCharacters: ['char_002', 'char_003'],
          lostCharacters: [
            {
              characterId: 'char_001',
              name: 'Hero',
              lostAt: Date.now(),
              turn: 5,
              cause: {
                type: LossCauseType.BATTLE_DEFEAT,
                description: 'Defeated in battle',
                timestamp: Date.now(),
              },
              level: 10,
              wasRecruited: false,
            },
          ],
          totalAvailable: 2,
        };

        expect(CharacterLossTypeValidators.isValidPartyValidationResult(resultWithErrors)).toBe(
          true
        );
      });
    });

    describe('enum validators', () => {
      test('should validate danger level enum values', () => {
        expect(CharacterLossTypeValidators.isValidDangerLevel(DangerLevel.NONE)).toBe(true);
        expect(CharacterLossTypeValidators.isValidDangerLevel(DangerLevel.CRITICAL)).toBe(true);
        expect(CharacterLossTypeValidators.isValidDangerLevel('invalid')).toBe(false);
      });

      test('should validate loss cause type enum values', () => {
        expect(CharacterLossTypeValidators.isValidLossCauseType(LossCauseType.BATTLE_DEFEAT)).toBe(
          true
        );
        expect(CharacterLossTypeValidators.isValidLossCauseType(LossCauseType.STATUS_EFFECT)).toBe(
          true
        );
        expect(CharacterLossTypeValidators.isValidLossCauseType('invalid')).toBe(false);
      });

      test('should validate status effect type enum values', () => {
        expect(CharacterLossTypeValidators.isValidStatusEffectType(StatusEffectType.POISON)).toBe(
          true
        );
        expect(CharacterLossTypeValidators.isValidStatusEffectType(StatusEffectType.BURN)).toBe(
          true
        );
        expect(CharacterLossTypeValidators.isValidStatusEffectType('invalid')).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('calculateDangerLevel', () => {
      test('should return CRITICAL for 0 HP', () => {
        expect(CharacterLossUtils.calculateDangerLevel(0, 100)).toBe(DangerLevel.CRITICAL);
      });

      test('should return CRITICAL for HP <= 25%', () => {
        expect(CharacterLossUtils.calculateDangerLevel(25, 100)).toBe(DangerLevel.CRITICAL);
        expect(CharacterLossUtils.calculateDangerLevel(10, 100)).toBe(DangerLevel.CRITICAL);
      });

      test('should return HIGH for HP <= 50%', () => {
        expect(CharacterLossUtils.calculateDangerLevel(50, 100)).toBe(DangerLevel.HIGH);
        expect(CharacterLossUtils.calculateDangerLevel(30, 100)).toBe(DangerLevel.HIGH);
      });

      test('should return MEDIUM for HP <= 75%', () => {
        expect(CharacterLossUtils.calculateDangerLevel(75, 100)).toBe(DangerLevel.MEDIUM);
        expect(CharacterLossUtils.calculateDangerLevel(60, 100)).toBe(DangerLevel.MEDIUM);
      });

      test('should return LOW for HP <= 90%', () => {
        expect(CharacterLossUtils.calculateDangerLevel(90, 100)).toBe(DangerLevel.LOW);
        expect(CharacterLossUtils.calculateDangerLevel(80, 100)).toBe(DangerLevel.LOW);
      });

      test('should return NONE for HP > 90%', () => {
        expect(CharacterLossUtils.calculateDangerLevel(95, 100)).toBe(DangerLevel.NONE);
        expect(CharacterLossUtils.calculateDangerLevel(100, 100)).toBe(DangerLevel.NONE);
      });
    });

    describe('createBattleDefeatCause', () => {
      test('should create correct battle defeat cause', () => {
        const cause = CharacterLossUtils.createBattleDefeatCause('enemy_001', 'Orc Warrior', 50);

        expect(cause.type).toBe(LossCauseType.BATTLE_DEFEAT);
        expect(cause.sourceId).toBe('enemy_001');
        expect(cause.sourceName).toBe('Orc Warrior');
        expect(cause.damageAmount).toBe(50);
        expect(cause.description).toBe('Orc Warriorの攻撃により撃破');
        expect(cause.timestamp).toBeGreaterThan(0);
      });
    });

    describe('createStatusEffectCause', () => {
      test('should create correct status effect cause', () => {
        const cause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.POISON, 20);

        expect(cause.type).toBe(LossCauseType.STATUS_EFFECT);
        expect(cause.statusType).toBe(StatusEffectType.POISON);
        expect(cause.damageAmount).toBe(20);
        expect(cause.description).toBe('毒により撃破');
        expect(cause.timestamp).toBeGreaterThan(0);
      });

      test('should create correct causes for all status types', () => {
        const burnCause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.BURN, 15);
        expect(burnCause.description).toBe('火傷により撃破');

        const freezeCause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.FREEZE, 10);
        expect(freezeCause.description).toBe('凍結により撃破');

        const curseCause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.CURSE, 25);
        expect(curseCause.description).toBe('呪いにより撃破');

        const drainCause = CharacterLossUtils.createStatusEffectCause(StatusEffectType.DRAIN, 30);
        expect(drainCause.description).toBe('吸収により撃破');
      });
    });

    describe('createCriticalDamageCause', () => {
      test('should create correct critical damage cause', () => {
        const cause = CharacterLossUtils.createCriticalDamageCause('enemy_002', 'Dragon', 100);

        expect(cause.type).toBe(LossCauseType.CRITICAL_DAMAGE);
        expect(cause.sourceId).toBe('enemy_002');
        expect(cause.sourceName).toBe('Dragon');
        expect(cause.damageAmount).toBe(100);
        expect(cause.description).toBe('Dragonのクリティカル攻撃により撃破');
        expect(cause.timestamp).toBeGreaterThan(0);
      });
    });

    describe('generateLossRecordId', () => {
      test('should generate unique loss record ID', () => {
        const timestamp = Date.now();
        const id = CharacterLossUtils.generateLossRecordId('char_001', 'chapter_001', timestamp);

        expect(id).toBe(`loss_char_001_chapter_001_${timestamp}`);
      });

      test('should generate different IDs for different inputs', () => {
        const timestamp = Date.now();
        const id1 = CharacterLossUtils.generateLossRecordId('char_001', 'chapter_001', timestamp);
        const id2 = CharacterLossUtils.generateLossRecordId('char_002', 'chapter_001', timestamp);
        const id3 = CharacterLossUtils.generateLossRecordId('char_001', 'chapter_002', timestamp);

        expect(id1).not.toBe(id2);
        expect(id1).not.toBe(id3);
        expect(id2).not.toBe(id3);
      });
    });

    describe('formatLossCauseDescription', () => {
      test('should format battle defeat cause', () => {
        const cause: LossCause = {
          type: LossCauseType.BATTLE_DEFEAT,
          sourceName: 'Orc Warrior',
          description: 'Original description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe(
          'Orc Warriorの攻撃により撃破'
        );
      });

      test('should format critical damage cause', () => {
        const cause: LossCause = {
          type: LossCauseType.CRITICAL_DAMAGE,
          sourceName: 'Dragon',
          description: 'Original description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe(
          'Dragonのクリティカル攻撃により撃破'
        );
      });

      test('should format status effect cause', () => {
        const cause: LossCause = {
          type: LossCauseType.STATUS_EFFECT,
          statusType: StatusEffectType.POISON,
          description: 'Original description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe(
          '状態異常（poison）により撃破'
        );
      });

      test('should format environmental cause', () => {
        const cause: LossCause = {
          type: LossCauseType.ENVIRONMENTAL,
          description: 'Original description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe('環境ダメージにより撃破');
      });

      test('should format sacrifice cause', () => {
        const cause: LossCause = {
          type: LossCauseType.SACRIFICE,
          description: 'Original description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe('自己犠牲により撃破');
      });

      test('should fallback to original description for unknown cause', () => {
        const cause: LossCause = {
          type: 'unknown' as LossCauseType,
          description: 'Custom description',
          timestamp: Date.now(),
        };

        expect(CharacterLossUtils.formatLossCauseDescription(cause)).toBe('Custom description');
      });
    });

    describe('calculateChapterStats', () => {
      test('should calculate correct stats for perfect clear', () => {
        const summary: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'Test Chapter',
          totalCharacters: 6,
          lostCharacters: [],
          survivedCharacters: [
            'char_001',
            'char_002',
            'char_003',
            'char_004',
            'char_005',
            'char_006',
          ],
          chapterDuration: 1800000, // 30 minutes
          totalTurns: 30,
          isPerfectClear: true,
          completedAt: Date.now(),
        };

        const stats = CharacterLossUtils.calculateChapterStats(summary);

        expect(stats.survivalRate).toBe(100);
        expect(stats.lossRate).toBe(0);
        expect(stats.averageTurnDuration).toBe(60000); // 1 minute per turn
      });

      test('should calculate correct stats with losses', () => {
        const lostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
        };

        const summary: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'Test Chapter',
          totalCharacters: 6,
          lostCharacters: [lostCharacter],
          survivedCharacters: ['char_002', 'char_003', 'char_004', 'char_005', 'char_006'],
          chapterDuration: 2400000, // 40 minutes
          totalTurns: 40,
          isPerfectClear: false,
          completedAt: Date.now(),
        };

        const stats = CharacterLossUtils.calculateChapterStats(summary);

        expect(stats.survivalRate).toBe(83.33); // 5/6 * 100
        expect(stats.lossRate).toBe(16.67); // 1/6 * 100
        expect(stats.averageTurnDuration).toBe(60000); // 1 minute per turn
      });

      test('should handle edge cases', () => {
        const summary: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'Test Chapter',
          totalCharacters: 0,
          lostCharacters: [],
          survivedCharacters: [],
          chapterDuration: 0,
          totalTurns: 0,
          isPerfectClear: true,
          completedAt: Date.now(),
        };

        const stats = CharacterLossUtils.calculateChapterStats(summary);

        expect(stats.survivalRate).toBe(100);
        expect(stats.lossRate).toBe(0);
        expect(stats.averageTurnDuration).toBe(0);
      });
    });

    describe('cloning functions', () => {
      test('should deep clone lost character', () => {
        const original: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            sourceName: 'Orc',
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
          position: { x: 5, y: 3 },
        };

        const cloned = CharacterLossUtils.cloneLostCharacter(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.cause).not.toBe(original.cause);
        expect(cloned.position).not.toBe(original.position);
      });

      test('should deep clone chapter loss summary', () => {
        const lostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
        };

        const original: ChapterLossSummary = {
          chapterId: 'chapter_001',
          chapterName: 'Test Chapter',
          totalCharacters: 6,
          lostCharacters: [lostCharacter],
          survivedCharacters: ['char_002', 'char_003'],
          chapterDuration: 1800000,
          totalTurns: 30,
          isPerfectClear: false,
          completedAt: Date.now(),
        };

        const cloned = CharacterLossUtils.cloneChapterLossSummary(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.lostCharacters).not.toBe(original.lostCharacters);
        expect(cloned.survivedCharacters).not.toBe(original.survivedCharacters);
        expect(cloned.lostCharacters[0]).not.toBe(original.lostCharacters[0]);
      });
    });
  });

  describe('Data Structure Integrity', () => {
    test('should maintain data consistency in serialization structures', () => {
      // Test that ChapterLossData can properly contain all necessary information
      const lostCharacter: LostCharacter = {
        characterId: 'char_001',
        name: 'Hero',
        lostAt: Date.now(),
        turn: 5,
        cause: {
          type: LossCauseType.BATTLE_DEFEAT,
          description: 'Defeated in battle',
          timestamp: Date.now(),
        },
        level: 10,
        wasRecruited: false,
      };

      const lossRecord: LossRecord = {
        ...lostCharacter,
        chapterId: 'chapter_001',
        stageId: 'stage_001',
        recoverable: false,
      };

      const chapterLossData: ChapterLossData = {
        chapterId: 'chapter_001',
        lostCharacters: { char_001: lostCharacter },
        lossHistory: [lossRecord],
        chapterStartTime: Date.now() - 1800000,
        version: '1.0.0',
      };

      expect(CharacterLossTypeValidators.isValidChapterLossData(chapterLossData)).toBe(true);
    });

    test('should validate complex party validation scenarios', () => {
      const lostCharacter: LostCharacter = {
        characterId: 'char_001',
        name: 'Hero',
        lostAt: Date.now(),
        turn: 5,
        cause: {
          type: LossCauseType.BATTLE_DEFEAT,
          description: 'Defeated in battle',
          timestamp: Date.now(),
        },
        level: 10,
        wasRecruited: false,
      };

      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'char_001',
            message: 'Character is lost and cannot be used',
            severity: 'error',
          },
          {
            type: 'insufficient_members',
            message: 'Not enough available characters for party',
            severity: 'error',
          },
        ],
        warnings: [
          {
            type: 'unbalanced_party',
            message: 'Party lacks defensive characters',
            severity: 'medium',
          },
        ],
        availableCharacters: ['char_002', 'char_003'],
        lostCharacters: [lostCharacter],
        totalAvailable: 2,
      };

      expect(CharacterLossTypeValidators.isValidPartyValidationResult(validationResult)).toBe(true);
    });

    describe('serialization functions', () => {
      test('should serialize and deserialize chapter loss data', () => {
        const lostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
        };

        const lossRecord: LossRecord = {
          ...lostCharacter,
          chapterId: 'chapter_001',
          stageId: 'stage_001',
          recoverable: false,
        };

        const originalData: ChapterLossData = {
          chapterId: 'chapter_001',
          lostCharacters: { char_001: lostCharacter },
          lossHistory: [lossRecord],
          chapterStartTime: Date.now() - 1800000,
          version: '1.0.0',
        };

        const serialized = CharacterLossUtils.serializeChapterLossData(originalData);
        const deserialized = CharacterLossUtils.deserializeChapterLossData(serialized);

        expect(deserialized).toEqual(originalData);
      });

      test('should handle serialization errors gracefully', () => {
        const invalidData = {
          chapterId: 'test',
          lostCharacters: { circular: null as any },
          lossHistory: [],
          chapterStartTime: Date.now(),
          version: '1.0.0',
        };

        // Create circular reference
        invalidData.lostCharacters.circular = invalidData;

        expect(() => {
          CharacterLossUtils.serializeChapterLossData(invalidData as ChapterLossData);
        }).toThrow('Failed to serialize chapter loss data');
      });

      test('should handle deserialization errors gracefully', () => {
        const invalidJson = '{ invalid json }';

        expect(() => {
          CharacterLossUtils.deserializeChapterLossData(invalidJson);
        }).toThrow('Failed to deserialize chapter loss data');
      });

      test('should create default chapter loss data', () => {
        const defaultData = CharacterLossUtils.createDefaultChapterLossData('chapter_001');

        expect(defaultData.chapterId).toBe('chapter_001');
        expect(defaultData.lostCharacters).toEqual({});
        expect(defaultData.lossHistory).toEqual([]);
        expect(defaultData.chapterStartTime).toBeGreaterThan(0);
        expect(defaultData.version).toBe('1.0.0');
      });

      test('should merge chapter loss data correctly', () => {
        const baseData = CharacterLossUtils.createDefaultChapterLossData('chapter_001');

        const lostCharacter: LostCharacter = {
          characterId: 'char_001',
          name: 'Hero',
          lostAt: Date.now(),
          turn: 5,
          cause: {
            type: LossCauseType.BATTLE_DEFEAT,
            description: 'Defeated in battle',
            timestamp: Date.now(),
          },
          level: 10,
          wasRecruited: false,
        };

        const updateData: Partial<ChapterLossData> = {
          lostCharacters: { char_001: lostCharacter },
          lossHistory: [
            {
              ...lostCharacter,
              chapterId: 'chapter_001',
              stageId: 'stage_001',
              recoverable: false,
            },
          ],
        };

        const merged = CharacterLossUtils.mergeChapterLossData(baseData, updateData);

        expect(merged.chapterId).toBe('chapter_001');
        expect(merged.lostCharacters['char_001']).toEqual(lostCharacter);
        expect(merged.lossHistory).toHaveLength(1);
      });

      test('should sanitize invalid chapter loss data', () => {
        const invalidData = {
          chapterId: 'chapter_001',
          lostCharacters: {
            valid_char: {
              characterId: 'valid_char',
              name: 'Valid Character',
              lostAt: Date.now(),
              turn: 5,
              cause: {
                type: LossCauseType.BATTLE_DEFEAT,
                description: 'Defeated in battle',
                timestamp: Date.now(),
              },
              level: 10,
              wasRecruited: false,
            },
            invalid_char: {
              characterId: 'invalid_char',
              // missing required fields
            },
          },
          lossHistory: [
            {
              characterId: 'valid_record',
              name: 'Valid Record',
              lostAt: Date.now(),
              turn: 5,
              cause: {
                type: LossCauseType.BATTLE_DEFEAT,
                description: 'Defeated in battle',
                timestamp: Date.now(),
              },
              level: 10,
              wasRecruited: false,
              chapterId: 'chapter_001',
              stageId: 'stage_001',
              recoverable: false,
            },
            {
              characterId: 'invalid_record',
              // missing required fields
            },
          ],
          chapterStartTime: Date.now(),
          version: '1.0.0',
        };

        const sanitized = CharacterLossUtils.sanitizeChapterLossData(invalidData);

        expect(sanitized.chapterId).toBe('chapter_001');
        expect(Object.keys(sanitized.lostCharacters)).toHaveLength(1);
        expect(sanitized.lostCharacters['valid_char']).toBeDefined();
        expect(sanitized.lostCharacters['invalid_char']).toBeUndefined();
        expect(sanitized.lossHistory).toHaveLength(1);
        expect(sanitized.lossHistory[0].characterId).toBe('valid_record');
      });

      test('should return default data for completely invalid input', () => {
        const completelyInvalid = { not: 'valid', at: 'all' };

        const sanitized = CharacterLossUtils.sanitizeChapterLossData(completelyInvalid);

        expect(sanitized.chapterId).toBe('unknown');
        expect(sanitized.lostCharacters).toEqual({});
        expect(sanitized.lossHistory).toEqual([]);
        expect(sanitized.version).toBe('1.0.0');
      });
    });
  });
});
