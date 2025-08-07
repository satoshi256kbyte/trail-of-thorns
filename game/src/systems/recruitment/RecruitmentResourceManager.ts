/**
 * RecruitmentResourceManager - Memory leak prevention and resource management
 *
 * This class manages the lifecycle of recruitment system resources to prevent
 * memory leaks and ensure proper cleanup.
 *
 * Features:
 * - Automatic resource tracking and cleanup
 * - Memory leak detection and prevention
 * - Event listener management
 * - Timer and interval cleanup
 * - Phaser object lifecycle management
 * - Weak reference management for circular references
 */

export interface ResourceTracker {
  /** Tracked event listeners */
  eventListeners: Map<string, { target: any; event: string; handler: Function }[]>;
  /** Tracked timers and intervals */
  timers: Set<NodeJS.Timeout>;
  /** Tracked Phaser objects */
  phaserObjects: Set<Phaser.GameObjects.GameObject>;
  /** Tracked containers */
  containers: Set<Phaser.GameObjects.Container>;
  /** Tracked tweens */
  tweens: Set<Phaser.Tweens.Tween>;
  /** Tracked animations */
  animations: Set<any>;
  /** Tracked weak references */
  weakRefs: Set<WeakRef<any>>;
}

export interface MemoryLeakDetector {
  /** Objects being monitored for leaks */
  monitoredObjects: Map<string, WeakRef<any>>;
  /** Reference counts for objects */
  referenceCounts: Map<string, number>;
  /** Last cleanup timestamp */
  lastCleanup: number;
  /** Cleanup interval */
  cleanupInterval: number;
  /** Leak detection threshold */
  leakThreshold: number;
}

export interface ResourceConfig {
  /** Enable automatic resource tracking */
  enableTracking: boolean;
  /** Enable memory leak detection */
  enableLeakDetection: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Memory leak detection threshold */
  leakThreshold: number;
  /** Enable automatic cleanup on scene shutdown */
  autoCleanupOnShutdown: boolean;
  /** Maximum number of tracked objects */
  maxTrackedObjects: number;
}

export interface ResourceStatistics {
  /** Number of tracked event listeners */
  trackedEventListeners: number;
  /** Number of tracked timers */
  trackedTimers: number;
  /** Number of tracked Phaser objects */
  trackedPhaserObjects: number;
  /** Number of tracked containers */
  trackedContainers: number;
  /** Number of tracked tweens */
  trackedTweens: number;
  /** Number of potential memory leaks detected */
  potentialLeaks: number;
  /** Total memory usage estimate (bytes) */
  estimatedMemoryUsage: number;
  /** Last cleanup timestamp */
  lastCleanupTime: number;
}

/**
 * Resource manager for preventing memory leaks in recruitment system
 */
export class RecruitmentResourceManager {
  private config: ResourceConfig;
  private tracker: ResourceTracker;
  private leakDetector: MemoryLeakDetector;
  private scene?: Phaser.Scene;
  private cleanupTimer?: NodeJS.Timeout;
  private isDestroyed: boolean = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: ResourceConfig = {
    enableTracking: true,
    enableLeakDetection: true,
    cleanupInterval: 30000, // 30 seconds
    leakThreshold: 100, // Objects
    autoCleanupOnShutdown: true,
    maxTrackedObjects: 1000,
  };

  constructor(scene?: Phaser.Scene, config?: Partial<ResourceConfig>) {
    this.scene = scene;
    this.config = { ...RecruitmentResourceManager.DEFAULT_CONFIG, ...config };

    this.tracker = this.initializeTracker();
    this.leakDetector = this.initializeLeakDetector();

    if (this.config.enableTracking) {
      this.startResourceTracking();
    }

    if (this.config.enableLeakDetection) {
      this.startLeakDetection();
    }

    // Setup scene shutdown cleanup
    if (this.scene && this.config.autoCleanupOnShutdown) {
      this.scene.events.once('shutdown', () => this.cleanup());
    }
  }

  /**
   * Initialize resource tracker
   */
  private initializeTracker(): ResourceTracker {
    return {
      eventListeners: new Map(),
      timers: new Set(),
      phaserObjects: new Set(),
      containers: new Set(),
      tweens: new Set(),
      animations: new Set(),
      weakRefs: new Set(),
    };
  }

  /**
   * Initialize memory leak detector
   */
  private initializeLeakDetector(): MemoryLeakDetector {
    return {
      monitoredObjects: new Map(),
      referenceCounts: new Map(),
      lastCleanup: Date.now(),
      cleanupInterval: this.config.cleanupInterval,
      leakThreshold: this.config.leakThreshold,
    };
  }

