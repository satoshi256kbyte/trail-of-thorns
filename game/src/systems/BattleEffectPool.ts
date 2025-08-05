/**
 * BattleEffectPool - Object pool management for battle animations and effects
 * Provides efficient reuse of visual effects to improve performance and reduce memory allocation
 */

import * as Phaser from 'phaser';
import { DamageType } from '../types/battle';

/**
 * Configuration for effect pooling
 */
export interface EffectPoolConfig {
    /** Maximum number of damage text objects to pool */
    maxDamageTexts: number;
    /** Maximum number of particle effects to pool */
    maxParticleEffects: number;
    /** Maximum number of animation sprites to pool */
    maxAnimationSprites: number;
    /** Maximum number of HP bars to pool */
    maxHPBars: number;
    /** Enable automatic cleanup of unused effects */
    enableAutoCleanup: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
}

/**
 * Pooled damage text object
 */
interface PooledDamageText {
    text: Phaser.GameObjects.Text;
    inUse: boolean;
    lastUsed: number;
    tween?: Phaser.Tweens.Tween;
}

/**
 * Pooled particle effect object
 */
interface PooledParticleEffect {
    particles: Phaser.GameObjects.Particles.ParticleEmitter[];
    container: Phaser.GameObjects.Container;
    inUse: boolean;
    lastUsed: number;
    tween?: Phaser.Tweens.Tween;
}

/**
 * Pooled animation sprite object
 */
interface PooledAnimationSprite {
    sprite: Phaser.GameObjects.Sprite;
    inUse: boolean;
    lastUsed: number;
    tween?: Phaser.Tweens.Tween;
}

/**
 * Pooled HP bar object
 */
interface PooledHPBar {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Rectangle;
    foreground: Phaser.GameObjects.Rectangle;
    border: Phaser.GameObjects.Rectangle;
    inUse: boolean;
    lastUsed: number;
    tween?: Phaser.Tweens.Tween;
}

/**
 * Pool statistics for monitoring
 */
export interface PoolStatistics {
    damageTexts: {
        total: number;
        inUse: number;
        available: number;
        utilization: number;
    };
    particleEffects: {
        total: number;
        inUse: number;
        available: number;
        utilization: number;
    };
    animationSprites: {
        total: number;
        inUse: number;
        available: number;
        utilization: number;
    };
    hpBars: {
        total: number;
        inUse: number;
        available: number;
        utilization: number;
    };
    memoryUsage: number;
    totalObjectsCreated: number;
    totalObjectsReused: number;
}

/**
 * Main effect pool manager class
 */
export class BattleEffectPool {
    private scene: Phaser.Scene;
    private config: EffectPoolConfig;

    // Object pools
    private damageTextPool: PooledDamageText[] = [];
    private particleEffectPool: PooledParticleEffect[] = [];
    private animationSpritePool: PooledAnimationSprite[] = [];
    private hpBarPool: PooledHPBar[] = [];

    // Statistics
    private totalObjectsCreated: number = 0;
    private totalObjectsReused: number = 0;

    // Cleanup timer
    private cleanupTimer: Phaser.Time.TimerEvent | null = null;

    // Default configuration
    private static readonly DEFAULT_CONFIG: EffectPoolConfig = {
        maxDamageTexts: 50,
        maxParticleEffects: 20,
        maxAnimationSprites: 30,
        maxHPBars: 20,
        enableAutoCleanup: true,
        cleanupInterval: 30000 // 30 seconds
    };

    constructor(scene: Phaser.Scene, config?: Partial<EffectPoolConfig>) {
        this.scene = scene;
        this.config = { ...BattleEffectPool.DEFAULT_CONFIG, ...config };

        this.initializePools();

        if (this.config.enableAutoCleanup) {
            this.startCleanupTimer();
        }
    }

    /**
     * Initialize object pools with pre-allocated objects
     */
    private initializePools(): void {
        // Pre-allocate some objects for better performance
        const preAllocateCount = Math.min(10, Math.floor(this.config.maxDamageTexts / 5));

        for (let i = 0; i < preAllocateCount; i++) {
            this.createDamageText();
            this.createParticleEffect();
            this.createAnimationSprite();
            this.createHPBar();
        }
    }

