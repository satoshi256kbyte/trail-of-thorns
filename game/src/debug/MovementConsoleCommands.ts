/**
 * MovementConsoleCommands - Enhanced console commands for movement system debugging
 *
 * Provides comprehensive console commands for testing and debugging the movement system:
 * - Movement system configuration commands
 * - Test scenario execution commands
 * - Performance benchmarking commands
 * - Visual debugging commands
 * - Development helper commands
 */

import { MovementSystem } from '../systems/MovementSystem';
import { MovementDebugManager } from './MovementDebugManager';
import {
  MovementTestUtils,
  TestCharacterTemplate,
  TestMapConfig,
} from '../utils/MovementTestUtils';
import { GameConfig } from '../config/GameConfig';
import { Unit, Position, MapData } from '../types/gameplay';
import { MovementError } from '../types/movement';

/**
 * Console command result
 */
export interface ConsoleCommandResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * MovementConsoleCommands class for enhanced debugging commands
 */
export class MovementConsoleCommands {
  private movementSystem?: MovementSystem;
  private debugManager?: MovementDebugManager;
  private gameConfig: GameConfig;
  private testMapData?: MapData;
  private testCharacters: Unit[] = [];

  /**
   * Constructor
   */
  constructor() {
    this.gameConfig = new GameConfig();
    this.setupGlobalCommands();
    console.log('MovementConsoleCommands: Enhanced console commands registered');
    console.log('Type "movement.help()" for available commands');
  }

  /**
   * Set movement system reference
   * @param movementSystem - MovementSystem instance
   */
  public setMovementSystem(movementSystem: MovementSystem): void {
    this.movementSystem = movementSystem;
    this.debugManager = movementSystem.getDebugManager();
    console.log('MovementConsoleCommands: Movement system reference set');
  }

  /**
   * Setup global console commands
   */
  private setupGlobalCommands(): void {
    (window as any).movement = {
      // Configuration commands
      config: {
        get: () => this.getConfig(),
        set: (config: any) => this.setConfig(config),
        reset: () => this.resetConfig(),
        validate: () => this.validateConfig(),
      },

      // Debug mode commands
      debug: {
        enable: () => this.enableDebug(),
        disable: () => this.disableDebug(),
        toggle: () => this.toggleDebug(),
        status: () => this.getDebugStatus(),
      },

      // Visualization commands
      visualize: {
        range: (characterName?: string) => this.visualizeRange(characterName),
        path: (startX: number, startY: number, goalX: number, goalY: number) =>
          this.visualizePath(startX, startY, goalX, goalY),
        clear: () => this.clearVisualizations(),
      },

      // Test scenario commands
      test: {
        scenario: (name: string) => this.runTestScenario(name),
        list: () => this.listTestScenarios(),
        custom: (config: any) => this.runCustomTest(config),
        stress: (mapSize?: number, characterCount?: number, obstaclePercentage?: number) =>
          this.runStressTest(mapSize, characterCount, obstaclePercentage),
      },

      // Performance commands
      benchmark: {
        movement: (iterations?: number) => this.benchmarkMovement(iterations),
        pathfinding: (iterations?: number) => this.benchmarkPathfinding(iterations),
        all: (iterations?: number) => this.benchmarkAll(iterations),
      },

      // Character management commands
      character: {
        create: (x: number, y: number, name: string, movement?: number) =>
          this.createTestCharacter(x, y, name, movement),
        list: () => this.listTestCharacters(),
        select: (name: string) => this.selectCharacter(name),
        move: (characterName: string, x: number, y: number) =>
          this.moveCharacter(characterName, x, y),
        clear: () => this.clearTestCharacters(),
      },

      // Map commands
      map: {
        create: (config: TestMapConfig) => this.createTestMap(config),
        load: (mapData: MapData) => this.loadTestMap(mapData),
        info: () => this.getMapInfo(),
        presets: () => this.getMapPresets(),
      },

      // System information commands
      info: {
        system: () => this.getSystemInfo(),
        state: () => this.getMovementState(),
        metrics: () => this.getPerformanceMetrics(),
        subsystems: () => this.getSubsystemInfo(),
      },

      // Utility commands
      utils: {
        distance: (x1: number, y1: number, x2: number, y2: number) =>
          this.calculateDistance(x1, y1, x2, y2),
        validate: (characterName: string, x: number, y: number) =>
          this.validateMovement(characterName, x, y),
        cost: (x1: number, y1: number, x2: number, y2: number) =>
          this.calculateMovementCost(x1, y1, x2, y2),
      },

      // Help command
      help: () => this.showHelp(),
    };
  }

