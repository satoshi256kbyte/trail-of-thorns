/**
 * Integration tests for GameplayScene movement system integration
 * Tests the complete workflow of character selection, movement, and input handling
 */

// Mock Phaser before importing GameplayScene
const mockAdd = {
  text: jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    setText: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
  }),
  graphics: jest.fn().mockReturnValue({
    fillStyle: jest.fn().mockReturnThis(),
    fillRect: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    clear: jest.fn().mockReturnThis(),
    lineStyle: jest.fn().mockReturnThis(),
    strokeRect: jest.fn().mockReturnThis(),
  }),
  sprite: jest.fn().mockReturnValue({
    setScale: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setTint: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  }),
  container: jest.fn().mockReturnValue({
    setScrollFactor: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    setVisible: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  }),
};

const mockCameras = {
  main: {
    width: 1920,
    height: 1080,
    setZoom: jest.fn(),
    setBounds: jest.fn(),
    setScroll: jest.fn(),
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
  },
};

const mockInput = {
  keyboard: {
    createCursorKeys: jest.fn().mockReturnValue({}),
    addKeys: jest.fn().mockReturnValue({}),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    addKey: jest.fn().mockReturnValue({
      once: jest.fn(),
      destroy: jest.fn(),
    }),
  },
  on: jest.fn(),
  off: jest.fn(),
  activePointer: {
    x: 0,
    y: 0,
    isDown: false,
    button: 0,
    rightButtonDown: jest.fn().mockReturnValue(false),
  },
};

const mockLoad = {
  json: jest.fn(),
  on: jest.fn(),
};

const mockCache = {
  json: {
    get: jest.fn().mockReturnValue({
      width: 12,
      height: 8,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: [
            [1, 1],
            [1, 1],
          ],
          visible: true,
          opacity: 1.0,
        },
      ],
      playerSpawns: [{ x: 1, y: 6 }],
      enemySpawns: [{ x: 9, y: 1 }],
    }),
  },
};

const mockEvents = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockData = {
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
};

const mockScale = {
  width: 1920,
  height: 1080,
};

const mockTweens = {
  add: jest.fn().mockReturnValue({
    stop: jest.fn(),
    progress: 0,
  }),
};

const mockMake = {
  tilemap: jest.fn().mockReturnValue({
    addTilesetImage: jest.fn().mockReturnValue({}),
    createLayer: jest.fn().mockReturnValue({
      setAlpha: jest.fn(),
      setDepth: jest.fn(),
    }),
    destroy: jest.fn(),
  }),
};

const mockTextures = {
  exists: jest.fn().mockReturnValue(false),
};

jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(function (this: any, config: any) {
    this.scene = { key: config.key, start: jest.fn() };
    this.add = mockAdd;
    this.cameras = mockCameras;
    this.input = mockInput;
    this.load = mockLoad;
    this.cache = mockCache;
    this.events = mockEvents;
    this.data = mockData;
    this.scale = mockScale;
    this.tweens = mockTweens;
    this.make = mockMake;
    this.textures = mockTextures;
    return this;
  }),
}));

// Mock all manager classes
const mockGameStateManager = {
  initializeTurnOrder: jest.fn().mockReturnValue({ success: true }),
  getGameState: jest.fn().mockReturnValue({
    currentTurn: 1,
    activePlayer: 'player',
    phase: 'select',
    selectedUnit: undefined,
    gameResult: null,
    turnOrder: [],
    activeUnitIndex: 0,
  }),
  selectUnit: jest.fn().mockReturnValue({ success: true }),
  getSelectedUnit: jest.fn().mockReturnValue(undefined),
  isPlayerTurn: jest.fn().mockReturnValue(true),
  nextTurn: jest.fn().mockReturnValue({ success: true }),
  getPlayerUnits: jest.fn().mockReturnValue([]),
  reset: jest.fn(),
  canCharacterMove: jest.fn().mockReturnValue(true),
  markCharacterMoved: jest.fn().mockReturnValue({ success: true }),
};

const mockCameraController = {
  setMapBounds: jest.fn().mockReturnValue({ success: true }),
  enableKeyboardControls: jest.fn().mockReturnValue({ success: true }),
  enableMouseControls: jest.fn().mockReturnValue({ success: true }),
  update: jest.fn(),
  moveCamera: jest.fn().mockReturnValue({ success: true }),
  focusOnPosition: jest.fn().mockReturnValue({ success: true }),
  destroy: jest.fn(),
};

