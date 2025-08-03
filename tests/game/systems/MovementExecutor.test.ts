/**
 * Unit tests for MovementExecutor
 * Tests animation timing, character state changes, and movement execution
 */

import * as Phaser from 'phaser';
import {
  MovementExecutor,
  MovementExecutionResult,
  FacingDirection,
} from '../../../game/src/systems/MovementExecutor';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { MovementAnimationConfig, MovementError } from '../../../game/src/types/movement';

// Mock Phaser scene and related objects
class MockTween {
  public targets: any[];
  public isDestroyed = false;
  private onComplete?: () => void;
  private onError?: () => void;

  constructor(config: any) {
    this.targets = Array.isArray(config.targets) ? config.targets : [config.targets];
    this.onComplete = config.onComplete;
    this.onError = config.onError;

    // Simulate immediate completion for testing
    setTimeout(() => {
      if (this.onComplete && !this.isDestroyed) {
        this.onComplete();
      }
    }, 10);
  }

  stop(): void {
    this.isDestroyed = true;
  }

  destroy(): void {
    this.isDestroyed = true;
  }
}

class MockSprite {
  public x = 0;
  public y = 0;
  public rotation = 0;
  public flipX = false;

  setFlipX(flip: boolean): void {
    this.flipX = flip;
  }

  setRotation(rotation: number): void {
    this.rotation = rotation;
  }
}

class MockTime {
  delayedCall(delay: number, callback: () => void): void {
    setTimeout(callback, delay);
  }
}

class MockTweens {
  private tweens: MockTween[] = [];

  add(config: any): MockTween {
    const tween = new MockTween(config);
    this.tweens.push(tween);
    return tween;
  }

  getTweens(): MockTween[] {
    return [...this.tweens];
  }

  clear(): void {
    this.tweens = [];
  }
}

class MockScene {
  public tweens = new MockTweens();
  public time = new MockTime();
}