  // ===== CONFIGURATION COMMANDS =====

  private getConfig(): ConsoleCommandResult {
    const config = this.gameConfig.getMovementSystemConfig();
    console.log('Current Movement System Configuration:', config);
    return { success: true, message: 'Configuration retrieved', data: config };
  }

  private setConfig(config: any): ConsoleCommandResult {
    try {
      this.gameConfig.updateMovementSystemConfig(config);
      console.log('Movement system configuration updated:', config);
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update configuration:', errorMessage);
      return { success: false, message: `Configuration update failed: ${errorMessage}` };
    }
  }

  private resetConfig(): ConsoleCommandResult {
    // Reset to default configuration
    const defaultConfig = {
      enableVisualFeedback: true,
      enablePathPreview: true,
      enableMovementAnimation: true,
      enableMovementDebug: process.env.NODE_ENV === 'development',
      showMovementRangeDebug: false,
      showPathfindingDebug: false,
      showMovementCostDebug: false,
    };

    this.gameConfig.updateMovementSystemConfig(defaultConfig);
    console.log('Movement system configuration reset to defaults');
    return { success: true, message: 'Configuration reset to defaults' };
  }

  private validateConfig(): ConsoleCommandResult {
    const isValid = this.gameConfig.validateConfig();
    const message = isValid ? 'Configuration is valid' : 'Configuration has errors';
    console.log(message);
    return { success: isValid, message };
  }

  // ===== DEBUG MODE COMMANDS =====

  private enableDebug(): ConsoleCommandResult {
    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    this.movementSystem.enableDebugMode();
    return { success: true, message: 'Debug mode enabled' };
  }

  private disableDebug(): ConsoleCommandResult {
    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    this.movementSystem.disableDebugMode();
    return { success: true, message: 'Debug mode disabled' };
  }

  private toggleDebug(): ConsoleCommandResult {
    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    this.movementSystem.toggleDebugMode();
    return { success: true, message: 'Debug mode toggled' };
  }

  private getDebugStatus(): ConsoleCommandResult {
    const config = this.gameConfig.getMovementSystemConfig();
    const status = {
      debugEnabled: config.enableMovementDebug,
      rangeDebug: config.showMovementRangeDebug,
      pathfindingDebug: config.showPathfindingDebug,
      costDebug: config.showMovementCostDebug,
    };

    console.log('Debug Status:', status);
    return { success: true, message: 'Debug status retrieved', data: status };
  }

  // ===== VISUALIZATION COMMANDS =====

  private visualizeRange(characterName?: string): ConsoleCommandResult {
    if (!this.debugManager) {
      return { success: false, message: 'Debug manager not available' };
    }

    let character: Unit | undefined;
    if (characterName) {
      character = this.testCharacters.find(c => c.name === characterName);
      if (!character) {
        return { success: false, message: `Character '${characterName}' not found` };
      }
    } else if (this.testCharacters.length > 0) {
      character = this.testCharacters[0];
    } else {
      return { success: false, message: 'No character available for visualization' };
    }

    this.debugManager.visualizeMovementRange(character);
    return { success: true, message: `Movement range visualized for ${character.name}` };
  }

