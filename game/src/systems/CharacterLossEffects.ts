/**
 * CharacterLossEffects - Visual effects system for character loss
 * 
 * This class handles all visual effects and animations related to character loss:
 * - Loss animations based on cause type
 * - Danger state visual effects
 * - Fade out effects and loss messages
 * - Particle effects and screen effects
 * 
 * Implements requirements 2.2, 2.3, 4.1, 4.2 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit, Position } from '../types/gameplay';
import {
    LossCause,
    LossCauseType,
    StatusEffectType,
    DangerLevel
} from '../types/characterLoss';
import { memoryUsage } from 'process';
import { memoryUsage } from 'process';
import { memoryUsage } from 'process';
import { memoryUsage } from 'process';

/**
 * Loss animation configuration
 */
export interface LossAnimationConfig {
    /** Enable loss animations */
    enableAnimations: boolean;
    /** Duration of blink effect in milliseconds */
    blinkDuration: number;
    /** Duration of fade out effect in milliseconds */
    fadeOutDuration: number;
    /** Duration of loss message display in milliseconds */
    messageDisplayDuration: number;
    /** Duration of particle effects in milliseconds */
    particleEffectDuration: number;
    /** Whether to shake screen on character loss */
    enableScreenShake: boolean;
    /** Speed multiplier for all animations */
    animationSpeed: number;
    /** Enable particle effects */
    enableParticleEffects: boolean;
    /** Enable sound effects */
    enableSoundEffects: boolean;
}

/**
 * Danger effect configuration
 */
export interface DangerEffectConfig {
    /** Enable danger warnings */
    enableWarnings: boolean;
    /** Pulse animation duration for critical danger */
    pulseDuration: number;
    /** Particle count for danger effects */
    particleCount: number;
    /** Effect update interval in milliseconds */
    updateInterval: number;
    /** Maximum effect distance from character */
    maxEffectDistance: number;
}/**

 * Interface for CharacterLossEffects class
 */
export interface ICharacterLossEffects {
    // Main loss animation
    playLossAnimation(unit: Unit, cause: LossCause): Promise<void>;

    // Danger state effects
    showDangerEffect(unit: Unit, dangerLevel: DangerLevel): void;
    hideDangerEffect(unit: Unit): void;

    // Chapter management effects
    playChapterResetEffect(): Promise<void>;

    // Effect management
    clearAllEffects(): void;
    isEffectPlaying(): boolean;
    updateEffects(deltaTime: number): void;

    // Performance optimization
    optimizeFor60FPS(): void;
    getMemoryUsage(): {
        activeAnimations: number;
        dangerEffects: number;
        particleEmitters: number;
        lossMessages: number;
        totalEffectObjects: number;
        estimatedMemoryUsage: number;
    };
}

/**
 * CharacterLossEffects implementation
 * Manages all visual effects for character loss system
 */
export class CharacterLossEffects extends Phaser.Events.EventEmitter implements ICharacterLossEffects {
    private scene: Phaser.Scene;
    private animationConfig: LossAnimationConfig;
    private dangerConfig: DangerEffectConfig;

    // Effect pools and containers
    private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;
    private dangerEffects: Map<string, Phaser.GameObjects.Container>;
    private activeAnimations: Map<string, Phaser.Tweens.Tween[]>;
    private lossMessages: Map<string, Phaser.GameObjects.Container>;

    // Effect groups for management
    private effectsGroup: Phaser.GameObjects.Group;
    private particlesGroup: Phaser.GameObjects.Group;
    private messagesGroup: Phaser.GameObjects.Group;

    // Performance tracking
    private lastEffectUpdate: number = 0;

    /**
     * Default configuration values
     */
    private static readonly DEFAULT_ANIMATION_CONFIG: LossAnimationConfig = {
        enableAnimations: true,
        blinkDuration: 800,
        fadeOutDuration: 1200,
        messageDisplayDuration: 2500,
        particleEffectDuration: 1500,
        enableScreenShake: true,
        animationSpeed: 1.0,
        enableParticleEffects: true,
        enableSoundEffects: true
    };

    private static readonly DEFAULT_DANGER_CONFIG: DangerEffectConfig = {
        enableWarnings: true,
        pulseDuration: 1000,
        particleCount: 8,
        updateInterval: 100,
        maxEffectDistance: 32
    };
    /**
        * Creates a new CharacterLossEffects instance
        */
    constructor(scene: Phaser.Scene, animationConfig?: Partial<LossAnimationConfig>, dangerConfig?: Partial<DangerEffectConfig>) {
        super();

        this.scene = scene;
        this.animationConfig = { ...CharacterLossEffects.DEFAULT_ANIMATION_CONFIG, ...animationConfig };
        this.dangerConfig = { ...CharacterLossEffects.DEFAULT_DANGER_CONFIG, ...dangerConfig };

        // Initialize effect containers
        this.particleEmitters = new Map();
        this.dangerEffects = new Map();
        this.activeAnimations = new Map();
        this.lossMessages = new Map();

        this.initializeEffectGroups();
    }

