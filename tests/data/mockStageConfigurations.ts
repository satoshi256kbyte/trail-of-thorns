/**
 * Mock stage configurations and test data for comprehensive testing
 * Provides various stage scenarios for testing different gameplay situations
 *
 * Implements requirement 6.5: Create test data and mock stage configurations for testing
 */

import { StageData, Unit, MapData, VictoryCondition } from '../../game/src/types/gameplay';

/**
 * Test data factory for creating various stage configurations
 */
export class MockStageFactory {
  /**
   * Creates a basic stage for simple testing scenarios
   */
  static createBasicStage(): StageData {
    return {
      id: 'basic-test-stage',
      name: 'Basic Test Stage',
      description: 'Simple stage for basic functionality testing',
      mapData: {
        width: 8,
        height: 6,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(6)
              .fill(null)
              .map(() => Array(8).fill(1)),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [{ x: 1, y: 4 }],
        enemySpawns: [{ x: 6, y: 1 }],
      },
      playerUnits: [
        {
          id: 'basic-hero',
          name: 'Basic Hero',
          position: { x: 1, y: 4 },
          stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 10, speed: 10, movement: 3 },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'basic-enemy',
          name: 'Basic Enemy',
          position: { x: 6, y: 1 },
          stats: { maxHP: 80, maxMP: 20, attack: 15, defense: 8, speed: 8, movement: 2 },
          currentHP: 80,
          currentMP: 20,
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
    };
  }

  /**
   * Creates a large stage for performance and stress testing
   */
  static createLargeStage(): StageData {
    const width = 20;
    const height = 15;
    const playerCount = 8;
    const enemyCount = 10;

    return {
      id: 'large-test-stage',
      name: 'Large Test Stage',
      description: 'Large stage for performance and stress testing',
      mapData: {
        width,
        height,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(height)
              .fill(null)
              .map(() => Array(width).fill(1)),
            visible: true,
            opacity: 1.0,
          },
          {
            name: 'terrain',
            type: 'terrain',
            data: Array(height)
              .fill(null)
              .map((_, y) =>
                Array(width)
                  .fill(null)
                  .map((_, x) => {
                    // Create some terrain variation
                    if (x > 5 && x < 14 && y > 3 && y < 11) return 2; // Different terrain
                    return 0;
                  })
              ),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: Array(playerCount)
          .fill(null)
          .map((_, i) => ({
            x: 1 + (i % 4),
            y: 12 + Math.floor(i / 4),
          })),
        enemySpawns: Array(enemyCount)
          .fill(null)
          .map((_, i) => ({
            x: 15 + (i % 5),
            y: 1 + Math.floor(i / 5),
          })),
      },
      playerUnits: Array(playerCount)
        .fill(null)
        .map((_, i) => ({
          id: `large-player-${i}`,
          name: `Player Unit ${i + 1}`,
          position: { x: 1 + (i % 4), y: 12 + Math.floor(i / 4) },
          stats: {
            maxHP: 90 + i * 5,
            maxMP: 40 + i * 3,
            attack: 18 + i * 2,
            defense: 12 + i,
            speed: 8 + (i % 5),
            movement: 2 + (i % 3),
          },
          currentHP: 90 + i * 5,
          currentMP: 40 + i * 3,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        })),
      enemyUnits: Array(enemyCount)
        .fill(null)
        .map((_, i) => ({
          id: `large-enemy-${i}`,
          name: `Enemy Unit ${i + 1}`,
          position: { x: 15 + (i % 5), y: 1 + Math.floor(i / 5) },
          stats: {
            maxHP: 70 + i * 4,
            maxMP: 30 + i * 2,
            attack: 15 + i * 2,
            defense: 10 + i,
            speed: 6 + (i % 4),
            movement: 2 + (i % 2),
          },
          currentHP: 70 + i * 4,
          currentMP: 30 + i * 2,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        })),
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };
  }

  /**
   * Creates a stage with complex victory conditions for testing
   */
  static createComplexVictoryStage(): StageData {
    return {
      id: 'complex-victory-stage',
      name: 'Complex Victory Stage',
      description: 'Stage with multiple victory conditions for testing',
      mapData: {
        width: 12,
        height: 10,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(10)
              .fill(null)
              .map(() => Array(12).fill(1)),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [
          { x: 1, y: 8 },
          { x: 2, y: 8 },
        ],
        enemySpawns: [
          { x: 10, y: 1 },
          { x: 9, y: 1 },
        ],
      },
      playerUnits: [
        {
          id: 'complex-hero',
          name: 'Hero',
          position: { x: 1, y: 8 },
          stats: { maxHP: 120, maxMP: 60, attack: 25, defense: 15, speed: 12, movement: 4 },
          currentHP: 120,
          currentMP: 60,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'complex-vip',
          name: 'VIP',
          position: { x: 2, y: 8 },
          stats: { maxHP: 60, maxMP: 40, attack: 10, defense: 5, speed: 8, movement: 2 },
          currentHP: 60,
          currentMP: 40,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'complex-boss',
          name: 'Boss',
          position: { x: 10, y: 1 },
          stats: { maxHP: 200, maxMP: 80, attack: 30, defense: 20, speed: 6, movement: 2 },
          currentHP: 200,
          currentMP: 80,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'complex-minion',
          name: 'Minion',
          position: { x: 9, y: 1 },
          stats: { maxHP: 50, maxMP: 20, attack: 12, defense: 6, speed: 10, movement: 3 },
          currentHP: 50,
          currentMP: 20,
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
        {
          type: 'reach_position',
          position: { x: 10, y: 1 },
          target: 'complex-hero',
          description: 'Move Hero to the target position',
        },
        {
          type: 'protect_unit',
          target: 'complex-vip',
          description: 'Keep VIP alive',
        },
      ],
      defeatConditions: [
        {
          type: 'protect_unit',
          target: 'complex-vip',
          description: 'VIP must not be defeated',
        },
      ],
    };
  }

  /**
   * Creates a stage with terrain obstacles for pathfinding testing
   */
  static createObstacleStage(): StageData {
    const width = 10;
    const height = 8;

    return {
      id: 'obstacle-test-stage',
      name: 'Obstacle Test Stage',
      description: 'Stage with terrain obstacles for pathfinding testing',
      mapData: {
        width,
        height,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(height)
              .fill(null)
              .map(() => Array(width).fill(1)),
            visible: true,
            opacity: 1.0,
          },
          {
            name: 'collision',
            type: 'collision',
            data: Array(height)
              .fill(null)
              .map((_, y) =>
                Array(width)
                  .fill(null)
                  .map((_, x) => {
                    // Create obstacle pattern
                    if ((x === 4 || x === 5) && y >= 2 && y <= 5) return 1; // Wall
                    if (x === 7 && y >= 1 && y <= 3) return 1; // Another obstacle
                    return 0;
                  })
              ),
            visible: true,
            opacity: 0.8,
          },
        ],
        playerSpawns: [{ x: 1, y: 6 }],
        enemySpawns: [{ x: 8, y: 1 }],
      },
      playerUnits: [
        {
          id: 'obstacle-player',
          name: 'Navigator',
          position: { x: 1, y: 6 },
          stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 12, speed: 10, movement: 4 },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'obstacle-enemy',
          name: 'Guard',
          position: { x: 8, y: 1 },
          stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 10, speed: 8, movement: 2 },
          currentHP: 80,
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
    };
  }

