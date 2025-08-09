/**
 * スキルアニメーション・エフェクト最適化システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillAnimationOptimizer: アニメーション最適化の統合管理
 * - AnimationPool: アニメーションオブジェクトプール
 * - EffectPool: エフェクトオブジェクトプール
 * - AnimationBatcher: アニメーションバッチ処理
 * - FrameRateOptimizer: フレームレート最適化
 */

import * as Phaser from 'phaser';
import {
    SkillData,
    Position,
    ActiveSkillEffect
} from '../../types/skill';

import { Skill } from './Skill';

/**
 * アニメーション最適化設定
 */
export interface AnimationOptimizationConfig {
    /** 最大同時アニメーション数 */
    maxConcurrentAnimations: number;
    /** エフェクトプール最大サイズ */
    maxEffectPoolSize: number;
    /** アニメーション品質レベル（1-5） */
    qualityLevel: number;
    /** 60fps維持を優先するか */
    prioritize60FPS: boolean;
    /** 画面外アニメーションをスキップするか */
    skipOffscreenAnimations: boolean;
    /** アニメーション時間制限（ms） */
    animationTimeLimit: number;
    /** デバッグ表示を有効にするか */
    enableDebugDisplay: boolean;
}

/**
 * アニメーション統計情報
 */
export interface AnimationStatistics {
    /** 現在実行中のアニメーション数 */
    activeAnimations: number;
    /** 総アニメーション実行数 */
    totalAnimationsPlayed: number;
    /** スキップされたアニメーション数 */
    skippedAnimations: number;
    /** 平均アニメーション時間（ms） */
    averageAnimationTime: number;
    /** プール使用率 */
    poolUsageRate: number;
    /** 現在のフレームレート */
    currentFPS: number;
    /** フレームドロップ数 */
    frameDrops: number;
    /** 最後の更新時刻 */
    lastUpdatedAt: Date;
}

/**
 * アニメーションオブジェクト
 */
interface PooledAnimation {
    /** Phaserアニメーションオブジェクト */
    animation: Phaser.GameObjects.Sprite | Phaser.GameObjects.Particles.ParticleEmitter;
    /** アニメーション種別 */
    type: 'sprite' | 'particle' | 'tween';
    /** 使用中フラグ */
    inUse: boolean;
    /** 作成時刻 */
    createdAt: number;
    /** 最後の使用時刻 */
    lastUsedAt: number;
}

/**
 * エフェクトオブジェクト
 */
interface PooledEffect {
    /** エフェクトオブジェクト */
    effect: Phaser.GameObjects.GameObject;
    /** エフェクト種別 */
    type: string;
    /** 使用中フラグ */
    inUse: boolean;
    /** 持続時間 */
    duration: number;
    /** 開始時刻 */
    startTime: number;
}

/**
 * アニメーションバッチ
 */
interface AnimationBatch {
    /** バッチID */
    id: string;
    /** アニメーション配列 */
    animations: PooledAnimation[];
    /** 実行開始時刻 */
    startTime: number;
    /** 優先度 */
    priority: number;
    /** 完了コールバック */
    onComplete?: () => void;
}

/**
 * アニメーションプール
 * アニメーションオブジェクトの再利用によるメモリ最適化
 */
export class AnimationPool {
    private scene: Phaser.Scene;
    private pools: Map<string, PooledAnimation[]> = new Map();
    private activeAnimations: Set<PooledAnimation> = new Set();
    private maxPoolSize: number;
    private createdCount: number = 0;
    private reusedCount: number = 0;

    constructor(scene: Phaser.Scene, maxPoolSize: number = 50) {
        this.scene = scene;
        this.maxPoolSize = maxPoolSize;
    }

    /**
     * アニメーションオブジェクトを取得
     * @param type アニメーション種別
     * @param config 設定
     * @returns アニメーションオブジェクト
     */
    acquire(type: string, config: any): PooledAnimation | null {
        let pool = this.pools.get(type);
        if (!pool) {
            pool = [];
            this.pools.set(type, pool);
        }

        // 使用可能なオブジェクトを探す
        for (const animation of pool) {
            if (!animation.inUse) {
                animation.inUse = true;
                animation.lastUsedAt = performance.now();
                this.activeAnimations.add(animation);
                this.reusedCount++;
                return animation;
            }
        }

        // プールサイズ制限チェック
        if (pool.length >= this.maxPoolSize) {
            return null; // プールが満杯
        }

        // 新しいオブジェクトを作成
        const newAnimation = this.createAnimation(type, config);
        if (newAnimation) {
            pool.push(newAnimation);
            this.activeAnimations.add(newAnimation);
            this.createdCount++;
            return newAnimation;
        }

        return null;
    }

