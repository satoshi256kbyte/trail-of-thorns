/**
 * MovementSystemDebuggingIntegration.test.ts
 *
 * Integration tests for the complete movement system debugging infrastructure
 * Tests the interaction between all debugging components:
 * - GameConfig movement system configuration
 * - MovementDebugManager visualization
 * - MovementConsoleCommands functionality
 * - MovementDevelopmentTools integration
 */

import { GameConfig } from '../../../game/src/config/GameConfig';
import { MovementDebugManager } from '../../../game/src/debug/MovementDebugManager';
import { MovementConsoleCommands } from '../../../game/src/debug/MovementConsoleCommands';
import { MovementDevelopmentTools } from '../../../game/src/debug/MovementDevelopmentTools';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { MovementTestUtils } from '../../../game/src/utils/MovementTestUtils';
import { Unit, MapData } from '../../../game/src/types/gameplay';

// Mock Phaser scene for testing
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      add: jest.fn(),
      destroy: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
      setDepth: jest.fn().mockReturnThis(),
      clear: jest.fn(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      fillCircle: jest.fn().mockReturnThis(),
      strokeCircle: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      strokePath: jest.fn(),
    }),
    text: jest.fn().mockReturnValue({
      setOrigin: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setScrollFactor: jest.fn().mockReturnThis(),
      setText: jest.fn(),
      destroy: jest.fn(),
    }),
  },
  cameras: {
    main: {
      scrollX: 0,
      scrollY: 0,
      width: 800,
      height: 600,
      zoom: 1,
    },
  },
  events: {
    emit: jest.fn(),
  },
  time: {
    now: 0,
  },
  data: {
    get: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    set: jest.fn(),
  },
} as any;

