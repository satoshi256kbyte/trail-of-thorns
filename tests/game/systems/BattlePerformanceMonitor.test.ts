/**
 * Tests for BattlePerformanceMonitor
 * Verifies performance monitoring, bottleneck detection, and optimization suggestions
 */

import {
  BattlePerformanceMonitor,
  PerformanceWarningType,
  OptimizationType,
} from '../../../game/src/systems/BattlePerformanceMonitor';
import { BattleResult } from '../../../game/src/types/battle';
import { Unit } from '../../../game/src/types/gameplay';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
});

// Mock process.memoryUsage for memory testing
const mockMemoryUsage = jest.fn();
Object.defineProperty(global, 'process', {
  value: {
    memoryUsage: mockMemoryUsage,
  },
});

describe('BattlePerformanceMonitor', () => {
  let monitor: BattlePerformanceMonitor;
  let mockTime = 0;

  beforeEach(() => {
    mockTime = 0;
    mockPerformanceNow.mockImplementation(() => mockTime);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 80 * 1024 * 1024, // 80MB
    });

    monitor = new BattlePerformanceMonitor({
      sampleInterval: 100, // 100ms for testing
      maxSamples: 10,
      enableMonitoring: true,
      frameRateWarningThreshold: 45,
      memoryWarningThreshold: 100, // 100MB
      operationTimeWarningThreshold: 16, // 16ms
    });
  });

  afterEach(() => {
    monitor.destroy();
    jest.clearAllMocks();
  });

  describe('Monitoring Lifecycle', () => {
    test('should start and stop monitoring', () => {
      expect(() => monitor.startMonitoring()).not.toThrow();
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    test('should not start monitoring twice', () => {
      monitor.startMonitoring();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      monitor.startMonitoring(); // Should not start again

      expect(consoleSpy).toHaveBeenCalledWith(
        '[BattlePerformanceMonitor] Performance monitoring started'
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    test('should handle stop monitoring when not started', () => {
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('Frame Rate Monitoring', () => {
    test('should record frame rate measurements', () => {
      monitor.startMonitoring();

      // Simulate frame updates
      mockTime = 0;
      monitor.recordFrame();

      mockTime = 16.67; // 60 FPS
      monitor.recordFrame();

      mockTime = 33.34; // 60 FPS
      monitor.recordFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.frameRate.current).toBeCloseTo(60, 0);
      expect(metrics.frameRate.samples.length).toBeGreaterThan(0);
    });

    test('should detect low frame rate warnings', async () => {
      monitor.startMonitoring();

      // Simulate low frame rate (30 FPS)
      mockTime = 0;
      monitor.recordFrame();

      mockTime = 33.33; // 30 FPS
      monitor.recordFrame();

      mockTime = 66.66; // 30 FPS
      monitor.recordFrame();

      // Wait for monitoring interval
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const lowFrameRateWarnings = metrics.warnings.filter(
        w => w.type === PerformanceWarningType.LOW_FRAMERATE
      );
      expect(lowFrameRateWarnings.length).toBeGreaterThan(0);
    });

    test('should calculate frame rate statistics correctly', () => {
      monitor.startMonitoring();

      const frameRates = [60, 55, 50, 45, 40]; // Decreasing frame rates
      let currentTime = 0;

      monitor.recordFrame(); // Initial frame

      frameRates.forEach(fps => {
        currentTime += 1000 / fps;
        mockTime = currentTime;
        monitor.recordFrame();
      });

      const metrics = monitor.getMetrics();
      expect(metrics.frameRate.minimum).toBeLessThan(metrics.frameRate.maximum);
      expect(metrics.frameRate.average).toBeGreaterThan(0);
    });
  });

  describe('Operation Timing', () => {
    test('should track operation timing', () => {
      monitor.startMonitoring();

      mockTime = 0;
      monitor.startOperation('rangeCalculation', 'test1');

      mockTime = 10; // 10ms operation
      const duration = monitor.endOperation('rangeCalculation', 'test1');

      expect(duration).toBe(10);

      const metrics = monitor.getMetrics();
      expect(metrics.operationTimes.rangeCalculation).toContain(10);
    });

    test('should detect slow operations', () => {
      monitor.startMonitoring();

      mockTime = 0;
      monitor.startOperation('damageCalculation', 'slow1');

      mockTime = 50; // 50ms operation (above 16ms threshold)
      monitor.endOperation('damageCalculation', 'slow1');

      const metrics = monitor.getMetrics();
      const slowOpWarnings = metrics.warnings.filter(
        w => w.type === PerformanceWarningType.SLOW_OPERATION
      );
      expect(slowOpWarnings.length).toBeGreaterThan(0);
      expect(slowOpWarnings[0].value).toBe(50);
    });

    test('should handle missing start operation', () => {
      monitor.startMonitoring();

      const duration = monitor.endOperation('rangeCalculation', 'nonexistent');
      expect(duration).toBe(0);
    });

    test('should track multiple operation types', () => {
      monitor.startMonitoring();

      // Start multiple operations
      mockTime = 0;
      monitor.startOperation('rangeCalculation', 'op1');
      monitor.startOperation('damageCalculation', 'op2');
      monitor.startOperation('animationExecution', 'op3');

      // End operations at different times
      mockTime = 5;
      monitor.endOperation('rangeCalculation', 'op1');

      mockTime = 12;
      monitor.endOperation('damageCalculation', 'op2');

      mockTime = 20;
      monitor.endOperation('animationExecution', 'op3');

      const metrics = monitor.getMetrics();
      expect(metrics.operationTimes.rangeCalculation).toContain(5);
      expect(metrics.operationTimes.damageCalculation).toContain(12);
      expect(metrics.operationTimes.animationExecution).toContain(20);
    });
  });

  describe('System Load Monitoring', () => {
    test('should update system load metrics', () => {
      monitor.startMonitoring();

      monitor.updateSystemLoad({
        activeUnits: 10,
        activeAnimations: 5,
        activeEffects: 8,
        queuedOperations: 3,
      });

      const metrics = monitor.getMetrics();
      expect(metrics.systemLoad.activeUnits).toBe(10);
      expect(metrics.systemLoad.activeAnimations).toBe(5);
      expect(metrics.systemLoad.activeEffects).toBe(8);
      expect(metrics.systemLoad.queuedOperations).toBe(3);
    });

    test('should detect high system load', () => {
      monitor.startMonitoring();

      monitor.updateSystemLoad({
        activeUnits: 30,
        activeAnimations: 25,
        activeEffects: 20,
        queuedOperations: 10,
      });

      const metrics = monitor.getMetrics();
      const highLoadWarnings = metrics.warnings.filter(
        w => w.type === PerformanceWarningType.HIGH_SYSTEM_LOAD
      );
      expect(highLoadWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Monitoring', () => {
    test('should collect memory metrics', async () => {
      monitor.startMonitoring();

      // Wait for monitoring interval
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      expect(metrics.memory.heapUsed).toBe(50); // 50MB from mock
      expect(metrics.memory.heapTotal).toBe(100); // 100MB from mock
    });

    test('should detect high memory usage', async () => {
      // Set high memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 150 * 1024 * 1024, // 150MB (above 100MB threshold)
        heapTotal: 200 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        rss: 180 * 1024 * 1024,
      });

      monitor.startMonitoring();

      // Wait for monitoring interval
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const memoryWarnings = metrics.warnings.filter(
        w => w.type === PerformanceWarningType.HIGH_MEMORY_USAGE
      );
      expect(memoryWarnings.length).toBeGreaterThan(0);
    });

    test('should detect memory leaks', async () => {
      let heapUsed = 50 * 1024 * 1024; // Start at 50MB

      mockMemoryUsage.mockImplementation(() => ({
        heapUsed,
        heapTotal: 200 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        rss: heapUsed + 30 * 1024 * 1024,
      }));

      monitor.startMonitoring();

      // Wait for first measurement
      await new Promise(resolve => setTimeout(resolve, 150));

      // Simulate memory increase
      heapUsed += 15 * 1024 * 1024; // Increase by 15MB

      // Wait for second measurement
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const leakWarnings = metrics.warnings.filter(
        w => w.type === PerformanceWarningType.MEMORY_LEAK
      );
      expect(leakWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Battle Completion Tracking', () => {
    test('should record battle completion metrics', () => {
      monitor.startMonitoring();

      const mockBattleResult: BattleResult = {
        attacker: { id: 'unit1' } as Unit,
        target: { id: 'unit2' } as Unit,
        weapon: { id: 'sword1' } as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      monitor.recordBattleCompletion(mockBattleResult, 3000); // 3 second battle

      const metrics = monitor.getMetrics();
      expect(metrics.operationTimes.totalBattleTime).toContain(3000);
    });

    test('should warn about long battles', () => {
      monitor.startMonitoring();

      const mockBattleResult: BattleResult = {
        attacker: { id: 'unit1' } as Unit,
        target: { id: 'unit2' } as Unit,
        weapon: { id: 'sword1' } as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      monitor.recordBattleCompletion(mockBattleResult, 8000); // 8 second battle (above 5s threshold)

      const metrics = monitor.getMetrics();
      const slowBattleWarnings = metrics.warnings.filter(
        w =>
          w.type === PerformanceWarningType.SLOW_OPERATION && w.message.includes('battle duration')
      );
      expect(slowBattleWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Suggestions', () => {
    test('should generate optimization suggestions for low frame rate', async () => {
      monitor.startMonitoring();

      // Simulate consistently low frame rate
      mockTime = 0;
      monitor.recordFrame();

      for (let i = 1; i <= 10; i++) {
        mockTime += 40; // 25 FPS
        monitor.recordFrame();
      }

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const animationOptimizations = metrics.optimizations.filter(
        opt => opt.type === OptimizationType.REDUCE_ANIMATION_QUALITY
      );
      expect(animationOptimizations.length).toBeGreaterThan(0);
    });

    test('should generate memory optimization suggestions', async () => {
      // Set high memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 200 * 1024 * 1024, // 200MB
        heapTotal: 300 * 1024 * 1024,
        external: 30 * 1024 * 1024,
        rss: 250 * 1024 * 1024,
      });

      monitor.startMonitoring();

      // Wait for monitoring interval
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const poolingOptimizations = metrics.optimizations.filter(
        opt => opt.type === OptimizationType.ENABLE_OBJECT_POOLING
      );
      expect(poolingOptimizations.length).toBeGreaterThan(0);
    });

    test('should suggest cache optimization for slow calculations', () => {
      monitor.startMonitoring();

      // Simulate slow range calculations
      for (let i = 0; i < 5; i++) {
        mockTime = i * 20;
        monitor.startOperation('rangeCalculation', `calc${i}`);

        mockTime = i * 20 + 15; // 15ms each (above 10ms threshold for cache suggestion)
        monitor.endOperation('rangeCalculation', `calc${i}`);
      }

      const metrics = monitor.getMetrics();
      const cacheOptimizations = metrics.optimizations.filter(
        opt => opt.type === OptimizationType.INCREASE_CACHE_SIZE
      );
      expect(cacheOptimizations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Summary', () => {
    test('should provide performance summary', async () => {
      monitor.startMonitoring();

      // Simulate some performance data
      mockTime = 0;
      monitor.recordFrame();
      mockTime = 16.67;
      monitor.recordFrame();

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 150));

      const summary = monitor.getPerformanceSummary();

      expect(summary.status).toMatch(/excellent|good|fair|poor/);
      expect(summary.frameRate).toBeGreaterThan(0);
      expect(summary.memoryUsage).toBeGreaterThan(0);
      expect(summary.activeWarnings).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    test('should classify performance status correctly', async () => {
      monitor.startMonitoring();

      // Simulate excellent performance
      for (let i = 0; i < 10; i++) {
        mockTime = i * 16.67; // 60 FPS
        monitor.recordFrame();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const summary = monitor.getPerformanceSummary();
      expect(summary.status).toBe('excellent');
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      expect(() => {
        monitor.updateConfig({
          frameRateWarningThreshold: 30,
          memoryWarningThreshold: 200,
          enableMonitoring: false,
        });
      }).not.toThrow();
    });

    test('should handle invalid configuration', () => {
      expect(() => {
        monitor.updateConfig({
          frameRateWarningThreshold: -1,
          sampleInterval: 0,
        });
      }).not.toThrow();
    });
  });

  describe('Metrics Management', () => {
    test('should clear metrics', () => {
      monitor.startMonitoring();

      // Generate some metrics
      mockTime = 0;
      monitor.recordFrame();
      mockTime = 16.67;
      monitor.recordFrame();

      monitor.startOperation('rangeCalculation', 'test');
      mockTime = 26.67;
      monitor.endOperation('rangeCalculation', 'test');

      let metrics = monitor.getMetrics();
      expect(metrics.frameRate.samples.length).toBeGreaterThan(0);
      expect(metrics.operationTimes.rangeCalculation.length).toBeGreaterThan(0);

      // Clear metrics
      monitor.clearMetrics();

      metrics = monitor.getMetrics();
      expect(metrics.frameRate.samples.length).toBe(0);
      expect(metrics.operationTimes.rangeCalculation.length).toBe(0);
      expect(metrics.warnings.length).toBe(0);
      expect(metrics.optimizations.length).toBe(0);
    });

    test('should limit sample size', () => {
      const limitedMonitor = new BattlePerformanceMonitor({
        maxSamples: 3,
      });

      limitedMonitor.startMonitoring();

      // Add more samples than the limit
      for (let i = 0; i < 5; i++) {
        mockTime = i * 16.67;
        limitedMonitor.recordFrame();
      }

      const metrics = limitedMonitor.getMetrics();
      expect(metrics.frameRate.samples.length).toBeLessThanOrEqual(3);

      limitedMonitor.destroy();
    });
  });

  describe('Error Handling', () => {
    test('should handle monitoring when performance API is unavailable', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      expect(() => {
        const testMonitor = new BattlePerformanceMonitor();
        testMonitor.startMonitoring();
        testMonitor.recordFrame();
        testMonitor.destroy();
      }).not.toThrow();

      global.performance = originalPerformance;
    });

    test('should handle monitoring when process API is unavailable', async () => {
      const originalProcess = global.process;
      delete (global as any).process;

      const testMonitor = new BattlePerformanceMonitor();
      testMonitor.startMonitoring();

      // Wait for monitoring interval
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(() => {
        const metrics = testMonitor.getMetrics();
        expect(metrics.memory.heapUsed).toBe(0);
      }).not.toThrow();

      testMonitor.destroy();
      global.process = originalProcess;
    });
  });

  describe('Resource Cleanup', () => {
    test('should clean up resources on destroy', () => {
      monitor.startMonitoring();

      // Generate some data
      monitor.recordFrame();
      monitor.updateSystemLoad({ activeUnits: 5 });

      expect(() => monitor.destroy()).not.toThrow();

      // Should be able to call destroy multiple times
      expect(() => monitor.destroy()).not.toThrow();
    });

    test('should stop monitoring on destroy', () => {
      monitor.startMonitoring();
      monitor.destroy();

      // Should not throw when trying to stop after destroy
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });
  });
});
