/**
 * BattleResourceManager - Manages memory and resource cleanup for battle system
 * Prevents memory leaks by tracking and properly disposing of battle-related resources
 */

import * as Phaser from 'phaser';
import { Unit } from '../types/gameplay';
import { BattleResult } from '../types/battle';

/**
 * Resource types that need cleanup
 */
export enum ResourceType {
  GRAPHICS = 'graphics',
  TWEENS = 'tweens',
  TIMERS = 'timers',
  EVENT_LISTENERS = 'event_listeners',
  TEXTURES = 'textures',
  SOUNDS = 'sounds',
  CONTAINERS = 'containers',
  PARTICLES = 'particles',
}

/**
 * Resource tracking entry
 */
interface ResourceEntry {
  id: string;
  type: ResourceType;
  resource: any;
  createdAt: number;
  lastAccessed: number;
  references: number;
  metadata?: any;
}

/**
 * Resource cleanup configuration
 */
export interface ResourceCleanupConfig {
  /** Enable automatic cleanup */
  enableAutoCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Maximum age for unused resources (ms) */
  maxResourceAge: number;
  /** Enable resource leak detection */
  enableLeakDetection: boolean;
  /** Maximum number of resources before warning */
  resourceWarningThreshold: number;
  /** Enable detailed logging */
  enableDetailedLogging: boolean;
}

/**
 * Resource usage statistics
 */
export interface ResourceStatistics {
  totalResources: number;
  resourcesByType: Map<ResourceType, number>;
  memoryUsage: number;
  oldestResource: number;
  leaksDetected: number;
  cleanupOperations: number;
  lastCleanupTime: number;
}

/**
 * Memory leak detection result
 */
