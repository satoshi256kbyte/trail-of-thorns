/**
 * BattleAnimator - Handles all battle animations and visual effects
 * Provides comprehensive animation system for combat including attack animations,
 * damage effects, HP bar animations, and defeat animations
 */

import * as Phaser from 'phaser';
import { Unit, Position } from '../types/gameplay';
import { Weapon, DamageType, BattleAnimationConfig, BattleError } from '../types/battle';

/**
 * Animation event types for battle system
 */
export enum BattleAnimationEvent {
    ATTACK_START = 'attack_start',
    ATTACK_COMPLETE = 'attack_complete',
    DAMAGE_APPLIED = 'damage_applied',
    HP_CHANGE_COMPLETE = 'hp_change_complete',
    DEFEAT_COMPLETE = 'defeat_complete',
    EFFECTS_CLEARED = 'effects_cleared',
}

/**
 * Animation state for tracking current animations
 */
export interface AnimationState {
    isPlaying: boolean;
    type: 'attack' | 'damage' | 'hp_change' | 'defeat' | 'idle';
    startTime: number;
    duration: number;
    target?: Unit;
    attacker?: Unit;
}

/**
 * Damage effect configuration
 */
export interface DamageEffectConfig {
    color: number;
    fontSize: number;
    duration: number;
    floatDistance: number;
    fadeDelay: number;
}

/**
 * HP bar animation configuration
 */
export interface HPBarConfig {
    width: number;
    height: number;
    backgroundColor: number;
    foregroundColor: number;
    borderColor: number;
    borderWidth: number;
    animationDuration: number;
}

/**
 * BattleAnimator class for managing all battle-related animations
 * Handles attack animations, damage effects, HP changes, and defeat animations
 */
