/**
 * Integration tests for MovementSystem error handling
 * Tests error handling integration with MovementErrorHandler and visual feedback
 */

import * as Phaser from 'phaser';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { MovementError } from '../../../game/src/types/movement';
import {
  MovementNotification,
  MovementRecoveryOptions,
} from '../../../game/src/utils/MovementErrorHandler';

// Mock Phaser scene
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
      if (config.onStart) config.onStart();
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

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as unknown as Phaser.Events.EventEmitter;

describe('MovementSystem Error Handling Integration', () => {
  let movementSystem: MovementSystem;
  let mockMapData: MapData;
  let mockPlayerCharacter: Unit;
  let mockEnemyCharacter: Unit;
  let mockGameStateManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      tiles: Array(10)
        .fill(null)
        .map(() => Array(10).fill({ type: 'grass', passable: true, cost: 1 })),
      units: [],
    };

    mockPlayerCharacter = {
      id: 'player-1',
      name: 'Player Character',
      position: { x: 2, y: 2 },
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

    mockEnemyCharacter = {
      id: 'enemy-1',
      name: 'Enemy Character',
      position: { x: 8, y: 8 },
      stats: {
        hp: 80,
        mp: 30,
        attack: 18,
        defense: 12,
        movement: 2,
        range: 1,
      },
      currentHP: 80,
      currentMP: 30,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    };

    mockGameStateManager = {
      canCharacterMove: jest.fn(() => true),
      isPlayerTurn: jest.fn(() => true),
      markCharacterMoved: jest.fn(() => ({ success: true })),
    };

    movementSystem = new MovementSystem(
      mockScene,
      {
        enableVisualFeedback: true,
        enablePathPreview: true,
        enableMovementAnimation: false, // Disable for faster tests
      },
      mockEventEmitter
    );

    movementSystem.initialize(mockMapData);
    movementSystem.setGameStateManager(mockGameStateManager);
    movementSystem.updateUnits([mockPlayerCharacter, mockEnemyCharacter]);
  });

  afterEach(() => {
    movementSystem.destroy();
  });

  describe('character selection error handling', () => {
    it('should handle null character selection', () => {
      const result = movementSystem.selectCharacterForMovement(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          title: 'Invalid Selection',
          message: 'Character is null or undefined',
        })
      );
    });

    it('should handle character already moved error', () => {
      mockPlayerCharacter.hasMoved = true;
      mockGameStateManager.canCharacterMove.mockReturnValue(false);

      const result = movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.CHARACTER_ALREADY_MOVED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          title: 'Character Already Moved',
          message: expect.stringContaining('already moved'),
        })
      );
    });

    it('should handle wrong turn error', () => {
      mockGameStateManager.isPlayerTurn.mockReturnValue(false);
      mockGameStateManager.canCharacterMove.mockReturnValue(false);

      const result = movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      expect(result.valid).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          message: expect.stringContaining('enemy turn'),
        })
      );
    });

    it('should handle movement in progress error', () => {
      // First select a character successfully
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      // Simulate movement in progress
      const currentState = movementSystem.getCurrentState();
      currentState.isMoving = true;

      const result = movementSystem.selectCharacterForMovement(mockEnemyCharacter);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.MOVEMENT_IN_PROGRESS);
    });
  });

  describe('movement execution error handling', () => {
    beforeEach(() => {
      // Select character for movement
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);
    });

    it('should handle destination unreachable error', async () => {
      const unreachableDestination = { x: 9, y: 9 }; // Too far from character

      const result = await movementSystem.executeMovement(
        mockPlayerCharacter,
        unreachableDestination
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.DESTINATION_UNREACHABLE);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          title: 'Destination Unreachable',
          message: expect.stringContaining('not reachable'),
        })
      );
    });

    it('should handle destination occupied error', async () => {
      const occupiedDestination = mockEnemyCharacter.position; // Enemy is here

      const result = await movementSystem.executeMovement(mockPlayerCharacter, occupiedDestination);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.DESTINATION_OCCUPIED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          title: 'Position Occupied',
          message: expect.stringContaining('occupied'),
        })
      );
    });

    it('should handle invalid position error', async () => {
      const invalidDestination = { x: -1, y: -1 }; // Outside map bounds

      const result = await movementSystem.executeMovement(mockPlayerCharacter, invalidDestination);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
    });
  });

  describe('visual feedback integration', () => {
    beforeEach(() => {
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);
    });

    it('should show visual feedback for unreachable destination', async () => {
      const unreachableDestination = { x: 9, y: 9 };

      await movementSystem.executeMovement(mockPlayerCharacter, unreachableDestination);

      // Should create graphics for error display
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should show visual feedback for occupied destination', async () => {
      const occupiedDestination = mockEnemyCharacter.position;

      await movementSystem.executeMovement(mockPlayerCharacter, occupiedDestination);

      // Should create graphics for error display
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should show alternative positions for blocked movement', async () => {
      const blockedDestination = { x: 6, y: 2 }; // Reachable but we'll make it fail

      // Mock the pathfinding to return empty path (blocked)
      jest.spyOn(movementSystem as any, 'isPositionReachable').mockReturnValue(false);

      await movementSystem.executeMovement(mockPlayerCharacter, blockedDestination);

      // Should show error feedback and alternatives
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });
  });

  describe('recovery mechanism integration', () => {
    it('should trigger recovery for character selection errors', () => {
      mockPlayerCharacter.hasMoved = true;
      mockGameStateManager.canCharacterMove.mockReturnValue(false);

      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      // Should clear selection as recovery
      const currentState = movementSystem.getCurrentState();
      expect(currentState.selectedCharacter).toBeNull();
    });

    it('should trigger recovery for movement execution errors', async () => {
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      const unreachableDestination = { x: 9, y: 9 };
      await movementSystem.executeMovement(mockPlayerCharacter, unreachableDestination);

      // Recovery should maintain selection but clear other state
      const currentState = movementSystem.getCurrentState();
      expect(currentState.isMoving).toBe(false);
    });
  });

  describe('success feedback', () => {
    it('should show success feedback for completed movement', async () => {
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      const validDestination = { x: 3, y: 2 }; // Within movement range

      const result = await movementSystem.executeMovement(mockPlayerCharacter, validDestination);

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-notification',
        expect.objectContaining({
          title: 'Movement Complete',
          message: expect.stringContaining('moved successfully'),
        })
      );
    });
  });

  describe('error handler configuration', () => {
    it('should allow access to error handler for configuration', () => {
      const errorHandler = movementSystem.getErrorHandler();

      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.updateConfig).toBe('function');
    });

    it('should respect error handler configuration changes', () => {
      const errorHandler = movementSystem.getErrorHandler();

      errorHandler.updateConfig({
        showNotifications: false,
        showVisualFeedback: false,
      });

      // Test that notifications are disabled
      const result = movementSystem.selectCharacterForMovement(null as any);

      expect(result.valid).toBe(false);
      // Should not emit notification when disabled
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'movement-notification',
        expect.any(Object)
      );
    });
  });

  describe('movement interruption handling', () => {
    it('should handle movement interruption gracefully', async () => {
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      // Simulate movement interruption by cancelling
      movementSystem.cancelMovement();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-cancelled',
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle right-click cancellation', () => {
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      movementSystem.handleRightClickCancellation();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'movement-cancelled-by-right-click',
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('error handling with GameStateManager integration', () => {
    it('should use GameStateManager for character validation', () => {
      mockGameStateManager.canCharacterMove.mockReturnValue(false);

      const result = movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      expect(result.valid).toBe(false);
      expect(mockGameStateManager.canCharacterMove).toHaveBeenCalledWith(mockPlayerCharacter);
    });

    it('should handle GameStateManager errors gracefully', () => {
      mockGameStateManager.canCharacterMove.mockImplementation(() => {
        throw new Error('GameStateManager error');
      });

      // Should not throw, should fall back to local validation
      expect(() => {
        movementSystem.selectCharacterForMovement(mockPlayerCharacter);
      }).not.toThrow();
    });
  });

  describe('comprehensive error scenarios', () => {
    it('should handle multiple consecutive errors', () => {
      // First error: invalid character
      let result = movementSystem.selectCharacterForMovement(null as any);
      expect(result.valid).toBe(false);

      // Second error: character already moved
      mockPlayerCharacter.hasMoved = true;
      mockGameStateManager.canCharacterMove.mockReturnValue(false);
      result = movementSystem.selectCharacterForMovement(mockPlayerCharacter);
      expect(result.valid).toBe(false);

      // Third error: movement in progress (simulate)
      const currentState = movementSystem.getCurrentState();
      currentState.isMoving = true;
      result = movementSystem.selectCharacterForMovement(mockEnemyCharacter);
      expect(result.valid).toBe(false);

      // All errors should be handled without system failure
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(3);
    });

    it('should maintain system stability after errors', async () => {
      // Cause several errors
      movementSystem.selectCharacterForMovement(null as any);

      mockPlayerCharacter.hasMoved = true;
      mockGameStateManager.canCharacterMove.mockReturnValue(false);
      movementSystem.selectCharacterForMovement(mockPlayerCharacter);

      // Reset character state
      mockPlayerCharacter.hasMoved = false;
      mockGameStateManager.canCharacterMove.mockReturnValue(true);

      // System should still work normally
      const result = movementSystem.selectCharacterForMovement(mockPlayerCharacter);
      expect(result.valid).toBe(true);

      const currentState = movementSystem.getCurrentState();
      expect(currentState.selectedCharacter).toBe(mockPlayerCharacter);
    });
  });

  describe('cleanup and resource management', () => {
    it('should clean up error handler on destroy', () => {
      const errorHandler = movementSystem.getErrorHandler();
      const destroySpy = jest.spyOn(errorHandler, 'destroy');

      movementSystem.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should handle destroy gracefully even with active errors', () => {
      // Trigger some errors
      movementSystem.selectCharacterForMovement(null as any);

      // Should not throw during destroy
      expect(() => {
        movementSystem.destroy();
      }).not.toThrow();
    });
  });
});