const mockUIManager = {
  createUI: jest.fn(),
  updateUI: jest.fn(),
  updateTurnDisplay: jest.fn(),
  showCharacterInfo: jest.fn(),
  hideCharacterInfo: jest.fn(),
  destroy: jest.fn(),
};

const mockInputHandler = {
  setTileSize: jest.fn().mockReturnValue({ success: true }),
  setGameState: jest.fn(),
  setCharacterSelectionCallback: jest.fn(),
  setTileSelectionCallback: jest.fn(),
  setCameraControlCallback: jest.fn(),
  setShortcutCallback: jest.fn(),
  setUnitDetectionCallback: jest.fn(),
  destroy: jest.fn(),
};

const mockMapRenderer = {
  loadMap: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
  destroy: jest.fn(),
};

const mockCharacterManager = {
  loadCharacters: jest.fn().mockReturnValue({ success: true }),
  selectCharacter: jest.fn().mockReturnValue({ success: true }),
  getCharacterById: jest.fn().mockReturnValue(undefined),
  updateCharacterPosition: jest.fn().mockReturnValue({ success: true }),
  destroy: jest.fn(),
};

const mockMovementSystem = {
  initialize: jest.fn(),
  setGameStateManager: jest.fn(),
  updateUnits: jest.fn(),
  selectCharacterForMovement: jest.fn().mockReturnValue({ valid: true }),
  cancelMovement: jest.fn(),
  getSelectedCharacter: jest.fn().mockReturnValue(null),
  isCharacterSelected: jest.fn().mockReturnValue(false),
  isPositionReachable: jest.fn().mockReturnValue(true),
  executeMovement: jest.fn().mockResolvedValue({ success: true }),
  isMovementInProgress: jest.fn().mockReturnValue(false),
  setOnMovementComplete: jest.fn(),
  setOnSelectionChange: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('../../../game/src/systems/GameStateManager', () => ({
  GameStateManager: jest.fn().mockImplementation(() => mockGameStateManager),
}));

jest.mock('../../../game/src/systems/CameraController', () => ({
  CameraController: jest.fn().mockImplementation(() => mockCameraController),
}));

jest.mock('../../../game/src/ui/UIManager', () => ({
  UIManager: jest.fn().mockImplementation(() => mockUIManager),
}));

jest.mock('../../../game/src/input/InputHandler', () => ({
  InputHandler: jest.fn().mockImplementation(() => mockInputHandler),
}));

jest.mock('../../../game/src/rendering/MapRenderer', () => ({
  MapRenderer: jest.fn().mockImplementation(() => mockMapRenderer),
}));

jest.mock('../../../game/src/systems/CharacterManager', () => ({
  CharacterManager: jest.fn().mockImplementation(() => mockCharacterManager),
}));

jest.mock('../../../game/src/systems/MovementSystem', () => ({
  MovementSystem: jest.fn().mockImplementation(() => mockMovementSystem),
}));

// Mock DebugManager
jest.mock('../../../game/src/debug/DebugManager', () => ({
  DebugManager: jest.fn().mockImplementation(() => ({
    setMapData: jest.fn(),
    setCharacters: jest.fn(),
    setGameState: jest.fn(),
    enableDebugMode: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  })),
}));

// Mock SceneTransition
jest.mock('../../../game/src/utils/SceneTransition', () => ({
  SceneTransition: {
    createEntranceTransition: jest.fn(),
    transitionTo: jest.fn().mockResolvedValue(undefined),
  },
  TransitionType: {
    FADE_IN: 'FADE_IN',
    FADE_OUT: 'FADE_OUT',
    SLIDE_RIGHT: 'SLIDE_RIGHT',
    ZOOM_IN: 'ZOOM_IN',
  },
}));

import { GameplayScene } from '../../../game/src/scenes/GameplayScene';

describe('GameplayScene Movement System Integration', () => {
  let scene: GameplayScene;
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Mock stage data for testing
  const createMockStageData = () => ({
    id: 'test-stage-movement',
    name: 'Movement Test Stage',
    description: 'Stage for testing movement integration',
    mapData: {
      width: 12,
      height: 8,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background' as const,
          data: Array(8)
            .fill(null)
            .map(() => Array(12).fill(1)),
          visible: true,
          opacity: 1.0,
        },
      ],
      playerSpawns: [
        { x: 1, y: 6 },
        { x: 2, y: 6 },
      ],
      enemySpawns: [
        { x: 9, y: 1 },
        { x: 10, y: 1 },
      ],
    },
    playerUnits: [
      {
        id: 'player-1',
        name: 'Test Hero',
        position: { x: 1, y: 6 },
        stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player' as const,
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'player-2',
        name: 'Test Mage',
        position: { x: 2, y: 6 },
        stats: { maxHP: 80, maxMP: 80, attack: 30, defense: 10, speed: 10, movement: 2 },
        currentHP: 80,
        currentMP: 80,
        faction: 'player' as const,
        hasActed: false,
        hasMoved: false,
      },
    ],
    enemyUnits: [
      {
        id: 'enemy-1',
        name: 'Test Orc',
        position: { x: 9, y: 1 },
        stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 12, speed: 8, movement: 2 },
        currentHP: 90,
        currentMP: 20,
        faction: 'enemy' as const,
        hasActed: false,
        hasMoved: false,
      },
    ],
    victoryConditions: [
      {
        type: 'defeat_all' as const,
        description: 'Defeat all enemy units',
      },
    ],
  });

  // Helper function to wait for scene initialization
  const waitForInitialization = async (scene: GameplayScene, timeout = 1000): Promise<void> => {
    const startTime = Date.now();
    while (!scene.isSceneInitialized() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();

    // Create new scene instance
    scene = new GameplayScene();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Movement System Initialization', () => {
    test('should initialize MovementSystem during scene creation', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify MovementSystem was created
      const { MovementSystem } = require('../../../game/src/systems/MovementSystem');
      expect(MovementSystem).toHaveBeenCalledWith(
        scene,
        {
          enableVisualFeedback: true,
          enablePathPreview: true,
          enableMovementAnimation: true,
        },
        mockEvents
      );

      // Verify MovementSystem was initialized with map data
      expect(mockMovementSystem.initialize).toHaveBeenCalledWith(mockStageData.mapData);
      expect(mockMovementSystem.setGameStateManager).toHaveBeenCalledWith(mockGameStateManager);
    });

    test('should update MovementSystem with all units', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify MovementSystem was updated with units (GameplayScene creates its own mock units)
      expect(mockMovementSystem.updateUnits).toHaveBeenCalledWith(expect.any(Array));

      // Verify the call was made with an array containing both player and enemy units
      const callArgs = mockMovementSystem.updateUnits.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ faction: 'player' }),
          expect.objectContaining({ faction: 'enemy' }),
        ])
      );
      expect(callArgs.length).toBeGreaterThan(0);
    });

    test('should setup movement system callbacks', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify callbacks were set
      expect(mockMovementSystem.setOnMovementComplete).toHaveBeenCalledWith(expect.any(Function));
      expect(mockMovementSystem.setOnSelectionChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Input Handler Integration', () => {
    test('should setup input callbacks for movement', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify input callbacks were set
      expect(mockInputHandler.setCharacterSelectionCallback).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(mockInputHandler.setTileSelectionCallback).toHaveBeenCalledWith(expect.any(Function));
      expect(mockInputHandler.setUnitDetectionCallback).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle character selection for movement', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the character selection callback
      const characterSelectionCallback =
        mockInputHandler.setCharacterSelectionCallback.mock.calls[0][0];

      // Test character selection
      const testUnit = mockStageData.playerUnits[0];
      characterSelectionCallback(testUnit, { type: 'single' });

      // Verify movement system was called
      expect(mockMovementSystem.selectCharacterForMovement).toHaveBeenCalledWith(testUnit, true);
      expect(mockGameStateManager.selectUnit).toHaveBeenCalledWith(testUnit);
      expect(mockCharacterManager.selectCharacter).toHaveBeenCalledWith(testUnit.id);
    });

    test('should handle character deselection', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the character selection callback
      const characterSelectionCallback =
        mockInputHandler.setCharacterSelectionCallback.mock.calls[0][0];

      // Test character deselection
      characterSelectionCallback(null, { type: 'single' });

      // Verify movement system was called
      expect(mockMovementSystem.cancelMovement).toHaveBeenCalled();
      expect(mockGameStateManager.selectUnit).toHaveBeenCalledWith(null);
      expect(mockCharacterManager.selectCharacter).toHaveBeenCalledWith(null);
    });

    test('should handle tile selection for movement', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Setup selected character
      const testUnit = mockStageData.playerUnits[0];
      mockMovementSystem.getSelectedCharacter.mockReturnValue(testUnit);

      // Get the tile selection callback
      const tileSelectionCallback = mockInputHandler.setTileSelectionCallback.mock.calls[0][0];

      // Test tile selection
      const targetPosition = { x: 3, y: 6 };
      tileSelectionCallback(targetPosition, { type: 'single' });

      // Verify movement execution
      expect(mockMovementSystem.isPositionReachable).toHaveBeenCalledWith(testUnit, targetPosition);
      expect(mockMovementSystem.executeMovement).toHaveBeenCalledWith(
        testUnit,
        targetPosition,
        expect.objectContaining({
          showPath: true,
          animate: true,
          onComplete: expect.any(Function),
        })
      );
    });

    test('should handle unit detection at world position', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the unit detection callback
      const unitDetectionCallback = mockInputHandler.setUnitDetectionCallback.mock.calls[0][0];

      // Test unit detection at player position
      const worldPosition = { x: 32, y: 192 }; // Grid position (1, 6) in world coordinates
      const detectedUnit = unitDetectionCallback(worldPosition);

      // Should return the player unit at that position
      expect(detectedUnit).toBeDefined();
      expect(detectedUnit?.id).toBe('player-1');
    });
  });

  describe('Keyboard Shortcuts for Movement', () => {
    test('should handle movement toggle shortcut (M key)', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Setup selected unit
      const testUnit = mockStageData.playerUnits[0];
      mockGameStateManager.getSelectedUnit.mockReturnValue(testUnit);

      // Get the shortcut callback
      const shortcutCallback = mockInputHandler.setShortcutCallback.mock.calls[0][0];

      // Test movement toggle
      shortcutCallback('M', { key: 'M' });

      // Verify movement system was called
      expect(mockMovementSystem.selectCharacterForMovement).toHaveBeenCalledWith(testUnit);
    });

    test('should handle cancel movement shortcut (C key)', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Setup selected character in movement system
      const testUnit = mockStageData.playerUnits[0];
      mockMovementSystem.getSelectedCharacter.mockReturnValue(testUnit);

      // Get the shortcut callback
      const shortcutCallback = mockInputHandler.setShortcutCallback.mock.calls[0][0];

      // Test cancel movement
      shortcutCallback('C', { key: 'C' });

      // Verify movement was cancelled
      expect(mockMovementSystem.cancelMovement).toHaveBeenCalled();
    });

    test('should handle escape key with movement priority', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Setup movement in progress
      mockMovementSystem.isMovementInProgress.mockReturnValue(true);

      // Get the shortcut callback
      const shortcutCallback = mockInputHandler.setShortcutCallback.mock.calls[0][0];

      // Test escape key
      shortcutCallback('ESCAPE', { key: 'Escape' });

      // Verify movement was cancelled first
      expect(mockMovementSystem.cancelMovement).toHaveBeenCalled();
    });

    test('should handle previous unit selection (Shift+Tab)', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      // Setup multiple available units
      mockGameStateManager.getPlayerUnits.mockReturnValue(mockStageData.playerUnits);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the shortcut callback
      const shortcutCallback = mockInputHandler.setShortcutCallback.mock.calls[0][0];

      // Test previous unit selection
      shortcutCallback('Shift+TAB', { key: 'Tab', modifiers: { shift: true } });

      // Verify unit selection
      expect(mockGameStateManager.selectUnit).toHaveBeenCalled();
      expect(mockCharacterManager.selectCharacter).toHaveBeenCalled();
    });
  });

  describe('Movement Completion Handling', () => {
    test('should handle successful movement completion', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the movement completion callback
      const movementCompleteCallback = mockMovementSystem.setOnMovementComplete.mock.calls[0][0];

      // Test successful movement completion
      const testUnit = mockStageData.playerUnits[0];
      const result = { success: true, finalPosition: { x: 3, y: 6 } };

      movementCompleteCallback(testUnit, result);

      // Verify character position was updated
      expect(mockCharacterManager.updateCharacterPosition).toHaveBeenCalledWith(
        testUnit.id,
        testUnit.position
      );

      // Verify movement system was updated with all units
      expect(mockMovementSystem.updateUnits).toHaveBeenCalled();

      // Verify event was emitted
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: testUnit,
          newPosition: result.finalPosition,
        })
      );
    });

    test('should handle failed movement completion', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the movement completion callback
      const movementCompleteCallback = mockMovementSystem.setOnMovementComplete.mock.calls[0][0];

      // Test failed movement completion
      const testUnit = mockStageData.playerUnits[0];
      const result = {
        success: false,
        error: 'DESTINATION_UNREACHABLE',
        message: 'Cannot reach destination',
      };

      movementCompleteCallback(testUnit, result);

      // Verify error event was emitted
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'character-movement-failed',
        expect.objectContaining({
          character: testUnit,
          error: result.error,
          message: result.message,
        })
      );

      // Verify character position was not updated
      expect(mockCharacterManager.updateCharacterPosition).not.toHaveBeenCalled();
    });
  });

  describe('Movement Selection Change Handling', () => {
    test('should handle movement selection change with camera focus', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      // Setup character manager to return position
      mockCharacterManager.getCharacterById.mockReturnValue({
        position: { x: 1, y: 6 },
      });

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the selection change callback
      const selectionChangeCallback = mockMovementSystem.setOnSelectionChange.mock.calls[0][0];

      // Test selection change
      const testUnit = mockStageData.playerUnits[0];
      selectionChangeCallback(testUnit);

      // Verify camera focus
      expect(mockCameraController.focusOnPosition).toHaveBeenCalledWith(48, 208); // (1*32+16, 6*32+16)
    });

    test('should handle movement selection cleared', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Get the selection change callback
      const selectionChangeCallback = mockMovementSystem.setOnSelectionChange.mock.calls[0][0];

      // Test selection cleared
      selectionChangeCallback(null);

      // Should not crash and should log message
      expect(consoleSpy).toHaveBeenCalledWith('Movement selection cleared');
    });
  });

  describe('Complete Movement Workflow Integration', () => {
    test('should handle complete character selection and movement workflow', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Step 1: Select character
      const characterSelectionCallback =
        mockInputHandler.setCharacterSelectionCallback.mock.calls[0][0];
      const testUnit = mockStageData.playerUnits[0];

      characterSelectionCallback(testUnit, { type: 'single' });

      expect(mockMovementSystem.selectCharacterForMovement).toHaveBeenCalledWith(testUnit, true);

      // Step 2: Select destination tile
      mockMovementSystem.getSelectedCharacter.mockReturnValue(testUnit);
      const tileSelectionCallback = mockInputHandler.setTileSelectionCallback.mock.calls[0][0];
      const targetPosition = { x: 3, y: 6 };

      tileSelectionCallback(targetPosition, { type: 'single' });

      expect(mockMovementSystem.executeMovement).toHaveBeenCalledWith(
        testUnit,
        targetPosition,
        expect.objectContaining({
          showPath: true,
          animate: true,
          onComplete: expect.any(Function),
        })
      );

      // Step 3: Handle movement completion
      const movementCompleteCallback = mockMovementSystem.setOnMovementComplete.mock.calls[0][0];
      const result = { success: true, finalPosition: targetPosition };

      movementCompleteCallback(testUnit, result);

      expect(mockCharacterManager.updateCharacterPosition).toHaveBeenCalledWith(
        testUnit.id,
        testUnit.position
      );
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.any(Object)
      );
    });

    test('should handle movement workflow with invalid character selection', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Mock movement system to reject selection
      mockMovementSystem.selectCharacterForMovement.mockReturnValue({
        valid: false,
        message: 'Character has already moved',
      });

      // Try to select character
      const characterSelectionCallback =
        mockInputHandler.setCharacterSelectionCallback.mock.calls[0][0];
      const testUnit = mockStageData.playerUnits[0];

      characterSelectionCallback(testUnit, { type: 'single' });

      // Should still allow selection for info display
      expect(mockGameStateManager.selectUnit).toHaveBeenCalledWith(testUnit);
      expect(mockCharacterManager.selectCharacter).toHaveBeenCalledWith(testUnit.id);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot select character for movement: Character has already moved'
      );
    });

    test('should handle movement workflow with unreachable destination', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Setup selected character
      const testUnit = mockStageData.playerUnits[0];
      mockMovementSystem.getSelectedCharacter.mockReturnValue(testUnit);
      mockMovementSystem.isPositionReachable.mockReturnValue(false);

      // Try to select unreachable destination
      const tileSelectionCallback = mockInputHandler.setTileSelectionCallback.mock.calls[0][0];
      const targetPosition = { x: 10, y: 1 }; // Far away position

      tileSelectionCallback(targetPosition, { type: 'single' });

      // Should not execute movement
      expect(mockMovementSystem.executeMovement).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Position is not reachable');
    });
  });

  describe('Scene Cleanup', () => {
    test('should cleanup movement system on scene destroy', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Destroy scene
      scene.destroy();

      // Verify movement system was destroyed
      expect(mockMovementSystem.destroy).toHaveBeenCalled();
    });
  });
});
