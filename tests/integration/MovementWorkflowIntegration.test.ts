/**
 * Movement Workflow Integration Tests
 *
 * Tests complete movement workflows from character selection to movement execution
 * Implements requirement 14.1: Create integration tests for complete movement workflows
 */

import { MovementSystem } from '../../game/src/systems/MovementSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { MovementCalculator } from '../../game/src/systems/MovementCalculator';
import { PathfindingService } from '../../game/src/systems/PathfindingService';
import { MovementRenderer } from '../../game/src/rendering/MovementRenderer';
import { MovementExecutor } from '../../game/src/systems/MovementExecutor';
import { Unit, Position, MapData, StageData } from '../../game/src/types/gameplay';
import { MovementError, MovementState } from '../../game/src/types/movement';

// Mock Phaser scene with comprehensive tracking
const createMockScene = () =>
  ({
    add: {
      graphics: jest.fn(() => ({
        clear: jest.fn(),
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
        alpha: 0.5,
      })),
      sprite: jest.fn(() => ({
        setPosition: jest.fn(),
        setRotation: jest.fn(),
        setTint: jest.fn(),
        setAlpha: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn(),
        x: 0,
        y: 0,
      })),
      container: jest.fn(() => ({
        add: jest.fn(),
        removeAll: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
      })),
    },
    tweens: {
      add: jest.fn(() => ({
        destroy: jest.fn(),
        stop: jest.fn(),
        isDestroyed: jest.fn(() => false),
      })),
    },
    textures: {
      exists: jest.fn(() => true),
    },
    events: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
  }) as any;

// Test data factories
const createTestUnit = (
  id: string,
  position: Position,
  faction: 'player' | 'enemy' = 'player'
): Unit => ({
  id,
  name: `Test Unit ${id}`,
  position: { ...position },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 4,
  },
  currentHP: 100,
  currentMP: 50,
  faction,
  hasActed: false,
  hasMoved: false,
  sprite: {
    x: position.x * 32,
    y: position.y * 32,
    setRotation: jest.fn(),
    setFlipX: jest.fn(),
  } as any,
});

const createTestMapData = (width: number = 15, height: number = 15): MapData => ({
  width,
  height,
  tileSize: 32,
  layers: [
    {
      name: 'terrain',
      type: 'terrain',
      data: Array(height)
        .fill(null)
        .map(() => Array(width).fill(0)),
      visible: true,
      opacity: 1,
    },
  ],
  playerSpawns: [{ x: 1, y: 1 }],
  enemySpawns: [{ x: width - 2, y: height - 2 }],
});

const createTestStageData = (): StageData => {
  const mapData = createTestMapData();
  return {
    id: 'integration-test',
    name: 'Integration Test Stage',
    description: 'Stage for integration testing',
    mapData,
    playerUnits: [
      createTestUnit('player1', { x: 2, y: 2 }),
      createTestUnit('player2', { x: 3, y: 2 }),
    ],
    enemyUnits: [createTestUnit('enemy1', { x: 12, y: 12 }, 'enemy')],
    victoryConditions: [{ type: 'defeat_all', description: 'Defeat all enemies' }],
  };
};

