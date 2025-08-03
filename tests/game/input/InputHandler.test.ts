/**
 * Unit tests for InputHandler
 * Tests input processing, validation, and event handling
 */

import {
  InputHandler,
  InputConfig,
  ClickInfo,
  KeyboardInfo,
} from '../../../game/src/input/InputHandler';
import { GameState, Unit, Position, GameplayError } from '../../../game/src/types/gameplay';

// Mock Phaser scene and input
const mockScene = {
  input: {
    on: jest.fn(),
    off: jest.fn(),
    keyboard: {
      on: jest.fn(),
      off: jest.fn(),
    },
  },
  cameras: {
    main: {
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
    },
  },
} as any;

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
} as any;

// Test data
const mockUnit: Unit = {
  id: 'test-unit-1',
  name: 'Test Unit',
  position: { x: 2, y: 3 },
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

const mockGameState: GameState = {
  currentTurn: 1,
  activePlayer: 'player',
  phase: 'select',
  selectedUnit: undefined,
  gameResult: null,
  turnOrder: [mockUnit],
  activeUnitIndex: 0,
};

describe('InputHandler', () => {
  let inputHandler: InputHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    inputHandler = new InputHandler(mockScene, undefined, mockEventEmitter);
  });

  afterEach(() => {
    inputHandler.destroy();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      const config = inputHandler.getConfig();

      expect(config.mouseEnabled).toBe(true);
      expect(config.keyboardEnabled).toBe(true);
      expect(config.touchEnabled).toBe(true);
      expect(config.doubleClickTime).toBe(300);
      expect(config.dragThreshold).toBe(10);
      expect(config.validationEnabled).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      const customConfig: Partial<InputConfig> = {
        mouseEnabled: false,
        doubleClickTime: 500,
        dragThreshold: 20,
      };

      const customInputHandler = new InputHandler(mockScene, customConfig, mockEventEmitter);
      const config = customInputHandler.getConfig();

      expect(config.mouseEnabled).toBe(false);
      expect(config.doubleClickTime).toBe(500);
      expect(config.dragThreshold).toBe(20);
      expect(config.keyboardEnabled).toBe(true); // Should keep default

      customInputHandler.destroy();
    });

    test('should emit input-initialized event', () => {
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-initialized', {
        config: expect.any(Object),
      });
    });

    test('should setup input event listeners', () => {
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration successfully', () => {
      const newConfig: Partial<InputConfig> = {
        doubleClickTime: 400,
        dragThreshold: 15,
      };

      const result = inputHandler.updateConfig(newConfig);

      expect(result.success).toBe(true);
      expect(inputHandler.getConfig().doubleClickTime).toBe(400);
      expect(inputHandler.getConfig().dragThreshold).toBe(15);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-config-updated', {
        config: expect.any(Object),
      });
    });

    test('should return current configuration', () => {
      const config = inputHandler.getConfig();

      expect(config).toEqual(
        expect.objectContaining({
          mouseEnabled: true,
          keyboardEnabled: true,
          touchEnabled: true,
          doubleClickTime: 300,
          dragThreshold: 10,
          validationEnabled: true,
        })
      );
    });
  });

  describe('Enable/Disable Functionality', () => {
    test('should enable input handling', () => {
      inputHandler.disable();
      inputHandler.enable();

      expect(inputHandler.isInputEnabled()).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-enabled');
    });

    test('should disable input handling', () => {
      inputHandler.disable();

      expect(inputHandler.isInputEnabled()).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-disabled');
    });

    test('should start enabled by default', () => {
      expect(inputHandler.isInputEnabled()).toBe(true);
    });
  });

  describe('Tile Size Management', () => {
    test('should set tile size successfully', () => {
      const result = inputHandler.setTileSize(64);

      expect(result.success).toBe(true);
    });

    test('should reject invalid tile size', () => {
      const result = inputHandler.setTileSize(-10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
      expect(result.message).toBe('Invalid tile size');
    });

    test('should reject zero tile size', () => {
      const result = inputHandler.setTileSize(0);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('Game State Management', () => {
    test('should set game state for validation', () => {
      inputHandler.setGameState(mockGameState);

      // No direct way to test this, but it should not throw
      expect(() => inputHandler.setGameState(mockGameState)).not.toThrow();
    });
  });

  describe('Callback Management', () => {
    test('should set character selection callback', () => {
      const callback = jest.fn();
      inputHandler.setCharacterSelectionCallback(callback);

      // No direct way to test this, but it should not throw
      expect(() => inputHandler.setCharacterSelectionCallback(callback)).not.toThrow();
    });

    test('should set tile selection callback', () => {
      const callback = jest.fn();
      inputHandler.setTileSelectionCallback(callback);

      expect(() => inputHandler.setTileSelectionCallback(callback)).not.toThrow();
    });

    test('should set camera control callback', () => {
      const callback = jest.fn();
      inputHandler.setCameraControlCallback(callback);

      expect(() => inputHandler.setCameraControlCallback(callback)).not.toThrow();
    });

    test('should set shortcut callback', () => {
      const callback = jest.fn();
      inputHandler.setShortcutCallback(callback);

      expect(() => inputHandler.setShortcutCallback(callback)).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      inputHandler.setGameState(mockGameState);
    });

    test('should validate input during player turn', () => {
      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        gridPosition: { x: 3, y: 3 },
        type: 'single',
        timestamp: Date.now(),
      };

      // Access private method through any cast for testing
      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(true);
    });

    test('should reject input during enemy turn', () => {
      const enemyGameState: GameState = {
        ...mockGameState,
        activePlayer: 'enemy',
      };
      inputHandler.setGameState(enemyGameState);

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Not player turn');
      expect(validation.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should reject input when game has ended', () => {
      const endedGameState: GameState = {
        ...mockGameState,
        gameResult: 'victory',
      };
      inputHandler.setGameState(endedGameState);

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Game has ended');
      expect(validation.error).toBe(GameplayError.INVALID_TURN_STATE);
    });

    test('should reject input during enemy phase', () => {
      const enemyPhaseState: GameState = {
        ...mockGameState,
        phase: 'enemy',
      };
      inputHandler.setGameState(enemyPhaseState);

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Enemy turn in progress');
      expect(validation.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should reject selecting enemy unit during player turn', () => {
      const enemyUnit: Unit = {
        ...mockUnit,
        id: 'enemy-unit',
        faction: 'enemy',
      };

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        unit: enemyUnit,
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Cannot select enemy unit');
      expect(validation.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should allow right-clicking enemy unit for info', () => {
      const enemyUnit: Unit = {
        ...mockUnit,
        id: 'enemy-unit',
        faction: 'enemy',
      };

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        unit: enemyUnit,
        type: 'right',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(true);
    });

    test('should reject selecting unit that has already acted', () => {
      const actedUnit: Unit = {
        ...mockUnit,
        hasActed: true,
      };

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        unit: actedUnit,
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Unit has already acted');
      expect(validation.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should allow right-clicking unit that has already acted', () => {
      const actedUnit: Unit = {
        ...mockUnit,
        hasActed: true,
      };

      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        unit: actedUnit,
        type: 'right',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Coordinate Conversion', () => {
    test('should convert screen to world coordinates', () => {
      mockScene.cameras.main.scrollX = 100;
      mockScene.cameras.main.scrollY = 50;
      mockScene.cameras.main.zoom = 2;

      const worldPos = (inputHandler as any).screenToWorldPosition(200, 150);

      expect(worldPos.x).toBe(150); // (200 + 100) / 2
      expect(worldPos.y).toBe(100); // (150 + 50) / 2
    });

    test('should convert world to grid coordinates', () => {
      inputHandler.setTileSize(32);

      const gridPos = (inputHandler as any).worldToGridPosition({ x: 100, y: 150 });

      expect(gridPos.x).toBe(3); // Math.floor(100 / 32)
      expect(gridPos.y).toBe(4); // Math.floor(150 / 32)
    });

    test('should calculate distance between positions', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };

      const distance = (inputHandler as any).getDistance(pos1, pos2);

      expect(distance).toBe(5); // 3-4-5 triangle
    });
  });

  describe('Camera Control Processing', () => {
    test('should process arrow key camera controls', () => {
      const cameraCallback = jest.fn();
      inputHandler.setCameraControlCallback(cameraCallback);

      const keyInfo: KeyboardInfo = {
        key: 'ArrowUp',
        keyCode: 38,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processCameraControls(keyInfo);

      expect(cameraCallback).toHaveBeenCalledWith('up', 16);
    });

    test('should process WASD camera controls', () => {
      const cameraCallback = jest.fn();
      inputHandler.setCameraControlCallback(cameraCallback);

      const keyInfo: KeyboardInfo = {
        key: 'w',
        keyCode: 87,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processCameraControls(keyInfo);

      expect(cameraCallback).toHaveBeenCalledWith('up', 16);
    });

    test('should not call camera callback if not set', () => {
      const keyInfo: KeyboardInfo = {
        key: 'ArrowUp',
        keyCode: 38,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      expect(() => (inputHandler as any).processCameraControls(keyInfo)).not.toThrow();
    });
  });

  describe('Shortcut Processing', () => {
    test('should process escape shortcut', () => {
      const shortcutCallback = jest.fn();
      inputHandler.setShortcutCallback(shortcutCallback);

      const keyInfo: KeyboardInfo = {
        key: 'Escape',
        keyCode: 27,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processShortcuts(keyInfo);

      expect(shortcutCallback).toHaveBeenCalledWith('cancel', keyInfo);
    });

    test('should process space shortcut', () => {
      const shortcutCallback = jest.fn();
      inputHandler.setShortcutCallback(shortcutCallback);

      const keyInfo: KeyboardInfo = {
        key: ' ',
        keyCode: 32,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processShortcuts(keyInfo);

      expect(shortcutCallback).toHaveBeenCalledWith('confirm', keyInfo);
    });

    test('should process ctrl+z shortcut', () => {
      const shortcutCallback = jest.fn();
      inputHandler.setShortcutCallback(shortcutCallback);

      const keyInfo: KeyboardInfo = {
        key: 'z',
        keyCode: 90,
        modifiers: { shift: false, ctrl: true, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processShortcuts(keyInfo);

      expect(shortcutCallback).toHaveBeenCalledWith('undo', keyInfo);
    });

    test('should process shift+tab shortcut', () => {
      const shortcutCallback = jest.fn();
      inputHandler.setShortcutCallback(shortcutCallback);

      const keyInfo: KeyboardInfo = {
        key: 'Tab',
        keyCode: 9,
        modifiers: { shift: true, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processShortcuts(keyInfo);

      expect(shortcutCallback).toHaveBeenCalledWith('prev-unit', keyInfo);
    });

    test('should pass through unknown shortcuts', () => {
      const shortcutCallback = jest.fn();
      inputHandler.setShortcutCallback(shortcutCallback);

      const keyInfo: KeyboardInfo = {
        key: 'x',
        keyCode: 88,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      (inputHandler as any).processShortcuts(keyInfo);

      expect(shortcutCallback).toHaveBeenCalledWith('X', keyInfo);
    });
  });

  describe('Event Emission', () => {
    test('should emit unit-detection-requested when getting unit at position', () => {
      const position: Position = { x: 100, y: 100 };

      (inputHandler as any).getUnitAtPosition(position);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('unit-detection-requested', {
        position,
      });
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      inputHandler.destroy();

      expect(inputHandler.isInputEnabled()).toBe(false);
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerdown');
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerup');
      expect(mockScene.input.off).toHaveBeenCalledWith('pointermove');
      expect(mockScene.input.off).toHaveBeenCalledWith('wheel');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('input-destroyed');
    });

    test('should remove keyboard listeners on destroy', () => {
      inputHandler.destroy();

      expect(mockScene.input.keyboard.off).toHaveBeenCalledWith('keydown');
      expect(mockScene.input.keyboard.off).toHaveBeenCalledWith('keyup');
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing keyboard input gracefully', () => {
      const sceneWithoutKeyboard = {
        ...mockScene,
        input: {
          ...mockScene.input,
          keyboard: null,
        },
      };

      expect(
        () => new InputHandler(sceneWithoutKeyboard, undefined, mockEventEmitter)
      ).not.toThrow();
    });

    test('should handle validation without game state', () => {
      const clickInfo: ClickInfo = {
        worldPosition: { x: 100, y: 100 },
        screenPosition: { x: 100, y: 100 },
        type: 'single',
        timestamp: Date.now(),
      };

      const validation = (inputHandler as any).validateInput(clickInfo);

      expect(validation.valid).toBe(true);
    });

    test('should handle camera controls without callback', () => {
      const keyInfo: KeyboardInfo = {
        key: 'ArrowUp',
        keyCode: 38,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      expect(() => (inputHandler as any).processCameraControls(keyInfo)).not.toThrow();
    });

    test('should handle shortcuts without callback', () => {
      const keyInfo: KeyboardInfo = {
        key: 'Escape',
        keyCode: 27,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now(),
      };

      expect(() => (inputHandler as any).processShortcuts(keyInfo)).not.toThrow();
    });
  });
});
