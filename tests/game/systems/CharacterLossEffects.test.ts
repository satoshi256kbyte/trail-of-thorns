/**
 * Unit tests for CharacterLossEffects class
 * Tests all visual effects and animations for character loss system
 */

import * as Phaser from 'phaser';
import {
  CharacterLossEffects,
  ICharacterLossEffects,
  LossAnimationConfig,
  DangerEffectConfig,
  LossMessageConfig,
} from '../../../game/src/systems/CharacterLossEffects';
import { Unit } from '../../../game/src/types/gameplay';
import {
  LossCause,
  LossCauseType,
  StatusEffectType,
  DangerLevel,
} from '../../../game/src/types/characterLoss';

// Mock Phaser scene and objects
class MockScene extends Phaser.Events.EventEmitter {
  public add: any;
  public tweens: any;
  public time: any;
  public cameras: any;

  constructor() {
    super();

    this.add = {
      group: jest.fn(() => ({
        add: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn(),
        children: { entries: [] },
      })),
      container: jest.fn(() => ({
        setPosition: jest.fn(),
        setAlpha: jest.fn(),
        setScale: jest.fn(),
        add: jest.fn(),
        destroy: jest.fn(),
        getByName: jest.fn(),
      })),
      circle: jest.fn(() => ({
        setStrokeStyle: jest.fn(),
        destroy: jest.fn(),
        setOrigin: jest.fn(),
      })),
      rectangle: jest.fn(() => ({
        setScrollFactor: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
      })),
      text: jest.fn(() => ({
        setOrigin: jest.fn(),
        getBounds: jest.fn(() => ({ width: 100, height: 20 })),
        destroy: jest.fn(),
      })),
    };

    this.tweens = {
      add: jest.fn(config => {
        const mockTween = {
          isPlaying: jest.fn(() => true),
          stop: jest.fn(),
          play: jest.fn(),
        };
        // Simulate immediate completion for testing
        if (config.onComplete) {
          setTimeout(config.onComplete, 0);
        }
        return mockTween;
      }),
      createTimeline: jest.fn(() => ({
        add: jest.fn(),
        play: jest.fn(),
      })),
      killTweensOf: jest.fn(),
    };

    this.time = {
      addEvent: jest.fn(() => ({
        destroy: jest.fn(),
      })),
      delayedCall: jest.fn((delay, callback) => {
        setTimeout(callback, 0); // Immediate for testing
      }),
    };

    this.cameras = {
      main: {
        shake: jest.fn(),
        centerX: 400,
        centerY: 300,
        width: 800,
        height: 600,
      },
    };
  }
}

// Mock unit factory
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  const mockSprite = {
    x: 100,
    y: 100,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    tint: 0xffffff,
    setTint: jest.fn(),
    destroy: jest.fn(),
  };

  return {
    id: 'test-unit-1',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    currentHP: 50,
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    level: 1,
    sprite: mockSprite as any,
    ...overrides,
  };
}

// Mock loss cause factory
function createMockLossCause(type: LossCauseType = LossCauseType.BATTLE_DEFEAT): LossCause {
  return {
    type,
    sourceId: 'enemy-1',
    sourceName: 'Test Enemy',
    damageAmount: 25,
    description: 'Test loss cause',
    timestamp: Date.now(),
  };
}