describe('Movement Workflow Integration Tests', () => {
  let movementSystem: MovementSystem;
  let gameStateManager: GameStateManager;
  let mockScene: any;
  let testStageData: StageData;
  let testUnits: Unit[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = createMockScene();
    testStageData = createTestStageData();
    testUnits = [...testStageData.playerUnits, ...testStageData.enemyUnits];

    // Initialize systems
    gameStateManager = new GameStateManager();
    gameStateManager.initializeTurnOrder(testUnits);

    const testConfig = {
      enableVisualFeedback: true,
      enablePathPreview: true,
      enableMovementAnimation: false, // Disable for faster testing
    };

    movementSystem = new MovementSystem(mockScene, testConfig);
    movementSystem.initialize(testStageData.mapData);
    movementSystem.updateUnits(testUnits);
  });

  afterEach(() => {
    if (movementSystem) {
      movementSystem.destroy();
    }
    if (gameStateManager) {
      gameStateManager.reset();
    }
  });

  describe('Complete Movement Workflow', () => {
    test('should execute complete movement workflow successfully', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 5, y: 5 };

      // Step 1: Character Selection
      const selectionResult = movementSystem.selectCharacterForMovement(testUnit);
      expect(selectionResult.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      // Step 2: Movement Range Display
      const state = movementSystem.getCurrentState();
      expect(state.movementMode).toBe('selecting');
      expect(state.movementRange.length).toBeGreaterThan(0);
      expect(state.movementRange).toContainEqual(testUnit.position);

      // Step 3: Path Preview
      movementSystem.showMovementPath(destination);
      const stateWithPath = movementSystem.getCurrentState();
      expect(stateWithPath.currentPath.length).toBeGreaterThan(0);
      expect(stateWithPath.currentPath[0]).toEqual(testUnit.position);
      expect(stateWithPath.currentPath[stateWithPath.currentPath.length - 1]).toEqual(destination);

      // Step 4: Movement Execution
      const executionResult = await movementSystem.executeMovement(testUnit, destination);
      expect(executionResult.success).toBe(true);
      expect(executionResult.finalPosition).toEqual(destination);
      expect(testUnit.position).toEqual(destination);
      expect(testUnit.hasMoved).toBe(true);

      // Step 5: Post-movement State
      const finalState = movementSystem.getCurrentState();
      expect(finalState.movementMode).toBe('none');
      expect(finalState.selectedCharacter).toBeNull();
      expect(finalState.movementRange).toEqual([]);
      expect(finalState.currentPath).toEqual([]);
    });

    test('should handle movement workflow with turn system integration', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 4, y: 4 };

      // Ensure it's player turn
      expect(gameStateManager.isPlayerTurn()).toBe(true);
      expect(gameStateManager.canCharacterMove(testUnit)).toBe(true);

      // Execute movement
      movementSystem.selectCharacterForMovement(testUnit);
      const executionResult = await movementSystem.executeMovement(testUnit, destination);

      expect(executionResult.success).toBe(true);
      expect(testUnit.hasMoved).toBe(true);

      // Verify turn system integration
      expect(gameStateManager.canCharacterMove(testUnit)).toBe(false);
    });

    test('should handle movement workflow with collision detection', async () => {
      const movingUnit = testStageData.playerUnits[0];
      const blockingUnit = testStageData.playerUnits[1];
      const blockedDestination = blockingUnit.position;

      // Try to move to occupied position
      movementSystem.selectCharacterForMovement(movingUnit);
      const executionResult = await movementSystem.executeMovement(movingUnit, blockedDestination);

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBe(MovementError.DESTINATION_OCCUPIED);
      expect(movingUnit.position).not.toEqual(blockedDestination);
      expect(movingUnit.hasMoved).toBe(false);
    });

    test('should handle movement workflow with terrain costs', async () => {
      // Create map with difficult terrain
      const mapWithTerrain = createTestMapData();
      mapWithTerrain.layers[0].data[4][4] = 4; // Difficult terrain (cost 3)
      mapWithTerrain.layers[0].data[4][5] = 4;
      mapWithTerrain.layers[0].data[5][4] = 4;

      movementSystem.initialize(mapWithTerrain);
      movementSystem.updateUnits(testUnits);

      const testUnit = testStageData.playerUnits[0];
      const difficultDestination = { x: 5, y: 5 };

      movementSystem.selectCharacterForMovement(testUnit);

      // Check if destination is reachable considering terrain costs
      const isReachable = movementSystem.isPositionReachable(testUnit, difficultDestination);

      if (isReachable) {
        const executionResult = await movementSystem.executeMovement(
          testUnit,
          difficultDestination
        );
        expect(executionResult.success).toBe(true);
      } else {
        const executionResult = await movementSystem.executeMovement(
          testUnit,
          difficultDestination
        );
        expect(executionResult.success).toBe(false);
        expect(executionResult.error).toBe(MovementError.DESTINATION_UNREACHABLE);
      }
    });
  });

  describe('Movement Cancellation Workflows', () => {
    test('should handle movement cancellation during selection', () => {
      const testUnit = testStageData.playerUnits[0];

      // Select character
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      // Show movement path
      movementSystem.showMovementPath({ x: 5, y: 5 });
      const stateWithPath = movementSystem.getCurrentState();
      expect(stateWithPath.currentPath.length).toBeGreaterThan(0);

      // Cancel movement
      movementSystem.cancelMovement();

      // Verify clean cancellation
      const finalState = movementSystem.getCurrentState();
      expect(finalState.selectedCharacter).toBeNull();
      expect(finalState.movementMode).toBe('none');
      expect(finalState.movementRange).toEqual([]);
      expect(finalState.currentPath).toEqual([]);
    });

    test('should handle right-click cancellation workflow', () => {
      const testUnit = testStageData.playerUnits[0];

      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.showMovementPath({ x: 6, y: 6 });

      // Simulate right-click cancellation
      movementSystem.handleRightClickCancellation();

      const finalState = movementSystem.getCurrentState();
      expect(finalState.selectedCharacter).toBeNull();
      expect(finalState.movementMode).toBe('none');
      expect(finalState.movementRange).toEqual([]);
      expect(finalState.currentPath).toEqual([]);
    });

    test('should handle character switching workflow', () => {
      const firstUnit = testStageData.playerUnits[0];
      const secondUnit = testStageData.playerUnits[1];

      // Select first character
      movementSystem.selectCharacterForMovement(firstUnit);
      const firstState = movementSystem.getCurrentState();
      expect(firstState.selectedCharacter).toBe(firstUnit);
      expect(firstState.movementRange.length).toBeGreaterThan(0);

      // Switch to second character
      movementSystem.selectCharacterForMovement(secondUnit);
      const secondState = movementSystem.getCurrentState();
      expect(secondState.selectedCharacter).toBe(secondUnit);
      expect(secondState.movementRange.length).toBeGreaterThan(0);

      // Movement ranges should be different
      expect(secondState.movementRange).not.toEqual(firstState.movementRange);
    });
  });

  describe('Error Handling Workflows', () => {
    test('should handle invalid character selection workflow', () => {
      const defeatedUnit = createTestUnit('defeated', { x: 1, y: 1 });
      defeatedUnit.currentHP = 0;

      const result = movementSystem.selectCharacterForMovement(defeatedUnit);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
      expect(movementSystem.getSelectedCharacter()).toBeNull();
    });

    test('should handle movement to invalid position workflow', async () => {
      const testUnit = testStageData.playerUnits[0];
      const invalidDestination = { x: -1, y: -1 };

      movementSystem.selectCharacterForMovement(testUnit);
      const executionResult = await movementSystem.executeMovement(testUnit, invalidDestination);

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBe(MovementError.INVALID_POSITION);
      expect(testUnit.position).not.toEqual(invalidDestination);
    });

    test('should handle movement beyond range workflow', async () => {
      const testUnit = testStageData.playerUnits[0];
      const farDestination = { x: 14, y: 14 }; // Far beyond movement range

      movementSystem.selectCharacterForMovement(testUnit);
      const executionResult = await movementSystem.executeMovement(testUnit, farDestination);

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBe(MovementError.DESTINATION_UNREACHABLE);
      expect(testUnit.position).not.toEqual(farDestination);
    });
  });

  describe('Multi-Character Workflows', () => {
    test('should handle sequential character movements', async () => {
      const firstUnit = testStageData.playerUnits[0];
      const secondUnit = testStageData.playerUnits[1];
      const firstDestination = { x: 5, y: 5 };
      const secondDestination = { x: 6, y: 5 };

      // Move first character
      movementSystem.selectCharacterForMovement(firstUnit);
      const firstResult = await movementSystem.executeMovement(firstUnit, firstDestination);
      expect(firstResult.success).toBe(true);
      expect(firstUnit.position).toEqual(firstDestination);

      // Move second character
      movementSystem.selectCharacterForMovement(secondUnit);
      const secondResult = await movementSystem.executeMovement(secondUnit, secondDestination);
      expect(secondResult.success).toBe(true);
      expect(secondUnit.position).toEqual(secondDestination);

      // Verify both units moved
      expect(firstUnit.hasMoved).toBe(true);
      expect(secondUnit.hasMoved).toBe(true);
    });

    test('should handle character movement with dynamic obstacles', async () => {
      const movingUnit = testStageData.playerUnits[0];
      const blockingUnit = testStageData.playerUnits[1];
      const destination = { x: 5, y: 5 };

      // Move blocking unit to destination first
      blockingUnit.position = destination;
      movementSystem.updateUnits(testUnits);

      // Try to move to now-occupied position
      movementSystem.selectCharacterForMovement(movingUnit);
      const result = await movementSystem.executeMovement(movingUnit, destination);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.DESTINATION_OCCUPIED);
    });
  });

  describe('Visual Feedback Integration', () => {
    test('should provide visual feedback throughout movement workflow', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 5, y: 5 };

      // Track visual feedback calls
      const graphicsCalls = mockScene.add.graphics.mock.calls;
      const spriteCalls = mockScene.add.sprite.mock.calls;

      // Execute complete workflow
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.showMovementPath(destination);
      await movementSystem.executeMovement(testUnit, destination);

      // Verify visual feedback was provided
      expect(graphicsCalls.length).toBeGreaterThan(0); // Movement range highlights
      expect(spriteCalls.length).toBeGreaterThan(0); // Path arrows
    });

    test('should clean up visual feedback after movement', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 4, y: 4 };

      // Create graphics objects
      const mockGraphics = mockScene.add.graphics();
      const mockSprite = mockScene.add.sprite();

      movementSystem.selectCharacterForMovement(testUnit);
      await movementSystem.executeMovement(testUnit, destination);

      // Verify cleanup was called
      expect(mockGraphics.clear).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance with complex workflows', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destinations = [
        { x: 4, y: 4 },
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 },
      ];

      const startTime = performance.now();

      // Execute multiple movement previews
      movementSystem.selectCharacterForMovement(testUnit);

      for (const dest of destinations) {
        movementSystem.showMovementPath(dest);
      }

      // Execute final movement
      await movementSystem.executeMovement(testUnit, destinations[0]);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle rapid workflow changes efficiently', () => {
      const units = testStageData.playerUnits;
      const startTime = performance.now();

      // Rapidly switch between characters
      for (let i = 0; i < 10; i++) {
        const unit = units[i % units.length];
        movementSystem.selectCharacterForMovement(unit);
        movementSystem.showMovementPath({ x: 5 + i, y: 5 + i });
        movementSystem.cancelMovement();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(50); // Should handle rapid changes efficiently
    });
  });

  describe('State Consistency', () => {
    test('should maintain consistent state throughout workflow', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 5, y: 5 };

      // Track state changes
      const stateHistory: MovementState[] = [];

      movementSystem.setOnMovementStateChange(state => {
        stateHistory.push({ ...state });
      });

      // Execute workflow
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.showMovementPath(destination);
      await movementSystem.executeMovement(testUnit, destination);

      // Verify state progression
      expect(stateHistory.length).toBeGreaterThan(0);

      // Check for consistent state transitions
      for (let i = 1; i < stateHistory.length; i++) {
        const prevState = stateHistory[i - 1];
        const currentState = stateHistory[i];

        // State should never be inconsistent
        if (currentState.selectedCharacter) {
          expect(currentState.movementMode).not.toBe('none');
        }

        if (currentState.movementMode === 'none') {
          expect(currentState.selectedCharacter).toBeNull();
          expect(currentState.movementRange).toEqual([]);
          expect(currentState.currentPath).toEqual([]);
        }
      }
    });

    test('should recover from interrupted workflows', async () => {
      const testUnit = testStageData.playerUnits[0];
      const destination = { x: 5, y: 5 };

      // Start movement workflow
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.showMovementPath(destination);

      // Simulate interruption (e.g., scene change)
      movementSystem.destroy();

      // Create new movement system
      movementSystem = new MovementSystem(mockScene, { enableVisualFeedback: false });
      movementSystem.initialize(testStageData.mapData);
      movementSystem.updateUnits(testUnits);

      // Should start in clean state
      const state = movementSystem.getCurrentState();
      expect(state.selectedCharacter).toBeNull();
      expect(state.movementMode).toBe('none');
      expect(state.movementRange).toEqual([]);
      expect(state.currentPath).toEqual([]);

      // Should be able to start new workflow
      const result = movementSystem.selectCharacterForMovement(testUnit);
      expect(result.valid).toBe(true);
    });
  });
});
