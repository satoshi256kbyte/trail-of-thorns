/**
 * BattlePerformanceMonitor - Monitors and optimizes battle system performance
 * Provides real-time performance monitoring, bottleneck detection, and automatic optimization
 */

import { Unit } from '../types/gameplay';
import { BattleResult } from '../types/battle';

/**
 * Performance metrics collected during battle operations
 */
export interface BattlePerformanceMetrics {
    /** Frame rate measurements */
    frameRate: {
        current: number;
        average: number;
        minimum: number;
        maximum: number;
        samples: number[];
    };

    /** Memory usage tracking */
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
        previousHeapUsed: number;
        memoryLeakDetected: boolean;
    };

    /** Battle operation timings */
    operationTimes: {
        rangeCalculation: number[];
        damageCalculation: number[];
        animationExecution: number[];
        stateUpdate: number[];
        totalBattleTime: number[];
    };

    /** System load indicators */
    systemLoad: {
        cpuUsage: number;
        activeUnits: number;
        activeAnimations: number;
        activeEffects: number;
        queuedOperations: number;
    };

    /** Performance warnings and alerts */
    warnings: PerformanceWarning[];

    /** Optimization suggestions */
    optimizations: OptimizationSuggestion[];
}

/**
 * Performance warning types
 */
export enum PerformanceWarningType {
    LOW_FRAMERATE = 'low_framerate',
    HIGH_MEMORY_USAGE = 'high_memory_usage',
    MEMORY_LEAK = 'memory_leak',
    SLOW_OPERATION = 'slow_operation',
    HIGH_SYSTEM_LOAD = 'high_system_load',
    ANIMATION_BOTTLENECK = 'animation_bottleneck'
}

/**
 * Performance warning details
 */
export interface PerformanceWarning {
    type: PerformanceWarningType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    value: number;
    threshold: number;
    suggestions: string[];
}

/**
 * Optimization suggestion types
 */
export enum OptimizationType {
    REDUCE_ANIMATION_QUALITY = 'reduce_animation_quality',
    ENABLE_OBJECT_POOLING = 'enable_object_pooling',
    INCREASE_CACHE_SIZE = 'increase_cache_size',
    REDUCE_PARTICLE_COUNT = 'reduce_particle_count',
    DISABLE_EFFECTS = 'disable_effects',
    OPTIMIZE_CALCULATIONS = 'optimize_calculations'
}

/**
 * Optimization suggestion details
 */
export interface OptimizationSuggestion {
    type: OptimizationType;
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImprovement: string;
    implementationCost: 'low' | 'medium' | 'high';
    autoApplicable: boolean;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
    /** Enable frame rate monitoring */
    enableFrameRateMonitoring: boolean;
    /** Enable memory monitoring */
    enableMemoryMonitoring: boolean;
    /** Enable operation timing */
    enableOperationTiming: boolean;
    /** Frame rate warning threshold */
    frameRateWarningThreshold: number;
    /** Memory usage warning threshold (MB) */
    memoryWarningThreshold: number;
    /** Operation time warning threshold (ms) */
    operationTimeWarningThreshold: number;
    /** Sample collection interval (ms) */
    sampleInterval: number;
    /** Maximum samples to keep */
    maxSamples: number;
    /** Enable automatic optimizations */
    enableAutoOptimization: boolean;
}

/**
 * Performance monitoring and optimization system
 */
export class BattlePerformanceMonitor {
    private config: PerformanceMonitorConfig;
    private metrics: BattlePerformanceMetrics;
    private isMonitoring: boolean = false;
    private monitoringTimer: NodeJS.Timeout | null = null;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private operationStartTimes: Map<string, number> = new Map();

    // Default configuration
    private static readonly DEFAULT_CONFIG: PerformanceMonitorConfig = {
        enableFrameRateMonitoring: true,
        enableMemoryMonitoring: true,
        enableOperationTiming: true,
        frameRateWarningThreshold: 45, // Below 45 FPS
        memoryWarningThreshold: 200, // Above 200MB
        operationTimeWarningThreshold: 16, // Above 16ms (60fps frame budget)
        sampleInterval: 1000, // 1 second
        maxSamples: 60, // Keep 1 minute of samples
        enableAutoOptimization: false
    };

    constructor(config?: Partial<PerformanceMonitorConfig>) {
        this.config = { ...BattlePerformanceMonitor.DEFAULT_CONFIG, ...config };

        this.metrics = {
            frameRate: {
                current: 60,
                average: 60,
                minimum: 60,
                maximum: 60,
                samples: []
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                rss: 0,
                previousHeapUsed: 0,
                memoryLeakDetected: false
            },
            operationTimes: {
                rangeCalculation: [],
                damageCalculation: [],
                animationExecution: [],
                stateUpdate: [],
                totalBattleTime: []
            },
            systemLoad: {
                cpuUsage: 0,
                activeUnits: 0,
                activeAnimations: 0,
                activeEffects: 0,
                queuedOperations: 0
            },
            warnings: [],
            optimizations: []
        };
    }

