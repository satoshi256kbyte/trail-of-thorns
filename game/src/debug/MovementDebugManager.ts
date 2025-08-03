/**
 * MovementDebugManager - Specialized debugging tools for the movement system
 *
 * Provides comprehensive debugging capabilities for movement system development:
 * - Movement range visualization with cost indicators
 * - Pathfinding algorithm step-by-step visualization
 * - Movement cost calculation debugging
 * - Console commands for movement testing scenarios
 * - Performance monitoring for movement calculations
 * - Development helper functions for movement testing
 */

import * as Phaser from 'phaser';
import { Unit, Position, MapData } from '../types/gameplay';
import { MovementState, MovementError, TerrainCost, PositionUtils } from '../types/movement';
import { MovementSystem } from '../systems/MovementSystem';
import { MovementCalculator } from '../systems/MovementCalculator';
import { PathfindingService } from '../systems/PathfindingService';
import { MovementSystemConfig } from '../config/GameConfig';

/**
 * Movement debug visualization options
 */
export interface MovementDebugVisualization {
  showMovementRange: boolean;
  showPathfinding: boolean;
  showMovementCosts: boolean;
  showBlockedTiles: boolean;
  showAlternativePaths: boolean;
  showPerformanceMetrics: boolean;
}

/**
 * Movement debug performance metrics
 */
export interface MovementDebugMetrics {
  lastRangeCalculationTime: number;
  lastPathfindingTime: number;
  averageRangeCalculationTime: number;
  averagePathfindingTime: number;
  totalRangeCalculations: number;
  totalPathfindingOperations: number;
  memoryUsage: number;
}

/**
 * Movement test scenario definition
 */
export interface MovementTestScenario {
  name: string;
  description: string;
  setup: () => void;
  execute: () => Promise<void>;
  cleanup: () => void;
}

/**
 * MovementDebugManager class for movement system debugging
 */
export class MovementDebugManager {
  private scene: Phaser.Scene;
  private movementSystem?: MovementSystem;
  private config: MovementSystemConfig;
  private isEnabled: boolean = false;

  // Debug visualization elements
  private debugContainer?: Phaser.GameObjects.Container;
  private movementRangeGraphics?: Phaser.GameObjects.Graphics;
  private pathfindingGraphics?: Phaser.GameObjects.Graphics;
  private movementCostTexts: Phaser.GameObjects.Text[] = [];
  private performanceText?: Phaser.GameObjects.Text;

  // Debug state
  private visualization: MovementDebugVisualization = {
    showMovementRange: false,
    showPathfinding: false,
    showMovementCosts: false,
    showBlockedTiles: false,
    showAlternativePaths: false,
    showPerformanceMetrics: false,
  };

  // Performance tracking
  private metrics: MovementDebugMetrics = {
    lastRangeCalculationTime: 0,
    lastPathfindingTime: 0,
    averageRangeCalculationTime: 0,
    averagePathfindingTime: 0,
    totalRangeCalculations: 0,
    totalPathfindingOperations: 0,
    memoryUsage: 0,
  };

  // Test scenarios
  private testScenarios: Map<string, MovementTestScenario> = new Map();

  // Map and character references
  private mapData?: MapData;
  private testCharacters: Unit[] = [];

  /**
   * Constructor
   * @param scene - Phaser scene instance
   * @param config - Movement system configuration
   */
  constructor(scene: Phaser.Scene, config: MovementSystemConfig) {
    this.scene = scene;
    this.config = config;

    this.initializeTestScenarios();
    this.setupConsoleCommands();

    console.log('MovementDebugManager: Initialized');
  }

  /**
   * Set the movement system reference for debugging
   * @param movementSystem - MovementSystem instance
   */
  public setMovementSystem(movementSystem: MovementSystem): void {
    this.movementSystem = movementSystem;
    console.log('MovementDebugManager: Movement system reference set');
  }

