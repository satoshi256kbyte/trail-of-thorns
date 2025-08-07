/**
 * Comprehensive test suite for BattleErrorHandler
 * Tests error detection, recovery mechanisms, user feedback, and state cleanup
 */

import {
  BattleErrorHandler,
  ErrorRecoveryResult,
} from '../../../game/src/systems/BattleErrorHandler';
import { BattleError, BattleContext, BattleErrorDetails } from '../../../game/src/types/battle';
import { Unit } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      setDepth: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setPosition: jest.fn().mockReturnThis(),
      add: jest.fn(),
      destroy: jest.fn(),
    }),
    text: jest.fn().mockReturnValue({
      setStyle: jest.fn().mockReturnThis(),
      setText: jest.fn(),
      width: 200,
      height: 50,
    }),
    graphics: jest.fn().mockReturnValue({
      fillStyle: jest.fn().mockReturnThis(),
      fillRoundedRect: jest.fn().mockReturnThis(),
    }),
  },
  cameras: {
    main: {
      centerX: 400,
      centerY: 300,
      x: 0,
      y: 0,
    },
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    killAll: jest.fn(),
  },
  sound: {
    get: jest.fn().mockReturnValue(true),
    play: jest.fn(),
  },
} as any;

// Mock units for testing
const createMockUnit = (id: string, overrides: Partial<Unit> = {}): Unit => ({
  id,
  name: `Unit ${id}`,
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
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  ...overrides,
});