    /**
     * Start performance monitoring
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

        // Start monitoring timer
        this.monitoringTimer = setInterval(() => {
            this.collectMetrics();
            this.analyzePerformance();

            if (this.config.enableAutoOptimization) {
                this.applyAutoOptimizations();
            }
        }, this.config.sampleInterval);

        console.log('[BattlePerformanceMonitor] Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        console.log('[BattlePerformanceMonitor] Performance monitoring stopped');
    }

    /**
     * Record frame rate measurement
     */
    public recordFrame(): void {
        if (!this.config.enableFrameRateMonitoring || !this.isMonitoring) {
            return;
        }

        const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime > 0) {
            const fps = 1000 / deltaTime;
            this.metrics.frameRate.current = fps;

            // Add to samples
            this.addSample(this.metrics.frameRate.samples, fps);

            // Update statistics
            this.updateFrameRateStats();
        }

        this.lastFrameTime = currentTime;
        this.frameCount++;
    }

    /**
     * Start timing an operation
     */
    public startOperation(operationType: keyof BattlePerformanceMetrics['operationTimes'], operationId: string): void {
        if (!this.config.enableOperationTiming || !this.isMonitoring) {
            return;
        }

        const key = `${operationType}_${operationId}`;
        this.operationStartTimes.set(key, typeof performance !== 'undefined' ? performance.now() : Date.now());
    }

    /**
     * End timing an operation
     */
    public endOperation(operationType: keyof BattlePerformanceMetrics['operationTimes'], operationId: string): number {
        if (!this.config.enableOperationTiming || !this.isMonitoring) {
            return 0;
        }

        const key = `${operationType}_${operationId}`;
        const startTime = this.operationStartTimes.get(key);

        if (startTime === undefined) {
            return 0;
        }

        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
        this.operationStartTimes.delete(key);

        // Record the timing
        this.addSample(this.metrics.operationTimes[operationType], duration);

        // Check for slow operations
        if (duration > this.config.operationTimeWarningThreshold) {
            this.addWarning({
                type: PerformanceWarningType.SLOW_OPERATION,
                severity: duration > this.config.operationTimeWarningThreshold * 2 ? 'high' : 'medium',
                message: `Slow ${operationType} operation: ${duration.toFixed(2)}ms`,
                timestamp: Date.now(),
                value: duration,
                threshold: this.config.operationTimeWarningThreshold,
                suggestions: this.getSlowOperationSuggestions(operationType)
            });
        }

        return duration;
    }

    /**
     * Update system load metrics
     */
    public updateSystemLoad(load: Partial<BattlePerformanceMetrics['systemLoad']>): void {
        if (!this.isMonitoring) {
            return;
        }

        Object.assign(this.metrics.systemLoad, load);

        // Check for high system load
        const totalLoad = (load.activeUnits || 0) + (load.activeAnimations || 0) + (load.activeEffects || 0);
        if (totalLoad > 50) { // Arbitrary threshold
            this.addWarning({
                type: PerformanceWarningType.HIGH_SYSTEM_LOAD,
                severity: totalLoad > 100 ? 'high' : 'medium',
                message: `High system load detected: ${totalLoad} active objects`,
                timestamp: Date.now(),
                value: totalLoad,
                threshold: 50,
                suggestions: [
                    'Reduce number of simultaneous animations',
                    'Enable object pooling',
                    'Optimize battle calculations'
                ]
            });
        }
    }

    /**
     * Record battle completion metrics
     */
    public recordBattleCompletion(battleResult: BattleResult, duration: number): void {
        if (!this.isMonitoring) {
            return;
        }

        this.addSample(this.metrics.operationTimes.totalBattleTime, duration);

        // Analyze battle performance
        if (duration > 5000) { // Battles taking longer than 5 seconds
            this.addWarning({
                type: PerformanceWarningType.SLOW_OPERATION,
                severity: 'medium',
                message: `Long battle duration: ${(duration / 1000).toFixed(1)}s`,
                timestamp: Date.now(),
                value: duration,
                threshold: 5000,
                suggestions: [
                    'Reduce animation duration',
                    'Skip non-essential effects',
                    'Optimize damage calculations'
                ]
            });
        }
    }

    /**
     * Collect current performance metrics
     */
    private collectMetrics(): void {
        // Collect memory metrics
        if (this.config.enableMemoryMonitoring && typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();

            this.metrics.memory.previousHeapUsed = this.metrics.memory.heapUsed;
            this.metrics.memory.heapUsed = memUsage.heapUsed / 1024 / 1024; // Convert to MB
            this.metrics.memory.heapTotal = memUsage.heapTotal / 1024 / 1024;
            this.metrics.memory.external = memUsage.external / 1024 / 1024;
            this.metrics.memory.rss = memUsage.rss / 1024 / 1024;

            // Check for memory leaks
            const memoryIncrease = this.metrics.memory.heapUsed - this.metrics.memory.previousHeapUsed;
            if (memoryIncrease > 10) { // More than 10MB increase
                this.metrics.memory.memoryLeakDetected = true;
                this.addWarning({
                    type: PerformanceWarningType.MEMORY_LEAK,
                    severity: 'high',
                    message: `Potential memory leak detected: +${memoryIncrease.toFixed(2)}MB`,
                    timestamp: Date.now(),
                    value: memoryIncrease,
                    threshold: 10,
                    suggestions: [
                        'Check for unreleased event listeners',
                        'Verify object pool cleanup',
                        'Review animation cleanup'
                    ]
                });
            }

            // Check memory usage threshold
            if (this.metrics.memory.heapUsed > this.config.memoryWarningThreshold) {
                this.addWarning({
                    type: PerformanceWarningType.HIGH_MEMORY_USAGE,
                    severity: this.metrics.memory.heapUsed > this.config.memoryWarningThreshold * 1.5 ? 'high' : 'medium',
                    message: `High memory usage: ${this.metrics.memory.heapUsed.toFixed(2)}MB`,
                    timestamp: Date.now(),
                    value: this.metrics.memory.heapUsed,
                    threshold: this.config.memoryWarningThreshold,
                    suggestions: [
                        'Enable object pooling',
                        'Clear unused caches',
                        'Reduce effect quality'
                    ]
                });
            }
        }
    }

    /**
     * Analyze performance and generate suggestions
     */
    private analyzePerformance(): void {
        // Analyze frame rate
        if (this.metrics.frameRate.average < this.config.frameRateWarningThreshold) {
            this.addWarning({
                type: PerformanceWarningType.LOW_FRAMERATE,
                severity: this.metrics.frameRate.average < 30 ? 'high' : 'medium',
                message: `Low frame rate: ${this.metrics.frameRate.average.toFixed(1)} FPS`,
                timestamp: Date.now(),
                value: this.metrics.frameRate.average,
                threshold: this.config.frameRateWarningThreshold,
                suggestions: [
                    'Reduce animation quality',
                    'Enable object pooling',
                    'Optimize calculations'
                ]
            });
        }

        // Generate optimization suggestions
        this.generateOptimizationSuggestions();
    }

    /**
     * Generate optimization suggestions based on current metrics
     */
    private generateOptimizationSuggestions(): void {
        this.metrics.optimizations = [];

        // Frame rate optimizations
        if (this.metrics.frameRate.average < 50) {
            this.metrics.optimizations.push({
                type: OptimizationType.REDUCE_ANIMATION_QUALITY,
                priority: 'high',
                description: 'Reduce animation quality to improve frame rate',
                expectedImprovement: '+10-15 FPS',
                implementationCost: 'low',
                autoApplicable: true
            });
        }

        // Memory optimizations
        if (this.metrics.memory.heapUsed > 150) {
            this.metrics.optimizations.push({
                type: OptimizationType.ENABLE_OBJECT_POOLING,
                priority: 'high',
                description: 'Enable object pooling to reduce memory allocation',
                expectedImprovement: '-30-50% memory usage',
                implementationCost: 'medium',
                autoApplicable: false
            });
        }

        // Operation timing optimizations
        const avgRangeCalc = this.getAverageOperationTime('rangeCalculation');
        if (avgRangeCalc > 10) {
            this.metrics.optimizations.push({
                type: OptimizationType.INCREASE_CACHE_SIZE,
                priority: 'medium',
                description: 'Increase cache size for range calculations',
                expectedImprovement: '-50% calculation time',
                implementationCost: 'low',
                autoApplicable: true
            });
        }
    }

    /**
     * Apply automatic optimizations
     */
    private applyAutoOptimizations(): void {
        for (const optimization of this.metrics.optimizations) {
            if (optimization.autoApplicable && optimization.priority === 'high') {
                this.applyOptimization(optimization);
            }
        }
    }

    /**
     * Apply a specific optimization
     */
    private applyOptimization(optimization: OptimizationSuggestion): void {
        console.log(`[BattlePerformanceMonitor] Applying optimization: ${optimization.description}`);

        // This would integrate with the actual battle system to apply optimizations
        // For now, we just log the action

        switch (optimization.type) {
            case OptimizationType.REDUCE_ANIMATION_QUALITY:
                // Reduce animation quality
                break;
            case OptimizationType.INCREASE_CACHE_SIZE:
                // Increase cache size
                break;
            case OptimizationType.REDUCE_PARTICLE_COUNT:
                // Reduce particle effects
                break;
        }
    }

    /**
     * Add a sample to a metrics array
     */
    private addSample(samples: number[], value: number): void {
        samples.push(value);

        if (samples.length > this.config.maxSamples) {
            samples.shift();
        }
    }

    /**
     * Update frame rate statistics
     */
    private updateFrameRateStats(): void {
        const samples = this.metrics.frameRate.samples;

        if (samples.length === 0) {
            return;
        }

        this.metrics.frameRate.average = samples.reduce((a, b) => a + b, 0) / samples.length;
        this.metrics.frameRate.minimum = Math.min(...samples);
        this.metrics.frameRate.maximum = Math.max(...samples);
    }

    /**
     * Get average operation time for a specific operation type
     */
    private getAverageOperationTime(operationType: keyof BattlePerformanceMetrics['operationTimes']): number {
        const times = this.metrics.operationTimes[operationType];
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }

    /**
     * Add a performance warning
     */
    private addWarning(warning: PerformanceWarning): void {
        this.metrics.warnings.push(warning);

        // Keep only recent warnings
        const maxWarnings = 50;
        if (this.metrics.warnings.length > maxWarnings) {
            this.metrics.warnings = this.metrics.warnings.slice(-maxWarnings);
        }

        // Log critical warnings
        if (warning.severity === 'critical' || warning.severity === 'high') {
            console.warn(`[BattlePerformanceMonitor] ${warning.message}`);
        }
    }

    /**
     * Get suggestions for slow operations
     */
    private getSlowOperationSuggestions(operationType: string): string[] {
        switch (operationType) {
            case 'rangeCalculation':
                return [
                    'Enable range calculation caching',
                    'Optimize pathfinding algorithm',
                    'Reduce calculation complexity'
                ];
            case 'damageCalculation':
                return [
                    'Cache damage modifiers',
                    'Simplify damage formulas',
                    'Pre-calculate common values'
                ];
            case 'animationExecution':
                return [
                    'Reduce animation duration',
                    'Use object pooling for effects',
                    'Skip non-essential animations'
                ];
            case 'stateUpdate':
                return [
                    'Batch state updates',
                    'Optimize data structures',
                    'Reduce update frequency'
                ];
            default:
                return ['Optimize operation implementation'];
        }
    }

    /**
     * Get current performance metrics
     */
    public getMetrics(): BattlePerformanceMetrics {
        return JSON.parse(JSON.stringify(this.metrics)); // Deep copy
    }

    /**
     * Get performance summary
     */
    public getPerformanceSummary(): {
        status: 'excellent' | 'good' | 'fair' | 'poor';
        frameRate: number;
        memoryUsage: number;
        activeWarnings: number;
        recommendations: string[];
    } {
        const criticalWarnings = this.metrics.warnings.filter(w => w.severity === 'critical').length;
        const highWarnings = this.metrics.warnings.filter(w => w.severity === 'high').length;

        let status: 'excellent' | 'good' | 'fair' | 'poor';

        if (criticalWarnings > 0) {
            status = 'poor';
        } else if (highWarnings > 2 || this.metrics.frameRate.average < 30) {
            status = 'fair';
        } else if (highWarnings > 0 || this.metrics.frameRate.average < 50) {
            status = 'good';
        } else {
            status = 'excellent';
        }

        const recommendations = this.metrics.optimizations
            .filter(opt => opt.priority === 'high')
            .map(opt => opt.description);

        return {
            status,
            frameRate: this.metrics.frameRate.average,
            memoryUsage: this.metrics.memory.heapUsed,
            activeWarnings: this.metrics.warnings.length,
            recommendations
        };
    }

    /**
     * Clear all metrics and warnings
     */
    public clearMetrics(): void {
        this.metrics.frameRate.samples = [];
        this.metrics.operationTimes = {
            rangeCalculation: [],
            damageCalculation: [],
            animationExecution: [],
            stateUpdate: [],
            totalBattleTime: []
        };
        this.metrics.warnings = [];
        this.metrics.optimizations = [];
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<PerformanceMonitorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Destroy the performance monitor
     */
    public destroy(): void {
        this.stopMonitoring();
        this.clearMetrics();
        this.operationStartTimes.clear();
    }
}