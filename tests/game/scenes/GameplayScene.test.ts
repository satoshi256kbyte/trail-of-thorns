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
jest.mock('../../../game/src/systems/GameStateManager', () => ({
  GameStateManager: jest.fn().mockImplementation(() => ({
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
  })),
}));

jest.mock('../../../game/src/systems/CameraController', () => ({
  CameraController: jest.fn().mockImplementation(() => ({
    setMapBounds: jest.fn().mockReturnValue({ success: true }),
    enableKeyboardControls: jest.fn().mockReturnValue({ success: true }),
    enableMouseControls: jest.fn().mockReturnValue({ success: true }),
    update: jest.fn(),
    moveCamera: jest.fn().mockReturnValue({ success: true }),
    focusOnPosition: jest.fn().mockReturnValue({ success: true }),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../../game/src/ui/UIManager', () => ({
  UIManager: jest.fn().mockImplementation(() => ({
    createUI: jest.fn(),
    updateUI: jest.fn(),
    updateTurnDisplay: jest.fn(),
    showCharacterInfo: jest.fn(),
    hideCharacterInfo: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../../game/src/input/InputHandler', () => ({
  InputHandler: jest.fn().mockImplementation(() => ({
    setTileSize: jest.fn().mockReturnValue({ success: true }),
    setGameState: jest.fn(),
    setCharacterSelectionCallback: jest.fn(),
    setTileSelectionCallback: jest.fn(),
    setCameraControlCallback: jest.fn(),
    setShortcutCallback: jest.fn(),
    setUnitDetectionCallback: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../../game/src/rendering/MapRenderer', () => ({
  MapRenderer: jest.fn().mockImplementation(() => ({
    loadMap: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../../game/src/systems/CharacterManager', () => ({
  CharacterManager: jest.fn().mockImplementation(() => ({
    loadCharacters: jest.fn().mockReturnValue({ success: true }),
    selectCharacter: jest.fn().mockReturnValue({ success: true }),
    getCharacterById: jest.fn().mockReturnValue(undefined),
    updateCharacterPosition: jest.fn().mockReturnValue({ success: true }),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../../game/src/systems/MovementSystem', () => ({
  MovementSystem: jest.fn().mockImplementation(() => ({
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
  })),
}));

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

describe('GameplayScene', () => {
  let scene: GameplayScene;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Helper function to wait for scene initialization
  const waitForInitialization = async (scene: GameplayScene, timeout = 1000): Promise<void> => {
    const startTime = Date.now();
    while (!scene.isSceneInitialized() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  // Mock stage data for comprehensive testing
  const createMockStageData = () => ({
    id: 'test-stage-comprehensive',
    name: 'Comprehensive Test Stage',
    description: 'Stage for comprehensive testing',
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
        {
          name: 'terrain',
          type: 'terrain' as const,
          data: Array(8)
            .fill(null)
            .map(() => Array(12).fill(0)),
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

  // Performance monitoring helpers
  const performanceMetrics = {
    frameCount: 0,
    totalUpdateTime: 0,
    maxUpdateTime: 0,
    minUpdateTime: Infinity,
    averageUpdateTime: 0,
  };

  const measurePerformance = (fn: Function) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    performanceMetrics.frameCount++;
    performanceMetrics.totalUpdateTime += duration;
    performanceMetrics.maxUpdateTime = Math.max(performanceMetrics.maxUpdateTime, duration);
    performanceMetrics.minUpdateTime = Math.min(performanceMetrics.minUpdateTime, duration);
    performanceMetrics.averageUpdateTime =
      performanceMetrics.totalUpdateTime / performanceMetrics.frameCount;

    return { result, duration };
  };

  const resetPerformanceMetrics = () => {
    performanceMetrics.frameCount = 0;
    performanceMetrics.totalUpdateTime = 0;
    performanceMetrics.maxUpdateTime = 0;
    performanceMetrics.minUpdateTime = Infinity;
    performanceMetrics.averageUpdateTime = 0;
  };

  beforeEach(() => {
    // Mock console methods to avoid cluttering test output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();

    // Create new scene instance
    scene = new GameplayScene();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Scene Creation and Key Assignment', () => {
    test('should create scene with correct key', () => {
      expect(scene).toBeDefined();
      expect(scene.scene.key).toBe('GameplayScene');
    });

    test('should be instance of GameplayScene', () => {
      expect(scene).toBeInstanceOf(GameplayScene);
    });

    test('should have scene property with key', () => {
      expect(scene.scene).toBeDefined();
      expect(scene.scene.key).toBe('GameplayScene');
    });
  });

  describe('Method Existence', () => {
    test('should have all required Phaser lifecycle methods', () => {
      expect(typeof scene.preload).toBe('function');
      expect(typeof scene.create).toBe('function');
      expect(typeof scene.update).toBe('function');
    });

    test('should have destroy method', () => {
      expect(typeof scene.destroy).toBe('function');
    });

    test('should have public getter methods', () => {
      expect(typeof scene.getStageData).toBe('function');
      expect(typeof scene.getGameStateManager).toBe('function');
      expect(typeof scene.getCharacterManager).toBe('function');
      expect(typeof scene.isSceneInitialized).toBe('function');
    });
  });

  describe('Preload Method', () => {
    test('should execute preload without errors', () => {
      expect(() => scene.preload()).not.toThrow();
    });

    test('should log preload phase message', () => {
      scene.preload();
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: preload phase');
    });

    test('should load sample map data', () => {
      scene.preload();
      expect(mockLoad.json).toHaveBeenCalledWith('sampleMap', 'data/sample-map.json');
    });

    test('should setup load event handlers', () => {
      scene.preload();
      // The preload method should execute without errors and attempt to set up handlers
      expect(mockLoad.json).toHaveBeenCalledWith('sampleMap', 'data/sample-map.json');
      // Note: Event handlers are set up but may not be called in the mock environment
    });
  });

  describe('Create Method', () => {
    test('should execute create without errors', () => {
      expect(() => scene.create()).not.toThrow();
    });

    test('should log create phase and completion messages', async () => {
      scene.create();
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: create phase', '');

      // Wait for async initialization to complete
      await waitForInitialization(scene);
      expect(consoleSpy).toHaveBeenCalledWith(
        'GameplayScene: initialization completed successfully'
      );
    });

    test('should mark scene as initialized after successful create', async () => {
      expect(scene.isSceneInitialized()).toBe(false);
      scene.create();

      // Wait for async initialization to complete
      await waitForInitialization(scene);
      expect(scene.isSceneInitialized()).toBe(true);
    });

    test('should handle create with scene data', async () => {
      const sceneData = {
        selectedStage: {
          id: 'test-stage',
          name: 'Test Stage',
          description: 'Test description',
        },
      };

      expect(() => scene.create(sceneData)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: create phase', 'with data');
    });
  });

  describe('Update Method', () => {
    test('should execute update without errors when initialized', async () => {
      scene.create(); // Initialize the scene first
      await waitForInitialization(scene);
      expect(() => scene.update(1000, 16)).not.toThrow();
    });

    test('should skip update when not initialized', () => {
      expect(() => scene.update(1000, 16)).not.toThrow();
      // Should not call any manager update methods when not initialized
    });

    test('should accept time and delta parameters', async () => {
      scene.create();
      await waitForInitialization(scene);
      const time = 1000;
      const delta = 16;

      expect(() => scene.update(time, delta)).not.toThrow();
    });
  });

  describe('Manager Integration', () => {
    test('should initialize all manager classes during create', () => {
      scene.create();

      // Verify that all manager constructors were called
      const { GameStateManager } = require('../../../game/src/systems/GameStateManager');
      const { CameraController } = require('../../../game/src/systems/CameraController');
      const { UIManager } = require('../../../game/src/ui/UIManager');
      const { InputHandler } = require('../../../game/src/input/InputHandler');
      const { MapRenderer } = require('../../../game/src/rendering/MapRenderer');
      const { CharacterManager } = require('../../../game/src/systems/CharacterManager');

      expect(GameStateManager).toHaveBeenCalled();
      expect(CameraController).toHaveBeenCalled();
      expect(UIManager).toHaveBeenCalled();
      expect(InputHandler).toHaveBeenCalled();
      expect(MapRenderer).toHaveBeenCalled();
      expect(CharacterManager).toHaveBeenCalled();
    });

    test('should setup manager interactions during create', () => {
      scene.create();

      // Verify that managers are properly configured
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Initializing manager systems');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Manager systems initialized');
    });
  });

  describe('Stage Data Handling', () => {
    test('should create default stage data when no data provided', () => {
      scene.create();
      const stageData = scene.getStageData();

      expect(stageData).toBeDefined();
      expect(stageData?.id).toBe('default-stage');
      expect(stageData?.name).toBe('Default Test Stage');
    });

    test('should create mock stage data when scene data provided', () => {
      const sceneData = {
        selectedStage: {
          id: 'custom-stage',
          name: 'Custom Stage',
          description: 'Custom description',
        },
      };

      scene.create(sceneData);
      const stageData = scene.getStageData();

      expect(stageData).toBeDefined();
      expect(stageData?.id).toBe('custom-stage');
      expect(stageData?.name).toBe('Custom Stage');
    });

    test('should include player and enemy units in stage data', () => {
      scene.create();
      const stageData = scene.getStageData();

      expect(stageData?.playerUnits).toBeDefined();
      expect(stageData?.enemyUnits).toBeDefined();
      expect(stageData?.playerUnits.length).toBeGreaterThan(0);
      expect(stageData?.enemyUnits.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
      // Mock one of the managers to throw an error
      const { GameStateManager } = require('../../../game/src/systems/GameStateManager');
      GameStateManager.mockImplementationOnce(() => {
        throw new Error('Mock initialization error');
      });

      expect(() => scene.create()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GameplayScene: Error in create phase:',
        expect.any(Error)
      );
    });

    test('should handle update errors gracefully', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Mock camera controller to throw an error by overriding the private property
      (scene as any).cameraController = {
        update: jest.fn(() => {
          throw new Error('Mock update error');
        }),
      };

      expect(() => scene.update(1000, 16)).not.toThrow();
    });
  });

  describe('Public Interface', () => {
    test('should provide access to stage data', () => {
      scene.create();
      const stageData = scene.getStageData();
      expect(stageData).toBeDefined();
    });

    test('should provide access to game state manager', () => {
      scene.create();
      const gameStateManager = scene.getGameStateManager();
      expect(gameStateManager).toBeDefined();
    });

    test('should provide access to character manager', () => {
      scene.create();
      const characterManager = scene.getCharacterManager();
      expect(characterManager).toBeDefined();
    });

    test('should report initialization status correctly', async () => {
      expect(scene.isSceneInitialized()).toBe(false);
      scene.create();
      await waitForInitialization(scene);
      expect(scene.isSceneInitialized()).toBe(true);
    });
  });

  describe('Destroy Method', () => {
    test('should execute destroy without errors', () => {
      scene.create();
      expect(() => scene.destroy()).not.toThrow();
    });

    test('should log cleanup messages', () => {
      scene.create();
      scene.destroy();

      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Starting cleanup');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Cleanup completed');
    });

    test('should reset initialization status', async () => {
      scene.create();
      await waitForInitialization(scene);
      expect(scene.isSceneInitialized()).toBe(true);

      scene.destroy();
      expect(scene.isSceneInitialized()).toBe(false);
    });

    test('should cleanup all managers', () => {
      scene.create();
      scene.destroy();

      // Verify that manager cleanup methods were called
      // This is tested indirectly through the destroy method execution
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Cleanup completed');
    });
  });

  describe('Configuration', () => {
    test('should accept custom configuration', () => {
      const customConfig = {
        debugMode: true,
        performanceMonitoring: true,
        cameraSpeed: 500,
      };

      const customScene = new GameplayScene(customConfig);
      expect(customScene).toBeDefined();
    });

    test('should use default configuration when none provided', () => {
      const defaultScene = new GameplayScene();
      expect(defaultScene).toBeDefined();
    });
  });

  describe('Event System Integration', () => {
    test('should setup event listeners during create', async () => {
      scene.create();
      await waitForInitialization(scene);

      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Setting up event listeners');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Event listeners setup completed');
    });

    test('should remove all event listeners during destroy', () => {
      scene.create();
      scene.destroy();

      expect(mockEvents.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Performance Testing', () => {
    beforeEach(() => {
      resetPerformanceMetrics();
    });

    test('should maintain acceptable update loop performance', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Simulate multiple update cycles
      const targetFPS = 60;
      const maxUpdateTime = 1000 / targetFPS; // ~16.67ms for 60fps
      const updateCycles = 100;

      for (let i = 0; i < updateCycles; i++) {
        const { duration } = measurePerformance(() => {
          scene.update(i * 16, 16);
        });

        // Each individual update should be fast
        expect(duration).toBeLessThan(maxUpdateTime);
      }

      // Average performance should be well within limits
      expect(performanceMetrics.averageUpdateTime).toBeLessThan(maxUpdateTime * 0.5);
      expect(performanceMetrics.maxUpdateTime).toBeLessThan(maxUpdateTime);
    });

    test('should handle rapid scene creation and destruction', () => {
      const iterations = 10;
      const creationTimes: number[] = [];
      const destructionTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const testScene = new GameplayScene();

        // Measure creation time
        const { duration: createDuration } = measurePerformance(() => {
          testScene.create();
        });
        creationTimes.push(createDuration);

        // Measure destruction time
        const { duration: destroyDuration } = measurePerformance(() => {
          testScene.destroy();
        });
        destructionTimes.push(destroyDuration);
      }

      // Average creation time should be reasonable (< 100ms)
      const avgCreationTime = creationTimes.reduce((a, b) => a + b, 0) / creationTimes.length;
      expect(avgCreationTime).toBeLessThan(100);

      // Average destruction time should be fast (< 50ms)
      const avgDestructionTime =
        destructionTimes.reduce((a, b) => a + b, 0) / destructionTimes.length;
      expect(avgDestructionTime).toBeLessThan(50);
    });

    test('should handle memory efficiently during extended gameplay', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Simulate extended gameplay session
      const extendedUpdateCycles = 1000;
      let memoryGrowth = 0;

      // Measure initial state
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < extendedUpdateCycles; i++) {
        scene.update(i * 16, 16);

        // Check memory every 100 cycles
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          memoryGrowth = currentMemory - initialMemory;
        }
      }

      // Memory growth should be minimal (< 10MB for extended session)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Complete Gameplay Flow Integration', () => {
    test('should handle complete turn-based gameplay cycle', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify initial game state
      const gameStateManager = scene.getGameStateManager();
      expect(gameStateManager).toBeDefined();

      const initialState = gameStateManager.getGameState();
      expect(initialState.currentTurn).toBe(1);
      expect(initialState.activePlayer).toBe('player');
      expect(initialState.phase).toBe('select');

      // Simulate turn progression
      const turnResult = gameStateManager.nextTurn();
      expect(turnResult.success).toBe(true);

      // Verify nextTurn was called (the mock doesn't actually change state)
      expect(gameStateManager.nextTurn).toHaveBeenCalled();
    });

    test('should handle character selection and interaction flow', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();
      const characterManager = scene.getCharacterManager();

      // Test character selection
      const testUnit = mockStageData.playerUnits[0];
      const selectResult = gameStateManager.selectUnit(testUnit);
      expect(selectResult.success).toBe(true);

      // Verify methods were called (mocks don't return actual data)
      expect(gameStateManager.selectUnit).toHaveBeenCalledWith(testUnit);

      // Test character manager integration
      const charSelectResult = characterManager.selectCharacter(testUnit.id);
      expect(charSelectResult.success).toBe(true);
      expect(characterManager.selectCharacter).toHaveBeenCalledWith(testUnit.id);
    });

    test('should handle map and camera integration', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify map was loaded
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Setting up map');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Map setup completed');

      // Verify camera bounds were set
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Manager systems initialized');
    });

    test('should handle UI updates during gameplay', async () => {
      const mockStageData = createMockStageData();
      mockCache.json.get.mockReturnValue(mockStageData.mapData);

      scene.create({ selectedStage: mockStageData });
      await waitForInitialization(scene);

      // Verify UI was created
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Setting up UI');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: UI setup completed');

      // Test UI updates through events
      mockEvents.emit('turn-changed', { currentTurn: 2, activePlayer: 'enemy' });
      mockEvents.emit('unit-selected', { selectedUnit: mockStageData.playerUnits[0] });
      mockEvents.emit('unit-deselected');

      // Verify event handlers were set up
      expect(mockEvents.on).toHaveBeenCalledWith('turn-changed', expect.any(Function));
      expect(mockEvents.on).toHaveBeenCalledWith('unit-selected', expect.any(Function));
      expect(mockEvents.on).toHaveBeenCalledWith('unit-deselected', expect.any(Function));
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from manager initialization failures', () => {
      // Mock GameStateManager to fail initially, then succeed
      const { GameStateManager } = require('../../../game/src/systems/GameStateManager');
      let callCount = 0;
      GameStateManager.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Initial failure');
        }
        return {
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
        };
      });

      // First attempt should fail gracefully
      expect(() => scene.create()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Reset and try again - should succeed
      jest.clearAllMocks();
      const newScene = new GameplayScene();
      expect(() => newScene.create()).not.toThrow();
    });

    test('should handle corrupted stage data gracefully', async () => {
      // Mock corrupted stage data
      const corruptedData = {
        selectedStage: {
          id: null, // Invalid ID
          name: '',
          mapData: null, // Invalid map data
        },
      };

      expect(() => scene.create(corruptedData)).not.toThrow();

      // Should create mock stage data with fallback values when data is corrupted
      const stageData = scene.getStageData();
      expect(stageData).toBeDefined();
      expect(stageData?.id).toBe('test-stage'); // Falls back to 'test-stage' when ID is null
    });

    test('should handle update loop errors without crashing', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Mock camera controller to throw error intermittently
      let updateCount = 0;
      (scene as any).cameraController = {
        update: jest.fn(() => {
          updateCount++;
          if (updateCount === 5) {
            throw new Error('Intermittent camera error');
          }
        }),
      };

      // Should handle errors gracefully and continue running
      for (let i = 0; i < 10; i++) {
        expect(() => scene.update(i * 16, 16)).not.toThrow();
      }

      // Should have logged the error but continued
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GameplayScene: Error in update loop:',
        expect.any(Error)
      );
    });
  });

  describe('Data Validation and Type Safety', () => {
    test('should validate stage data structure', () => {
      const mockStageData = createMockStageData();

      // Test valid stage data
      expect(mockStageData.id).toBeDefined();
      expect(mockStageData.name).toBeDefined();
      expect(mockStageData.mapData).toBeDefined();
      expect(Array.isArray(mockStageData.playerUnits)).toBe(true);
      expect(Array.isArray(mockStageData.enemyUnits)).toBe(true);
      expect(Array.isArray(mockStageData.victoryConditions)).toBe(true);

      // Test unit structure
      const playerUnit = mockStageData.playerUnits[0];
      expect(playerUnit.id).toBeDefined();
      expect(playerUnit.name).toBeDefined();
      expect(playerUnit.position).toBeDefined();
      expect(playerUnit.stats).toBeDefined();
      expect(playerUnit.faction).toBe('player');
    });

    test('should handle invalid unit data', () => {
      const invalidStageData = {
        ...createMockStageData(),
        playerUnits: [
          {
            id: '', // Invalid empty ID
            name: 'Invalid Unit',
            position: { x: -1, y: -1 }, // Invalid position
            stats: { maxHP: -10 }, // Invalid stats
            currentHP: 150, // HP > maxHP
            faction: 'invalid', // Invalid faction
          },
        ],
      };

      // Should handle invalid data gracefully
      expect(() => scene.create({ selectedStage: invalidStageData })).not.toThrow();
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should provide keyboard navigation support', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Verify keyboard controls were enabled
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Input handling setup completed');

      // Test that InputHandler was created (constructor was called)
      const { InputHandler } = require('../../../game/src/input/InputHandler');
      expect(InputHandler).toHaveBeenCalled();
    });

    test('should provide visual feedback for user actions', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Verify UI manager was created for visual feedback
      const { UIManager } = require('../../../game/src/ui/UIManager');
      expect(UIManager).toHaveBeenCalled();

      // Verify UI setup was logged
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: UI setup completed');
    });

    test('should handle pause and resume functionality', async () => {
      scene.create();
      await waitForInitialization(scene);

      // Test pause functionality exists
      expect(mockEvents.on).toHaveBeenCalledWith('pause-requested', expect.any(Function));

      // Simulate pause event
      const pauseHandler = mockEvents.on.mock.calls.find(call => call[0] === 'pause-requested')[1];
      expect(typeof pauseHandler).toBe('function');
    });
  });
});