  private visualizePath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number
  ): ConsoleCommandResult {
    if (!this.debugManager) {
      return { success: false, message: 'Debug manager not available' };
    }

    if (this.testCharacters.length === 0) {
      return { success: false, message: 'No test character available for pathfinding' };
    }

    const character = this.testCharacters[0];
    this.debugManager.visualizePathfinding(
      { x: startX, y: startY },
      { x: goalX, y: goalY },
      character
    );

    return {
      success: true,
      message: `Pathfinding visualized from (${startX},${startY}) to (${goalX},${goalY})`,
    };
  }

  private clearVisualizations(): ConsoleCommandResult {
    if (!this.debugManager) {
      return { success: false, message: 'Debug manager not available' };
    }

    // Clear visualizations by disabling and re-enabling debug mode
    this.debugManager.disableDebugMode();
    this.debugManager.enableDebugMode();

    return { success: true, message: 'Visualizations cleared' };
  }

  // ===== TEST SCENARIO COMMANDS =====

  private async runTestScenario(name: string): Promise<ConsoleCommandResult> {
    if (!this.debugManager) {
      return { success: false, message: 'Debug manager not available' };
    }

    try {
      await this.debugManager.testMovementScenario(name);
      return { success: true, message: `Test scenario '${name}' completed` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Test scenario failed: ${errorMessage}` };
    }
  }

  private listTestScenarios(): ConsoleCommandResult {
    const scenarios = [
      'basic-movement: Test basic character movement functionality',
      'pathfinding-stress: Test pathfinding performance with multiple obstacles',
      'range-calculation: Test movement range calculation with different movement values',
    ];

    console.log('Available Test Scenarios:');
    scenarios.forEach(scenario => console.log(`  ${scenario}`));

    return { success: true, message: 'Test scenarios listed', data: scenarios };
  }

  private async runCustomTest(config: any): Promise<ConsoleCommandResult> {
    try {
      // Create custom test based on configuration
      const testConfig = {
        characterCount: config.characterCount || 1,
        mapSize: config.mapSize || 20,
        obstaclePercentage: config.obstaclePercentage || 10,
        movementRange: config.movementRange || 5,
      };

      console.log('Running custom test with configuration:', testConfig);

      // Create test map
      const mapData = MovementTestUtils.createTestMap({
        width: testConfig.mapSize,
        height: testConfig.mapSize,
        tileSize: 32,
        terrainPattern: 'obstacles',
        obstaclePercentage: testConfig.obstaclePercentage,
      });

      // Create test characters
      const characters = [];
      for (let i = 0; i < testConfig.characterCount; i++) {
        const character = MovementTestUtils.createTestCharacter({
          name: `CustomTestChar${i}`,
          position: { x: i * 2, y: i * 2 },
          movement: testConfig.movementRange,
          faction: 'player',
        });
        characters.push(character);
      }

      this.testCharacters = characters;
      this.testMapData = mapData;

      if (this.debugManager) {
        this.debugManager.setMapData(mapData);
      }

      console.log(
        `Custom test setup complete: ${characters.length} characters on ${testConfig.mapSize}x${testConfig.mapSize} map`
      );
      return { success: true, message: 'Custom test setup completed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Custom test failed: ${errorMessage}` };
    }
  }

  private async runStressTest(
    mapSize = 50,
    characterCount = 20,
    obstaclePercentage = 30
  ): Promise<ConsoleCommandResult> {
    try {
      console.log(
        `Running stress test: ${mapSize}x${mapSize} map, ${characterCount} characters, ${obstaclePercentage}% obstacles`
      );

      const stressTest = MovementTestUtils.createStressTestScenario(
        mapSize,
        characterCount,
        obstaclePercentage
      );
      this.testMapData = stressTest.mapData;
      this.testCharacters = stressTest.characters;

      if (this.debugManager) {
        this.debugManager.setMapData(stressTest.mapData);
      }

      // Run movement calculations for all test moves
      const startTime = performance.now();
      let successfulMoves = 0;

      for (const testMove of stressTest.testMoves) {
        try {
          if (this.movementSystem) {
            const result = await this.movementSystem.executeMovement(
              testMove.character,
              testMove.destination
            );
            if (result.success) {
              successfulMoves++;
            }
          }
        } catch (error) {
          // Continue with other moves
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const results = {
        totalMoves: stressTest.testMoves.length,
        successfulMoves: successfulMoves,
        failedMoves: stressTest.testMoves.length - successfulMoves,
        totalTime: totalTime,
        averageTimePerMove: totalTime / stressTest.testMoves.length,
      };

      console.log('Stress Test Results:', results);
      return { success: true, message: 'Stress test completed', data: results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Stress test failed: ${errorMessage}` };
    }
  }

  // ===== PERFORMANCE COMMANDS =====

  private benchmarkMovement(iterations = 100): ConsoleCommandResult {
    if (!this.testMapData || this.testCharacters.length === 0) {
      return { success: false, message: 'Test map and characters required for benchmarking' };
    }

    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    const subsystems = this.movementSystem.getSubsystems();
    const character = this.testCharacters[0];

    const benchmark = MovementTestUtils.benchmarkMovementCalculation(
      subsystems.calculator,
      character,
      this.testMapData,
      iterations
    );

    MovementTestUtils.printBenchmarkResults(benchmark);
    return { success: true, message: 'Movement benchmark completed', data: benchmark };
  }

  private benchmarkPathfinding(iterations = 100): ConsoleCommandResult {
    if (!this.testMapData || this.testCharacters.length === 0) {
      return { success: false, message: 'Test map and characters required for benchmarking' };
    }

    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    const subsystems = this.movementSystem.getSubsystems();
    const character = this.testCharacters[0];
    const start = character.position;
    const goal = { x: this.testMapData.width - 1, y: this.testMapData.height - 1 };

    const benchmark = MovementTestUtils.benchmarkPathfinding(
      subsystems.pathfinding,
      start,
      goal,
      this.testMapData,
      character.stats.movement,
      iterations
    );

    MovementTestUtils.printBenchmarkResults(benchmark);
    return { success: true, message: 'Pathfinding benchmark completed', data: benchmark };
  }

  private async benchmarkAll(iterations = 100): Promise<ConsoleCommandResult> {
    console.log('Running comprehensive performance benchmark...');

    const movementResult = this.benchmarkMovement(iterations);
    const pathfindingResult = this.benchmarkPathfinding(iterations);

    const results = {
      movement: movementResult.data,
      pathfinding: pathfindingResult.data,
    };

    console.log('Comprehensive Benchmark Results:', results);
    return { success: true, message: 'Comprehensive benchmark completed', data: results };
  }

  // ===== CHARACTER MANAGEMENT COMMANDS =====

  private createTestCharacter(
    x: number,
    y: number,
    name: string,
    movement = 4
  ): ConsoleCommandResult {
    const character = MovementTestUtils.createTestCharacter({
      name: name,
      position: { x, y },
      movement: movement,
      faction: 'player',
    });

    this.testCharacters.push(character);
    console.log(`Created test character: ${name} at (${x},${y}) with ${movement} movement`);

    return { success: true, message: `Test character '${name}' created`, data: character };
  }

  private listTestCharacters(): ConsoleCommandResult {
    if (this.testCharacters.length === 0) {
      console.log('No test characters available');
      return { success: true, message: 'No test characters available' };
    }

    console.log('Test Characters:');
    this.testCharacters.forEach((character, index) => {
      console.log(
        `  ${index + 1}. ${character.name} at (${character.position.x},${character.position.y}) - Movement: ${character.stats.movement}`
      );
    });

    return { success: true, message: 'Test characters listed', data: this.testCharacters };
  }

  private selectCharacter(name: string): ConsoleCommandResult {
    const character = this.testCharacters.find(c => c.name === name);
    if (!character) {
      return { success: false, message: `Character '${name}' not found` };
    }

    if (this.movementSystem) {
      this.movementSystem.selectCharacterForMovement(character);
    }

    console.log(`Selected character: ${name}`);
    return { success: true, message: `Character '${name}' selected`, data: character };
  }

  private async moveCharacter(
    characterName: string,
    x: number,
    y: number
  ): Promise<ConsoleCommandResult> {
    const character = this.testCharacters.find(c => c.name === characterName);
    if (!character) {
      return { success: false, message: `Character '${characterName}' not found` };
    }

    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    try {
      const result = await this.movementSystem.executeMovement(character, { x, y });
      const message = result.success
        ? `Character '${characterName}' moved to (${x},${y})`
        : `Movement failed: ${result.error}`;

      console.log(message);
      return { success: result.success, message, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Movement failed: ${errorMessage}` };
    }
  }

  private clearTestCharacters(): ConsoleCommandResult {
    this.testCharacters = [];
    console.log('All test characters cleared');
    return { success: true, message: 'Test characters cleared' };
  }

  // ===== MAP COMMANDS =====

  private createTestMap(config: TestMapConfig): ConsoleCommandResult {
    try {
      this.testMapData = MovementTestUtils.createTestMap(config);

      if (this.debugManager) {
        this.debugManager.setMapData(this.testMapData);
      }

      console.log(
        `Test map created: ${config.width}x${config.height}, pattern: ${config.terrainPattern}`
      );
      return { success: true, message: 'Test map created', data: this.testMapData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Map creation failed: ${errorMessage}` };
    }
  }

  private loadTestMap(mapData: MapData): ConsoleCommandResult {
    this.testMapData = mapData;

    if (this.debugManager) {
      this.debugManager.setMapData(mapData);
    }

    console.log(`Test map loaded: ${mapData.width}x${mapData.height}`);
    return { success: true, message: 'Test map loaded' };
  }

  private getMapInfo(): ConsoleCommandResult {
    if (!this.testMapData) {
      return { success: false, message: 'No test map available' };
    }

    const info = {
      width: this.testMapData.width,
      height: this.testMapData.height,
      tileSize: this.testMapData.tileSize,
      layers: this.testMapData.layers.length,
      playerSpawns: this.testMapData.playerSpawns.length,
      enemySpawns: this.testMapData.enemySpawns.length,
    };

    console.log('Test Map Info:', info);
    return { success: true, message: 'Map info retrieved', data: info };
  }

  private getMapPresets(): ConsoleCommandResult {
    const presets = [
      {
        name: 'small-empty',
        config: { width: 10, height: 10, tileSize: 32, terrainPattern: 'empty' },
      },
      {
        name: 'medium-obstacles',
        config: {
          width: 20,
          height: 20,
          tileSize: 32,
          terrainPattern: 'obstacles',
          obstaclePercentage: 20,
        },
      },
      {
        name: 'large-maze',
        config: { width: 30, height: 30, tileSize: 32, terrainPattern: 'maze' },
      },
      {
        name: 'islands',
        config: { width: 25, height: 25, tileSize: 32, terrainPattern: 'islands' },
      },
    ];

    console.log('Available Map Presets:');
    presets.forEach(preset => {
      console.log(
        `  ${preset.name}: ${preset.config.width}x${preset.config.height} ${preset.config.terrainPattern}`
      );
    });

    return { success: true, message: 'Map presets listed', data: presets };
  }

  // ===== SYSTEM INFORMATION COMMANDS =====

  private getSystemInfo(): ConsoleCommandResult {
    const info = {
      movementSystemAvailable: !!this.movementSystem,
      debugManagerAvailable: !!this.debugManager,
      testMapLoaded: !!this.testMapData,
      testCharacterCount: this.testCharacters.length,
      configuration: this.gameConfig.getMovementSystemConfig(),
    };

    console.log('Movement System Info:', info);
    return { success: true, message: 'System info retrieved', data: info };
  }

  private getMovementState(): ConsoleCommandResult {
    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    const state = this.movementSystem.getMovementState();
    console.log('Movement State:', state);
    return { success: true, message: 'Movement state retrieved', data: state };
  }

  private getPerformanceMetrics(): ConsoleCommandResult {
    if (!this.debugManager) {
      return { success: false, message: 'Debug manager not available' };
    }

    const metrics = this.debugManager.getPerformanceMetrics();
    console.log('Performance Metrics:', metrics);
    return { success: true, message: 'Performance metrics retrieved', data: metrics };
  }

  private getSubsystemInfo(): ConsoleCommandResult {
    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    const subsystems = this.movementSystem.getSubsystems();
    const info = {
      calculator: !!subsystems.calculator,
      pathfinding: !!subsystems.pathfinding,
      renderer: !!subsystems.renderer,
      executor: !!subsystems.executor,
      errorHandler: !!subsystems.errorHandler,
    };

    console.log('Subsystem Info:', info);
    return { success: true, message: 'Subsystem info retrieved', data: info };
  }

  // ===== UTILITY COMMANDS =====

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): ConsoleCommandResult {
    const manhattan = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    const euclidean = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    const result = {
      manhattan: manhattan,
      euclidean: euclidean,
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
    };

    console.log(`Distance from (${x1},${y1}) to (${x2},${y2}):`, result);
    return { success: true, message: 'Distance calculated', data: result };
  }

  private validateMovement(characterName: string, x: number, y: number): ConsoleCommandResult {
    const character = this.testCharacters.find(c => c.name === characterName);
    if (!character) {
      return { success: false, message: `Character '${characterName}' not found` };
    }

    if (!this.movementSystem) {
      return { success: false, message: 'Movement system not available' };
    }

    try {
      const validation = this.movementSystem.validateMovement(character, { x, y });
      console.log(`Movement validation for ${characterName} to (${x},${y}):`, validation);
      return {
        success: validation.valid,
        message: validation.message || 'Movement validated',
        data: validation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Validation failed: ${errorMessage}` };
    }
  }

  private calculateMovementCost(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): ConsoleCommandResult {
    if (!this.testMapData || !this.movementSystem) {
      return { success: false, message: 'Test map and movement system required' };
    }

    if (this.testCharacters.length === 0) {
      return { success: false, message: 'Test character required for cost calculation' };
    }

    try {
      const subsystems = this.movementSystem.getSubsystems();
      const character = this.testCharacters[0];
      const cost = subsystems.calculator.getMovementCost(
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        this.testMapData
      );

      const result = {
        cost: cost,
        from: { x: x1, y: y1 },
        to: { x: x2, y: y2 },
        character: character.name,
      };

      console.log(`Movement cost from (${x1},${y1}) to (${x2},${y2}):`, result);
      return { success: true, message: 'Movement cost calculated', data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Cost calculation failed: ${errorMessage}` };
    }
  }

  // ===== HELP COMMAND =====

  private showHelp(): ConsoleCommandResult {
    const helpText = `
=== Movement System Console Commands ===

Configuration Commands:
  movement.config.get()                    - Get current configuration
  movement.config.set(config)              - Update configuration
  movement.config.reset()                  - Reset to default configuration
  movement.config.validate()               - Validate current configuration

Debug Mode Commands:
  movement.debug.enable()                  - Enable debug mode
  movement.debug.disable()                 - Disable debug mode
  movement.debug.toggle()                  - Toggle debug mode
  movement.debug.status()                  - Get debug status

Visualization Commands:
  movement.visualize.range(characterName?) - Visualize movement range
  movement.visualize.path(x1,y1,x2,y2)     - Visualize pathfinding
  movement.visualize.clear()               - Clear visualizations

Test Scenario Commands:
  movement.test.scenario(name)             - Run test scenario
  movement.test.list()                     - List available scenarios
  movement.test.custom(config)             - Run custom test
  movement.test.stress(size?,chars?,obs?)  - Run stress test

Performance Commands:
  movement.benchmark.movement(iterations?) - Benchmark movement calculations
  movement.benchmark.pathfinding(iter?)    - Benchmark pathfinding
  movement.benchmark.all(iterations?)      - Run all benchmarks

Character Management Commands:
  movement.character.create(x,y,name,mov?) - Create test character
  movement.character.list()                - List test characters
  movement.character.select(name)          - Select character
  movement.character.move(name,x,y)        - Move character
  movement.character.clear()               - Clear all test characters

Map Commands:
  movement.map.create(config)              - Create test map
  movement.map.load(mapData)               - Load test map
  movement.map.info()                      - Get map information
  movement.map.presets()                   - List map presets

System Information Commands:
  movement.info.system()                   - Get system information
  movement.info.state()                    - Get movement state
  movement.info.metrics()                  - Get performance metrics
  movement.info.subsystems()               - Get subsystem information

Utility Commands:
  movement.utils.distance(x1,y1,x2,y2)     - Calculate distance
  movement.utils.validate(name,x,y)        - Validate movement
  movement.utils.cost(x1,y1,x2,y2)         - Calculate movement cost

Examples:
  movement.character.create(5, 5, "TestChar", 4)
  movement.visualize.range("TestChar")
  movement.test.scenario("basic-movement")
  movement.benchmark.movement(50)
        `;

    console.log(helpText);
    return { success: true, message: 'Help displayed' };
  }
}