export interface LeakDetectionResult {
  leaksFound: boolean;
  suspiciousResources: ResourceEntry[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Main resource management class
 */
export class BattleResourceManager {
  private scene: Phaser.Scene;
  private config: ResourceCleanupConfig;
  private resources: Map<string, ResourceEntry> = new Map();
  private cleanupTimer: Phaser.Time.TimerEvent | null = null;
  private statistics: ResourceStatistics;
  private resourceIdCounter: number = 0;

  // Weak references for automatic cleanup
  private weakReferences: WeakMap<object, string> = new WeakMap();

  // Event listeners tracking
  private eventListeners: Map<string, { target: any; event: string; callback: Function }> =
    new Map();

  // Tween tracking
  private activeTweens: Set<Phaser.Tweens.Tween> = new Set();

  // Timer tracking
  private activeTimers: Set<Phaser.Time.TimerEvent> = new Set();

  // Default configuration
  private static readonly DEFAULT_CONFIG: ResourceCleanupConfig = {
    enableAutoCleanup: true,
    cleanupInterval: 30000, // 30 seconds
    maxResourceAge: 300000, // 5 minutes
    enableLeakDetection: true,
    resourceWarningThreshold: 1000,
    enableDetailedLogging: false,
  };

  constructor(scene: Phaser.Scene, config?: Partial<ResourceCleanupConfig>) {
    this.scene = scene;
    this.config = { ...BattleResourceManager.DEFAULT_CONFIG, ...config };

    this.statistics = {
      totalResources: 0,
      resourcesByType: new Map(),
      memoryUsage: 0,
      oldestResource: 0,
      leaksDetected: 0,
      cleanupOperations: 0,
      lastCleanupTime: Date.now(),
    };

    this.initializeResourceTracking();

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Initialize resource tracking systems
   */
  private initializeResourceTracking(): void {
    // Hook into Phaser's object creation to track resources automatically
    this.setupPhaserHooks();

    // Set up scene cleanup on destroy
    this.scene.events.once('destroy', () => {
      this.cleanup();
    });
  }

  /**
   * Set up hooks into Phaser's object creation
   */
  private setupPhaserHooks(): void {
    // This would require more extensive Phaser integration
    // For now, we provide manual tracking methods
  }

  /**
   * Register a resource for tracking
   */
  public registerResource(resource: any, type: ResourceType, metadata?: any): string {
    const id = `${type}_${++this.resourceIdCounter}_${Date.now()}`;

    const entry: ResourceEntry = {
      id,
      type,
      resource,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      references: 1,
      metadata,
    };

    this.resources.set(id, entry);
    this.weakReferences.set(resource, id);

    // Update statistics
    this.updateStatistics();

    this.log(`Registered ${type} resource: ${id}`);

    return id;
  }

  /**
   * Unregister a resource
   */
  public unregisterResource(id: string): boolean {
    const entry = this.resources.get(id);

    if (!entry) {
      return false;
    }

    // Clean up the resource
    this.cleanupResource(entry);

    // Remove from tracking
    this.resources.delete(id);
    this.weakReferences.delete(entry.resource);

    this.updateStatistics();
    this.log(`Unregistered ${entry.type} resource: ${id}`);

    return true;
  }

  /**
   * Register a graphics object
   */
  public registerGraphics(graphics: Phaser.GameObjects.Graphics, metadata?: any): string {
    return this.registerResource(graphics, ResourceType.GRAPHICS, metadata);
  }

  /**
   * Register a tween
   */
  public registerTween(tween: Phaser.Tweens.Tween, metadata?: any): string {
    this.activeTweens.add(tween);

    // Auto-cleanup when tween completes
    tween.once('complete', () => {
      this.activeTweens.delete(tween);
    });

    return this.registerResource(tween, ResourceType.TWEENS, metadata);
  }

  /**
   * Register a timer
   */
  public registerTimer(timer: Phaser.Time.TimerEvent, metadata?: any): string {
    this.activeTimers.add(timer);

    // Auto-cleanup when timer completes
    timer.callback = (originalCallback => {
      return (...args: any[]) => {
        this.activeTimers.delete(timer);
        return originalCallback.apply(timer.callbackScope, args);
      };
    })(timer.callback);

    return this.registerResource(timer, ResourceType.TIMERS, metadata);
  }

  /**
   * Register an event listener
   */
  public registerEventListener(
    target: any,
    event: string,
    callback: Function,
    metadata?: any
  ): string {
    const id = this.registerResource(
      { target, event, callback },
      ResourceType.EVENT_LISTENERS,
      metadata
    );

    this.eventListeners.set(id, { target, event, callback });

    return id;
  }

  /**
   * Register a container
   */
  public registerContainer(container: Phaser.GameObjects.Container, metadata?: any): string {
    return this.registerResource(container, ResourceType.CONTAINERS, metadata);
  }

  /**
   * Register a particle emitter
   */
  public registerParticleEmitter(emitter: any, metadata?: any): string {
    return this.registerResource(emitter, ResourceType.PARTICLES, metadata);
  }

  /**
   * Access a resource (updates last accessed time)
   */
  public accessResource(id: string): ResourceEntry | null {
    const entry = this.resources.get(id);

    if (entry) {
      entry.lastAccessed = Date.now();
      entry.references++;
    }

    return entry || null;
  }

  /**
   * Clean up a specific resource
   */
  private cleanupResource(entry: ResourceEntry): void {
    try {
      switch (entry.type) {
        case ResourceType.GRAPHICS:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          break;

        case ResourceType.TWEENS:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          this.activeTweens.delete(entry.resource);
          break;

        case ResourceType.TIMERS:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          this.activeTimers.delete(entry.resource);
          break;

        case ResourceType.EVENT_LISTENERS:
          const listener = this.eventListeners.get(entry.id);
          if (listener) {
            if (listener.target && listener.target.off) {
              listener.target.off(listener.event, listener.callback);
            } else if (listener.target && listener.target.removeEventListener) {
              listener.target.removeEventListener(listener.event, listener.callback);
            }
            this.eventListeners.delete(entry.id);
          }
          break;

        case ResourceType.CONTAINERS:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          break;

        case ResourceType.PARTICLES:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          break;

        case ResourceType.TEXTURES:
          // Textures are managed by Phaser's texture manager
          // We just remove our reference
          break;

        case ResourceType.SOUNDS:
          if (entry.resource && entry.resource.destroy) {
            entry.resource.destroy();
          }
          break;
      }

      this.statistics.cleanupOperations++;
    } catch (error) {
      console.error(
        `[BattleResourceManager] Error cleaning up ${entry.type} resource ${entry.id}:`,
        error
      );
    }
  }

  /**
   * Perform automatic cleanup of old resources
   */
  public performCleanup(): void {
    const now = Date.now();
    const resourcesToCleanup: string[] = [];

    // Find resources that are old and unused
    for (const [id, entry] of this.resources) {
      const age = now - entry.lastAccessed;

      if (age > this.config.maxResourceAge && entry.references <= 1) {
        resourcesToCleanup.push(id);
      }
    }

    // Clean up identified resources
    for (const id of resourcesToCleanup) {
      this.unregisterResource(id);
    }

    // Clean up orphaned tweens and timers
    this.cleanupOrphanedTweens();
    this.cleanupOrphanedTimers();

    this.statistics.lastCleanupTime = now;

    this.log(`Cleanup completed: ${resourcesToCleanup.length} resources cleaned up`);

    // Check for potential memory leaks
    if (this.config.enableLeakDetection) {
      const leakResult = this.detectMemoryLeaks();
      if (leakResult.leaksFound) {
        console.warn('[BattleResourceManager] Potential memory leaks detected:', leakResult);
      }
    }
  }

  /**
   * Clean up orphaned tweens
   */
  private cleanupOrphanedTweens(): void {
    for (const tween of this.activeTweens) {
      if (!tween.isPlaying() && tween.totalProgress >= 1) {
        tween.destroy();
        this.activeTweens.delete(tween);
      }
    }
  }

  /**
   * Clean up orphaned timers
   */
  private cleanupOrphanedTimers(): void {
    for (const timer of this.activeTimers) {
      if (timer.hasDispatched || timer.paused) {
        timer.destroy();
        this.activeTimers.delete(timer);
      }
    }
  }

  /**
   * Detect potential memory leaks
   */
  public detectMemoryLeaks(): LeakDetectionResult {
    const now = Date.now();
    const suspiciousResources: ResourceEntry[] = [];
    const oldResourceThreshold = 600000; // 10 minutes
    const highReferenceThreshold = 100;

    for (const entry of this.resources.values()) {
      const age = now - entry.createdAt;

      // Check for very old resources
      if (age > oldResourceThreshold) {
        suspiciousResources.push(entry);
      }

      // Check for resources with unusually high reference counts
      if (entry.references > highReferenceThreshold) {
        suspiciousResources.push(entry);
      }
    }

    const leaksFound = suspiciousResources.length > 0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (suspiciousResources.length > 50) {
      severity = 'critical';
    } else if (suspiciousResources.length > 20) {
      severity = 'high';
    } else if (suspiciousResources.length > 5) {
      severity = 'medium';
    }

    const recommendations: string[] = [];

    if (leaksFound) {
      recommendations.push('Review resource cleanup in battle animations');
      recommendations.push('Check for unreleased event listeners');
      recommendations.push('Verify tween and timer cleanup');
      recommendations.push('Consider reducing resource lifetime');
    }

    if (leaksFound) {
      this.statistics.leaksDetected++;
    }

    return {
      leaksFound,
      suspiciousResources,
      recommendations,
      severity,
    };
  }

  /**
   * Clean up all resources immediately
   */
  public cleanup(): void {
    this.log('Performing complete resource cleanup');

    // Clean up all tracked resources
    for (const [id, entry] of this.resources) {
      this.cleanupResource(entry);
    }

    // Clear all tracking
    this.resources.clear();
    this.eventListeners.clear();
    this.activeTweens.clear();
    this.activeTimers.clear();

    // Stop auto cleanup
    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
      this.cleanupTimer = null;
    }

    this.updateStatistics();
    this.log('Complete resource cleanup finished');
  }

  /**
   * Clean up resources related to a specific battle
   */
  public cleanupBattleResources(battleId: string): void {
    const resourcesToCleanup: string[] = [];

    for (const [id, entry] of this.resources) {
      if (entry.metadata && entry.metadata.battleId === battleId) {
        resourcesToCleanup.push(id);
      }
    }

    for (const id of resourcesToCleanup) {
      this.unregisterResource(id);
    }

    this.log(`Cleaned up ${resourcesToCleanup.length} resources for battle ${battleId}`);
  }

  /**
   * Clean up resources related to a specific unit
   */
  public cleanupUnitResources(unit: Unit): void {
    const resourcesToCleanup: string[] = [];

    for (const [id, entry] of this.resources) {
      if (entry.metadata && entry.metadata.unitId === unit.id) {
        resourcesToCleanup.push(id);
      }
    }

    for (const id of resourcesToCleanup) {
      this.unregisterResource(id);
    }

    this.log(`Cleaned up ${resourcesToCleanup.length} resources for unit ${unit.id}`);
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
    }

    this.cleanupTimer = this.scene.time.addEvent({
      delay: this.config.cleanupInterval,
      callback: this.performCleanup,
      callbackScope: this,
      loop: true,
    });

    this.log('Auto cleanup started');
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
      this.cleanupTimer = null;
    }

    this.log('Auto cleanup stopped');
  }