    /**
     * Acquire a damage text object from the pool
     */
    public acquireDamageText(
        x: number,
        y: number,
        damage: number,
        type: DamageType
    ): PooledDamageText {
        // Try to find an available object in the pool
        let damageText = this.damageTextPool.find(obj => !obj.inUse);

        if (!damageText) {
            // Create new object if pool is not at capacity
            if (this.damageTextPool.length < this.config.maxDamageTexts) {
                damageText = this.createDamageText();
            } else {
                // Force reuse of oldest object if at capacity
                damageText = this.getOldestDamageText();
                this.resetDamageText(damageText);
            }
        }

        // Configure the damage text
        this.configureDamageText(damageText, x, y, damage, type);

        damageText.inUse = true;
        damageText.lastUsed = Date.now();

        if (damageText === this.damageTextPool.find(obj => !obj.inUse)) {
            this.totalObjectsReused++;
        }

        return damageText;
    }

    /**
     * Release a damage text object back to the pool
     */
    public releaseDamageText(damageText: PooledDamageText): void {
        if (damageText.tween) {
            damageText.tween.destroy();
            damageText.tween = undefined;
        }

        this.resetDamageText(damageText);
        damageText.inUse = false;
    }

    /**
     * Acquire a particle effect from the pool
     */
    public acquireParticleEffect(
        x: number,
        y: number,
        color: number,
        type: DamageType,
        burst: boolean = false
    ): PooledParticleEffect {
        let particleEffect = this.particleEffectPool.find(obj => !obj.inUse);

        if (!particleEffect) {
            if (this.particleEffectPool.length < this.config.maxParticleEffects) {
                particleEffect = this.createParticleEffect();
            } else {
                particleEffect = this.getOldestParticleEffect();
                this.resetParticleEffect(particleEffect);
            }
        }

        this.configureParticleEffect(particleEffect, x, y, color, type, burst);

        particleEffect.inUse = true;
        particleEffect.lastUsed = Date.now();

        if (particleEffect === this.particleEffectPool.find(obj => !obj.inUse)) {
            this.totalObjectsReused++;
        }

        return particleEffect;
    }

    /**
     * Release a particle effect back to the pool
     */
    public releaseParticleEffect(particleEffect: PooledParticleEffect): void {
        if (particleEffect.tween) {
            particleEffect.tween.destroy();
            particleEffect.tween = undefined;
        }

        this.resetParticleEffect(particleEffect);
        particleEffect.inUse = false;
    }

    /**
     * Acquire an animation sprite from the pool
     */
    public acquireAnimationSprite(
        x: number,
        y: number,
        texture: string,
        frame?: string | number
    ): PooledAnimationSprite {
        let animSprite = this.animationSpritePool.find(obj => !obj.inUse);

        if (!animSprite) {
            if (this.animationSpritePool.length < this.config.maxAnimationSprites) {
                animSprite = this.createAnimationSprite();
            } else {
                animSprite = this.getOldestAnimationSprite();
                this.resetAnimationSprite(animSprite);
            }
        }

        this.configureAnimationSprite(animSprite, x, y, texture, frame);

        animSprite.inUse = true;
        animSprite.lastUsed = Date.now();

        if (animSprite === this.animationSpritePool.find(obj => !obj.inUse)) {
            this.totalObjectsReused++;
        }

        return animSprite;
    }

    /**
     * Release an animation sprite back to the pool
     */
    public releaseAnimationSprite(animSprite: PooledAnimationSprite): void {
        if (animSprite.tween) {
            animSprite.tween.destroy();
            animSprite.tween = undefined;
        }

        this.resetAnimationSprite(animSprite);
        animSprite.inUse = false;
    }

    /**
     * Acquire an HP bar from the pool
     */
    public acquireHPBar(
        x: number,
        y: number,
        width: number,
        height: number,
        currentHP: number,
        maxHP: number
    ): PooledHPBar {
        let hpBar = this.hpBarPool.find(obj => !obj.inUse);

        if (!hpBar) {
            if (this.hpBarPool.length < this.config.maxHPBars) {
                hpBar = this.createHPBar();
            } else {
                hpBar = this.getOldestHPBar();
                this.resetHPBar(hpBar);
            }
        }

        this.configureHPBar(hpBar, x, y, width, height, currentHP, maxHP);

        hpBar.inUse = true;
        hpBar.lastUsed = Date.now();

        if (hpBar === this.hpBarPool.find(obj => !obj.inUse)) {
            this.totalObjectsReused++;
        }

        return hpBar;
    }

