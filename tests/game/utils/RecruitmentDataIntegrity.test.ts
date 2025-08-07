/**
 * Unit tests for recruitment data integrity checker and error handler
 */

import {
  RecruitmentDataIntegrityChecker,
  RecruitmentDataErrorHandler,
  IntegrityCheckResult,
} from '../../../game/src/utils/RecruitmentDataIntegrity';
import { CharacterData, StageData } from '../../../game/src/utils/DataLoader';
import { RecruitmentConditionType } from '../../../game/src/types/recruitment';
import { SchemaValidationError } from '../../../game/src/schemas/recruitmentSchema';

describe('RecruitmentDataIntegrityChecker', () => {
  let validCharacters: CharacterData[];
  let validStages: StageData[];

  beforeEach(() => {
    validCharacters = [
      {
        id: 'protagonist',
        name: '主人公',
        description: 'Test protagonist',
        faction: 'player',
        baseStats: {
          maxHP: 100,
          maxMP: 50,
          attack: 20,
          defense: 15,
          speed: 10,
          movement: 3,
        },
        jobClass: 'warrior',
        level: 1,
        isRecruitable: false,
        recruitmentData: null,
      },
      {
        id: 'enemy_knight',
        name: 'Enemy Knight',
        description: 'Test enemy knight',
        faction: 'enemy',
        baseStats: {
          maxHP: 80,
          maxMP: 30,
          attack: 18,
          defense: 20,
          speed: 8,
          movement: 2,
        },
        jobClass: 'knight',
        level: 2,
        isRecruitable: true,
        recruitmentData: {
          priority: 70,
          description: 'Test recruitment',
          conditions: [
            {
              id: 'test_condition',
              type: RecruitmentConditionType.SPECIFIC_ATTACKER,
              description: 'Must be attacked by protagonist',
              parameters: { attackerId: 'protagonist' },
              checkCondition: () => true,
            },
          ],
        },
      },
    ];

    validStages = [
      {
        id: 'stage-001',
        name: 'Test Stage',
        description: 'Test stage description',
        isUnlocked: true,
        difficulty: 1,
        order: 1,
        mapData: {
          width: 10,
          height: 8,
          tileset: 'test',
        },
        playerUnits: [
          {
            characterId: 'protagonist',
            startPosition: { x: 1, y: 4 },
          },
        ],
        enemyUnits: [
          {
            characterId: 'enemy_knight',
            startPosition: { x: 8, y: 4 },
          },
        ],
        recruitableCharacters: [
          {
            characterId: 'enemy_knight',
            isActive: true,
            stageSpecificConditions: [],
          },
        ],
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: 'Defeat all enemies',
          },
        ],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: 'All allies defeated',
          },
        ],
      },
    ];
  });

  describe('checkIntegrity', () => {
    test('should pass validation for valid data', async () => {
      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        validCharacters,
        validStages
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.type === 'CRITICAL' || e.type === 'ERROR')).toHaveLength(
        0
      );
      expect(result.summary.totalCharacters).toBe(2);
      expect(result.summary.recruitableCharacters).toBe(1);
      expect(result.summary.totalStages).toBe(1);
      expect(result.summary.stagesWithRecruitment).toBe(1);
    });

    test('should detect duplicate character IDs', async () => {
      const duplicateCharacters = [
        ...validCharacters,
        { ...validCharacters[0], name: 'Duplicate' },
      ];

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        duplicateCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_CHARACTER_ID')).toBe(true);
    });

    test('should detect missing recruitment data for recruitable character', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'enemy_knight' ? { ...char, recruitmentData: null } : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_RECRUITMENT_DATA')).toBe(true);
    });

    test('should detect inconsistent recruitment flag', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'enemy_knight' ? { ...char, isRecruitable: false } : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.warnings.some(w => w.code === 'INCONSISTENT_RECRUITMENT_FLAG')).toBe(true);
    });

    test('should detect duplicate stage IDs', async () => {
      const duplicateStages = [...validStages, { ...validStages[0], name: 'Duplicate Stage' }];

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        validCharacters,
        duplicateStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STAGE_ID')).toBe(true);
    });

    test('should detect invalid character references in stages', async () => {
      const invalidStages = validStages.map(stage => ({
        ...stage,
        playerUnits: [
          {
            characterId: 'nonexistent_character',
            startPosition: { x: 1, y: 4 },
          },
        ],
      }));

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        validCharacters,
        invalidStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PLAYER_UNIT_REFERENCE')).toBe(true);
    });

    test('should detect invalid recruitment condition parameters', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'enemy_knight' && char.recruitmentData
          ? {
              ...char,
              recruitmentData: {
                ...char.recruitmentData,
                conditions: [
                  {
                    id: 'invalid_condition',
                    type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                    description: 'Invalid condition',
                    parameters: { attackerId: 'nonexistent_character' },
                    checkCondition: () => true,
                  },
                ],
              },
            }
          : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ATTACKER_REFERENCE')).toBe(true);
    });

    test('should detect invalid character stats', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'protagonist'
          ? {
              ...char,
              baseStats: {
                ...char.baseStats,
                maxHP: -10, // Invalid HP
                attack: 0, // Invalid attack
              },
            }
          : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_HP')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_ATTACK')).toBe(true);
    });

    test('should detect position conflicts in stages', async () => {
      const invalidStages = validStages.map(stage => ({
        ...stage,
        playerUnits: [
          {
            characterId: 'protagonist',
            startPosition: { x: 5, y: 5 },
          },
        ],
        enemyUnits: [
          {
            characterId: 'enemy_knight',
            startPosition: { x: 5, y: 5 }, // Same position as player unit
          },
        ],
      }));

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        validCharacters,
        invalidStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'POSITION_CONFLICT')).toBe(true);
    });

    test('should detect out of bounds unit placement', async () => {
      const invalidStages = validStages.map(stage => ({
        ...stage,
        playerUnits: [
          {
            characterId: 'protagonist',
            startPosition: { x: 15, y: 15 }, // Out of bounds for 10x8 map
          },
        ],
      }));

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        validCharacters,
        invalidStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'OUT_OF_BOUNDS_PLACEMENT')).toBe(true);
    });

    test('should warn about game balance issues', async () => {
      // Create scenario with no recruitable characters
      const noRecruitableCharacters = validCharacters.map(char => ({
        ...char,
        isRecruitable: false,
        recruitmentData: null,
      }));

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        noRecruitableCharacters,
        validStages
      );

      expect(result.warnings.some(w => w.code === 'NO_RECRUITABLE_CHARACTERS')).toBe(true);
    });

    test('should validate HP threshold conditions', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'enemy_knight' && char.recruitmentData
          ? {
              ...char,
              recruitmentData: {
                ...char.recruitmentData,
                conditions: [
                  {
                    id: 'invalid_hp_condition',
                    type: RecruitmentConditionType.HP_THRESHOLD,
                    description: 'Invalid HP threshold',
                    parameters: { threshold: 1.5 }, // Invalid threshold > 1
                    checkCondition: () => true,
                  },
                ],
              },
            }
          : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_HP_THRESHOLD')).toBe(true);
    });

    test('should validate turn limit conditions', async () => {
      const invalidCharacters = validCharacters.map(char =>
        char.id === 'enemy_knight' && char.recruitmentData
          ? {
              ...char,
              recruitmentData: {
                ...char.recruitmentData,
                conditions: [
                  {
                    id: 'invalid_turn_condition',
                    type: RecruitmentConditionType.TURN_LIMIT,
                    description: 'Invalid turn limit',
                    parameters: { maxTurn: -1 }, // Invalid negative turn
                    checkCondition: () => true,
                  },
                ],
              },
            }
          : char
      );

      const result = await RecruitmentDataIntegrityChecker.checkIntegrity(
        invalidCharacters,
        validStages
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TURN_LIMIT')).toBe(true);
    });
  });
});