  /**
   * Update resource statistics
   */
  private updateStatistics(): void {
    this.statistics.totalResources = this.resources.size;

    // Count resources by type
    this.statistics.resourcesByType.clear();
    let oldestTime = Date.now();

    for (const entry of this.resources.values()) {
      const count = this.statistics.resourcesByType.get(entry.type) || 0;
      this.statistics.resourcesByType.set(entry.type, count + 1);

      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
      }
    }

    this.statistics.oldestResource = Date.now() - oldestTime;

    // Estimate memory usage (rough calculation)
    this.statistics.memoryUsage = this.resources.size * 100; // ~100 bytes per resource entry

    // Check for resource warning threshold
    if (this.statistics.totalResources > this.config.resourceWarningThreshold) {
      console.warn(
        `[BattleResourceManager] High resource count: ${this.statistics.totalResources}`
      );
    }
  }

  /**
   * Get current resource statistics
   */
  public getStatistics(): ResourceStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get resources by type
   */
  public getResourcesByType(type: ResourceType): ResourceEntry[] {
    return Array.from(this.resources.values()).filter(entry => entry.type === type);
  }

  /**
   * Force garbage collection if available
   */
  public forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      this.log('Forced garbage collection');
    }
  }

  /**
   * Log message if detailed logging is enabled
   */
  private log(message: string): void {
    if (this.config.enableDetailedLogging) {
      console.log(`[BattleResourceManager] ${message}`);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ResourceCleanupConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auto cleanup if settings changed
    if (config.enableAutoCleanup !== undefined || config.cleanupInterval !== undefined) {
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      } else {
        this.stopAutoCleanup();
      }
    }
  }

  /**
   * Get resource health report
   */
  public getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    totalResources: number;
    oldestResourceAge: number;
    memoryUsage: number;
    leaksDetected: number;
    recommendations: string[];
  } {
    const stats = this.getStatistics();
    const leakResult = this.detectMemoryLeaks();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (
      leakResult.severity === 'critical' ||
      stats.totalResources > this.config.resourceWarningThreshold * 2
    ) {
      status = 'critical';
    } else if (
      leakResult.severity === 'high' ||
      stats.totalResources > this.config.resourceWarningThreshold
    ) {
      status = 'warning';
    }

    const recommendations: string[] = [];

    if (stats.totalResources > this.config.resourceWarningThreshold) {
      recommendations.push('Consider more frequent cleanup');
    }

    if (stats.oldestResource > 600000) {
      // 10 minutes
      recommendations.push('Review long-lived resources');
    }

    recommendations.push(...leakResult.recommendations);

    return {
      status,
      totalResources: stats.totalResources,
      oldestResourceAge: stats.oldestResource,
      memoryUsage: stats.memoryUsage,
      leaksDetected: stats.leaksDetected,
      recommendations,
    };
  }

  /**
   * Destroy the resource manager
   */
  public destroy(): void {
    this.cleanup();
  }
}
