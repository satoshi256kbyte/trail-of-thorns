/**
 * MovementSystem unit tests
 * Tests the central movement system coordinator functionality
 */

import { MovementSystem, MovementSystemConfig } from '../../../game/src/systems/MovementSystem';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { MovementError } from '../../../game/src/types/movement';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      setDepth: jest.fn(),
      clear: jest.fn(),
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      lineStyle: jest.fn(),
      strokeRect: jest.fn(),
      destroy: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fillPath: jest.fn(),
      generateTexture: jest.fn(),
      alpha: 0.5,
    })),
    sprite: jest.fn(() => ({
      setRotation: jest.fn(),
      setTint: jest.fn(),
      setAlpha: jest.fn(),
      destroy: jest.fn(),
    })),
    container: jest.fn(() => ({
      setDepth: jest.fn(),
      add: jest.fn(),
      removeAll: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(() => ({
      destroy: jest.fn(),
      stop: jest.fn(),
      isDestroyed: jest.fn(() => false),
      targets: [],
    })),
  },
  time: {
    delayedCall: jest.fn((delay, callback) => {
      setTimeout(callback, delay);
    }),
  },
  textures: {
    exists: jest.fn(() => false),
  },
} as any;

// Test data
const createTestUnit = (id: string, position: Position, hasMoved = false): Unit => ({
  id,
  name: `Test Unit ${id}`,
  position: { ...position },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 3,
  } as UnitStats,
  currentHP: 100,
  currentMP: 50,
  faction: 'player',
  hasActed: false,
  hasMoved,
  sprite: {
    x: position.x * 32,
    y: position.y * 32,
    setRotation: jest.fn(),
    setFlipX: jest.fn(),
  } as any,
});

const createTestMapData = (): MapData => ({
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
});

