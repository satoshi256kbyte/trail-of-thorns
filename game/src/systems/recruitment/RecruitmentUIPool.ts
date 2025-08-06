/**
 * RecruitmentUIPool - Object pool management for recruitment UI elements
 * 
 * This class manages object pools for UI elements to reduce garbage collection
 * and improve performance during recruitment system operations.
 * 
 * Features:
 * - Pooled UI containers and graphics objects
 * - Automatic pool size management
 * - Memory usage monitoring
 * - Efficient allocation and deallocation
 * - Pool warming and cleanup strategies
 */

export interface UIElementPool<T> {
    /** Available objects in the pool */
    available: T[];
    /** Objects currently in use */
    inUse: Set<T>;
    /** Maximum pool size */
    maxSize: number;
    /** Factory function to create new objects */
    factory: () => T;
    /** Reset function to prepare object for reuse */
    reset: (obj: T) => void;
    /** Destroy function to clean up object */
    destroy: (obj: T) => void;
}

export interface PoolStatistics {
    /** Total objects created */
    totalCreated: number;
    /** Objects reused from pool */
    totalReused: number;
    /** Current pool size */
    currentPoolSize: number;
    /** Objects currently in use */
    objectsInUse: number;
    /** Pool hit ratio (0-1) */
    hitRatio: number;
    /** Memory usage in bytes (estimated) */
    memoryUsage: number;
}

export interface PoolConfig {
    /** Initial pool size */
    initialSize: number;
    /** Maximum pool size */
    maxSize: number;
    /** Enable automatic pool warming */
    enableWarming: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
    /** Memory budget in bytes */
    memoryBudget: number;
}

/**
 * Object pool manager for recruitment UI elements
 */
export class RecruitmentUIPool {
    private scene: Phaser.Scene;
    private config: PoolConfig;

    // UI element pools
    private conditionPanelPool: UIElementPool<Phaser.GameObjects.Container>;
    private progressBarPool: UIElementPool<Phaser.GameObjects.Graphics>;
    private textPool: UIElementPool<Phaser.GameObjects.Text>;
    private indicatorPool: UIElementPool<Phaser.GameObjects.Container>;
    private notificationPool: UIElementPool<Phaser.GameObjects.Container>;

    // Pool statistics
    private statistics: Map<string, PoolStatistics>;
    private cleanupTimer?: NodeJS.Timeout;

    // Default configuration
    private static readonly DEFAULT_CONFIG: PoolConfig = {
        initialSize: 5,
        maxSize: 20,
        enableWarming: true,
        cleanupInterval: 30000, // 30 seconds
        memoryBudget: 512 * 1024 // 512KB
    };

    constructor(scene: Phaser.Scene, config?: Partial<PoolConfig>) {
        this.scene = scene;
        this.config = { ...RecruitmentUIPool.DEFAULT_CONFIG, ...config };
        this.statistics = new Map();

        this.initializePools();
        this.startCleanupTimer();

        if (this.config.enableWarming) {
            this.warmPools();
        }
    }

    /**
     * Initialize all UI element pools
     */
    private initializePools(): void {
        // Condition panel pool
        this.conditionPanelPool = this.createPool(
            'conditionPanel',
            () => this.createConditionPanel(),
            (panel) => this.resetConditionPanel(panel),
            (panel) => panel.destroy(),
            this.config.maxSize
        );

        // Progress bar pool
        this.progressBarPool = this.createPool(
            'progressBar',
            () => this.createProgressBar(),
            (bar) => this.resetProgressBar(bar),
            (bar) => bar.destroy(),
            this.config.maxSize
        );

        // Text pool
        this.textPool = this.createPool(
            'text',
            () => this.createText(),
            (text) => this.resetText(text),
            (text) => text.destroy(),
            this.config.maxSize * 2 // More text objects needed
        );

        // Indicator pool
        this.indicatorPool = this.createPool(
            'indicator',
            () => this.createIndicator(),
            (indicator) => this.resetIndicator(indicator),
            (indicator) => indicator.destroy(),
            this.config.maxSize
        );

        // Notification pool
        this.notificationPool = this.createPool(
            'notification',
            () => this.createNotification(),
            (notification) => this.resetNotification(notification),
            (notification) => notification.destroy(),
            this.config.maxSize
        );
    }

