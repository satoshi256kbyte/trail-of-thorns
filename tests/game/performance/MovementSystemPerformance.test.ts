/**
 * MovementSystem Performance Tests
 *
 * Tests the performance and scalability of the movement system under various conditions
 */

import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { MovementCalculator } from '../../../game/src/systems/MovementCalculator';
import { PathfindingService } from '../../../game/src/systems/PathfindingService';
import { MovementRenderer } from '../../../game/src/rendering/MovementRenderer';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { PositionUtils } from '../../../game/src/types/movement';

// Mock Phaser scene for testing
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      clear: jest.fn(),
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      lineStyle: jest.fn(),
      strokeRect: jest.fn(),
      setDepth: jest.fn(),
      destroy: jest.fn(),
    })),
    sprite: jest.fn(() => ({
      setPosition: jest.fn(),
      setRotation: jest.fn(),
      setTint: jest.fn(),
      setAlpha: jest.fn(),
      setVisible: jest.fn(),
      setActive: jest.fn(),
      destroy: jest.fn(),
      active: true,
      alpha: 1,
    })),
    container: jest.fn(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn(),
      setDepth: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(() => ({
      destroy: jest.fn(),
      isDestroyed: jest.fn(() => false),
    })),
  },
  textures: {
    exists: jest.fn(() => true),
  },
} as any;

/**
 * Create a test unit with specified properties
 */