  /**
   * Set map data for debugging
   * @param mapData - Map data
   */
  public setMapData(mapData: MapData): void {
    this.mapData = mapData;
    console.log('MovementDebugManager: Map data set');
  }

  /**
   * Enable movement debug mode
   */
  public enableDebugMode(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    console.log('MovementDebugManager: Debug mode enabled');

    // Create debug container
    this.createDebugContainer();

    // Initialize debug visualizations based on configuration
    if (this.config.showMovementRangeDebug) {
      this.enableMovementRangeVisualization();
    }

    if (this.config.showPathfindingDebug) {
      this.enablePathfindingVisualization();
    }

    if (this.config.showMovementCostDebug) {
      this.enableMovementCostVisualization();
    }

    // Show performance metrics if enabled
    this.enablePerformanceMetrics();

    // Emit debug mode enabled event
    this.scene.events.emit('movement-debug-enabled');
  }

  /**
   * Disable movement debug mode
   */
  public disableDebugMode(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    console.log('MovementDebugManager: Debug mode disabled');

    // Clean up debug visualizations
    this.clearAllVisualizations();

    // Destroy debug container
    if (this.debugContainer) {
      this.debugContainer.destroy();
      this.debugContainer = undefined;
    }

    // Emit debug mode disabled event
    this.scene.events.emit('movement-debug-disabled');
  }

  /**
   * Toggle movement debug mode
   */
  public toggleDebugMode(): void {
    if (this.isEnabled) {
      this.disableDebugMode();
    } else {
      this.enableDebugMode();
    }
  }

  /**
   * Update debug information (called from scene update loop)
   * @param time - Current time in milliseconds
   * @param delta - Time elapsed since last frame in milliseconds
   */
  public update(time: number, delta: number): void {
    if (!this.isEnabled) {
      return;
    }

    // Update performance metrics
    this.updatePerformanceMetrics();

    // Update movement cost visualization if enabled
    if (this.visualization.showMovementCosts) {
      this.updateMovementCostVisualization();
    }
  }

  /**
   * Visualize movement range calculation for a character
   * @param character - Character to visualize movement range for
   */
  public visualizeMovementRange(character: Unit): void {
    if (!this.isEnabled || !this.mapData || !this.movementRangeGraphics) {
      return;
    }

    const startTime = performance.now();

    // Calculate movement range using MovementCalculator
    const calculator = new MovementCalculator(this.config.terrainCosts);
    const occupiedPositions = this.getOccupiedPositions();
    const movementRange = calculator.calculateMovementRange(
      character,
      this.mapData,
      occupiedPositions
    );

    // Record performance metrics
    const calculationTime = performance.now() - startTime;
    this.recordRangeCalculationTime(calculationTime);

    // Clear previous visualization
    this.movementRangeGraphics.clear();

    // Visualize movement range with cost indicators
    movementRange.forEach(position => {
      const cost = calculator.getMovementCostToPosition(
        character,
        position,
        this.mapData!,
        occupiedPositions
      );
      this.drawMovementRangeTile(position, cost, character.stats.movement);
    });

    console.log(
      `MovementDebugManager: Visualized movement range for ${character.name} (${movementRange.length} tiles, ${calculationTime.toFixed(2)}ms)`
    );
  }