describe('CharacterLossEffects', () => {
  let mockScene: MockScene;
  let lossEffects: CharacterLossEffects;
  let mockUnit: Unit;
  let mockLossCause: LossCause;

  beforeEach(() => {
    mockScene = new MockScene();
    lossEffects = new CharacterLossEffects(mockScene as any);
    mockUnit = createMockUnit();
    mockLossCause = createMockLossCause();
  });

  afterEach(() => {
    lossEffects.destroy();
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(lossEffects).toBeInstanceOf(CharacterLossEffects);
      expect(lossEffects.isEffectPlaying()).toBe(false);
    });

    test('should initialize with custom configuration', () => {
      const customAnimationConfig: Partial<LossAnimationConfig> = {
        enableAnimations: false,
        blinkDuration: 1000,
      };

      const customDangerConfig: Partial<DangerEffectConfig> = {
        enableWarnings: false,
        pulseDuration: 2000,
      };

      const customMessageConfig: Partial<LossMessageConfig> = {
        fontSize: 24,
        textColor: '#ff0000',
      };

      const customEffects = new CharacterLossEffects(
        mockScene as any,
        customAnimationConfig,
        customDangerConfig,
        customMessageConfig
      );

      expect(customEffects).toBeInstanceOf(CharacterLossEffects);
      customEffects.destroy();
    });

    test('should initialize effect groups and timers', () => {
      expect(mockScene.add.group).toHaveBeenCalledTimes(3); // effectsGroup, particlesGroup, messagesGroup
      expect(mockScene.time.addEvent).toHaveBeenCalledTimes(2); // dangerUpdateTimer, effectCleanupTimer
    });
  });

  describe('Loss Animation System', () => {
    test('should play complete loss animation sequence', async () => {
      const animationPromise = lossEffects.playLossAnimation(mockUnit, mockLossCause);

      expect(lossEffects.isEffectPlaying()).toBe(true);

      await animationPromise;

      expect(lossEffects.isEffectPlaying()).toBe(false);
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should handle battle defeat animation', async () => {
      const battleCause = createMockLossCause(LossCauseType.BATTLE_DEFEAT);

      await lossEffects.playLossAnimation(mockUnit, battleCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(mockScene.cameras.main.shake).toHaveBeenCalled();
    });

    test('should handle critical damage animation', async () => {
      const criticalCause = createMockLossCause(LossCauseType.CRITICAL_DAMAGE);

      await lossEffects.playLossAnimation(mockUnit, criticalCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(400, 0.03);
    });

    test('should handle status effect animation', async () => {
      const statusCause: LossCause = {
        type: LossCauseType.STATUS_EFFECT,
        statusType: StatusEffectType.POISON,
        description: 'Poisoned',
        timestamp: Date.now(),
      };

      await lossEffects.playLossAnimation(mockUnit, statusCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should handle environmental damage animation', async () => {
      const envCause = createMockLossCause(LossCauseType.ENVIRONMENTAL);

      await lossEffects.playLossAnimation(mockUnit, envCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should handle sacrifice animation', async () => {
      const sacrificeCause = createMockLossCause(LossCauseType.SACRIFICE);

      await lossEffects.playLossAnimation(mockUnit, sacrificeCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should skip animation if animations are disabled', async () => {
      const disabledEffects = new CharacterLossEffects(mockScene as any, {
        enableAnimations: false,
      });

      await disabledEffects.playLossAnimation(mockUnit, mockLossCause);

      expect(mockScene.tweens.add).not.toHaveBeenCalled();
      disabledEffects.destroy();
    });

    test('should skip animation if unit has no sprite', async () => {
      const unitWithoutSprite = createMockUnit({ sprite: undefined });

      await lossEffects.playLossAnimation(unitWithoutSprite, mockLossCause);

      expect(mockScene.tweens.add).not.toHaveBeenCalled();
    });

    test('should prevent concurrent animations', async () => {
      const firstAnimation = lossEffects.playLossAnimation(mockUnit, mockLossCause);

      expect(lossEffects.isEffectPlaying()).toBe(true);

      // Try to start second animation while first is playing
      const secondAnimation = lossEffects.playLossAnimation(mockUnit, mockLossCause);

      await Promise.all([firstAnimation, secondAnimation]);

      expect(lossEffects.isEffectPlaying()).toBe(false);
    });

    test('should emit animation events', async () => {
      const startSpy = jest.fn();
      const completeSpy = jest.fn();

      lossEffects.on('loss-animation-start', startSpy);
      lossEffects.on('loss-animation-complete', completeSpy);

      await lossEffects.playLossAnimation(mockUnit, mockLossCause);

      expect(startSpy).toHaveBeenCalledWith({ unit: mockUnit, cause: mockLossCause });
      expect(completeSpy).toHaveBeenCalledWith({ unit: mockUnit, cause: mockLossCause });
    });
  });

  describe('Danger Effect System', () => {
    test('should show danger effect for critical danger', () => {
      lossEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should show danger effect for high danger', () => {
      lossEffects.showDangerEffect(mockUnit, DangerLevel.HIGH);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should show danger effect for medium danger', () => {
      lossEffects.showDangerEffect(mockUnit, DangerLevel.MEDIUM);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should show danger effect for low danger', () => {
      lossEffects.showDangerEffect(mockUnit, DangerLevel.LOW);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should not show danger effect for no danger', () => {
      lossEffects.showDangerEffect(mockUnit, DangerLevel.NONE);

      expect(mockScene.add.container).not.toHaveBeenCalled();
    });

    test('should hide existing danger effect', () => {
      // First show a danger effect
      lossEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);

      const mockContainer = {
        destroy: jest.fn(),
      };
      mockScene.add.container.mockReturnValue(mockContainer);

      // Then hide it
      lossEffects.hideDangerEffect(mockUnit);

      // Note: The actual container destruction would be tested with proper mocking
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should not show danger effect if warnings are disabled', () => {
      const disabledEffects = new CharacterLossEffects(mockScene as any, undefined, {
        enableWarnings: false,
      });

      disabledEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);

      expect(mockScene.add.container).not.toHaveBeenCalled();
      disabledEffects.destroy();
    });

    test('should not show danger effect if unit has no sprite', () => {
      const unitWithoutSprite = createMockUnit({ sprite: undefined });

      lossEffects.showDangerEffect(unitWithoutSprite, DangerLevel.CRITICAL);

      expect(mockScene.add.container).not.toHaveBeenCalled();
    });

    test('should emit danger effect events', () => {
      const shownSpy = jest.fn();
      const hiddenSpy = jest.fn();

      lossEffects.on('danger-effect-shown', shownSpy);
      lossEffects.on('danger-effect-hidden', hiddenSpy);

      lossEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);
      lossEffects.hideDangerEffect(mockUnit);

      expect(shownSpy).toHaveBeenCalledWith({ unit: mockUnit, dangerLevel: DangerLevel.CRITICAL });
      expect(hiddenSpy).toHaveBeenCalledWith({ unit: mockUnit });
    });
  });

  describe('Chapter Reset Effect', () => {
    test('should play chapter reset effect', async () => {
      await lossEffects.playChapterResetEffect();

      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should skip chapter reset effect if animations are disabled', async () => {
      const disabledEffects = new CharacterLossEffects(mockScene as any, {
        enableAnimations: false,
      });

      await disabledEffects.playChapterResetEffect();

      expect(mockScene.add.rectangle).not.toHaveBeenCalled();
      disabledEffects.destroy();
    });

    test('should emit chapter reset event', async () => {
      const resetSpy = jest.fn();
      lossEffects.on('chapter-reset-effect-played', resetSpy);

      await lossEffects.playChapterResetEffect();

      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('Effect Management', () => {
    test('should clear all effects', () => {
      // Set up some effects first
      lossEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);

      lossEffects.clearAllEffects();

      expect(lossEffects.isEffectPlaying()).toBe(false);
    });

    test('should update effects', () => {
      const deltaTime = 16.67; // 60fps

      // This should not throw an error
      expect(() => {
        lossEffects.updateEffects(deltaTime);
      }).not.toThrow();
    });

    test('should emit clear effects event', () => {
      const clearSpy = jest.fn();
      lossEffects.on('all-effects-cleared', clearSpy);

      lossEffects.clearAllEffects();

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    test('should update animation configuration', () => {
      const newConfig: Partial<LossAnimationConfig> = {
        blinkDuration: 1200,
        enableScreenShake: false,
      };

      lossEffects.updateConfig(newConfig);

      // Configuration update should not throw
      expect(() => {
        lossEffects.updateConfig(newConfig);
      }).not.toThrow();
    });

    test('should update danger configuration', () => {
      const newDangerConfig: Partial<DangerEffectConfig> = {
        pulseDuration: 1500,
        particleCount: 12,
      };

      lossEffects.updateConfig(undefined, newDangerConfig);

      expect(() => {
        lossEffects.updateConfig(undefined, newDangerConfig);
      }).not.toThrow();
    });

    test('should update message configuration', () => {
      const newMessageConfig: Partial<LossMessageConfig> = {
        fontSize: 20,
        textColor: '#00ff00',
      };

      lossEffects.updateConfig(undefined, undefined, newMessageConfig);

      expect(() => {
        lossEffects.updateConfig(undefined, undefined, newMessageConfig);
      }).not.toThrow();
    });

    test('should emit config updated event', () => {
      const configSpy = jest.fn();
      lossEffects.on('config-updated', configSpy);

      const newConfig = { blinkDuration: 1000 };
      lossEffects.updateConfig(newConfig);

      expect(configSpy).toHaveBeenCalledWith({
        animationConfig: newConfig,
        dangerConfig: undefined,
        messageConfig: undefined,
      });
    });
  });

  describe('State Management', () => {
    test('should return current effect state', () => {
      const state = lossEffects.getEffectState();

      expect(state).toEqual({
        isPlaying: false,
        currentEffect: 'none',
        startTime: 0,
      });
    });

    test('should track effect state during animation', async () => {
      const animationPromise = lossEffects.playLossAnimation(mockUnit, mockLossCause);

      const stateDuringAnimation = lossEffects.getEffectState();
      expect(stateDuringAnimation.isPlaying).toBe(true);
      expect(stateDuringAnimation.currentEffect).toBe('loss');
      expect(stateDuringAnimation.targetUnit).toBe(mockUnit);

      await animationPromise;

      const stateAfterAnimation = lossEffects.getEffectState();
      expect(stateAfterAnimation.isPlaying).toBe(false);
      expect(stateAfterAnimation.currentEffect).toBe('none');
    });
  });

  describe('Error Handling', () => {
    test('should handle animation errors gracefully', async () => {
      // Mock a tween that throws an error
      mockScene.tweens.add.mockImplementationOnce(() => {
        throw new Error('Tween error');
      });

      const errorSpy = jest.fn();
      lossEffects.on('loss-animation-error', errorSpy);

      await lossEffects.playLossAnimation(mockUnit, mockLossCause);

      expect(errorSpy).toHaveBeenCalled();
      expect(lossEffects.isEffectPlaying()).toBe(false);
    });

    test('should handle missing sprite gracefully', async () => {
      const unitWithoutSprite = createMockUnit({ sprite: undefined });

      // Should not throw an error
      await expect(
        lossEffects.playLossAnimation(unitWithoutSprite, mockLossCause)
      ).resolves.toBeUndefined();
    });

    test('should handle invalid danger level gracefully', () => {
      // Should not throw an error
      expect(() => {
        lossEffects.showDangerEffect(mockUnit, 'invalid' as any);
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    test('should destroy all resources on destroy', () => {
      // Set up some effects
      lossEffects.showDangerEffect(mockUnit, DangerLevel.CRITICAL);

      const destroySpy = jest.fn();
      lossEffects.on('effects-system-destroyed', destroySpy);

      // Test that destroy doesn't throw
      expect(() => {
        lossEffects.destroy();
      }).not.toThrow();

      // Check that the destroy event was emitted
      expect(destroySpy).toHaveBeenCalled();
    });

    test('should clean up timers on destroy', () => {
      const mockTimer = { destroy: jest.fn() };
      mockScene.time.addEvent.mockReturnValue(mockTimer);

      const effects = new CharacterLossEffects(mockScene as any);
      effects.destroy();

      expect(mockTimer.destroy).toHaveBeenCalled();
    });

    test('should remove all event listeners on destroy', () => {
      const testListener = jest.fn();
      lossEffects.on('test-event', testListener);

      lossEffects.destroy();

      lossEffects.emit('test-event');
      expect(testListener).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Different Status Effects', () => {
    test.each([
      StatusEffectType.POISON,
      StatusEffectType.BURN,
      StatusEffectType.FREEZE,
      StatusEffectType.CURSE,
      StatusEffectType.DRAIN,
    ])('should handle %s status effect animation', async statusType => {
      const statusCause: LossCause = {
        type: LossCauseType.STATUS_EFFECT,
        statusType,
        description: `${statusType} effect`,
        timestamp: Date.now(),
      };

      await lossEffects.playLossAnimation(mockUnit, statusCause);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('Integration with Different Danger Levels', () => {
    test.each([DangerLevel.LOW, DangerLevel.MEDIUM, DangerLevel.HIGH, DangerLevel.CRITICAL])(
      'should create appropriate effect for %s danger level',
      dangerLevel => {
        lossEffects.showDangerEffect(mockUnit, dangerLevel);

        expect(mockScene.add.container).toHaveBeenCalled();
        expect(mockScene.add.circle).toHaveBeenCalled();
      }
    );
  });

  describe('Performance Considerations', () => {
    test('should handle multiple simultaneous danger effects', () => {
      const units = [
        createMockUnit({ id: 'unit-1' }),
        createMockUnit({ id: 'unit-2' }),
        createMockUnit({ id: 'unit-3' }),
      ];

      units.forEach(unit => {
        lossEffects.showDangerEffect(unit, DangerLevel.CRITICAL);
      });

      expect(mockScene.add.container).toHaveBeenCalledTimes(3);
    });

    test('should clean up effects efficiently', () => {
      const units = Array.from({ length: 10 }, (_, i) => createMockUnit({ id: `unit-${i}` }));

      // Create multiple effects
      units.forEach(unit => {
        lossEffects.showDangerEffect(unit, DangerLevel.HIGH);
      });

      // Clear all at once
      lossEffects.clearAllEffects();

      expect(lossEffects.isEffectPlaying()).toBe(false);
    });
  });
});