function createTestUnit(id: string, position: Position, movement: number = 5): Unit {
  return {
    id: id,
    name: `Test Unit ${id}`,
    position: PositionUtils.clone(position),
    stats: {
      movement: movement,
      hp: 100,
      mp: 50,
      attack: 10,
      defense: 5,
      speed: 8,
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
  };
}

/**
 * Create a large test map for performance testing
 */
function createLargeTestMap(width: number, height: number): MapData {
  const terrainData: number[][] = [];

  // Create varied terrain for realistic testing
  for (let y = 0; y < height; y++) {
    terrainData[y] = [];
    for (let x = 0; x < width; x++) {
      // Create some obstacles and varied terrain
      if (Math.random() < 0.1) {
        terrainData[y][x] = 6; // Wall
      } else if (Math.random() < 0.2) {
        terrainData[y][x] = 4; // Difficult terrain
      } else {
        terrainData[y][x] = 0; // Normal terrain
      }
    }
  }

  return {
    width: width,
    height: height,
    tileSize: 32,
    layers: [
      {
        type: 'terrain',
        data: terrainData,
      },
    ],
  };
}

/**
 * Create multiple units for stress testing
 */
function createMultipleUnits(count: number, mapWidth: number, mapHeight: number): Unit[] {
  const units: Unit[] = [];

  for (let i = 0; i < count; i++) {
    const position = {
      x: Math.floor(Math.random() * mapWidth),
      y: Math.floor(Math.random() * mapHeight),
    };

    units.push(createTestUnit(`unit_${i}`, position, 3 + Math.floor(Math.random() * 5)));
  }

  return units;
}

describe('MovementSystem Performance Tests', () => {
  let movementSystem: MovementSystem;
  let movementCalculator: MovementCalculator;
  let pathfindingService: PathfindingService;
  let movementRenderer: MovementRenderer;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create system components
    movementCalculator = new MovementCalculator();
    pathfindingService = new PathfindingService();
    movementRenderer = new MovementRenderer(mockScene);

    const testConfig = {
      enableVisualFeedback: false,
      enablePathPreview: false,
      enableMovementAnimation: false,
    };

    movementSystem = new MovementSystem(mockScene, testConfig);
  });

  afterEach(() => {
    if (movementSystem) {
      movementSystem.cancelMovement();
    }
    if (movementCalculator) {
      movementCalculator.clearCache();
    }
    if (pathfindingService) {
      pathfindingService.clearCache();
    }
    if (movementRenderer) {
      movementRenderer.forceMemoryCleanup();
    }
  });

  describe('Movement Range Calculation Performance', () => {
    test('should handle small maps efficiently (10x10)', () => {
      const map = createLargeTestMap(10, 10);
      const unit = createTestUnit('test', { x: 5, y: 5 }, 5);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();

      // Perform multiple calculations
      for (let i = 0; i < 100; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 100;

      const metrics = movementCalculator.getPerformanceMetrics();

      expect(averageTime).toBeLessThan(5); // Should be under 5ms per calculation
      expect(metrics.averageCalculationTime).toBeLessThan(5);
      expect(metrics.maxCalculationTime).toBeLessThan(20);

      console.log(
        `Small map (10x10) - Average: ${averageTime.toFixed(2)}ms, Max: ${metrics.maxCalculationTime.toFixed(2)}ms`
      );
    });

    test('should handle medium maps efficiently (25x25)', () => {
      const map = createLargeTestMap(25, 25);
      const unit = createTestUnit('test', { x: 12, y: 12 }, 8);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();

      // Perform multiple calculations
      for (let i = 0; i < 50; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 50;

      const metrics = movementCalculator.getPerformanceMetrics();

      expect(averageTime).toBeLessThan(15); // Should be under 15ms per calculation
      expect(metrics.averageCalculationTime).toBeLessThan(15);
      expect(metrics.maxCalculationTime).toBeLessThan(50);

      console.log(
        `Medium map (25x25) - Average: ${averageTime.toFixed(2)}ms, Max: ${metrics.maxCalculationTime.toFixed(2)}ms`
      );
    });

    test('should handle large maps efficiently (50x50)', () => {
      const map = createLargeTestMap(50, 50);
      const unit = createTestUnit('test', { x: 25, y: 25 }, 10);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();

      // Perform fewer calculations for large maps
      for (let i = 0; i < 20; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 20;

      const metrics = movementCalculator.getPerformanceMetrics();

      expect(averageTime).toBeLessThan(50); // Should be under 50ms per calculation
      expect(metrics.averageCalculationTime).toBeLessThan(50);
      expect(metrics.maxCalculationTime).toBeLessThan(200);

      console.log(
        `Large map (50x50) - Average: ${averageTime.toFixed(2)}ms, Max: ${metrics.maxCalculationTime.toFixed(2)}ms`
      );
    });

    test('should benefit from caching on repeated calculations', () => {
      const map = createLargeTestMap(30, 30);
      const unit = createTestUnit('test', { x: 15, y: 15 }, 6);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      // First calculation (cache miss)
      const startTime1 = performance.now();
      movementCalculator.calculateMovementRange(unit, map, []);
      const firstTime = performance.now() - startTime1;

      // Second calculation (cache hit)
      const startTime2 = performance.now();
      movementCalculator.calculateMovementRange(unit, map, []);
      const secondTime = performance.now() - startTime2;

      const metrics = movementCalculator.getPerformanceMetrics();
      const cacheStats = movementCalculator.getCacheStatistics();

      expect(secondTime).toBeLessThan(firstTime * 0.1); // Cache should be 10x faster
      expect(cacheStats.cacheHitRate).toBeGreaterThan(0);
      expect(metrics.cacheHits).toBeGreaterThan(0);

      console.log(
        `Cache performance - First: ${firstTime.toFixed(2)}ms, Second: ${secondTime.toFixed(2)}ms, Hit rate: ${(cacheStats.cacheHitRate * 100).toFixed(1)}%`
      );
    });
  });

  describe('Pathfinding Performance', () => {
    test('should handle short paths efficiently', () => {
      const map = createLargeTestMap(20, 20);
      const start = { x: 5, y: 5 };
      const goal = { x: 8, y: 8 };

      pathfindingService.clearCache();
      pathfindingService.resetPerformanceMetrics();

      const startTime = performance.now();

      // Perform multiple pathfinding operations
      for (let i = 0; i < 100; i++) {
        pathfindingService.findPath(start, goal, map, 10, []);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 100;

      const metrics = pathfindingService.getPerformanceMetrics();

      expect(averageTime).toBeLessThan(3); // Should be under 3ms per pathfinding
      expect(metrics.averagePathfindingTime).toBeLessThan(3);
      expect(metrics.averageNodesExplored).toBeLessThan(50);

      console.log(
        `Short paths - Average: ${averageTime.toFixed(2)}ms, Nodes: ${metrics.averageNodesExplored.toFixed(1)}`
      );
    });

    test('should handle long paths efficiently', () => {
      const map = createLargeTestMap(40, 40);
      const start = { x: 2, y: 2 };
      const goal = { x: 37, y: 37 };

      pathfindingService.clearCache();
      pathfindingService.resetPerformanceMetrics();

      const startTime = performance.now();

      // Perform fewer calculations for long paths
      for (let i = 0; i < 20; i++) {
        pathfindingService.findPath(start, goal, map, 50, []);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 20;

      const metrics = pathfindingService.getPerformanceMetrics();

      expect(averageTime).toBeLessThan(30); // Should be under 30ms per pathfinding
      expect(metrics.averagePathfindingTime).toBeLessThan(30);
      expect(metrics.averageNodesExplored).toBeLessThan(300);

      console.log(
        `Long paths - Average: ${averageTime.toFixed(2)}ms, Nodes: ${metrics.averageNodesExplored.toFixed(1)}`
      );
    });

    test('should terminate early on complex paths', () => {
      // Create a maze-like map with many obstacles
      const map = createLargeTestMap(30, 30);

      // Add many obstacles to make pathfinding complex
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          if (Math.random() < 0.4) {
            // 40% obstacles
            map.layers[0].data[y][x] = 6; // Wall
          }
        }
      }

      const start = { x: 1, y: 1 };
      const goal = { x: 28, y: 28 };

      pathfindingService.clearCache();
      pathfindingService.resetPerformanceMetrics();

      const startTime = performance.now();
      const path = pathfindingService.findPath(start, goal, map, 100, []);
      const endTime = performance.now();

      const pathfindingTime = endTime - startTime;
      const metrics = pathfindingService.getPerformanceMetrics();

      // Should either find a path quickly or terminate early
      expect(pathfindingTime).toBeLessThan(100); // Should not take more than 100ms
      expect(metrics.maxPathfindingTime).toBeLessThan(100);

      // If no path found due to early termination, that's acceptable
      if (path.length === 0) {
        expect(metrics.averageNodesExplored).toBeGreaterThan(400); // Should have explored many nodes before terminating
      }

      console.log(
        `Complex paths - Time: ${pathfindingTime.toFixed(2)}ms, Nodes: ${metrics.averageNodesExplored.toFixed(1)}, Path length: ${path.length}`
      );
    });

    test('should benefit from pathfinding cache', () => {
      const map = createLargeTestMap(25, 25);
      const start = { x: 5, y: 5 };
      const goal = { x: 20, y: 20 };

      pathfindingService.clearCache();
      pathfindingService.resetPerformanceMetrics();

      // First pathfinding (cache miss)
      const startTime1 = performance.now();
      pathfindingService.findPath(start, goal, map, 30, []);
      const firstTime = performance.now() - startTime1;

      // Second pathfinding (cache hit)
      const startTime2 = performance.now();
      pathfindingService.findPath(start, goal, map, 30, []);
      const secondTime = performance.now() - startTime2;

      const cacheStats = pathfindingService.getCacheStatistics();

      expect(secondTime).toBeLessThan(firstTime * 0.1); // Cache should be much faster
      expect(cacheStats.cacheHitRate).toBeGreaterThan(0);

      console.log(
        `Pathfinding cache - First: ${firstTime.toFixed(2)}ms, Second: ${secondTime.toFixed(2)}ms, Hit rate: ${(cacheStats.cacheHitRate * 100).toFixed(1)}%`
      );
    });
  });

  describe('Memory Management Performance', () => {
    test('should manage memory efficiently with many highlights', () => {
      const map = createLargeTestMap(30, 30);
      const units = createMultipleUnits(20, 30, 30);

      movementRenderer.forceMemoryCleanup();

      const initialMemory = movementRenderer.getMemoryMetrics();

      // Create many highlights
      for (const unit of units) {
        const positions: Position[] = [];
        for (let i = 0; i < 50; i++) {
          positions.push({
            x: Math.floor(Math.random() * 30),
            y: Math.floor(Math.random() * 30),
          });
        }
        movementRenderer.highlightMovementRange(positions, unit);
      }

      const peakMemory = movementRenderer.getMemoryMetrics();

      // Force cleanup
      movementRenderer.forceMemoryCleanup();

      const finalMemory = movementRenderer.getMemoryMetrics();

      expect(peakMemory.highlightCount).toBeGreaterThan(initialMemory.highlightCount);
      expect(finalMemory.highlightCount).toBe(0);
      expect(finalMemory.pathArrowCount).toBe(0);
      expect(finalMemory.activeTweenCount).toBe(0);

      console.log(
        `Memory management - Peak highlights: ${peakMemory.highlightCount}, Final: ${finalMemory.highlightCount}`
      );
    });

    test('should limit memory usage under stress', () => {
      const map = createLargeTestMap(40, 40);

      movementRenderer.forceMemoryCleanup();

      // Create excessive highlights to test limits
      for (let i = 0; i < 10; i++) {
        const positions: Position[] = [];
        for (let j = 0; j < 100; j++) {
          positions.push({
            x: Math.floor(Math.random() * 40),
            y: Math.floor(Math.random() * 40),
          });
        }

        const unit = createTestUnit(`stress_${i}`, { x: 20, y: 20 });
        movementRenderer.highlightMovementRange(positions, unit);
      }

      const memoryMetrics = movementRenderer.getMemoryMetrics();

      // Memory usage should be limited by the renderer's configuration
      expect(memoryMetrics.highlightCount).toBeLessThan(1000); // Should not exceed reasonable limits
      expect(memoryMetrics.totalGraphicsObjects).toBeLessThan(500);

      console.log(
        `Stress test - Highlights: ${memoryMetrics.highlightCount}, Graphics: ${memoryMetrics.totalGraphicsObjects}`
      );
    });
  });

  describe('Integrated System Performance', () => {
    test('should handle multiple units efficiently', () => {
      const map = createLargeTestMap(35, 35);
      const units = createMultipleUnits(50, 35, 35);

      movementSystem.initialize(map);
      movementSystem.updateUnits(units);

      const startTime = performance.now();

      // Test multiple unit selections and movement calculations
      for (let i = 0; i < 20; i++) {
        const unit = units[i % units.length];
        const result = movementSystem.selectCharacterForMovement(unit);

        if (result.valid) {
          const destination = {
            x: Math.floor(Math.random() * 35),
            y: Math.floor(Math.random() * 35),
          };

          if (movementSystem.isPositionReachable(unit, destination)) {
            movementSystem.showMovementPath(destination);
          }
        }

        movementSystem.cancelMovement();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 20;

      expect(averageTime).toBeLessThan(20); // Should handle each operation in under 20ms
      expect(totalTime).toBeLessThan(500); // Total should be under 500ms

      console.log(
        `Multiple units - Average per operation: ${averageTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`
      );
    });

    test('should maintain performance with occupied positions', () => {
      const map = createLargeTestMap(30, 30);
      const units = createMultipleUnits(100, 30, 30); // Many units for collision testing

      movementSystem.initialize(map);
      movementSystem.updateUnits(units);

      const testUnit = units[0];

      const startTime = performance.now();

      // Test movement calculation with many occupied positions
      for (let i = 0; i < 10; i++) {
        movementSystem.selectCharacterForMovement(testUnit);

        // Try multiple destinations
        for (let j = 0; j < 5; j++) {
          const destination = {
            x: Math.floor(Math.random() * 30),
            y: Math.floor(Math.random() * 30),
          };

          movementSystem.showMovementPath(destination);
        }

        movementSystem.cancelMovement();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 50; // 10 selections * 5 paths each

      expect(averageTime).toBeLessThan(15); // Should handle collision checking efficiently
      expect(totalTime).toBeLessThan(1000); // Total should be reasonable

      console.log(
        `Occupied positions - Average per path: ${averageTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`
      );
    });
  });

  describe('Scalability Limits', () => {
    test('should handle maximum reasonable map size', () => {
      const map = createLargeTestMap(100, 100); // Very large map
      const unit = createTestUnit('test', { x: 50, y: 50 }, 15);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, []);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(500); // Should complete within 500ms
      expect(result.length).toBeGreaterThan(0); // Should find some positions
      expect(metrics.largestMapSize).toBe(10000); // 100x100

      console.log(
        `Maximum map (100x100) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });

    test('should handle maximum unit count', () => {
      const map = createLargeTestMap(50, 50);
      const units = createMultipleUnits(200, 50, 50); // Many units

      movementSystem.initialize(map);

      const startTime = performance.now();
      movementSystem.updateUnits(units);
      const endTime = performance.now();

      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(100); // Should update quickly

      // Test movement calculation with all units as obstacles
      const testUnit = units[0];
      const calcStartTime = performance.now();
      movementSystem.selectCharacterForMovement(testUnit);
      const calcEndTime = performance.now();

      const calcTime = calcEndTime - calcStartTime;

      expect(calcTime).toBeLessThan(200); // Should handle many obstacles

      console.log(
        `Maximum units (200) - Update: ${updateTime.toFixed(2)}ms, Calculation: ${calcTime.toFixed(2)}ms`
      );
    });
  });
});
/**

 * Performance Metrics Collection and Benchmarking
 * Implements requirement 14.4: Code performance benchmarks for movement calculations
 */

class PerformanceMetrics {
  private metrics: Map<string, PerformanceData> = new Map();
  private benchmarks: Map<string, BenchmarkResult> = new Map();

  recordMetric(name: string, duration: number, metadata?: any): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        samples: [],
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        averageTime: 0,
        metadata: metadata || {},
      });
    }

    const data = this.metrics.get(name)!;
    data.samples.push(duration);
    data.totalTime += duration;
    data.minTime = Math.min(data.minTime, duration);
    data.maxTime = Math.max(data.maxTime, duration);
    data.averageTime = data.totalTime / data.samples.length;
  }

  getMetric(name: string): PerformanceData | undefined {
    return this.metrics.get(name);
  }

  benchmark(name: string, fn: () => void, iterations: number = 100): BenchmarkResult {
    const samples: number[] = [];

    // Warm up
    for (let i = 0; i < 10; i++) {
      fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      samples.push(end - start);
    }

    const result: BenchmarkResult = {
      name,
      iterations,
      samples,
      totalTime: samples.reduce((a, b) => a + b, 0),
      averageTime: samples.reduce((a, b) => a + b, 0) / samples.length,
      minTime: Math.min(...samples),
      maxTime: Math.max(...samples),
      standardDeviation: this.calculateStandardDeviation(samples),
      percentiles: this.calculatePercentiles(samples),
    };

    this.benchmarks.set(name, result);
    return result;
  }

  private calculateStandardDeviation(samples: number[]): number {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const squaredDiffs = samples.map(sample => Math.pow(sample - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculatePercentiles(samples: number[]): PercentileData {
    const sorted = [...samples].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  generateReport(): PerformanceReport {
    const benchmarkResults = Array.from(this.benchmarks.values());
    const metricResults = Array.from(this.metrics.values());

    return {
      timestamp: Date.now(),
      benchmarks: benchmarkResults,
      metrics: metricResults,
      summary: {
        totalBenchmarks: benchmarkResults.length,
        totalMetrics: metricResults.length,
        slowestBenchmark: benchmarkResults.reduce(
          (prev, curr) => (prev.averageTime > curr.averageTime ? prev : curr),
          benchmarkResults[0]
        ),
        fastestBenchmark: benchmarkResults.reduce(
          (prev, curr) => (prev.averageTime < curr.averageTime ? prev : curr),
          benchmarkResults[0]
        ),
      },
    };
  }

  clear(): void {
    this.metrics.clear();
    this.benchmarks.clear();
  }
}

interface PerformanceData {
  name: string;
  samples: number[];
  totalTime: number;
  minTime: number;
  maxTime: number;
  averageTime: number;
  metadata: any;
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  samples: number[];
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  percentiles: PercentileData;
}

interface PercentileData {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

interface PerformanceReport {
  timestamp: number;
  benchmarks: BenchmarkResult[];
  metrics: PerformanceData[];
  summary: {
    totalBenchmarks: number;
    totalMetrics: number;
    slowestBenchmark: BenchmarkResult;
    fastestBenchmark: BenchmarkResult;
  };
}

describe('Movement System Performance Benchmarks', () => {
  let movementSystem: MovementSystem;
  let movementCalculator: MovementCalculator;
  let pathfindingService: PathfindingService;
  let performanceMetrics: PerformanceMetrics;

  beforeEach(() => {
    jest.clearAllMocks();

    movementCalculator = new MovementCalculator();
    pathfindingService = new PathfindingService();
    performanceMetrics = new PerformanceMetrics();

    const testConfig = {
      enableVisualFeedback: false,
      enablePathPreview: false,
      enableMovementAnimation: false,
    };

    movementSystem = new MovementSystem(mockScene, testConfig);
  });

  afterEach(() => {
    if (movementSystem) {
      movementSystem.cancelMovement();
    }
    performanceMetrics.clear();
  });

  describe('Movement Range Calculation Benchmarks', () => {
    test('should benchmark movement range calculation for different map sizes', () => {
      const mapSizes = [
        { size: 10, name: 'Small (10x10)' },
        { size: 25, name: 'Medium (25x25)' },
        { size: 50, name: 'Large (50x50)' },
      ];

      const results: BenchmarkResult[] = [];

      for (const { size, name } of mapSizes) {
        const map = createLargeTestMap(size, size);
        const unit = createTestUnit(
          'benchmark',
          { x: Math.floor(size / 2), y: Math.floor(size / 2) },
          5
        );

        const result = performanceMetrics.benchmark(
          `movement-range-${size}x${size}`,
          () => {
            movementCalculator.calculateMovementRange(unit, map, []);
          },
          50
        );

        results.push(result);

        // Performance expectations
        if (size <= 10) {
          expect(result.averageTime).toBeLessThan(10);
        } else if (size <= 25) {
          expect(result.averageTime).toBeLessThan(30);
        } else if (size <= 50) {
          expect(result.averageTime).toBeLessThan(100);
        }

        console.log(
          `${name} - Avg: ${result.averageTime.toFixed(2)}ms, P95: ${result.percentiles.p95.toFixed(2)}ms`
        );
      }

      // Verify performance scales reasonably
      expect(results[1].averageTime).toBeLessThan(results[0].averageTime * 10); // Medium shouldn't be 10x slower than small
      expect(results[2].averageTime).toBeLessThan(results[1].averageTime * 5); // Large shouldn't be 5x slower than medium
    });

    test('should benchmark movement range calculation with different movement values', () => {
      const map = createLargeTestMap(30, 30);
      const movementValues = [1, 3, 5, 8, 12];
      const results: BenchmarkResult[] = [];

      for (const movement of movementValues) {
        const unit = createTestUnit('benchmark', { x: 15, y: 15 }, movement);

        const result = performanceMetrics.benchmark(
          `movement-range-${movement}`,
          () => {
            movementCalculator.calculateMovementRange(unit, map, []);
          },
          100
        );

        results.push(result);

        // Higher movement values should take longer but not exponentially
        expect(result.averageTime).toBeLessThan(50);
        console.log(`Movement ${movement} - Avg: ${result.averageTime.toFixed(2)}ms`);
      }

      // Verify reasonable scaling with movement value
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      expect(lastResult.averageTime).toBeLessThan(firstResult.averageTime * 20); // Shouldn't be 20x slower
    });

    test('should benchmark movement range calculation with obstacles', () => {
      const baseMap = createLargeTestMap(25, 25);
      const unit = createTestUnit('benchmark', { x: 12, y: 12 }, 6);

      // Test with different obstacle densities
      const obstacleDensities = [0, 0.1, 0.2, 0.3, 0.4];
      const results: BenchmarkResult[] = [];

      for (const density of obstacleDensities) {
        const map = { ...baseMap };

        // Add obstacles
        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            if (Math.random() < density) {
              map.layers[0].data[y][x] = 6; // Wall
            }
          }
        }

        const result = performanceMetrics.benchmark(
          `movement-obstacles-${Math.round(density * 100)}%`,
          () => {
            movementCalculator.calculateMovementRange(unit, map, []);
          },
          50
        );

        results.push(result);
        expect(result.averageTime).toBeLessThan(100);
        console.log(
          `Obstacles ${Math.round(density * 100)}% - Avg: ${result.averageTime.toFixed(2)}ms`
        );
      }
    });
  });

  describe('Pathfinding Performance Benchmarks', () => {
    test('should benchmark pathfinding for different path lengths', () => {
      const map = createLargeTestMap(40, 40);
      const pathLengths = [
        { start: { x: 5, y: 5 }, end: { x: 7, y: 7 }, name: 'Short' },
        { start: { x: 5, y: 5 }, end: { x: 15, y: 15 }, name: 'Medium' },
        { start: { x: 5, y: 5 }, end: { x: 35, y: 35 }, name: 'Long' },
      ];

      const results: BenchmarkResult[] = [];

      for (const { start, end, name } of pathLengths) {
        const result = performanceMetrics.benchmark(
          `pathfinding-${name.toLowerCase()}`,
          () => {
            pathfindingService.findPath(start, end, map, 50, []);
          },
          100
        );

        results.push(result);

        // Performance expectations based on path length
        if (name === 'Short') {
          expect(result.averageTime).toBeLessThan(5);
        } else if (name === 'Medium') {
          expect(result.averageTime).toBeLessThan(20);
        } else if (name === 'Long') {
          expect(result.averageTime).toBeLessThan(50);
        }

        console.log(
          `${name} Path - Avg: ${result.averageTime.toFixed(2)}ms, P95: ${result.percentiles.p95.toFixed(2)}ms`
        );
      }
    });

    test('should benchmark pathfinding with complex terrain', () => {
      const map = createLargeTestMap(30, 30);

      // Create maze-like terrain
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          if ((x % 3 === 0 || y % 3 === 0) && Math.random() < 0.6) {
            map.layers[0].data[y][x] = 6; // Wall
          }
        }
      }

      const start = { x: 1, y: 1 };
      const end = { x: 28, y: 28 };

      const result = performanceMetrics.benchmark(
        'pathfinding-complex-terrain',
        () => {
          pathfindingService.findPath(start, end, map, 100, []);
        },
        50
      );

      expect(result.averageTime).toBeLessThan(200); // Should handle complex terrain reasonably
      console.log(
        `Complex Terrain - Avg: ${result.averageTime.toFixed(2)}ms, Max: ${result.maxTime.toFixed(2)}ms`
      );
    });

    test('should benchmark pathfinding cache performance', () => {
      const map = createLargeTestMap(25, 25);
      const start = { x: 5, y: 5 };
      const end = { x: 20, y: 20 };

      // Clear cache
      pathfindingService.clearCache();

      // Benchmark cache miss
      const cacheMissResult = performanceMetrics.benchmark(
        'pathfinding-cache-miss',
        () => {
          pathfindingService.findPath(start, end, map, 30, []);
        },
        10 // Fewer iterations since we're testing cache behavior
      );

      // Benchmark cache hit
      const cacheHitResult = performanceMetrics.benchmark(
        'pathfinding-cache-hit',
        () => {
          pathfindingService.findPath(start, end, map, 30, []);
        },
        100
      );

      // Cache hits should be significantly faster
      expect(cacheHitResult.averageTime).toBeLessThan(cacheMissResult.averageTime * 0.1);

      console.log(`Cache Miss - Avg: ${cacheMissResult.averageTime.toFixed(2)}ms`);
      console.log(`Cache Hit - Avg: ${cacheHitResult.averageTime.toFixed(2)}ms`);
      console.log(
        `Cache Speedup: ${(cacheMissResult.averageTime / cacheHitResult.averageTime).toFixed(1)}x`
      );
    });
  });

  describe('Integrated System Performance Benchmarks', () => {
    test('should benchmark complete movement workflow', () => {
      const map = createLargeTestMap(30, 30);
      const units = createMultipleUnits(20, 30, 30);

      movementSystem.initialize(map);
      movementSystem.updateUnits(units);

      const testUnit = units[0];
      const destination = { x: testUnit.position.x + 3, y: testUnit.position.y + 3 };

      const result = performanceMetrics.benchmark(
        'complete-movement-workflow',
        () => {
          movementSystem.selectCharacterForMovement(testUnit);
          movementSystem.showMovementPath(destination);
          movementSystem.cancelMovement();
        },
        50
      );

      expect(result.averageTime).toBeLessThan(50);
      console.log(
        `Complete Workflow - Avg: ${result.averageTime.toFixed(2)}ms, P95: ${result.percentiles.p95.toFixed(2)}ms`
      );
    });

    test('should benchmark system with many units', () => {
      const map = createLargeTestMap(40, 40);
      const unitCounts = [10, 50, 100, 200];
      const results: BenchmarkResult[] = [];

      for (const unitCount of unitCounts) {
        const units = createMultipleUnits(unitCount, 40, 40);

        movementSystem.initialize(map);
        movementSystem.updateUnits(units);

        const testUnit = units[0];

        const result = performanceMetrics.benchmark(
          `system-${unitCount}-units`,
          () => {
            movementSystem.selectCharacterForMovement(testUnit);
            movementSystem.cancelMovement();
          },
          20
        );

        results.push(result);

        // Performance should scale reasonably with unit count
        expect(result.averageTime).toBeLessThan(100);
        console.log(`${unitCount} Units - Avg: ${result.averageTime.toFixed(2)}ms`);
      }

      // Verify reasonable scaling
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      expect(lastResult.averageTime).toBeLessThan(firstResult.averageTime * 10); // Shouldn't be 10x slower
    });

    test('should benchmark memory usage and cleanup', () => {
      const map = createLargeTestMap(35, 35);
      const units = createMultipleUnits(30, 35, 35);

      movementSystem.initialize(map);
      movementSystem.updateUnits(units);

      // Measure memory usage during intensive operations
      const initialMemory = process.memoryUsage();

      const result = performanceMetrics.benchmark(
        'memory-intensive-operations',
        () => {
          for (let i = 0; i < 5; i++) {
            const unit = units[i % units.length];
            movementSystem.selectCharacterForMovement(unit);

            // Generate multiple path previews
            for (let j = 0; j < 3; j++) {
              const dest = {
                x: Math.floor(Math.random() * 35),
                y: Math.floor(Math.random() * 35),
              };
              movementSystem.showMovementPath(dest);
            }

            movementSystem.cancelMovement();
          }
        },
        10
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.averageTime).toBeLessThan(200);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`Memory Intensive - Avg: ${result.averageTime.toFixed(2)}ms`);
      console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions', () => {
      const map = createLargeTestMap(25, 25);
      const unit = createTestUnit('regression-test', { x: 12, y: 12 }, 5);

      // Baseline performance
      const baselineResult = performanceMetrics.benchmark(
        'regression-baseline',
        () => {
          movementCalculator.calculateMovementRange(unit, map, []);
        },
        100
      );

      // Simulate potential regression (artificially slow operation)
      const regressionResult = performanceMetrics.benchmark(
        'regression-test',
        () => {
          movementCalculator.calculateMovementRange(unit, map, []);
          // Simulate additional work that might cause regression
          for (let i = 0; i < 1000; i++) {
            Math.sqrt(i);
          }
        },
        100
      );

      // Check for significant performance regression
      const regressionThreshold = 2.0; // 2x slower is considered a regression
      const performanceRatio = regressionResult.averageTime / baselineResult.averageTime;

      if (performanceRatio > regressionThreshold) {
        console.warn(`Performance regression detected: ${performanceRatio.toFixed(2)}x slower`);
        console.warn(
          `Baseline: ${baselineResult.averageTime.toFixed(2)}ms, Current: ${regressionResult.averageTime.toFixed(2)}ms`
        );
      }

      // For this test, we expect the regression to be detected
      expect(performanceRatio).toBeGreaterThan(regressionThreshold);
    });

    test('should generate comprehensive performance report', () => {
      // Run several benchmarks
      const map = createLargeTestMap(20, 20);
      const unit = createTestUnit('report-test', { x: 10, y: 10 }, 4);

      performanceMetrics.benchmark(
        'test-calculation',
        () => {
          movementCalculator.calculateMovementRange(unit, map, []);
        },
        50
      );

      performanceMetrics.benchmark(
        'test-pathfinding',
        () => {
          pathfindingService.findPath({ x: 5, y: 5 }, { x: 15, y: 15 }, map, 20, []);
        },
        50
      );

      const report = performanceMetrics.generateReport();

      expect(report.benchmarks.length).toBe(2);
      expect(report.summary.totalBenchmarks).toBe(2);
      expect(report.summary.slowestBenchmark).toBeDefined();
      expect(report.summary.fastestBenchmark).toBeDefined();

      console.log('Performance Report Generated:');
      console.log(`Total Benchmarks: ${report.summary.totalBenchmarks}`);
      console.log(
        `Slowest: ${report.summary.slowestBenchmark.name} (${report.summary.slowestBenchmark.averageTime.toFixed(2)}ms)`
      );
      console.log(
        `Fastest: ${report.summary.fastestBenchmark.name} (${report.summary.fastestBenchmark.averageTime.toFixed(2)}ms)`
      );
    });
  });
});
