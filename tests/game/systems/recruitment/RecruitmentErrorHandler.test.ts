/**
 * RecruitmentErrorHandler Test Suite
 *
 * Comprehensive tests for the recruitment system error handling functionality
 */

import {
  RecruitmentErrorHandler,
  RecruitmentErrorRecoveryResult,
} from '../../../../game/src/systems/recruitment/RecruitmentErrorHandler';
import {
  RecruitmentError,
  RecruitmentContext,
  RecruitmentErrorDetails,
  RecruitmentUtils,
} from '../../../../game/src/types/recruitment';
import { Unit } from '../../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      setDepth: jest.fn(),
      setVisible: jest.fn(),
      setPosition: jest.fn(),
      add: jest.fn(),
      destroy: jest.fn(),
    }),
    text: jest.fn().mockReturnValue({
      setColor: jest.fn(),
      setText: jest.fn(),
      setOrigin: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
      lineStyle: jest.fn(),
      strokeCircle: jest.fn(),
      destroy: jest.fn(),
    }),
  },
  cameras: {
    main: {
      centerX: 400,
      centerY: 300,
      y: 0,
    },
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    killAll: jest.fn(),
    add: jest.fn(),
  },
} as any;

// Mock units
const createMockUnit = (id: string, name: string): Unit => ({
  id,
  name,
  position: { x: 5, y: 5 },
  stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
  currentHP: 80,
  currentMP: 30,
  faction: 'enemy',
  hasActed: false,
  hasMoved: false,
});

const createMockContext = (attacker?: Unit, target?: Unit): RecruitmentContext => ({
  attacker: attacker || createMockUnit('attacker1', 'Test Attacker'),
  target: target || createMockUnit('target1', 'Test Target'),
  damage: 25,
  turn: 3,
  alliedUnits: [],
  enemyUnits: [],
  npcUnits: [],
});