    /**
     * Initialize effect groups for organized management
     */
    private initializeEffectGroups(): void {
        this.effectsGroup = this.scene.add.group();
        this.particlesGroup = this.scene.add.group();
        this.messagesGroup = this.scene.add.group();
    }

    /**
     * Play complete loss animation sequence
     */
    public async playLossAnimation(unit: Unit, cause: LossCause): Promise<void> {
        if (!this.animationConfig.enableAnimations || !unit.sprite) {
            return Promise.resolve();
        }

        const frameTimeStart = performance.now();

        try {
            this.emit('loss-animation-start', { unit, cause });

            // 1. Character blink effect
            await this.playBlinkEffect(unit);

            // 2. Cause-specific effects
            await this.playCauseSpecificEffect(unit, cause);

            // 3. Fade out effect
            await this.playFadeOutEffect(unit);

            this.emit('loss-animation-complete', { unit, cause });

            // Performance monitoring
            const frameTimeEnd = performance.now();
            const totalAnimationTime = frameTimeEnd - frameTimeStart;
            const targetFrameTime = 16.67; // 60fps

            if (totalAnimationTime > targetFrameTime * 10) {
                console.warn(`[CharacterLossEffects] Animation took ${totalAnimationTime.toFixed(2)}ms, may impact 60fps target`);
                this.emit('animation-performance-warning', {
                    animationTime: totalAnimationTime,
                    targetTime: targetFrameTime * 10,
                    unit: unit.id,
                    cause: cause.type
                });
            }

        } catch (error) {
            console.error('[CharacterLossEffects] Error during loss animation:', error);
            this.emit('loss-animation-error', { unit, cause, error });
        }
    }    /
        **
     * Play character blink effect
    */
    private async playBlinkEffect(unit: Unit): Promise < void> {
    if(!unit.sprite) return Promise.resolve();

    return new Promise((resolve) => {
        const blinkTween = this.scene.tweens.add({
            targets: unit.sprite,
            alpha: 0.3,
            duration: this.animationConfig.blinkDuration / 6,
            yoyo: true,
            repeat: 5,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                this.removeAnimation(unit.id, blinkTween);
                resolve();
            }
        });

        this.addAnimation(unit.id, blinkTween);
    });
}

    /**
     * Play cause-specific effect based on loss cause
     */
    private async playCauseSpecificEffect(unit: Unit, cause: LossCause): Promise < void> {
    switch(cause.type) {
            case LossCauseType.BATTLE_DEFEAT:
    return this.playBattleDefeatEffect(unit, cause);
            case LossCauseType.CRITICAL_DAMAGE:
    return this.playCriticalDamageEffect(unit, cause);
            default:
    return this.playGenericLossEffect(unit, cause);
}
    }

    /**
     * Play battle defeat effect
     */
    private async playBattleDefeatEffect(unit: Unit, cause: LossCause): Promise < void> {
    if(!unit.sprite) return Promise.resolve();

    return new Promise((resolve) => {
        // Red flash effect
        const flashTween = this.scene.tweens.add({
            targets: unit.sprite,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.removeAnimation(unit.id, flashTween);
            }
        });

        this.addAnimation(unit.id, flashTween);

        // Screen shake for battle defeat
        if (this.animationConfig.enableScreenShake) {
            this.scene.cameras.main.shake(300, 0.02);
        }

        this.scene.time.delayedCall(600, () => resolve());
    });
}    /**

     * Play critical damage effect
     */
    private async playCriticalDamageEffect(unit: Unit, cause: LossCause): Promise < void> {
    if(!unit.sprite) return Promise.resolve();

    return new Promise((resolve) => {
        const criticalTween = this.scene.tweens.add({
            targets: unit.sprite,
            tint: 0xffff00,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 150,
            yoyo: true,
            repeat: 3,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                this.removeAnimation(unit.id, criticalTween);
            }
        });

        this.addAnimation(unit.id, criticalTween);

        if (this.animationConfig.enableScreenShake) {
            this.scene.cameras.main.shake(400, 0.03);
        }

        this.scene.time.delayedCall(450, () => resolve());
    });
}

    /**
     * Play generic loss effect
     */
    private async playGenericLossEffect(unit: Unit, cause: LossCause): Promise < void> {
    if(!unit.sprite) return Promise.resolve();

    return new Promise((resolve) => {
        const genericTween = this.scene.tweens.add({
            targets: unit.sprite,
            alpha: 0.5,
            duration: 400,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                this.removeAnimation(unit.id, genericTween);
            }
        });

        this.addAnimation(unit.id, genericTween);
        this.scene.time.delayedCall(800, () => resolve());
    });
}

    /**
     * Play fade out effect
     */
    private async playFadeOutEffect(unit: Unit): Promise < void> {
    if(!unit.sprite) return Promise.resolve();

    return new Promise((resolve) => {
        const fadeOutTween = this.scene.tweens.add({
            targets: unit.sprite,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            angle: unit.sprite.angle + 15,
            duration: this.animationConfig.fadeOutDuration,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.removeAnimation(unit.id, fadeOutTween);
                resolve();
            }
        });

        this.addAnimation(unit.id, fadeOutTween);
    });
}
/**
     * Show danger effect for a unit
     */
    public showDangerEffect(unit: Unit, dangerLevel: DangerLevel): void {
    if(!this.dangerConfig.enableWarnings || !unit.sprite || dangerLevel === DangerLevel.NONE) {
    return;
}

this.hideDangerEffect(unit);

const dangerContainer = this.createDangerEffectContainer(unit, dangerLevel);
this.dangerEffects.set(unit.id, dangerContainer);
this.effectsGroup.add(dangerContainer);

this.emit('danger-effect-shown', { unit, dangerLevel });
    }

    /**
     * Hide danger effect for a unit
     */
    public hideDangerEffect(unit: Unit): void {
    const existingEffect = this.dangerEffects.get(unit.id);
    if(existingEffect) {
        existingEffect.destroy();
        this.dangerEffects.delete(unit.id);
        this.emit('danger-effect-hidden', { unit });
    }
}

    /**
     * Play chapter reset effect
     */
    public async playChapterResetEffect(): Promise < void> {
    if(!this.animationConfig.enableAnimations) {
    return Promise.resolve();
}

return new Promise((resolve) => {
    const flashOverlay = this.scene.add.rectangle(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY,
        this.scene.cameras.main.width,
        this.scene.cameras.main.height,
        0xffffff,
        0
    );

    flashOverlay.setScrollFactor(0);
    flashOverlay.setDepth(1000);

    this.scene.tweens.add({
        targets: flashOverlay,
        alpha: 0.8,
        duration: 200,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
            flashOverlay.destroy();
            resolve();
        }
    });

    this.emit('chapter-reset-effect-played');
});
    }    /
    **
     * Clear all active effects
    */
    public clearAllEffects(): void {
    const destroyStart = performance.now();

    // Stop all active animations
    this.activeAnimations.forEach((tweens, unitId) => {
        tweens.forEach(tween => {
            if (tween && tween.isPlaying()) {
                tween.stop();
            }
        });
    });
    this.activeAnimations.clear();

    // Clear danger effects
    this.dangerEffects.forEach((effect) => {
        effect.destroy();
    });
    this.dangerEffects.clear();

    // Clear particle emitters
    this.particleEmitters.forEach((emitter) => {
        if (emitter.active) {
            emitter.stop();
        }
        emitter.destroy();
    });
    this.particleEmitters.clear();

    // Clear loss messages
    this.lossMessages.forEach((message) => {
        message.destroy();
    });
    this.lossMessages.clear();

    // Clear effect groups
    this.effectsGroup.clear(true, true);
    this.particlesGroup.clear(true, true);
    this.messagesGroup.clear(true, true);

    const destroyEnd = performance.now();
    const destroyTime = destroyEnd - destroyStart;

    if(destroyTime > 5) {
    console.warn(`[CharacterLossEffects] Effect cleanup took ${destroyTime.toFixed(2)}ms`);
}

this.emit('all-effects-cleared', { cleanupTime: destroyTime });
    }

    /**
     * Check if any effect is currently playing
     */
    public isEffectPlaying(): boolean {
    return this.activeAnimations.size > 0 || this.dangerEffects.size > 0;
}

    /**
     * Update effects (called from game loop)
     */
    public updateEffects(deltaTime: number): void {
    const now = Date.now();
    const updateInterval = 50; // 50ms = 20fps for effect updates

    if(now - this.lastEffectUpdate < updateInterval) {
    return;
}
this.lastEffectUpdate = now;

// Update danger effect positions
this.dangerEffects.forEach((effect, unitId) => {
    const unit = this.findUnitById(unitId);
    if (unit && unit.sprite) {
        effect.setPosition(unit.sprite.x, unit.sprite.y);
    } else {
        effect.destroy();
        this.dangerEffects.delete(unitId);
    }
});
    }    /**
  
   * Optimize effects for 60fps performance
     */
    public optimizeFor60FPS(): void {
    const memoryUsage = this.getMemoryUsage();

    if(memoryUsage.totalEffectObjects > 20) {
    console.log('[CharacterLossEffects] Too many active effects, optimizing for performance');

    this.animationConfig.animationSpeed = Math.max(0.5, this.animationConfig.animationSpeed * 0.8);

    if (memoryUsage.totalEffectObjects > 30) {
        this.animationConfig.enableParticleEffects = false;
        console.log('[CharacterLossEffects] Disabled particle effects for performance');
    }

    this.cleanupOldestEffects();

    this.emit('performance-optimized', {
        reason: 'too_many_effects',
        effectCount: memoryUsage.totalEffectObjects,
        newAnimationSpeed: this.animationConfig.animationSpeed,
        particleEffectsEnabled: this.animationConfig.enableParticleEffects
    });
}
    }

    /**
     * Get memory usage statistics
     */
    public getMemoryUsage(): {
    activeAnimations: number;
    dangerEffects: number;
    particleEmitters: number;
    lossMessages: number;
    totalEffectObjects: number;
    estimatedMemoryUsage: number;
} {
    const activeAnimations = Array.from(this.activeAnimations.values()).reduce((sum, tweens) => sum + tweens.length, 0);
    const dangerEffects = this.dangerEffects.size;
    const particleEmitters = this.particleEmitters.size;
    const lossMessages = this.lossMessages.size;
    const totalEffectObjects = activeAnimations + dangerEffects + particleEmitters + lossMessages;

    const estimatedMemoryUsage =
        (activeAnimations * 100) +
        (dangerEffects * 200) +
        (particleEmitters * 500) +
        (lossMessages * 150);

    return {
        activeAnimations,
        dangerEffects,
        particleEmitters,
        lossMessages,
        totalEffectObjects,
        estimatedMemoryUsage
    };
}

    /**
     * Clean up oldest effects to free memory
     */
    private cleanupOldestEffects(): void {
    const maxEffects = 15;
    let cleanedCount = 0;

    if(this.dangerEffects.size > maxEffects / 3) {
    const effectsToRemove = Array.from(this.dangerEffects.keys()).slice(0, this.dangerEffects.size - Math.floor(maxEffects / 3));
    effectsToRemove.forEach(unitId => {
        const effect = this.dangerEffects.get(unitId);
        if (effect) {
            effect.destroy();
            this.dangerEffects.delete(unitId);
            cleanedCount++;
        }
    });
}

if (cleanedCount > 0) {
    console.log(`[CharacterLossEffects] Cleaned up ${cleanedCount} oldest effects for performance`);
}
    }    /*
*
     * Create danger effect container
     */
    private createDangerEffectContainer(unit: Unit, dangerLevel: DangerLevel): Phaser.GameObjects.Container {
    const container = this.scene.add.container(unit.sprite?.x || 0, unit.sprite?.y || 0);

    const indicator = this.scene.add.graphics();

    let color = 0xffff00;
    switch (dangerLevel) {
        case DangerLevel.CRITICAL:
            color = 0xff0000;
            break;
        case DangerLevel.HIGH:
            color = 0xff8800;
            break;
        case DangerLevel.MEDIUM:
            color = 0xffff00;
            break;
    }

    indicator.fillStyle(color, 0.8);
    indicator.fillTriangle(0, -15, -8, 5, 8, 5);
    indicator.lineStyle(2, 0xffffff, 1);
    indicator.strokeTriangle(0, -15, -8, 5, 8, 5);

    container.add(indicator);

    if (dangerLevel === DangerLevel.CRITICAL) {
        this.scene.tweens.add({
            targets: container,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: this.dangerConfig.pulseDuration / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    return container;
}

    /**
     * Add animation to tracking
     */
    private addAnimation(unitId: string, tween: Phaser.Tweens.Tween): void {
    if(!this.activeAnimations.has(unitId)) {
    this.activeAnimations.set(unitId, []);
}
this.activeAnimations.get(unitId)!.push(tween);
    }

    /**
     * Remove animation from tracking
     */
    private removeAnimation(unitId: string, tween: Phaser.Tweens.Tween): void {
    const animations = this.activeAnimations.get(unitId);
    if(animations) {
        const index = animations.indexOf(tween);
        if (index !== -1) {
            animations.splice(index, 1);
        }

        if (animations.length === 0) {
            this.activeAnimations.delete(unitId);
        }
    }
}

    /**
     * Find unit by ID (placeholder)
     */
    private findUnitById(unitId: string): Unit | null {
    return null;
}

    /**
     * Destroy effects system and clean up all resources
     */
    public destroy(): void {
    this.clearAllEffects();

    this.effectsGroup.destroy(true);
    this.particlesGroup.destroy(true);
    this.messagesGroup.destroy(true);

    this.particleEmitters.clear();
    this.dangerEffects.clear();
    this.activeAnimations.clear();
    this.lossMessages.clear();

    this.removeAllListeners();

    console.log('[CharacterLossEffects] Effects system destroyed and cleaned up');
}
}