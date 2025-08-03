/**
 * MovementTestUtils - Development helper functions for movement system testing
 *
 * Provides utility functions for testing and debugging the movement system:
 * - Test data generation (characters, maps, scenarios)
 * - Movement validation helpers
 * - Performance testing utilities
 * - Automated test scenario execution
 * - Mock data creation for unit tests
 */

import { Unit, Position, MapData } from '../types/gameplay';
import { TerrainCost, MovementError, PositionUtils } from '../types/movement';
import { MovementSystem } from '../systems/MovementSystem';
import { MovementCalculator } from '../systems/MovementCalculator';
import { PathfindingService } from '../systems/PathfindingService';

/**
 * Test character template for creating test units
 */
export interface TestCharacterTemplate {
  name: string;
  position: Position;
  movement: number;
  faction: 'player' | 'enemy';
  stats?: {
    maxHP?: number;
    maxMP?: number;
    attack?: number;
    defense?: number;
    speed?: number;
  };
}

/**
 * Test map configuration for generating test maps
 */
export interface TestMapConfig {
  width: number;
  height: number;
  tileSize: number;
  terrainPattern?: 'empty' | 'obstacles' | 'maze' | 'islands' | 'custom';
  customTerrain?: string[][];
  obstaclePercentage?: number;
}

/**
 * Movement test result for validation
 */
export interface MovementTestResult {
  success: boolean;
  testName: string;
  executionTime: number;
  expectedResult: any;
  actualResult: any;
  error?: string;
  details?: any;
}

/**
 * Performance benchmark result
 */
export interface PerformanceBenchmark {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: number;
}

/**
 * MovementTestUtils class providing development helper functions
 */
export class MovementTestUtils {
  private static idCounter = 0;

  /**
   * Create a test character with specified parameters
   * @param template - Character template
   * @returns Created test character
   */
  public static createTestCharacter(template: TestCharacterTemplate): Unit {
    const defaultStats = {
      maxHP: 100,
      maxMP: 50,
      attack: 10,
      defense: 5,
      speed: 8,
    };

    const stats = { ...defaultStats, ...template.stats, movement: template.movement };

    return {
      id: `test_character_${++this.idCounter}`,
      name: template.name,
      position: { ...template.position },
      stats: stats,
      currentHP: stats.maxHP,
      currentMP: stats.maxMP,
      faction: template.faction,
      hasActed: false,
      hasMoved: false,
    };
  }

  /**
   * Create multiple test characters from templates
   * @param templates - Array of character templates
   * @returns Array of created test characters
   */
  public static createTestCharacters(templates: TestCharacterTemplate[]): Unit[] {
    return templates.map(template => this.createTestCharacter(template));
  }

  /**
   * Create a test map with specified configuration
   * @param config - Map configuration
   * @returns Generated test map data
   */
  public static createTestMap(config: TestMapConfig): MapData {
    const terrain = this.generateTerrain(config);

    // Convert terrain strings to tile IDs for the layer data
    const terrainTileMap: { [key: string]: number } = {
      grass: 0,
      forest: 1,
      mountain: 2,
      water: 3,
      wall: 4,
      road: 5,
      bridge: 6,
    };

    const terrainLayerData: number[][] = terrain.map(row =>
      row.map(tile => terrainTileMap[tile] || 0)
    );

    return {
      width: config.width,
      height: config.height,
      tileSize: config.tileSize,
      layers: [
        {
          name: 'terrain',
          type: 'terrain',
          data: terrainLayerData,
          visible: true,
          opacity: 1.0,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: config.width - 1, y: config.height - 1 }],
    };
  }

  /**
   * Generate terrain data based on pattern
   * @param config - Map configuration
   * @returns 2D terrain array
   */
  private static generateTerrain(config: TestMapConfig): string[][] {
    const terrain: string[][] = [];

    // Initialize with grass
    for (let y = 0; y < config.height; y++) {
      terrain[y] = [];
      for (let x = 0; x < config.width; x++) {
        terrain[y][x] = 'grass';
      }
    }

    switch (config.terrainPattern) {
      case 'empty':
        // Already initialized with grass
        break;

      case 'obstacles':
        this.addRandomObstacles(terrain, config.obstaclePercentage || 20);
        break;

      case 'maze':
        this.generateMazeTerrain(terrain);
        break;

      case 'islands':
        this.generateIslandTerrain(terrain);
        break;

      case 'custom':
        if (config.customTerrain) {
          return config.customTerrain;
        }
        break;
    }

    return terrain;
  }

  /**
   * Add random obstacles to terrain
   * @param terrain - Terrain array to modify
   * @param percentage - Percentage of tiles to make obstacles
   */
  private static addRandomObstacles(terrain: string[][], percentage: number): void {
    const height = terrain.length;
    const width = terrain[0].length;
    const obstacleCount = Math.floor((width * height * percentage) / 100);

    for (let i = 0; i < obstacleCount; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      terrain[y][x] = 'wall';
    }
  }