    /**
     * アニメーションオブジェクトを返却
     * @param animation アニメーションオブジェクト
     */
    release(animation: PooledAnimation): void {
        if (this.activeAnimations.has(animation)) {
            animation.inUse = false;
            this.activeAnimations.delete(animation);

            // アニメーションをリセット
            this.resetAnimation(animation);
        }
    }

    /**
     * アニメーションオブジェクトを作成
     * @param type アニメーション種別
     * @param config 設定
     * @returns アニメーションオブジェクト
     */
    private createAnimation(type: string, config: any): PooledAnimation | null {
        let gameObject: Phaser.GameObjects.Sprite | Phaser.GameObjects.Particles.ParticleEmitter;

        try {
            switch (type) {
                case 'sprite':
                    gameObject = this.scene.add.sprite(0, 0, config.texture || 'default');
                    gameObject.setVisible(false);
                    break;

                case 'particle':
                    gameObject = this.scene.add.particles(0, 0, config.texture || 'default', {
                        ...config.particleConfig,
                        emitting: false
                    });
                    break;

                default:
                    return null;
            }

            return {
                animation: gameObject,
                type: type as 'sprite' | 'particle' | 'tween',
                inUse: true,
                createdAt: performance.now(),
                lastUsedAt: performance.now()
            };

        } catch (error) {
            console.error(`Failed to create animation of type ${type}:`, error);
            return null;
        }
    }

    /**
     * アニメーションをリセット
     * @param animation アニメーションオブジェクト
     */
    private resetAnimation(animation: PooledAnimation): void {
        const gameObject = animation.animation;

        try {
            // 共通リセット処理（メソッドが存在する場合のみ実行）
            if (typeof gameObject.setVisible === 'function') {
                gameObject.setVisible(false);
            }
            if (typeof gameObject.setPosition === 'function') {
                gameObject.setPosition(0, 0);
            }
            if (typeof gameObject.setAlpha === 'function') {
                gameObject.setAlpha(1);
            }
            if (typeof gameObject.setScale === 'function') {
                gameObject.setScale(1);
            }
            if (typeof gameObject.setRotation === 'function') {
                gameObject.setRotation(0);
            }

            // 種別固有のリセット処理
            switch (animation.type) {
                case 'sprite':
                    const sprite = gameObject as any;
                    if (typeof sprite.stop === 'function') {
                        sprite.stop();
                    }
                    if (typeof sprite.setFrame === 'function') {
                        sprite.setFrame(0);
                    }
                    break;

                case 'particle':
                    const emitter = gameObject as any;
                    if (typeof emitter.stop === 'function') {
                        emitter.stop();
                    }
                    if (typeof emitter.removeAllParticles === 'function') {
                        emitter.removeAllParticles();
                    }
                    break;
            }
        } catch (error) {
            console.warn('Failed to reset animation:', error);
        }
    }

    /**
     * 統計情報を取得
     * @returns 統計情報
     */
    getStatistics(): {
        totalPools: number;
        totalPooledObjects: number;
        activeAnimations: number;
        createdCount: number;
        reusedCount: number;
        reuseRate: number;
    } {
        let totalPooledObjects = 0;
        for (const pool of this.pools.values()) {
            totalPooledObjects += pool.length;
        }

        const totalObjects = this.createdCount + this.reusedCount;
        const reuseRate = totalObjects > 0 ? this.reusedCount / totalObjects : 0;

        return {
            totalPools: this.pools.size,
            totalPooledObjects,
            activeAnimations: this.activeAnimations.size,
            createdCount: this.createdCount,
            reusedCount: this.reusedCount,
            reuseRate
        };
    }

    /**
     * プールをクリア
     */
    clear(): void {
        // アクティブなアニメーションを停止
        for (const animation of this.activeAnimations) {
            this.resetAnimation(animation);
            animation.animation.destroy();
        }

        // プール内のオブジェクトを破棄
        for (const pool of this.pools.values()) {
            for (const animation of pool) {
                animation.animation.destroy();
            }
        }

        this.pools.clear();
        this.activeAnimations.clear();
        this.createdCount = 0;
        this.reusedCount = 0;
    }
}

