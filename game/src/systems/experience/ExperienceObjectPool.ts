/**
 * ExperienceObjectPool - レベルアップ演出オブジェクトプール管理
 * 
 * このクラスはレベルアップ演出で使用されるオブジェクトの効率的な管理を担当します:
 * - UI要素のオブジェクトプール
 * - パーティクルエフェクトのプール
 * - テキスト表示オブジェクトのプール
 * - メモリ効率の最適化
 * - オブジェクトの再利用による GC 負荷軽減
 * 
 * 要件: 8.3, 8.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import * as Phaser from 'phaser';

/**
 * プール可能なオブジェクトのインターフェース
 */
interface PoolableObject {
    reset(): void;
    destroy(): void;
    setActive(active: boolean): this;
    setVisible(visible: boolean): this;
}

/**
 * オブジェクトプール統計
 */
export interface PoolStatistics {
    totalCreated: number;
    totalReused: number;
    currentActive: number;
    currentInactive: number;
    peakUsage: number;
    memoryUsage: number;
    reuseRate: number;
    lastOptimized: number;
}

/**
 * プール設定
 */
export interface PoolConfig {
    initialSize: number;
    maxSize: number;
    growthFactor: number;
    shrinkThreshold: number;
    maxIdleTime: number;
    enableStatistics: boolean;
    enableAutoShrink: boolean;
    enablePreallocation: boolean;
}

/**
 * レベルアップエフェクト用のプール可能なコンテナ
 */
