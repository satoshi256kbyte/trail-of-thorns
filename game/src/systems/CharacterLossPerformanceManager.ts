/**
 * CharacterLossPerformanceManager - Performance optimization and monitoring for character loss system
 *
 * This class handles performance optimization and monitoring for the character loss system:
 * - Loss state check optimization (target: <1ms)
 * - Loss animation 60fps maintenance
 * - Memory usage optimization (target: <20KB)
 * - Effect object lifecycle management
 * - Performance metrics collection and monitoring
 *
 * Implements requirements 10.1, 10.2, 10.3, 10.4, 10.5 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit } from '../types/gameplay';
import {
  LostCharacter,
  LossCause,
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
} from '../types/characterLoss';

/**
 * Performance metrics tracking
 */
export interface PerformanceMetrics {
  /** Loss state check times in milliseconds */
  lossStateCheckTimes: number[];
  /** Animation frame times in milliseconds */
  animationFrameTimes: number[];
  /** Memory usage samples in bytes */
  memoryUsageSamples: number[];
  /** Effect object counts over time */
  effectObjectCounts: number[];
  /** Average performance over time windows */
  averageMetrics: {
    avgLossStateCheckTime: number;
    avgFrameTime: number;
    avgMemoryUsage: number;
    avgEffectObjectCount: number;
  };
  /** Performance targets and compliance */
  targetCompliance: {
    lossStateCheckTarget: number; // 1ms
    frameTimeTarget: number; // 16.67ms for 60fps
    memoryUsageTarget: number; // 20KB
    effectObjectTarget: number; // reasonable limit
  };
}

/**
 * Memory usage breakdown
 */
export interface MemoryUsageBreakdown {
  /** Lost characters data size */
  lostCharactersSize: number;
  /** Loss history data size */
  lossHistorySize: number;
  /** Active effects memory usage */
  activeEffectsSize: number;
  /** UI elements memory usage */
  uiElementsSize: number;
  /** Cache memory usage */
  cacheSize: number;
  /** Total memory usage */
  totalSize: number;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enableMonitoring: boolean;
  /** Enable automatic optimization */
  enableAutoOptimization: boolean;
  /** Performance sampling interval in milliseconds */
  samplingInterval: number;
  /** Maximum samples to keep in memory */
  maxSamples: number;
  /** Enable memory usage tracking */
  enableMemoryTracking: boolean;
  /** Enable effect pooling */
  enableEffectPooling: boolean;
  /** Enable state caching */
  enableStateCaching: boolean;
  /** Garbage collection threshold */
  gcThreshold: number;
}

/**
 * Optimized loss state cache
 */
interface LossStateCache {
  /** Cached loss states by character ID */
  lossStates: Map<string, boolean>;
  /** Cache timestamp */
  timestamp: number;
  /** Cache validity duration */
  validityDuration: number;
  /** Cache hit count */
  hitCount: number;
  /** Cache miss count */
  missCount: number;
}

/**
 * Effect object pool for memory optimization
 */
interface EffectObjectPool {
  /** Available particle emitters */
  particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  /** Available text objects */
  textObjects: Phaser.GameObjects.Text[];
  /** Available graphics objects */
  graphicsObjects: Phaser.GameObjects.Graphics[];
  /** Available containers */
  containers: Phaser.GameObjects.Container[];
  /** Pool usage statistics */
  poolStats: {
    particleEmittersUsed: number;
    textObjectsUsed: number;
    graphicsObjectsUsed: number;
    containersUsed: number;
  };
}

/**
 * Performance optimization interface
 */
export interface ICharacterLossPerformanceManager {
  // Performance monitoring
  startPerformanceMonitoring(): void;
  stopPerformanceMonitoring(): void;
  getPerformanceMetrics(): PerformanceMetrics;

  // Optimized operations
  optimizedLossStateCheck(characterId: string): boolean;
  optimizedBatchLossStateCheck(characterIds: string[]): Map<string, boolean>;

  // Memory management
  getMemoryUsage(): MemoryUsageBreakdown;
  optimizeMemoryUsage(): void;
  cleanupUnusedObjects(): void;

  // Effect management
  getEffectFromPool(type: string): Phaser.GameObjects.GameObject | null;
  returnEffectToPool(effect: Phaser.GameObjects.GameObject, type: string): void;

  // Performance reporting
  generatePerformanceReport(): string;
  isPerformanceTargetMet(): boolean;
}

/**
 * CharacterLossPerformanceManager implementation
 */
