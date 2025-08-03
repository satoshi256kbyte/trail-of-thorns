/**
 * MovementDevelopmentTools - Comprehensive development utilities for movement system
 *
 * This file provides a centralized interface for all movement system development tools:
 * - Debug manager integration
 * - Console commands setup
 * - Test utilities access
 * - Configuration management
 * - Performance monitoring
 * - Development workflow helpers
 */

import { MovementSystem } from '../systems/MovementSystem';
import { MovementDebugManager } from './MovementDebugManager';
import { MovementConsoleCommands } from './MovementConsoleCommands';
import { MovementTestUtils } from '../utils/MovementTestUtils';
import { GameConfig } from '../config/GameConfig';
import { Unit, Position, MapData } from '../types/gameplay';

/**
 * Development session configuration
 */
export interface DevelopmentSessionConfig {
  enableDebugMode: boolean;
  enableConsoleCommands: boolean;
  enablePerformanceMonitoring: boolean;
  autoCreateTestScenario: boolean;
  defaultMapSize: number;
  defaultCharacterCount: number;
}

/**
 * Development session state
 */
export interface DevelopmentSessionState {
  sessionStartTime: number;
  debugModeEnabled: boolean;
  consoleCommandsEnabled: boolean;
  testScenarioActive: boolean;
  performanceMonitoringActive: boolean;
  totalTestsRun: number;
  totalBenchmarksRun: number;
}

/**
 * MovementDevelopmentTools - Main development utilities class
 */
export class MovementDevelopmentTools {
  private static instance: MovementDevelopmentTools | null = null;

  private movementSystem?: MovementSystem;
  private debugManager?: MovementDebugManager;
  private consoleCommands: MovementConsoleCommands;
  private gameConfig: GameConfig;

  private sessionConfig: DevelopmentSessionConfig;
  private sessionState: DevelopmentSessionState;

  private performanceMonitorInterval?: number;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.gameConfig = new GameConfig();
    this.consoleCommands = new MovementConsoleCommands();

    // Default development session configuration
    this.sessionConfig = {
      enableDebugMode: process.env.NODE_ENV === 'development',
      enableConsoleCommands: true,
      enablePerformanceMonitoring: false,
      autoCreateTestScenario: false,
      defaultMapSize: 20,
      defaultCharacterCount: 3,
    };

    // Initialize session state
    this.sessionState = {
      sessionStartTime: Date.now(),
      debugModeEnabled: false,
      consoleCommandsEnabled: false,
      testScenarioActive: false,
      performanceMonitoringActive: false,
      totalTestsRun: 0,
      totalBenchmarksRun: 0,
    };