describe('MovementSystem', () => {
  let movementSystem: MovementSystem;
  let testMapData: MapData;
  let testUnit: Unit;
  let testUnits: Unit[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test data
    testMapData = createTestMapData();
    testUnit = createTestUnit('player1', { x: 2, y: 2 });
    testUnits = [
      testUnit,
      createTestUnit('player2', { x: 4, y: 4 }),
      createTestUnit('enemy1', { x: 7, y: 7 }),
    ];

    // Create movement system with disabled visual feedback for testing
    const testConfig = {
      enableVisualFeedback: false,
      enablePathPreview: false,
      enableMovementAnimation: false,
    };
    movementSystem = new MovementSystem(mockScene, testConfig);
    movementSystem.initialize(testMapData);
    movementSystem.updateUnits(testUnits);
  });

  afterEach(() => {
    if (movementSystem) {
      movementSystem.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const newSystem = new MovementSystem(mockScene);
      expect(newSystem).toBeDefined();
      expect(newSystem.getCurrentState().movementMode).toBe('none');
      expect(newSystem.getSelectedCharacter()).toBeNull();
    });

    test('should initialize with custom configuration', () => {
      const config: Partial<MovementSystemConfig> = {
        enableVisualFeedback: false,
        enablePathPreview: false,
      };

      const newSystem = new MovementSystem(mockScene, config);
      expect(newSystem).toBeDefined();
    });

    test('should set map data correctly', () => {
      const newSystem = new MovementSystem(mockScene);
      newSystem.initialize(testMapData);

      // Should not throw errors when using map-dependent methods
      expect(() => {
        newSystem.updateUnits(testUnits);
      }).not.toThrow();
    });
  });

  describe('Character Selection', () => {
    test('should select character for movement successfully', () => {
      const result = movementSystem.selectCharacterForMovement(testUnit);

      expect(result.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);
      expect(movementSystem.getCurrentState().movementMode).toBe('selecting');
    });

    test('should reject null character selection', () => {
      const result = movementSystem.selectCharacterForMovement(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
      expect(movementSystem.getSelectedCharacter()).toBeNull();
    });

    test('should reject character that has already moved', () => {
      const movedUnit = createTestUnit('moved', { x: 1, y: 1 }, true);
      const result = movementSystem.selectCharacterForMovement(movedUnit);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.CHARACTER_ALREADY_MOVED);
      expect(movementSystem.getSelectedCharacter()).toBeNull();
    });

    test('should reject defeated character', () => {
      const defeatedUnit = createTestUnit('defeated', { x: 1, y: 1 });
      defeatedUnit.currentHP = 0;

      const result = movementSystem.selectCharacterForMovement(defeatedUnit);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
    });

    test('should reject character with no movement points', () => {
      const immobileUnit = createTestUnit('immobile', { x: 1, y: 1 });
      immobileUnit.stats.movement = 0;

      const result = movementSystem.selectCharacterForMovement(immobileUnit);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INSUFFICIENT_MOVEMENT_POINTS);
    });

    test('should clear previous selection when selecting new character', () => {
      // Select first character
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      // Select second character
      const secondUnit = testUnits[1];
      movementSystem.selectCharacterForMovement(secondUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(secondUnit);
    });
  });

  describe('Movement Range Display', () => {
    test('should show movement range for selected character', () => {
      movementSystem.selectCharacterForMovement(testUnit);
      const state = movementSystem.getCurrentState();

      expect(state.movementRange).toBeDefined();
      expect(state.movementRange.length).toBeGreaterThan(0);
      expect(state.movementRange).toContainEqual(testUnit.position);
    });

    test('should calculate correct movement range based on character stats', () => {
      // Create character with movement 2
      const limitedUnit = createTestUnit('limited', { x: 5, y: 5 });
      limitedUnit.stats.movement = 2;

      movementSystem.selectCharacterForMovement(limitedUnit);
      const state = movementSystem.getCurrentState();

      // Should include positions within 2 tiles
      expect(state.movementRange).toContainEqual({ x: 5, y: 5 }); // Current position
      expect(state.movementRange).toContainEqual({ x: 5, y: 4 }); // 1 tile north
      expect(state.movementRange).toContainEqual({ x: 5, y: 3 }); // 2 tiles north

      // Should not include positions beyond movement range
      const farPosition = { x: 5, y: 1 }; // 4 tiles away
      expect(state.movementRange).not.toContainEqual(farPosition);
    });

    test('should exclude occupied positions from movement range', () => {
      // Place an obstacle unit
      const obstacleUnit = createTestUnit('obstacle', { x: 2, y: 1 });
      const unitsWithObstacle = [...testUnits, obstacleUnit];
      movementSystem.updateUnits(unitsWithObstacle);

      movementSystem.selectCharacterForMovement(testUnit);
      const state = movementSystem.getCurrentState();

      // Should not include occupied position
      expect(state.movementRange).not.toContainEqual({ x: 2, y: 1 });
    });
  });

  describe('Movement Path Display', () => {
    beforeEach(() => {
      movementSystem.selectCharacterForMovement(testUnit);
    });

    test('should show movement path to reachable destination', () => {
      const destination = { x: 2, y: 4 }; // 2 tiles south
      movementSystem.showMovementPath(destination);

      const state = movementSystem.getCurrentState();
      expect(state.currentPath.length).toBeGreaterThan(0);
      expect(state.currentPath[0]).toEqual(testUnit.position);
      expect(state.currentPath[state.currentPath.length - 1]).toEqual(destination);
    });

    test('should clear path for unreachable destination', () => {
      const unreachableDestination = { x: 9, y: 9 }; // Too far away
      movementSystem.showMovementPath(unreachableDestination);

      const state = movementSystem.getCurrentState();
      expect(state.currentPath).toEqual([]);
    });

    test('should not show path when no character is selected', () => {
      movementSystem.cancelMovement(); // Clear selection
      movementSystem.showMovementPath({ x: 3, y: 3 });

      const state = movementSystem.getCurrentState();
      expect(state.currentPath).toEqual([]);
    });
  });

  describe('Movement Execution', () => {
    beforeEach(() => {
      movementSystem.selectCharacterForMovement(testUnit);
    });

    test('should execute movement to valid destination', async () => {
      const destination = { x: 2, y: 4 };
      const result = await movementSystem.executeMovement(testUnit, destination);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual(destination);
      expect(testUnit.position).toEqual(destination);
      expect(testUnit.hasMoved).toBe(true);
    });

    test('should reject movement to unreachable destination', async () => {
      const unreachableDestination = { x: 9, y: 9 };
      const result = await movementSystem.executeMovement(testUnit, unreachableDestination);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.DESTINATION_UNREACHABLE);
      expect(testUnit.position).toEqual({ x: 2, y: 2 }); // Should not move
    });

    test('should reject movement to occupied destination', async () => {
      // First select the character to ensure movement range is calculated
      movementSystem.selectCharacterForMovement(testUnit);

      // Place an obstacle unit at an adjacent position (definitely within range)
      const obstacleUnit = createTestUnit('obstacle', { x: 3, y: 2 }); // Adjacent to testUnit at (2,2)
      const unitsWithObstacle = [...testUnits, obstacleUnit];
      movementSystem.updateUnits(unitsWithObstacle);

      const occupiedDestination = { x: 3, y: 2 }; // Where obstacle unit is located
      const result = await movementSystem.executeMovement(testUnit, occupiedDestination);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.DESTINATION_OCCUPIED);
    });

    test('should reject movement outside map bounds', async () => {
      const outOfBounds = { x: -1, y: 5 };
      const result = await movementSystem.executeMovement(testUnit, outOfBounds);

      expect(result.success).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
    });

    test('should call completion callback on successful movement', async () => {
      const onComplete = jest.fn();
      const destination = { x: 2, y: 4 };

      await movementSystem.executeMovement(testUnit, destination, { onComplete });

      expect(onComplete).toHaveBeenCalledWith(
        testUnit,
        expect.objectContaining({
          success: true,
          finalPosition: destination,
        })
      );
    });

    test('should call completion callback on failed movement', async () => {
      const onComplete = jest.fn();
      const unreachableDestination = { x: 9, y: 9 };

      await movementSystem.executeMovement(testUnit, unreachableDestination, { onComplete });

      expect(onComplete).toHaveBeenCalledWith(
        testUnit,
        expect.objectContaining({
          success: false,
          error: MovementError.DESTINATION_UNREACHABLE,
        })
      );
    });

    test('should update movement state during execution', async () => {
      const destination = { x: 2, y: 4 };

      // Since animation is disabled in test config, movement completes instantly
      const result = await movementSystem.executeMovement(testUnit, destination);

      // Check that movement completed successfully
      expect(result.success).toBe(true);
      expect(movementSystem.isMovementInProgress()).toBe(false);
      expect(movementSystem.getCurrentState().isMoving).toBe(false);
    });
  });

  describe('Movement Cancellation and Selection Management', () => {
    test('should cancel movement selection', () => {
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      movementSystem.cancelMovement();

      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.getCurrentState().movementMode).toBe('none');
      expect(movementSystem.getCurrentState().movementRange).toEqual([]);
    });

    test('should cancel active movement execution', async () => {
      const destination = { x: 2, y: 4 };
      const executionPromise = movementSystem.executeMovement(testUnit, destination);

      // Cancel movement while it's executing
      movementSystem.cancelMovement();

      const result = await executionPromise;

      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.isMovementInProgress()).toBe(false);
    });

    test('should deselect character when clicking on same character again', () => {
      // First selection
      const result1 = movementSystem.selectCharacterForMovement(testUnit);
      expect(result1.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);
      expect(movementSystem.isCharacterSelected(testUnit)).toBe(true);

      // Second selection (deselection)
      const result2 = movementSystem.selectCharacterForMovement(testUnit);
      expect(result2.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.isCharacterSelected(testUnit)).toBe(false);
    });

    test('should not deselect when allowDeselection is false', () => {
      // First selection
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      // Second selection with deselection disabled
      const result = movementSystem.selectCharacterForMovement(testUnit, false);
      expect(result.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit); // Should remain selected
    });

    test('should switch to different character when selecting another character', () => {
      const secondUnit = testUnits[1];

      // Select first character
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      // Select second character (should switch)
      const result = movementSystem.selectCharacterForMovement(secondUnit);
      expect(result.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(secondUnit);
      expect(movementSystem.isCharacterSelected(secondUnit)).toBe(true);
      expect(movementSystem.isCharacterSelected(testUnit)).toBe(false);
    });

    test('should handle right-click cancellation', () => {
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      movementSystem.handleRightClickCancellation();

      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.getCurrentState().movementMode).toBe('none');
      expect(movementSystem.getCurrentState().movementRange).toEqual([]);
    });

    test('should handle right-click cancellation during movement execution', async () => {
      const destination = { x: 2, y: 4 };
      const executionPromise = movementSystem.executeMovement(testUnit, destination);

      // Right-click cancel while movement is executing
      movementSystem.handleRightClickCancellation();

      const result = await executionPromise;

      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.isMovementInProgress()).toBe(false);
    });

    test('should clear movement highlights and paths when cancelling', () => {
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.showMovementPath({ x: 2, y: 4 });

      const stateBefore = movementSystem.getCurrentState();
      expect(stateBefore.movementRange.length).toBeGreaterThan(0);
      expect(stateBefore.currentPath.length).toBeGreaterThan(0);

      movementSystem.cancelMovement();

      const stateAfter = movementSystem.getCurrentState();
      expect(stateAfter.movementRange).toEqual([]);
      expect(stateAfter.currentPath).toEqual([]);
    });

    test('should call selection change callback on deselection', () => {
      const onSelectionChange = jest.fn();
      movementSystem.setOnSelectionChange(onSelectionChange);

      // Select character
      movementSystem.selectCharacterForMovement(testUnit);
      expect(onSelectionChange).toHaveBeenCalledWith(testUnit);

      // Deselect character
      movementSystem.deselectCharacter();
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });

    test('should call selection change callback on character switching', () => {
      const onSelectionChange = jest.fn();
      movementSystem.setOnSelectionChange(onSelectionChange);

      const secondUnit = testUnits[1];

      // Select first character
      movementSystem.selectCharacterForMovement(testUnit);
      expect(onSelectionChange).toHaveBeenCalledWith(testUnit);

      // Switch to second character
      movementSystem.switchToCharacter(secondUnit);
      expect(onSelectionChange).toHaveBeenCalledWith(secondUnit);
    });

    test('should handle deselection when no character is selected', () => {
      expect(movementSystem.getSelectedCharacter()).toBeNull();

      // Should not throw error
      expect(() => {
        movementSystem.deselectCharacter();
      }).not.toThrow();

      expect(movementSystem.getSelectedCharacter()).toBeNull();
    });

    test('should maintain proper state during character switching', () => {
      const secondUnit = testUnits[1];

      // Select first character
      movementSystem.selectCharacterForMovement(testUnit);
      const firstState = movementSystem.getCurrentState();
      expect(firstState.selectedCharacter).toBe(testUnit);
      expect(firstState.movementMode).toBe('selecting');
      expect(firstState.movementRange.length).toBeGreaterThan(0);

      // Switch to second character
      movementSystem.switchToCharacter(secondUnit);
      const secondState = movementSystem.getCurrentState();
      expect(secondState.selectedCharacter).toBe(secondUnit);
      expect(secondState.movementMode).toBe('selecting');
      expect(secondState.movementRange.length).toBeGreaterThan(0);

      // Movement ranges should be different (assuming different positions)
      expect(secondState.movementRange).not.toEqual(firstState.movementRange);
    });

    test('should emit events when using event emitter', () => {
      const eventEmitter = new Phaser.Events.EventEmitter();
      const characterDeselectedSpy = jest.fn();
      const characterSwitchedSpy = jest.fn();
      const movementCancelledSpy = jest.fn();

      eventEmitter.on('character-deselected', characterDeselectedSpy);
      eventEmitter.on('character-switched', characterSwitchedSpy);
      eventEmitter.on('movement-cancelled', movementCancelledSpy);

      movementSystem.setEventEmitter(eventEmitter);

      // Test deselection event
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.deselectCharacter();
      expect(characterDeselectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          character: testUnit,
          timestamp: expect.any(Number),
        })
      );

      // Test character switching event
      const secondUnit = testUnits[1];
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.switchToCharacter(secondUnit);
      expect(characterSwitchedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousCharacter: testUnit,
          newCharacter: secondUnit,
          timestamp: expect.any(Number),
        })
      );

      // Test cancellation event
      movementSystem.cancelMovement();
      expect(movementCancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Utility Methods', () => {
    test('should check if character can move', () => {
      expect(movementSystem.canCharacterMove(testUnit)).toBe(true);

      const movedUnit = createTestUnit('moved', { x: 1, y: 1 }, true);
      expect(movementSystem.canCharacterMove(movedUnit)).toBe(false);
    });

    test('should check if position is reachable', () => {
      const nearPosition = { x: 2, y: 4 }; // Within movement range
      const farPosition = { x: 9, y: 9 }; // Outside movement range

      expect(movementSystem.isPositionReachable(testUnit, nearPosition)).toBe(true);
      expect(movementSystem.isPositionReachable(testUnit, farPosition)).toBe(false);
    });

    test('should calculate movement cost to position', () => {
      const nearPosition = { x: 2, y: 4 }; // 2 tiles south
      const farPosition = { x: 9, y: 9 }; // Too far

      const nearCost = movementSystem.getMovementCostToPosition(testUnit, nearPosition);
      const farCost = movementSystem.getMovementCostToPosition(testUnit, farPosition);

      expect(nearCost).toBeGreaterThan(0);
      expect(farCost).toBe(-1); // Unreachable
    });

    test('should get current movement state', () => {
      const initialState = movementSystem.getCurrentState();
      expect(initialState.selectedCharacter).toBeNull();
      expect(initialState.movementMode).toBe('none');

      movementSystem.selectCharacterForMovement(testUnit);
      const selectedState = movementSystem.getCurrentState();
      expect(selectedState.selectedCharacter).toBe(testUnit);
      expect(selectedState.movementMode).toBe('selecting');
    });
  });

  describe('Event Callbacks', () => {
    test('should call selection change callback', () => {
      const onSelectionChange = jest.fn();
      movementSystem.setOnSelectionChange(onSelectionChange);

      movementSystem.selectCharacterForMovement(testUnit);
      expect(onSelectionChange).toHaveBeenCalledWith(testUnit);

      movementSystem.cancelMovement();
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });

    test('should call movement state change callback', () => {
      const onStateChange = jest.fn();
      movementSystem.setOnMovementStateChange(onStateChange);

      movementSystem.selectCharacterForMovement(testUnit);
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCharacter: testUnit,
          movementMode: 'selecting',
        })
      );
    });

    test('should call movement completion callback', async () => {
      const onMovementComplete = jest.fn();
      movementSystem.setOnMovementComplete(onMovementComplete);

      const destination = { x: 2, y: 4 };
      await movementSystem.executeMovement(testUnit, destination);

      expect(onMovementComplete).toHaveBeenCalledWith(
        testUnit,
        expect.objectContaining({
          success: true,
          finalPosition: destination,
        })
      );
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration', () => {
      const newConfig = {
        enableVisualFeedback: false,
        enablePathPreview: false,
      };

      expect(() => {
        movementSystem.updateConfig(newConfig);
      }).not.toThrow();
    });

    test('should update terrain costs', () => {
      const newTerrainCosts = {
        '0': { movementCost: 2, isPassable: true },
        '1': { movementCost: 3, isPassable: true },
      };

      expect(() => {
        movementSystem.updateConfig({ terrainCosts: newTerrainCosts });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing map data gracefully', () => {
      const newSystem = new MovementSystem(mockScene);
      // Don't initialize with map data

      const result = newSystem.selectCharacterForMovement(testUnit);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_POSITION);
    });

    test('should handle invalid unit data gracefully', () => {
      const invalidUnit = {
        id: 'invalid',
        name: 'Invalid Unit',
        position: { x: 1, y: 1 },
        stats: null, // Invalid stats
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      } as any;

      const result = movementSystem.selectCharacterForMovement(invalidUnit);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(MovementError.INVALID_CHARACTER_SELECTION);
    });

    test('should handle concurrent movement attempts', () => {
      // Start first movement
      movementSystem.selectCharacterForMovement(testUnit);

      // Try to select another character while first is selected
      const secondUnit = testUnits[1];
      const result = movementSystem.selectCharacterForMovement(secondUnit);

      // Should succeed (new selection replaces old one)
      expect(result.valid).toBe(true);
      expect(movementSystem.getSelectedCharacter()).toBe(secondUnit);
    });
  });

  describe('Resource Cleanup', () => {
    test('should clean up resources on destroy', () => {
      movementSystem.selectCharacterForMovement(testUnit);
      expect(movementSystem.getSelectedCharacter()).toBe(testUnit);

      movementSystem.destroy();

      expect(movementSystem.getSelectedCharacter()).toBeNull();
      expect(movementSystem.getCurrentState().movementMode).toBe('none');
    });

    test('should handle multiple destroy calls gracefully', () => {
      expect(() => {
        movementSystem.destroy();
        movementSystem.destroy();
      }).not.toThrow();
    });
  });
});