export class CharacterLossPerformanceManager
  extends Phaser.Events.EventEmitter
  implements ICharacterLossPerformanceManager
{
  private scene: Phaser.Scene;
  private config: PerformanceConfig;

  // Performance tracking
  private metrics: PerformanceMetrics;
  private isMonitoring: boolean = false;
  private monitoringTimer?: Phaser.Time.TimerEvent;
  private lastFrameTime: number = 0;

  // Optimization components
  private lossStateCache: LossStateCache;
  private effectObjectPool: EffectObjectPool;

  // Memory tracking
  private memoryTracker: {
    lastGCTime: number;
    gcCount: number;
    peakMemoryUsage: number;
  };

  // Performance thresholds
  private static readonly PERFORMANCE_TARGETS = {
    LOSS_STATE_CHECK_TIME: 1, // 1ms
    FRAME_TIME: 16.67, // 60fps
    MEMORY_USAGE: 20 * 1024, // 20KB
    EFFECT_OBJECT_COUNT: 50,
  };

  // Default configuration
  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    enableMonitoring: true,
    enableAutoOptimization: true,
    samplingInterval: 100, // 100ms
    maxSamples: 1000,
    enableMemoryTracking: true,
    enableEffectPooling: true,
    enableStateCaching: true,
    gcThreshold: 50 * 1024, // 50KB
  };

  /**
   * Creates a new CharacterLossPerformanceManager instance
   * @param scene - Phaser scene for performance monitoring
   * @param config - Performance configuration
   */
  constructor(scene: Phaser.Scene, config?: Partial<PerformanceConfig>) {
    super();

    this.scene = scene;
    this.config = { ...CharacterLossPerformanceManager.DEFAULT_CONFIG, ...config };

    this.initializeMetrics();
    this.initializeCache();
    this.initializeEffectPool();
    this.initializeMemoryTracker();

    if (this.config.enableMonitoring) {
      this.startPerformanceMonitoring();
    }

    console.log('[CharacterLossPerformanceManager] Initialized with config:', this.config);
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      lossStateCheckTimes: [],
      animationFrameTimes: [],
      memoryUsageSamples: [],
      effectObjectCounts: [],
      averageMetrics: {
        avgLossStateCheckTime: 0,
        avgFrameTime: 0,
        avgMemoryUsage: 0,
        avgEffectObjectCount: 0,
      },
      targetCompliance: {
        lossStateCheckTarget:
          CharacterLossPerformanceManager.PERFORMANCE_TARGETS.LOSS_STATE_CHECK_TIME,
        frameTimeTarget: CharacterLossPerformanceManager.PERFORMANCE_TARGETS.FRAME_TIME,
        memoryUsageTarget: CharacterLossPerformanceManager.PERFORMANCE_TARGETS.MEMORY_USAGE,
        effectObjectTarget: CharacterLossPerformanceManager.PERFORMANCE_TARGETS.EFFECT_OBJECT_COUNT,
      },
    };
  }

  /**
   * Initialize loss state cache
   */
  private initializeCache(): void {
    this.lossStateCache = {
      lossStates: new Map(),
      timestamp: Date.now(),
      validityDuration: 100, // 100ms cache validity
      hitCount: 0,
      missCount: 0,
    };
  }

  /**
   * Initialize effect object pool
   */
  private initializeEffectPool(): void {
    this.effectObjectPool = {
      particleEmitters: [],
      textObjects: [],
      graphicsObjects: [],
      containers: [],
      poolStats: {
        particleEmittersUsed: 0,
        textObjectsUsed: 0,
        graphicsObjectsUsed: 0,
        containersUsed: 0,
      },
    };

    // Pre-populate pools if enabled
    if (this.config.enableEffectPooling) {
      this.prePopulateEffectPools();
    }
  }

  /**
   * Initialize memory tracker
   */
  private initializeMemoryTracker(): void {
    this.memoryTracker = {
      lastGCTime: Date.now(),
      gcCount: 0,
      peakMemoryUsage: 0,
    };
  }

  /**
   * Pre-populate effect object pools
   */
  private prePopulateEffectPools(): void {
    // Pre-create text objects
    for (let i = 0; i < 10; i++) {
      const textObj = this.scene.add
        .text(0, 0, '', {
          fontSize: '16px',
          color: '#ffffff',
        })
        .setVisible(false);
      this.effectObjectPool.textObjects.push(textObj);
    }

    // Pre-create graphics objects
    for (let i = 0; i < 10; i++) {
      const graphics = this.scene.add.graphics().setVisible(false);
      this.effectObjectPool.graphicsObjects.push(graphics);
    }

    // Pre-create containers
    for (let i = 0; i < 5; i++) {
      const container = this.scene.add.container(0, 0).setVisible(false);
      this.effectObjectPool.containers.push(container);
    }

    console.log('[CharacterLossPerformanceManager] Pre-populated effect pools');
  }

  /**
   * Start performance monitoring
   */
  public startPerformanceMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Set up monitoring timer
    this.monitoringTimer = this.scene.time.addEvent({
      delay: this.config.samplingInterval,
      callback: this.collectPerformanceMetrics.bind(this),
      loop: true,
    });

    // Listen to scene update for frame time tracking
    this.scene.events.on('postupdate', this.trackFrameTime.bind(this));

    console.log('[CharacterLossPerformanceManager] Performance monitoring started');
    this.emit('monitoring-started');
  }

  /**
   * Stop performance monitoring
   */
  public stopPerformanceMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      this.monitoringTimer.destroy();
      this.monitoringTimer = undefined;
    }

    this.scene.events.off('postupdate', this.trackFrameTime.bind(this));

    console.log('[CharacterLossPerformanceManager] Performance monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Collect memory usage if enabled
    if (this.config.enableMemoryTracking) {
      const memoryUsage = this.calculateMemoryUsage();
      this.addMetricSample(this.metrics.memoryUsageSamples, memoryUsage.totalSize);

      // Track peak memory usage
      if (memoryUsage.totalSize > this.memoryTracker.peakMemoryUsage) {
        this.memoryTracker.peakMemoryUsage = memoryUsage.totalSize;
      }
    }

    // Collect effect object count
    const effectObjectCount = this.countActiveEffectObjects();
    this.addMetricSample(this.metrics.effectObjectCounts, effectObjectCount);

    // Update average metrics
    this.updateAverageMetrics();

    // Check for auto-optimization triggers
    if (this.config.enableAutoOptimization) {
      this.checkAutoOptimizationTriggers();
    }
  }

  /**
   * Track frame time for 60fps monitoring
   */
  private trackFrameTime(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;

    this.addMetricSample(this.metrics.animationFrameTimes, frameTime);
    this.lastFrameTime = currentTime;
  }

  /**
   * Add metric sample with size limit
   */
  private addMetricSample(samples: number[], value: number): void {
    samples.push(value);

    // Keep only the most recent samples
    if (samples.length > this.config.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Update average metrics
   */
  private updateAverageMetrics(): void {
    this.metrics.averageMetrics.avgLossStateCheckTime = this.calculateAverage(
      this.metrics.lossStateCheckTimes
    );
    this.metrics.averageMetrics.avgFrameTime = this.calculateAverage(
      this.metrics.animationFrameTimes
    );
    this.metrics.averageMetrics.avgMemoryUsage = this.calculateAverage(
      this.metrics.memoryUsageSamples
    );
    this.metrics.averageMetrics.avgEffectObjectCount = this.calculateAverage(
      this.metrics.effectObjectCounts
    );
  }

  /**
   * Calculate average of array values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Optimized loss state check with caching
   * Target: <1ms processing time
   * @param characterId - Character ID to check
   * @returns Whether character is lost
   */
  public optimizedLossStateCheck(characterId: string): boolean {
    const startTime = performance.now();

    try {
      // Check cache first if enabled
      if (this.config.enableStateCaching) {
        const cachedResult = this.getCachedLossState(characterId);
        if (cachedResult !== null) {
          this.lossStateCache.hitCount++;
          const endTime = performance.now();
          this.addMetricSample(this.metrics.lossStateCheckTimes, endTime - startTime);
          return cachedResult;
        }
        this.lossStateCache.missCount++;
      }

      // Perform actual loss state check
      // This would integrate with the actual CharacterLossState
      const isLost = this.performLossStateCheck(characterId);

      // Cache the result if enabled
      if (this.config.enableStateCaching) {
        this.cacheLossState(characterId, isLost);
      }

      const endTime = performance.now();
      const checkTime = endTime - startTime;
      this.addMetricSample(this.metrics.lossStateCheckTimes, checkTime);

      // Emit warning if check time exceeds target
      if (checkTime > this.metrics.targetCompliance.lossStateCheckTarget) {
        this.emit('performance-warning', {
          type: 'loss-state-check-slow',
          actualTime: checkTime,
          targetTime: this.metrics.targetCompliance.lossStateCheckTarget,
          characterId,
        });
      }

      return isLost;
    } catch (error) {
      const endTime = performance.now();
      this.addMetricSample(this.metrics.lossStateCheckTimes, endTime - startTime);

      console.error(
        '[CharacterLossPerformanceManager] Error in optimized loss state check:',
        error
      );
      return false; // Safe fallback
    }
  }

  /**
   * Optimized batch loss state check
   * @param characterIds - Array of character IDs to check
   * @returns Map of character ID to loss state
   */
  public optimizedBatchLossStateCheck(characterIds: string[]): Map<string, boolean> {
    const startTime = performance.now();
    const results = new Map<string, boolean>();

    try {
      // Process in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < characterIds.length; i += batchSize) {
        const batch = characterIds.slice(i, i + batchSize);

        for (const characterId of batch) {
          results.set(characterId, this.optimizedLossStateCheck(characterId));
        }

        // Yield control to prevent blocking
        if (i + batchSize < characterIds.length) {
          // Use setTimeout without await in non-async context
          return new Promise(resolve => {
            setTimeout(() => {
              // Continue processing remaining batches
              for (let j = i + batchSize; j < characterIds.length; j += batchSize) {
                const remainingBatch = characterIds.slice(j, j + batchSize);
                for (const characterId of remainingBatch) {
                  results.set(characterId, this.optimizedLossStateCheck(characterId));
                }
              }
              resolve(results);
            }, 0);
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerCheck = totalTime / characterIds.length;

      console.log(
        `[CharacterLossPerformanceManager] Batch check completed: ${characterIds.length} characters in ${totalTime.toFixed(2)}ms (avg: ${avgTimePerCheck.toFixed(2)}ms per check)`
      );

      return results;
    } catch (error) {
      console.error('[CharacterLossPerformanceManager] Error in batch loss state check:', error);
      return results; // Return partial results
    }
  }

  /**
   * Get cached loss state
   */
  private getCachedLossState(characterId: string): boolean | null {
    const now = Date.now();

    // Check if cache is still valid
    if (now - this.lossStateCache.timestamp > this.lossStateCache.validityDuration) {
      this.lossStateCache.lossStates.clear();
      this.lossStateCache.timestamp = now;
      return null;
    }

    return this.lossStateCache.lossStates.get(characterId) ?? null;
  }

  /**
   * Cache loss state
   */
  private cacheLossState(characterId: string, isLost: boolean): void {
    this.lossStateCache.lossStates.set(characterId, isLost);
  }

  /**
   * Perform actual loss state check (placeholder - would integrate with real system)
   */
  private performLossStateCheck(characterId: string): boolean {
    // This would integrate with the actual CharacterLossState instance
    // For now, return false as a safe default
    return false;
  }

  /**
   * Get current memory usage breakdown
   */
  public getMemoryUsage(): MemoryUsageBreakdown {
    return this.calculateMemoryUsage();
  }

  /**
   * Calculate memory usage breakdown
   */
  private calculateMemoryUsage(): MemoryUsageBreakdown {
    const breakdown: MemoryUsageBreakdown = {
      lostCharactersSize: this.estimateLostCharactersSize(),
      lossHistorySize: this.estimateLossHistorySize(),
      activeEffectsSize: this.estimateActiveEffectsSize(),
      uiElementsSize: this.estimateUIElementsSize(),
      cacheSize: this.estimateCacheSize(),
      totalSize: 0,
    };

    breakdown.totalSize =
      breakdown.lostCharactersSize +
      breakdown.lossHistorySize +
      breakdown.activeEffectsSize +
      breakdown.uiElementsSize +
      breakdown.cacheSize;

    return breakdown;
  }

  /**
   * Estimate lost characters data size
   */
  private estimateLostCharactersSize(): number {
    // Estimate based on typical LostCharacter object size
    const avgLostCharacterSize = 200; // bytes
    const estimatedLostCharacterCount = this.lossStateCache.lossStates.size;
    return estimatedLostCharacterCount * avgLostCharacterSize;
  }

  /**
   * Estimate loss history data size
   */
  private estimateLossHistorySize(): number {
    // Estimate based on typical LossRecord object size
    const avgLossRecordSize = 250; // bytes
    const estimatedHistoryCount = this.lossStateCache.lossStates.size; // Assume 1:1 ratio
    return estimatedHistoryCount * avgLossRecordSize;
  }

  /**
   * Estimate active effects memory size
   */
  private estimateActiveEffectsSize(): number {
    const activeEffectCount = this.countActiveEffectObjects();
    const avgEffectSize = 100; // bytes per effect object
    return activeEffectCount * avgEffectSize;
  }

  /**
   * Estimate UI elements memory size
   */
  private estimateUIElementsSize(): number {
    // Estimate based on typical UI element sizes
    const avgUIElementSize = 150; // bytes
    const estimatedUIElementCount = 20; // Rough estimate
    return estimatedUIElementCount * avgUIElementSize;
  }

  /**
   * Estimate cache memory size
   */
  private estimateCacheSize(): number {
    const cacheEntrySize = 50; // bytes per cache entry
    return this.lossStateCache.lossStates.size * cacheEntrySize;
  }

  /**
   * Count active effect objects
   */
  private countActiveEffectObjects(): number {
    return (
      this.effectObjectPool.poolStats.particleEmittersUsed +
      this.effectObjectPool.poolStats.textObjectsUsed +
      this.effectObjectPool.poolStats.graphicsObjectsUsed +
      this.effectObjectPool.poolStats.containersUsed
    );
  }

  /**
   * Optimize memory usage
   */
  public optimizeMemoryUsage(): void {
    const beforeMemory = this.calculateMemoryUsage();

    try {
      // Clear expired cache entries
      this.clearExpiredCacheEntries();

      // Clean up unused effect objects
      this.cleanupUnusedObjects();

      // Trigger garbage collection if threshold exceeded
      if (beforeMemory.totalSize > this.config.gcThreshold) {
        this.triggerGarbageCollection();
      }

      const afterMemory = this.calculateMemoryUsage();
      const memorySaved = beforeMemory.totalSize - afterMemory.totalSize;

      console.log(
        `[CharacterLossPerformanceManager] Memory optimization completed: ${memorySaved} bytes saved`
      );

      this.emit('memory-optimized', {
        beforeMemory,
        afterMemory,
        memorySaved,
      });
    } catch (error) {
      console.error('[CharacterLossPerformanceManager] Error during memory optimization:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCacheEntries(): void {
    const now = Date.now();
    if (now - this.lossStateCache.timestamp > this.lossStateCache.validityDuration) {
      const clearedEntries = this.lossStateCache.lossStates.size;
      this.lossStateCache.lossStates.clear();
      this.lossStateCache.timestamp = now;

      console.log(
        `[CharacterLossPerformanceManager] Cleared ${clearedEntries} expired cache entries`
      );
    }
  }

  /**
   * Clean up unused objects
   */
  public cleanupUnusedObjects(): void {
    let cleanedCount = 0;

    // Clean up unused text objects
    this.effectObjectPool.textObjects = this.effectObjectPool.textObjects.filter(obj => {
      if (!obj.visible && obj.active) {
        return true; // Keep in pool
      } else if (!obj.active) {
        obj.destroy();
        cleanedCount++;
        return false; // Remove from pool
      }
      return true;
    });

    // Clean up unused graphics objects
    this.effectObjectPool.graphicsObjects = this.effectObjectPool.graphicsObjects.filter(obj => {
      if (!obj.visible && obj.active) {
        return true; // Keep in pool
      } else if (!obj.active) {
        obj.destroy();
        cleanedCount++;
        return false; // Remove from pool
      }
      return true;
    });

    // Clean up unused containers
    this.effectObjectPool.containers = this.effectObjectPool.containers.filter(obj => {
      if (!obj.visible && obj.active) {
        return true; // Keep in pool
      } else if (!obj.active) {
        obj.destroy();
        cleanedCount++;
        return false; // Remove from pool
      }
      return true;
    });

    if (cleanedCount > 0) {
      console.log(`[CharacterLossPerformanceManager] Cleaned up ${cleanedCount} unused objects`);
    }
  }

  /**
   * Trigger garbage collection
   */
  private triggerGarbageCollection(): void {
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
      this.memoryTracker.gcCount++;
      this.memoryTracker.lastGCTime = Date.now();

      console.log('[CharacterLossPerformanceManager] Triggered garbage collection');
    }
  }

  /**
   * Get effect from pool
   */
  public getEffectFromPool(type: string): Phaser.GameObjects.GameObject | null {
    if (!this.config.enableEffectPooling) {
      return null;
    }

    switch (type) {
      case 'text':
        const textObj = this.effectObjectPool.textObjects.pop();
        if (textObj) {
          this.effectObjectPool.poolStats.textObjectsUsed++;
          textObj.setVisible(true);
          return textObj;
        }
        break;

      case 'graphics':
        const graphics = this.effectObjectPool.graphicsObjects.pop();
        if (graphics) {
          this.effectObjectPool.poolStats.graphicsObjectsUsed++;
          graphics.setVisible(true);
          return graphics;
        }
        break;

      case 'container':
        const container = this.effectObjectPool.containers.pop();
        if (container) {
          this.effectObjectPool.poolStats.containersUsed++;
          container.setVisible(true);
          return container;
        }
        break;
    }

    return null;
  }

  /**
   * Return effect to pool
   */
  public returnEffectToPool(effect: Phaser.GameObjects.GameObject, type: string): void {
    if (!this.config.enableEffectPooling || !effect.active) {
      return;
    }

    // Reset effect state
    effect.setVisible(false);

    switch (type) {
      case 'text':
        if (effect instanceof Phaser.GameObjects.Text) {
          effect.setText('');
          effect.setPosition(0, 0);
          this.effectObjectPool.textObjects.push(effect);
          this.effectObjectPool.poolStats.textObjectsUsed--;
        }
        break;

      case 'graphics':
        if (effect instanceof Phaser.GameObjects.Graphics) {
          effect.clear();
          effect.setPosition(0, 0);
          this.effectObjectPool.graphicsObjects.push(effect);
          this.effectObjectPool.poolStats.graphicsObjectsUsed--;
        }
        break;

      case 'container':
        if (effect instanceof Phaser.GameObjects.Container) {
          effect.removeAll();
          effect.setPosition(0, 0);
          this.effectObjectPool.containers.push(effect);
          this.effectObjectPool.poolStats.containersUsed--;
        }
        break;
    }
  }

  /**
   * Check auto-optimization triggers
   */
  private checkAutoOptimizationTriggers(): void {
    const metrics = this.metrics.averageMetrics;
    const targets = this.metrics.targetCompliance;

    // Check if memory usage exceeds target
    if (metrics.avgMemoryUsage > targets.memoryUsageTarget) {
      this.optimizeMemoryUsage();
    }

    // Check if effect object count is too high
    if (metrics.avgEffectObjectCount > targets.effectObjectTarget) {
      this.cleanupUnusedObjects();
    }

    // Check if frame time is too high (below 60fps)
    if (metrics.avgFrameTime > targets.frameTimeTarget) {
      this.emit('performance-warning', {
        type: 'frame-rate-low',
        actualFrameTime: metrics.avgFrameTime,
        targetFrameTime: targets.frameTimeTarget,
      });
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      lossStateCheckTimes: [...this.metrics.lossStateCheckTimes],
      animationFrameTimes: [...this.metrics.animationFrameTimes],
      memoryUsageSamples: [...this.metrics.memoryUsageSamples],
      effectObjectCounts: [...this.metrics.effectObjectCounts],
    };
  }

  /**
   * Check if performance targets are met
   */
  public isPerformanceTargetMet(): boolean {
    const metrics = this.metrics.averageMetrics;
    const targets = this.metrics.targetCompliance;

    return (
      metrics.avgLossStateCheckTime <= targets.lossStateCheckTarget &&
      metrics.avgFrameTime <= targets.frameTimeTarget &&
      metrics.avgMemoryUsage <= targets.memoryUsageTarget &&
      metrics.avgEffectObjectCount <= targets.effectObjectTarget
    );
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(): string {
    const metrics = this.metrics.averageMetrics;
    const targets = this.metrics.targetCompliance;
    const memoryUsage = this.calculateMemoryUsage();
    const cacheStats = this.getCacheStatistics();

    const report = `
=== Character Loss System Performance Report ===

Performance Metrics:
- Loss State Check Time: ${metrics.avgLossStateCheckTime.toFixed(2)}ms (Target: ${targets.lossStateCheckTarget}ms)
- Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms (Target: ${targets.frameTimeTarget}ms for 60fps)
- Memory Usage: ${(metrics.avgMemoryUsage / 1024).toFixed(2)}KB (Target: ${(targets.memoryUsageTarget / 1024).toFixed(2)}KB)
- Effect Object Count: ${metrics.avgEffectObjectCount} (Target: ${targets.effectObjectTarget})

Memory Breakdown:
- Lost Characters: ${(memoryUsage.lostCharactersSize / 1024).toFixed(2)}KB
- Loss History: ${(memoryUsage.lossHistorySize / 1024).toFixed(2)}KB
- Active Effects: ${(memoryUsage.activeEffectsSize / 1024).toFixed(2)}KB
- UI Elements: ${(memoryUsage.uiElementsSize / 1024).toFixed(2)}KB
- Cache: ${(memoryUsage.cacheSize / 1024).toFixed(2)}KB
- Total: ${(memoryUsage.totalSize / 1024).toFixed(2)}KB

Cache Performance:
- Hit Rate: ${cacheStats.hitRate.toFixed(2)}%
- Total Hits: ${cacheStats.totalHits}
- Total Misses: ${cacheStats.totalMisses}

Effect Pool Statistics:
- Particle Emitters Used: ${this.effectObjectPool.poolStats.particleEmittersUsed}
- Text Objects Used: ${this.effectObjectPool.poolStats.textObjectsUsed}
- Graphics Objects Used: ${this.effectObjectPool.poolStats.graphicsObjectsUsed}
- Containers Used: ${this.effectObjectPool.poolStats.containersUsed}

Performance Target Compliance:
- Loss State Check: ${metrics.avgLossStateCheckTime <= targets.lossStateCheckTarget ? '✓ PASS' : '✗ FAIL'}
- Frame Rate (60fps): ${metrics.avgFrameTime <= targets.frameTimeTarget ? '✓ PASS' : '✗ FAIL'}
- Memory Usage: ${metrics.avgMemoryUsage <= targets.memoryUsageTarget ? '✓ PASS' : '✗ FAIL'}
- Effect Object Count: ${metrics.avgEffectObjectCount <= targets.effectObjectTarget ? '✓ PASS' : '✗ FAIL'}

Overall Performance: ${this.isPerformanceTargetMet() ? '✓ ALL TARGETS MET' : '✗ OPTIMIZATION NEEDED'}

Recommendations:
${this.getOptimizationRecommendations().join('\n')}
        `.trim();

    return report;
  }

  /**
   * Get cache statistics
   */
  private getCacheStatistics(): {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    const totalRequests = this.lossStateCache.hitCount + this.lossStateCache.missCount;
    const hitRate = totalRequests > 0 ? (this.lossStateCache.hitCount / totalRequests) * 100 : 0;

    return {
      hitRate,
      totalHits: this.lossStateCache.hitCount,
      totalMisses: this.lossStateCache.missCount,
    };
  }

  /**
   * Set loss state provider for integration with actual system
   */
  public setLossStateProvider(provider: { isLost: (characterId: string) => boolean }): void {
    this.lossStateProvider = provider;
  }

  /**
   * Loss state provider for actual system integration
   */
  private lossStateProvider?: { isLost: (characterId: string) => boolean };

  /**
   * Perform actual loss state check with provider integration
   */
  private performLossStateCheck(characterId: string): boolean {
    if (this.lossStateProvider) {
      return this.lossStateProvider.isLost(characterId);
    }

    // Fallback to safe default
    return false;
  }

  /**
   * Optimize animation performance for 60fps maintenance
   */
  public optimizeAnimationPerformance(): void {
    const currentFrameTime = this.metrics.averageMetrics.avgFrameTime;
    const targetFrameTime = this.metrics.targetCompliance.frameTimeTarget;

    if (currentFrameTime > targetFrameTime) {
      console.log('[CharacterLossPerformanceManager] Optimizing animation performance');

      // Reduce animation quality if frame rate is low
      this.emit('animation-optimization-needed', {
        currentFrameTime,
        targetFrameTime,
        recommendations: [
          'Reduce particle count',
          'Simplify animation tweens',
          'Enable effect pooling',
          'Limit concurrent animations',
        ],
      });
    }
  }

  /**
   * Get performance optimization recommendations
   */
  public getOptimizationRecommendations(): string[] {
    const metrics = this.metrics.averageMetrics;
    const targets = this.metrics.targetCompliance;
    const recommendations: string[] = [];

    if (metrics.avgLossStateCheckTime > targets.lossStateCheckTarget) {
      recommendations.push('Enable state caching to reduce loss state check times');
      recommendations.push('Consider batch processing for multiple character checks');
    }

    if (metrics.avgFrameTime > targets.frameTimeTarget) {
      recommendations.push('Reduce animation complexity or duration');
      recommendations.push('Enable effect pooling to reduce object creation overhead');
      recommendations.push('Consider limiting concurrent animations');
    }

    if (metrics.avgMemoryUsage > targets.memoryUsageTarget) {
      recommendations.push('Enable automatic garbage collection');
      recommendations.push('Reduce cache validity duration');
      recommendations.push('Clean up unused effect objects more frequently');
    }

    if (metrics.avgEffectObjectCount > targets.effectObjectTarget) {
      recommendations.push('Implement more aggressive effect cleanup');
      recommendations.push('Reduce maximum concurrent effects');
      recommendations.push('Use effect pooling to reuse objects');
    }

    return recommendations;
  }

  /**
   * Force immediate memory cleanup
   */
  public forceMemoryCleanup(): void {
    console.log('[CharacterLossPerformanceManager] Forcing immediate memory cleanup');

    // Clear all caches
    this.lossStateCache.lossStates.clear();
    this.lossStateCache.timestamp = Date.now();

    // Clean up all unused objects
    this.cleanupUnusedObjects();

    // Force garbage collection if available
    this.triggerGarbageCollection();

    // Reset pool statistics
    this.effectObjectPool.poolStats = {
      particleEmittersUsed: 0,
      textObjectsUsed: 0,
      graphicsObjectsUsed: 0,
      containersUsed: 0,
    };

    const memoryAfterCleanup = this.calculateMemoryUsage();
    console.log(
      `[CharacterLossPerformanceManager] Memory cleanup completed: ${(memoryAfterCleanup.totalSize / 1024).toFixed(2)}KB remaining`
    );

    this.emit('memory-cleanup-completed', {
      memoryUsage: memoryAfterCleanup,
    });
  }

  /**
   * Get detailed performance statistics for debugging
   */
  public getDetailedStatistics(): {
    performance: PerformanceMetrics;
    memory: MemoryUsageBreakdown;
    cache: ReturnType<CharacterLossPerformanceManager['getCacheStatistics']>;
    pool: EffectObjectPool['poolStats'];
    system: {
      isMonitoring: boolean;
      gcCount: number;
      peakMemoryUsage: number;
      lastGCTime: number;
    };
  } {
    return {
      performance: this.getPerformanceMetrics(),
      memory: this.getMemoryUsage(),
      cache: this.getCacheStatistics(),
      pool: { ...this.effectObjectPool.poolStats },
      system: {
        isMonitoring: this.isMonitoring,
        gcCount: this.memoryTracker.gcCount,
        peakMemoryUsage: this.memoryTracker.peakMemoryUsage,
        lastGCTime: this.memoryTracker.lastGCTime,
      },
    };
  }

  /**
   * Destroy performance manager and clean up all resources
   */
  public destroy(): void {
    // Stop monitoring
    this.stopPerformanceMonitoring();

    // Clean up all effect objects
    this.effectObjectPool.particleEmitters.forEach(emitter => {
      if (emitter.active) {
        emitter.destroy();
      }
    });

    this.effectObjectPool.textObjects.forEach(text => {
      if (text.active) {
        text.destroy();
      }
    });

    this.effectObjectPool.graphicsObjects.forEach(graphics => {
      if (graphics.active) {
        graphics.destroy();
      }
    });

    this.effectObjectPool.containers.forEach(container => {
      if (container.active) {
        container.destroy();
      }
    });

    // Clear all data structures
    this.lossStateCache.lossStates.clear();
    this.effectObjectPool.particleEmitters = [];
    this.effectObjectPool.textObjects = [];
    this.effectObjectPool.graphicsObjects = [];
    this.effectObjectPool.containers = [];

    // Clear metrics
    this.metrics.lossStateCheckTimes = [];
    this.metrics.animationFrameTimes = [];
    this.metrics.memoryUsageSamples = [];
    this.metrics.effectObjectCounts = [];

    // Remove all event listeners
    this.removeAllListeners();

    console.log('[CharacterLossPerformanceManager] Performance manager destroyed and cleaned up');
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(): string {
    const metrics = this.metrics.averageMetrics;
    const targets = this.metrics.targetCompliance;
    const memoryUsage = this.calculateMemoryUsage();

    const report = `
=== Character Loss System Performance Report ===

Performance Metrics:
- Loss State Check Time: ${metrics.avgLossStateCheckTime.toFixed(2)}ms (target: ${targets.lossStateCheckTarget}ms) ${metrics.avgLossStateCheckTime <= targets.lossStateCheckTarget ? '✓' : '✗'}
- Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms (target: ${targets.frameTimeTarget}ms) ${metrics.avgFrameTime <= targets.frameTimeTarget ? '✓' : '✗'}
- Memory Usage: ${(metrics.avgMemoryUsage / 1024).toFixed(2)}KB (target: ${(targets.memoryUsageTarget / 1024).toFixed(2)}KB) ${metrics.avgMemoryUsage <= targets.memoryUsageTarget ? '✓' : '✗'}
- Effect Objects: ${metrics.avgEffectObjectCount.toFixed(0)} (target: ${targets.effectObjectTarget}) ${metrics.avgEffectObjectCount <= targets.effectObjectTarget ? '✓' : '✗'}

Memory Breakdown:
- Lost Characters: ${(memoryUsage.lostCharactersSize / 1024).toFixed(2)}KB
- Loss History: ${(memoryUsage.lossHistorySize / 1024).toFixed(2)}KB
- Active Effects: ${(memoryUsage.activeEffectsSize / 1024).toFixed(2)}KB
- UI Elements: ${(memoryUsage.uiElementsSize / 1024).toFixed(2)}KB
- Cache: ${(memoryUsage.cacheSize / 1024).toFixed(2)}KB
- Total: ${(memoryUsage.totalSize / 1024).toFixed(2)}KB

Cache Statistics:
- Hit Rate: ${this.lossStateCache.hitCount + this.lossStateCache.missCount > 0 ? ((this.lossStateCache.hitCount / (this.lossStateCache.hitCount + this.lossStateCache.missCount)) * 100).toFixed(1) : 0}%
- Hits: ${this.lossStateCache.hitCount}
- Misses: ${this.lossStateCache.missCount}

Effect Pool Statistics:
- Text Objects Used: ${this.effectObjectPool.poolStats.textObjectsUsed}/${this.effectObjectPool.textObjects.length + this.effectObjectPool.poolStats.textObjectsUsed}
- Graphics Objects Used: ${this.effectObjectPool.poolStats.graphicsObjectsUsed}/${this.effectObjectPool.graphicsObjects.length + this.effectObjectPool.poolStats.graphicsObjectsUsed}
- Containers Used: ${this.effectObjectPool.poolStats.containersUsed}/${this.effectObjectPool.containers.length + this.effectObjectPool.poolStats.containersUsed}

Overall Performance: ${this.isPerformanceTargetMet() ? 'MEETING TARGETS ✓' : 'BELOW TARGETS ✗'}
        `.trim();

    return report;
  }

  /**
   * Destroy performance manager and clean up resources
   */
  public destroy(): void {
    this.stopPerformanceMonitoring();

    // Clean up effect pools
    this.effectObjectPool.textObjects.forEach(obj => obj.destroy());
    this.effectObjectPool.graphicsObjects.forEach(obj => obj.destroy());
    this.effectObjectPool.containers.forEach(obj => obj.destroy());

    // Clear caches
    this.lossStateCache.lossStates.clear();

    // Clear metrics
    this.metrics.lossStateCheckTimes = [];
    this.metrics.animationFrameTimes = [];
    this.metrics.memoryUsageSamples = [];
    this.metrics.effectObjectCounts = [];

    console.log('[CharacterLossPerformanceManager] Destroyed and cleaned up resources');
  }
}