    this.setupGlobalDevelopmentInterface();
    console.log('MovementDevelopmentTools: Development tools initialized');
  }

  /**
   * Get singleton instance
   * @returns MovementDevelopmentTools instance
   */
  public static getInstance(): MovementDevelopmentTools {
    if (!MovementDevelopmentTools.instance) {
      MovementDevelopmentTools.instance = new MovementDevelopmentTools();
    }
    return MovementDevelopmentTools.instance;
  }

  /**
   * Initialize development tools with movement system
   * @param movementSystem - MovementSystem instance
   */
  public initialize(movementSystem: MovementSystem): void {
    this.movementSystem = movementSystem;
    this.debugManager = movementSystem.getDebugManager();
    this.consoleCommands.setMovementSystem(movementSystem);

    // Apply session configuration
    if (this.sessionConfig.enableDebugMode && this.debugManager) {
      this.enableDebugMode();
    }

    if (this.sessionConfig.enableConsoleCommands) {
      this.enableConsoleCommands();
    }

    if (this.sessionConfig.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    if (this.sessionConfig.autoCreateTestScenario) {
      this.createDefaultTestScenario();
    }

    console.log('MovementDevelopmentTools: Initialized with movement system');
  }

  /**
   * Enable debug mode
   */
  public enableDebugMode(): void {
    if (this.movementSystem) {
      this.movementSystem.enableDebugMode();
      this.sessionState.debugModeEnabled = true;
      console.log('MovementDevelopmentTools: Debug mode enabled');
    }
  }

  /**
   * Disable debug mode
   */
  public disableDebugMode(): void {
    if (this.movementSystem) {
      this.movementSystem.disableDebugMode();
      this.sessionState.debugModeEnabled = false;
      console.log('MovementDevelopmentTools: Debug mode disabled');
    }
  }

  /**
   * Enable console commands
   */
  public enableConsoleCommands(): void {
    this.sessionState.consoleCommandsEnabled = true;
    console.log('MovementDevelopmentTools: Console commands enabled');
    console.log('Type "movement.help()" or "dev.help()" for available commands');
  }

  /**
   * Start performance monitoring
   */
  public startPerformanceMonitoring(): void {
    if (this.performanceMonitorInterval) {
      return; // Already monitoring
    }

    this.sessionState.performanceMonitoringActive = true;

    this.performanceMonitorInterval = window.setInterval(() => {
      this.logPerformanceMetrics();
    }, 5000); // Log every 5 seconds

    console.log('MovementDevelopmentTools: Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopPerformanceMonitoring(): void {
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = undefined;
      this.sessionState.performanceMonitoringActive = false;
      console.log('MovementDevelopmentTools: Performance monitoring stopped');
    }
  }

  /**
   * Create default test scenario for development
   */
  public createDefaultTestScenario(): void {
    try {
      // Create test map
      const mapData = MovementTestUtils.createTestMap({
        width: this.sessionConfig.defaultMapSize,
        height: this.sessionConfig.defaultMapSize,
        tileSize: 32,
        terrainPattern: 'obstacles',
        obstaclePercentage: 15,
      });

      // Create test characters
      const characters = [];
      for (let i = 0; i < this.sessionConfig.defaultCharacterCount; i++) {
        const character = MovementTestUtils.createTestCharacter({
          name: `DevChar${i + 1}`,
          position: { x: i * 3, y: i * 3 },
          movement: 4 + i,
          faction: 'player',
        });
        characters.push(character);
      }

      // Set up debug manager with test data
      if (this.debugManager) {
        this.debugManager.setMapData(mapData);
      }

      this.sessionState.testScenarioActive = true;
      console.log(
        `MovementDevelopmentTools: Default test scenario created (${this.sessionConfig.defaultMapSize}x${this.sessionConfig.defaultMapSize} map, ${characters.length} characters)`
      );
    } catch (error) {
      console.error('MovementDevelopmentTools: Failed to create default test scenario:', error);
    }
  }

  /**
   * Run comprehensive development test suite
   */
  public async runDevelopmentTestSuite(): Promise<void> {
    console.log('MovementDevelopmentTools: Running comprehensive development test suite...');

    const startTime = performance.now();
    let testsRun = 0;
    let testsPassed = 0;

    try {
      // Test 1: Basic movement functionality
      console.log('Running basic movement tests...');
      if (this.debugManager) {
        await this.debugManager.testMovementScenario('basic-movement');
        testsRun++;
        testsPassed++;
      }

      // Test 2: Pathfinding stress test
      console.log('Running pathfinding stress test...');
      if (this.debugManager) {
        await this.debugManager.testMovementScenario('pathfinding-stress');
        testsRun++;
        testsPassed++;
      }

      // Test 3: Range calculation test
      console.log('Running range calculation test...');
      if (this.debugManager) {
        await this.debugManager.testMovementScenario('range-calculation');
        testsRun++;
        testsPassed++;
      }

      // Test 4: Performance benchmarks
      console.log('Running performance benchmarks...');
      if (this.movementSystem) {
        // Create test data for benchmarks
        const testMap = MovementTestUtils.createTestMap({
          width: 30,
          height: 30,
          tileSize: 32,
          terrainPattern: 'obstacles',
          obstaclePercentage: 20,
        });

        const testCharacter = MovementTestUtils.createTestCharacter({
          name: 'BenchmarkChar',
          position: { x: 0, y: 0 },
          movement: 5,
          faction: 'player',
        });

        const subsystems = this.movementSystem.getSubsystems();

        // Movement calculation benchmark
        const movementBenchmark = MovementTestUtils.benchmarkMovementCalculation(
          subsystems.calculator,
          testCharacter,
          testMap,
          50
        );

        // Pathfinding benchmark
        const pathfindingBenchmark = MovementTestUtils.benchmarkPathfinding(
          subsystems.pathfinding,
          { x: 0, y: 0 },
          { x: 29, y: 29 },
          testMap,
          testCharacter.stats.movement,
          50
        );

        MovementTestUtils.printBenchmarkResults(movementBenchmark);
        MovementTestUtils.printBenchmarkResults(pathfindingBenchmark);

        testsRun += 2;
        testsPassed += 2;
        this.sessionState.totalBenchmarksRun += 2;
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`\n=== Development Test Suite Results ===`);
      console.log(`Tests Run: ${testsRun}`);
      console.log(`Tests Passed: ${testsPassed}`);
      console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
      console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average Time per Test: ${(totalTime / testsRun).toFixed(2)}ms`);

      this.sessionState.totalTestsRun += testsRun;
    } catch (error) {
      console.error('MovementDevelopmentTools: Test suite failed:', error);
    }
  }

  /**
   * Generate development report
   */
  public generateDevelopmentReport(): void {
    const sessionDuration = Date.now() - this.sessionState.sessionStartTime;
    const sessionDurationMinutes = Math.floor(sessionDuration / 60000);

    const report = {
      sessionInfo: {
        duration: `${sessionDurationMinutes} minutes`,
        startTime: new Date(this.sessionState.sessionStartTime).toLocaleString(),
      },
      systemStatus: {
        debugModeEnabled: this.sessionState.debugModeEnabled,
        consoleCommandsEnabled: this.sessionState.consoleCommandsEnabled,
        performanceMonitoringActive: this.sessionState.performanceMonitoringActive,
        testScenarioActive: this.sessionState.testScenarioActive,
      },
      testingStats: {
        totalTestsRun: this.sessionState.totalTestsRun,
        totalBenchmarksRun: this.sessionState.totalBenchmarksRun,
      },
      configuration: this.gameConfig.getMovementSystemConfig(),
      performanceMetrics: this.debugManager?.getPerformanceMetrics() || null,
    };

    console.log('\n=== Movement System Development Report ===');
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Setup global development interface
   */
  private setupGlobalDevelopmentInterface(): void {
    (window as any).dev = {
      // Quick access methods
      enable: () => this.enableDebugMode(),
      disable: () => this.disableDebugMode(),
      test: () => this.runDevelopmentTestSuite(),
      report: () => this.generateDevelopmentReport(),

      // Configuration methods
      config: {
        get: () => this.sessionConfig,
        set: (config: Partial<DevelopmentSessionConfig>) => {
          this.sessionConfig = { ...this.sessionConfig, ...config };
          console.log('Development configuration updated:', config);
        },
        reset: () => {
          this.sessionConfig = {
            enableDebugMode: process.env.NODE_ENV === 'development',
            enableConsoleCommands: true,
            enablePerformanceMonitoring: false,
            autoCreateTestScenario: false,
            defaultMapSize: 20,
            defaultCharacterCount: 3,
          };
          console.log('Development configuration reset to defaults');
        },
      },

      // Performance monitoring
      monitor: {
        start: () => this.startPerformanceMonitoring(),
        stop: () => this.stopPerformanceMonitoring(),
        status: () => this.sessionState.performanceMonitoringActive,
      },

      // Test scenario management
      scenario: {
        create: () => this.createDefaultTestScenario(),
        status: () => this.sessionState.testScenarioActive,
      },

      // Session information
      session: {
        state: () => this.sessionState,
        duration: () => {
          const duration = Date.now() - this.sessionState.sessionStartTime;
          return Math.floor(duration / 60000) + ' minutes';
        },
      },

      // Help
      help: () => {
        console.log(`
=== Movement Development Tools ===

Quick Commands:
  dev.enable()          - Enable debug mode
  dev.disable()         - Disable debug mode
  dev.test()            - Run comprehensive test suite
  dev.report()          - Generate development report

Configuration:
  dev.config.get()      - Get current development configuration
  dev.config.set(cfg)   - Update development configuration
  dev.config.reset()    - Reset configuration to defaults

Performance Monitoring:
  dev.monitor.start()   - Start performance monitoring
  dev.monitor.stop()    - Stop performance monitoring
  dev.monitor.status()  - Get monitoring status

Test Scenarios:
  dev.scenario.create() - Create default test scenario
  dev.scenario.status() - Get scenario status

Session Info:
  dev.session.state()   - Get session state
  dev.session.duration()- Get session duration

For detailed movement commands, use: movement.help()
                `);
      },
    };

    console.log('MovementDevelopmentTools: Global development interface registered');
    console.log('Type "dev.help()" for quick development commands');
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    if (!this.debugManager) {
      return;
    }

    const metrics = this.debugManager.getPerformanceMetrics();
    const memoryInfo = (performance as any).memory;

    console.log('=== Performance Monitor ===');
    console.log(
      `Range Calculations: ${metrics.totalRangeCalculations} (avg: ${metrics.averageRangeCalculationTime.toFixed(2)}ms)`
    );
    console.log(
      `Pathfinding Operations: ${metrics.totalPathfindingOperations} (avg: ${metrics.averagePathfindingTime.toFixed(2)}ms)`
    );

    if (memoryInfo) {
      console.log(`Memory Usage: ${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`);
    }
  }

  /**
   * Cleanup development tools
   */
  public cleanup(): void {
    this.stopPerformanceMonitoring();

    // Remove global interfaces
    delete (window as any).dev;
    delete (window as any).movement;

    console.log('MovementDevelopmentTools: Cleanup completed');
  }
}

// Auto-initialize development tools in development mode
if (process.env.NODE_ENV === 'development') {
  MovementDevelopmentTools.getInstance();
}

export default MovementDevelopmentTools;
