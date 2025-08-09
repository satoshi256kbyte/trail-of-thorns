/**
 * スキルアニメーション・エフェクトシステム
 */

import * as Phaser from 'phaser';
import {
    SkillType,
    BuffType,
    StatusEffectType,
    ActiveSkillEffect,
    Position
} from '../../types/skill';

import { Skill } from './Skill';

export enum AnimationType {
    CAST = 'cast',
    SKILL_EFFECT = 'skill_effect',
    HIT_EFFECT = 'hit_effect',
    CONTINUOUS_EFFECT = 'continuous_effect'
}

export interface EffectConfig {
    name: string;
    duration: number;
    scale: number;
    alpha: number;
    tint: number;
    depth: number;
    loop: boolean;
    soundEffect?: string;
}

export interface ContinuousEffectDisplay {
    effectId: string;
    target: any;
    displayObject: Phaser.GameObjects.GameObject;
    effectType: BuffType | StatusEffectType;
    remainingTime: number;
    updateTimer: Phaser.Time.TimerEvent | null;
}

export interface SkillAnimatorConfig {
    animationSpeed: number;
    effectQuality: 'low' | 'medium' | 'high';
    enableSoundEffects: boolean;
    enableParticleEffects: boolean;
    enableScreenShake: boolean;
    maxConcurrentEffects: number;
    enableDebugDisplay: boolean;
}