  /**
   * Generate maze-like terrain pattern
   * @param terrain - Terrain array to modify
   */
  private static generateMazeTerrain(terrain: string[][]): void {
    const height = terrain.length;
    const width = terrain[0].length;

    // Create maze walls
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x++) {
        if (x % 4 !== 0) {
          terrain[y][x] = 'wall';
        }
      }
    }

    for (let x = 0; x < width; x += 4) {
      for (let y = 0; y < height; y++) {
        if (y % 3 !== 0) {
          terrain[y][x] = 'wall';
        }
      }
    }
  }

  /**
   * Generate island terrain pattern
   * @param terrain - Terrain array to modify
   */
  private static generateIslandTerrain(terrain: string[][]): void {
    const height = terrain.length;
    const width = terrain[0].length;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Fill with water
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        terrain[y][x] = 'water';
      }
    }

    // Create islands
    const islands = [
      { x: centerX, y: centerY, radius: 5 },
      { x: centerX - 8, y: centerY - 6, radius: 3 },
      { x: centerX + 8, y: centerY + 6, radius: 3 },
    ];

    islands.forEach(island => {
      for (
        let y = Math.max(0, island.y - island.radius);
        y <= Math.min(height - 1, island.y + island.radius);
        y++
      ) {
        for (
          let x = Math.max(0, island.x - island.radius);
          x <= Math.min(width - 1, island.x + island.radius);
          x++
        ) {
          const distance = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
          if (distance <= island.radius) {
            terrain[y][x] = distance <= island.radius - 2 ? 'grass' : 'forest';
          }
        }
      }
    });
  }

  /**
   * Validate movement system behavior with test scenarios
   * @param movementSystem - Movement system to test
   * @param scenarios - Test scenarios to run
   * @returns Array of test results
   */
  public static async validateMovementSystem(
    movementSystem: MovementSystem,
    scenarios: Array<{
      name: string;
      character: Unit;
      destination: Position;
      expectedResult: 'success' | 'failure';
      expectedError?: MovementError;
    }>
  ): Promise<MovementTestResult[]> {
    const results: MovementTestResult[] = [];

    for (const scenario of scenarios) {
      const startTime = performance.now();

      try {
        const result = await movementSystem.executeMovement(
          scenario.character,
          scenario.destination
        );
        const executionTime = performance.now() - startTime;

        const testResult: MovementTestResult = {
          success:
            (result.success && scenario.expectedResult === 'success') ||
            (!result.success && scenario.expectedResult === 'failure'),
          testName: scenario.name,
          executionTime: executionTime,
          expectedResult: scenario.expectedResult,
          actualResult: result.success ? 'success' : 'failure',
          details: result,
        };

        if (!testResult.success) {
          testResult.error = `Expected ${scenario.expectedResult}, got ${testResult.actualResult}`;
        }

        results.push(testResult);
      } catch (error) {
        const executionTime = performance.now() - startTime;
        results.push({
          success: false,
          testName: scenario.name,
          executionTime: executionTime,
          expectedResult: scenario.expectedResult,
          actualResult: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Run performance benchmark on movement calculations
   * @param calculator - Movement calculator to benchmark
   * @param character - Test character
   * @param mapData - Test map data
   * @param iterations - Number of iterations to run
   * @returns Performance benchmark results
   */
  public static benchmarkMovementCalculation(
    calculator: MovementCalculator,
    character: Unit,
    mapData: MapData,
    iterations: number = 100
  ): PerformanceBenchmark {
    const times: number[] = [];
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      calculator.calculateMovementRange(character, mapData, []);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const totalTime = times.reduce((sum, time) => sum + time, 0);

    return {
      testName: 'Movement Range Calculation',
      iterations: iterations,
      totalTime: totalTime,
      averageTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: Math.round((endMemory - startMemory) / 1024), // KB
    };
  }

  /**
   * Run performance benchmark on pathfinding
   * @param pathfindingService - Pathfinding service to benchmark
   * @param start - Start position
   * @param goal - Goal position
   * @param mapData - Test map data
   * @param maxMovement - Maximum movement points
   * @param iterations - Number of iterations to run
   * @returns Performance benchmark results
   */
  public static benchmarkPathfinding(
    pathfindingService: PathfindingService,
    start: Position,
    goal: Position,
    mapData: MapData,
    maxMovement: number,
    iterations: number = 100
  ): PerformanceBenchmark {
    const times: number[] = [];
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      pathfindingService.findPath(start, goal, mapData, maxMovement, []);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const totalTime = times.reduce((sum, time) => sum + time, 0);

    return {
      testName: 'Pathfinding',
      iterations: iterations,
      totalTime: totalTime,
      averageTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: Math.round((endMemory - startMemory) / 1024), // KB
    };
  }

  /**
   * Generate comprehensive test scenarios for movement system
   * @param mapData - Map data for testing
   * @returns Array of test scenarios
   */
  public static generateTestScenarios(mapData: MapData): Array<{
    name: string;
    character: Unit;
    destination: Position;
    expectedResult: 'success' | 'failure';
    expectedError?: MovementError;
  }> {
    const scenarios = [];

    // Valid movement scenario
    scenarios.push({
      name: 'Valid Movement',
      character: this.createTestCharacter({
        name: 'ValidMover',
        position: { x: 0, y: 0 },
        movement: 5,
        faction: 'player' as const,
      }),
      destination: { x: 3, y: 3 },
      expectedResult: 'success' as const,
    });

    // Out of range movement
    scenarios.push({
      name: 'Out of Range Movement',
      character: this.createTestCharacter({
        name: 'ShortRangeMover',
        position: { x: 0, y: 0 },
        movement: 2,
        faction: 'player' as const,
      }),
      destination: { x: 10, y: 10 },
      expectedResult: 'failure' as const,
      expectedError: MovementError.DESTINATION_UNREACHABLE,
    });

    // Movement to occupied position
    scenarios.push({
      name: 'Movement to Occupied Position',
      character: this.createTestCharacter({
        name: 'BlockedMover',
        position: { x: 0, y: 0 },
        movement: 5,
        faction: 'player' as const,
      }),
      destination: { x: 2, y: 2 }, // Assume this position is occupied
      expectedResult: 'failure' as const,
      expectedError: MovementError.DESTINATION_OCCUPIED,
    });

    // Movement outside map bounds
    scenarios.push({
      name: 'Movement Outside Map',
      character: this.createTestCharacter({
        name: 'OutOfBoundsMover',
        position: { x: 5, y: 5 },
        movement: 10,
        faction: 'player' as const,
      }),
      destination: { x: mapData.width + 5, y: mapData.height + 5 },
      expectedResult: 'failure' as const,
      expectedError: MovementError.INVALID_POSITION,
    });

    // Zero movement character
    scenarios.push({
      name: 'Zero Movement Character',
      character: this.createTestCharacter({
        name: 'ImmobileMover',
        position: { x: 5, y: 5 },
        movement: 0,
        faction: 'player' as const,
      }),
      destination: { x: 6, y: 6 },
      expectedResult: 'failure' as const,
      expectedError: MovementError.INSUFFICIENT_MOVEMENT_POINTS,
    });

    return scenarios;
  }

  /**
   * Create a stress test scenario with many characters and obstacles
   * @param mapSize - Size of the test map
   * @param characterCount - Number of characters to create
   * @param obstaclePercentage - Percentage of map to fill with obstacles
   * @returns Stress test configuration
   */
  public static createStressTestScenario(
    mapSize: number,
    characterCount: number,
    obstaclePercentage: number
  ): {
    mapData: MapData;
    characters: Unit[];
    testMoves: Array<{ character: Unit; destination: Position }>;
  } {
    // Create test map
    const mapData = this.createTestMap({
      width: mapSize,
      height: mapSize,
      tileSize: 32,
      terrainPattern: 'obstacles',
      obstaclePercentage: obstaclePercentage,
    });

    // Create test characters
    const characters: Unit[] = [];
    for (let i = 0; i < characterCount; i++) {
      let position: Position;
      let attempts = 0;

      // Find a valid position for the character
      do {
        position = {
          x: Math.floor(Math.random() * mapSize),
          y: Math.floor(Math.random() * mapSize),
        };
        attempts++;
      } while (
        attempts < 100 &&
        (this.getTileTypeAtPosition(mapData, position) === 'wall' ||
          characters.some(c => PositionUtils.equals(c.position, position)))
      );

      if (attempts < 100) {
        characters.push(
          this.createTestCharacter({
            name: `StressTestCharacter${i}`,
            position: position,
            movement: Math.floor(Math.random() * 5) + 3, // 3-7 movement
            faction: i % 2 === 0 ? 'player' : 'enemy',
          })
        );
      }
    }

    // Generate test moves
    const testMoves = characters.map(character => ({
      character: character,
      destination: {
        x: Math.floor(Math.random() * mapSize),
        y: Math.floor(Math.random() * mapSize),
      },
    }));

    return {
      mapData: mapData,
      characters: characters,
      testMoves: testMoves,
    };
  }

  /**
   * Validate pathfinding correctness
   * @param pathfindingService - Pathfinding service to test
   * @param start - Start position
   * @param goal - Goal position
   * @param mapData - Map data
   * @param maxMovement - Maximum movement points
   * @returns Validation result
   */
  public static validatePathfinding(
    pathfindingService: PathfindingService,
    start: Position,
    goal: Position,
    mapData: MapData,
    maxMovement: number
  ): {
    isValid: boolean;
    path: Position[];
    totalCost: number;
    errors: string[];
  } {
    const errors: string[] = [];
    const path = pathfindingService.findPath(start, goal, mapData, maxMovement, []);

    // Check if path exists when it should
    const directDistance = PositionUtils.manhattanDistance(start, goal);
    if (directDistance <= maxMovement && path.length === 0) {
      errors.push('No path found when one should exist');
    }

    // Validate path continuity
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const distance = PositionUtils.manhattanDistance(current, next);

      if (distance !== 1) {
        errors.push(`Path discontinuity between step ${i} and ${i + 1}`);
      }
    }

    // Validate path starts and ends correctly
    if (path.length > 0) {
      if (!PositionUtils.equals(path[0], start)) {
        errors.push('Path does not start at the correct position');
      }

      if (!PositionUtils.equals(path[path.length - 1], goal)) {
        errors.push('Path does not end at the correct position');
      }
    }

    // Calculate total cost
    const totalCost = pathfindingService.calculatePathCost(path, mapData);

    // Check if path cost exceeds maximum movement
    if (totalCost > maxMovement && path.length > 0) {
      errors.push(`Path cost (${totalCost}) exceeds maximum movement (${maxMovement})`);
    }

    return {
      isValid: errors.length === 0,
      path: path,
      totalCost: totalCost,
      errors: errors,
    };
  }

  /**
   * Get tile type at position from map data
   * @param mapData - Map data
   * @param position - Position to check
   * @returns Tile type string
   */
  public static getTileTypeAtPosition(mapData: MapData, position: Position): string {
    if (
      position.x < 0 ||
      position.x >= mapData.width ||
      position.y < 0 ||
      position.y >= mapData.height
    ) {
      return 'wall'; // Out of bounds treated as wall
    }

    // Find terrain layer
    const terrainLayer = mapData.layers.find(layer => layer.type === 'terrain');
    if (!terrainLayer) {
      return 'grass'; // Default to grass if no terrain layer
    }

    const tileId = terrainLayer.data[position.y][position.x];

    // Map tile IDs back to terrain types
    const tileIdToTerrain: { [key: number]: string } = {
      0: 'grass',
      1: 'forest',
      2: 'mountain',
      3: 'water',
      4: 'wall',
      5: 'road',
      6: 'bridge',
    };

    return tileIdToTerrain[tileId] || 'grass';
  }

  /**
   * Generate random test positions within map bounds
   * @param mapData - Map data for bounds checking
   * @param count - Number of positions to generate
   * @param avoidTerrain - Terrain types to avoid
   * @returns Array of valid test positions
   */
  public static generateRandomPositions(
    mapData: MapData,
    count: number,
    avoidTerrain: string[] = ['wall', 'water']
  ): Position[] {
    const positions: Position[] = [];
    let attempts = 0;
    const maxAttempts = count * 10;

    while (positions.length < count && attempts < maxAttempts) {
      const position = {
        x: Math.floor(Math.random() * mapData.width),
        y: Math.floor(Math.random() * mapData.height),
      };

      const terrain = this.getTileTypeAtPosition(mapData, position);
      if (!avoidTerrain.includes(terrain)) {
        positions.push(position);
      }

      attempts++;
    }

    return positions;
  }

  /**
   * Print test results in a formatted way
   * @param results - Test results to print
   */
  public static printTestResults(results: MovementTestResult[]): void {
    console.log('\n=== Movement System Test Results ===');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    console.log('\nDetailed Results:');
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(
        `${index + 1}. ${status} ${result.testName} (${result.executionTime.toFixed(2)}ms)`
      );

      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    console.log(`\nAverage Execution Time: ${avgTime.toFixed(2)}ms`);
  }

  /**
   * Print performance benchmark results
   * @param benchmark - Benchmark results to print
   */
  public static printBenchmarkResults(benchmark: PerformanceBenchmark): void {
    console.log(`\n=== ${benchmark.testName} Benchmark Results ===`);
    console.log(`Iterations: ${benchmark.iterations}`);
    console.log(`Total Time: ${benchmark.totalTime.toFixed(2)}ms`);
    console.log(`Average Time: ${benchmark.averageTime.toFixed(2)}ms`);
    console.log(`Min Time: ${benchmark.minTime.toFixed(2)}ms`);
    console.log(`Max Time: ${benchmark.maxTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${benchmark.memoryUsage}KB`);
    console.log(`Operations/Second: ${(1000 / benchmark.averageTime).toFixed(0)}`);
  }
}