/**
 * エフェクトプール
 * エフェクトオブジェクトの再利用によるメモリ最適化
 */
export class EffectPool {
    private scene: Phaser.Scene;
    private pool: PooledEffect[] = [];
    private activeEffects: Set<PooledEffect> = new Set();
    private maxPoolSize: number;

    constructor(scene: Phaser.Scene, maxPoolSize: number = 100) {
        this.scene = scene;
        this.maxPoolSize = maxPoolSize;
    }

    /**
     * エフェクトオブジェクトを取得
     * @param type エフェクト種別
     * @param duration 持続時間
     * @returns エフェクトオブジェクト
     */
    acquire(type: string, duration: number = 1000): PooledEffect | null {
        // 使用可能なオブジェクトを探す
        for (const effect of this.pool) {
            if (!effect.inUse && effect.type === type) {
                effect.inUse = true;
                effect.duration = duration;
                effect.startTime = performance.now();
                this.activeEffects.add(effect);
                return effect;
            }
        }

        // プールサイズ制限チェック
        if (this.pool.length >= this.maxPoolSize) {
            return null;
        }

        // 新しいエフェクトを作成
        const newEffect = this.createEffect(type, duration);
        if (newEffect) {
            this.pool.push(newEffect);
            this.activeEffects.add(newEffect);
            return newEffect;
        }

        return null;
    }

    /**
     * エフェクトオブジェクトを返却
     * @param effect エフェクトオブジェクト
     */
    release(effect: PooledEffect): void {
        if (this.activeEffects.has(effect)) {
            effect.inUse = false;
            this.activeEffects.delete(effect);

            // エフェクトをリセット
            this.resetEffect(effect);
        }
    }

    /**
     * エフェクトオブジェクトを作成
     * @param type エフェクト種別
     * @param duration 持続時間
     * @returns エフェクトオブジェクト
     */
    private createEffect(type: string, duration: number): PooledEffect | null {
        let gameObject: Phaser.GameObjects.GameObject;

        try {
            switch (type) {
                case 'damage_number':
                    gameObject = this.scene.add.text(0, 0, '', {
                        fontSize: '16px',
                        color: '#ff0000'
                    });
                    gameObject.setVisible(false);
                    break;

                case 'heal_number':
                    gameObject = this.scene.add.text(0, 0, '', {
                        fontSize: '16px',
                        color: '#00ff00'
                    });
                    gameObject.setVisible(false);
                    break;

                case 'status_icon':
                    gameObject = this.scene.add.image(0, 0, 'status_icons');
                    gameObject.setVisible(false);
                    break;

                default:
                    gameObject = this.scene.add.rectangle(0, 0, 32, 32, 0xffffff);
                    gameObject.setVisible(false);
                    break;
            }

            return {
                effect: gameObject,
                type,
                inUse: true,
                duration,
                startTime: performance.now()
            };

        } catch (error) {
            console.error(`Failed to create effect of type ${type}:`, error);
            return null;
        }
    }

    /**
     * エフェクトをリセット
     * @param effect エフェクトオブジェクト
     */
    private resetEffect(effect: PooledEffect): void {
        const gameObject = effect.effect;

        try {
            if (typeof gameObject.setVisible === 'function') {
                gameObject.setVisible(false);
            }
            if (typeof gameObject.setPosition === 'function') {
                gameObject.setPosition(0, 0);
            }
            if (typeof gameObject.setAlpha === 'function') {
                gameObject.setAlpha(1);
            }
            if (typeof gameObject.setScale === 'function') {
                gameObject.setScale(1);
            }

            // テキストオブジェクトの場合
            if (typeof (gameObject as any).setText === 'function') {
                (gameObject as any).setText('');
            }
        } catch (error) {
            console.warn('Failed to reset effect:', error);
        }
    }

    /**
     * 期限切れエフェクトを更新
     */
    update(): void {
        const now = performance.now();
        const expiredEffects: PooledEffect[] = [];

        for (const effect of this.activeEffects) {
            if (now - effect.startTime >= effect.duration) {
                expiredEffects.push(effect);
            }
        }

        for (const effect of expiredEffects) {
            this.release(effect);
        }
    }

