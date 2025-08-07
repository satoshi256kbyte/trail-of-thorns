/**
 * Unit tests for recruitment system type definitions
 * Tests type validators, utility functions, and data structure integrity
 */

import {
  RecruitmentStatus,
  RecruitmentAction,
  RecruitmentError,
  RecruitmentConditionType,
  RecruitmentCondition,
  RecruitmentContext,
  NPCState,
  NPCVisualState,
  RecruitmentResult,
  RecruitableCharacter,
  RecruitmentProgress,
  RecruitmentReward,
  RecruitmentTypeValidators,
  RecruitmentUtils,
} from '../../../game/src/types/recruitment';
import { Unit, Position } from '../../../game/src/types/gameplay';

describe('Recruitment Type Definitions', () => {
  // Mock data for testing
  const mockUnit: Unit = {
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentHP: 80,
    currentMP: 30,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    equipment: {},
  };

  const mockRecruitmentContext: RecruitmentContext = {
    attacker: { ...mockUnit, faction: 'player' },
    target: mockUnit,
    damage: 25,
    turn: 3,
    alliedUnits: [],
    enemyUnits: [mockUnit],
    npcUnits: [],
  };

  const mockNPCVisualState: NPCVisualState = {
    indicatorVisible: true,
    indicatorType: 'crown',
    tintColor: 0x00ff00,
    glowEffect: true,
    animationSpeed: 0.8,
  };

  const mockNPCState: NPCState = {
    convertedAt: 2,
    remainingHP: 45,
    isProtected: false,
    visualState: mockNPCVisualState,
    originalFaction: 'enemy',
    recruitmentId: 'recruitment_test_001',
  };

  const mockRecruitmentCondition: RecruitmentCondition = {
    id: 'test-condition',
    type: RecruitmentConditionType.HP_THRESHOLD,
    description: 'Target HP must be below 50%',
    parameters: { threshold: 0.5 },
    checkCondition: (context: RecruitmentContext) => {
      const hpPercentage = context.target.currentHP / context.target.stats.maxHP;
      return hpPercentage <= 0.5;
    },
  };

  describe('Enums', () => {
    test('RecruitmentStatus enum should have correct values', () => {
      expect(RecruitmentStatus.AVAILABLE).toBe('available');
      expect(RecruitmentStatus.CONDITIONS_MET).toBe('conditions_met');
      expect(RecruitmentStatus.NPC_STATE).toBe('npc_state');
      expect(RecruitmentStatus.RECRUITED).toBe('recruited');
      expect(RecruitmentStatus.FAILED).toBe('failed');
    });

    test('RecruitmentAction enum should have correct values', () => {
      expect(RecruitmentAction.CONTINUE_BATTLE).toBe('continue_battle');
      expect(RecruitmentAction.CONVERT_TO_NPC).toBe('convert_to_npc');
      expect(RecruitmentAction.RECRUITMENT_SUCCESS).toBe('recruitment_success');
      expect(RecruitmentAction.RECRUITMENT_FAILED).toBe('recruitment_failed');
    });

    test('RecruitmentError enum should have correct values', () => {
      expect(RecruitmentError.INVALID_TARGET).toBe('invalid_target');
      expect(RecruitmentError.CONDITIONS_NOT_MET).toBe('conditions_not_met');
      expect(RecruitmentError.NPC_ALREADY_DEFEATED).toBe('npc_already_defeated');
      expect(RecruitmentError.SYSTEM_ERROR).toBe('system_error');
    });

    test('RecruitmentConditionType enum should have correct values', () => {
      expect(RecruitmentConditionType.SPECIFIC_ATTACKER).toBe('specific_attacker');
      expect(RecruitmentConditionType.HP_THRESHOLD).toBe('hp_threshold');
      expect(RecruitmentConditionType.DAMAGE_TYPE).toBe('damage_type');
      expect(RecruitmentConditionType.TURN_LIMIT).toBe('turn_limit');
    });
  });

  describe('RecruitmentTypeValidators', () => {
    describe('isValidNPCVisualState', () => {
      test('should validate correct NPC visual state', () => {
        expect(RecruitmentTypeValidators.isValidNPCVisualState(mockNPCVisualState)).toBe(true);
      });

      test('should reject invalid indicator type', () => {
        const invalidState = { ...mockNPCVisualState, indicatorType: 'invalid' };
        expect(RecruitmentTypeValidators.isValidNPCVisualState(invalidState)).toBe(false);
      });

      test('should reject negative animation speed', () => {
        const invalidState = { ...mockNPCVisualState, animationSpeed: -1 };
        expect(RecruitmentTypeValidators.isValidNPCVisualState(invalidState)).toBe(false);
      });

      test('should reject missing required properties', () => {
        const invalidState = { ...mockNPCVisualState };
        delete (invalidState as any).indicatorVisible;
        expect(RecruitmentTypeValidators.isValidNPCVisualState(invalidState)).toBe(false);
      });
    });

    describe('isValidNPCState', () => {
      test('should validate correct NPC state', () => {
        expect(RecruitmentTypeValidators.isValidNPCState(mockNPCState)).toBe(true);
      });

      test('should reject negative convertedAt', () => {
        const invalidState = { ...mockNPCState, convertedAt: -1 };
        expect(RecruitmentTypeValidators.isValidNPCState(invalidState)).toBe(false);
      });

      test('should reject negative remainingHP', () => {
        const invalidState = { ...mockNPCState, remainingHP: -10 };
        expect(RecruitmentTypeValidators.isValidNPCState(invalidState)).toBe(false);
      });

      test('should reject invalid faction', () => {
        const invalidState = { ...mockNPCState, originalFaction: 'invalid' as any };
        expect(RecruitmentTypeValidators.isValidNPCState(invalidState)).toBe(false);
      });

      test('should reject invalid visual state', () => {
        const invalidState = { ...mockNPCState, visualState: { invalid: true } };
        expect(RecruitmentTypeValidators.isValidNPCState(invalidState)).toBe(false);
      });
    });

    describe('isValidRecruitmentCondition', () => {
      test('should validate correct recruitment condition', () => {
        expect(
          RecruitmentTypeValidators.isValidRecruitmentCondition(mockRecruitmentCondition)
        ).toBe(true);
      });

      test('should reject invalid condition type', () => {
        const invalidCondition = { ...mockRecruitmentCondition, type: 'invalid_type' };
        expect(RecruitmentTypeValidators.isValidRecruitmentCondition(invalidCondition)).toBe(false);
      });

      test('should reject missing checkCondition function', () => {
        const invalidCondition = { ...mockRecruitmentCondition };
        delete (invalidCondition as any).checkCondition;
        expect(RecruitmentTypeValidators.isValidRecruitmentCondition(invalidCondition)).toBe(false);
      });

      test('should reject null parameters', () => {
        const invalidCondition = { ...mockRecruitmentCondition, parameters: null };
        expect(RecruitmentTypeValidators.isValidRecruitmentCondition(invalidCondition)).toBe(false);
      });
    });

    describe('isValidRecruitmentContext', () => {
      test('should validate correct recruitment context', () => {
        expect(RecruitmentTypeValidators.isValidRecruitmentContext(mockRecruitmentContext)).toBe(
          true
        );
      });

      test('should reject negative damage', () => {
        const invalidContext = { ...mockRecruitmentContext, damage: -10 };
        expect(RecruitmentTypeValidators.isValidRecruitmentContext(invalidContext)).toBe(false);
      });

      test('should reject invalid turn number', () => {
        const invalidContext = { ...mockRecruitmentContext, turn: 0 };
        expect(RecruitmentTypeValidators.isValidRecruitmentContext(invalidContext)).toBe(false);
      });

      test('should reject missing unit arrays', () => {
        const invalidContext = { ...mockRecruitmentContext };
        delete (invalidContext as any).alliedUnits;
        expect(RecruitmentTypeValidators.isValidRecruitmentContext(invalidContext)).toBe(false);
      });
    });

    describe('isValidRecruitmentResult', () => {
      const mockResult: RecruitmentResult = {
        success: true,
        conditionsMet: [true, false, true],
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'Recruitment conditions partially met',
        npcState: mockNPCState,
      };

      test('should validate correct recruitment result', () => {
        expect(RecruitmentTypeValidators.isValidRecruitmentResult(mockResult)).toBe(true);
      });

      test('should reject invalid next action', () => {
        const invalidResult = { ...mockResult, nextAction: 'invalid_action' };
        expect(RecruitmentTypeValidators.isValidRecruitmentResult(invalidResult)).toBe(false);
      });

      test('should reject non-boolean conditions array', () => {
        const invalidResult = { ...mockResult, conditionsMet: [true, 'false', true] };
        expect(RecruitmentTypeValidators.isValidRecruitmentResult(invalidResult)).toBe(false);
      });

      test('should accept result without optional fields', () => {
        const minimalResult = {
          success: false,
          conditionsMet: [false],
          nextAction: RecruitmentAction.CONTINUE_BATTLE,
        };
        expect(RecruitmentTypeValidators.isValidRecruitmentResult(minimalResult)).toBe(true);
      });
    });

    describe('isValidRecruitableCharacter', () => {
      const mockCharacter: RecruitableCharacter = {
        characterId: 'enemy_knight_01',
        conditions: [mockRecruitmentCondition],
        recruitmentStatus: RecruitmentStatus.AVAILABLE,
        priority: 100,
        description: 'A recruitable knight',
      };

      test('should validate correct recruitable character', () => {
        expect(RecruitmentTypeValidators.isValidRecruitableCharacter(mockCharacter)).toBe(true);
      });

      test('should reject invalid recruitment status', () => {
        const invalidCharacter = { ...mockCharacter, recruitmentStatus: 'invalid_status' };
        expect(RecruitmentTypeValidators.isValidRecruitableCharacter(invalidCharacter)).toBe(false);
      });

      test('should reject invalid conditions array', () => {
        const invalidCharacter = { ...mockCharacter, conditions: [{ invalid: true }] };
        expect(RecruitmentTypeValidators.isValidRecruitableCharacter(invalidCharacter)).toBe(false);
      });

      test('should accept character with NPC state', () => {
        const characterWithNPC = { ...mockCharacter, npcState: mockNPCState };
        expect(RecruitmentTypeValidators.isValidRecruitableCharacter(characterWithNPC)).toBe(true);
      });
    });

    describe('isValidRecruitmentReward', () => {
      const mockReward: RecruitmentReward = {
        type: 'experience',
        amount: 100,
        target: 'recruiter',
        description: 'Experience points for successful recruitment',
      };

      test('should validate correct recruitment reward', () => {
        expect(RecruitmentTypeValidators.isValidRecruitmentReward(mockReward)).toBe(true);
      });

      test('should reject invalid reward type', () => {
        const invalidReward = { ...mockReward, type: 'invalid_type' };
        expect(RecruitmentTypeValidators.isValidRecruitmentReward(invalidReward)).toBe(false);
      });

      test('should reject negative amount', () => {
        const invalidReward = { ...mockReward, amount: -50 };
        expect(RecruitmentTypeValidators.isValidRecruitmentReward(invalidReward)).toBe(false);
      });

      test('should accept reward without target', () => {
        const rewardWithoutTarget = { ...mockReward };
        delete (rewardWithoutTarget as any).target;
        expect(RecruitmentTypeValidators.isValidRecruitmentReward(rewardWithoutTarget)).toBe(true);
      });
    });

    describe('isValidRecruitmentProgress', () => {
      const mockProgress: RecruitmentProgress = {
        characterId: 'enemy_knight_01',
        conditions: [mockRecruitmentCondition],
        conditionProgress: [true],
        overallProgress: 100,
        isEligible: true,
        attemptsRemaining: 1,
      };

      test('should validate correct recruitment progress', () => {
        expect(RecruitmentTypeValidators.isValidRecruitmentProgress(mockProgress)).toBe(true);
      });

      test('should reject mismatched conditions and progress arrays', () => {
        const invalidProgress = {
          ...mockProgress,
          conditionProgress: [true, false], // More progress than conditions
        };
        expect(RecruitmentTypeValidators.isValidRecruitmentProgress(invalidProgress)).toBe(false);
      });

      test('should reject invalid progress percentage', () => {
        const invalidProgress = { ...mockProgress, overallProgress: 150 };
        expect(RecruitmentTypeValidators.isValidRecruitmentProgress(invalidProgress)).toBe(false);
      });

      test('should reject negative attempts remaining', () => {
        const invalidProgress = { ...mockProgress, attemptsRemaining: -1 };
        expect(RecruitmentTypeValidators.isValidRecruitmentProgress(invalidProgress)).toBe(false);
      });
    });
  });

  describe('RecruitmentUtils', () => {
    describe('calculateProgress', () => {
      test('should calculate correct progress percentage', () => {
        expect(RecruitmentUtils.calculateProgress([true, true, false])).toBe(67);
        expect(RecruitmentUtils.calculateProgress([true, true, true])).toBe(100);
        expect(RecruitmentUtils.calculateProgress([false, false, false])).toBe(0);
      });

      test('should return 0 for empty conditions array', () => {
        expect(RecruitmentUtils.calculateProgress([])).toBe(0);
      });

      test('should handle single condition', () => {
        expect(RecruitmentUtils.calculateProgress([true])).toBe(100);
        expect(RecruitmentUtils.calculateProgress([false])).toBe(0);
      });
    });

    describe('areAllConditionsMet', () => {
      test('should return true when all conditions are met', () => {
        expect(RecruitmentUtils.areAllConditionsMet([true, true, true])).toBe(true);
      });

      test('should return false when some conditions are not met', () => {
        expect(RecruitmentUtils.areAllConditionsMet([true, false, true])).toBe(false);
      });

      test('should return false for empty conditions array', () => {
        expect(RecruitmentUtils.areAllConditionsMet([])).toBe(false);
      });

      test('should handle single condition', () => {
        expect(RecruitmentUtils.areAllConditionsMet([true])).toBe(true);
        expect(RecruitmentUtils.areAllConditionsMet([false])).toBe(false);
      });
    });

    describe('generateRecruitmentId', () => {
      test('should generate unique IDs', async () => {
        const id1 = RecruitmentUtils.generateRecruitmentId('char1', 'stage1');
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
        const id2 = RecruitmentUtils.generateRecruitmentId('char1', 'stage1');

        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^recruitment_char1_stage1_\d+_\d+$/);
        expect(id2).toMatch(/^recruitment_char1_stage1_\d+_\d+$/);
      });

      test('should include character and stage IDs', () => {
        const id = RecruitmentUtils.generateRecruitmentId('knight', 'forest_battle');
        expect(id).toContain('knight');
        expect(id).toContain('forest_battle');
      });
    });

    describe('createDefaultNPCVisualState', () => {
      test('should create valid default visual state', () => {
        const visualState = RecruitmentUtils.createDefaultNPCVisualState();

        expect(RecruitmentTypeValidators.isValidNPCVisualState(visualState)).toBe(true);
        expect(visualState.indicatorVisible).toBe(true);
        expect(visualState.indicatorType).toBe('crown');
        expect(visualState.tintColor).toBe(0x00ff00);
        expect(visualState.glowEffect).toBe(true);
        expect(visualState.animationSpeed).toBe(0.8);
      });
    });

    describe('createDefaultUIConfig', () => {
      test('should create valid default UI config', () => {
        const config = RecruitmentUtils.createDefaultUIConfig();

        expect(config.showConditions).toBe(true);
        expect(config.showProgress).toBe(true);
        expect(config.conditionDisplayDuration).toBe(3000);
        expect(config.successAnimationDuration).toBe(2000);
        expect(config.failureAnimationDuration).toBe(1500);
        expect(config.npcIndicatorScale).toBe(1.2);
        expect(config.enableSoundEffects).toBe(true);
      });
    });

    describe('createDefaultSystemConfig', () => {
      test('should create valid default system config', () => {
        const config = RecruitmentUtils.createDefaultSystemConfig();

        expect(config.enableRecruitment).toBe(true);
        expect(config.maxNPCsPerStage).toBe(3);
        expect(config.npcProtectionPriority).toBe(90);
        expect(config.autoShowConditions).toBe(true);
        expect(config.conditionHintLevel).toBe('basic');
        expect(config.allowMultipleAttempts).toBe(false);
        expect(config.npcSurvivalBonus).toBe(50);
      });
    });

    describe('cloneRecruitmentResult', () => {
      test('should create deep copy of recruitment result', () => {
        const original: RecruitmentResult = {
          success: true,
          conditionsMet: [true, false],
          nextAction: RecruitmentAction.CONVERT_TO_NPC,
          message: 'Test message',
          npcState: mockNPCState,
        };

        const cloned = RecruitmentUtils.cloneRecruitmentResult(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.conditionsMet).not.toBe(original.conditionsMet);
        expect(cloned.npcState).not.toBe(original.npcState);
      });

      test('should handle result without NPC state', () => {
        const original: RecruitmentResult = {
          success: false,
          conditionsMet: [false],
          nextAction: RecruitmentAction.CONTINUE_BATTLE,
        };

        const cloned = RecruitmentUtils.cloneRecruitmentResult(original);

        expect(cloned).toEqual(original);
        expect(cloned.npcState).toBeUndefined();
      });
    });

    describe('createErrorDetails', () => {
      test('should create valid error details', () => {
        const errorDetails = RecruitmentUtils.createErrorDetails(
          RecruitmentError.CONDITIONS_NOT_MET,
          'Conditions not satisfied',
          mockRecruitmentContext,
          true,
          'Try different approach'
        );

        expect(errorDetails.error).toBe(RecruitmentError.CONDITIONS_NOT_MET);
        expect(errorDetails.message).toBe('Conditions not satisfied');
        expect(errorDetails.context).toBe(mockRecruitmentContext);
        expect(errorDetails.recoverable).toBe(true);
        expect(errorDetails.suggestedAction).toBe('Try different approach');
        expect(typeof errorDetails.timestamp).toBe('number');
      });

      test('should handle optional parameters', () => {
        const errorDetails = RecruitmentUtils.createErrorDetails(
          RecruitmentError.SYSTEM_ERROR,
          'System error occurred',
          mockRecruitmentContext
        );

        expect(errorDetails.recoverable).toBe(true); // default value
        expect(errorDetails.suggestedAction).toBeUndefined();
      });
    });

    describe('calculateNPCPriority', () => {
      test('should calculate base priority correctly', () => {
        const priority = RecruitmentUtils.calculateNPCPriority(mockNPCState, 100);
        expect(priority).toBeGreaterThanOrEqual(100);
        expect(priority).toBeLessThanOrEqual(200);
      });

      test('should use default base priority', () => {
        const priority = RecruitmentUtils.calculateNPCPriority(mockNPCState);
        expect(typeof priority).toBe('number');
        expect(priority).toBeGreaterThanOrEqual(100);
      });

      test('should cap priority at 200', () => {
        const highPriorityNPC: NPCState = {
          ...mockNPCState,
          convertedAt: Date.now(), // Very recent conversion
          remainingHP: 10, // Very low HP
        };

        const priority = RecruitmentUtils.calculateNPCPriority(highPriorityNPC, 150);
        expect(priority).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('Recruitment Condition Implementation', () => {
    test('HP threshold condition should work correctly', () => {
      // Test with HP below threshold
      const lowHPContext = {
        ...mockRecruitmentContext,
        target: { ...mockUnit, currentHP: 40 }, // 40% HP
      };
      expect(mockRecruitmentCondition.checkCondition(lowHPContext)).toBe(true);

      // Test with HP above threshold
      const highHPContext = {
        ...mockRecruitmentContext,
        target: { ...mockUnit, currentHP: 60 }, // 60% HP
      };
      expect(mockRecruitmentCondition.checkCondition(highHPContext)).toBe(false);
    });

    test('condition should handle edge cases', () => {
      // Test with exactly 50% HP
      const exactThresholdContext = {
        ...mockRecruitmentContext,
        target: { ...mockUnit, currentHP: 50 }, // Exactly 50% HP
      };
      expect(mockRecruitmentCondition.checkCondition(exactThresholdContext)).toBe(true);

      // Test with 0 HP
      const zeroHPContext = {
        ...mockRecruitmentContext,
        target: { ...mockUnit, currentHP: 0 },
      };
      expect(mockRecruitmentCondition.checkCondition(zeroHPContext)).toBe(true);
    });
  });
});
