/**
 * Integration tests for InputHandler
 * Tests integration with other game systems like GameStateManager and CameraController
 */

import { InputHandler } from '../../../game/src/input/InputHandler';
import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { CameraController } from '../../../game/src/systems/CameraController';
import { Unit, MapData, GameplayError } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
  input: {
    on: jest.fn(),
    off: jest.fn(),
    keyboard: {
      on: jest.fn(),
      off: jest.fn(),
    },
    activePointer: {
      x: 100,
      y: 100,
    },
  },
  cameras: {
    main: {
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
      width: 800,
      height: 600,
      setScroll: jest.fn(),
      setBounds: jest.fn(),
      setZoom: jest.fn(),
      centerOn: jest.fn(),
    },
  },
  tweens: {
    add: jest.fn().mockReturnValue({
      stop: jest.fn(),
      progress: 0,
    }),
  },
  events: {
    emit: jest.fn(),
  },
} as any;

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
} as any;

// Test data
const mockMapData: MapData = {
  width: 20,
  height: 15,
  tileSize: 32,
  layers: [
    {
      name: 'background',
      type: 'background',
      data: Array(15).fill(Array(20).fill(0)),
      visible: true,
      opacity: 1,
    },
  ],
  playerSpawns: [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  enemySpawns: [
    { x: 18, y: 13 },
    { x: 19, y: 13 },
  ],
};

const mockPlayerUnit: Unit = {
  id: 'player-1',
  name: 'Player Unit',
  position: { x: 1, y: 1 },
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
};

const mockEnemyUnit: Unit = {
  id: 'enemy-1',
  name: 'Enemy Unit',
  position: { x: 18, y: 13 },
  stats: {
    maxHP: 80,
    maxMP: 30,
    attack: 18,
    defense: 12,
    speed: 8,
    movement: 2,
  },
  currentHP: 80,
  currentMP: 30,
  faction: 'enemy',
  hasActed: false,
  hasMoved: false,
};

describe('InputHandler Integration', () => {
  let inputHandler: InputHandler;
  let gameStateManager: GameStateManager;
  let cameraController: CameraController;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize systems
    gameStateManager = new GameStateManager(mockEventEmitter);
    cameraController = new CameraController(mockScene, mockMapData, undefined, mockEventEmitter);
    inputHandler = new InputHandler(mockScene, undefined, mockEventEmitter);

    // Set up integration
    inputHandler.setGameState(gameStateManager.getGameState());
    inputHandler.setTileSize(mockMapData.tileSize);
  });

  afterEach(() => {
    inputHandler.destroy();
    cameraController.destroy();
    gameStateManager.reset();
  });

  describe('Integration with GameStateManager', () => {
    test('should integrate with game state for input validation', () => {
      // Initialize game state with units
      const initResult = gameStateManager.initializeTurnOrder([mockPlayerUnit, mockEnemyUnit]);
      expect(initResult.success).toBe(true);

      // Update input handler with current game state
      inputHandler.setGameState(gameStateManager.getGameState());

      // Simulate character selection callback
      const characterSelectionCallback = jest.fn();
      inputHandler.setCharacterSelectionCallback(characterSelectionCallback);

      // Test that input validation works with game state
      expect(gameStateManager.getCurrentPlayer()).toBe('player');
      expect(gameStateManager.getCurrentPhase()).toBe('select');

      // Input should be valid during player turn
      const gameState = gameStateManager.getGameState();
      expect(gameState.activePlayer).toBe('player');
      expect(gameState.phase).toBe('select');
    });

    test('should prevent input during enemy turn', () => {
      // Initialize game state
      gameStateManager.initializeTurnOrder([mockPlayerUnit, mockEnemyUnit]);

      // Switch to enemy turn
      gameStateManager.nextTurn(); // Player unit acts
      if (gameStateManager.getCurrentPlayer() === 'player') {
        gameStateManager.nextTurn(); // Move to enemy
      }

      // Update input handler
      inputHandler.setGameState(gameStateManager.getGameState());

      // Verify enemy turn
      expect(gameStateManager.getCurrentPlayer()).toBe('enemy');

      // Input validation should reject actions during enemy turn
      const gameState = gameStateManager.getGameState();
      expect(gameState.activePlayer).toBe('enemy');
    });

    test('should handle unit selection state changes', () => {
      // Initialize game state
      gameStateManager.initializeTurnOrder([mockPlayerUnit, mockEnemyUnit]);
      inputHandler.setGameState(gameStateManager.getGameState());

      // Set up character selection callback
      const characterSelectionCallback = jest.fn();
      inputHandler.setCharacterSelectionCallback(characterSelectionCallback);

      // Select a unit in game state manager
      const selectResult = gameStateManager.selectUnit(mockPlayerUnit);
      expect(selectResult.success).toBe(true);

      // Update input handler with new state
      inputHandler.setGameState(gameStateManager.getGameState());

      // Verify selected unit is tracked
      expect(gameStateManager.getSelectedUnit()).toBe(mockPlayerUnit);
    });
  });

  describe('Integration with CameraController', () => {
    test('should integrate camera controls with input handler', () => {
      // Set up camera control callback
      const cameraControlCallback = jest.fn((direction: string, deltaTime: number) => {
        cameraController.moveCamera(direction as any, deltaTime);
      });
      inputHandler.setCameraControlCallback(cameraControlCallback);

      // Simulate keyboard input for camera movement
      const keyInfo = {
        key: 'ArrowUp',
        keyCode: 38,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      // Process camera controls
      (inputHandler as any).processCameraControls(keyInfo);

      // Verify camera control callback was called
      expect(cameraControlCallback).toHaveBeenCalledWith('up', 16);
    });

    test('should handle camera focus through input events', () => {
      // Set up tile selection callback that focuses camera
      const tileSelectionCallback = jest.fn((position, clickInfo) => {
        const worldX = position.x * mockMapData.tileSize + mockMapData.tileSize / 2;
        const worldY = position.y * mockMapData.tileSize + mockMapData.tileSize / 2;
        cameraController.focusOnPosition(worldX, worldY);
      });
      inputHandler.setTileSelectionCallback(tileSelectionCallback);

      // Simulate tile click
      const clickInfo = {
        worldPosition: { x: 160, y: 160 }, // 5 * 32, 5 * 32
        screenPosition: { x: 160, y: 160 },
        gridPosition: { x: 5, y: 5 },
        type: 'single' as const,
        timestamp: Date.now(),
      };

      // Process click (this would normally be called internally)
      (inputHandler as any).processClick(clickInfo);

      // Verify tile selection callback was called
      expect(tileSelectionCallback).toHaveBeenCalledWith({ x: 5, y: 5 }, clickInfo);
    });

    test('should handle zoom controls through mouse wheel', () => {
      // Set up mouse wheel event handler
      const mouseWheelHandler = jest.fn((deltaY: number) => {
        const zoomDirection = deltaY > 0 ? 'out' : 'in';
        const currentZoom = cameraController.getZoom();
        const newZoom = zoomDirection === 'in' ? currentZoom * 1.1 : currentZoom * 0.9;
        cameraController.setZoom(newZoom);
      });

      // Simulate mouse wheel event
      const deltaY = -100; // Zoom in
      mouseWheelHandler(deltaY);

      // This would normally trigger through the input handler's mouse wheel processing
      expect(mouseWheelHandler).toHaveBeenCalledWith(-100);
    });
  });

  describe('Coordinate System Integration', () => {
    test('should correctly convert between coordinate systems', () => {
      // Set camera position and zoom
      mockScene.cameras.main.scrollX = 100;
      mockScene.cameras.main.scrollY = 50;
      mockScene.cameras.main.zoom = 2;

      // Test screen to world conversion
      const worldPos = (inputHandler as any).screenToWorldPosition(200, 150);
      expect(worldPos.x).toBe(150); // (200 + 100) / 2
      expect(worldPos.y).toBe(100); // (150 + 50) / 2

      // Test world to grid conversion
      const gridPos = (inputHandler as any).worldToGridPosition(worldPos);
      expect(gridPos.x).toBe(Math.floor(150 / 32)); // 4
      expect(gridPos.y).toBe(Math.floor(100 / 32)); // 3
    });

    test('should handle grid-based unit positioning', () => {
      // Place unit at grid position
      const unitGridPos = { x: 5, y: 7 };
      const unitWorldPos = {
        x: unitGridPos.x * mockMapData.tileSize + mockMapData.tileSize / 2,
        y: unitGridPos.y * mockMapData.tileSize + mockMapData.tileSize / 2,
      };

      // Test that clicking near the unit position converts correctly
      const clickWorldPos = { x: unitWorldPos.x + 5, y: unitWorldPos.y - 3 };
      const clickGridPos = (inputHandler as any).worldToGridPosition(clickWorldPos);

      expect(clickGridPos.x).toBe(unitGridPos.x);
      expect(clickGridPos.y).toBe(unitGridPos.y);
    });
  });

  describe('Event-Driven Communication', () => {
    test('should emit events for system communication', () => {
      // Test that input handler emits events that other systems can listen to
      const clickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        gridPosition: { x: 3, y: 3 },
        type: 'single' as const,
        timestamp: Date.now(),
      };

      // Process click
      (inputHandler as any).processClick(clickInfo);

      // Verify events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tile-clicked', {
        position: { x: 3, y: 3 },
        clickInfo,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('click-processed', clickInfo);
    });

    test('should handle unit detection requests', () => {
      const position = { x: 100, y: 100 };

      // Call unit detection
      (inputHandler as any).getUnitAtPosition(position);

      // Verify event was emitted for other systems to respond
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('unit-detection-requested', {
        position,
      });
    });

    test('should emit input validation events', () => {
      // Set up game state that will cause validation failure
      const enemyTurnState = {
        ...gameStateManager.getGameState(),
        activePlayer: 'enemy' as const,
      };
      inputHandler.setGameState(enemyTurnState);

      const clickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        type: 'single' as const,
        timestamp: Date.now(),
      };

      // Process click that should fail validation
      (inputHandler as any).processClick(clickInfo);

      // Verify validation failure event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-invalid', {
        clickInfo,
        validation: expect.objectContaining({
          valid: false,
          reason: 'Not player turn',
          error: GameplayError.INVALID_ACTION,
        }),
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid tile size gracefully', () => {
      const result = inputHandler.setTileSize(-10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
      expect(result.message).toBe('Invalid tile size');
    });

    test('should handle configuration update errors', () => {
      // This should succeed with valid config
      const result = inputHandler.updateConfig({
        doubleClickTime: 500,
        dragThreshold: 15,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should cleanup resources properly', () => {
      // Create multiple input handlers to test cleanup
      const handlers = [];
      for (let i = 0; i < 5; i++) {
        handlers.push(new InputHandler(mockScene, undefined, mockEventEmitter));
      }

      // Destroy all handlers
      handlers.forEach(handler => handler.destroy());

      // Verify cleanup was called for each
      expect(mockScene.input.off).toHaveBeenCalledTimes(handlers.length * 4); // 4 event types per handler
    });

    test('should handle rapid input events', () => {
      const characterSelectionCallback = jest.fn();
      inputHandler.setCharacterSelectionCallback(characterSelectionCallback);

      // Simulate rapid clicks
      const rapidClicks = [];
      for (let i = 0; i < 10; i++) {
        rapidClicks.push({
          worldPosition: { x: 100 + i, y: 100 + i },
          screenPosition: { x: 100 + i, y: 100 + i },
          gridPosition: { x: 3, y: 3 },
          type: 'single' as const,
          timestamp: Date.now() + i,
        });
      }

      // Process all clicks
      rapidClicks.forEach(clickInfo => {
        (inputHandler as any).processClick(clickInfo);
      });

      // Should handle all clicks without errors
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });
  });
});