describe('RecruitmentDataErrorHandler', () => {
  describe('handleLoadingError', () => {
    test('should handle schema validation errors', () => {
      const schemaError = new SchemaValidationError('Invalid data format', 'characters[0].id');

      expect(() => {
        RecruitmentDataErrorHandler.handleLoadingError(schemaError, 'characters');
      }).toThrow('Invalid characters data format: Invalid data format');
    });

    test('should handle 404 errors', () => {
      const notFoundError = new Error('404 Not Found');

      expect(() => {
        RecruitmentDataErrorHandler.handleLoadingError(notFoundError, 'stages');
      }).toThrow('stages data file not found. Please ensure the data file exists.');
    });

    test('should handle network errors', () => {
      const networkError = new Error('Failed to fetch');

      expect(() => {
        RecruitmentDataErrorHandler.handleLoadingError(networkError, 'characters');
      }).toThrow('Network error loading characters data. Please check your connection.');
    });

    test('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');

      expect(() => {
        RecruitmentDataErrorHandler.handleLoadingError(genericError, 'stages');
      }).toThrow('Unexpected error loading stages data: Something went wrong');
    });
  });

  describe('handleIntegrityFailure', () => {
    test('should throw error for critical failures', () => {
      const result: IntegrityCheckResult = {
        isValid: false,
        errors: [
          {
            type: 'CRITICAL',
            code: 'CRITICAL_ERROR',
            message: 'Critical error occurred',
            context: {},
          },
        ],
        warnings: [],
        summary: {
          totalCharacters: 0,
          recruitableCharacters: 0,
          totalStages: 0,
          stagesWithRecruitment: 0,
          totalRecruitmentConditions: 0,
          criticalErrors: 1,
          errors: 0,
          warnings: 0,
        },
      };

      expect(() => {
        RecruitmentDataErrorHandler.handleIntegrityFailure(result);
      }).toThrow('Critical recruitment data errors prevent game from starting');
    });

    test('should not throw for warnings only', () => {
      const result: IntegrityCheckResult = {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: 'WARNING',
            message: 'Warning message',
            context: {},
          },
        ],
        summary: {
          totalCharacters: 1,
          recruitableCharacters: 0,
          totalStages: 1,
          stagesWithRecruitment: 0,
          totalRecruitmentConditions: 0,
          criticalErrors: 0,
          errors: 0,
          warnings: 1,
        },
      };

      expect(() => {
        RecruitmentDataErrorHandler.handleIntegrityFailure(result);
      }).not.toThrow();
    });
  });

  describe('createUserErrorMessage', () => {
    test('should create user-friendly message for invalid data format', () => {
      const error = new Error('Invalid characters data format: missing field');
      const message = RecruitmentDataErrorHandler.createUserErrorMessage(error);

      expect(message).toBe('ゲームデータの形式が正しくありません。開発者にお問い合わせください。');
    });

    test('should create user-friendly message for file not found', () => {
      const error = new Error('characters data file not found');
      const message = RecruitmentDataErrorHandler.createUserErrorMessage(error);

      expect(message).toBe(
        'ゲームデータファイルが見つかりません。ゲームを再インストールしてください。'
      );
    });

    test('should create user-friendly message for network errors', () => {
      const error = new Error('Network error loading data');
      const message = RecruitmentDataErrorHandler.createUserErrorMessage(error);

      expect(message).toBe(
        'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      );
    });

    test('should create user-friendly message for critical errors', () => {
      const error = new Error('Critical recruitment data errors prevent game');
      const message = RecruitmentDataErrorHandler.createUserErrorMessage(error);

      expect(message).toBe('ゲームデータに重大なエラーがあります。開発者にお問い合わせください。');
    });

    test('should create generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = RecruitmentDataErrorHandler.createUserErrorMessage(error);

      expect(message).toBe('ゲームデータの読み込み中にエラーが発生しました。');
    });
  });
});