    /**
     * プールをクリア
     */
    clear(): void {
        for (const effect of this.activeEffects) {
            effect.effect.destroy();
        }

        for (const effect of this.pool) {
            effect.effect.destroy();
        }

        this.pool.length = 0;
        this.activeEffects.clear();
    }
}

/**
 * アニメーションバッチ処理システム
 * 複数のアニメーションを効率的にバッチ実行
 */
export class AnimationBatcher {
    private batches: Map<string, AnimationBatch> = new Map();
    private maxConcurrentBatches: number;
    private activeBatches: number = 0;

    constructor(maxConcurrentBatches: number = 5) {
        this.maxConcurrentBatches = maxConcurrentBatches;
    }

    /**
     * アニメーションバッチを作成
     * @param id バッチID
     * @param animations アニメーション配列
     * @param priority 優先度
     * @param onComplete 完了コールバック
     * @returns バッチ作成成功フラグ
     */
    createBatch(
        id: string,
        animations: PooledAnimation[],
        priority: number = 0,
        onComplete?: () => void
    ): boolean {
        if (this.batches.has(id)) {
            return false; // 既に存在
        }

        const batch: AnimationBatch = {
            id,
            animations,
            startTime: 0,
            priority,
            onComplete
        };

        this.batches.set(id, batch);
        return true;
    }

    /**
     * バッチを実行
     * @param id バッチID
     * @returns 実行成功フラグ
     */
    async executeBatch(id: string): Promise<boolean> {
        const batch = this.batches.get(id);
        if (!batch || this.activeBatches >= this.maxConcurrentBatches) {
            return false;
        }

        this.activeBatches++;
        batch.startTime = performance.now();

        try {
            // 優先度順にアニメーションを実行
            const sortedAnimations = batch.animations.sort((a, b) => {
                // 使用頻度の高いアニメーションを優先
                return b.lastUsedAt - a.lastUsedAt;
            });

            // アニメーションを並列実行
            const animationPromises = sortedAnimations.map(animation =>
                this.executeAnimation(animation)
            );

            await Promise.all(animationPromises);

            // 完了コールバックを実行
            if (batch.onComplete) {
                batch.onComplete();
            }

            return true;

        } catch (error) {
            console.error(`Batch execution failed for ${id}:`, error);
            return false;

        } finally {
            this.activeBatches--;
            this.batches.delete(id);
        }
    }

    /**
     * 個別アニメーションを実行
     * @param animation アニメーションオブジェクト
     * @returns 実行Promise
     */
    private executeAnimation(animation: PooledAnimation): Promise<void> {
        return new Promise((resolve) => {
            const gameObject = animation.animation;

            // アニメーション種別に応じた実行
            switch (animation.type) {
                case 'sprite':
                    const sprite = gameObject as Phaser.GameObjects.Sprite;
                    sprite.setVisible(true);
                    sprite.play('default_animation');
                    sprite.once('animationcomplete', () => resolve());
                    break;

                case 'particle':
                    const emitter = gameObject as Phaser.GameObjects.Particles.ParticleEmitter;
                    emitter.start();
                    setTimeout(() => {
                        emitter.stop();
                        resolve();
                    }, 1000);
                    break;

                default:
                    resolve();
                    break;
            }
        });
    }

    /**
     * バッチをキャンセル
     * @param id バッチID
     * @returns キャンセル成功フラグ
     */
    cancelBatch(id: string): boolean {
        return this.batches.delete(id);
    }

    /**
     * 全バッチをクリア
     */
    clear(): void {
        this.batches.clear();
        this.activeBatches = 0;
    }
}

/**
 * フレームレート最適化システム
 */
export class FrameRateOptimizer {
    private targetFPS: number = 60;
    private currentFPS: number = 60;
    private frameHistory: number[] = [];
    private lastFrameTime: number = 0;
    private frameDropCount: number = 0;
    private adaptiveQuality: boolean = true;
    private currentQualityLevel: number = 5;

    constructor(targetFPS: number = 60, adaptiveQuality: boolean = true) {
        this.targetFPS = targetFPS;
        this.adaptiveQuality = adaptiveQuality;
        this.startMonitoring();
    }