class PoolableLevelUpEffect extends Phaser.GameObjects.Container implements PoolableObject {
    private glowCircle: Phaser.GameObjects.Graphics;
    private levelUpText: Phaser.GameObjects.Text;
    private levelText: Phaser.GameObjects.Text;
    private particles: Phaser.GameObjects.Graphics[] = [];
    private isInitialized: boolean = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        this.initializeComponents();
    }

    private initializeComponents(): void {
        if (this.isInitialized) {
            return;
        }

        // 光る円エフェクト
        this.glowCircle = this.scene.add.graphics()
            .setVisible(false);

        // レベルアップテキスト
        this.levelUpText = this.scene.add.text(0, -80, 'LEVEL UP!', {
            fontSize: '32px',
            color: '#ffff00',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        // レベル表示テキスト
        this.levelText = this.scene.add.text(0, -40, '', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false);

        // パーティクル用のグラフィックスを事前作成
        for (let i = 0; i < 20; i++) {
            const particle = this.scene.add.graphics()
                .setVisible(false);
            this.particles.push(particle);
        }

        this.add([this.glowCircle, this.levelUpText, this.levelText, ...this.particles]);
        this.isInitialized = true;
    }

    public setupEffect(oldLevel: number, newLevel: number, glowColor: number = 0xffff00): void {
        // 光る円を設定
        this.glowCircle
            .clear()
            .fillStyle(glowColor, 0.8)
            .fillCircle(0, 0, 50)
            .setVisible(true)
            .setAlpha(1)
            .setScale(1);

        // レベルテキストを設定
        this.levelText
            .setText(`Lv.${oldLevel} → Lv.${newLevel}`)
            .setVisible(true)
            .setAlpha(1)
            .setY(-40);

        // レベルアップテキストを設定
        this.levelUpText
            .setVisible(true)
            .setAlpha(1)
            .setY(-80);

        // パーティクルを設定
        this.particles.forEach((particle, index) => {
            particle
                .clear()
                .fillStyle(0xffff00, 1)
                .fillCircle(0, 0, 3)
                .setVisible(true)
                .setAlpha(1)
                .setPosition(0, 0);
        });

        this.setVisible(true).setActive(true);
    }

    public reset(): void {
        // すべての要素を非表示にしてリセット
        this.glowCircle.setVisible(false).clear();
        this.levelUpText.setVisible(false);
        this.levelText.setVisible(false);

        this.particles.forEach(particle => {
            particle.setVisible(false).clear();
        });

        this.setVisible(false).setActive(false);
        this.setPosition(0, 0);
        this.setAlpha(1);
        this.setScale(1);

        // 進行中のTweenを停止
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.killTweensOf(this.glowCircle);
        this.scene.tweens.killTweensOf(this.levelUpText);
        this.scene.tweens.killTweensOf(this.levelText);
        this.particles.forEach(particle => {
            this.scene.tweens.killTweensOf(particle);
        });
    }
}

/**
 * 経験値獲得ポップアップ用のプール可能なコンテナ
 */
class PoolableExperiencePopup extends Phaser.GameObjects.Container implements PoolableObject {
    private background: Phaser.GameObjects.Graphics;
    private expText: Phaser.GameObjects.Text;
    private sourceText: Phaser.GameObjects.Text;
    private isInitialized: boolean = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        this.initializeComponents();
    }

    private initializeComponents(): void {
        if (this.isInitialized) {
            return;
        }

        // 背景
        this.background = this.scene.add.graphics()
            .setVisible(false);

        // 経験値テキスト
        this.expText = this.scene.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false);

        // ソーステキスト
        this.sourceText = this.scene.add.text(0, 15, '', {
            fontSize: '10px',
            color: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setVisible(false);

        this.add([this.background, this.expText, this.sourceText]);
        this.isInitialized = true;
    }

    public setupPopup(amount: number, source: string, color: string = '#ffffff'): void {
        // 背景を設定
        this.background
            .clear()
            .fillStyle(0x000000, 0.7)
            .fillRoundedRect(-30, -12, 60, 24, 8)
            .lineStyle(1, parseInt(color.replace('#', '0x')), 1)
            .strokeRoundedRect(-30, -12, 60, 24, 8)
            .setVisible(true);

        // テキストを設定
        this.expText
            .setText(`+${amount} EXP`)
            .setColor(color)
            .setVisible(true);

        this.sourceText
            .setText(source)
            .setVisible(true);

        this.setVisible(true).setActive(true);
    }

    public reset(): void {
        this.background.setVisible(false).clear();
        this.expText.setVisible(false);
        this.sourceText.setVisible(false);

        this.setVisible(false).setActive(false);
        this.setPosition(0, 0);
        this.setAlpha(1);
        this.setScale(1);

        // 進行中のTweenを停止
        this.scene.tweens.killTweensOf(this);
    }
}

/**
 * ExperienceObjectPoolクラス
 * 経験値システムのオブジェクトプールを管理
 */
export class ExperienceObjectPool {
    private scene: Phaser.Scene;
    private config: PoolConfig;
    private statistics: PoolStatistics;

    // オブジェクトプール
    private levelUpEffectPool: PoolableLevelUpEffect[] = [];
    private experiencePopupPool: PoolableExperiencePopup[] = [];

    // アクティブオブジェクトの追跡
    private activeLevelUpEffects: Set<PoolableLevelUpEffect> = new Set();
    private activeExperiencePopups: Set<PoolableExperiencePopup> = new Set();

    // 最適化用タイマー
    private optimizationTimer: NodeJS.Timeout | null = null;
    private lastUsageCheck: number = Date.now();

    constructor(scene: Phaser.Scene, config?: Partial<PoolConfig>) {
        this.scene = scene;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.statistics = this.getInitialStatistics();

        this.initializePools();
        this.startOptimizationTimer();
    }

    /**
     * レベルアップエフェクトを取得
     */
    public getLevelUpEffect(): PoolableLevelUpEffect {
        let effect = this.getFromPool(this.levelUpEffectPool);

        if (!effect) {
            effect = new PoolableLevelUpEffect(this.scene);
            this.statistics.totalCreated++;
        } else {
            this.statistics.totalReused++;
        }

        this.activeLevelUpEffects.add(effect);
        this.updateStatistics();

        return effect;
    }

    /**
     * レベルアップエフェクトを返却
     */
    public returnLevelUpEffect(effect: PoolableLevelUpEffect): void {
        if (!this.activeLevelUpEffects.has(effect)) {
            return;
        }

        effect.reset();
        this.activeLevelUpEffects.delete(effect);

        if (this.levelUpEffectPool.length < this.config.maxSize) {
            this.levelUpEffectPool.push(effect);
        } else {
            effect.destroy();
        }

        this.updateStatistics();
    }

    /**
     * 経験値ポップアップを取得
     */
    public getExperiencePopup(): PoolableExperiencePopup {
        let popup = this.getFromPool(this.experiencePopupPool);

        if (!popup) {
            popup = new PoolableExperiencePopup(this.scene);
            this.statistics.totalCreated++;
        } else {
            this.statistics.totalReused++;
        }

        this.activeExperiencePopups.add(popup);
        this.updateStatistics();

        return popup;
    }

    /**
     * 経験値ポップアップを返却
     */
    public returnExperiencePopup(popup: PoolableExperiencePopup): void {
        if (!this.activeExperiencePopups.has(popup)) {
            return;
        }

        popup.reset();
        this.activeExperiencePopups.delete(popup);

        if (this.experiencePopupPool.length < this.config.maxSize) {
            this.experiencePopupPool.push(popup);
        } else {
            popup.destroy();
        }

        this.updateStatistics();
    }

    /**
     * プールサイズを取得
     */
    public getSize(): number {
        return this.levelUpEffectPool.length + this.experiencePopupPool.length;
    }

    /**
     * 統計情報を取得
     */
    public getStatistics(): PoolStatistics {
        return { ...this.statistics };
    }

    /**
     * プールを最適化
     */
    public async optimize(): Promise<void> {
        const beforeSize = this.getSize();

        // 未使用オブジェクトを削除
        this.shrinkPools();

        // メモリ使用量を更新
        this.updateMemoryUsage();

        const afterSize = this.getSize();
        const removed = beforeSize - afterSize;

        this.statistics.lastOptimized = Date.now();

        console.log(`Object pool optimized: ${removed} objects removed`);
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<PoolConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // 最適化タイマーを再設定
        this.stopOptimizationTimer();
        this.startOptimizationTimer();
    }

    /**
     * すべてのプールをクリア
     */
    public clear(): void {
        // アクティブオブジェクトを返却
        this.activeLevelUpEffects.forEach(effect => {
            effect.reset();
        });
        this.activeExperiencePopups.forEach(popup => {
            popup.reset();
        });

        // プール内のオブジェクトを破棄
        this.levelUpEffectPool.forEach(effect => effect.destroy());
        this.experiencePopupPool.forEach(popup => popup.destroy());

        // プールをクリア
        this.levelUpEffectPool.length = 0;
        this.experiencePopupPool.length = 0;
        this.activeLevelUpEffects.clear();
        this.activeExperiencePopups.clear();

        this.resetStatistics();
        console.log('Object pools cleared');
    }

    /**
     * リソースを解放
     */
    public dispose(): void {
        this.stopOptimizationTimer();
        this.clear();
    }

    // プライベートメソッド

    /**
     * デフォルト設定を取得
     */
    private getDefaultConfig(): PoolConfig {
        return {
            initialSize: 5,
            maxSize: 20,
            growthFactor: 1.5,
            shrinkThreshold: 0.3,
            maxIdleTime: 30000, // 30秒
            enableStatistics: true,
            enableAutoShrink: true,
            enablePreallocation: true
        };
    }

    /**
     * 初期統計を取得
     */
    private getInitialStatistics(): PoolStatistics {
        return {
            totalCreated: 0,
            totalReused: 0,
            currentActive: 0,
            currentInactive: 0,
            peakUsage: 0,
            memoryUsage: 0,
            reuseRate: 0,
            lastOptimized: Date.now()
        };
    }

    /**
     * プールを初期化
     */
    private initializePools(): void {
        if (this.config.enablePreallocation) {
            // レベルアップエフェクトプールを事前作成
            for (let i = 0; i < this.config.initialSize; i++) {
                const effect = new PoolableLevelUpEffect(this.scene);
                effect.setActive(false).setVisible(false);
                this.levelUpEffectPool.push(effect);
                this.statistics.totalCreated++;
            }

            // 経験値ポップアッププールを事前作成
            for (let i = 0; i < this.config.initialSize; i++) {
                const popup = new PoolableExperiencePopup(this.scene);
                popup.setActive(false).setVisible(false);
                this.experiencePopupPool.push(popup);
                this.statistics.totalCreated++;
            }

            console.log(`Object pools initialized with ${this.config.initialSize} objects each`);
        }
    }

    /**
     * プールからオブジェクトを取得
     */
    private getFromPool<T extends PoolableObject>(pool: T[]): T | null {
        if (pool.length === 0) {
            return null;
        }

        const obj = pool.pop()!;
        obj.setActive(true);
        return obj;
    }

    /**
     * 統計情報を更新
     */
    private updateStatistics(): void {
        this.statistics.currentActive = this.activeLevelUpEffects.size + this.activeExperiencePopups.size;
        this.statistics.currentInactive = this.levelUpEffectPool.length + this.experiencePopupPool.length;

        if (this.statistics.currentActive > this.statistics.peakUsage) {
            this.statistics.peakUsage = this.statistics.currentActive;
        }

        if (this.statistics.totalCreated > 0) {
            this.statistics.reuseRate = this.statistics.totalReused / this.statistics.totalCreated;
        }

        this.updateMemoryUsage();
    }

    /**
     * メモリ使用量を更新
     */
    private updateMemoryUsage(): void {
        // 概算のメモリ使用量を計算
        const totalObjects = this.statistics.currentActive + this.statistics.currentInactive;
        const avgObjectSize = 1024; // 1KB per object (概算)
        this.statistics.memoryUsage = totalObjects * avgObjectSize;
    }

    /**
     * プールを縮小
     */
    private shrinkPools(): void {
        if (!this.config.enableAutoShrink) {
            return;
        }

        const now = Date.now();
        const idleTime = now - this.lastUsageCheck;

        if (idleTime < this.config.maxIdleTime) {
            return;
        }

        // 使用率が閾値を下回る場合にプールを縮小
        const levelUpUsageRate = this.activeLevelUpEffects.size / (this.levelUpEffectPool.length + this.activeLevelUpEffects.size);
        const popupUsageRate = this.activeExperiencePopups.size / (this.experiencePopupPool.length + this.activeExperiencePopups.size);

        if (levelUpUsageRate < this.config.shrinkThreshold) {
            const targetSize = Math.max(this.config.initialSize, Math.ceil(this.levelUpEffectPool.length * 0.7));
            while (this.levelUpEffectPool.length > targetSize) {
                const effect = this.levelUpEffectPool.pop();
                if (effect) {
                    effect.destroy();
                }
            }
        }

        if (popupUsageRate < this.config.shrinkThreshold) {
            const targetSize = Math.max(this.config.initialSize, Math.ceil(this.experiencePopupPool.length * 0.7));
            while (this.experiencePopupPool.length > targetSize) {
                const popup = this.experiencePopupPool.pop();
                if (popup) {
                    popup.destroy();
                }
            }
        }

        this.lastUsageCheck = now;
    }

    /**
     * 最適化タイマーを開始
     */
    private startOptimizationTimer(): void {
        if (this.config.enableAutoShrink) {
            this.optimizationTimer = setInterval(() => {
                this.shrinkPools();
            }, this.config.maxIdleTime);
        }
    }

    /**
     * 最適化タイマーを停止
     */
    private stopOptimizationTimer(): void {
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = null;
        }
    }

    /**
     * 統計をリセット
     */
    private resetStatistics(): void {
        this.statistics = this.getInitialStatistics();
    }
}