    /**
     * Create a generic object pool
     */
    private createPool<T>(
        name: string,
        factory: () => T,
        reset: (obj: T) => void,
        destroy: (obj: T) => void,
        maxSize: number
    ): UIElementPool<T> {
        const pool: UIElementPool<T> = {
            available: [],
            inUse: new Set(),
            maxSize: maxSize,
            factory: factory,
            reset: reset,
            destroy: destroy
        };

        // Initialize statistics
        this.statistics.set(name, {
            totalCreated: 0,
            totalReused: 0,
            currentPoolSize: 0,
            objectsInUse: 0,
            hitRatio: 0,
            memoryUsage: 0
        });

        return pool;
    }

    /**
     * Get object from pool or create new one
     */
    private getFromPool<T>(pool: UIElementPool<T>, poolName: string): T {
        const stats = this.statistics.get(poolName)!;

        let obj: T;

        if (pool.available.length > 0) {
            // Reuse from pool
            obj = pool.available.pop()!;
            pool.reset(obj);
            stats.totalReused++;
        } else {
            // Create new object
            obj = pool.factory();
            stats.totalCreated++;
        }

        pool.inUse.add(obj);
        this.updateStatistics(poolName);

        return obj;
    }

    /**
     * Return object to pool
     */
    private returnToPool<T>(pool: UIElementPool<T>, obj: T, poolName: string): void {
        if (!pool.inUse.has(obj)) {
            console.warn(`Object not found in ${poolName} pool inUse set`);
            return;
        }

        pool.inUse.delete(obj);

        if (pool.available.length < pool.maxSize) {
            pool.reset(obj);
            pool.available.push(obj);
        } else {
            // Pool is full, destroy object
            pool.destroy(obj);
        }

        this.updateStatistics(poolName);
    }