    /**
     * フレームレート監視を開始
     */
    private startMonitoring(): void {
        const monitor = () => {
            const now = performance.now();

            if (this.lastFrameTime > 0) {
                const deltaTime = now - this.lastFrameTime;
                const fps = 1000 / deltaTime;

                this.frameHistory.push(fps);
                if (this.frameHistory.length > 60) {
                    this.frameHistory.shift();
                }

                this.currentFPS = this.frameHistory.reduce((sum, f) => sum + f, 0) / this.frameHistory.length;

                // フレームドロップ検出
                if (fps < this.targetFPS * 0.9) {
                    this.frameDropCount++;
                }

                // 適応的品質調整
                if (this.adaptiveQuality) {
                    this.adjustQuality();
                }
            }

            this.lastFrameTime = now;
            requestAnimationFrame(monitor);
        };

        requestAnimationFrame(monitor);
    }

    /**
     * 品質レベルを適応的に調整
     */
    private adjustQuality(): void {
        const fpsRatio = this.currentFPS / this.targetFPS;

        if (fpsRatio < 0.8 && this.currentQualityLevel > 1) {
            // フレームレートが低い場合は品質を下げる
            this.currentQualityLevel = Math.max(1, this.currentQualityLevel - 1);
        } else if (fpsRatio > 0.95 && this.currentQualityLevel < 5) {
            // フレームレートが安定している場合は品質を上げる
            this.currentQualityLevel = Math.min(5, this.currentQualityLevel + 1);
        }
    }

    /**
     * 現在のフレームレートを取得
     * @returns フレームレート
     */
    getCurrentFPS(): number {
        return this.currentFPS;
    }

    /**
     * 現在の品質レベルを取得
     * @returns 品質レベル（1-5）
     */
    getCurrentQualityLevel(): number {
        return this.currentQualityLevel;
    }

    /**
     * フレームドロップ数を取得
     * @returns フレームドロップ数
     */
    getFrameDropCount(): number {
        return this.frameDropCount;
    }

    /**
     * アニメーションを実行すべきかチェック
     * @param priority アニメーション優先度
     * @returns 実行すべきかどうか
     */
    shouldPlayAnimation(priority: number = 0): boolean {
        // フレームレートが低い場合は低優先度のアニメーションをスキップ
        if (this.currentFPS < this.targetFPS * 0.8) {
            return priority >= 3; // 高優先度のみ実行
        }

        return true;
    }

    /**
     * 統計をリセット
     */
    resetStatistics(): void {
        this.frameHistory.length = 0;
        this.frameDropCount = 0;
        this.currentFPS = 60;
    }
}

/**
 * スキルアニメーション最適化統合管理
 */
export class SkillAnimationOptimizer {
    private scene: Phaser.Scene;
    private config: AnimationOptimizationConfig;
    private animationPool: AnimationPool;
    private effectPool: EffectPool;
    private animationBatcher: AnimationBatcher;
    private frameRateOptimizer: FrameRateOptimizer;
    private statistics: AnimationStatistics;

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: AnimationOptimizationConfig = {
        maxConcurrentAnimations: 10,
        maxEffectPoolSize: 100,
        qualityLevel: 5,
        prioritize60FPS: true,
        skipOffscreenAnimations: true,
        animationTimeLimit: 3000,
        enableDebugDisplay: false
    };

    constructor(scene: Phaser.Scene, config?: Partial<AnimationOptimizationConfig>) {
        this.scene = scene;
        this.config = { ...SkillAnimationOptimizer.DEFAULT_CONFIG, ...config };

        this.animationPool = new AnimationPool(scene, this.config.maxConcurrentAnimations * 2);
        this.effectPool = new EffectPool(scene, this.config.maxEffectPoolSize);
        this.animationBatcher = new AnimationBatcher(this.config.maxConcurrentAnimations);
        this.frameRateOptimizer = new FrameRateOptimizer(60, this.config.prioritize60FPS);

        this.statistics = this.createInitialStatistics();

        // 更新ループを開始
        this.startUpdateLoop();

        this.log('SkillAnimationOptimizer initialized', this.config);
    }

    /**
     * 初期統計情報を作成
     * @returns 初期統計情報
     */
    private createInitialStatistics(): AnimationStatistics {
        return {
            activeAnimations: 0,
            totalAnimationsPlayed: 0,
            skippedAnimations: 0,
            averageAnimationTime: 0,
            poolUsageRate: 0,
            currentFPS: 60,
            frameDrops: 0,
            lastUpdatedAt: new Date()
        };
    }