describe('BattleErrorHandler', () => {
  let errorHandler: BattleErrorHandler;
  let mockAttacker: Unit;
  let mockTarget: Unit;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new BattleErrorHandler(mockScene);
    mockAttacker = createMockUnit('attacker');
    mockTarget = createMockUnit('target', { faction: 'enemy' });
  });

  afterEach(() => {
    errorHandler.destroy();
  });

  describe('Error Handling', () => {
    test('should handle invalid attacker error', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const result = await errorHandler.handleError(
        BattleError.INVALID_ATTACKER,
        context,
        'Attacker is defeated'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.userGuidance).toContain('Select a different unit');
    });

    test('should handle invalid target error', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'target_selection',
      };

      const result = await errorHandler.handleError(
        BattleError.INVALID_TARGET,
        context,
        'Target is not valid'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.userGuidance).toContain('Select a valid enemy target');
    });

    test('should handle out of range error', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'target_selection',
      };

      const result = await errorHandler.handleError(
        BattleError.OUT_OF_RANGE,
        context,
        'Target is too far away'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
      expect(result.userGuidance).toContain('Move closer');
    });

    test('should handle already acted error', async () => {
      const context: BattleContext = {
        attacker: { ...mockAttacker, hasActed: true },
        phase: 'range_calculation',
      };

      const result = await errorHandler.handleError(
        BattleError.ALREADY_ACTED,
        context,
        'Unit has already acted'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('fallback');
      expect(result.requiresUserAction).toBe(true);
      expect(result.userGuidance).toContain('Select a different unit');
    });

    test('should handle critical battle system error', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'battle_execution',
      };

      const result = await errorHandler.handleError(
        BattleError.BATTLE_SYSTEM_ERROR,
        context,
        'Critical system failure'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('reset');
      expect(result.requiresUserAction).toBe(true);
      expect(result.stateModified).toBe(true);
    });

    test('should handle animation failed error gracefully', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'animation',
      };

      const result = await errorHandler.handleError(
        BattleError.ANIMATION_FAILED,
        context,
        'Animation could not play'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('ignore');
      expect(result.requiresUserAction).toBe(false);
      expect(result.stateModified).toBe(false);
    });
  });

  describe('Specific Error Handlers', () => {
    test('should handle insufficient MP error', () => {
      const context: BattleContext = {
        attacker: { ...mockAttacker, currentMP: 0 },
        phase: 'target_selection',
      };

      const result = errorHandler.handleSpecificError(BattleError.INSUFFICIENT_MP, context);

      expect(result.action).toBe('fallback');
      expect(result.userGuidance).toContain('MP');
    });

    test('should handle weapon broken error', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const result = errorHandler.handleSpecificError(BattleError.WEAPON_BROKEN, context);

      expect(result.action).toBe('fallback');
      expect(result.userGuidance).toContain('weapon');
    });

    test('should handle no weapon equipped error', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const result = errorHandler.handleSpecificError(BattleError.NO_WEAPON_EQUIPPED, context);

      expect(result.action).toBe('fallback');
      expect(result.userGuidance).toContain('Equip a weapon');
    });

    test('should handle target unreachable error', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'target_selection',
      };

      const result = errorHandler.handleSpecificError(BattleError.TARGET_UNREACHABLE, context);

      expect(result.action).toBe('cancel');
      expect(result.userGuidance).toContain('different position');
    });
  });

  describe('User Guidance', () => {
    test('should provide appropriate guidance for each error type', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const errorTypes = Object.values(BattleError);

      errorTypes.forEach(errorType => {
        const guidance = errorHandler.getUserGuidance(errorType, context);
        expect(guidance).toBeTruthy();
        expect(typeof guidance).toBe('string');
        expect(guidance.length).toBeGreaterThan(10);
      });
    });

    test('should provide specific guidance for invalid attacker', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const guidance = errorHandler.getUserGuidance(BattleError.INVALID_ATTACKER, context);
      expect(guidance).toContain('Select a different unit');
    });

    test('should provide specific guidance for out of range', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'target_selection',
      };

      const guidance = errorHandler.getUserGuidance(BattleError.OUT_OF_RANGE, context);
      expect(guidance).toContain('Move closer');
    });
  });

  describe('State Cleanup', () => {
    test('should successfully clean up battle state', () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'battle_execution',
      };

      const result = errorHandler.cleanupBattleState(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('cleaned up successfully');
      expect(mockScene.tweens.killAll).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', () => {
      // Mock cleanup failure
      mockScene.tweens.killAll.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'battle_execution',
      };

      const result = errorHandler.cleanupBattleState(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cleanup failed');
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics correctly', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      // Generate several errors
      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);
      await errorHandler.handleError(BattleError.INVALID_TARGET, context);
      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[BattleError.INVALID_ATTACKER]).toBe(2);
      expect(stats.errorsByType[BattleError.INVALID_TARGET]).toBe(1);
      expect(stats.lastErrorTime).toBeGreaterThan(0);
    });

    test('should reset statistics correctly', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      errorHandler.resetStatistics();
      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType[BattleError.INVALID_ATTACKER]).toBe(0);
    });
  });

  describe('Error History', () => {
    test('should maintain error history', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context, 'Test error 1');
      await errorHandler.handleError(BattleError.INVALID_TARGET, context, 'Test error 2');

      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(2);
      expect(history[0].error).toBe(BattleError.INVALID_ATTACKER);
      expect(history[1].error).toBe(BattleError.INVALID_TARGET);
      expect(history[0].message).toBe('Test error 1');
      expect(history[1].message).toBe('Test error 2');
    });

    test('should limit error history size', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      // Generate more errors than the history limit
      for (let i = 0; i < 150; i++) {
        await errorHandler.handleError(BattleError.INVALID_ATTACKER, context, `Error ${i}`);
      }

      const history = errorHandler.getErrorHistory();

      expect(history.length).toBeLessThanOrEqual(100); // Default max history size
    });

    test('should clear error history', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      errorHandler.clearErrorHistory();
      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit error-handled event', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const eventSpy = jest.fn();
      errorHandler.on('error-handled', eventSpy);

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: BattleError.INVALID_ATTACKER,
          context,
          recoveryResult: expect.any(Object),
          errorDetails: expect.any(Object),
        })
      );
    });

    test('should emit critical-error event for handling failures', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      const eventSpy = jest.fn();
      errorHandler.on('critical-error', eventSpy);

      // Mock a failure in error handling
      const originalMethod = errorHandler['createErrorDetails'];
      errorHandler['createErrorDetails'] = jest.fn().mockImplementation(() => {
        throw new Error('Handling failed');
      });

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      expect(eventSpy).toHaveBeenCalled();

      // Restore original method
      errorHandler['createErrorDetails'] = originalMethod;
    });
  });

  describe('User Feedback Interface', () => {
    test('should show error messages with correct styling', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    test('should position error messages correctly', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'range_calculation',
      };

      await errorHandler.handleError(BattleError.INVALID_ATTACKER, context);

      const containerMock = mockScene.add.container();
      expect(containerMock.setPosition).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Configuration', () => {
    test('should respect configuration settings', () => {
      const customConfig = {
        showUserMessages: false,
        messageDuration: 5000,
        enableErrorSounds: false,
      };

      const customErrorHandler = new BattleErrorHandler(mockScene, customConfig);

      // Test that configuration is applied
      expect(customErrorHandler['config'].showUserMessages).toBe(false);
      expect(customErrorHandler['config'].messageDuration).toBe(5000);
      expect(customErrorHandler['config'].enableErrorSounds).toBe(false);

      customErrorHandler.destroy();
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle retry recovery correctly', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'target_selection',
      };

      const result = await errorHandler.handleError(BattleError.INVALID_TARGET, context);

      expect(result.action).toBe('cancel');
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle reset recovery for critical errors', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        phase: 'battle_execution',
      };

      const result = await errorHandler.handleError(BattleError.BATTLE_SYSTEM_ERROR, context);

      expect(result.action).toBe('reset');
      expect(result.stateModified).toBe(true);
    });

    test('should handle ignore recovery for non-critical errors', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        phase: 'animation',
      };

      const result = await errorHandler.handleError(BattleError.ANIMATION_FAILED, context);

      expect(result.action).toBe('ignore');
      expect(result.requiresUserAction).toBe(false);
      expect(result.stateModified).toBe(false);
    });
  });

  describe('Integration with Battle System', () => {
    test('should provide comprehensive error details', async () => {
      const context: BattleContext = {
        attacker: mockAttacker,
        target: mockTarget,
        weapon: {
          id: 'test-sword',
          name: 'Test Sword',
          type: 'sword' as any,
          attackPower: 10,
          range: 1,
          rangePattern: { type: 'single', range: 1, pattern: [] },
          element: 'none' as any,
          criticalRate: 10,
          accuracy: 90,
          specialEffects: [],
          description: 'Test weapon',
        },
        phase: 'damage_calculation',
      };

      const result = await errorHandler.handleError(
        BattleError.DAMAGE_CALCULATION_ERROR,
        context,
        'Calculation failed'
      );

      expect(result).toMatchObject({
        success: expect.any(Boolean),
        action: expect.any(String),
        message: expect.any(String),
        requiresUserAction: expect.any(Boolean),
        stateModified: expect.any(Boolean),
      });
    });
  });
});