export class SkillAnimator extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: SkillAnimatorConfig;
    private activeAnimations: Map<string, Phaser.Tweens.Tween[]> = new Map();
    private continuousEffects: Map<string, ContinuousEffectDisplay> = new Map();
    private effectPool: Map<string, Phaser.GameObjects.GameObject[]> = new Map();
    private soundManager: Map<string, Phaser.Sound.BaseSound> = new Map();

    private static readonly DEFAULT_CONFIG: SkillAnimatorConfig = {
        animationSpeed: 1.0,
        effectQuality: 'medium',
        enableSoundEffects: true,
        enableParticleEffects: true,
        enableScreenShake: true,
        maxConcurrentEffects: 10,
        enableDebugDisplay: false
    };

    constructor(scene: Phaser.Scene, config?: Partial<SkillAnimatorConfig>) {
        super();
        this.scene = scene;
        this.config = { ...SkillAnimator.DEFAULT_CONFIG, ...config };
        this.initializeEffectPools();
    }

    /**
     * エフェクトプールを初期化
     */
    private initializeEffectPools(): void {
        const effectTypes = ['cast', 'attack', 'heal', 'buff', 'debuff', 'status', 'hit'];

        for (const type of effectTypes) {
            this.effectPool.set(type, []);
        }
    }

    /**
     * 詠唱アニメーションを再生
     * @param skill スキル
     * @param caster 使用者
     * @returns アニメーション完了のPromise
     */
    async playCastAnimation(skill: Skill, caster: any): Promise<void> {
        if (!this.config.enableParticleEffects) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const animationId = `cast_${skill.id}_${caster.id}_${Date.now()}`;
            const casterSprite = this.getCasterSprite(caster);

            if (!casterSprite) {
                resolve();
                return;
            }

            const animations: Phaser.Tweens.Tween[] = [];

            // 詠唱エフェクト作成
            const castEffect = this.createCastEffect(casterSprite, skill.skillType);

            // 詠唱アニメーション（キャラクターの光る効果）
            const glowTween = this.scene.tweens.add({
                targets: casterSprite,
                alpha: { from: 1, to: 0.7 },
                scale: { from: 1, to: 1.1 },
                duration: 500 * this.config.animationSpeed,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.cleanupAnimation(animationId);
                    resolve();
                }
            });

            animations.push(glowTween);

            // 詠唱エフェクトのアニメーション
            if (castEffect) {
                const effectTween = this.scene.tweens.add({
                    targets: castEffect,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 0.5, to: 1.5 },
                    duration: 800 * this.config.animationSpeed,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        this.returnEffectToPool('cast', castEffect);
                    }
                });
                animations.push(effectTween);
            }

            // 音響効果
            if (this.config.enableSoundEffects && skill.animation.soundEffect) {
                this.playSound(`cast_${skill.animation.soundEffect}`);
            }

            this.activeAnimations.set(animationId, animations);

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`Cast animation started for skill: ${skill.name}`);
            }
        });
    }

    /**
     * スキル発動アニメーションを再生
     * @param skill スキル
     * @param caster 使用者
     * @param targets 対象リスト
     * @returns アニメーション完了のPromise
     */
    async playSkillAnimation(skill: Skill, caster: any, targets: any[]): Promise<void> {
        if (!this.config.enableParticleEffects) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const animationId = `skill_${skill.id}_${caster.id}_${Date.now()}`;
            const animations: Phaser.Tweens.Tween[] = [];

            // スキル種別に応じたアニメーション
            switch (skill.skillType) {
                case SkillType.ATTACK:
                    this.createAttackAnimation(caster, targets, animations);
                    break;
                case SkillType.HEAL:
                    this.createHealAnimation(caster, targets, animations);
                    break;
                case SkillType.BUFF:
                    this.createBuffAnimation(caster, targets, animations);
                    break;
                case SkillType.DEBUFF:
                    this.createDebuffAnimation(caster, targets, animations);
                    break;
                case SkillType.STATUS:
                    this.createStatusAnimation(caster, targets, animations);
                    break;
                default:
                    this.createGenericSkillAnimation(caster, targets, animations);
                    break;
            }

            // 音響効果
            if (this.config.enableSoundEffects && skill.animation.soundEffect) {
                this.playSound(skill.animation.soundEffect);
            }

            // 画面揺れ効果（攻撃スキルの場合）
            if (this.config.enableScreenShake && skill.skillType === SkillType.ATTACK) {
                this.addScreenShake();
            }

            this.activeAnimations.set(animationId, animations);

            // 全アニメーション完了を待つ
            const duration = skill.animation.duration * this.config.animationSpeed;
            this.scene.time.delayedCall(duration, () => {
                this.cleanupAnimation(animationId);
                resolve();
            });

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`Skill animation started: ${skill.name} -> ${targets.length} targets`);
            }
        });
    }

    /**
     * ヒットエフェクトを再生
     * @param skill スキル
     * @param target 対象
     * @returns アニメーション完了のPromise
     */
    async playHitEffect(skill: Skill, target: any): Promise<void> {
        if (!this.config.enableParticleEffects) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const animationId = `hit_${skill.id}_${target.id}_${Date.now()}`;
            const targetSprite = this.getTargetSprite(target);

            if (!targetSprite) {
                resolve();
                return;
            }

            const animations: Phaser.Tweens.Tween[] = [];

            // ヒットエフェクト作成
            const hitEffect = this.createHitEffect(targetSprite, skill.skillType);

            // ターゲットの点滅効果
            const flashTween = this.scene.tweens.add({
                targets: targetSprite,
                alpha: { from: 1, to: 0.3 },
                duration: 100,
                yoyo: true,
                repeat: 2,
                ease: 'Power2.easeInOut'
            });

            animations.push(flashTween);

            // ダメージの場合は振動効果
            if (skill.skillType === SkillType.ATTACK) {
                const shakeTween = this.scene.tweens.add({
                    targets: targetSprite,
                    x: targetSprite.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    ease: 'Power2.easeInOut'
                });
                animations.push(shakeTween);
            }

            // ヒットエフェクトのアニメーション
            if (hitEffect) {
                const effectTween = this.scene.tweens.add({
                    targets: hitEffect,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 1, to: 1.5 },
                    duration: 300,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        this.returnEffectToPool('hit', hitEffect);
                    }
                });
                animations.push(effectTween);
            }

            this.activeAnimations.set(animationId, animations);

            // アニメーション完了
            this.scene.time.delayedCall(300, () => {
                this.cleanupAnimation(animationId);
                resolve();
            });

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`Hit effect played on target: ${target.id}`);
            }
        });
    }

    /**
     * 継続効果の視覚表現を表示
     * @param effect 継続効果
     * @param target 対象
     */
    showContinuousEffect(effect: ActiveSkillEffect, target: any): void {
        if (!this.config.enableParticleEffects) {
            return;
        }

        const effectId = `continuous_${effect.effectId}_${target.id}`;

        // 既存の継続効果があれば削除
        if (this.continuousEffects.has(effectId)) {
            this.hideContinuousEffect(effectId);
        }

        const targetSprite = this.getTargetSprite(target);
        if (!targetSprite) {
            return;
        }

        // 継続効果の視覚オブジェクト作成
        const effectObject = this.createContinuousEffectObject(targetSprite, effect.effectType);

        if (!effectObject) {
            return;
        }

        // 継続効果の更新タイマー
        const updateTimer = this.scene.time.addEvent({
            delay: 1000, // 1秒ごとに更新
            callback: () => {
                this.updateContinuousEffect(effectId);
            },
            loop: true
        });

        // 継続効果を登録
        const continuousDisplay: ContinuousEffectDisplay = {
            effectId,
            target,
            displayObject: effectObject,
            effectType: effect.effectType,
            remainingTime: effect.remainingDuration,
            updateTimer
        };

        this.continuousEffects.set(effectId, continuousDisplay);

        // デバッグ表示
        if (this.config.enableDebugDisplay) {
            console.log(`Continuous effect started: ${effect.effectType} on ${target.id}`);
        }
    }

    /**
     * 継続効果を非表示
     * @param effectId 効果ID
     */
    hideContinuousEffect(effectId: string): void {
        const effect = this.continuousEffects.get(effectId);
        if (!effect) {
            return;
        }

        // タイマーを停止
        if (effect.updateTimer) {
            effect.updateTimer.destroy();
        }

        // 表示オブジェクトを削除
        if (effect.displayObject) {
            effect.displayObject.destroy();
        }

        this.continuousEffects.delete(effectId);

        // デバッグ表示
        if (this.config.enableDebugDisplay) {
            console.log(`Continuous effect ended: ${effectId}`);
        }
    }

    /**
     * 継続効果を更新
     * @param effectId 効果ID
     */
    private updateContinuousEffect(effectId: string): void {
        const effect = this.continuousEffects.get(effectId);
        if (!effect) {
            return;
        }

        effect.remainingTime--;

        // 効果時間が終了した場合
        if (effect.remainingTime <= 0) {
            this.hideContinuousEffect(effectId);
            return;
        }

        // 視覚効果の更新（点滅の頻度を変更など）
        if (effect.displayObject) {
            const intensity = effect.remainingTime / 10; // 残り時間に応じて強度調整
            effect.displayObject.setAlpha(Math.max(0.3, intensity));
        }
    }

    /**
     * 詠唱エフェクトを作成
     */
    private createCastEffect(casterSprite: Phaser.GameObjects.Sprite, skillType: SkillType): Phaser.GameObjects.GameObject | null {
        const effect = this.getEffectFromPool('cast');
        if (!effect) {
            // 新しいエフェクトを作成
            const circle = this.scene.add.circle(
                casterSprite.x,
                casterSprite.y - 20,
                15,
                this.getSkillTypeColor(skillType),
                0.7
            );
            circle.setDepth(casterSprite.depth + 1);
            return circle;
        }

        // プールからのエフェクトを再利用
        effect.setPosition(casterSprite.x, casterSprite.y - 20);
        effect.setVisible(true);
        effect.setActive(true);
        return effect;
    }

    /**
     * 攻撃アニメーションを作成
     */
    private createAttackAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        const casterSprite = this.getCasterSprite(caster);
        if (!casterSprite) return;

        // 攻撃者の前進アニメーション
        const originalX = casterSprite.x;
        const forwardTween = this.scene.tweens.add({
            targets: casterSprite,
            x: originalX + 20,
            duration: 200,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
                casterSprite.x = originalX;
            }
        });

        animations.push(forwardTween);

        // 各ターゲットにエフェクト
        targets.forEach((target, index) => {
            this.scene.time.delayedCall(100 + index * 50, () => {
                this.playHitEffect({ skillType: SkillType.ATTACK } as Skill, target);
            });
        });
    }

    /**
     * 回復アニメーションを作成
     */
    private createHealAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        targets.forEach((target, index) => {
            const targetSprite = this.getTargetSprite(target);
            if (!targetSprite) return;

            // 回復エフェクト（緑の光）
            const healEffect = this.scene.add.circle(
                targetSprite.x,
                targetSprite.y,
                20,
                0x00ff00,
                0.6
            );

            const effectTween = this.scene.tweens.add({
                targets: healEffect,
                alpha: { from: 0.6, to: 0 },
                scale: { from: 0.5, to: 2 },
                duration: 800,
                delay: index * 100,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    healEffect.destroy();
                }
            });

            animations.push(effectTween);
        });
    }

    /**
     * バフアニメーションを作成
     */
    private createBuffAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        targets.forEach((target, index) => {
            const targetSprite = this.getTargetSprite(target);
            if (!targetSprite) return;

            // バフエフェクト（青い光）
            const buffEffect = this.scene.add.circle(
                targetSprite.x,
                targetSprite.y - 30,
                15,
                0x0080ff,
                0.8
            );

            const effectTween = this.scene.tweens.add({
                targets: buffEffect,
                y: targetSprite.y - 50,
                alpha: { from: 0.8, to: 0 },
                duration: 1000,
                delay: index * 100,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    buffEffect.destroy();
                }
            });

            animations.push(effectTween);
        });
    }

    /**
     * デバフアニメーションを作成
     */
    private createDebuffAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        targets.forEach((target, index) => {
            const targetSprite = this.getTargetSprite(target);
            if (!targetSprite) return;

            // デバフエフェクト（紫の光）
            const debuffEffect = this.scene.add.circle(
                targetSprite.x,
                targetSprite.y + 30,
                15,
                0x8000ff,
                0.8
            );

            const effectTween = this.scene.tweens.add({
                targets: debuffEffect,
                y: targetSprite.y + 10,
                alpha: { from: 0.8, to: 0 },
                duration: 1000,
                delay: index * 100,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    debuffEffect.destroy();
                }
            });

            animations.push(effectTween);
        });
    }

    /**
     * 状態異常アニメーションを作成
     */
    private createStatusAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        targets.forEach((target, index) => {
            const targetSprite = this.getTargetSprite(target);
            if (!targetSprite) return;

            // 状態異常エフェクト（赤い光）
            const statusEffect = this.scene.add.circle(
                targetSprite.x,
                targetSprite.y,
                25,
                0xff0000,
                0.5
            );

            const effectTween = this.scene.tweens.add({
                targets: statusEffect,
                alpha: { from: 0.5, to: 0 },
                scale: { from: 1, to: 1.5 },
                duration: 600,
                delay: index * 100,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    statusEffect.destroy();
                }
            });

            animations.push(effectTween);
        });
    }

    /**
     * 汎用スキルアニメーションを作成
     */
    private createGenericSkillAnimation(caster: any, targets: any[], animations: Phaser.Tweens.Tween[]): void {
        targets.forEach((target, index) => {
            const targetSprite = this.getTargetSprite(target);
            if (!targetSprite) return;

            // 汎用エフェクト（白い光）
            const genericEffect = this.scene.add.circle(
                targetSprite.x,
                targetSprite.y,
                20,
                0xffffff,
                0.7
            );

            const effectTween = this.scene.tweens.add({
                targets: genericEffect,
                alpha: { from: 0.7, to: 0 },
                scale: { from: 0.8, to: 1.2 },
                duration: 500,
                delay: index * 100,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    genericEffect.destroy();
                }
            });

            animations.push(effectTween);
        });
    }

    /**
     * ヒットエフェクトを作成
     */
    private createHitEffect(targetSprite: Phaser.GameObjects.Sprite, skillType: SkillType): Phaser.GameObjects.GameObject | null {
        const effect = this.getEffectFromPool('hit');
        if (!effect) {
            // 新しいヒットエフェクトを作成
            const star = this.scene.add.star(
                targetSprite.x,
                targetSprite.y,
                5,
                10,
                20,
                this.getSkillTypeColor(skillType)
            );
            star.setDepth(targetSprite.depth + 1);
            return star;
        }

        // プールからのエフェクトを再利用
        effect.setPosition(targetSprite.x, targetSprite.y);
        effect.setVisible(true);
        effect.setActive(true);
        return effect;
    }

    /**
     * 継続効果オブジェクトを作成
     */
    private createContinuousEffectObject(targetSprite: Phaser.GameObjects.Sprite, effectType: BuffType | StatusEffectType): Phaser.GameObjects.GameObject | null {
        const color = this.getEffectTypeColor(effectType);

        const effectCircle = this.scene.add.circle(
            targetSprite.x,
            targetSprite.y - 40,
            8,
            color,
            0.6
        );

        effectCircle.setDepth(targetSprite.depth + 2);

        // 継続効果の点滅アニメーション
        this.scene.tweens.add({
            targets: effectCircle,
            alpha: { from: 0.6, to: 0.2 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return effectCircle;
    }

    /**
     * 画面揺れ効果を追加
     */
    private addScreenShake(): void {
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(200, 0.01);
        }
    }

    /**
     * 音響効果を再生
     */
    private playSound(soundKey: string): void {
        try {
            if (this.scene.sound && this.scene.sound.get(soundKey)) {
                this.scene.sound.play(soundKey, { volume: 0.5 });
            }
        } catch (error) {
            if (this.config.enableDebugDisplay) {
                console.warn(`Sound not found: ${soundKey}`);
            }
        }
    }

    /**
     * スキル種別に応じた色を取得
     */
    private getSkillTypeColor(skillType: SkillType): number {
        switch (skillType) {
            case SkillType.ATTACK:
                return 0xff4444;
            case SkillType.HEAL:
                return 0x44ff44;
            case SkillType.BUFF:
                return 0x4444ff;
            case SkillType.DEBUFF:
                return 0xff44ff;
            case SkillType.STATUS:
                return 0xffaa44;
            default:
                return 0xffffff;
        }
    }

    /**
     * 効果種別に応じた色を取得
     */
    private getEffectTypeColor(effectType: BuffType | StatusEffectType): number {
        // バフ系は青系
        if (Object.values(BuffType).includes(effectType as BuffType)) {
            const buffType = effectType as BuffType;
            if (buffType.includes('_UP')) {
                return 0x4488ff;
            } else {
                return 0xff4488;
            }
        }

        // 状態異常系は赤系
        switch (effectType as StatusEffectType) {
            case StatusEffectType.POISON:
                return 0x88ff44;
            case StatusEffectType.PARALYSIS:
                return 0xffff44;
            case StatusEffectType.SLEEP:
                return 0x8844ff;
            default:
                return 0xff8844;
        }
    }

    /**
     * キャスタースプライトを取得
     */
    private getCasterSprite(caster: any): Phaser.GameObjects.Sprite | null {
        // TODO: 実際のキャラクタースプライト取得ロジックに置き換え
        return caster.sprite || null;
    }

    /**
     * ターゲットスプライトを取得
     */
    private getTargetSprite(target: any): Phaser.GameObjects.Sprite | null {
        // TODO: 実際のキャラクタースプライト取得ロジックに置き換え
        return target.sprite || null;
    }

    /**
     * エフェクトプールからオブジェクトを取得
     */
    private getEffectFromPool(effectType: string): Phaser.GameObjects.GameObject | null {
        const pool = this.effectPool.get(effectType);
        if (!pool || pool.length === 0) {
            return null;
        }

        return pool.pop() || null;
    }

    /**
     * エフェクトをプールに返却
     */
    private returnEffectToPool(effectType: string, effect: Phaser.GameObjects.GameObject): void {
        effect.setVisible(false);
        effect.setActive(false);

        const pool = this.effectPool.get(effectType);
        if (pool && pool.length < 20) { // プールサイズ制限
            pool.push(effect);
        } else {
            effect.destroy();
        }
    }

    /**
     * アニメーションをクリーンアップ
     */
    private cleanupAnimation(animationId: string): void {
        const animations = this.activeAnimations.get(animationId);
        if (animations) {
            animations.forEach(tween => {
                if (tween && tween.isActive()) {
                    tween.stop();
                }
            });
            this.activeAnimations.delete(animationId);
        }
    }

    /**
     * 全てのアニメーションを停止
     */
    stopAllAnimations(): void {
        this.activeAnimations.forEach((animations, id) => {
            this.cleanupAnimation(id);
        });

        this.continuousEffects.forEach((effect, id) => {
            this.hideContinuousEffect(id);
        });
    }

    /**
     * 設定を更新
     */
    updateConfig(newConfig: Partial<SkillAnimatorConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.stopAllAnimations();

        // エフェクトプールをクリア
        this.effectPool.forEach(pool => {
            pool.forEach(effect => effect.destroy());
        });
        this.effectPool.clear();

        // サウンドマネージャーをクリア
        this.soundManager.clear();

        this.removeAllListeners();
    }
}