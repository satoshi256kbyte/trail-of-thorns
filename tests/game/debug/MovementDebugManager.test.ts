/**
 * MovementDebugManager test suite
 * Tests the movement system debugging and configuration functionality
 */

import { MovementDebugManager } from '../../../game/src/debug/MovementDebugManager';
import { MovementTestUtils } from '../../../game/src/utils/MovementTestUtils';
import { GameConfig } from '../../../game/src/config/GameConfig';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
      setDepth: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      fillCircle: jest.fn().mockReturnThis(),
      strokeCircle: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      strokePath: jest.fn().mockReturnThis(),
    }),
    text: jest.fn().mockReturnValue({
      setOrigin: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setScrollFactor: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    }),
  },
  events: {
    emit: jest.fn(),
  },
} as any;

describe('MovementDebugManager', () => {
  let debugManager: MovementDebugManager;
  let gameConfig: GameConfig;
  let testMapData: MapData;
  let testCharacter: Unit;

  beforeEach(() => {
    gameConfig = new GameConfig();
    const movementConfig = gameConfig.getMovementSystemConfig();

    debugManager = new MovementDebugManager(mockScene, movementConfig);

    // Create test map data
    testMapData = MovementTestUtils.createTestMap({
      width: 10,
      height: 10,
      tileSize: 32,
      terrainPattern: 'empty',
    });

    // Create test character
    testCharacter = MovementTestUtils.createTestCharacter({
      name: 'TestCharacter',
      position: { x: 5, y: 5 },
      movement: 4,
      faction: 'player',
    });

    debugManager.setMapData(testMapData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(debugManager).toBeDefined();
      expect(mockScene.events.emit).not.toHaveBeenCalled();
    });

    test('should set map data correctly', () => {
      const newMapData = MovementTestUtils.createTestMap({
        width: 20,
        height: 20,
        tileSize: 64,
        terrainPattern: 'obstacles',
        obstaclePercentage: 30,
      });

      debugManager.setMapData(newMapData);
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('Debug Mode Toggle', () => {
    test('should enable debug mode', () => {
      debugManager.enableDebugMode();
      expect(mockScene.events.emit).toHaveBeenCalledWith('movement-debug-enabled');
    });

    test('should disable debug mode', () => {
      debugManager.enableDebugMode();
      debugManager.disableDebugMode();
      expect(mockScene.events.emit).toHaveBeenCalledWith('movement-debug-disabled');
    });

    test('should toggle debug mode', () => {
      debugManager.toggleDebugMode();
      expect(mockScene.events.emit).toHaveBeenCalledWith('movement-debug-enabled');

      debugManager.toggleDebugMode();
      expect(mockScene.events.emit).toHaveBeenCalledWith('movement-debug-disabled');
    });

    test('should not enable debug mode twice', () => {
      debugManager.enableDebugMode();
      const firstCallCount = mockScene.events.emit.mock.calls.length;

      debugManager.enableDebugMode();
      expect(mockScene.events.emit.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Movement Visualization', () => {
    beforeEach(() => {
      debugManager.enableDebugMode();
    });

    test('should visualize movement range', () => {
      debugManager.visualizeMovementRange(testCharacter);

      // Should create graphics for visualization
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    test('should visualize pathfinding', () => {
      const start = { x: 0, y: 0 };
      const goal = { x: 3, y: 3 };

      debugManager.visualizePathfinding(start, goal, testCharacter);

      // Should create graphics for pathfinding visualization
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    test('should handle visualization when not enabled', () => {
      debugManager.disableDebugMode();

      // Should not throw errors when disabled
      debugManager.visualizeMovementRange(testCharacter);
      debugManager.visualizePathfinding({ x: 0, y: 0 }, { x: 3, y: 3 }, testCharacter);

      expect(true).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      debugManager.enableDebugMode();

      const metrics = debugManager.getPerformanceMetrics();

      expect(metrics).toHaveProperty('lastRangeCalculationTime');
      expect(metrics).toHaveProperty('lastPathfindingTime');
      expect(metrics).toHaveProperty('averageRangeCalculationTime');
      expect(metrics).toHaveProperty('averagePathfindingTime');
      expect(metrics).toHaveProperty('totalRangeCalculations');
      expect(metrics).toHaveProperty('totalPathfindingOperations');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    test('should update metrics after visualization', () => {
      debugManager.enableDebugMode();

      const initialMetrics = debugManager.getPerformanceMetrics();

      debugManager.visualizeMovementRange(testCharacter);

      const updatedMetrics = debugManager.getPerformanceMetrics();
      expect(updatedMetrics.totalRangeCalculations).toBeGreaterThan(
        initialMetrics.totalRangeCalculations
      );
    });
  });

  describe('Test Scenarios', () => {
    test('should run basic movement test scenario', async () => {
      debugManager.enableDebugMode();

      // Should not throw errors
      await expect(debugManager.testMovementScenario('basic-movement')).resolves.not.toThrow();
    });

    test('should handle unknown test scenario', async () => {
      debugManager.enableDebugMode();

      // Should handle gracefully
      await debugManager.testMovementScenario('unknown-scenario');
      expect(true).toBe(true);
    });

    test('should run pathfinding stress test', async () => {
      debugManager.enableDebugMode();

      await expect(debugManager.testMovementScenario('pathfinding-stress')).resolves.not.toThrow();
    });

    test('should run range calculation test', async () => {
      debugManager.enableDebugMode();

      await expect(debugManager.testMovementScenario('range-calculation')).resolves.not.toThrow();
    });
  });

  describe('Update Loop', () => {
    test('should handle update when disabled', () => {
      debugManager.update(1000, 16);
      expect(true).toBe(true); // Should not throw
    });

    test('should handle update when enabled', () => {
      debugManager.enableDebugMode();
      debugManager.update(1000, 16);
      expect(true).toBe(true); // Should not throw
    });
  });
});

describe('MovementTestUtils', () => {
  describe('Test Character Creation', () => {
    test('should create test character with correct properties', () => {
      const template = {
        name: 'TestUnit',
        position: { x: 3, y: 4 },
        movement: 5,
        faction: 'player' as const,
      };

      const character = MovementTestUtils.createTestCharacter(template);

      expect(character.name).toBe('TestUnit');
      expect(character.position).toEqual({ x: 3, y: 4 });
      expect(character.stats.movement).toBe(5);
      expect(character.faction).toBe('player');
      expect(character.id).toMatch(/^test_character_\d+$/);
    });

    test('should create multiple test characters', () => {
      const templates = [
        { name: 'Unit1', position: { x: 0, y: 0 }, movement: 3, faction: 'player' as const },
        { name: 'Unit2', position: { x: 1, y: 1 }, movement: 4, faction: 'enemy' as const },
      ];

      const characters = MovementTestUtils.createTestCharacters(templates);

      expect(characters).toHaveLength(2);
      expect(characters[0].name).toBe('Unit1');
      expect(characters[1].name).toBe('Unit2');
      expect(characters[0].faction).toBe('player');
      expect(characters[1].faction).toBe('enemy');
    });
  });

  describe('Test Map Creation', () => {
    test('should create empty test map', () => {
      const config = {
        width: 8,
        height: 6,
        tileSize: 32,
        terrainPattern: 'empty' as const,
      };

      const mapData = MovementTestUtils.createTestMap(config);

      expect(mapData.width).toBe(8);
      expect(mapData.height).toBe(6);
      expect(mapData.tileSize).toBe(32);
      expect(mapData.terrain).toHaveLength(6);
      expect(mapData.terrain[0]).toHaveLength(8);
      expect(mapData.terrain[0][0]).toBe('grass');
    });

    test('should create map with obstacles', () => {
      const config = {
        width: 10,
        height: 10,
        tileSize: 32,
        terrainPattern: 'obstacles' as const,
        obstaclePercentage: 20,
      };

      const mapData = MovementTestUtils.createTestMap(config);

      // Should have some walls
      const hasWalls = mapData.terrain.some(row => row.some(tile => tile === 'wall'));
      expect(hasWalls).toBe(true);
    });

    test('should create maze terrain', () => {
      const config = {
        width: 12,
        height: 9,
        tileSize: 32,
        terrainPattern: 'maze' as const,
      };

      const mapData = MovementTestUtils.createTestMap(config);

      // Should have walls in maze pattern
      const hasWalls = mapData.terrain.some(row => row.some(tile => tile === 'wall'));
      expect(hasWalls).toBe(true);
    });

    test('should create island terrain', () => {
      const config = {
        width: 20,
        height: 20,
        tileSize: 32,
        terrainPattern: 'islands' as const,
      };

      const mapData = MovementTestUtils.createTestMap(config);

      // Should have water and land
      const hasWater = mapData.terrain.some(row => row.some(tile => tile === 'water'));
      const hasLand = mapData.terrain.some(row =>
        row.some(tile => tile === 'grass' || tile === 'forest')
      );

      expect(hasWater).toBe(true);
      expect(hasLand).toBe(true);
    });
  });

  describe('Test Scenario Generation', () => {
    test('should generate comprehensive test scenarios', () => {
      const mapData = MovementTestUtils.createTestMap({
        width: 15,
        height: 15,
        tileSize: 32,
        terrainPattern: 'empty',
      });

      const scenarios = MovementTestUtils.generateTestScenarios(mapData);

      expect(scenarios.length).toBeGreaterThan(0);

      // Should have different types of scenarios
      const scenarioNames = scenarios.map(s => s.name);
      expect(scenarioNames).toContain('Valid Movement');
      expect(scenarioNames).toContain('Out of Range Movement');
      expect(scenarioNames).toContain('Movement Outside Map');
    });
  });

  describe('Stress Test Scenario', () => {
    test('should create stress test scenario', () => {
      const scenario = MovementTestUtils.createStressTestScenario(20, 10, 15);

      expect(scenario.mapData.width).toBe(20);
      expect(scenario.mapData.height).toBe(20);
      expect(scenario.characters.length).toBeGreaterThan(0);
      expect(scenario.characters.length).toBeLessThanOrEqual(10);
      expect(scenario.testMoves.length).toBe(scenario.characters.length);
    });
  });

  describe('Random Position Generation', () => {
    test('should generate random positions within bounds', () => {
      const mapData = MovementTestUtils.createTestMap({
        width: 10,
        height: 10,
        tileSize: 32,
        terrainPattern: 'empty',
      });

      const positions = MovementTestUtils.generateRandomPositions(mapData, 5);

      expect(positions.length).toBeLessThanOrEqual(5);
      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(10);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(10);
      });
    });

    test('should avoid specified terrain types', () => {
      const mapData = MovementTestUtils.createTestMap({
        width: 10,
        height: 10,
        tileSize: 32,
        terrainPattern: 'obstacles',
        obstaclePercentage: 50,
      });

      const positions = MovementTestUtils.generateRandomPositions(mapData, 3, ['wall']);

      positions.forEach(pos => {
        const terrain = mapData.terrain[pos.y][pos.x];
        expect(terrain).not.toBe('wall');
      });
    });
  });
});

describe('GameConfig Movement System Configuration', () => {
  let gameConfig: GameConfig;

  beforeEach(() => {
    gameConfig = new GameConfig();
  });

  test('should have default movement system configuration', () => {
    const config = gameConfig.getMovementSystemConfig();

    expect(config).toHaveProperty('enableVisualFeedback');
    expect(config).toHaveProperty('enablePathPreview');
    expect(config).toHaveProperty('enableMovementAnimation');
    expect(config).toHaveProperty('enableMovementDebug');
    expect(config).toHaveProperty('terrainCosts');
    expect(config).toHaveProperty('animationConfig');
    expect(config).toHaveProperty('debugColors');
  });

  test('should update movement system configuration', () => {
    const updates = {
      enableMovementDebug: true,
      showMovementRangeDebug: true,
    };

    gameConfig.updateMovementSystemConfig(updates);
    const config = gameConfig.getMovementSystemConfig();

    expect(config.enableMovementDebug).toBe(true);
    expect(config.showMovementRangeDebug).toBe(true);
  });

  test('should validate configuration correctly', () => {
    expect(gameConfig.validateConfig()).toBe(true);
  });

  test('should reject invalid animation speed', () => {
    gameConfig.updateMovementSystemConfig({
      animationConfig: {
        moveSpeed: -100,
        turnSpeed: Math.PI,
        easing: 'Power2',
        stepDelay: 100,
      },
    });

    expect(gameConfig.validateConfig()).toBe(false);
  });

  test('should reject invalid terrain costs', () => {
    gameConfig.updateMovementSystemConfig({
      terrainCosts: {
        invalid: { movementCost: -5, isPassable: true },
      },
    });

    expect(gameConfig.validateConfig()).toBe(false);
  });

  test('should reject invalid debug colors', () => {
    gameConfig.updateMovementSystemConfig({
      debugColors: {
        movementRange: -1,
        pathfinding: 0xff0000,
        movementCost: 0x0000ff,
        blockedTiles: 0xff00ff,
        alternativePaths: 0xffff00,
      },
    });

    expect(gameConfig.validateConfig()).toBe(false);
  });
});