    /**
     * 更新ループを開始
     */
    private startUpdateLoop(): void {
        const update = () => {
            this.effectPool.update();
            this.updateStatistics();

            if (this.config.enableDebugDisplay) {
                this.updateDebugDisplay();
            }

            requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
    }

    /**
     * 最適化されたスキルアニメーション実行
     * @param skill スキル
     * @param caster 使用者
     * @param targets 対象配列
     * @returns 実行Promise
     */
    async playOptimizedSkillAnimation(
        skill: Skill,
        caster: any,
        targets: any[]
    ): Promise<void> {
        // フレームレートチェック
        if (!this.frameRateOptimizer.shouldPlayAnimation(skill.animation?.priority || 0)) {
            this.statistics.skippedAnimations++;
            return;
        }

        // 画面外チェック
        if (this.config.skipOffscreenAnimations && this.isOffscreen(caster.position)) {
            this.statistics.skippedAnimations++;
            return;
        }

        const startTime = performance.now();

        try {
            // アニメーションバッチを作成
            const batchId = `skill_${skill.id}_${startTime}`;
            const animations: PooledAnimation[] = [];

            // キャストアニメーション
            if (skill.animation.castAnimation) {
                const castAnim = this.animationPool.acquire('sprite', {
                    texture: skill.animation.castAnimation,
                    position: caster.position
                });
                if (castAnim) {
                    animations.push(castAnim);
                }
            }

            // スキルエフェクトアニメーション
            if (skill.animation.effectAnimation) {
                for (const target of targets) {
                    const effectAnim = this.animationPool.acquire('particle', {
                        texture: skill.animation.effectAnimation,
                        position: target.position,
                        particleConfig: this.getParticleConfig(skill)
                    });
                    if (effectAnim) {
                        animations.push(effectAnim);
                    }
                }
            }

            // バッチ実行
            if (animations.length > 0) {
                this.animationBatcher.createBatch(
                    batchId,
                    animations,
                    skill.animation?.priority || 0,
                    () => {
                        // アニメーション完了後にプールに返却
                        for (const animation of animations) {
                            this.animationPool.release(animation);
                        }
                    }
                );

                await this.animationBatcher.executeBatch(batchId);
            }

            // 統計更新
            const executionTime = performance.now() - startTime;
            this.updateAnimationStatistics(executionTime);

        } catch (error) {
            console.error('Optimized skill animation failed:', error);
        }
    }

    /**
     * 最適化されたヒットエフェクト表示
     * @param skill スキル
     * @param target 対象
     * @param damage ダメージ値
     * @returns 実行Promise
     */
    async playOptimizedHitEffect(
        skill: Skill,
        target: any,
        damage: number
    ): Promise<void> {
        // 画面外チェック
        if (this.config.skipOffscreenAnimations && this.isOffscreen(target.position)) {
            return;
        }

        // ダメージ数値表示
        const damageEffect = this.effectPool.acquire('damage_number', 2000);
        if (damageEffect && damageEffect.effect instanceof Phaser.GameObjects.Text) {
            const text = damageEffect.effect as Phaser.GameObjects.Text;
            text.setText(damage.toString());
            text.setPosition(target.position.x, target.position.y - 20);
            text.setVisible(true);

            // フェードアウトアニメーション
            this.scene.tweens.add({
                targets: text,
                y: target.position.y - 50,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    this.effectPool.release(damageEffect);
                }
            });
        }

        // ヒットエフェクト
        const hitEffect = this.animationPool.acquire('particle', {
            texture: 'hit_effect',
            position: target.position,
            particleConfig: {
                scale: { start: 0.5, end: 0 },
                speed: { min: 50, max: 100 },
                lifespan: 500,
                quantity: 10
            }
        });

        if (hitEffect) {
            const emitter = hitEffect.animation as Phaser.GameObjects.Particles.ParticleEmitter;
            emitter.setPosition(target.position.x, target.position.y);
            emitter.start();

            setTimeout(() => {
                emitter.stop();
                this.animationPool.release(hitEffect);
            }, 500);
        }
    }