    /**
     * Release an HP bar back to the pool
     */
    public releaseHPBar(hpBar: PooledHPBar): void {
        if (hpBar.tween) {
            hpBar.tween.destroy();
            hpBar.tween = undefined;
        }

        this.resetHPBar(hpBar);
        hpBar.inUse = false;
    }

    /**
     * Create a new damage text object
     */
    private createDamageText(): PooledDamageText {
        const text = this.scene.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontFamily: 'Arial Black'
        });

        text.setOrigin(0.5, 0.5);
        text.setVisible(false);

        const pooledText: PooledDamageText = {
            text,
            inUse: false,
            lastUsed: 0
        };

        this.damageTextPool.push(pooledText);
        this.totalObjectsCreated++;

        return pooledText;
    }

    /**
     * Create a new particle effect object
     */
    private createParticleEffect(): PooledParticleEffect {
        const container = this.scene.add.container(0, 0);
        container.setVisible(false);

        const pooledEffect: PooledParticleEffect = {
            particles: [],
            container,
            inUse: false,
            lastUsed: 0
        };

        this.particleEffectPool.push(pooledEffect);
        this.totalObjectsCreated++;

        return pooledEffect;
    }

    /**
     * Create a new animation sprite object
     */
    private createAnimationSprite(): PooledAnimationSprite {
        // Create a simple colored rectangle as placeholder
        const sprite = this.scene.add.sprite(0, 0, '');
        sprite.setVisible(false);

        const pooledSprite: PooledAnimationSprite = {
            sprite,
            inUse: false,
            lastUsed: 0
        };

        this.animationSpritePool.push(pooledSprite);
        this.totalObjectsCreated++;

        return pooledSprite;
    }

    /**
     * Create a new HP bar object
     */
    private createHPBar(): PooledHPBar {
        const container = this.scene.add.container(0, 0);

        const background = this.scene.add.rectangle(0, 0, 48, 6, 0x333333);
        const foreground = this.scene.add.rectangle(0, 0, 48, 6, 0x00ff00);
        const border = this.scene.add.rectangle(0, 0, 50, 8);
        border.setStrokeStyle(1, 0xffffff);

        container.add([background, foreground, border]);
        container.setVisible(false);

        const pooledHPBar: PooledHPBar = {
            container,
            background,
            foreground,
            border,
            inUse: false,
            lastUsed: 0
        };

        this.hpBarPool.push(pooledHPBar);
        this.totalObjectsCreated++;

        return pooledHPBar;
    }

    /**
     * Configure damage text object
     */
    private configureDamageText(
        damageText: PooledDamageText,
        x: number,
        y: number,
        damage: number,
        type: DamageType
    ): void {
        let color = '#ff0000';
        let displayText = damage.toString();

        switch (type) {
            case DamageType.PHYSICAL:
                color = '#ff4444';
                break;
            case DamageType.MAGICAL:
                color = '#4444ff';
                break;
            case DamageType.CRITICAL:
                color = '#ffff44';
                displayText = `${damage}!`;
                break;
            case DamageType.HEALING:
                color = '#44ff44';
                displayText = `+${damage}`;
                break;
        }

        damageText.text.setPosition(x, y);
        damageText.text.setText(displayText);
        damageText.text.setColor(color);
        damageText.text.setVisible(true);
        damageText.text.setAlpha(1);
        damageText.text.setScale(1);
    }

    /**
     * Configure particle effect object
     */
    private configureParticleEffect(
        particleEffect: PooledParticleEffect,
        x: number,
        y: number,
        color: number,
        type: DamageType,
        burst: boolean
    ): void {
        particleEffect.container.setPosition(x, y);
        particleEffect.container.setVisible(true);

        // Clear existing particles
        particleEffect.particles.forEach(particle => particle.destroy());
        particleEffect.particles.length = 0;

        // Create new particles using simple circles
        const particleCount = burst ? 20 : 8;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(0, 0, 2, color);
            particleEffect.container.add(particle);
        }
    }

    /**
     * Configure animation sprite object
     */
    private configureAnimationSprite(
        animSprite: PooledAnimationSprite,
        x: number,
        y: number,
        texture: string,
        frame?: string | number
    ): void {
        animSprite.sprite.setPosition(x, y);
        animSprite.sprite.setVisible(true);
        animSprite.sprite.setAlpha(1);
        animSprite.sprite.setScale(1);
        animSprite.sprite.setRotation(0);

        // Set texture if available
        if (texture && this.scene.textures.exists(texture)) {
            animSprite.sprite.setTexture(texture, frame);
        }
    }

    /**
     * Configure HP bar object
     */
    private configureHPBar(
        hpBar: PooledHPBar,
        x: number,
        y: number,
        width: number,
        height: number,
        currentHP: number,
        maxHP: number
    ): void {
        hpBar.container.setPosition(x, y);
        hpBar.container.setVisible(true);
        hpBar.container.setAlpha(1);

        // Update dimensions
        hpBar.background.setSize(width, height);
        hpBar.border.setSize(width + 2, height + 2);

        // Update HP bar fill
        const hpPercentage = Math.max(0, Math.min(1, currentHP / maxHP));
        const fillWidth = width * hpPercentage;

        hpBar.foreground.setSize(fillWidth, height);
        hpBar.foreground.setPosition(-width / 2 + fillWidth / 2, 0);

        // Update color based on HP percentage
        let hpColor = 0x00ff00; // Green
        if (hpPercentage < 0.25) {
            hpColor = 0xff0000; // Red
        } else if (hpPercentage < 0.5) {
            hpColor = 0xffaa00; // Orange
        }

        hpBar.foreground.setFillStyle(hpColor);
    }

    /**
     * Reset damage text to default state
     */
    private resetDamageText(damageText: PooledDamageText): void {
        damageText.text.setVisible(false);
        damageText.text.setAlpha(1);
        damageText.text.setScale(1);
        damageText.text.setPosition(0, 0);
    }

    /**
     * Reset particle effect to default state
     */
    private resetParticleEffect(particleEffect: PooledParticleEffect): void {
        particleEffect.container.setVisible(false);
        particleEffect.container.setPosition(0, 0);
        particleEffect.container.removeAll(true);
        particleEffect.particles.length = 0;
    }

    /**
     * Reset animation sprite to default state
     */
    private resetAnimationSprite(animSprite: PooledAnimationSprite): void {
        animSprite.sprite.setVisible(false);
        animSprite.sprite.setAlpha(1);
        animSprite.sprite.setScale(1);
        animSprite.sprite.setRotation(0);
        animSprite.sprite.setPosition(0, 0);
    }

    /**
     * Reset HP bar to default state
     */
    private resetHPBar(hpBar: PooledHPBar): void {
        hpBar.container.setVisible(false);
        hpBar.container.setAlpha(1);
        hpBar.container.setPosition(0, 0);
    }

    /**
     * Get oldest damage text object for forced reuse
     */
    private getOldestDamageText(): PooledDamageText {
        return this.damageTextPool.reduce((oldest, current) =>
            current.lastUsed < oldest.lastUsed ? current : oldest
        );
    }

    /**
     * Get oldest particle effect object for forced reuse
     */
    private getOldestParticleEffect(): PooledParticleEffect {
        return this.particleEffectPool.reduce((oldest, current) =>
            current.lastUsed < oldest.lastUsed ? current : oldest
        );
    }

    /**
     * Get oldest animation sprite object for forced reuse
     */
    private getOldestAnimationSprite(): PooledAnimationSprite {
        return this.animationSpritePool.reduce((oldest, current) =>
            current.lastUsed < oldest.lastUsed ? current : oldest
        );
    }

    /**
     * Get oldest HP bar object for forced reuse
     */
    private getOldestHPBar(): PooledHPBar {
        return this.hpBarPool.reduce((oldest, current) =>
            current.lastUsed < oldest.lastUsed ? current : oldest
        );
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = this.scene.time.addEvent({
            delay: this.config.cleanupInterval,
            callback: this.cleanup,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Perform cleanup of unused objects
     */
    public cleanup(): void {
        const now = Date.now();
        const maxIdleTime = 60000; // 1 minute

        // Clean up unused objects that have been idle for too long
        this.cleanupPool(this.damageTextPool, maxIdleTime, now, (obj) => obj.text.destroy());
        this.cleanupPool(this.particleEffectPool, maxIdleTime, now, (obj) => obj.container.destroy());
        this.cleanupPool(this.animationSpritePool, maxIdleTime, now, (obj) => obj.sprite.destroy());
        this.cleanupPool(this.hpBarPool, maxIdleTime, now, (obj) => obj.container.destroy());
    }

    /**
     * Clean up a specific pool
     */
    private cleanupPool<T extends { inUse: boolean; lastUsed: number }>(
        pool: T[],
        maxIdleTime: number,
        now: number,
        destroyFn: (obj: T) => void
    ): void {
        for (let i = pool.length - 1; i >= 0; i--) {
            const obj = pool[i];
            if (!obj.inUse && (now - obj.lastUsed) > maxIdleTime) {
                destroyFn(obj);
                pool.splice(i, 1);
            }
        }
    }

    /**
     * Get pool statistics
     */
    public getStatistics(): PoolStatistics {
        const calculatePoolStats = <T extends { inUse: boolean }>(pool: T[]) => {
            const total = pool.length;
            const inUse = pool.filter(obj => obj.inUse).length;
            const available = total - inUse;
            const utilization = total > 0 ? inUse / total : 0;

            return { total, inUse, available, utilization };
        };

        return {
            damageTexts: calculatePoolStats(this.damageTextPool),
            particleEffects: calculatePoolStats(this.particleEffectPool),
            animationSprites: calculatePoolStats(this.animationSpritePool),
            hpBars: calculatePoolStats(this.hpBarPool),
            memoryUsage: this.estimateMemoryUsage(),
            totalObjectsCreated: this.totalObjectsCreated,
            totalObjectsReused: this.totalObjectsReused
        };
    }

    /**
     * Estimate memory usage of the pools
     */
    private estimateMemoryUsage(): number {
        // Rough estimation in bytes
        const damageTextSize = this.damageTextPool.length * 1000; // ~1KB per text object
        const particleEffectSize = this.particleEffectPool.length * 2000; // ~2KB per effect
        const animSpriteSize = this.animationSpritePool.length * 1500; // ~1.5KB per sprite
        const hpBarSize = this.hpBarPool.length * 800; // ~0.8KB per HP bar

        return damageTextSize + particleEffectSize + animSpriteSize + hpBarSize;
    }

    /**
     * Clear all pools and destroy objects
     */
    public clearAll(): void {
        // Destroy all objects in pools
        this.damageTextPool.forEach(obj => obj.text.destroy());
        this.particleEffectPool.forEach(obj => obj.container.destroy());
        this.animationSpritePool.forEach(obj => obj.sprite.destroy());
        this.hpBarPool.forEach(obj => obj.container.destroy());

        // Clear pools
        this.damageTextPool.length = 0;
        this.particleEffectPool.length = 0;
        this.animationSpritePool.length = 0;
        this.hpBarPool.length = 0;

        // Reset statistics
        this.totalObjectsCreated = 0;
        this.totalObjectsReused = 0;
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<EffectPoolConfig>): void {
        this.config = { ...this.config, ...config };

        // Restart cleanup timer if needed
        if (config.enableAutoCleanup !== undefined || config.cleanupInterval !== undefined) {
            if (this.cleanupTimer) {
                this.cleanupTimer.destroy();
                this.cleanupTimer = null;
            }

            if (this.config.enableAutoCleanup) {
                this.startCleanupTimer();
            }
        }
    }

    /**
     * Destroy the effect pool and clean up resources
     */
    public destroy(): void {
        if (this.cleanupTimer) {
            this.cleanupTimer.destroy();
            this.cleanupTimer = null;
        }

        this.clearAll();
    }
}