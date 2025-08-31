/**
 * JobAnimator - 職業・ランクアップアニメーション・エフェクトシステム
 * 
 * このクラスは職業変更アニメーション、ランクアップアニメーション・エフェクト、
 * 薔薇の力獲得エフェクト、職業オーラエフェクト、スキル習得エフェクトを提供します。
 * 要件3.1-3.5に対応した機能を実装します。
 */

import * as Phaser from 'phaser';
import { Unit } from '../../types/gameplay';
import { Job } from './Job';
import { JobCategory } from '../../types/job';

/**
 * 職業アニメーションイベントタイプ
 */
export enum JobAnimationEvent {
    JOB_CHANGE_START = 'job_change_start',
    JOB_CHANGE_COMPLETE = 'job_change_complete',
    RANK_UP_START = 'rank_up_start',
    RANK_UP_COMPLETE = 'rank_up_complete',
    ROSE_ESSENCE_GAIN_START = 'rose_essence_gain_start',
    ROSE_ESSENCE_GAIN_COMPLETE = 'rose_essence_gain_complete',
    SKILL_UNLOCK_START = 'skill_unlock_start',
    SKILL_UNLOCK_COMPLETE = 'skill_unlock_complete',
    AURA_EFFECT_START = 'aura_effect_start',
    AURA_EFFECT_STOP = 'aura_effect_stop',
}

/**
 * アニメーション状態
 */
export interface JobAnimationState {
    isPlaying: boolean;
    type: 'job_change' | 'rank_up' | 'rose_essence' | 'skill_unlock' | 'aura' | 'idle';
    startTime: number;
    duration: number;
    characterId?: string;
    jobId?: string;
}

/**
 * 職業アニメーション設定
 */
export interface JobAnimatorConfig {
    jobChangeAnimationDuration: number;
    rankUpAnimationDuration: number;
    roseEssenceEffectDuration: number;
    skillUnlockEffectDuration: number;
    auraEffectDuration: number;
    enableParticleEffects: boolean;
    enableScreenShake: boolean;
    enableSoundEffects: boolean;
    animationSpeed: number;
    maxConcurrentEffects: number;
    enableDebugDisplay: boolean;
}

/**
 * 薔薇の力エフェクト設定
 */
export interface RoseEssenceEffectConfig {
    particleCount: number;
    particleSize: number;
    particleColor: number;
    floatDistance: number;
    fadeDelay: number;
    spiralEffect: boolean;
}

/**
 * 職業オーラエフェクト設定
 */
export interface JobAuraConfig {
    radius: number;
    pulseSpeed: number;
    opacity: number;
    colorIntensity: number;
    particleCount: number;
}

/**
 * JobAnimatorクラス - 職業・ランクアップアニメーション・エフェクトシステム
 */
