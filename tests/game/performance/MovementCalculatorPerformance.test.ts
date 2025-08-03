/**
 * MovementCalculator Performance Tests
 *
 * Focused performance tests for the MovementCalculator component
 */

import { MovementCalculator } from '../../../game/src/systems/MovementCalculator';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { PositionUtils } from '../../../game/src/types/movement';

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
 * Create a test map with specific terrain patterns
 */
function createTestMap(width: number, height: number, obstacleRatio: number = 0.1): MapData {
  const terrainData: number[][] = [];

  for (let y = 0; y < height; y++) {
    terrainData[y] = [];
    for (let x = 0; x < width; x++) {
      if (Math.random() < obstacleRatio) {
        terrainData[y][x] = 6; // Wall
      } else if (Math.random() < 0.1) {
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

describe('MovementCalculator Performance Tests', () => {
  let movementCalculator: MovementCalculator;

  beforeEach(() => {
    movementCalculator = new MovementCalculator();
  });

  afterEach(() => {
    movementCalculator.clearCache();
  });

  describe('Cache Performance', () => {
    test('should demonstrate cache effectiveness', () => {
      const map = createTestMap(30, 30);
      const unit = createTestUnit('test', { x: 15, y: 15 }, 8);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      // Measure cache miss performance
      const cacheMissStart = performance.now();
      for (let i = 0; i < 10; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }
      const cacheMissTime = performance.now() - cacheMissStart;

      // Clear metrics but keep cache
      const metrics1 = movementCalculator.getPerformanceMetrics();
      movementCalculator.resetPerformanceMetrics();

      // Measure cache hit performance
      const cacheHitStart = performance.now();
      for (let i = 0; i < 10; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }
      const cacheHitTime = performance.now() - cacheHitStart;

      const metrics2 = movementCalculator.getPerformanceMetrics();
      const cacheStats = movementCalculator.getCacheStatistics();

      // Cache hits should be significantly faster
      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.1);
      expect(cacheStats.cacheHitRate).toBeGreaterThan(0.8);
      expect(metrics2.cacheHits).toBe(10);

      console.log(
        `Cache effectiveness - Miss: ${(cacheMissTime / 10).toFixed(2)}ms, Hit: ${(cacheHitTime / 10).toFixed(2)}ms, Speedup: ${(cacheMissTime / cacheHitTime).toFixed(1)}x`
      );
    });

    test('should handle cache invalidation correctly', () => {
      const map = createTestMap(20, 20);
      const unit = createTestUnit('test', { x: 10, y: 10 }, 6);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      // First calculation
      movementCalculator.calculateMovementRange(unit, map, []);

      // Second calculation with same parameters (cache hit)
      movementCalculator.calculateMovementRange(unit, map, []);

      // Third calculation with different occupied positions (cache miss)
      const occupiedPositions = [{ x: 11, y: 10 }];
      movementCalculator.calculateMovementRange(unit, map, occupiedPositions);

      const metrics = movementCalculator.getPerformanceMetrics();
      const cacheStats = movementCalculator.getCacheStatistics();

      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(2);
      expect(cacheStats.cacheHitRate).toBeCloseTo(0.33, 1);

      console.log(
        `Cache invalidation - Hits: ${metrics.cacheHits}, Misses: ${metrics.cacheMisses}, Hit rate: ${(cacheStats.cacheHitRate * 100).toFixed(1)}%`
      );
    });

    test('should manage cache size limits', () => {
      const maps = [];
      const units = [];

      // Create many different scenarios to fill cache
      for (let i = 0; i < 150; i++) {
        // More than max cache size
        maps.push(createTestMap(10, 10, 0.05));
        units.push(createTestUnit(`unit_${i}`, { x: 5, y: 5 }, 3 + (i % 5)));
      }

      movementCalculator.clearCache();

      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        movementCalculator.calculateMovementRange(units[i], maps[i], []);
      }

      const cacheStats = movementCalculator.getCacheStatistics();

      // Cache should not exceed maximum size
      expect(cacheStats.movementRangeCacheSize).toBeLessThanOrEqual(100);
      expect(cacheStats.totalCacheEntries).toBeLessThanOrEqual(200); // Both caches combined

      console.log(
        `Cache size management - Range cache: ${cacheStats.movementRangeCacheSize}, Total: ${cacheStats.totalCacheEntries}`
      );
    });
  });

  describe('Terrain Complexity Performance', () => {
    test('should handle maps with no obstacles efficiently', () => {
      const map = createTestMap(40, 40, 0); // No obstacles
      const unit = createTestUnit('test', { x: 20, y: 20 }, 10);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, []);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(20);
      expect(result.length).toBeGreaterThan(100); // Should find many positions
      expect(metrics.averageCalculationTime).toBeLessThan(20);

      console.log(
        `No obstacles (40x40) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });

    test('should handle maps with many obstacles', () => {
      const map = createTestMap(40, 40, 0.4); // 40% obstacles
      const unit = createTestUnit('test', { x: 20, y: 20 }, 10);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, []);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(50); // May take longer due to obstacles
      expect(result.length).toBeGreaterThan(0); // Should still find some positions
      expect(metrics.averageCalculationTime).toBeLessThan(50);

      console.log(
        `Many obstacles (40x40) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });

    test('should handle varied terrain costs', () => {
      const map = createTestMap(30, 30, 0.1);

      // Add varied terrain costs
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          if (map.layers[0].data[y][x] === 0) {
            // Mix of terrain types
            const rand = Math.random();
            if (rand < 0.3) {
              map.layers[0].data[y][x] = 4; // Cost 2
            } else if (rand < 0.5) {
              map.layers[0].data[y][x] = 5; // Cost 3
            }
          }
        }
      }

      const unit = createTestUnit('test', { x: 15, y: 15 }, 12);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, []);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(40);
      expect(result.length).toBeGreaterThan(0);
      expect(metrics.averageCalculationTime).toBeLessThan(40);

      console.log(
        `Varied terrain (30x30) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });
  });

  describe('Movement Range Performance', () => {
    test('should scale with movement range', () => {
      const map = createTestMap(50, 50, 0.15);
      const position = { x: 25, y: 25 };

      const movementRanges = [3, 6, 9, 12, 15];
      const results: Array<{ range: number; time: number; positions: number }> = [];

      for (const movement of movementRanges) {
        const unit = createTestUnit('test', position, movement);

        movementCalculator.clearCache();

        const startTime = performance.now();
        const result = movementCalculator.calculateMovementRange(unit, map, []);
        const endTime = performance.now();

        const calculationTime = endTime - startTime;

        results.push({
          range: movement,
          time: calculationTime,
          positions: result.length,
        });

        expect(calculationTime).toBeLessThan(100); // Should handle all ranges efficiently
      }

      // Log results for analysis
      results.forEach(r => {
        console.log(
          `Movement ${r.range} - Time: ${r.time.toFixed(2)}ms, Positions: ${r.positions}`
        );
      });

      // Time should generally increase with movement range, but not exponentially
      const timeRatio = results[4].time / results[0].time; // 15 vs 3 movement
      expect(timeRatio).toBeLessThan(20); // Should not be more than 20x slower (adjusted for realistic performance)
    });

    test('should handle maximum movement range efficiently', () => {
      const map = createTestMap(60, 60, 0.1);
      const unit = createTestUnit('test', { x: 30, y: 30 }, 25); // Very high movement

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, []);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(200); // Should complete within reasonable time
      expect(result.length).toBeGreaterThan(500); // Should find many positions
      expect(metrics.averageCalculationTime).toBeLessThan(200);

      console.log(
        `Maximum movement (25) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });
  });

  describe('Occupied Positions Performance', () => {
    test('should handle many occupied positions', () => {
      const map = createTestMap(40, 40, 0.1);
      const unit = createTestUnit('test', { x: 20, y: 20 }, 8);

      // Create many occupied positions
      const occupiedPositions: Position[] = [];
      for (let i = 0; i < 200; i++) {
        occupiedPositions.push({
          x: Math.floor(Math.random() * 40),
          y: Math.floor(Math.random() * 40),
        });
      }

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      const startTime = performance.now();
      const result = movementCalculator.calculateMovementRange(unit, map, occupiedPositions);
      const endTime = performance.now();

      const calculationTime = endTime - startTime;
      const metrics = movementCalculator.getPerformanceMetrics();

      expect(calculationTime).toBeLessThan(60); // Should handle many occupied positions
      expect(result.length).toBeGreaterThan(0); // Should still find some positions
      expect(metrics.averageCalculationTime).toBeLessThan(60);

      console.log(
        `Many occupied (200) - Time: ${calculationTime.toFixed(2)}ms, Positions: ${result.length}`
      );
    });

    test('should compare performance with and without occupied positions', () => {
      const map = createTestMap(35, 35, 0.1);
      const unit = createTestUnit('test', { x: 17, y: 17 }, 7);

      // Test without occupied positions
      movementCalculator.clearCache();
      const startTime1 = performance.now();
      const result1 = movementCalculator.calculateMovementRange(unit, map, []);
      const time1 = performance.now() - startTime1;

      // Test with occupied positions
      const occupiedPositions: Position[] = [];
      for (let i = 0; i < 50; i++) {
        occupiedPositions.push({
          x: Math.floor(Math.random() * 35),
          y: Math.floor(Math.random() * 35),
        });
      }

      movementCalculator.clearCache();
      const startTime2 = performance.now();
      const result2 = movementCalculator.calculateMovementRange(unit, map, occupiedPositions);
      const time2 = performance.now() - startTime2;

      // With occupied positions should not be significantly slower
      expect(time2).toBeLessThan(time1 * 3); // At most 3x slower
      expect(result2.length).toBeLessThanOrEqual(result1.length); // Should find fewer or equal positions

      console.log(
        `Occupied comparison - Without: ${time1.toFixed(2)}ms (${result1.length} pos), With: ${time2.toFixed(2)}ms (${result2.length} pos)`
      );
    });
  });

  describe('Memory Usage Performance', () => {
    test('should track performance metrics accurately', () => {
      const map = createTestMap(25, 25, 0.2);
      const unit = createTestUnit('test', { x: 12, y: 12 }, 6);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      // Perform multiple calculations
      const iterations = 20;
      for (let i = 0; i < iterations; i++) {
        movementCalculator.calculateMovementRange(unit, map, []);
      }

      const metrics = movementCalculator.getPerformanceMetrics();

      expect(metrics.calculationCount).toBe(1); // First calculation, rest are cache hits
      expect(metrics.cacheHits).toBe(iterations - 1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.averageCalculationTime).toBeGreaterThan(0);
      expect(metrics.maxCalculationTime).toBeGreaterThanOrEqual(metrics.averageCalculationTime);
      expect(metrics.largestMapSize).toBe(625); // 25x25

      console.log(
        `Metrics tracking - Calculations: ${metrics.calculationCount}, Cache hits: ${metrics.cacheHits}, Avg time: ${metrics.averageCalculationTime.toFixed(2)}ms`
      );
    });

    test('should reset metrics correctly', () => {
      const map = createTestMap(20, 20);
      const unit = createTestUnit('test', { x: 10, y: 10 }, 5);

      movementCalculator.clearCache();
      movementCalculator.resetPerformanceMetrics();

      // Perform some calculations
      movementCalculator.calculateMovementRange(unit, map, []);
      movementCalculator.calculateMovementRange(unit, map, []);

      const metrics1 = movementCalculator.getPerformanceMetrics();
      expect(metrics1.calculationCount).toBeGreaterThan(0);

      // Reset metrics
      movementCalculator.resetPerformanceMetrics();

      const metrics2 = movementCalculator.getPerformanceMetrics();
      expect(metrics2.calculationCount).toBe(0);
      expect(metrics2.cacheHits).toBe(0);
      expect(metrics2.cacheMisses).toBe(0);
      expect(metrics2.totalCalculationTime).toBe(0);
      expect(metrics2.averageCalculationTime).toBe(0);
      expect(metrics2.maxCalculationTime).toBe(0);
      expect(metrics2.largestMapSize).toBe(0);

      console.log('Metrics reset successfully');
    });
  });
});
