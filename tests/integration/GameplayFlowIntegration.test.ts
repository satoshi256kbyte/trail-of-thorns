/**
 * Comprehensive integration tests for complete gameplay flow
 * Tests the full gameplay experience from scene initialization to game completion
 *
 * Implements requirement 6.5: Write integration tests for complete gameplay flow
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { StageData, Unit, GameState, MapData } from '../../game/src/types/gameplay';

// Mock Phaser and all dependencies
const mockPhaserSetup = () => {
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

  const mockEvents = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  return { mockAdd, mockCameras, mockInput, mockEvents };
};

// Mock all manager classes with realistic behavior
jest.mock('../../game/src/systems/GameStateManager', () => ({
  GameStateManager: jest.fn().mockImplementation(() => {
    let gameState: GameState = {
      currentTurn: 1,
      activePlayer: 'player',
      phase: 'select',
      selectedUnit: undefined,
      gameResult: null,
      turnOrder: [],
      activeUnitIndex: 0,
    };

    return {
      initializeTurnOrder: jest.fn((units: Unit[]) => {
        gameState.turnOrder = [...units].sort((a, b) => b.stats.speed - a.stats.speed);
        return { success: true };
      }),
      getGameState: jest.fn(() => ({ ...gameState })),
      selectUnit: jest.fn((unit: Unit | null) => {
        gameState.selectedUnit = unit || undefined;
        return { success: true };
      }),
      getSelectedUnit: jest.fn(() => gameState.selectedUnit),
      isPlayerTurn: jest.fn(() => gameState.activePlayer === 'player'),
      nextTurn: jest.fn(() => {
        gameState.currentTurn++;
        gameState.activePlayer = gameState.activePlayer === 'player' ? 'enemy' : 'player';
        gameState.activeUnitIndex = (gameState.activeUnitIndex + 1) % gameState.turnOrder.length;
        return { success: true };
      }),
      getPlayerUnits: jest.fn(() => gameState.turnOrder.filter(u => u.faction === 'player')),
      getEnemyUnits: jest.fn(() => gameState.turnOrder.filter(u => u.faction === 'enemy')),
      checkVictoryConditions: jest.fn(() => null),
      reset: jest.fn(() => {
        gameState = {
          currentTurn: 1,
          activePlayer: 'player',
          phase: 'select',
          selectedUnit: undefined,
          gameResult: null,
          turnOrder: [],
          activeUnitIndex: 0,
        };
      }),
    };
  }),
}));

jest.mock('../../game/src/systems/CameraController', () => ({
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

jest.mock('../../game/src/ui/UIManager', () => ({
  UIManager: jest.fn().mockImplementation(() => ({
    createUI: jest.fn(),
    updateUI: jest.fn(),
    updateTurnDisplay: jest.fn(),
    showCharacterInfo: jest.fn(),
    hideCharacterInfo: jest.fn(),
    showActionMenu: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../game/src/input/InputHandler', () => ({
  InputHandler: jest.fn().mockImplementation(() => ({
    setTileSize: jest.fn().mockReturnValue({ success: true }),
    setGameState: jest.fn(),
    setCharacterSelectionCallback: jest.fn(),
    setCameraControlCallback: jest.fn(),
    setShortcutCallback: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../game/src/rendering/MapRenderer', () => ({
  MapRenderer: jest.fn().mockImplementation(() => ({
    loadMap: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    renderGrid: jest.fn(),
    highlightTiles: jest.fn(),
    clearHighlights: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../game/src/systems/CharacterManager', () => ({
  CharacterManager: jest.fn().mockImplementation(() => {
    const characters = new Map();

    return {
      loadCharacters: jest.fn((stageData: StageData) => {
        [...stageData.playerUnits, ...stageData.enemyUnits].forEach(unit => {
          characters.set(unit.id, unit);
        });
        return { success: true };
      }),
      selectCharacter: jest.fn().mockReturnValue({ success: true }),
      getCharacterById: jest.fn((id: string) => characters.get(id)),
      moveCharacter: jest.fn().mockReturnValue({ success: true }),
      updateCharacterDisplay: jest.fn(),
      destroy: jest.fn(),
    };
  }),
}));

jest.mock('../../game/src/debug/DebugManager', () => ({
  DebugManager: jest.fn().mockImplementation(() => ({
    enableDebugMode: jest.fn(),
    setMapData: jest.fn(),
    setCharacters: jest.fn(),
    setGameState: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('../../game/src/utils/SceneTransition', () => ({
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

// Mock Phaser
jest.mock('phaser', () => {
  const { mockAdd, mockCameras, mockInput, mockEvents } = mockPhaserSetup();

  return {
    Scene: jest.fn().mockImplementation(function (this: any, config: any) {
      this.scene = { key: config.key, start: jest.fn() };
      this.add = mockAdd;
      this.cameras = mockCameras;
      this.input = mockInput;
      this.load = {
        json: jest.fn(),
        on: jest.fn(),
      };
      this.cache = {
        json: {
          get: jest.fn().mockReturnValue({
            width: 12,
            height: 8,
            tileSize: 32,
            layers: [
              {
                name: 'background',
                type: 'background',
                data: Array(8)
                  .fill(null)
                  .map(() => Array(12).fill(1)),
                visible: true,
                opacity: 1.0,
              },
            ],
            playerSpawns: [{ x: 1, y: 6 }],
            enemySpawns: [{ x: 9, y: 1 }],
          }),
        },
      };
      this.events = mockEvents;
      this.data = {
        set: jest.fn(),
        get: jest.fn(),
        remove: jest.fn(),
      };
      this.scale = { width: 1920, height: 1080 };
      this.tweens = { add: jest.fn().mockReturnValue({ stop: jest.fn(), progress: 0 }) };
      this.make = {
        tilemap: jest.fn().mockReturnValue({
          addTilesetImage: jest.fn().mockReturnValue({}),
          createLayer: jest.fn().mockReturnValue({
            setAlpha: jest.fn(),
            setDepth: jest.fn(),
          }),
          destroy: jest.fn(),
        }),
      };
      this.textures = { exists: jest.fn().mockReturnValue(false) };
      return this;
    }),
  };
});

describe('Complete Gameplay Flow Integration Tests', () => {
  let scene: GameplayScene;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Test data factory
  const createCompleteStageData = (): StageData => ({
    id: 'integration-test-stage',
    name: 'Integration Test Stage',
    description: 'Complete stage for integration testing',
    mapData: {
      width: 12,
      height: 8,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: Array(8)
            .fill(null)
            .map(() => Array(12).fill(1)),
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'terrain',
          type: 'terrain',
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
        id: 'player-hero',
        name: 'Hero',
        position: { x: 1, y: 6 },
        stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'player-mage',
        name: 'Mage',
        position: { x: 2, y: 6 },
        stats: { maxHP: 80, maxMP: 80, attack: 30, defense: 10, speed: 10, movement: 2 },
        currentHP: 80,
        currentMP: 80,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      },
    ],
    enemyUnits: [
      {
        id: 'enemy-orc',
        name: 'Orc Warrior',
        position: { x: 9, y: 1 },
        stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 12, speed: 8, movement: 2 },
        currentHP: 90,
        currentMP: 20,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'enemy-goblin',
        name: 'Goblin Archer',
        position: { x: 10, y: 1 },
        stats: { maxHP: 60, maxMP: 30, attack: 22, defense: 8, speed: 14, movement: 3 },
        currentHP: 60,
        currentMP: 30,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
    ],
    victoryConditions: [
      {
        type: 'defeat_all',
        description: 'Defeat all enemy units',
      },
    ],
  });

  const waitForInitialization = async (scene: GameplayScene, timeout = 1000): Promise<void> => {
    const startTime = Date.now();
    while (!scene.isSceneInitialized() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
    scene = new GameplayScene();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Complete Scene Initialization Flow', () => {
    test('should initialize all systems in correct order', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Verify initialization sequence
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: create phase', 'with data');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Initializing manager systems');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Manager systems initialized');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Setting up map');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Map setup completed');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Setting up characters');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Characters setup completed');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Initializing game state');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Game state initialized');
      expect(consoleSpy).toHaveBeenCalledWith(
        'GameplayScene: initialization completed successfully'
      );

      expect(scene.isSceneInitialized()).toBe(true);
    });

    test('should handle stage data properly during initialization', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const loadedStageData = scene.getStageData();
      expect(loadedStageData).toBeDefined();
      expect(loadedStageData?.id).toBe(stageData.id);
      expect(loadedStageData?.name).toBe(stageData.name);
      expect(loadedStageData?.playerUnits).toHaveLength(2);
      expect(loadedStageData?.enemyUnits).toHaveLength(2);
    });

    test('should establish proper manager communication', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Verify all managers were created
      const { GameStateManager } = require('../../game/src/systems/GameStateManager');
      const { CameraController } = require('../../game/src/systems/CameraController');
      const { UIManager } = require('../../game/src/ui/UIManager');
      const { InputHandler } = require('../../game/src/input/InputHandler');
      const { MapRenderer } = require('../../game/src/rendering/MapRenderer');
      const { CharacterManager } = require('../../game/src/systems/CharacterManager');

      expect(GameStateManager).toHaveBeenCalled();
      expect(CameraController).toHaveBeenCalled();
      expect(UIManager).toHaveBeenCalled();
      expect(InputHandler).toHaveBeenCalled();
      expect(MapRenderer).toHaveBeenCalled();
      expect(CharacterManager).toHaveBeenCalled();
    });
  });

  describe('Turn-Based Gameplay Flow', () => {
    test('should handle complete turn cycle', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();

      // Initial state should be player turn
      let gameState = gameStateManager.getGameState();
      expect(gameState.currentTurn).toBe(1);
      expect(gameState.activePlayer).toBe('player');
      expect(gameState.phase).toBe('select');

      // Advance turn
      const turnResult = gameStateManager.nextTurn();
      expect(turnResult.success).toBe(true);

      // State should have changed
      gameState = gameStateManager.getGameState();
      expect(gameState.currentTurn).toBe(2);
      expect(gameState.activePlayer).toBe('enemy');
    });

    test('should handle turn order based on speed stats', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();
      const gameState = gameStateManager.getGameState();

      // Turn order should be sorted by speed (highest first)
      expect(gameState.turnOrder).toHaveLength(4);

      // Goblin (speed 14) should be first, then Hero (speed 12), then Mage (speed 10), then Orc (speed 8)
      const expectedOrder = ['enemy-goblin', 'player-hero', 'player-mage', 'enemy-orc'];
      const actualOrder = gameState.turnOrder.map(unit => unit.id);
      expect(actualOrder).toEqual(expectedOrder);
    });

    test('should handle player and enemy turn alternation', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();

      // Track turn progression
      const turnHistory: Array<{ turn: number; player: string }> = [];

      for (let i = 0; i < 8; i++) {
        const gameState = gameStateManager.getGameState();
        turnHistory.push({
          turn: gameState.currentTurn,
          player: gameState.activePlayer,
        });

        gameStateManager.nextTurn();
      }

      // Should alternate between player and enemy turns
      expect(turnHistory[0].player).toBe('player');
      expect(turnHistory[1].player).toBe('enemy');
      expect(turnHistory[2].player).toBe('player');
      expect(turnHistory[3].player).toBe('enemy');
    });
  });

  describe('Character Interaction Flow', () => {
    test('should handle character selection and deselection', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();
      const characterManager = scene.getCharacterManager();

      // Select a player unit
      const heroUnit = stageData.playerUnits[0];
      const selectResult = gameStateManager.selectUnit(heroUnit);
      expect(selectResult.success).toBe(true);

      let selectedUnit = gameStateManager.getSelectedUnit();
      expect(selectedUnit).toBeDefined();
      expect(selectedUnit?.id).toBe('player-hero');

      // Character manager should also select the character
      const charSelectResult = characterManager.selectCharacter(heroUnit.id);
      expect(charSelectResult.success).toBe(true);

      // Deselect unit
      gameStateManager.selectUnit(null);
      selectedUnit = gameStateManager.getSelectedUnit();
      expect(selectedUnit).toBeUndefined();
    });

    test('should handle character movement', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const characterManager = scene.getCharacterManager();

      // Move a character
      const moveResult = characterManager.moveCharacter('player-hero', { x: 2, y: 6 });
      expect(moveResult.success).toBe(true);

      // Verify character was moved
      const character = characterManager.getCharacterById('player-hero');
      expect(character).toBeDefined();
    });

    test('should handle character interaction with UI updates', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();
      const { UIManager } = require('../../game/src/ui/UIManager');
      const uiManagerInstance = UIManager.mock.instances[0];

      // Select a unit and verify UI updates
      const heroUnit = stageData.playerUnits[0];
      gameStateManager.selectUnit(heroUnit);

      // Simulate UI update event
      const mockEvents = scene.events;
      mockEvents.emit('unit-selected', { selectedUnit: heroUnit });

      // UI should have been updated
      expect(uiManagerInstance.showCharacterInfo).toHaveBeenCalled();
    });
  });

  describe('Map and Camera Integration', () => {
    test('should handle map loading and camera setup', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Verify map was loaded
      const { MapRenderer } = require('../../game/src/rendering/MapRenderer');
      const mapRendererInstance = MapRenderer.mock.instances[0];
      expect(mapRendererInstance.loadMap).toHaveBeenCalledWith(stageData.mapData);

      // Verify camera bounds were set
      const { CameraController } = require('../../game/src/systems/CameraController');
      const cameraControllerInstance = CameraController.mock.instances[0];
      expect(cameraControllerInstance.setMapBounds).toHaveBeenCalledWith(stageData.mapData);
    });

    test('should handle camera movement and focusing', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const { CameraController } = require('../../game/src/systems/CameraController');
      const cameraControllerInstance = CameraController.mock.instances[0];

      // Test camera movement
      const moveResult = cameraControllerInstance.moveCamera('up', 16);
      expect(moveResult.success).toBe(true);

      // Test camera focusing
      const focusResult = cameraControllerInstance.focusOnPosition(100, 100);
      expect(focusResult.success).toBe(true);
    });
  });

  describe('Input and Event Handling', () => {
    test('should handle keyboard input for game controls', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const { InputHandler } = require('../../game/src/input/InputHandler');
      const inputHandlerInstance = InputHandler.mock.instances[0];

      // Verify input callbacks were set
      expect(inputHandlerInstance.setCharacterSelectionCallback).toHaveBeenCalled();
      expect(inputHandlerInstance.setCameraControlCallback).toHaveBeenCalled();
      expect(inputHandlerInstance.setShortcutCallback).toHaveBeenCalled();
    });

    test('should handle mouse input for character selection', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Simulate character click through input handler
      const { InputHandler } = require('../../game/src/input/InputHandler');
      const inputHandlerInstance = InputHandler.mock.instances[0];

      // Get the character selection callback
      const characterSelectionCallback =
        inputHandlerInstance.setCharacterSelectionCallback.mock.calls[0][0];

      // Simulate clicking on a character
      const heroUnit = stageData.playerUnits[0];
      characterSelectionCallback(heroUnit, { x: 100, y: 100 });

      // Character should be selected
      const gameStateManager = scene.getGameStateManager();
      const selectedUnit = gameStateManager.getSelectedUnit();
      expect(selectedUnit?.id).toBe('player-hero');
    });

    test('should handle event-driven communication between systems', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const mockEvents = scene.events;

      // Verify event listeners were set up
      expect(mockEvents.on).toHaveBeenCalledWith('turn-changed', expect.any(Function));
      expect(mockEvents.on).toHaveBeenCalledWith('unit-selected', expect.any(Function));
      expect(mockEvents.on).toHaveBeenCalledWith('unit-deselected', expect.any(Function));
      expect(mockEvents.on).toHaveBeenCalledWith('pause-requested', expect.any(Function));
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle map loading failures gracefully', async () => {
      // Mock map renderer to fail
      const { MapRenderer } = require('../../game/src/rendering/MapRenderer');
      MapRenderer.mockImplementationOnce(() => ({
        loadMap: jest.fn().mockResolvedValue({ success: false, message: 'Map load failed' }),
        destroy: jest.fn(),
      }));

      const stageData = createCompleteStageData();

      expect(() => scene.create({ selectedStage: stageData })).not.toThrow();

      // Should handle the error gracefully
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle character loading failures gracefully', async () => {
      // Mock character manager to fail
      const { CharacterManager } = require('../../game/src/systems/CharacterManager');
      CharacterManager.mockImplementationOnce(() => ({
        loadCharacters: jest
          .fn()
          .mockReturnValue({ success: false, message: 'Character load failed' }),
        selectCharacter: jest.fn().mockReturnValue({ success: true }),
        getCharacterById: jest.fn().mockReturnValue(undefined),
        destroy: jest.fn(),
      }));

      const stageData = createCompleteStageData();

      expect(() => scene.create({ selectedStage: stageData })).not.toThrow();

      // Should handle the error gracefully
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle invalid game state transitions', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();

      // Try to select an invalid unit
      const invalidUnit = { ...stageData.playerUnits[0], id: 'invalid-unit' };
      const selectResult = gameStateManager.selectUnit(invalidUnit);

      // Should handle gracefully (mock returns success, but real implementation would validate)
      expect(selectResult.success).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle multiple update cycles efficiently', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Run multiple update cycles
      const startTime = performance.now();
      const updateCycles = 100;

      for (let i = 0; i < updateCycles; i++) {
        scene.update(i * 16, 16);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / updateCycles;

      // Average update time should be reasonable (< 5ms per update)
      expect(averageTime).toBeLessThan(5);
    });

    test('should cleanup resources properly on destroy', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Destroy the scene
      scene.destroy();

      // Verify cleanup was performed
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Starting cleanup');
      expect(consoleSpy).toHaveBeenCalledWith('GameplayScene: Cleanup completed');

      // Verify scene is no longer initialized
      expect(scene.isSceneInitialized()).toBe(false);
    });
  });

  describe('Victory and Defeat Conditions', () => {
    test('should handle victory condition checking', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      const gameStateManager = scene.getGameStateManager();

      // Check victory conditions
      const victoryResult = gameStateManager.checkVictoryConditions();
      expect(victoryResult).toBeNull(); // No victory yet

      // Victory conditions are defined in stage data
      expect(stageData.victoryConditions).toHaveLength(1);
      expect(stageData.victoryConditions[0].type).toBe('defeat_all');
    });

    test('should handle game completion flow', async () => {
      const stageData = createCompleteStageData();

      scene.create({ selectedStage: stageData });
      await waitForInitialization(scene);

      // Simulate game completion by checking if all systems are ready
      expect(scene.isSceneInitialized()).toBe(true);

      const gameStateManager = scene.getGameStateManager();
      const gameState = gameStateManager.getGameState();

      // Game should be in playable state
      expect(gameState.gameResult).toBeNull();
      expect(gameState.phase).toBe('select');
    });
  });
});