  /**
   * Creates a stage with damaged units for testing healing/recovery mechanics
   */
  static createDamagedUnitsStage(): StageData {
    return {
      id: 'damaged-units-stage',
      name: 'Damaged Units Stage',
      description: 'Stage with pre-damaged units for testing recovery mechanics',
      mapData: {
        width: 8,
        height: 6,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(6)
              .fill(null)
              .map(() => Array(8).fill(1)),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [
          { x: 1, y: 4 },
          { x: 2, y: 4 },
        ],
        enemySpawns: [{ x: 6, y: 1 }],
      },
      playerUnits: [
        {
          id: 'damaged-warrior',
          name: 'Wounded Warrior',
          position: { x: 1, y: 4 },
          stats: { maxHP: 100, maxMP: 30, attack: 25, defense: 15, speed: 8, movement: 3 },
          currentHP: 25, // Heavily damaged
          currentMP: 10, // Low MP
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'healer',
          name: 'Healer',
          position: { x: 2, y: 4 },
          stats: { maxHP: 80, maxMP: 100, attack: 10, defense: 8, speed: 12, movement: 2 },
          currentHP: 80,
          currentMP: 100,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'damaged-enemy',
          name: 'Wounded Orc',
          position: { x: 6, y: 1 },
          stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 10, speed: 6, movement: 2 },
          currentHP: 45, // Half health
          currentMP: 5, // Low MP
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
    };
  }

  /**
   * Creates a minimal stage for edge case testing
   */
  static createMinimalStage(): StageData {
    return {
      id: 'minimal-stage',
      name: 'Minimal Stage',
      description: 'Minimal stage configuration for edge case testing',
      mapData: {
        width: 3,
        height: 3,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: [
              [1, 1, 1],
              [1, 1, 1],
              [1, 1, 1],
            ],
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [{ x: 0, y: 2 }],
        enemySpawns: [{ x: 2, y: 0 }],
      },
      playerUnits: [
        {
          id: 'minimal-player',
          name: 'Solo',
          position: { x: 0, y: 2 },
          stats: { maxHP: 50, maxMP: 25, attack: 15, defense: 8, speed: 10, movement: 2 },
          currentHP: 50,
          currentMP: 25,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'minimal-enemy',
          name: 'Lone Enemy',
          position: { x: 2, y: 0 },
          stats: { maxHP: 40, maxMP: 20, attack: 12, defense: 6, speed: 8, movement: 2 },
          currentHP: 40,
          currentMP: 20,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        },
      ],
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat the enemy unit',
        },
      ],
    };
  }

  /**
   * Creates a stage with extreme stats for boundary testing
   */
  static createExtremeStatsStage(): StageData {
    return {
      id: 'extreme-stats-stage',
      name: 'Extreme Stats Stage',
      description: 'Stage with extreme unit stats for boundary testing',
      mapData: {
        width: 6,
        height: 4,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(4)
              .fill(null)
              .map(() => Array(6).fill(1)),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [{ x: 1, y: 2 }],
        enemySpawns: [{ x: 4, y: 1 }],
      },
      playerUnits: [
        {
          id: 'extreme-tank',
          name: 'Ultra Tank',
          position: { x: 1, y: 2 },
          stats: { maxHP: 9999, maxMP: 1, attack: 1, defense: 999, speed: 1, movement: 1 },
          currentHP: 9999,
          currentMP: 1,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [
        {
          id: 'extreme-glass-cannon',
          name: 'Glass Cannon',
          position: { x: 4, y: 1 },
          stats: { maxHP: 1, maxMP: 9999, attack: 999, defense: 1, speed: 999, movement: 10 },
          currentHP: 1,
          currentMP: 9999,
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
    };
  }

  /**
   * Creates an invalid stage for error handling testing
   */
  static createInvalidStage(): Partial<StageData> {
    return {
      id: '', // Invalid empty ID
      name: 'Invalid Stage',
      // Missing description
      mapData: {
        width: -1, // Invalid negative width
        height: 0, // Invalid zero height
        tileSize: 0, // Invalid zero tile size
        layers: [], // Empty layers array
        playerSpawns: [], // Empty spawns
        enemySpawns: [],
      },
      playerUnits: [
        {
          id: 'invalid-player',
          name: '',
          position: { x: -1, y: -1 }, // Invalid negative position
          stats: { maxHP: -10, maxMP: -5, attack: -1, defense: -1, speed: 0, movement: 0 }, // Invalid negative stats
          currentHP: 150, // HP > maxHP
          currentMP: -10, // Negative current MP
          faction: 'invalid' as any, // Invalid faction
          hasActed: false,
          hasMoved: false,
        },
      ],
      enemyUnits: [],
      victoryConditions: [],
    };
  }
}

/**
 * Predefined test scenarios for common testing patterns
 */
export const TestScenarios = {
  /**
   * Basic functionality testing
   */
  BASIC: MockStageFactory.createBasicStage(),

  /**
   * Performance and stress testing
   */
  LARGE_SCALE: MockStageFactory.createLargeStage(),

  /**
   * Complex victory condition testing
   */
  COMPLEX_VICTORY: MockStageFactory.createComplexVictoryStage(),

  /**
   * Pathfinding and movement testing
   */
  OBSTACLES: MockStageFactory.createObstacleStage(),

  /**
   * Healing and recovery mechanics testing
   */
  DAMAGED_UNITS: MockStageFactory.createDamagedUnitsStage(),

  /**
   * Edge case and boundary testing
   */
  MINIMAL: MockStageFactory.createMinimalStage(),

  /**
   * Extreme values boundary testing
   */
  EXTREME_STATS: MockStageFactory.createExtremeStatsStage(),

  /**
   * Error handling testing
   */
  INVALID: MockStageFactory.createInvalidStage(),
};

/**
 * Utility functions for test data manipulation
 */
export class TestDataUtils {
  /**
   * Creates a deep copy of stage data for modification
   */
  static cloneStageData(stageData: StageData): StageData {
    return JSON.parse(JSON.stringify(stageData));
  }

  /**
   * Modifies unit stats for testing different scenarios
   */
  static modifyUnitStats(unit: Unit, statModifiers: Partial<Unit['stats']>): Unit {
    return {
      ...unit,
      stats: {
        ...unit.stats,
        ...statModifiers,
      },
    };
  }

  /**
   * Creates a stage with custom unit count
   */
  static createStageWithUnitCount(playerCount: number, enemyCount: number): StageData {
    const baseStage = MockStageFactory.createBasicStage();

    // Generate player units
    const playerUnits = Array(playerCount)
      .fill(null)
      .map((_, i) => ({
        id: `test-player-${i}`,
        name: `Player ${i + 1}`,
        position: { x: 1 + (i % 3), y: 4 + Math.floor(i / 3) },
        stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 10, speed: 10, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player' as const,
        hasActed: false,
        hasMoved: false,
      }));

    // Generate enemy units
    const enemyUnits = Array(enemyCount)
      .fill(null)
      .map((_, i) => ({
        id: `test-enemy-${i}`,
        name: `Enemy ${i + 1}`,
        position: { x: 6 + (i % 2), y: 1 + Math.floor(i / 2) },
        stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 8, speed: 8, movement: 2 },
        currentHP: 80,
        currentMP: 30,
        faction: 'enemy' as const,
        hasActed: false,
        hasMoved: false,
      }));

    return {
      ...baseStage,
      id: `custom-${playerCount}v${enemyCount}-stage`,
      name: `${playerCount}v${enemyCount} Test Stage`,
      playerUnits,
      enemyUnits,
    };
  }

  /**
   * Creates a stage with specific map dimensions
   */
  static createStageWithMapSize(width: number, height: number): StageData {
    const baseStage = MockStageFactory.createBasicStage();

    return {
      ...baseStage,
      id: `map-${width}x${height}-stage`,
      name: `${width}x${height} Map Stage`,
      mapData: {
        ...baseStage.mapData,
        width,
        height,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(height)
              .fill(null)
              .map(() => Array(width).fill(1)),
            visible: true,
            opacity: 1.0,
          },
        ],
        playerSpawns: [{ x: 1, y: height - 2 }],
        enemySpawns: [{ x: width - 2, y: 1 }],
      },
    };
  }

  /**
   * Validates stage data structure
   */
  static validateStageData(stageData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!stageData.id || typeof stageData.id !== 'string') {
      errors.push('Invalid or missing stage ID');
    }

    if (!stageData.name || typeof stageData.name !== 'string') {
      errors.push('Invalid or missing stage name');
    }

    if (!stageData.mapData) {
      errors.push('Missing map data');
    } else {
      if (stageData.mapData.width <= 0 || stageData.mapData.height <= 0) {
        errors.push('Invalid map dimensions');
      }
      if (stageData.mapData.tileSize <= 0) {
        errors.push('Invalid tile size');
      }
      if (!Array.isArray(stageData.mapData.layers) || stageData.mapData.layers.length === 0) {
        errors.push('Invalid or missing map layers');
      }
    }

    if (!Array.isArray(stageData.playerUnits) || stageData.playerUnits.length === 0) {
      errors.push('Invalid or missing player units');
    }

    if (!Array.isArray(stageData.enemyUnits) || stageData.enemyUnits.length === 0) {
      errors.push('Invalid or missing enemy units');
    }

    if (!Array.isArray(stageData.victoryConditions) || stageData.victoryConditions.length === 0) {
      errors.push('Invalid or missing victory conditions');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Performance test data generators
 */
export class PerformanceTestData {
  /**
   * Generates stage data for memory usage testing
   */
  static generateMemoryTestStage(complexity: 'low' | 'medium' | 'high'): StageData {
    const configs = {
      low: { width: 10, height: 8, players: 3, enemies: 3, layers: 2 },
      medium: { width: 20, height: 15, players: 8, enemies: 10, layers: 3 },
      high: { width: 30, height: 25, players: 15, enemies: 20, layers: 4 },
    };

    const config = configs[complexity];

    return {
      id: `memory-test-${complexity}`,
      name: `Memory Test Stage (${complexity})`,
      description: `Stage for ${complexity} complexity memory testing`,
      mapData: {
        width: config.width,
        height: config.height,
        tileSize: 32,
        layers: Array(config.layers)
          .fill(null)
          .map((_, i) => ({
            name: `layer-${i}`,
            type: i === 0 ? 'background' : ('terrain' as any),
            data: Array(config.height)
              .fill(null)
              .map(() => Array(config.width).fill(i)),
            visible: true,
            opacity: 1.0,
          })),
        playerSpawns: Array(config.players)
          .fill(null)
          .map((_, i) => ({
            x: 1 + (i % 5),
            y: config.height - 3 + Math.floor(i / 5),
          })),
        enemySpawns: Array(config.enemies)
          .fill(null)
          .map((_, i) => ({
            x: config.width - 5 + (i % 5),
            y: 1 + Math.floor(i / 5),
          })),
      },
      playerUnits: TestDataUtils.createStageWithUnitCount(config.players, config.enemies)
        .playerUnits,
      enemyUnits: TestDataUtils.createStageWithUnitCount(config.players, config.enemies).enemyUnits,
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };
  }

  /**
   * Generates stage data for rendering performance testing
   */
  static generateRenderingTestStage(objectCount: number): StageData {
    const width = Math.ceil(Math.sqrt(objectCount * 2));
    const height = Math.ceil((objectCount * 2) / width);

    return TestDataUtils.createStageWithMapSize(width, height);
  }
}