export class JobAnimator extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: JobAnimatorConfig;
    private animationState: JobAnimationState;
    private activeEffects: Map<string, Phaser.GameObjects.GameObject[]>;
    private activeAuras: Map<string, Phaser.GameObjects.Container>;
    private effectPools: Map<string, Phaser.GameObjects.GameObject[]>;

    // アニメーショングループ
    private jobChangeAnimations: Phaser.GameObjects.Group;
    private rankUpEffects: Phaser.GameObjects.Group;
    private roseEssenceEffects: Phaser.GameObjects.Group;
    private skillUnlockEffects: Phaser.GameObjects.Group;
    private auraEffects: Phaser.GameObjects.Group;

    // エフェクト設定
    private roseEssenceConfig: RoseEssenceEffectConfig;
    private jobAuraConfig: JobAuraConfig;

    private static readonly DEFAULT_CONFIG: JobAnimatorConfig = {
        jobChangeAnimationDuration: 1200,
        rankUpAnimationDuration: 2000,
        roseEssenceEffectDuration: 1500,
        skillUnlockEffectDuration: 1000,
        auraEffectDuration: 3000,
        enableParticleEffects: true,
        enableScreenShake: true,
        enableSoundEffects: true,
        animationSpeed: 1.0,
        maxConcurrentEffects: 10,
        enableDebugDisplay: false,
    };

    /**
     * JobAnimatorインスタンスを作成
     * @param scene Phaserシーン
     * @param config アニメーション設定
     */
    constructor(scene: Phaser.Scene, config?: Partial<JobAnimatorConfig>) {
        super();

        this.scene = scene;
        this.config = { ...JobAnimator.DEFAULT_CONFIG, ...config };

        this.animationState = {
            isPlaying: false,
            type: 'idle',
            startTime: 0,
            duration: 0,
        };

        this.activeEffects = new Map();
        this.activeAuras = new Map();
        this.effectPools = new Map();

        // 薔薇の力エフェクト設定
        this.roseEssenceConfig = {
            particleCount: 15,
            particleSize: 4,
            particleColor: 0xff69b4, // ピンク色
            floatDistance: 80,
            fadeDelay: 300,
            spiralEffect: true,
        };

        // 職業オーラ設定
        this.jobAuraConfig = {
            radius: 40,
            pulseSpeed: 2000,
            opacity: 0.6,
            colorIntensity: 0.8,
            particleCount: 8,
        };

        this.initializeAnimationGroups();
        this.initializeEffectPools();
    }

    /**
     * アニメーショングループを初期化
     */
    private initializeAnimationGroups(): void {
        this.jobChangeAnimations = this.scene.add.group();
        this.rankUpEffects = this.scene.add.group();
        this.roseEssenceEffects = this.scene.add.group();
        this.skillUnlockEffects = this.scene.add.group();
        this.auraEffects = this.scene.add.group();
    }

    /**
     * エフェクトプールを初期化
     */
    private initializeEffectPools(): void {
        const effectTypes = ['rose_petal', 'sparkle', 'aura_particle', 'skill_star', 'rank_up_burst'];

        for (const type of effectTypes) {
            this.effectPools.set(type, []);
        }
    }

    /**
     * 職業変更アニメーションを再生
     * 要件3.1: 職業変更時の視覚的変化
     * 
     * @param character 対象キャラクター
     * @param oldJob 変更前の職業
     * @param newJob 変更後の職業
     * @returns アニメーション完了のPromise
     */
    public async playJobChangeAnimation(character: Unit, oldJob: Job, newJob: Job): Promise<void> {
        if (this.animationState.isPlaying) {
            throw new Error('アニメーションが既に実行中です');
        }

        if (!character.sprite) {
            throw new Error('キャラクタースプライトが見つかりません');
        }

        return new Promise((resolve, reject) => {
            try {
                this.animationState = {
                    isPlaying: true,
                    type: 'job_change',
                    startTime: Date.now(),
                    duration: this.config.jobChangeAnimationDuration * this.config.animationSpeed,
                    characterId: character.id,
                    jobId: newJob.id,
                };

                this.emit(JobAnimationEvent.JOB_CHANGE_START, { character, oldJob, newJob });

                const sprite = character.sprite;
                const originalTint = sprite.tint;

                // フェーズ1: 古い職業の色でフラッシュ
                const oldJobColor = this.getJobCategoryColor(oldJob.category);
                const phase1Timeline = this.scene.tweens.createTimeline();

                phase1Timeline.add({
                    targets: sprite,
                    tint: oldJobColor,
                    alpha: 0.7,
                    duration: this.animationState.duration * 0.2,
                    ease: 'Power2.easeOut',
                });

                // フェーズ2: 変身エフェクト（回転と拡大）
                phase1Timeline.add({
                    targets: sprite,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    angle: 360,
                    alpha: 0.3,
                    duration: this.animationState.duration * 0.4,
                    ease: 'Power2.easeInOut',
                });

                // フェーズ3: 新しい職業の色で復帰
                const newJobColor = this.getJobCategoryColor(newJob.category);
                phase1Timeline.add({
                    targets: sprite,
                    tint: newJobColor,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    angle: 0,
                    alpha: 1.0,
                    duration: this.animationState.duration * 0.3,
                    ease: 'Power2.easeOut',
                });

                // フェーズ4: 元の色に戻す
                phase1Timeline.add({
                    targets: sprite,
                    tint: originalTint,
                    duration: this.animationState.duration * 0.1,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        this.animationState.isPlaying = false;
                        this.animationState.type = 'idle';
                        this.emit(JobAnimationEvent.JOB_CHANGE_COMPLETE, { character, oldJob, newJob });
                        resolve();
                    },
                });

                // パーティクルエフェクトを追加
                if (this.config.enableParticleEffects) {
                    this.createJobChangeParticles(sprite, oldJob.category, newJob.category);
                }

                // 音響効果
                if (this.config.enableSoundEffects) {
                    this.playJobSound('job_change');
                }

                phase1Timeline.play();

                // デバッグ表示
                if (this.config.enableDebugDisplay) {
                    console.log(`職業変更アニメーション開始: ${oldJob.name} → ${newJob.name}`);
                }

            } catch (error) {
                this.animationState.isPlaying = false;
                this.animationState.type = 'idle';
                reject(new Error(`職業変更アニメーション失敗: ${error}`));
            }
        });
    }

    /**
     * ランクアップアニメーションを再生
     * 要件3.2: ランクアップ時の演出表示
     * 
     * @param character 対象キャラクター
     * @param newRank 新しいランク
     * @returns アニメーション完了のPromise
     */
    public async playRankUpAnimation(character: Unit, newRank: number): Promise<void> {
        if (this.animationState.isPlaying) {
            throw new Error('アニメーションが既に実行中です');
        }

        if (!character.sprite) {
            throw new Error('キャラクタースプライトが見つかりません');
        }

        return new Promise((resolve, reject) => {
            try {
                this.animationState = {
                    isPlaying: true,
                    type: 'rank_up',
                    startTime: Date.now(),
                    duration: this.config.rankUpAnimationDuration * this.config.animationSpeed,
                    characterId: character.id,
                };

                this.emit(JobAnimationEvent.RANK_UP_START, { character, newRank });

                const sprite = character.sprite;

                // ランクアップエフェクトのタイムライン
                const timeline = this.scene.tweens.createTimeline();

                // フェーズ1: 光の柱エフェクト
                const lightPillar = this.createLightPillar(sprite.x, sprite.y);
                timeline.add({
                    targets: lightPillar,
                    alpha: { from: 0, to: 1 },
                    scaleY: { from: 0, to: 2 },
                    duration: this.animationState.duration * 0.3,
                    ease: 'Power2.easeOut',
                });

                // フェーズ2: キャラクターの光る効果
                timeline.add({
                    targets: sprite,
                    tint: 0xffffff,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: this.animationState.duration * 0.2,
                    ease: 'Power2.easeInOut',
                    yoyo: true,
                });

                // フェーズ3: 薔薇の花びらエフェクト
                timeline.add({
                    targets: {},
                    duration: this.animationState.duration * 0.3,
                    onStart: () => {
                        this.createRoseEssenceParticles(sprite.x, sprite.y, true);
                    },
                });

                // フェーズ4: 完了処理
                timeline.add({
                    targets: lightPillar,
                    alpha: 0,
                    duration: this.animationState.duration * 0.2,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        lightPillar.destroy();
                        sprite.setTint(0xffffff);
                        this.animationState.isPlaying = false;
                        this.animationState.type = 'idle';
                        this.emit(JobAnimationEvent.RANK_UP_COMPLETE, { character, newRank });
                        resolve();
                    },
                });

                // 画面揺れ効果
                if (this.config.enableScreenShake) {
                    this.scene.cameras.main.shake(300, 0.02);
                }

                // 音響効果
                if (this.config.enableSoundEffects) {
                    this.playJobSound('rank_up');
                }

                timeline.play();

                // デバッグ表示
                if (this.config.enableDebugDisplay) {
                    console.log(`ランクアップアニメーション開始: ランク${newRank}`);
                }

            } catch (error) {
                this.animationState.isPlaying = false;
                this.animationState.type = 'idle';
                reject(new Error(`ランクアップアニメーション失敗: ${error}`));
            }
        });
    }

    /**
     * 薔薇の力獲得エフェクトを再生
     * 要件3.3: 薔薇の力獲得時の視覚効果
     * 
     * @param amount 獲得量
     * @param position エフェクト表示位置（省略時は画面中央）
     * @returns エフェクト完了のPromise
     */
    public async playRoseEssenceGainEffect(amount: number, position?: { x: number; y: number }): Promise<void> {
        return new Promise((resolve) => {
            const effectPosition = position || {
                x: this.scene.cameras.main.centerX,
                y: this.scene.cameras.main.centerY,
            };

            this.emit(JobAnimationEvent.ROSE_ESSENCE_GAIN_START, { amount, position: effectPosition });

            // 薔薇の力獲得テキスト表示
            const gainText = this.scene.add.text(
                effectPosition.x,
                effectPosition.y - 50,
                `薔薇の力 +${amount}`,
                {
                    fontSize: '28px',
                    color: '#ff69b4',
                    stroke: '#000000',
                    strokeThickness: 3,
                    fontFamily: 'Arial Black',
                }
            );
            gainText.setOrigin(0.5, 0.5);
            gainText.setDepth(1000);

            // テキストアニメーション
            this.scene.tweens.add({
                targets: gainText,
                y: gainText.y - 80,
                alpha: { from: 1, to: 0 },
                scaleX: { from: 1, to: 1.5 },
                scaleY: { from: 1, to: 1.5 },
                duration: this.config.roseEssenceEffectDuration,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    gainText.destroy();
                    this.emit(JobAnimationEvent.ROSE_ESSENCE_GAIN_COMPLETE, { amount, position: effectPosition });
                    resolve();
                },
            });

            // 薔薇の花びらパーティクル
            if (this.config.enableParticleEffects) {
                this.createRoseEssenceParticles(effectPosition.x, effectPosition.y, false);
            }

            // 音響効果
            if (this.config.enableSoundEffects) {
                this.playJobSound('rose_essence_gain');
            }

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`薔薇の力獲得エフェクト: +${amount}`);
            }
        });
    }

    /**
     * 職業オーラエフェクトを表示
     * 要件3.4: 職業に応じた視覚的識別
     * 
     * @param character 対象キャラクター
     * @param job 職業
     */
    public showJobAura(character: Unit, job: Job): void {
        if (!character.sprite) {
            console.warn('キャラクタースプライトが見つかりません');
            return;
        }

        // 既存のオーラがあれば削除
        this.hideJobAura(character.id);

        const auraContainer = this.createJobAura(character.sprite, job.category);
        if (auraContainer) {
            this.activeAuras.set(character.id, auraContainer);
            this.emit(JobAnimationEvent.AURA_EFFECT_START, { character, job });

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`職業オーラ表示: ${character.name} - ${job.name}`);
            }
        }
    }

    /**
     * 職業オーラエフェクトを非表示
     * 
     * @param characterId キャラクターID
     */
    public hideJobAura(characterId: string): void {
        const aura = this.activeAuras.get(characterId);
        if (aura) {
            aura.destroy();
            this.activeAuras.delete(characterId);
            this.emit(JobAnimationEvent.AURA_EFFECT_STOP, { characterId });

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`職業オーラ非表示: ${characterId}`);
            }
        }
    }

    /**
     * スキル習得エフェクトを再生
     * 要件3.5: スキル習得時の演出
     * 
     * @param character 対象キャラクター
     * @param skillName 習得したスキル名
     * @returns エフェクト完了のPromise
     */
    public async playSkillUnlockEffect(character: Unit, skillName: string): Promise<void> {
        if (!character.sprite) {
            throw new Error('キャラクタースプライトが見つかりません');
        }

        return new Promise((resolve) => {
            this.emit(JobAnimationEvent.SKILL_UNLOCK_START, { character, skillName });

            const sprite = character.sprite;

            // スキル習得テキスト
            const skillText = this.scene.add.text(
                sprite.x,
                sprite.y - 60,
                `スキル習得: ${skillName}`,
                {
                    fontSize: '20px',
                    color: '#00ffff',
                    stroke: '#000000',
                    strokeThickness: 2,
                    fontFamily: 'Arial',
                }
            );
            skillText.setOrigin(0.5, 0.5);
            skillText.setDepth(sprite.depth + 10);

            // スキル習得アニメーション
            const timeline = this.scene.tweens.createTimeline();

            // フェーズ1: テキスト表示
            timeline.add({
                targets: skillText,
                alpha: { from: 0, to: 1 },
                y: skillText.y - 20,
                duration: this.config.skillUnlockEffectDuration * 0.3,
                ease: 'Power2.easeOut',
            });

            // フェーズ2: キャラクターの光る効果
            timeline.add({
                targets: sprite,
                tint: 0x00ffff,
                duration: this.config.skillUnlockEffectDuration * 0.2,
                ease: 'Power2.easeInOut',
                yoyo: true,
            });

            // フェーズ3: テキスト消去
            timeline.add({
                targets: skillText,
                alpha: 0,
                y: skillText.y - 30,
                duration: this.config.skillUnlockEffectDuration * 0.5,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    skillText.destroy();
                    sprite.setTint(0xffffff);
                    this.emit(JobAnimationEvent.SKILL_UNLOCK_COMPLETE, { character, skillName });
                    resolve();
                },
            });

            // スキル習得パーティクル
            if (this.config.enableParticleEffects) {
                this.createSkillUnlockParticles(sprite.x, sprite.y);
            }

            // 音響効果
            if (this.config.enableSoundEffects) {
                this.playJobSound('skill_unlock');
            }

            timeline.play();

            // デバッグ表示
            if (this.config.enableDebugDisplay) {
                console.log(`スキル習得エフェクト: ${character.name} - ${skillName}`);
            }
        });
    }

    /**
     * 職業カテゴリーに応じた色を取得
     */
    private getJobCategoryColor(category: JobCategory): number {
        switch (category) {
            case JobCategory.WARRIOR:
                return 0xff4444; // 赤
            case JobCategory.MAGE:
                return 0x4444ff; // 青
            case JobCategory.ARCHER:
                return 0x44ff44; // 緑
            case JobCategory.HEALER:
                return 0xffff44; // 黄
            case JobCategory.THIEF:
                return 0xff44ff; // マゼンタ
            case JobCategory.SPECIAL:
                return 0x44ffff; // シアン
            default:
                return 0xffffff; // 白
        }
    }

    /**
     * 職業変更パーティクルを作成
     */
    private createJobChangeParticles(sprite: Phaser.GameObjects.Sprite, oldCategory: JobCategory, newCategory: JobCategory): void {
        const oldColor = this.getJobCategoryColor(oldCategory);
        const newColor = this.getJobCategoryColor(newCategory);

        // 古い職業の色のパーティクル（消える）
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(sprite.x, sprite.y, 3, oldColor);
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 40;

            this.scene.tweens.add({
                targets: particle,
                x: sprite.x + Math.cos(angle) * distance,
                y: sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 600,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy(),
            });
        }

        // 新しい職業の色のパーティクル（現れる）
        this.scene.time.delayedCall(400, () => {
            for (let i = 0; i < 12; i++) {
                const particle = this.scene.add.circle(
                    sprite.x + (Math.random() - 0.5) * 80,
                    sprite.y + (Math.random() - 0.5) * 80,
                    2,
                    newColor
                );
                particle.setAlpha(0);

                this.scene.tweens.add({
                    targets: particle,
                    x: sprite.x,
                    y: sprite.y,
                    alpha: 1,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 800,
                    ease: 'Power2.easeIn',
                    onComplete: () => particle.destroy(),
                });
            }
        });
    }

    /**
     * 光の柱を作成
     */
    private createLightPillar(x: number, y: number): Phaser.GameObjects.Rectangle {
        const pillar = this.scene.add.rectangle(x, y, 20, 200, 0xffffff, 0.8);
        pillar.setDepth(1000);
        pillar.setOrigin(0.5, 1);
        return pillar;
    }

    /**
     * 薔薇の花びらパーティクルを作成
     */
    private createRoseEssenceParticles(x: number, y: number, burst: boolean = false): void {
        const particleCount = burst ? this.roseEssenceConfig.particleCount * 2 : this.roseEssenceConfig.particleCount;

        for (let i = 0; i < particleCount; i++) {
            const petal = this.scene.add.ellipse(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                6,
                3,
                this.roseEssenceConfig.particleColor
            );

            petal.setDepth(999);

            const angle = burst ? (Math.PI * 2 * i) / particleCount : Math.random() * Math.PI * 2;
            const distance = burst ? this.roseEssenceConfig.floatDistance * 1.5 : this.roseEssenceConfig.floatDistance;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance - 50;

            // 螺旋効果
            if (this.roseEssenceConfig.spiralEffect) {
                this.scene.tweens.add({
                    targets: petal,
                    angle: 720,
                    duration: this.config.roseEssenceEffectDuration,
                    ease: 'Power2.easeOut',
                });
            }

            this.scene.tweens.add({
                targets: petal,
                x: targetX,
                y: targetY,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: this.config.roseEssenceEffectDuration,
                delay: burst ? i * 50 : Math.random() * this.roseEssenceConfig.fadeDelay,
                ease: 'Power2.easeOut',
                onComplete: () => petal.destroy(),
            });
        }
    }

    /**
     * 職業オーラを作成
     */
    private createJobAura(sprite: Phaser.GameObjects.Sprite, category: JobCategory): Phaser.GameObjects.Container | null {
        const auraColor = this.getJobCategoryColor(category);
        const container = this.scene.add.container(sprite.x, sprite.y);
        container.setDepth(sprite.depth - 1);

        // オーラの円
        const auraCircle = this.scene.add.circle(0, 0, this.jobAuraConfig.radius, auraColor, this.jobAuraConfig.opacity);
        container.add(auraCircle);

        // パルス効果
        this.scene.tweens.add({
            targets: auraCircle,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: this.jobAuraConfig.opacity * 0.5,
            duration: this.jobAuraConfig.pulseSpeed,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // オーラパーティクル
        for (let i = 0; i < this.jobAuraConfig.particleCount; i++) {
            const particle = this.scene.add.circle(0, 0, 2, auraColor, 0.8);
            container.add(particle);

            const angle = (Math.PI * 2 * i) / this.jobAuraConfig.particleCount;
            const radius = this.jobAuraConfig.radius * 0.8;

            this.scene.tweens.add({
                targets: particle,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                duration: 0,
            });

            // パーティクルの回転
            this.scene.tweens.add({
                targets: particle,
                angle: 360,
                duration: 4000,
                repeat: -1,
                ease: 'Linear',
            });
        }

        this.auraEffects.add(container);
        return container;
    }

    /**
     * スキル習得パーティクルを作成
     */
    private createSkillUnlockParticles(x: number, y: number): void {
        for (let i = 0; i < 8; i++) {
            const star = this.scene.add.star(x, y, 5, 4, 8, 0x00ffff);
            star.setDepth(999);

            const angle = (Math.PI * 2 * i) / 8;
            const distance = 50;

            this.scene.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scaleX: 2,
                scaleY: 2,
                angle: 360,
                duration: this.config.skillUnlockEffectDuration,
                ease: 'Power2.easeOut',
                onComplete: () => star.destroy(),
            });
        }
    }

    /**
     * 職業関連の音響効果を再生
     */
    private playJobSound(soundKey: string): void {
        try {
            if (this.scene.sound && this.scene.sound.get(soundKey)) {
                this.scene.sound.play(soundKey, { volume: 0.6 });
            }
        } catch (error) {
            if (this.config.enableDebugDisplay) {
                console.warn(`音響効果が見つかりません: ${soundKey}`);
            }
        }
    }

    /**
     * オーラエフェクトの位置を更新
     * @param characterId キャラクターID
     * @param position 新しい位置
     */
    public updateAuraPosition(characterId: string, position: { x: number; y: number }): void {
        const aura = this.activeAuras.get(characterId);
        if (aura) {
            aura.setPosition(position.x, position.y);
        }
    }

    /**
     * 現在のアニメーション状態を取得
     */
    public getAnimationState(): JobAnimationState {
        return { ...this.animationState };
    }

    /**
     * アニメーションが実行中かどうかを判定
     */
    public isAnimationPlaying(): boolean {
        return this.animationState.isPlaying;
    }

    /**
     * 全てのアニメーションを停止
     */
    public stopAllAnimations(): void {
        // 進行中のアニメーションを停止
        this.scene.tweens.killTweensOf(this.jobChangeAnimations.children.entries);
        this.scene.tweens.killTweensOf(this.rankUpEffects.children.entries);
        this.scene.tweens.killTweensOf(this.roseEssenceEffects.children.entries);
        this.scene.tweens.killTweensOf(this.skillUnlockEffects.children.entries);

        // アクティブエフェクトをクリア
        this.activeEffects.forEach(effects => {
            effects.forEach(effect => {
                if (effect && effect.destroy) {
                    effect.destroy();
                }
            });
        });
        this.activeEffects.clear();

        // オーラエフェクトをクリア
        this.activeAuras.forEach(aura => {
            aura.destroy();
        });
        this.activeAuras.clear();

        // アニメーショングループをクリア
        this.jobChangeAnimations.clear(true, true);
        this.rankUpEffects.clear(true, true);
        this.roseEssenceEffects.clear(true, true);
        this.skillUnlockEffects.clear(true, true);
        this.auraEffects.clear(true, true);

        // アニメーション状態をリセット
        this.animationState = {
            isPlaying: false,
            type: 'idle',
            startTime: 0,
            duration: 0,
        };
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<JobAnimatorConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * アニメーションを有効/無効にする
     */
    public setAnimationsEnabled(enabled: boolean): void {
        this.config.enableParticleEffects = enabled;
        this.config.enableScreenShake = enabled;

        if (!enabled) {
            this.stopAllAnimations();
        }
    }

    /**
     * アニメーション速度を設定
     */
    public setAnimationSpeed(speed: number): void {
        this.config.animationSpeed = Math.max(0.1, Math.min(5.0, speed));
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        this.stopAllAnimations();

        // エフェクトプールをクリア
        this.effectPools.forEach(pool => {
            pool.forEach(effect => effect.destroy());
        });
        this.effectPools.clear();

        // アニメーショングループを破棄
        this.jobChangeAnimations.destroy();
        this.rankUpEffects.destroy();
        this.roseEssenceEffects.destroy();
        this.skillUnlockEffects.destroy();
        this.auraEffects.destroy();

        // イベントリスナーを削除
        this.removeAllListeners();
    }
}