    /**
     * Create condition panel container
     */
    private createConditionPanel(): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);
        container.setScrollFactor(0);
        container.setDepth(2000);
        container.setVisible(false);

        // Add background graphics
        const background = this.scene.add.graphics();
        background.fillStyle(0x1a1a2e, 0.9);
        background.fillRoundedRect(0, 0, 350, 200, 10);
        container.add(background);

        return container;
    }

    /**
     * Reset condition panel for reuse
     */
    private resetConditionPanel(panel: Phaser.GameObjects.Container): void {
        panel.setPosition(0, 0);
        panel.setVisible(false);
        panel.setAlpha(1);
        panel.setScale(1);
        panel.removeAll(false); // Keep children for reuse
    }

    /**
     * Create progress bar graphics
     */
    private createProgressBar(): Phaser.GameObjects.Graphics {
        const graphics = this.scene.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(2001);
        return graphics;
    }

    /**
     * Reset progress bar for reuse
     */
    private resetProgressBar(bar: Phaser.GameObjects.Graphics): void {
        bar.clear();
        bar.setPosition(0, 0);
        bar.setVisible(true);
        bar.setAlpha(1);
    }

    /**
     * Create text object
     */
    private createText(): Phaser.GameObjects.Text {
        const text = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        text.setScrollFactor(0);
        text.setDepth(2002);
        return text;
    }

    /**
     * Reset text object for reuse
     */
    private resetText(text: Phaser.GameObjects.Text): void {
        text.setText('');
        text.setPosition(0, 0);
        text.setVisible(true);
        text.setAlpha(1);
        text.setScale(1);
        text.setOrigin(0);
        text.setStyle({
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
    }

    /**
     * Create indicator container
     */
    private createIndicator(): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);
        container.setScrollFactor(0);
        container.setDepth(1500);

        // Add background
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(-25, -15, 50, 30, 8);
        container.add(background);

        // Add icon
        const icon = this.scene.add.graphics();
        icon.fillStyle(0xffd700, 1);
        icon.fillCircle(0, 0, 8);
        container.add(icon);

        return container;
    }

    /**
     * Reset indicator for reuse
     */
    private resetIndicator(indicator: Phaser.GameObjects.Container): void {
        indicator.setPosition(0, 0);
        indicator.setVisible(true);
        indicator.setAlpha(1);
        indicator.setScale(1);

        // Stop any running tweens
        this.scene.tweens.killTweensOf(indicator);
    }

    /**
     * Create notification container
     */
    private createNotification(): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);
        container.setScrollFactor(0);
        container.setDepth(2100);
        container.setVisible(false);

        // Add background
        const background = this.scene.add.graphics();
        background.fillStyle(0x00ff00, 0.9);
        background.fillRoundedRect(-150, -50, 300, 100, 12);
        container.add(background);

        return container;
    }

    /**
     * Reset notification for reuse
     */
    private resetNotification(notification: Phaser.GameObjects.Container): void {
        notification.setPosition(0, 0);
        notification.setVisible(false);
        notification.setAlpha(1);
        notification.setScale(1);
        notification.removeAll(false);

        // Stop any running tweens
        this.scene.tweens.killTweensOf(notification);
    }

    /**
     * Get condition panel from pool
     */
    getConditionPanel(): Phaser.GameObjects.Container {
        return this.getFromPool(this.conditionPanelPool, 'conditionPanel');
    }

    /**
     * Return condition panel to pool
     */
    returnConditionPanel(panel: Phaser.GameObjects.Container): void {
        this.returnToPool(this.conditionPanelPool, panel, 'conditionPanel');
    }

    /**
     * Get progress bar from pool
     */
    getProgressBar(): Phaser.GameObjects.Graphics {
        return this.getFromPool(this.progressBarPool, 'progressBar');
    }

    /**
     * Return progress bar to pool
     */
    returnProgressBar(bar: Phaser.GameObjects.Graphics): void {
        this.returnToPool(this.progressBarPool, bar, 'progressBar');
    }

    /**
     * Get text object from pool
     */
    getText(): Phaser.GameObjects.Text {
        return this.getFromPool(this.textPool, 'text');
    }

    /**
     * Return text object to pool
     */
    returnText(text: Phaser.GameObjects.Text): void {
        this.returnToPool(this.textPool, text, 'text');
    }

    /**
     * Get indicator from pool
     */
    getIndicator(): Phaser.GameObjects.Container {
        return this.getFromPool(this.indicatorPool, 'indicator');
    }

    /**
     * Return indicator to pool
     */
    returnIndicator(indicator: Phaser.GameObjects.Container): void {
        this.returnToPool(this.indicatorPool, indicator, 'indicator');
    }

    /**
     * Get notification from pool
     */
    getNotification(): Phaser.GameObjects.Container {
        return this.getFromPool(this.notificationPool, 'notification');
    }

    /**
     * Return notification to pool
     */
    returnNotification(notification: Phaser.GameObjects.Container): void {
        this.returnToPool(this.notificationPool, notification, 'notification');
    }

    /**
     * Warm up pools by pre-creating objects
     */
    private warmPools(): void {
        const warmupCount = Math.min(this.config.initialSize, this.config.maxSize);

        // Warm condition panel pool
        for (let i = 0; i < warmupCount; i++) {
            const panel = this.conditionPanelPool.factory();
            this.conditionPanelPool.available.push(panel);
        }

        // Warm progress bar pool
        for (let i = 0; i < warmupCount; i++) {
            const bar = this.progressBarPool.factory();
            this.progressBarPool.available.push(bar);
        }

        // Warm text pool (more objects needed)
        for (let i = 0; i < warmupCount * 2; i++) {
            const text = this.textPool.factory();
            this.textPool.available.push(text);
        }

        // Warm indicator pool
        for (let i = 0; i < warmupCount; i++) {
            const indicator = this.indicatorPool.factory();
            this.indicatorPool.available.push(indicator);
        }

        // Warm notification pool
        for (let i = 0; i < warmupCount; i++) {
            const notification = this.notificationPool.factory();
            this.notificationPool.available.push(notification);
        }

        // Update statistics
        this.updateAllStatistics();
    }

    /**
     * Update statistics for a specific pool
     */
    private updateStatistics(poolName: string): void {
        const stats = this.statistics.get(poolName);
        if (!stats) return;

        const pool = this.getPoolByName(poolName);
        if (!pool) return;

        stats.currentPoolSize = pool.available.length;
        stats.objectsInUse = pool.inUse.size;

        const totalRequests = stats.totalCreated + stats.totalReused;
        stats.hitRatio = totalRequests > 0 ? stats.totalReused / totalRequests : 0;

        // Estimate memory usage (rough calculation)
        stats.memoryUsage = (stats.currentPoolSize + stats.objectsInUse) * this.getObjectSize(poolName);
    }

    /**
     * Update statistics for all pools
     */
    private updateAllStatistics(): void {
        for (const poolName of this.statistics.keys()) {
            this.updateStatistics(poolName);
        }
    }

    /**
     * Get pool by name
     */
    private getPoolByName(poolName: string): UIElementPool<any> | null {
        switch (poolName) {
            case 'conditionPanel': return this.conditionPanelPool;
            case 'progressBar': return this.progressBarPool;
            case 'text': return this.textPool;
            case 'indicator': return this.indicatorPool;
            case 'notification': return this.notificationPool;
            default: return null;
        }
    }

    /**
     * Estimate object size in bytes
     */
    private getObjectSize(poolName: string): number {
        switch (poolName) {
            case 'conditionPanel': return 1024; // Container with graphics
            case 'progressBar': return 512; // Graphics object
            case 'text': return 256; // Text object
            case 'indicator': return 768; // Container with graphics and icon
            case 'notification': return 1024; // Container with background
            default: return 256;
        }
    }

    /**
     * Clean up unused objects from pools
     */
    private cleanupPools(): void {
        const pools = [
            { pool: this.conditionPanelPool, name: 'conditionPanel' },
            { pool: this.progressBarPool, name: 'progressBar' },
            { pool: this.textPool, name: 'text' },
            { pool: this.indicatorPool, name: 'indicator' },
            { pool: this.notificationPool, name: 'notification' }
        ];

        for (const { pool, name } of pools) {
            // Remove excess objects if pool is over target size
            const targetSize = Math.ceil(this.config.initialSize * 1.5);
            while (pool.available.length > targetSize) {
                const obj = pool.available.pop();
                if (obj) {
                    pool.destroy(obj);
                }
            }

            this.updateStatistics(name);
        }
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupPools();
        }, this.config.cleanupInterval);
    }

    /**
     * Get pool statistics
     */
    getStatistics(): Map<string, PoolStatistics> {
        this.updateAllStatistics();
        return new Map(this.statistics);
    }

    /**
     * Get total memory usage across all pools
     */
    getTotalMemoryUsage(): number {
        this.updateAllStatistics();
        let total = 0;
        for (const stats of this.statistics.values()) {
            total += stats.memoryUsage;
        }
        return total;
    }

    /**
     * Get pool efficiency metrics
     */
    getEfficiencyMetrics(): {
        averageHitRatio: number;
        totalObjectsCreated: number;
        totalObjectsReused: number;
        memoryEfficiency: number;
    } {
        this.updateAllStatistics();

        let totalHitRatio = 0;
        let totalCreated = 0;
        let totalReused = 0;
        let poolCount = 0;

        for (const stats of this.statistics.values()) {
            totalHitRatio += stats.hitRatio;
            totalCreated += stats.totalCreated;
            totalReused += stats.totalReused;
            poolCount++;
        }

        const averageHitRatio = poolCount > 0 ? totalHitRatio / poolCount : 0;
        const totalMemory = this.getTotalMemoryUsage();
        const memoryEfficiency = this.config.memoryBudget > 0
            ? Math.max(0, 1 - (totalMemory / this.config.memoryBudget))
            : 0;

        return {
            averageHitRatio,
            totalObjectsCreated: totalCreated,
            totalObjectsReused: totalReused,
            memoryEfficiency
        };
    }

    /**
     * Optimize pools based on usage patterns
     */
    optimizePools(): void {
        const metrics = this.getEfficiencyMetrics();

        // If hit ratio is low, increase pool sizes
        if (metrics.averageHitRatio < 0.7) {
            this.config.maxSize = Math.min(this.config.maxSize * 1.2, 50);
        }

        // If memory efficiency is low, reduce pool sizes
        if (metrics.memoryEfficiency < 0.5) {
            this.config.maxSize = Math.max(this.config.maxSize * 0.8, 5);
        }

        // Clean up excess objects
        this.cleanupPools();
    }

    /**
     * Reset all pools
     */
    resetPools(): void {
        const pools = [
            this.conditionPanelPool,
            this.progressBarPool,
            this.textPool,
            this.indicatorPool,
            this.notificationPool
        ];

        for (const pool of pools) {
            // Destroy all objects
            for (const obj of pool.available) {
                pool.destroy(obj);
            }
            for (const obj of pool.inUse) {
                pool.destroy(obj);
            }

            // Clear pools
            pool.available = [];
            pool.inUse.clear();
        }

        // Reset statistics
        for (const stats of this.statistics.values()) {
            stats.totalCreated = 0;
            stats.totalReused = 0;
            stats.currentPoolSize = 0;
            stats.objectsInUse = 0;
            stats.hitRatio = 0;
            stats.memoryUsage = 0;
        }
    }

    /**
     * Destroy pool manager and cleanup all resources
     */
    destroy(): void {
        // Stop cleanup timer
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }

        // Reset all pools (destroys all objects)
        this.resetPools();

        // Clear statistics
        this.statistics.clear();
    }
}