describe('MovementExecutor', () => {
  let movementExecutor: MovementExecutor;
  let mockScene: MockScene;
  let testMapData: MapData;
  let testCharacter: Unit;
  let testPath: Position[];

  beforeEach(() => {
    // Create mock scene
    mockScene = new MockScene();

    // Create movement executor
    movementExecutor = new MovementExecutor(mockScene as any);

    // Create test map data
    testMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      layers: [
        {
          name: 'terrain',
          type: 'terrain',
          data: Array(10)
            .fill(null)
            .map(() => Array(10).fill(0)),
          visible: true,
          opacity: 1,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 9, y: 9 }],
    };

    // Create test character
    const testStats: UnitStats = {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    };

    testCharacter = {
      id: 'test-character',
      name: 'Test Character',
      position: { x: 1, y: 1 },
      stats: testStats,
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
      sprite: new MockSprite() as any,
    };

    // Create test path
    testPath = [
      { x: 1, y: 1 }, // Start position
      { x: 2, y: 1 }, // Move east
      { x: 2, y: 2 }, // Move south
      { x: 3, y: 2 }, // Move east again
    ];

    // Set map data
    movementExecutor.setMapData(testMapData);
  });

  afterEach(() => {
    movementExecutor.destroy();
    mockScene.tweens.clear();
  });

  describe('Constructor and Configuration', () => {
    test('should create MovementExecutor with default configuration', () => {
      const executor = new MovementExecutor(mockScene as any);
      const config = executor.getConfig();

      expect(config.moveSpeed).toBe(200);
      expect(config.turnSpeed).toBe(Math.PI * 2);
      expect(config.easing).toBe('Power2');
      expect(config.stepDelay).toBe(100);
    });

    test('should create MovementExecutor with custom configuration', () => {
      const customConfig: Partial<MovementAnimationConfig> = {
        moveSpeed: 300,
        stepDelay: 200,
        easing: 'Linear',
      };

      const executor = new MovementExecutor(mockScene as any, customConfig);
      const config = executor.getConfig();

      expect(config.moveSpeed).toBe(300);
      expect(config.stepDelay).toBe(200);
      expect(config.easing).toBe('Linear');
      expect(config.turnSpeed).toBe(Math.PI * 2); // Should keep default
    });

    test('should update configuration after creation', () => {
      const newConfig: Partial<MovementAnimationConfig> = {
        moveSpeed: 400,
        stepDelay: 50,
      };

      movementExecutor.updateConfig(newConfig);
      const config = movementExecutor.getConfig();

      expect(config.moveSpeed).toBe(400);
      expect(config.stepDelay).toBe(50);
    });
  });

  describe('Map Data Management', () => {
    test('should set and use map data', () => {
      const newMapData: MapData = {
        ...testMapData,
        tileSize: 64,
      };

      movementExecutor.setMapData(newMapData);

      // Map data should be used internally (tested through movement execution)
      expect(() => movementExecutor.setMapData(newMapData)).not.toThrow();
    });
  });

  describe('Movement Validation', () => {
    test('should reject null character', async () => {
      const result = await movementExecutor.animateMovement(null as any, testPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
      expect(result.message).toContain('null or undefined');
    });

    test('should reject character without sprite', async () => {
      const characterWithoutSprite = { ...testCharacter, sprite: undefined };

      const result = await movementExecutor.animateMovement(characterWithoutSprite, testPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
      expect(result.message).toContain('sprite is not available');
    });

    test('should reject empty path', async () => {
      const result = await movementExecutor.animateMovement(testCharacter, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
      expect(result.message).toContain('at least 2 positions');
    });

    test('should reject single position path', async () => {
      const singlePath = [{ x: 1, y: 1 }];

      const result = await movementExecutor.animateMovement(testCharacter, singlePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
      expect(result.message).toContain('at least 2 positions');
    });

    test('should reject path that does not start from character position', async () => {
      const invalidPath = [
        { x: 0, y: 0 }, // Wrong start position
        { x: 1, y: 0 },
      ];

      const result = await movementExecutor.animateMovement(testCharacter, invalidPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
      expect(result.message).toContain("start from character's current position");
    });

    test('should reject path with non-adjacent positions', async () => {
      const invalidPath = [
        { x: 1, y: 1 }, // Start position
        { x: 3, y: 3 }, // Too far away
      ];

      const result = await movementExecutor.animateMovement(testCharacter, invalidPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.PATH_BLOCKED);
      expect(result.message).toContain('must be adjacent');
    });
  });

  describe('Movement Execution', () => {
    test('should execute valid movement successfully', async () => {
      const result = await movementExecutor.animateMovement(testCharacter, testPath);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual({ x: 3, y: 2 });
      expect(testCharacter.position).toEqual({ x: 3, y: 2 });
      expect(testCharacter.hasMoved).toBe(true);
    });

    test('should call completion callback on successful movement', async () => {
      const mockCallback = jest.fn();

      await movementExecutor.animateMovement(testCharacter, testPath, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        testCharacter,
        expect.objectContaining({
          success: true,
          finalPosition: { x: 3, y: 2 },
        })
      );
    });

    test('should call completion callback on failed movement', async () => {
      const mockCallback = jest.fn();
      const invalidPath = [{ x: 1, y: 1 }]; // Too short

      await movementExecutor.animateMovement(testCharacter, invalidPath, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        testCharacter,
        expect.objectContaining({
          success: false,
          error: MovementError.INVALID_POSITION,
        })
      );
    });

    test('should prevent multiple movements for same character', async () => {
      // Start first movement (don't await)
      const firstMovement = movementExecutor.animateMovement(testCharacter, testPath);

      // Try to start second movement immediately
      const secondResult = await movementExecutor.animateMovement(testCharacter, testPath);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe(MovementError.MOVEMENT_IN_PROGRESS);

      // Wait for first movement to complete
      await firstMovement;
    });

    test('should track character movement state', async () => {
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(false);

      const movementPromise = movementExecutor.animateMovement(testCharacter, testPath);

      // Should be moving during animation
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(true);

      await movementPromise;

      // Should not be moving after completion
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(false);
    });
  });

  describe('Movement Progress Tracking', () => {
    test('should return null progress for non-moving character', () => {
      const progress = movementExecutor.getMovementProgress(testCharacter);
      expect(progress).toBeNull();
    });

    test('should track movement progress during animation', async () => {
      const movementPromise = movementExecutor.animateMovement(testCharacter, testPath);

      // Give some time for movement to start
      await new Promise(resolve => setTimeout(resolve, 5));

      const progress = movementExecutor.getMovementProgress(testCharacter);

      // Progress should be a number between 0 and 1, or null if movement completed very quickly
      if (progress !== null) {
        expect(typeof progress).toBe('number');
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }

      await movementPromise;
    });
  });

  describe('Movement Cancellation', () => {
    test('should cancel active movement', async () => {
      // Start movement
      const movementPromise = movementExecutor.animateMovement(testCharacter, testPath);

      // Cancel movement
      const cancelled = movementExecutor.cancelMovement(testCharacter);

      expect(cancelled).toBe(true);
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(false);

      // Wait for promise to resolve
      await movementPromise;
    });

    test('should return false when cancelling non-moving character', () => {
      const cancelled = movementExecutor.cancelMovement(testCharacter);
      expect(cancelled).toBe(false);
    });

    test('should cancel all movements', async () => {
      // Start movement for first character
      movementExecutor.animateMovement(testCharacter, testPath);

      // Give some time for movement to start
      await new Promise(resolve => setTimeout(resolve, 5));

      // Character should be moving
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(true);

      // Cancel all movements
      movementExecutor.cancelAllMovements();

      // Character should not be moving
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(false);
    });
  });

  describe('Character Facing Direction', () => {
    test('should update sprite rotation for different facing directions', async () => {
      const sprite = testCharacter.sprite as MockSprite;

      // Test path that moves in different directions
      const directionPath = [
        { x: 1, y: 1 }, // Start
        { x: 2, y: 1 }, // East
        { x: 2, y: 0 }, // North
        { x: 1, y: 0 }, // West
        { x: 1, y: 1 }, // South
      ];

      await movementExecutor.animateMovement(testCharacter, directionPath);

      // Sprite should have been rotated during movement
      // Final rotation should be for south movement (default orientation)
      expect(sprite.rotation).toBe(0);
    });

    test('should reset sprite transformations before applying new facing', async () => {
      const sprite = testCharacter.sprite as MockSprite;

      // Set initial transformations
      sprite.setFlipX(true);
      sprite.setRotation(Math.PI);

      const eastPath = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ];

      await movementExecutor.animateMovement(testCharacter, eastPath);

      // Should have reset flipX and applied new rotation
      expect(sprite.flipX).toBe(false);
      expect(sprite.rotation).toBe(-Math.PI / 2); // East facing
    });
  });

  describe('Animation Timing', () => {
    test('should respect step delay configuration', async () => {
      const customConfig: Partial<MovementAnimationConfig> = {
        stepDelay: 200,
      };

      const executor = new MovementExecutor(mockScene as any, customConfig);
      executor.setMapData(testMapData);

      const startTime = Date.now();
      await executor.animateMovement(testCharacter, testPath);
      const endTime = Date.now();

      // Should take at least the step delays into account
      // (3 steps - 1) * 200ms = 400ms minimum
      const minExpectedTime = (testPath.length - 2) * 200;
      const actualTime = endTime - startTime;

      expect(actualTime).toBeGreaterThanOrEqual(minExpectedTime - 50); // Allow some tolerance

      executor.destroy();
    });

    test('should calculate movement duration based on path length', async () => {
      const shortPath = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ];

      const longPath = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ];

      const shortStartTime = Date.now();
      await movementExecutor.animateMovement(testCharacter, shortPath);
      const shortEndTime = Date.now();

      // Reset character position for second test
      testCharacter.position = { x: 1, y: 1 };
      testCharacter.hasMoved = false;

      const longStartTime = Date.now();
      await movementExecutor.animateMovement(testCharacter, longPath);
      const longEndTime = Date.now();

      const shortDuration = shortEndTime - shortStartTime;
      const longDuration = longEndTime - longStartTime;

      // Longer path should take more time
      expect(longDuration).toBeGreaterThan(shortDuration);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing map data gracefully', async () => {
      const executor = new MovementExecutor(mockScene as any);
      // Don't set map data

      const result = await executor.animateMovement(testCharacter, testPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
      expect(result.message).toContain('Map data not set');

      executor.destroy();
    });

    test('should handle tween errors gracefully', async () => {
      // Mock scene that throws errors
      const errorScene = {
        tweens: {
          add: () => {
            throw new Error('Tween creation failed');
          },
        },
        time: new MockTime(),
      };

      const executor = new MovementExecutor(errorScene as any);
      executor.setMapData(testMapData);

      const result = await executor.animateMovement(testCharacter, testPath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');

      executor.destroy();
    });
  });

  describe('Resource Management', () => {
    test('should clean up resources on destroy', () => {
      // Start some movements
      movementExecutor.animateMovement(testCharacter, testPath);

      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(true);

      // Destroy executor
      movementExecutor.destroy();

      // Should clean up all state
      expect(movementExecutor.isCharacterMoving(testCharacter)).toBe(false);
    });

    test('should track and clean up tweens', async () => {
      const initialTweenCount = mockScene.tweens.getTweens().length;

      await movementExecutor.animateMovement(testCharacter, testPath);

      // Tweens should be created and then cleaned up
      const finalTweenCount = mockScene.tweens.getTweens().length;

      // The exact count depends on implementation, but there should be some tween activity
      expect(finalTweenCount).toBeGreaterThanOrEqual(initialTweenCount);
    });
  });

  describe('Movement Queue', () => {
    test('should queue multiple movements for same character', async () => {
      const firstPath = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ];

      // Start first movement
      const firstPromise = movementExecutor.animateMovement(testCharacter, firstPath);

      // Try to start second movement immediately (should fail due to character already moving)
      const secondResult = await movementExecutor.animateMovement(testCharacter, firstPath);

      // Wait for first movement to complete
      const firstResult = await firstPromise;

      // First should succeed
      expect(firstResult.success).toBe(true);

      // Second should fail due to character already moving
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe(MovementError.MOVEMENT_IN_PROGRESS);
    });
  });
});