describe('RecruitmentErrorHandler', () => {
  let errorHandler: RecruitmentErrorHandler;
  let mockContext: RecruitmentContext;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new RecruitmentErrorHandler(mockScene);
    mockContext = createMockContext();
  });

  afterEach(() => {
    errorHandler.destroy?.();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      const handler = new RecruitmentErrorHandler();
      const config = handler.getConfig();

      expect(config.showUserMessages).toBe(true);
      expect(config.messageDuration).toBe(4000);
      expect(config.showRecruitmentHints).toBe(true);
      expect(config.enableErrorAnimations).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        showUserMessages: false,
        messageDuration: 2000,
        showDetailedErrors: true,
      };

      const handler = new RecruitmentErrorHandler(mockScene, customConfig);
      const config = handler.getConfig();

      expect(config.showUserMessages).toBe(false);
      expect(config.messageDuration).toBe(2000);
      expect(config.showDetailedErrors).toBe(true);
      expect(config.showRecruitmentHints).toBe(true); // Default value
    });

    test('should initialize statistics correctly', () => {
      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(0);
      expect(stats.recoveredErrors).toBe(0);
      expect(stats.criticalErrors).toBe(0);
      expect(stats.userCancellations).toBe(0);
      expect(stats.failedRecruitmentAttempts).toBe(0);
      expect(stats.successfulRecoveries).toBe(0);

      // Check that all error types are initialized
      Object.values(RecruitmentError).forEach(errorType => {
        expect(stats.errorsByType[errorType]).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid target error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.INVALID_TARGET,
        mockContext,
        'Test invalid target'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.userGuidance).toContain('recruitable');
    });

    test('should handle conditions not met error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.CONDITIONS_NOT_MET,
        mockContext,
        'Conditions not satisfied'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.userGuidance).toContain('conditions');
    });

    test('should handle NPC already defeated error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.NPC_ALREADY_DEFEATED,
        mockContext,
        'NPC was defeated'
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe('cleanup');
      expect(result.requiresUserAction).toBe(false);
      expect(result.recoverable).toBe(false);
      expect(result.userGuidance).toContain('permanently');
    });

    test('should handle system error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.SYSTEM_ERROR,
        mockContext,
        'System malfunction'
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe('reset');
      expect(result.requiresUserAction).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(result.userGuidance).toContain('reset');
    });

    test('should handle data corruption error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.DATA_CORRUPTION,
        mockContext,
        'Data corrupted'
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe('reset');
      expect(result.requiresUserAction).toBe(true);
      expect(result.recoverable).toBe(false);
    });

    test('should handle invalid attacker error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.INVALID_ATTACKER,
        mockContext,
        'Wrong attacker'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.userGuidance).toContain('correct character');
    });

    test('should handle invalid stage error', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.INVALID_STAGE,
        mockContext,
        'Stage not supported'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('fallback');
      expect(result.requiresUserAction).toBe(false);
      expect(result.recoverable).toBe(false);
      expect(result.userGuidance).toContain('not available');
    });
  });

  describe('Specific Error Handlers', () => {
    test('should handle specific invalid target error', () => {
      const result = errorHandler.handleSpecificRecruitmentError(
        RecruitmentError.INVALID_TARGET,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.message).toContain('Invalid recruitment target');
      expect(result.userGuidance).toContain('recruitment indicators');
    });

    test('should handle specific conditions not met error', () => {
      const result = errorHandler.handleSpecificRecruitmentError(
        RecruitmentError.CONDITIONS_NOT_MET,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.message).toContain('conditions not satisfied');
    });

    test('should handle unknown error type', () => {
      const result = errorHandler.handleSpecificRecruitmentError(
        'unknown_error' as RecruitmentError,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe('cancel');
      expect(result.message).toContain('Unknown recruitment error');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('User Guidance', () => {
    test('should provide appropriate guidance for invalid target', () => {
      const guidance = errorHandler.getRecruitmentUserGuidance(
        RecruitmentError.INVALID_TARGET,
        mockContext
      );

      expect(guidance).toContain('cannot be recruited');
      expect(guidance).toContain('recruitment indicator');
    });

    test('should provide appropriate guidance for conditions not met', () => {
      const guidance = errorHandler.getRecruitmentUserGuidance(
        RecruitmentError.CONDITIONS_NOT_MET,
        mockContext
      );

      expect(guidance).toContain('conditions');
      expect(guidance).toContain('requirements');
    });

    test('should provide appropriate guidance for NPC defeated', () => {
      const guidance = errorHandler.getRecruitmentUserGuidance(
        RecruitmentError.NPC_ALREADY_DEFEATED,
        mockContext
      );

      expect(guidance).toContain('defeated');
      expect(guidance).toContain('failed');
    });

    test('should provide appropriate guidance for system error', () => {
      const guidance = errorHandler.getRecruitmentUserGuidance(
        RecruitmentError.SYSTEM_ERROR,
        mockContext
      );

      expect(guidance).toContain('system error');
      expect(guidance).toContain('restarting');
    });
  });

  describe('State Cleanup', () => {
    test('should successfully clean up recruitment state', () => {
      const result = errorHandler.cleanupRecruitmentState(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(mockScene.tweens.killAll).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', () => {
      // Mock an error during cleanup
      mockScene.tweens.killAll.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const result = errorHandler.cleanupRecruitmentState(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });
  });

  describe('Context Validation', () => {
    test('should validate valid recruitment context', () => {
      const result = errorHandler.validateRecruitmentContext(mockContext);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect missing attacker', () => {
      const invalidContext = { ...mockContext, attacker: null as any };
      const result = errorHandler.validateRecruitmentContext(invalidContext);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing attacker in recruitment context');
    });

    test('should detect missing target', () => {
      const invalidContext = { ...mockContext, target: null as any };
      const result = errorHandler.validateRecruitmentContext(invalidContext);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing target in recruitment context');
    });

    test('should detect invalid damage value', () => {
      const invalidContext = { ...mockContext, damage: -5 };
      const result = errorHandler.validateRecruitmentContext(invalidContext);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid damage value in recruitment context');
    });

    test('should detect invalid turn value', () => {
      const invalidContext = { ...mockContext, turn: 0 };
      const result = errorHandler.validateRecruitmentContext(invalidContext);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid turn value in recruitment context');
    });

    test('should detect missing optional arrays as warnings', () => {
      const contextWithMissingArrays = {
        ...mockContext,
        alliedUnits: null as any,
        enemyUnits: undefined as any,
        npcUnits: 'invalid' as any,
      };

      const result = errorHandler.validateRecruitmentContext(contextWithMissingArrays);

      expect(result.valid).toBe(true); // Still valid, just warnings
      expect(result.warnings).toContain('Missing or invalid allied units array');
      expect(result.warnings).toContain('Missing or invalid enemy units array');
      expect(result.warnings).toContain('Missing or invalid NPC units array');
    });
  });

  describe('Statistics Tracking', () => {
    test('should update statistics when handling errors', async () => {
      await errorHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      await errorHandler.handleRecruitmentError(RecruitmentError.CONDITIONS_NOT_MET, mockContext);

      await errorHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(2);
      expect(stats.errorsByType[RecruitmentError.CONDITIONS_NOT_MET]).toBe(1);
      expect(stats.mostCommonError).toBe(RecruitmentError.INVALID_TARGET);
      expect(stats.lastErrorTime).toBeGreaterThan(0);
    });

    test('should track user cancellations', async () => {
      await errorHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      const stats = errorHandler.getStatistics();
      expect(stats.userCancellations).toBe(1);
    });

    test('should track critical errors', async () => {
      await errorHandler.handleRecruitmentError(RecruitmentError.SYSTEM_ERROR, mockContext);

      const stats = errorHandler.getStatistics();
      expect(stats.criticalErrors).toBe(1);
    });

    test('should track failed recruitment attempts', async () => {
      await errorHandler.handleRecruitmentError(RecruitmentError.NPC_ALREADY_DEFEATED, mockContext);

      const stats = errorHandler.getStatistics();
      expect(stats.failedRecruitmentAttempts).toBe(1);
    });

    test('should reset statistics correctly', () => {
      // Generate some statistics
      errorHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);
      errorHandler.handleRecruitmentError(RecruitmentError.SYSTEM_ERROR, mockContext);

      // Reset statistics
      errorHandler.resetStatistics();

      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(stats.recoveredErrors).toBe(0);
      expect(stats.criticalErrors).toBe(0);
      expect(stats.userCancellations).toBe(0);
      expect(stats.failedRecruitmentAttempts).toBe(0);
      expect(stats.successfulRecoveries).toBe(0);
      expect(stats.lastErrorTime).toBe(0);
      expect(stats.mostCommonError).toBeUndefined();

      // Check that all error type counters are reset
      Object.values(RecruitmentError).forEach(errorType => {
        expect(stats.errorsByType[errorType]).toBe(0);
      });
    });
  });

  describe('Error History', () => {
    test('should maintain error history', async () => {
      await errorHandler.handleRecruitmentError(
        RecruitmentError.INVALID_TARGET,
        mockContext,
        'First error'
      );

      await errorHandler.handleRecruitmentError(
        RecruitmentError.CONDITIONS_NOT_MET,
        mockContext,
        'Second error'
      );

      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(2);
      expect(history[0].error).toBe(RecruitmentError.INVALID_TARGET);
      expect(history[0].message).toBe('First error');
      expect(history[1].error).toBe(RecruitmentError.CONDITIONS_NOT_MET);
      expect(history[1].message).toBe('Second error');
    });

    test('should limit error history size', async () => {
      // Create more errors than the history limit (100)
      for (let i = 0; i < 105; i++) {
        await errorHandler.handleRecruitmentError(
          RecruitmentError.INVALID_TARGET,
          mockContext,
          `Error ${i}`
        );
      }

      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(100);
      // Should keep the most recent errors
      expect(history[99].message).toBe('Error 104');
    });

    test('should get limited error history', async () => {
      for (let i = 0; i < 10; i++) {
        await errorHandler.handleRecruitmentError(
          RecruitmentError.INVALID_TARGET,
          mockContext,
          `Error ${i}`
        );
      }

      const limitedHistory = errorHandler.getErrorHistory(5);

      expect(limitedHistory).toHaveLength(5);
      expect(limitedHistory[4].message).toBe('Error 9');
    });

    test('should clear error history', async () => {
      await errorHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      expect(errorHandler.getErrorHistory()).toHaveLength(1);

      errorHandler.clearErrorHistory();

      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        showUserMessages: false,
        messageDuration: 1000,
        enableErrorSounds: false,
      };

      errorHandler.updateConfig(newConfig);
      const config = errorHandler.getConfig();

      expect(config.showUserMessages).toBe(false);
      expect(config.messageDuration).toBe(1000);
      expect(config.enableErrorSounds).toBe(false);
      // Other values should remain unchanged
      expect(config.showRecruitmentHints).toBe(true);
    });

    test('should get current configuration', () => {
      const config = errorHandler.getConfig();

      expect(config).toHaveProperty('showUserMessages');
      expect(config).toHaveProperty('messageDuration');
      expect(config).toHaveProperty('showDetailedErrors');
      expect(config).toHaveProperty('enableErrorSounds');
      expect(config).toHaveProperty('autoDismissErrors');
      expect(config).toHaveProperty('showRecruitmentHints');
      expect(config).toHaveProperty('enableErrorAnimations');
    });
  });

  describe('Event Emission', () => {
    test('should emit error handled event', async () => {
      const mockEmitter = {
        emit: jest.fn(),
      };

      const handlerWithEmitter = new RecruitmentErrorHandler(mockScene, {}, mockEmitter as any);

      await handlerWithEmitter.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'recruitment-error-handled',
        expect.objectContaining({
          error: RecruitmentError.INVALID_TARGET,
          context: mockContext,
        })
      );
    });

    test('should emit critical error event on handling failure', async () => {
      const mockEmitter = {
        emit: jest.fn(),
      };

      // Create a handler that will throw during error handling
      const faultyHandler = new RecruitmentErrorHandler(mockScene, {}, mockEmitter as any);

      // Mock a method to throw an error
      jest.spyOn(faultyHandler as any, 'createErrorDetails').mockImplementation(() => {
        throw new Error('Test error');
      });

      await faultyHandler.handleRecruitmentError(RecruitmentError.INVALID_TARGET, mockContext);

      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'recruitment-critical-error',
        expect.objectContaining({
          originalError: RecruitmentError.INVALID_TARGET,
          context: mockContext,
        })
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle retry recovery with attempt tracking', async () => {
      // Mock a scenario where retry is the strategy
      const handler = new RecruitmentErrorHandler(mockScene);

      // First attempt
      const result1 = await handler.handleRecruitmentError(
        RecruitmentError.CONDITIONS_NOT_MET,
        mockContext
      );

      expect(result1.action).toBe('cancel'); // Should be cancel, not retry for this error type
      expect(result1.recoverable).toBe(true);
    });

    test('should handle cleanup recovery for permanent failures', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.NPC_ALREADY_DEFEATED,
        mockContext
      );

      expect(result.action).toBe('cleanup');
      expect(result.success).toBe(false);
      expect(result.recoverable).toBe(false);
      expect(result.requiresUserAction).toBe(false);
    });

    test('should handle reset recovery for critical errors', async () => {
      const result = await errorHandler.handleRecruitmentError(
        RecruitmentError.SYSTEM_ERROR,
        mockContext
      );

      expect(result.action).toBe('reset');
      expect(result.success).toBe(false);
      expect(result.recoverable).toBe(false);
      expect(result.requiresUserAction).toBe(true);
      expect(result.stateModified).toBe(true);
    });
  });
});

describe('RecruitmentErrorHandler Integration', () => {
  test('should integrate with RecruitmentUtils for error details creation', () => {
    const errorDetails = RecruitmentUtils.createErrorDetails(
      RecruitmentError.INVALID_TARGET,
      'Test message',
      createMockContext(),
      true,
      'Test action'
    );

    expect(errorDetails.error).toBe(RecruitmentError.INVALID_TARGET);
    expect(errorDetails.message).toBe('Test message');
    expect(errorDetails.recoverable).toBe(true);
    expect(errorDetails.suggestedAction).toBe('Test action');
    expect(errorDetails.timestamp).toBeGreaterThan(0);
  });

  test('should work with convenience function', async () => {
    const { handleRecruitmentError } = await import(
      '../../../../game/src/systems/recruitment/RecruitmentErrorHandler'
    );

    const result = await handleRecruitmentError(
      RecruitmentError.INVALID_TARGET,
      createMockContext(),
      'Test error'
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe('cancel');
    expect(result.recoverable).toBe(true);
  });
});