    /**
     * 継続エフェクト表示
     * @param effect アクティブスキル効果
     * @param target 対象
     */
    showOptimizedContinuousEffect(effect: ActiveSkillEffect, target: any): void {
        // 画面外チェック
        if (this.config.skipOffscreenAnimations && this.isOffscreen(target.position)) {
            return;
        }

        const statusEffect = this.effectPool.acquire('status_icon', effect.remainingDuration * 1000);
        if (statusEffect) {
            const icon = statusEffect.effect as Phaser.GameObjects.Image;
            icon.setPosition(target.position.x + 16, target.position.y - 16);
            icon.setFrame(this.getStatusIconFrame(effect.effectType));
            icon.setVisible(true);

            // 点滅アニメーション
            this.scene.tweens.add({
                targets: icon,
                alpha: 0.5,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }
    }

    /**
     * パーティクル設定を取得
     * @param skill スキル
     * @returns パーティクル設定
     */
    private getParticleConfig(skill: Skill): any {
        const qualityLevel = this.frameRateOptimizer.getCurrentQualityLevel();

        // 品質レベルに応じてパーティクル数を調整
        const baseQuantity = 20;
        const quantity = Math.floor(baseQuantity * (qualityLevel / 5));

        return {
            scale: { start: 1, end: 0 },
            speed: { min: 100, end: 200 },
            lifespan: 1000,
            quantity: Math.max(5, quantity),
            blendMode: 'ADD'
        };
    }

    /**
     * 状態異常アイコンフレームを取得
     * @param effectType 効果種別
     * @returns フレーム番号
     */
    private getStatusIconFrame(effectType: any): number {
        // 効果種別に応じたアイコンフレームを返す
        const frameMap: { [key: string]: number } = {
            'poison': 0,
            'paralysis': 1,
            'sleep': 2,
            'confusion': 3,
            'attack_up': 4,
            'defense_up': 5
        };

        return frameMap[effectType] || 0;
    }

    /**
     * 位置が画面外かチェック
     * @param position 位置
     * @returns 画面外かどうか
     */
    private isOffscreen(position: Position): boolean {
        const camera = this.scene.cameras.main;
        const worldPoint = camera.getWorldPoint(position.x * 32, position.y * 32);

        return worldPoint.x < 0 ||
            worldPoint.x > camera.width ||
            worldPoint.y < 0 ||
            worldPoint.y > camera.height;
    }

    /**
     * アニメーション統計を更新
     * @param executionTime 実行時間
     */
    private updateAnimationStatistics(executionTime: number): void {
        this.statistics.totalAnimationsPlayed++;

        // 平均実行時間を更新
        const totalTime = this.statistics.averageAnimationTime * (this.statistics.totalAnimationsPlayed - 1) + executionTime;
        this.statistics.averageAnimationTime = totalTime / this.statistics.totalAnimationsPlayed;
    }

    /**
     * 統計情報を更新
     */
    private updateStatistics(): void {
        const animationStats = this.animationPool.getStatistics();

        this.statistics.activeAnimations = animationStats.activeAnimations;
        this.statistics.poolUsageRate = animationStats.reuseRate;
        this.statistics.currentFPS = this.frameRateOptimizer.getCurrentFPS();
        this.statistics.frameDrops = this.frameRateOptimizer.getFrameDropCount();
        this.statistics.lastUpdatedAt = new Date();
    }

    /**
     * デバッグ表示を更新
     */
    private updateDebugDisplay(): void {
        // デバッグ情報をコンソールに出力
        if (this.statistics.totalAnimationsPlayed % 60 === 0) { // 1秒に1回
            console.log('[SkillAnimationOptimizer] Stats:', {
                fps: this.statistics.currentFPS.toFixed(1),
                activeAnimations: this.statistics.activeAnimations,
                poolUsage: (this.statistics.poolUsageRate * 100).toFixed(1) + '%',
                skipped: this.statistics.skippedAnimations
            });
        }
    }

    /**
     * 統計情報を取得
     * @returns 統計情報
     */
    getStatistics(): AnimationStatistics {
        return { ...this.statistics };
    }

    /**
     * エフェクトをクリア
     */
    clearEffects(): void {
        this.animationPool.clear();
        this.effectPool.clear();
        this.animationBatcher.clear();
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        if (this.config.enableDebugDisplay) {
            console.log(`[SkillAnimationOptimizer] ${message}`, data || '');
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.clearEffects();
        this.frameRateOptimizer.resetStatistics();
        this.log('SkillAnimationOptimizer destroyed');
    }
}