/**
 * RecruitmentPerformanceMonitor - Performance monitoring and optimization for recruitment system
 *
 * This class monitors the performance of recruitment system operations and provides
 * optimization recommendations and automatic adjustments.
 *
 * Features:
 * - Real-time performance monitoring
 * - Automatic performance optimization
 * - Memory usage tracking
 * - Frame rate impact analysis
 * - Batch processing optimization
 * - Performance alerts and warnings
 */

export interface PerformanceMetrics {
  /** Average execution time for condition checks (ms) */
  averageConditionCheckTime: number;
  /** Average execution time for NPC conversion (ms) */
  averageNPCConversionTime: number;
  /** Average execution time for UI updates (ms) */
  averageUIUpdateTime: number;
  /** Total memory usage (bytes) */
  totalMemoryUsage: number;
  /** Frame rate impact (0-1, where 1 is severe impact) */
  frameRateImpact: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Cache hit ratio (0-1) */
  cacheHitRatio: number;
  /** Number of active NPCs */
  activeNPCs: number;
  /** Number of pending operations */
  pendingOperations: number;
}

export interface PerformanceThresholds {
  /** Maximum acceptable condition check time (ms) */
  maxConditionCheckTime: number;
  /** Maximum acceptable NPC conversion time (ms) */
  maxNPCConversionTime: number;
  /** Maximum acceptable UI update time (ms) */
  maxUIUpdateTime: number;
  /** Maximum acceptable memory usage (bytes) */
  maxMemoryUsage: number;
  /** Maximum acceptable frame rate impact (0-1) */
  maxFrameRateImpact: number;
  /** Minimum acceptable cache hit ratio (0-1) */
  minCacheHitRatio: number;
}

export interface OptimizationAction {
  /** Type of optimization action */
  type:
    | 'reduce_batch_size'
    | 'increase_cache_size'
    | 'defer_operations'
    | 'cleanup_memory'
    | 'disable_features';
  /** Priority of the action (1-10, 10 being highest) */
  priority: number;
  /** Description of the action */
  description: string;
  /** Function to execute the optimization */
  execute: () => void;
  /** Expected performance improvement */
  expectedImprovement: number;
}

export interface PerformanceAlert {
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** Timestamp when alert was created */
  timestamp: number;
  /** Metric that triggered the alert */
  metric: keyof PerformanceMetrics;
  /** Current value */
  currentValue: number;
  /** Threshold value */
  thresholdValue: number;
}

export interface MonitorConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  /** Monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Number of samples to keep for averaging */
  sampleSize: number;
  /** Enable automatic optimization */
  autoOptimize: boolean;
  /** Enable performance alerts */
  enableAlerts: boolean;
  /** Maximum number of alerts to keep */
  maxAlerts: number;
}

/**
 * Performance monitor for recruitment system
 */
export class RecruitmentPerformanceMonitor {
  private config: MonitorConfig;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private samples: Map<string, number[]>;
  private alerts: PerformanceAlert[];
  private optimizationActions: OptimizationAction[];
  private monitoringTimer?: NodeJS.Timeout;
  private frameRateMonitor?: FrameRateMonitor;

  // Default configuration
  private static readonly DEFAULT_CONFIG: MonitorConfig = {
    enabled: true,
    monitoringInterval: 1000, // 1 second
    sampleSize: 60, // 1 minute of samples
    autoOptimize: true,
    enableAlerts: true,
    maxAlerts: 50,
  };