export class BattleAnimator extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: BattleAnimationConfig;
    private animationState: AnimationState;
    private activeEffects: Map<string, Phaser.GameObjects.GameObject[]>;
    private hpBars: Map<string, Phaser.GameObjects.Container>;
    private damageEffectConfig: DamageEffectConfig;
    private hpBarConfig: HPBarConfig;

    // Animation groups for management
    private attackAnimations: Phaser.GameObjects.Group;
    private damageEffects: Phaser.GameObjects.Group;
    private hpBarAnimations: Phaser.GameObjects.Group;
    private defeatEffects: Phaser.GameObjects.Group;

    /**
     * Creates a new BattleAnimator instance
     * @param scene - Phaser scene for animation rendering
     * @param config - Animation configuration settings
     */
    constructor(scene: Phaser.Scene, config?: Partial<BattleAnimationConfig>) {
        super();

        this.scene = scene;
        this.config = {
            attackAnimationDuration: 800,
            damageEffectDuration: 1200,
            hpBarAnimationDuration: 600,
            defeatAnimationDuration: 1500,
            effectDisplayDuration: 2000,
            enableParticleEffects: true,
            enableScreenShake: true,
            animationSpeed: 1.0,
            ...config,
        };

        this.animationState = {
            isPlaying: false,
            type: 'idle',
            startTime: 0,
            duration: 0,
        };

        this.activeEffects = new Map();
        this.hpBars = new Map();

        // Initialize damage effect configuration
        this.damageEffectConfig = {
            color: 0xff0000,
            fontSize: 24,
            duration: this.config.damageEffectDuration,
            floatDistance: 50,
            fadeDelay: 400,
        };

        // Initialize HP bar configuration
        this.hpBarConfig = {
            width: 48,
            height: 6,
            backgroundColor: 0x333333,
            foregroundColor: 0x00ff00,
            borderColor: 0xffffff,
            borderWidth: 1,
            animationDuration: this.config.hpBarAnimationDuration,
        };

        this.initializeAnimationGroups();
    }

    /**
     * Initialize animation groups for organized management
     */
    private initializeAnimationGroups(): void {
        this.attackAnimations = this.scene.add.group();
        this.damageEffects = this.scene.add.group();
        this.hpBarAnimations = this.scene.add.group();
        this.defeatEffects = this.scene.add.group();
    }

    /**
     * Play attack animation for the attacking unit
     * @param attacker - Unit performing the attack
     * @param target - Unit being attacked
     * @param weapon - Weapon being used
     * @returns Promise that resolves when animation completes
     */
    public async playAttackAnimation(attacker: Unit, target: Unit, weapon: Weapon): Promise<void> {
        if (this.animationState.isPlaying) {
            throw new Error(`${BattleError.ANIMATION_FAILED}: Animation already in progress`);
        }

        if (!attacker.sprite || !target.sprite) {
            throw new Error(`${BattleError.ANIMATION_FAILED}: Missing sprite for animation`);
        }

        return new Promise((resolve, reject) => {
            try {
                this.animationState = {
                    isPlaying: true,
                    type: 'attack',
                    startTime: Date.now(),
                    duration: this.config.attackAnimationDuration * this.config.animationSpeed,
                    attacker,
                    target,
                };

                this.emit(BattleAnimationEvent.ATTACK_START, { attacker, target, weapon });

                // Store original position
                const originalX = attacker.sprite.x;
                const originalY = attacker.sprite.y;

                // Calculate movement towards target
                const targetX = target.sprite.x;
                const targetY = target.sprite.y;
                const distance = Phaser.Math.Distance.Between(originalX, originalY, targetX, targetY);
                const moveDistance = Math.min(distance * 0.3, 32); // Move 30% towards target, max 32 pixels

                const angle = Phaser.Math.Angle.Between(originalX, originalY, targetX, targetY);
                const moveX = originalX + Math.cos(angle) * moveDistance;
                const moveY = originalY + Math.sin(angle) * moveDistance;

                // Create attack animation timeline
                const timeline = this.scene.tweens.createTimeline();

                // Phase 1: Move towards target
                timeline.add({
                    targets: attacker.sprite,
                    x: moveX,
                    y: moveY,
                    duration: this.animationState.duration * 0.3,
                    ease: 'Power2.easeOut',
                });

                // Phase 2: Attack flash/shake
                timeline.add({
                    targets: attacker.sprite,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: this.animationState.duration * 0.2,
                    ease: 'Power2.easeInOut',
                    yoyo: true,
                });

                // Phase 3: Return to original position
                timeline.add({
                    targets: attacker.sprite,
                    x: originalX,
                    y: originalY,
                    duration: this.animationState.duration * 0.5,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        this.animationState.isPlaying = false;
                        this.animationState.type = 'idle';
                        this.emit(BattleAnimationEvent.ATTACK_COMPLETE, { attacker, target, weapon });
                        resolve();
                    },
                });

                // Add screen shake if enabled
                if (this.config.enableScreenShake) {
                    this.scene.cameras.main.shake(200, 0.01);
                }

                // Add weapon-specific effects
                this.addWeaponEffect(attacker, target, weapon);

                timeline.play();
            } catch (error) {
                this.animationState.isPlaying = false;
                this.animationState.type = 'idle';
                reject(new Error(`${BattleError.ANIMATION_FAILED}: ${error}`));
            }
        });
    }

    /**
     * Show damage effect with floating damage number
     * @param target - Unit receiving damage
     * @param damage - Amount of damage dealt
     * @param type - Type of damage (affects visual style)
     * @returns Promise that resolves when effect completes
     */
    public async showDamageEffect(target: Unit, damage: number, type: DamageType): Promise<void> {
        if (!target.sprite) {
            throw new Error(`${BattleError.ANIMATION_FAILED}: Missing sprite for damage effect`);
        }

        return new Promise(resolve => {
            // Determine effect color based on damage type
            let effectColor = this.damageEffectConfig.color;
            let displayText = damage.toString();

            switch (type) {
                case DamageType.PHYSICAL:
                    effectColor = 0xff4444;
                    break;
                case DamageType.MAGICAL:
                    effectColor = 0x4444ff;
                    break;
                case DamageType.CRITICAL:
                    effectColor = 0xffff44;
                    displayText = `${damage}!`;
                    break;
                case DamageType.HEALING:
                    effectColor = 0x44ff44;
                    displayText = `+${damage}`;
                    break;
            }

            // Create damage text
            const damageText = this.scene.add.text(target.sprite.x, target.sprite.y - 20, displayText, {
                fontSize: `${this.damageEffectConfig.fontSize}px`,
                color: `#${effectColor.toString(16).padStart(6, '0')}`,
                stroke: '#000000',
                strokeThickness: 2,
                fontFamily: 'Arial Black',
            });

            damageText.setOrigin(0.5, 0.5);
            this.damageEffects.add(damageText);

            // Store effect for cleanup
            const effectId = `damage_${target.id}_${Date.now()}`;
            this.activeEffects.set(effectId, [damageText]);

            // Animate damage text
            this.scene.tweens.add({
                targets: damageText,
                y: damageText.y - this.damageEffectConfig.floatDistance,
                alpha: 0,
                duration: this.damageEffectConfig.duration,
                ease: 'Power2.easeOut',
                delay: this.damageEffectConfig.fadeDelay,
                onComplete: () => {
                    damageText.destroy();
                    this.activeEffects.delete(effectId);
                    this.emit(BattleAnimationEvent.DAMAGE_APPLIED, { target, damage, type });
                    resolve();
                },
            });

            // Add hit flash effect on target
            if (type !== DamageType.HEALING) {
                this.scene.tweens.add({
                    targets: target.sprite,
                    alpha: 0.3,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                });
            }

            // Add particle effect if enabled
            if (this.config.enableParticleEffects) {
                this.createParticleEffect(target.sprite.x, target.sprite.y, effectColor, type);
            }
        });
    }

    /**
     * Animate HP bar change with smooth transition
     * @param unit - Unit whose HP is changing
     * @param oldHP - Previous HP value
     * @param newHP - New HP value
     * @returns Promise that resolves when animation completes
     */
    public async animateHPChange(unit: Unit, oldHP: number, newHP: number): Promise<void> {
        return new Promise(resolve => {
            // Get or create HP bar for unit
            let hpBarContainer = this.hpBars.get(unit.id);

            if (!hpBarContainer && unit.sprite) {
                hpBarContainer = this.createHPBar(unit);
                this.hpBars.set(unit.id, hpBarContainer);
            }

            if (!hpBarContainer) {
                resolve();
                return;
            }

            // Get HP bar components
            const hpBarBg = hpBarContainer.getByName('hpBarBg') as Phaser.GameObjects.Rectangle;
            const hpBarFg = hpBarContainer.getByName('hpBarFg') as Phaser.GameObjects.Rectangle;

            if (!hpBarBg || !hpBarFg) {
                resolve();
                return;
            }

            // Calculate new HP percentage
            const maxHP = unit.stats.maxHP;
            const oldPercentage = Math.max(0, Math.min(1, oldHP / maxHP));
            const newPercentage = Math.max(0, Math.min(1, newHP / maxHP));

            // Update HP bar color based on health percentage
            let hpColor = this.hpBarConfig.foregroundColor;
            if (newPercentage < 0.25) {
                hpColor = 0xff0000; // Red for critical health
            } else if (newPercentage < 0.5) {
                hpColor = 0xffaa00; // Orange for low health
            }

            // Animate HP bar width change
            const targetWidth = this.hpBarConfig.width * newPercentage;

            this.scene.tweens.add({
                targets: hpBarFg,
                width: targetWidth,
                duration: this.hpBarConfig.animationDuration,
                ease: 'Power2.easeInOut',
                onUpdate: () => {
                    hpBarFg.fillColor = hpColor;
                },
                onComplete: () => {
                    this.emit(BattleAnimationEvent.HP_CHANGE_COMPLETE, { unit, oldHP, newHP });
                    resolve();
                },
            });

            // Show HP bar temporarily
            hpBarContainer.setAlpha(1);
            this.scene.time.delayedCall(2000, () => {
                if (hpBarContainer) {
                    this.scene.tweens.add({
                        targets: hpBarContainer,
                        alpha: 0,
                        duration: 500,
                    });
                }
            });
        });
    }

    /**
     * Play defeat animation when unit is defeated
     * @param unit - Unit that was defeated
     * @returns Promise that resolves when animation completes
     */
    public async playDefeatedAnimation(unit: Unit): Promise<void> {
        if (!unit.sprite) {
            throw new Error(`${BattleError.ANIMATION_FAILED}: Missing sprite for defeat animation`);
        }

        return new Promise(resolve => {
            this.animationState = {
                isPlaying: true,
                type: 'defeat',
                startTime: Date.now(),
                duration: this.config.defeatAnimationDuration,
                target: unit,
            };

            // Create defeat effect timeline
            const timeline = this.scene.tweens.createTimeline();

            // Phase 1: Flash red
            timeline.add({
                targets: unit.sprite,
                tint: 0xff0000,
                duration: 200,
                yoyo: true,
                repeat: 2,
            });

            // Phase 2: Fade out and scale down
            timeline.add({
                targets: unit.sprite,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                angle: 360,
                duration: this.config.defeatAnimationDuration * 0.7,
                ease: 'Power2.easeIn',
            });

            // Phase 3: Final cleanup
            timeline.add({
                targets: unit.sprite,
                duration: 100,
                onComplete: () => {
                    // Remove HP bar if exists
                    const hpBar = this.hpBars.get(unit.id);
                    if (hpBar) {
                        hpBar.destroy();
                        this.hpBars.delete(unit.id);
                    }

                    this.animationState.isPlaying = false;
                    this.animationState.type = 'idle';
                    this.emit(BattleAnimationEvent.DEFEAT_COMPLETE, { unit });
                    resolve();
                },
            });

            // Add particle burst effect
            if (this.config.enableParticleEffects) {
                this.createParticleEffect(
                    unit.sprite.x,
                    unit.sprite.y,
                    0xff0000,
                    DamageType.PHYSICAL,
                    true
                );
            }

            timeline.play();
        });
    }

    /**
     * Play item use animation
     * Shows visual feedback when a character uses an item in battle
     * 
     * @param user - Character using the item
     * @param targets - Target characters affected by the item
     * @param item - Item being used
     * @returns Promise that resolves when animation completes
     */
    public async playItemUseAnimation(
        user: Unit,
        targets: Unit[],
        item: any
    ): Promise<void> {
        if (!user.sprite) {
            throw new Error(`${BattleError.ANIMATION_FAILED}: Missing sprite for item use animation`);
        }

        return new Promise(resolve => {
            this.animationState = {
                isPlaying: true,
                type: 'item_use' as any,
                startTime: Date.now(),
                duration: this.config.effectDisplayDuration,
                attacker: user,
            };

            // Create item use effect timeline
            const timeline = this.scene.tweens.createTimeline();

            // Phase 1: User raises item (scale up slightly)
            timeline.add({
                targets: user.sprite,
                scaleX: user.sprite.scaleX * 1.1,
                scaleY: user.sprite.scaleY * 1.1,
                duration: 200,
                ease: 'Back.easeOut',
            });

            // Phase 2: Flash effect on user
            timeline.add({
                targets: user.sprite,
                tint: 0x00ff00, // Green tint for item use
                duration: 150,
                yoyo: true,
            });

            // Phase 3: Return to normal scale
            timeline.add({
                targets: user.sprite,
                scaleX: user.sprite.scaleX,
                scaleY: user.sprite.scaleY,
                duration: 200,
                ease: 'Back.easeIn',
            });

            // Add particle effects for each target
            if (this.config.enableParticleEffects) {
                targets.forEach((target, index) => {
                    if (target.sprite) {
                        // Delay each target's effect slightly for visual appeal
                        this.scene.time.delayedCall(300 + index * 100, () => {
                            this.createParticleEffect(
                                target.sprite!.x,
                                target.sprite!.y,
                                0x00ff00, // Green particles for healing/buff items
                                DamageType.HEALING,
                                false
                            );

                            // Flash target sprite
                            this.scene.tweens.add({
                                targets: target.sprite,
                                tint: 0xffffff,
                                alpha: 1.2,
                                duration: 200,
                                yoyo: true,
                            });
                        });
                    }
                });
            }

            // Complete animation
            timeline.add({
                targets: user.sprite,
                duration: 100,
                onComplete: () => {
                    this.animationState.isPlaying = false;
                    this.animationState.type = 'idle';
                    this.emit('item-use-complete', { user, targets, item });
                    resolve();
                },
            });

            timeline.play();
        });
    }

    /**
     * Clear all active battle effects and reset state
     */
    public clearBattleEffects(): void {
        // Stop any ongoing animations
        this.scene.tweens.killTweensOf(this.attackAnimations.children.entries);
        this.scene.tweens.killTweensOf(this.damageEffects.children.entries);
        this.scene.tweens.killTweensOf(this.hpBarAnimations.children.entries);
        this.scene.tweens.killTweensOf(this.defeatEffects.children.entries);

        // Clear all active effects
        this.activeEffects.forEach(effects => {
            effects.forEach(effect => {
                if (effect && effect.destroy) {
                    effect.destroy();
                }
            });
        });
        this.activeEffects.clear();

        // Clear animation groups
        this.attackAnimations.clear(true, true);
        this.damageEffects.clear(true, true);
        this.hpBarAnimations.clear(true, true);
        this.defeatEffects.clear(true, true);

        // Hide all HP bars
        this.hpBars.forEach(hpBar => {
            hpBar.setAlpha(0);
        });

        // Reset animation state
        this.animationState = {
            isPlaying: false,
            type: 'idle',
            startTime: 0,
            duration: 0,
        };

        this.emit(BattleAnimationEvent.EFFECTS_CLEARED);
    }

    /**
     * Create HP bar for a unit
     * @param unit - Unit to create HP bar for
     * @returns HP bar container
     */
    private createHPBar(unit: Unit): Phaser.GameObjects.Container {
        if (!unit.sprite) {
            throw new Error('Cannot create HP bar without sprite');
        }

        const container = this.scene.add.container(unit.sprite.x, unit.sprite.y - 30);

        // Background
        const background = this.scene.add.rectangle(
            0,
            0,
            this.hpBarConfig.width + this.hpBarConfig.borderWidth * 2,
            this.hpBarConfig.height + this.hpBarConfig.borderWidth * 2,
            this.hpBarConfig.backgroundColor
        );
        background.setName('hpBarBg');

        // Foreground (actual HP)
        const hpPercentage = unit.currentHP / unit.stats.maxHP;
        const foreground = this.scene.add.rectangle(
            -this.hpBarConfig.width / 2 + (this.hpBarConfig.width * hpPercentage) / 2,
            0,
            this.hpBarConfig.width * hpPercentage,
            this.hpBarConfig.height,
            this.hpBarConfig.foregroundColor
        );
        foreground.setName('hpBarFg');

        // Border
        const border = this.scene.add.rectangle(
            0,
            0,
            this.hpBarConfig.width + this.hpBarConfig.borderWidth * 2,
            this.hpBarConfig.height + this.hpBarConfig.borderWidth * 2
        );
        border.setStrokeStyle(this.hpBarConfig.borderWidth, this.hpBarConfig.borderColor);
        border.setName('hpBarBorder');

        container.add([background, foreground, border]);
        container.setAlpha(0); // Start hidden

        this.hpBarAnimations.add(container);

        return container;
    }

    /**
     * Add weapon-specific visual effects
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @param weapon - Weapon being used
     */
    private addWeaponEffect(attacker: Unit, target: Unit, weapon: Weapon): void {
        if (!this.config.enableParticleEffects || !target.sprite) return;

        let effectColor = 0xffffff;

        // Set color based on weapon type
        switch (weapon.type) {
            case 'sword':
                effectColor = 0xc0c0c0; // Silver
                break;
            case 'bow':
                effectColor = 0x8b4513; // Brown
                break;
            case 'staff':
                effectColor = 0x9370db; // Purple
                break;
            case 'spear':
                effectColor = 0xffd700; // Gold
                break;
            case 'axe':
                effectColor = 0xff4500; // Red-orange
                break;
            case 'dagger':
                effectColor = 0x696969; // Dark gray
                break;
        }

        this.createParticleEffect(target.sprite.x, target.sprite.y, effectColor, DamageType.PHYSICAL);
    }

    /**
     * Create particle effect at specified location
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param color - Effect color
     * @param type - Damage type
     * @param burst - Whether to create burst effect
     */
    private createParticleEffect(
        x: number,
        y: number,
        color: number,
        type: DamageType,
        burst: boolean = false
    ): void {
        // Create simple particle effect using graphics
        const particleCount = burst ? 20 : 8;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(x, y, 2, color);

            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = burst ? 100 : 50;
            const distance = burst ? 60 : 30;

            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;

            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: burst ? 800 : 400,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    particle.destroy();
                },
            });
        }
    }

    /**
     * Update HP bar position to follow unit sprite
     * @param unit - Unit to update HP bar for
     */
    public updateHPBarPosition(unit: Unit): void {
        const hpBar = this.hpBars.get(unit.id);
        if (hpBar && unit.sprite) {
            hpBar.setPosition(unit.sprite.x, unit.sprite.y - 30);
        }
    }

    /**
     * Check if any animation is currently playing
     * @returns True if animation is playing
     */
    public isAnimationPlaying(): boolean {
        return this.animationState.isPlaying;
    }

    /**
     * Get current animation state
     * @returns Current animation state
     */
    public getAnimationState(): AnimationState {
        return { ...this.animationState };
    }

    /**
     * Update animation configuration
     * @param config - New configuration values
     */
    public updateConfig(config: Partial<BattleAnimationConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Enable or disable animations
     * @param enabled - Whether animations should be enabled
     */
    public setAnimationsEnabled(enabled: boolean): void {
        this.config.enableParticleEffects = enabled;
        this.config.enableScreenShake = enabled;

        if (!enabled) {
            // Clear any ongoing animations
            this.clearBattleEffects();
        }
    }

    /**
     * Set animation speed multiplier
     * @param speed - Speed multiplier (1.0 = normal speed)
     */
    public setAnimationSpeed(speed: number): void {
        this.config.animationSpeed = Math.max(0.1, Math.min(5.0, speed));
    }

    /**
     * Destroy the animator and clean up resources
     */
    public destroy(): void {
        this.clearBattleEffects();

        // Destroy HP bars
        this.hpBars.forEach(hpBar => {
            hpBar.destroy();
        });
        this.hpBars.clear();

        // Destroy animation groups
        this.attackAnimations.destroy();
        this.damageEffects.destroy();
        this.hpBarAnimations.destroy();
        this.defeatEffects.destroy();

        // Remove all listeners
        this.removeAllListeners();
    }
}