  /**
   * Visualize pathfinding algorithm steps
   * @param start - Start position
   * @param goal - Goal position
   * @param character - Character for movement constraints
   */
  public visualizePathfinding(start: Position, goal: Position, character: Unit): void {
    if (!this.isEnabled || !this.mapData || !this.pathfindingGraphics) {
      return;
    }

    const startTime = performance.now();

    // Create pathfinding service with debug callbacks
    const pathfindingService = new PathfindingService(this.config.terrainCosts);
    const occupiedPositions = this.getOccupiedPositions();

    // Clear previous visualization
    this.pathfindingGraphics.clear();

    // Find path and visualize steps
    const path = pathfindingService.findPath(
      start,
      goal,
      this.mapData,
      character.stats.movement,
      occupiedPositions
    );

    // Record performance metrics
    const pathfindingTime = performance.now() - startTime;
    this.recordPathfindingTime(pathfindingTime);

    // Visualize the found path
    if (path.length > 0) {
      this.drawPathfindingPath(path);
      console.log(
        `MovementDebugManager: Visualized pathfinding from (${start.x},${start.y}) to (${goal.x},${goal.y}) - ${path.length} steps, ${pathfindingTime.toFixed(2)}ms`
      );
    } else {
      console.log(
        `MovementDebugManager: No path found from (${start.x},${start.y}) to (${goal.x},${goal.y}) - ${pathfindingTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Test movement scenario by name
   * @param scenarioName - Name of the test scenario
   */
  public async testMovementScenario(scenarioName: string): Promise<void> {
    const scenario = this.testScenarios.get(scenarioName.toLowerCase());
    if (!scenario) {
      console.error(`MovementDebugManager: Unknown test scenario '${scenarioName}'`);
      return;
    }

    console.log(`MovementDebugManager: Running test scenario '${scenario.name}'`);
    console.log(`Description: ${scenario.description}`);

    try {
      // Setup scenario
      scenario.setup();

      // Execute scenario
      await scenario.execute();

      // Cleanup scenario
      scenario.cleanup();

      console.log(`MovementDebugManager: Test scenario '${scenario.name}' completed successfully`);
    } catch (error) {
      console.error(`MovementDebugManager: Test scenario '${scenario.name}' failed:`, error);
      scenario.cleanup(); // Ensure cleanup even on failure
    }
  }

  /**
   * Get current performance metrics
   * @returns Movement debug metrics
   */
  public getPerformanceMetrics(): MovementDebugMetrics {
    return { ...this.metrics };
  }

  /**
   * Create debug container
   */
  private createDebugContainer(): void {
    this.debugContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(9000);

    // Create graphics objects for different visualizations
    this.movementRangeGraphics = this.scene.add.graphics().setDepth(9001);

    this.pathfindingGraphics = this.scene.add.graphics().setDepth(9002);

    this.debugContainer.add([this.movementRangeGraphics, this.pathfindingGraphics]);
  }

  /**
   * Enable movement range visualization
   */
  private enableMovementRangeVisualization(): void {
    this.visualization.showMovementRange = true;
    console.log('MovementDebugManager: Movement range visualization enabled');
  }

  /**
   * Enable pathfinding visualization
   */
  private enablePathfindingVisualization(): void {
    this.visualization.showPathfinding = true;
    console.log('MovementDebugManager: Pathfinding visualization enabled');
  }

  /**
   * Enable movement cost visualization
   */
  private enableMovementCostVisualization(): void {
    this.visualization.showMovementCosts = true;
    console.log('MovementDebugManager: Movement cost visualization enabled');
  }

  /**
   * Enable performance metrics display
   */
  private enablePerformanceMetrics(): void {
    if (!this.debugContainer) {
      return;
    }

    this.visualization.showPerformanceMetrics = true;

    this.performanceText = this.scene.add
      .text(10, 100, '', {
        fontSize: '10px',
        color: '#00ff00',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 5, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(10001);

    this.debugContainer.add(this.performanceText);
    console.log('MovementDebugManager: Performance metrics enabled');
  }

  /**
   * Clear all debug visualizations
   */
  private clearAllVisualizations(): void {
    if (this.movementRangeGraphics) {
      this.movementRangeGraphics.clear();
    }

    if (this.pathfindingGraphics) {
      this.pathfindingGraphics.clear();
    }

    this.movementCostTexts.forEach(text => text.destroy());
    this.movementCostTexts = [];

    if (this.performanceText) {
      this.performanceText.destroy();
      this.performanceText = undefined;
    }
  }

  /**
   * Draw movement range tile with cost indicator
   * @param position - Tile position
   * @param cost - Movement cost to reach this tile
   * @param maxMovement - Character's maximum movement
   */
  private drawMovementRangeTile(position: Position, cost: number, maxMovement: number): void {
    if (!this.mapData || !this.movementRangeGraphics) {
      return;
    }

    const tileSize = this.mapData.tileSize;
    const worldX = position.x * tileSize;
    const worldY = position.y * tileSize;

    // Color based on movement cost
    let color = this.config.debugColors.movementRange;
    let alpha = 0.3;

    if (cost > maxMovement) {
      color = this.config.debugColors.blockedTiles;
      alpha = 0.5;
    } else if (cost > maxMovement * 0.8) {
      color = 0xffaa00; // Orange for high cost
      alpha = 0.4;
    }

    // Draw tile background
    this.movementRangeGraphics
      .fillStyle(color, alpha)
      .fillRect(worldX, worldY, tileSize, tileSize)
      .lineStyle(1, color, 0.8)
      .strokeRect(worldX, worldY, tileSize, tileSize);

    // Add cost text if movement cost visualization is enabled
    if (this.visualization.showMovementCosts) {
      const costText = this.scene.add
        .text(worldX + tileSize / 2, worldY + tileSize / 2, cost.toString(), {
          fontSize: '8px',
          color: '#ffffff',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(9003);

      this.movementCostTexts.push(costText);
    }
  }

  /**
   * Draw pathfinding path visualization
   * @param path - Path positions
   */
  private drawPathfindingPath(path: Position[]): void {
    if (!this.mapData || !this.pathfindingGraphics || path.length === 0) {
      return;
    }

    const tileSize = this.mapData.tileSize;

    // Draw path line
    this.pathfindingGraphics.lineStyle(3, this.config.debugColors.pathfinding, 0.8);

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];

      const currentWorldX = current.x * tileSize + tileSize / 2;
      const currentWorldY = current.y * tileSize + tileSize / 2;
      const nextWorldX = next.x * tileSize + tileSize / 2;
      const nextWorldY = next.y * tileSize + tileSize / 2;

      if (i === 0) {
        this.pathfindingGraphics.moveTo(currentWorldX, currentWorldY);
      }
      this.pathfindingGraphics.lineTo(nextWorldX, nextWorldY);
    }

    this.pathfindingGraphics.strokePath();

    // Draw path step numbers
    path.forEach((position, index) => {
      const worldX = position.x * tileSize + tileSize / 2;
      const worldY = position.y * tileSize + tileSize / 2;

      // Draw step circle
      this.pathfindingGraphics
        .fillStyle(this.config.debugColors.pathfinding, 0.8)
        .fillCircle(worldX, worldY, 8)
        .lineStyle(1, 0xffffff, 1)
        .strokeCircle(worldX, worldY, 8);

      // Add step number
      const stepText = this.scene.add
        .text(worldX, worldY, index.toString(), {
          fontSize: '8px',
          color: '#ffffff',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(9004);

      this.movementCostTexts.push(stepText);
    });
  }

  /**
   * Update movement cost visualization
   */
  private updateMovementCostVisualization(): void {
    // Clear existing cost texts
    this.movementCostTexts.forEach(text => text.destroy());
    this.movementCostTexts = [];

    // Re-render if there's a selected character
    if (this.movementSystem) {
      const selectedCharacter = this.movementSystem.getSelectedCharacter();
      if (selectedCharacter) {
        this.visualizeMovementRange(selectedCharacter);
      }
    }
  }

  /**
   * Update performance metrics display
   */
  private updatePerformanceMetrics(): void {
    if (!this.performanceText || !this.visualization.showPerformanceMetrics) {
      return;
    }

    // Update memory usage estimate
    if ((performance as any).memory) {
      this.metrics.memoryUsage = Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    }

    const metricsDisplay = [
      'Movement Debug Metrics:',
      `Range Calc: ${this.metrics.lastRangeCalculationTime.toFixed(2)}ms (avg: ${this.metrics.averageRangeCalculationTime.toFixed(2)}ms)`,
      `Pathfinding: ${this.metrics.lastPathfindingTime.toFixed(2)}ms (avg: ${this.metrics.averagePathfindingTime.toFixed(2)}ms)`,
      `Total Range Calcs: ${this.metrics.totalRangeCalculations}`,
      `Total Pathfinding: ${this.metrics.totalPathfindingOperations}`,
      `Memory: ${this.metrics.memoryUsage}MB`,
    ].join('\n');

    this.performanceText.setText(metricsDisplay);
  }

  /**
   * Record range calculation time for performance tracking
   * @param time - Calculation time in milliseconds
   */
  private recordRangeCalculationTime(time: number): void {
    this.metrics.lastRangeCalculationTime = time;
    this.metrics.totalRangeCalculations++;

    // Update running average
    this.metrics.averageRangeCalculationTime =
      (this.metrics.averageRangeCalculationTime * (this.metrics.totalRangeCalculations - 1) +
        time) /
      this.metrics.totalRangeCalculations;
  }

  /**
   * Record pathfinding time for performance tracking
   * @param time - Pathfinding time in milliseconds
   */
  private recordPathfindingTime(time: number): void {
    this.metrics.lastPathfindingTime = time;
    this.metrics.totalPathfindingOperations++;

    // Update running average
    this.metrics.averagePathfindingTime =
      (this.metrics.averagePathfindingTime * (this.metrics.totalPathfindingOperations - 1) + time) /
      this.metrics.totalPathfindingOperations;
  }

  /**
   * Get occupied positions for collision detection
   * @returns Array of occupied positions
   */
  private getOccupiedPositions(): Position[] {
    return this.testCharacters.map(character => character.position);
  }

  /**
   * Initialize test scenarios for movement system testing
   */
  private initializeTestScenarios(): void {
    // Basic movement test
    this.testScenarios.set('basic-movement', {
      name: 'Basic Movement',
      description: 'Test basic character movement functionality',
      setup: () => {
        console.log('Setting up basic movement test...');
        this.createTestCharacter({ x: 5, y: 5 }, 'TestCharacter1');
      },
      execute: async () => {
        if (this.movementSystem && this.testCharacters.length > 0) {
          const character = this.testCharacters[0];
          const destination = { x: 8, y: 8 };

          console.log(
            `Moving ${character.name} from (${character.position.x},${character.position.y}) to (${destination.x},${destination.y})`
          );

          const result = await this.movementSystem.executeMovement(character, destination);
          console.log('Movement result:', result);
        }
      },
      cleanup: () => {
        this.clearTestCharacters();
      },
    });

    // Pathfinding stress test
    this.testScenarios.set('pathfinding-stress', {
      name: 'Pathfinding Stress Test',
      description: 'Test pathfinding performance with multiple obstacles',
      setup: () => {
        console.log('Setting up pathfinding stress test...');
        this.createTestCharacter({ x: 0, y: 0 }, 'StressTestCharacter');
        // Create obstacles
        for (let i = 1; i < 10; i++) {
          this.createTestCharacter({ x: i, y: 5 }, `Obstacle${i}`);
        }
      },
      execute: async () => {
        if (this.movementSystem && this.testCharacters.length > 0) {
          const character = this.testCharacters[0];
          const destination = { x: 15, y: 10 };

          const startTime = performance.now();
          this.visualizePathfinding(character.position, destination, character);
          const endTime = performance.now();

          console.log(`Pathfinding stress test completed in ${(endTime - startTime).toFixed(2)}ms`);
        }
      },
      cleanup: () => {
        this.clearTestCharacters();
      },
    });

    // Range calculation test
    this.testScenarios.set('range-calculation', {
      name: 'Range Calculation Test',
      description: 'Test movement range calculation with different movement values',
      setup: () => {
        console.log('Setting up range calculation test...');
      },
      execute: async () => {
        const movementValues = [1, 3, 5, 8, 10];

        for (const movement of movementValues) {
          const testCharacter = this.createTestCharacter({ x: 10, y: 10 }, `RangeTest${movement}`);
          testCharacter.stats.movement = movement;

          console.log(`Testing range calculation for movement ${movement}`);
          this.visualizeMovementRange(testCharacter);

          // Wait a bit to see the visualization
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
      cleanup: () => {
        this.clearTestCharacters();
      },
    });
  }

  /**
   * Create a test character for debugging
   * @param position - Character position
   * @param name - Character name
   * @returns Created test character
   */
  private createTestCharacter(position: Position, name: string): Unit {
    const testCharacter: Unit = {
      id: `test_${name}_${Date.now()}`,
      name: name,
      position: position,
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 10,
        defense: 5,
        speed: 8,
        movement: 4,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    this.testCharacters.push(testCharacter);
    console.log(`Created test character: ${name} at (${position.x},${position.y})`);

    return testCharacter;
  }

  /**
   * Clear all test characters
   */
  private clearTestCharacters(): void {
    this.testCharacters = [];
    console.log('Cleared all test characters');
  }

  /**
   * Setup console commands for movement debugging
   */
  private setupConsoleCommands(): void {
    // Add movement debug commands to global scope for console access
    (window as any).movementDebug = {
      enable: () => this.enableDebugMode(),
      disable: () => this.disableDebugMode(),
      toggle: () => this.toggleDebugMode(),

      visualizeRange: (characterName: string) => {
        const character = this.testCharacters.find(c => c.name === characterName);
        if (character) {
          this.visualizeMovementRange(character);
        } else {
          console.error(`Character '${characterName}' not found`);
        }
      },

      visualizePath: (startX: number, startY: number, goalX: number, goalY: number) => {
        if (this.testCharacters.length > 0) {
          const character = this.testCharacters[0];
          this.visualizePathfinding({ x: startX, y: startY }, { x: goalX, y: goalY }, character);
        } else {
          console.error('No test character available for pathfinding');
        }
      },

      testScenario: (scenarioName: string) => {
        this.testMovementScenario(scenarioName);
      },

      listScenarios: () => {
        console.log('Available test scenarios:');
        this.testScenarios.forEach(scenario => {
          console.log(`  ${scenario.name}: ${scenario.description}`);
        });
      },

      metrics: () => {
        console.log('Movement Debug Metrics:', this.getPerformanceMetrics());
      },

      createTestCharacter: (x: number, y: number, name: string, movement?: number) => {
        const character = this.createTestCharacter({ x, y }, name);
        if (movement !== undefined) {
          character.stats.movement = movement;
        }
        return character;
      },

      clearTestCharacters: () => {
        this.clearTestCharacters();
      },

      help: () => {
        console.log('Movement Debug Commands:');
        console.log('  movementDebug.enable() - Enable movement debug mode');
        console.log('  movementDebug.disable() - Disable movement debug mode');
        console.log('  movementDebug.toggle() - Toggle movement debug mode');
        console.log('  movementDebug.visualizeRange(characterName) - Visualize movement range');
        console.log(
          '  movementDebug.visualizePath(startX, startY, goalX, goalY) - Visualize pathfinding'
        );
        console.log('  movementDebug.testScenario(scenarioName) - Run test scenario');
        console.log('  movementDebug.listScenarios() - List available test scenarios');
        console.log('  movementDebug.metrics() - Show performance metrics');
        console.log(
          '  movementDebug.createTestCharacter(x, y, name, movement?) - Create test character'
        );
        console.log('  movementDebug.clearTestCharacters() - Clear all test characters');
        console.log('  movementDebug.help() - Show this help');
      },
    };

    console.log(
      'MovementDebugManager: Console commands registered. Type "movementDebug.help()" for available commands.'
    );
  }
}