  /**
   * Start resource tracking
   */
  private startResourceTracking(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Start memory leak detection
   */
  private startLeakDetection(): void {
    // Periodic leak detection is handled in performCleanup()
  }

  /**
   * Track event listener
   */
  trackEventListener(target: any, event: string, handler: Function, context?: string): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    const contextKey = context || 'default';
    const listeners = this.tracker.eventListeners.get(contextKey) || [];
    listeners.push({ target, event, handler });
    this.tracker.eventListeners.set(contextKey, listeners);

    // Monitor for potential leaks
    if (this.config.enableLeakDetection) {
      this.monitorObject(target, `eventTarget_${event}`);
    }
  }

  /**
   * Track timer or interval
   */
  trackTimer(timer: NodeJS.Timeout): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    this.tracker.timers.add(timer);
  }

  /**
   * Track Phaser game object
   */
  trackPhaserObject(obj: Phaser.GameObjects.GameObject): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    this.tracker.phaserObjects.add(obj);

    // Monitor for potential leaks
    if (this.config.enableLeakDetection) {
      this.monitorObject(obj, `phaserObject_${obj.type || 'unknown'}`);
    }
  }

  /**
   * Track Phaser container
   */
  trackContainer(container: Phaser.GameObjects.Container): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    this.tracker.containers.add(container);
    this.trackPhaserObject(container);
  }

  /**
   * Track Phaser tween
   */
  trackTween(tween: Phaser.Tweens.Tween): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    this.tracker.tweens.add(tween);

    // Monitor for potential leaks
    if (this.config.enableLeakDetection) {
      this.monitorObject(tween, 'tween');
    }
  }

  /**
   * Track animation
   */
  trackAnimation(animation: any): void {
    if (!this.config.enableTracking || this.isDestroyed) return;

    this.tracker.animations.add(animation);

    // Monitor for potential leaks
    if (this.config.enableLeakDetection) {
      this.monitorObject(animation, 'animation');
    }
  }

  /**
   * Create and track weak reference
   */
  createWeakRef<T extends object>(obj: T): WeakRef<T> {
    const weakRef = new WeakRef(obj);

    if (this.config.enableTracking && !this.isDestroyed) {
      this.tracker.weakRefs.add(weakRef);
    }

    return weakRef;
  }

  /**
   * Monitor object for memory leaks
   */
  private monitorObject(obj: any, type: string): void {
    if (!obj || this.leakDetector.monitoredObjects.size >= this.config.maxTrackedObjects) {
      return;
    }

    const id = this.generateObjectId(obj, type);
    const weakRef = new WeakRef(obj);

    this.leakDetector.monitoredObjects.set(id, weakRef);
    this.leakDetector.referenceCounts.set(id, (this.leakDetector.referenceCounts.get(id) || 0) + 1);
  }

  /**
   * Generate unique ID for object monitoring
   */
  private generateObjectId(obj: any, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Remove event listener and stop tracking
   */
  removeEventListener(target: any, event: string, handler: Function, context?: string): void {
    // Remove the actual event listener
    if (target && typeof target.removeEventListener === 'function') {
      target.removeEventListener(event, handler);
    } else if (target && typeof target.off === 'function') {
      target.off(event, handler);
    }

    // Remove from tracking
    if (this.config.enableTracking && !this.isDestroyed) {
      const contextKey = context || 'default';
      const listeners = this.tracker.eventListeners.get(contextKey);
      if (listeners) {
        const index = listeners.findIndex(
          l => l.target === target && l.event === event && l.handler === handler
        );
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * Clear timer and stop tracking
   */
  clearTimer(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    clearInterval(timer);

    if (this.config.enableTracking && !this.isDestroyed) {
      this.tracker.timers.delete(timer);
    }
  }

  /**
   * Destroy Phaser object and stop tracking
   */
  destroyPhaserObject(obj: Phaser.GameObjects.GameObject): void {
    if (obj && typeof obj.destroy === 'function') {
      obj.destroy();
    }

    if (this.config.enableTracking && !this.isDestroyed) {
      this.tracker.phaserObjects.delete(obj);
    }
  }

  /**
   * Destroy container and stop tracking
   */
  destroyContainer(container: Phaser.GameObjects.Container): void {
    if (container && typeof container.destroy === 'function') {
      container.destroy();
    }

    if (this.config.enableTracking && !this.isDestroyed) {
      this.tracker.containers.delete(container);
      this.tracker.phaserObjects.delete(container);
    }
  }

  /**
   * Stop tween and stop tracking
   */
  stopTween(tween: Phaser.Tweens.Tween): void {
    if (tween && typeof tween.stop === 'function') {
      tween.stop();
    }

    if (this.config.enableTracking && !this.isDestroyed) {
      this.tracker.tweens.delete(tween);
    }
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    if (this.isDestroyed) return;

    this.cleanupDeadReferences();
    this.detectMemoryLeaks();
    this.cleanupExpiredObjects();

    this.leakDetector.lastCleanup = Date.now();
  }

  /**
   * Clean up dead weak references
   */
  private cleanupDeadReferences(): void {
    // Clean up weak references
    const deadRefs: WeakRef<any>[] = [];
    for (const weakRef of this.tracker.weakRefs) {
      if (weakRef.deref() === undefined) {
        deadRefs.push(weakRef);
      }
    }

    for (const deadRef of deadRefs) {
      this.tracker.weakRefs.delete(deadRef);
    }

    // Clean up monitored objects
    const deadObjects: string[] = [];
    for (const [id, weakRef] of this.leakDetector.monitoredObjects.entries()) {
      if (weakRef.deref() === undefined) {
        deadObjects.push(id);
      }
    }

    for (const id of deadObjects) {
      this.leakDetector.monitoredObjects.delete(id);
      this.leakDetector.referenceCounts.delete(id);
    }
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    const now = Date.now();
    const timeSinceLastCleanup = now - this.leakDetector.lastCleanup;

    // Check for objects that have been around too long
    let potentialLeaks = 0;
    for (const [id, count] of this.leakDetector.referenceCounts.entries()) {
      if (count > this.leakDetector.leakThreshold) {
        potentialLeaks++;
        console.warn(`Potential memory leak detected: ${id} (${count} references)`);
      }
    }

    // Check for excessive object growth
    if (this.leakDetector.monitoredObjects.size > this.config.maxTrackedObjects * 0.8) {
      console.warn(`High number of tracked objects: ${this.leakDetector.monitoredObjects.size}`);
    }

    // Log leak detection results
    if (potentialLeaks > 0) {
      console.warn(`RecruitmentResourceManager: ${potentialLeaks} potential memory leaks detected`);
    }
  }

  /**
   * Clean up expired objects
   */
  private cleanupExpiredObjects(): void {
    // Clean up destroyed Phaser objects
    const deadPhaserObjects: Phaser.GameObjects.GameObject[] = [];
    for (const obj of this.tracker.phaserObjects) {
      if (!obj.active || obj.scene === null) {
        deadPhaserObjects.push(obj);
      }
    }

    for (const obj of deadPhaserObjects) {
      this.tracker.phaserObjects.delete(obj);
    }

    // Clean up destroyed containers
    const deadContainers: Phaser.GameObjects.Container[] = [];
    for (const container of this.tracker.containers) {
      if (!container.active || container.scene === null) {
        deadContainers.push(container);
      }
    }

    for (const container of deadContainers) {
      this.tracker.containers.delete(container);
    }

    // Clean up completed tweens
    const deadTweens: Phaser.Tweens.Tween[] = [];
    for (const tween of this.tracker.tweens) {
      if (!tween.isPlaying()) {
        deadTweens.push(tween);
      }
    }

    for (const tween of deadTweens) {
      this.tracker.tweens.delete(tween);
    }
  }

  /**
   * Get resource statistics
   */
  getStatistics(): ResourceStatistics {
    return {
      trackedEventListeners: Array.from(this.tracker.eventListeners.values()).reduce(
        (total, listeners) => total + listeners.length,
        0
      ),
      trackedTimers: this.tracker.timers.size,
      trackedPhaserObjects: this.tracker.phaserObjects.size,
      trackedContainers: this.tracker.containers.size,
      trackedTweens: this.tracker.tweens.size,
      potentialLeaks: Array.from(this.leakDetector.referenceCounts.values()).filter(
        count => count > this.leakDetector.leakThreshold
      ).length,
      estimatedMemoryUsage: this.calculateEstimatedMemoryUsage(),
      lastCleanupTime: this.leakDetector.lastCleanup,
    };
  }

  /**
   * Calculate estimated memory usage
   */
  private calculateEstimatedMemoryUsage(): number {
    let totalSize = 0;

    // Event listeners (estimated 100 bytes each)
    const listenerCount = Array.from(this.tracker.eventListeners.values()).reduce(
      (total, listeners) => total + listeners.length,
      0
    );
    totalSize += listenerCount * 100;

    // Timers (estimated 50 bytes each)
    totalSize += this.tracker.timers.size * 50;

    // Phaser objects (estimated 500 bytes each)
    totalSize += this.tracker.phaserObjects.size * 500;

    // Containers (estimated 1000 bytes each)
    totalSize += this.tracker.containers.size * 1000;

    // Tweens (estimated 200 bytes each)
    totalSize += this.tracker.tweens.size * 200;

    // Weak references (estimated 50 bytes each)
    totalSize += this.tracker.weakRefs.size * 50;

    // Monitored objects (estimated 100 bytes each)
    totalSize += this.leakDetector.monitoredObjects.size * 100;

    return totalSize;
  }

  /**
   * Force cleanup of all tracked resources
   */
  cleanup(): void {
    if (this.isDestroyed) return;

    console.log('RecruitmentResourceManager: Starting cleanup...');

    // Clean up event listeners
    for (const [context, listeners] of this.tracker.eventListeners.entries()) {
      for (const { target, event, handler } of listeners) {
        this.removeEventListener(target, event, handler, context);
      }
    }
    this.tracker.eventListeners.clear();

    // Clean up timers
    for (const timer of this.tracker.timers) {
      this.clearTimer(timer);
    }
    this.tracker.timers.clear();

    // Clean up Phaser objects
    for (const obj of this.tracker.phaserObjects) {
      this.destroyPhaserObject(obj);
    }
    this.tracker.phaserObjects.clear();

    // Clean up containers
    for (const container of this.tracker.containers) {
      this.destroyContainer(container);
    }
    this.tracker.containers.clear();

    // Clean up tweens
    for (const tween of this.tracker.tweens) {
      this.stopTween(tween);
    }
    this.tracker.tweens.clear();

    // Clean up animations
    for (const animation of this.tracker.animations) {
      if (animation && typeof animation.stop === 'function') {
        animation.stop();
      }
    }
    this.tracker.animations.clear();

    // Clear weak references
    this.tracker.weakRefs.clear();

    // Clear leak detector
    this.leakDetector.monitoredObjects.clear();
    this.leakDetector.referenceCounts.clear();

    console.log('RecruitmentResourceManager: Cleanup completed');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ResourceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart tracking if configuration changed
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.config.enableTracking) {
      this.startResourceTracking();
    }
  }

  /**
   * Check for memory leaks manually
   */
  checkForLeaks(): { hasLeaks: boolean; leakCount: number; details: string[] } {
    const details: string[] = [];
    let leakCount = 0;

    // Check reference counts
    for (const [id, count] of this.leakDetector.referenceCounts.entries()) {
      if (count > this.leakDetector.leakThreshold) {
        details.push(`${id}: ${count} references`);
        leakCount++;
      }
    }

    // Check for excessive tracked objects
    const stats = this.getStatistics();
    if (stats.trackedEventListeners > 100) {
      details.push(`High event listener count: ${stats.trackedEventListeners}`);
    }

    if (stats.trackedPhaserObjects > 200) {
      details.push(`High Phaser object count: ${stats.trackedPhaserObjects}`);
    }

    if (stats.trackedTweens > 50) {
      details.push(`High tween count: ${stats.trackedTweens}`);
    }

    return {
      hasLeaks: leakCount > 0 || details.length > 0,
      leakCount,
      details,
    };
  }

  /**
   * Destroy resource manager and cleanup all resources
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Perform final cleanup
    this.cleanup();

    console.log('RecruitmentResourceManager: Destroyed');
  }
}

/**
 * Utility functions for resource management
 */
export class ResourceUtils {
  /**
   * Create a safe event listener that automatically tracks cleanup
   */
  static createSafeEventListener(
    resourceManager: RecruitmentResourceManager,
    target: any,
    event: string,
    handler: Function,
    context?: string
  ): () => void {
    resourceManager.trackEventListener(target, event, handler, context);

    // Add the event listener
    if (target && typeof target.addEventListener === 'function') {
      target.addEventListener(event, handler);
    } else if (target && typeof target.on === 'function') {
      target.on(event, handler);
    }

    // Return cleanup function
    return () => {
      resourceManager.removeEventListener(target, event, handler, context);
    };
  }

  /**
   * Create a safe timer that automatically tracks cleanup
   */
  static createSafeTimer(
    resourceManager: RecruitmentResourceManager,
    callback: Function,
    delay: number,
    isInterval: boolean = false
  ): NodeJS.Timeout {
    const timer = isInterval
      ? setInterval(callback as any, delay)
      : setTimeout(callback as any, delay);

    resourceManager.trackTimer(timer);
    return timer;
  }

  /**
   * Create a safe Phaser object that automatically tracks cleanup
   */
  static createSafePhaserObject<T extends Phaser.GameObjects.GameObject>(
    resourceManager: RecruitmentResourceManager,
    obj: T
  ): T {
    resourceManager.trackPhaserObject(obj);
    return obj;
  }

  /**
   * Create a safe tween that automatically tracks cleanup
   */
  static createSafeTween(
    resourceManager: RecruitmentResourceManager,
    scene: Phaser.Scene,
    config: Phaser.Types.Tweens.TweenBuilderConfig
  ): Phaser.Tweens.Tween {
    const tween = scene.tweens.add(config);
    resourceManager.trackTween(tween);
    return tween;
  }
}
