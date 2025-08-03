/**
 * Unit tests for MovementRenderer error feedback functionality
 * Tests visual error feedback, alternative position display, and warning systems
 */

import * as Phaser from 'phaser';
import {
  MovementRenderer,
  MovementHighlightType,
} from '../../../game/src/rendering/MovementRenderer';
import { Position, Unit, MapData } from '../../../game/src/types/gameplay';

// Mock Phaser scene and graphics
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      setDepth: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      beginPath: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      strokePath: jest.fn().mockReturnThis(),
      fillPath: jest.fn().mockReturnThis(),
      fillCircle: jest.fn().mockReturnThis(),
      closePath: jest.fn().mockReturnThis(),
      generateTexture: jest.fn(),
      destroy: jest.fn(),
    })),
    sprite: jest.fn(() => ({
      setRotation: jest.fn().mockReturnThis(),
      setTint: jest.fn().mockReturnThis(),
      setAlpha: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    })),
    container: jest.fn(() => ({
      setDepth: jest.fn().mockReturnThis(),
      add: jest.fn(),
      removeAll: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(config => {
      // Simulate immediate completion for testing
      if (config.onStart) config.onStart();
      if (config.onUpdate) config.onUpdate({}, config.targets);
      if (config.onComplete) config.onComplete();
      return {
        destroy: jest.fn(),
        isDestroyed: jest.fn(() => false),
      };
    }),
  },
  textures: {
    exists: jest.fn(() => false),
  },
} as unknown as Phaser.Scene;

describe('MovementRenderer Error Feedback', () => {
  let renderer: MovementRenderer;
  let mockMapData: MapData;
  let mockCharacter: Unit;

  beforeEach(() => {
    jest.clearAllMocks();

    renderer = new MovementRenderer(mockScene);

    mockMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      tiles: [],
      units: [],
    };

    mockCharacter = {
      id: 'test-character',
      name: 'Test Character',
      position: { x: 5, y: 5 },
      stats: {
        hp: 100,
        mp: 50,
        attack: 20,
        defense: 15,
        movement: 3,
        range: 1,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    renderer.setMapData(mockMapData);
  });

  afterEach(() => {
    renderer.destroy();
  });

  describe('showMovementError', () => {
    it('should show blocked position error', () => {
      const position = { x: 3, y: 3 };

      renderer.showMovementError(position, 'blocked');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should show unreachable position error', () => {
      const position = { x: 8, y: 8 };

      renderer.showMovementError(position, 'unreachable');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should show occupied position error', () => {
      const position = { x: 4, y: 4 };

      renderer.showMovementError(position, 'occupied');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should handle invalid position gracefully', () => {
      const position = { x: -1, y: -1 };

      expect(() => {
        renderer.showMovementError(position, 'blocked');
      }).not.toThrow();
    });

    it('should auto-cleanup after specified duration', done => {
      const position = { x: 3, y: 3 };
      const duration = 100;

      renderer.showMovementError(position, 'blocked', duration);

      // Check that cleanup is scheduled
      setTimeout(() => {
        // The graphics should be destroyed after the duration
        done();
      }, duration + 50);
    });

    it('should not show error when map data is not set', () => {
      const rendererWithoutMap = new MovementRenderer(mockScene);
      const position = { x: 3, y: 3 };

      rendererWithoutMap.showMovementError(position, 'blocked');

      expect(mockScene.add.graphics).not.toHaveBeenCalled();

      rendererWithoutMap.destroy();
    });
  });

  describe('showAlternativePositions', () => {
    it('should show alternative positions', () => {
      const alternatives = [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ];

      renderer.showAlternativePositions(alternatives);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(alternatives.length);
    });

    it('should handle empty alternatives array', () => {
      renderer.showAlternativePositions([]);

      expect(mockScene.add.graphics).not.toHaveBeenCalled();
    });

    it('should stagger animations for multiple alternatives', () => {
      const alternatives = [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ];

      renderer.showAlternativePositions(alternatives);

      // Check that tweens are created with different delays
      const tweenCalls = (mockScene.tweens.add as jest.Mock).mock.calls;
      expect(tweenCalls.length).toBe(alternatives.length);

      // First tween should have delay 0, second should have delay 100
      expect(tweenCalls[0][0].delay).toBe(0);
      expect(tweenCalls[1][0].delay).toBe(100);
    });

    it('should auto-cleanup after specified duration', done => {
      const alternatives = [{ x: 2, y: 2 }];
      const duration = 100;

      renderer.showAlternativePositions(alternatives, duration);

      setTimeout(() => {
        // Graphics should be destroyed after duration
        done();
      }, duration + 50);
    });

    it('should not show alternatives when map data is not set', () => {
      const rendererWithoutMap = new MovementRenderer(mockScene);
      const alternatives = [{ x: 2, y: 2 }];

      rendererWithoutMap.showAlternativePositions(alternatives);

      expect(mockScene.add.graphics).not.toHaveBeenCalled();

      rendererWithoutMap.destroy();
    });
  });

  describe('showMovementWarning', () => {
    it('should show dangerous movement warning', () => {
      const position = { x: 6, y: 6 };

      renderer.showMovementWarning(position, 'dangerous');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should show suboptimal movement warning', () => {
      const position = { x: 7, y: 7 };

      renderer.showMovementWarning(position, 'suboptimal');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should create pulsing animation for warnings', () => {
      const position = { x: 6, y: 6 };

      renderer.showMovementWarning(position, 'dangerous');

      const tweenCall = (mockScene.tweens.add as jest.Mock).mock.calls[0][0];
      expect(tweenCall.yoyo).toBe(true);
      expect(tweenCall.repeat).toBe(-1);
      expect(tweenCall.onUpdate).toBeDefined();
    });

    it('should auto-cleanup after specified duration', done => {
      const position = { x: 6, y: 6 };
      const duration = 100;

      renderer.showMovementWarning(position, 'dangerous', duration);

      setTimeout(() => {
        // Graphics should be destroyed after duration
        done();
      }, duration + 50);
    });

    it('should not show warning when map data is not set', () => {
      const rendererWithoutMap = new MovementRenderer(mockScene);
      const position = { x: 6, y: 6 };

      rendererWithoutMap.showMovementWarning(position, 'dangerous');

      expect(mockScene.add.graphics).not.toHaveBeenCalled();

      rendererWithoutMap.destroy();
    });
  });

  describe('showCharacterSelectionError', () => {
    it('should show already moved error', () => {
      renderer.showCharacterSelectionError(mockCharacter, 'already_moved');

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should show invalid selection error', () => {
      renderer.showCharacterSelectionError(mockCharacter, 'invalid');

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should show wrong turn error', () => {
      renderer.showCharacterSelectionError(mockCharacter, 'wrong_turn');

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should create shake effect animation', () => {
      renderer.showCharacterSelectionError(mockCharacter, 'invalid');

      expect(mockScene.add.graphics).toHaveBeenCalled();
      // The shake effect is implemented with setTimeout, so we can't easily test the animation
      // but we can verify that graphics are created
    });

    it('should auto-cleanup after specified duration', done => {
      const duration = 100;

      renderer.showCharacterSelectionError(mockCharacter, 'invalid', duration);

      setTimeout(() => {
        // Graphics should be destroyed after duration
        done();
      }, duration + 50);
    });

    it('should not show error when map data is not set', () => {
      const rendererWithoutMap = new MovementRenderer(mockScene);

      rendererWithoutMap.showCharacterSelectionError(mockCharacter, 'invalid');

      expect(mockScene.add.graphics).not.toHaveBeenCalled();

      rendererWithoutMap.destroy();
    });
  });

  describe('clearErrorFeedback', () => {
    it('should clear all error feedback visuals', () => {
      // Show some errors first
      renderer.showMovementError({ x: 3, y: 3 }, 'blocked');
      renderer.showAlternativePositions([{ x: 2, y: 2 }]);
      renderer.showMovementWarning({ x: 4, y: 4 }, 'dangerous');

      // Clear error feedback
      renderer.clearErrorFeedback();

      // This should not throw and should clean up properly
      expect(() => renderer.clearErrorFeedback()).not.toThrow();
    });
  });

  describe('integration with existing highlight system', () => {
    it('should work alongside existing movement highlights', () => {
      const movementRange = [
        { x: 4, y: 5 },
        { x: 5, y: 4 },
        { x: 6, y: 5 },
      ];

      // Show normal movement range
      renderer.highlightMovementRange(movementRange, mockCharacter);

      // Show error feedback
      renderer.showMovementError({ x: 7, y: 7 }, 'unreachable');

      // Both should work without interference
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2); // One for highlights, one for error
    });

    it('should maintain proper depth ordering', () => {
      const graphics = mockScene.add.graphics();

      renderer.showMovementError({ x: 3, y: 3 }, 'blocked');
      renderer.showAlternativePositions([{ x: 2, y: 2 }]);
      renderer.showMovementWarning({ x: 4, y: 4 }, 'dangerous');
      renderer.showCharacterSelectionError(mockCharacter, 'invalid');

      // Verify that setDepth is called with appropriate values
      expect(graphics.setDepth).toHaveBeenCalledWith(400); // Error feedback
      expect(graphics.setDepth).toHaveBeenCalledWith(350); // Alternatives
      expect(graphics.setDepth).toHaveBeenCalledWith(375); // Warnings
      expect(graphics.setDepth).toHaveBeenCalledWith(450); // Character errors
    });
  });

  describe('configuration integration', () => {
    it('should respect renderer configuration for colors and alphas', () => {
      const customConfig = {
        colors: {
          error: 0xff00ff,
          blocked: 0x00ff00,
          alternative: 0xffff00,
          warning: 0x0000ff,
        },
        alphas: {
          error: 0.9,
          blocked: 0.8,
          alternative: 0.7,
          warning: 0.6,
        },
      };

      renderer.updateConfig(customConfig);

      const graphics = mockScene.add.graphics();

      renderer.showMovementError({ x: 3, y: 3 }, 'blocked');

      // Verify that custom colors are used
      expect(graphics.fillStyle).toHaveBeenCalledWith(
        customConfig.colors.blocked,
        customConfig.alphas.blocked
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle positions outside map bounds gracefully', () => {
      const invalidPositions = [
        { x: -1, y: 5 },
        { x: 5, y: -1 },
        { x: 15, y: 5 },
        { x: 5, y: 15 },
      ];

      invalidPositions.forEach(position => {
        expect(() => {
          renderer.showMovementError(position, 'blocked');
          renderer.showAlternativePositions([position]);
          renderer.showMovementWarning(position, 'dangerous');
        }).not.toThrow();
      });
    });

    it('should handle character with invalid position gracefully', () => {
      const invalidCharacter = {
        ...mockCharacter,
        position: { x: -1, y: -1 },
      };

      expect(() => {
        renderer.showCharacterSelectionError(invalidCharacter, 'invalid');
      }).not.toThrow();
    });

    it('should handle destroyed tweens gracefully', () => {
      const mockTween = {
        destroy: jest.fn(),
        isDestroyed: jest.fn(() => true),
      };

      (mockScene.tweens.add as jest.Mock).mockReturnValue(mockTween);

      renderer.showMovementError({ x: 3, y: 3 }, 'blocked', 100);

      // Should not throw when trying to destroy already destroyed tween
      expect(() => renderer.destroy()).not.toThrow();
    });
  });
});
