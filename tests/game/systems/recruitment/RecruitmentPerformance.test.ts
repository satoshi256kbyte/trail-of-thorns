/**
 * Performance tests for recruitment system
 * Tests performance optimization features and memory management
 */

import { RecruitmentConditionCache } from '../../../../game/src/systems/recruitment/RecruitmentConditionCache';
import { OptimizedNPCStateManager } from '../../../../game/src/systems/recruitment/OptimizedNPCStateManager';
import { RecruitmentUIPool } from '../../../../game/src/systems/recruitment/RecruitmentUIPool';
import { RecruitmentPerformanceMonitor } from '../../../../game/src/systems/recruitment/RecruitmentPerformanceMonitor';
import { RecruitmentResourceManager } from '../../../../game/src/systems/recruitment/RecruitmentResourceManager';
import {
  RecruitmentCondition,
  RecruitmentContext,
  RecruitmentConditionType,
} from '../../../../game/src/types/recruitment';
import { Unit } from '../../../../game/src/types/gameplay';

// Mock Phaser objects for testing
const mockScene = {
  add: {
    container: jest.fn(() => ({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      add: jest.fn(),
      destroy: jest.fn(),
    })),
    graphics: jest.fn(() => ({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      clear: jest.fn(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRoundedRect: jest.fn().mockReturnThis(),
      fillCircle: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    })),
    text: jest.fn(() => ({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setText: jest.fn(),
      setPosition: jest.fn(),
      setVisible: jest.fn(),
      setAlpha: jest.fn(),
      setScale: jest.fn(),
      setOrigin: jest.fn(),
      setStyle: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(() => ({
      stop: jest.fn(),
      isPlaying: jest.fn(() => false),
    })),
    killTweensOf: jest.fn(),
  },
  time: {
    delayedCall: jest.fn(),
  },
  events: {
    once: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
} as any;

// Helper function to create mock unit
function createMockUnit(id: string, overrides: Partial<Unit> = {}): Unit {
  return {
    id,
    name: `Unit ${id}`,
    position: { x: 0, y: 0 },
    stats: { maxHP: 100, speed: 10, attack: 20, defense: 15, maxMP: 50, movement: 3 },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    sprite: {
      x: 0,
      y: 0,
      setTint: jest.fn(),
      setScale: jest.fn(),
      clearTint: jest.fn(),
    } as any,
    ...overrides,
  };
}

// Helper function to create mock condition
function createMockCondition(id: string): RecruitmentCondition {
  return {
    id,
    type: RecruitmentConditionType.HP_THRESHOLD,
    description: `Test condition ${id}`,
    parameters: { threshold: 0.3 },
    checkCondition: jest.fn(() => Math.random() > 0.5),
  };
}

// Helper function to create mock context
function createMockContext(attacker: Unit, target: Unit): RecruitmentContext {
  return {
    attacker,
    target,
    damage: 25,
    turn: 1,
    alliedUnits: [],
    enemyUnits: [],
    npcUnits: [],
  };
}

describe('RecruitmentConditionCache Performance', () => {
  let cache: RecruitmentConditionCache;

  beforeEach(() => {
    cache = new RecruitmentConditionCache({
      maxEntries: 1000,
      ttl: 30000,
      enableMonitoring: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  test('should handle high-volume cache operations efficiently', () => {
    const startTime = performance.now();
    const iterations = 10000;

    const unit = createMockUnit('test-unit');
    const condition = createMockCondition('test-condition');
    const context = createMockContext(unit, unit);

    // Perform many cache operations
    for (let i = 0; i < iterations; i++) {
      const testUnit = createMockUnit(`unit-${i}`);
      const testContext = createMockContext(testUnit, testUnit);

      // Set and get from cache
      cache.set(testUnit.id, condition, testContext, i % 2 === 0);
      cache.get(testUnit.id, condition, testContext);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;

    expect(averageTime).toBeLessThan(0.1); // Less than 0.1ms per operation
    expect(totalTime).toBeLessThan(1000); // Total time less than 1 second

    const stats = cache.getStatistics();
    expect(stats.hitRatio).toBeGreaterThan(0.4); // At least 40% hit ratio
  });

  test('should maintain performance under memory pressure', () => {
    const config = {
      maxEntries: 100,
      maxMemoryUsage: 10 * 1024, // 10KB limit
      enableMonitoring: true,
    };

    const pressureCache = new RecruitmentConditionCache(config);
    const startTime = performance.now();

    // Create memory pressure by adding many entries
    for (let i = 0; i < 500; i++) {
      const unit = createMockUnit(`pressure-unit-${i}`);
      const condition = createMockCondition(`pressure-condition-${i}`);
      const context = createMockContext(unit, unit);

      pressureCache.set(unit.id, condition, context, true);
    }

    const endTime = performance.now();
    const stats = pressureCache.getStatistics();

    expect(endTime - startTime).toBeLessThan(500); // Should complete in reasonable time
    expect(stats.totalEntries).toBeLessThanOrEqual(config.maxEntries);
    expect(stats.memoryUsage).toBeLessThanOrEqual(config.maxMemoryUsage * 1.1); // Allow 10% overhead

    pressureCache.destroy();
  });

  test('should optimize cache performance automatically', () => {
    const initialStats = cache.getStatistics();

    // Simulate poor performance scenario
    for (let i = 0; i < 100; i++) {
      const unit = createMockUnit(`opt-unit-${i}`);
      const condition = createMockCondition(`opt-condition-${i}`);
      const context = createMockContext(unit, unit);

      cache.set(unit.id, condition, context, true);
    }

    cache.optimize();
    const optimizedStats = cache.getStatistics();

    // Performance should be maintained or improved
    expect(optimizedStats.averageAccessTime).toBeLessThanOrEqual(
      initialStats.averageAccessTime + 1
    );
  });
});

describe('OptimizedNPCStateManager Performance', () => {
  let npcManager: OptimizedNPCStateManager;

  beforeEach(() => {
    npcManager = new OptimizedNPCStateManager(mockScene);
  });

  afterEach(() => {
    npcManager.destroy();
  });

  test('should handle batch NPC conversion efficiently', () => {
    const batchSize = 100;
    const units = Array.from({ length: batchSize }, (_, i) => createMockUnit(`batch-unit-${i}`));
    const recruitmentIds = units.map(u => `recruitment-${u.id}`);

    const startTime = performance.now();
    const results = npcManager.batchConvertToNPC(units, recruitmentIds, 1);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const averageTime = totalTime / batchSize;

    expect(averageTime).toBeLessThan(1); // Less than 1ms per conversion
    expect(results).toHaveLength(batchSize);
    expect(results.filter(r => r.success)).toHaveLength(batchSize);

    const metrics = npcManager.getOptimizationMetrics();
    expect(metrics.averageLookupTime).toBeLessThan(0.5); // Fast lookups
  });

  test('should maintain performance with large number of NPCs', () => {
    const npcCount = 500;
    const startTime = performance.now();

    // Create many NPCs
    for (let i = 0; i < npcCount; i++) {
      const unit = createMockUnit(`perf-unit-${i}`);
      npcManager.convertToNPC(unit, `recruitment-${i}`, 1);
    }

    // Perform lookups
    for (let i = 0; i < npcCount; i++) {
      const unit = createMockUnit(`perf-unit-${i}`);
      npcManager.getNPCState(unit);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(1000); // Should complete in reasonable time

    const metrics = npcManager.getOptimizationMetrics();
    expect(metrics.averageLookupTime).toBeLessThan(1); // Fast lookups even with many NPCs
    expect(metrics.memoryUsage).toBeLessThan(5 * 1024 * 1024); // Reasonable memory usage
  });

  test('should optimize indexes automatically', () => {
    // Create fragmented indexes
    for (let i = 0; i < 100; i++) {
      const unit = createMockUnit(`frag-unit-${i}`);
      npcManager.convertToNPC(unit, `recruitment-${i}`, i % 10);

      // Remove some to create fragmentation
      if (i % 3 === 0) {
        npcManager.removeNPCState(unit);
      }
    }

    const beforeOptimization = npcManager.getOptimizationMetrics();
    npcManager.optimizeIndexes();
    const afterOptimization = npcManager.getOptimizationMetrics();

    expect(afterOptimization.indexFragmentation).toBeLessThanOrEqual(
      beforeOptimization.indexFragmentation
    );
  });

  test('should handle spatial queries efficiently', () => {
    const npcCount = 200;
    const startTime = performance.now();

    // Create NPCs in different positions
    for (let i = 0; i < npcCount; i++) {
      const unit = createMockUnit(`spatial-unit-${i}`);
      unit.position = { x: (i % 20) * 32, y: Math.floor(i / 20) * 32 };
      npcManager.convertToNPC(unit, `recruitment-${i}`, 1);
    }

    // Perform spatial queries
    const queryCount = 50;
    for (let i = 0; i < queryCount; i++) {
      const center = { x: Math.random() * 640, y: Math.random() * 480 };
      npcManager.getNPCsInArea(center, 100);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageQueryTime = totalTime / queryCount;

    expect(averageQueryTime).toBeLessThan(2); // Fast spatial queries
  });
});

describe('RecruitmentUIPool Performance', () => {
  let uiPool: RecruitmentUIPool;

  beforeEach(() => {
    uiPool = new RecruitmentUIPool(mockScene, {
      initialSize: 10,
      maxSize: 50,
      enableWarming: true,
    });
  });

  afterEach(() => {
    uiPool.destroy();
  });

  test('should provide fast object allocation and deallocation', () => {
    const iterations = 1000;
    const startTime = performance.now();

    const allocatedObjects: any[] = [];

    // Allocate objects
    for (let i = 0; i < iterations; i++) {
      const panel = uiPool.getConditionPanel();
      const progressBar = uiPool.getProgressBar();
      const text = uiPool.getText();

      allocatedObjects.push({ panel, progressBar, text });
    }

    // Deallocate objects
    for (const { panel, progressBar, text } of allocatedObjects) {
      uiPool.returnConditionPanel(panel);
      uiPool.returnProgressBar(progressBar);
      uiPool.returnText(text);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / (iterations * 2); // Allocation + deallocation

    expect(averageTime).toBeLessThan(0.01); // Very fast operations

    const stats = uiPool.getStatistics();
    const efficiency = uiPool.getEfficiencyMetrics();

    expect(efficiency.averageHitRatio).toBeGreaterThan(0.8); // High pool hit ratio
  });

  test('should maintain memory efficiency under load', () => {
    const loadIterations = 500;
    const initialMemory = uiPool.getTotalMemoryUsage();

    // Create load
    const objects: any[] = [];
    for (let i = 0; i < loadIterations; i++) {
      objects.push({
        panel: uiPool.getConditionPanel(),
        indicator: uiPool.getIndicator(),
        notification: uiPool.getNotification(),
      });
    }

    const peakMemory = uiPool.getTotalMemoryUsage();

    // Return objects
    for (const { panel, indicator, notification } of objects) {
      uiPool.returnConditionPanel(panel);
      uiPool.returnIndicator(indicator);
      uiPool.returnNotification(notification);
    }

    const finalMemory = uiPool.getTotalMemoryUsage();
    const efficiency = uiPool.getEfficiencyMetrics();

    expect(efficiency.memoryEfficiency).toBeGreaterThan(0.5); // Good memory efficiency
    expect(finalMemory).toBeLessThanOrEqual(peakMemory); // Memory should not grow indefinitely
  });

  test('should optimize pool sizes automatically', () => {
    const initialStats = uiPool.getStatistics();

    // Simulate usage pattern
    for (let i = 0; i < 100; i++) {
      const objects = [uiPool.getConditionPanel(), uiPool.getProgressBar(), uiPool.getText()];

      // Return immediately to simulate high turnover
      uiPool.returnConditionPanel(objects[0]);
      uiPool.returnProgressBar(objects[1]);
      uiPool.returnText(objects[2]);
    }

    uiPool.optimizePools();
    const optimizedStats = uiPool.getStatistics();
    const efficiency = uiPool.getEfficiencyMetrics();

    expect(efficiency.averageHitRatio).toBeGreaterThan(0.7); // Good hit ratio after optimization
  });
});

describe('RecruitmentPerformanceMonitor', () => {
  let monitor: RecruitmentPerformanceMonitor;

  beforeEach(() => {
    monitor = new RecruitmentPerformanceMonitor({
      enabled: true,
      monitoringInterval: 100, // Fast monitoring for tests
      autoOptimize: false, // Disable for controlled testing
    });
  });

  afterEach(() => {
    monitor.destroy();
  });

  test('should track performance metrics accurately', done => {
    // Record some sample data
    for (let i = 0; i < 50; i++) {
      monitor.recordConditionCheckTime(Math.random() * 5);
      monitor.recordNPCConversionTime(Math.random() * 10);
      monitor.recordUIUpdateTime(Math.random() * 20);
    }

    // Wait for monitoring cycle
    setTimeout(() => {
      const metrics = monitor.getMetrics();

      expect(metrics.averageConditionCheckTime).toBeGreaterThan(0);
      expect(metrics.averageNPCConversionTime).toBeGreaterThan(0);
      expect(metrics.averageUIUpdateTime).toBeGreaterThan(0);
      expect(metrics.operationsPerSecond).toBeGreaterThan(0);

      done();
    }, 200);
  });

  test('should generate performance alerts when thresholds are exceeded', done => {
    // Record data that exceeds thresholds
    for (let i = 0; i < 10; i++) {
      monitor.recordConditionCheckTime(10); // Exceeds 2ms threshold
      monitor.recordUIUpdateTime(50); // Exceeds 16ms threshold
    }

    // Wait for monitoring and alert generation
    setTimeout(() => {
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      const warningAlerts = alerts.filter(a => a.severity === 'warning');

      expect(criticalAlerts.length + warningAlerts.length).toBeGreaterThan(0);

      done();
    }, 200);
  });

  test('should provide accurate performance summary', () => {
    // Record mixed performance data
    for (let i = 0; i < 20; i++) {
      monitor.recordConditionCheckTime(i < 10 ? 1 : 5); // Half good, half bad
      monitor.recordUIUpdateTime(i < 15 ? 10 : 30); // Mostly good, some bad
    }

    const summary = monitor.getPerformanceSummary();

    expect(summary.status).toMatch(/good|warning|critical/);
    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(summary.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(summary.issues)).toBe(true);
    expect(Array.isArray(summary.recommendations)).toBe(true);
  });
});

describe('RecruitmentResourceManager Memory Management', () => {
  let resourceManager: RecruitmentResourceManager;

  beforeEach(() => {
    resourceManager = new RecruitmentResourceManager(mockScene, {
      enableTracking: true,
      enableLeakDetection: true,
      cleanupInterval: 100, // Fast cleanup for tests
    });
  });

  afterEach(() => {
    resourceManager.destroy();
  });

  test('should track and cleanup resources properly', () => {
    const mockTarget = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
    const mockHandler = jest.fn();

    // Track some resources
    resourceManager.trackEventListener(mockTarget, 'click', mockHandler);

    const timer = setTimeout(() => {}, 1000);
    resourceManager.trackTimer(timer);

    const mockObject = { destroy: jest.fn(), active: true, scene: mockScene };
    resourceManager.trackPhaserObject(mockObject as any);

    let stats = resourceManager.getStatistics();
    expect(stats.trackedEventListeners).toBe(1);
    expect(stats.trackedTimers).toBe(1);
    expect(stats.trackedPhaserObjects).toBe(1);

    // Cleanup
    resourceManager.cleanup();

    stats = resourceManager.getStatistics();
    expect(stats.trackedEventListeners).toBe(0);
    expect(stats.trackedTimers).toBe(0);
    expect(stats.trackedPhaserObjects).toBe(0);

    expect(mockTarget.removeEventListener).toHaveBeenCalledWith('click', mockHandler);
    expect(mockObject.destroy).toHaveBeenCalled();
  });

  test('should detect potential memory leaks', done => {
    // Create many objects to simulate potential leaks
    for (let i = 0; i < 150; i++) {
      // Exceeds default threshold of 100
      const mockObject = {
        id: `leak-object-${i}`,
        destroy: jest.fn(),
        active: true,
        scene: mockScene,
      };
      resourceManager.trackPhaserObject(mockObject as any);
    }

    // Check for leaks immediately (no need to wait)
    const leakCheck = resourceManager.checkForLeaks();
    expect(leakCheck.details.length).toBeGreaterThan(0); // Should have high object count warning

    done();
  });

  test('should maintain reasonable memory usage', () => {
    const initialStats = resourceManager.getStatistics();
    const initialMemory = initialStats.estimatedMemoryUsage;

    // Add many tracked resources
    for (let i = 0; i < 100; i++) {
      const mockTarget = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      resourceManager.trackEventListener(mockTarget, 'event', jest.fn());

      const mockObject = { destroy: jest.fn(), active: true, scene: mockScene };
      resourceManager.trackPhaserObject(mockObject as any);
    }

    const peakStats = resourceManager.getStatistics();
    const peakMemory = peakStats.estimatedMemoryUsage;

    expect(peakMemory).toBeGreaterThan(initialMemory);
    expect(peakMemory).toBeLessThan(1024 * 1024); // Should be less than 1MB

    // Cleanup and check memory reduction
    resourceManager.cleanup();

    const finalStats = resourceManager.getStatistics();
    const finalMemory = finalStats.estimatedMemoryUsage;

    expect(finalMemory).toBeLessThanOrEqual(initialMemory * 1.1); // Allow small overhead
  });

  test('should handle high-frequency resource operations', () => {
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const mockTarget = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const mockHandler = jest.fn();

      // Track and immediately cleanup
      resourceManager.trackEventListener(mockTarget, 'test', mockHandler);
      resourceManager.removeEventListener(mockTarget, 'test', mockHandler);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;

    expect(averageTime).toBeLessThan(0.1); // Fast resource operations

    const stats = resourceManager.getStatistics();
    expect(stats.trackedEventListeners).toBe(0); // All cleaned up
  });
});

describe('Integrated Performance Test', () => {
  test('should maintain performance with all systems working together', () => {
    const cache = new RecruitmentConditionCache();
    const npcManager = new OptimizedNPCStateManager(mockScene);
    const uiPool = new RecruitmentUIPool(mockScene);
    const monitor = new RecruitmentPerformanceMonitor({ autoOptimize: false });
    const resourceManager = new RecruitmentResourceManager(mockScene);

    const startTime = performance.now();
    const iterations = 100;

    try {
      // Simulate integrated recruitment system operations
      for (let i = 0; i < iterations; i++) {
        const unit = createMockUnit(`integrated-unit-${i}`);
        const condition = createMockCondition(`integrated-condition-${i}`);
        const context = createMockContext(unit, unit);

        // Cache operations
        const cacheStart = performance.now();
        cache.set(unit.id, condition, context, true);
        cache.get(unit.id, condition, context);
        monitor.recordConditionCheckTime(performance.now() - cacheStart);

        // NPC operations
        const npcStart = performance.now();
        const conversionResult = npcManager.convertToNPC(unit, `recruitment-${i}`, 1);
        monitor.recordNPCConversionTime(performance.now() - npcStart);

        // UI operations
        const uiStart = performance.now();
        const panel = uiPool.getConditionPanel();
        const progressBar = uiPool.getProgressBar();
        uiPool.returnConditionPanel(panel);
        uiPool.returnProgressBar(progressBar);
        monitor.recordUIUpdateTime(performance.now() - uiStart);

        // Resource tracking
        resourceManager.trackPhaserObject(unit.sprite as any);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      // Performance assertions
      expect(averageTime).toBeLessThan(5); // Less than 5ms per integrated operation
      expect(totalTime).toBeLessThan(1000); // Total time less than 1 second

      // System health checks
      const cacheStats = cache.getStatistics();
      expect(cacheStats.hitRatio).toBeGreaterThan(0.3);

      const npcMetrics = npcManager.getOptimizationMetrics();
      expect(npcMetrics.averageLookupTime).toBeLessThan(1);

      const uiEfficiency = uiPool.getEfficiencyMetrics();
      expect(uiEfficiency.averageHitRatio).toBeGreaterThan(0.5);

      const performanceSummary = monitor.getPerformanceSummary();
      expect(performanceSummary.score).toBeGreaterThan(50);

      const resourceStats = resourceManager.getStatistics();
      expect(resourceStats.estimatedMemoryUsage).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
    } finally {
      // Cleanup all systems
      cache.destroy();
      npcManager.destroy();
      uiPool.destroy();
      monitor.destroy();
      resourceManager.destroy();
    }
  });
});