describe('Movement System Debugging Integration', () => {
  let gameConfig: GameConfig;
  let debugManager: MovementDebugManager;
  let consoleCommands: MovementConsoleCommands;
  let developmentTools: MovementDevelopmentTools;
  let testMapData: MapData;
  let testCharacter: Unit;

  beforeEach(() => {
    // Initialize core components
    gameConfig = new GameConfig();

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

    // Initialize debug manager
    const movementConfig = gameConfig.getMovementSystemConfig();
    debugManager = new MovementDebugManager(mockScene, movementConfig);
    debugManager.setMapData(testMapData);

    // Initialize console commands
    consoleCommands = new MovementConsoleCommands();

    // Initialize development tools
    developmentTools = MovementDevelopmentTools.getInstance();

    // Clear any existing global objects
    delete (window as any).movement;
    delete (window as any).dev;
    delete (window as any).movementDebug;
  });

  afterEach(() => {
    // Clean up global objects
    delete (window as any).movement;
    delete (window as any).dev;
    delete (window as any).movementDebug;
  });

  describe('Configuration Integration', () => {
    test('should have comprehensive movement system configuration', () => {
      const config = gameConfig.getMovementSystemConfig();

      // Verify all required configuration options exist
      expect(config).toHaveProperty('enableVisualFeedback');
      expect(config).toHaveProperty('enablePathPreview');
      expect(config).toHaveProperty('enableMovementAnimation');
      expect(config).toHaveProperty('enableMovementDebug');
      expect(config).toHaveProperty('showMovementRangeDebug');
      expect(config).toHaveProperty('showPathfindingDebug');
      expect(config).toHaveProperty('showMovementCostDebug');
      expect(config).toHaveProperty('terrainCosts');
      expect(config).toHaveProperty('animationConfig');
      expect(config).toHaveProperty('debugColors');
    });

    test('should validate configuration correctly', () => {
      expect(gameConfig.validateConfig()).toBe(true);
    });

    test('should update configuration and maintain validation', () => {
      const updates = {
        enableMovementDebug: true,
        showMovementRangeDebug: true,
        showPathfindingDebug: true,
      };

      gameConfig.updateMovementSystemConfig(updates);
      const updatedConfig = gameConfig.getMovementSystemConfig();

      expect(updatedConfig.enableMovementDebug).toBe(true);
      expect(updatedConfig.showMovementRangeDebug).toBe(true);
      expect(updatedConfig.showPathfindingDebug).toBe(true);
      expect(gameConfig.validateConfig()).toBe(true);
    });
  });

  describe('Debug Manager Integration', () => {
    test('should initialize debug manager with configuration', () => {
      expect(debugManager).toBeDefined();
      expect(debugManager.getPerformanceMetrics).toBeDefined();
    });

    test('should enable and disable debug mode', () => {
      debugManager.enableDebugMode();
      debugManager.disableDebugMode();
      // Should not throw errors
    });

    test('should handle visualization methods', () => {
      debugManager.enableDebugMode();

      // Test movement range visualization
      expect(() => {
        debugManager.visualizeMovementRange(testCharacter);
      }).not.toThrow();

      // Test pathfinding visualization
      expect(() => {
        debugManager.visualizePathfinding({ x: 0, y: 0 }, { x: 5, y: 5 }, testCharacter);
      }).not.toThrow();
    });

    test('should track performance metrics', () => {
      const metrics = debugManager.getPerformanceMetrics();

      expect(metrics).toHaveProperty('lastRangeCalculationTime');
      expect(metrics).toHaveProperty('lastPathfindingTime');
      expect(metrics).toHaveProperty('averageRangeCalculationTime');
      expect(metrics).toHaveProperty('averagePathfindingTime');
      expect(metrics).toHaveProperty('totalRangeCalculations');
      expect(metrics).toHaveProperty('totalPathfindingOperations');
    });
  });

  describe('Console Commands Integration', () => {
    test('should register global console commands', () => {
      // Console commands should be available globally
      expect((window as any).movement).toBeDefined();
      expect((window as any).movement.help).toBeInstanceOf(Function);
    });

    test('should provide configuration commands', () => {
      const movement = (window as any).movement;

      expect(movement.config).toBeDefined();
      expect(movement.config.get).toBeInstanceOf(Function);
      expect(movement.config.set).toBeInstanceOf(Function);
      expect(movement.config.reset).toBeInstanceOf(Function);
      expect(movement.config.validate).toBeInstanceOf(Function);
    });

    test('should provide debug commands', () => {
      const movement = (window as any).movement;

      expect(movement.debug).toBeDefined();
      expect(movement.debug.enable).toBeInstanceOf(Function);
      expect(movement.debug.disable).toBeInstanceOf(Function);
      expect(movement.debug.toggle).toBeInstanceOf(Function);
      expect(movement.debug.status).toBeInstanceOf(Function);
    });

    test('should provide visualization commands', () => {
      const movement = (window as any).movement;

      expect(movement.visualize).toBeDefined();
      expect(movement.visualize.range).toBeInstanceOf(Function);
      expect(movement.visualize.path).toBeInstanceOf(Function);
      expect(movement.visualize.clear).toBeInstanceOf(Function);
    });

    test('should provide test scenario commands', () => {
      const movement = (window as any).movement;

      expect(movement.test).toBeDefined();
      expect(movement.test.scenario).toBeInstanceOf(Function);
      expect(movement.test.list).toBeInstanceOf(Function);
      expect(movement.test.custom).toBeInstanceOf(Function);
      expect(movement.test.stress).toBeInstanceOf(Function);
    });
  });

  describe('Development Tools Integration', () => {
    test('should register global development interface', () => {
      expect((window as any).dev).toBeDefined();
      expect((window as any).dev.help).toBeInstanceOf(Function);
    });

    test('should provide quick access methods', () => {
      const dev = (window as any).dev;

      expect(dev.enable).toBeInstanceOf(Function);
      expect(dev.disable).toBeInstanceOf(Function);
      expect(dev.test).toBeInstanceOf(Function);
      expect(dev.report).toBeInstanceOf(Function);
    });

    test('should provide configuration management', () => {
      const dev = (window as any).dev;

      expect(dev.config).toBeDefined();
      expect(dev.config.get).toBeInstanceOf(Function);
      expect(dev.config.set).toBeInstanceOf(Function);
      expect(dev.config.reset).toBeInstanceOf(Function);
    });

    test('should provide performance monitoring', () => {
      const dev = (window as any).dev;

      expect(dev.monitor).toBeDefined();
      expect(dev.monitor.start).toBeInstanceOf(Function);
      expect(dev.monitor.stop).toBeInstanceOf(Function);
      expect(dev.monitor.status).toBeInstanceOf(Function);
    });

    test('should provide session information', () => {
      const dev = (window as any).dev;

      expect(dev.session).toBeDefined();
      expect(dev.session.state).toBeInstanceOf(Function);
      expect(dev.session.duration).toBeInstanceOf(Function);
    });
  });

  describe('End-to-End Integration', () => {
    test('should integrate all debugging components', () => {
      // Enable debug mode through development tools
      const dev = (window as any).dev;
      dev.enable();

      // Use console commands to configure system
      const movement = (window as any).movement;
      const configResult = movement.config.set({
        enableMovementDebug: true,
        showMovementRangeDebug: true,
      });
      expect(configResult.success).toBe(true);

      // Verify configuration was applied
      const config = gameConfig.getMovementSystemConfig();
      expect(config.enableMovementDebug).toBe(true);
      expect(config.showMovementRangeDebug).toBe(true);
    });

    test('should provide comprehensive help system', () => {
      // Test movement help
      const movement = (window as any).movement;
      expect(() => movement.help()).not.toThrow();

      // Test development help
      const dev = (window as any).dev;
      expect(() => dev.help()).not.toThrow();

      // Test debug help
      const movementDebug = (window as any).movementDebug;
      if (movementDebug) {
        expect(() => movementDebug.help()).not.toThrow();
      }
    });

    test('should handle error cases gracefully', () => {
      const movement = (window as any).movement;

      // Test invalid configuration
      const invalidConfigResult = movement.config.set({
        animationConfig: { moveSpeed: -100 },
      });
      expect(invalidConfigResult.success).toBe(false);

      // Test invalid character selection
      const invalidCharResult = movement.character.select('NonExistentCharacter');
      expect(invalidCharResult.success).toBe(false);
    });
  });

  describe('Performance and Memory', () => {
    test('should not leak memory during debug operations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform multiple debug operations
      debugManager.enableDebugMode();
      for (let i = 0; i < 10; i++) {
        debugManager.visualizeMovementRange(testCharacter);
        debugManager.update(Date.now(), 16);
      }
      debugManager.disableDebugMode();

      // Memory should not increase significantly
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Allow for some memory increase but not excessive
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    test('should maintain performance during debug operations', () => {
      debugManager.enableDebugMode();

      const startTime = performance.now();

      // Perform debug operations
      for (let i = 0; i < 100; i++) {
        debugManager.update(Date.now(), 16);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});