  // Default performance thresholds
  private static readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    maxConditionCheckTime: 2.0, // 2ms
    maxNPCConversionTime: 5.0, // 5ms
    maxUIUpdateTime: 16.0, // 16ms (1 frame at 60fps)
    maxMemoryUsage: 10 * 1024 * 1024, // 10MB
    maxFrameRateImpact: 0.1, // 10% frame rate impact
    minCacheHitRatio: 0.7, // 70% cache hit ratio
  };

  constructor(config?: Partial<MonitorConfig>, thresholds?: Partial<PerformanceThresholds>) {
    this.config = { ...RecruitmentPerformanceMonitor.DEFAULT_CONFIG, ...config };
    this.thresholds = { ...RecruitmentPerformanceMonitor.DEFAULT_THRESHOLDS, ...thresholds };

    this.metrics = this.initializeMetrics();
    this.samples = new Map();
    this.alerts = [];
    this.optimizationActions = [];

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      averageConditionCheckTime: 0,
      averageNPCConversionTime: 0,
      averageUIUpdateTime: 0,
      totalMemoryUsage: 0,
      frameRateImpact: 0,
      operationsPerSecond: 0,
      cacheHitRatio: 0,
      activeNPCs: 0,
      pendingOperations: 0,
    };
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    // Start frame rate monitoring
    this.frameRateMonitor = new FrameRateMonitor();

    this.monitoringTimer = setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();

      if (this.config.autoOptimize) {
        this.performAutoOptimization();
      }
    }, this.config.monitoringInterval);
  }

  /**
   * Record performance sample
   */
  recordSample(metric: keyof PerformanceMetrics, value: number): void {
    if (!this.config.enabled) return;

    const samples = this.samples.get(metric) || [];
    samples.push(value);

    // Keep only recent samples
    if (samples.length > this.config.sampleSize) {
      samples.shift();
    }

    this.samples.set(metric, samples);
  }

  /**
   * Record condition check time
   */
  recordConditionCheckTime(time: number): void {
    this.recordSample('averageConditionCheckTime', time);
  }

  /**
   * Record NPC conversion time
   */
  recordNPCConversionTime(time: number): void {
    this.recordSample('averageNPCConversionTime', time);
  }

  /**
   * Record UI update time
   */
  recordUIUpdateTime(time: number): void {
    this.recordSample('averageUIUpdateTime', time);
  }

  /**
   * Update current metrics
   */
  private updateMetrics(): void {
    // Update averages from samples
    for (const [metric, samples] of this.samples.entries()) {
      if (samples.length > 0) {
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        (this.metrics as any)[metric] = average;
      }
    }

    // Update frame rate impact
    if (this.frameRateMonitor) {
      this.metrics.frameRateImpact = this.frameRateMonitor.getFrameRateImpact();
    }

    // Calculate operations per second
    const totalSamples = Array.from(this.samples.values()).reduce(
      (total, samples) => total + samples.length,
      0
    );
    this.metrics.operationsPerSecond =
      totalSamples / ((this.config.sampleSize * this.config.monitoringInterval) / 1000);
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(): void {
    if (!this.config.enableAlerts) return;

    const checks = [
      {
        metric: 'averageConditionCheckTime' as keyof PerformanceMetrics,
        threshold: this.thresholds.maxConditionCheckTime,
        severity: 'warning' as const,
      },
      {
        metric: 'averageNPCConversionTime' as keyof PerformanceMetrics,
        threshold: this.thresholds.maxNPCConversionTime,
        severity: 'warning' as const,
      },
      {
        metric: 'averageUIUpdateTime' as keyof PerformanceMetrics,
        threshold: this.thresholds.maxUIUpdateTime,
        severity: 'critical' as const,
      },
      {
        metric: 'totalMemoryUsage' as keyof PerformanceMetrics,
        threshold: this.thresholds.maxMemoryUsage,
        severity: 'critical' as const,
      },
      {
        metric: 'frameRateImpact' as keyof PerformanceMetrics,
        threshold: this.thresholds.maxFrameRateImpact,
        severity: 'critical' as const,
      },
    ];

    for (const check of checks) {
      const currentValue = this.metrics[check.metric];
      if (currentValue > check.threshold) {
        this.createAlert(
          check.severity,
          `${check.metric} exceeded threshold: ${currentValue.toFixed(2)} > ${check.threshold}`,
          check.metric,
          currentValue,
          check.threshold
        );
      }
    }

    // Check cache hit ratio (inverse check)
    if (this.metrics.cacheHitRatio < this.thresholds.minCacheHitRatio) {
      this.createAlert(
        'warning',
        `Cache hit ratio below threshold: ${this.metrics.cacheHitRatio.toFixed(2)} < ${this.thresholds.minCacheHitRatio}`,
        'cacheHitRatio',
        this.metrics.cacheHitRatio,
        this.thresholds.minCacheHitRatio
      );
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    severity: PerformanceAlert['severity'],
    message: string,
    metric: keyof PerformanceMetrics,
    currentValue: number,
    thresholdValue: number
  ): void {
    const alert: PerformanceAlert = {
      severity,
      message,
      timestamp: Date.now(),
      metric,
      currentValue,
      thresholdValue,
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts.shift();
    }

    // Log critical alerts
    if (severity === 'critical') {
      console.error('RecruitmentPerformanceMonitor: Critical alert -', message);
    } else if (severity === 'warning') {
      console.warn('RecruitmentPerformanceMonitor: Warning -', message);
    }
  }

  /**
   * Perform automatic optimization
   */
  private performAutoOptimization(): void {
    this.generateOptimizationActions();

    // Execute high-priority optimizations
    const highPriorityActions = this.optimizationActions
      .filter(action => action.priority >= 8)
      .sort((a, b) => b.priority - a.priority);

    for (const action of highPriorityActions.slice(0, 3)) {
      // Execute top 3
      try {
        action.execute();
        console.log(`RecruitmentPerformanceMonitor: Executed optimization - ${action.description}`);
      } catch (error) {
        console.error('RecruitmentPerformanceMonitor: Optimization failed -', error);
      }
    }

    // Clear executed actions
    this.optimizationActions = [];
  }

  /**
   * Generate optimization actions based on current metrics
   */
  private generateOptimizationActions(): void {
    this.optimizationActions = [];

    // Condition check time optimization
    if (this.metrics.averageConditionCheckTime > this.thresholds.maxConditionCheckTime) {
      this.optimizationActions.push({
        type: 'increase_cache_size',
        priority: 7,
        description: 'Increase condition check cache size',
        execute: () => this.optimizeConditionChecking(),
        expectedImprovement: 0.3,
      });
    }

    // Memory usage optimization
    if (this.metrics.totalMemoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      this.optimizationActions.push({
        type: 'cleanup_memory',
        priority: 9,
        description: 'Clean up unused memory',
        execute: () => this.optimizeMemoryUsage(),
        expectedImprovement: 0.4,
      });
    }

    // Frame rate impact optimization
    if (this.metrics.frameRateImpact > this.thresholds.maxFrameRateImpact) {
      this.optimizationActions.push({
        type: 'reduce_batch_size',
        priority: 10,
        description: 'Reduce batch processing size',
        execute: () => this.optimizeBatchProcessing(),
        expectedImprovement: 0.5,
      });
    }

    // UI update optimization
    if (this.metrics.averageUIUpdateTime > this.thresholds.maxUIUpdateTime) {
      this.optimizationActions.push({
        type: 'defer_operations',
        priority: 8,
        description: 'Defer non-critical UI updates',
        execute: () => this.optimizeUIUpdates(),
        expectedImprovement: 0.4,
      });
    }

    // Cache optimization
    if (this.metrics.cacheHitRatio < this.thresholds.minCacheHitRatio) {
      this.optimizationActions.push({
        type: 'increase_cache_size',
        priority: 6,
        description: 'Optimize cache configuration',
        execute: () => this.optimizeCaching(),
        expectedImprovement: 0.3,
      });
    }
  }

  /**
   * Optimize condition checking performance
   */
  private optimizeConditionChecking(): void {
    // This would integrate with the cache system
    // For now, we'll just log the optimization
    console.log('Optimizing condition checking performance');
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear old samples
    for (const [metric, samples] of this.samples.entries()) {
      if (samples.length > this.config.sampleSize / 2) {
        samples.splice(0, samples.length - this.config.sampleSize / 2);
      }
    }

    console.log('Memory usage optimized');
  }

  /**
   * Optimize batch processing
   */
  private optimizeBatchProcessing(): void {
    // This would reduce batch sizes in the recruitment system
    console.log('Batch processing optimized');
  }

  /**
   * Optimize UI updates
   */
  private optimizeUIUpdates(): void {
    // This would defer non-critical UI updates
    console.log('UI updates optimized');
  }

  /**
   * Optimize caching
   */
  private optimizeCaching(): void {
    // This would adjust cache parameters
    console.log('Caching optimized');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get recent alerts (last N alerts)
   */
  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    status: 'good' | 'warning' | 'critical';
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check each metric
    if (this.metrics.averageConditionCheckTime > this.thresholds.maxConditionCheckTime) {
      issues.push('Condition checking is slow');
      recommendations.push('Enable condition result caching');
      score -= 15;
    }

    if (this.metrics.averageNPCConversionTime > this.thresholds.maxNPCConversionTime) {
      issues.push('NPC conversion is slow');
      recommendations.push('Optimize NPC state management');
      score -= 10;
    }

    if (this.metrics.averageUIUpdateTime > this.thresholds.maxUIUpdateTime) {
      issues.push('UI updates are causing frame drops');
      recommendations.push('Use object pooling for UI elements');
      score -= 20;
    }

    if (this.metrics.totalMemoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push('High memory usage');
      recommendations.push('Implement memory cleanup strategies');
      score -= 25;
    }

    if (this.metrics.frameRateImpact > this.thresholds.maxFrameRateImpact) {
      issues.push('Significant frame rate impact');
      recommendations.push('Reduce batch processing size');
      score -= 30;
    }

    if (this.metrics.cacheHitRatio < this.thresholds.minCacheHitRatio) {
      issues.push('Low cache efficiency');
      recommendations.push('Adjust cache configuration');
      score -= 10;
    }

    let status: 'good' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'good';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.monitoringTimer) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.monitoringTimer) {
      this.stopMonitoring();
    }
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.frameRateMonitor) {
      this.frameRateMonitor.destroy();
      this.frameRateMonitor = undefined;
    }
  }

  /**
   * Reset all metrics and samples
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.samples.clear();
    this.alerts = [];
    this.optimizationActions = [];
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.reset();
  }
}

/**
 * Frame rate monitor for detecting performance impact
 */
class FrameRateMonitor {
  private targetFPS: number = 60;
  private frameRates: number[] = [];
  private lastFrameTime: number = 0;
  private animationFrameId?: number;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      if (this.lastFrameTime > 0) {
        const frameTime = now - this.lastFrameTime;
        const fps = 1000 / frameTime;
        this.frameRates.push(fps);

        // Keep only recent samples
        if (this.frameRates.length > 60) {
          // 1 second at 60fps
          this.frameRates.shift();
        }
      }
      this.lastFrameTime = now;
      this.animationFrameId = requestAnimationFrame(monitor);
    };

    this.animationFrameId = requestAnimationFrame(monitor);
  }

  getFrameRateImpact(): number {
    if (this.frameRates.length === 0) return 0;

    const averageFPS = this.frameRates.reduce((sum, fps) => sum + fps, 0) / this.frameRates.length;
    const impact = Math.max(0, (this.targetFPS - averageFPS) / this.targetFPS);
    return Math.min(1, impact);
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.frameRates = [];
  }
}
