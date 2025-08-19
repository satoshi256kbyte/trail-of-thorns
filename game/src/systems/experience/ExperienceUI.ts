/**
 * ExperienceUI - 経験値・レベルアップUI表示システム
 * 
 * このクラスは経験値システムに関連するすべてのUI表示を管理します:
 * - 経験値獲得ポップアップ表示
 * - レベルアップ演出表示
 * - 経験値バー更新
 * - 成長結果表示
 * - キャラクター経験値情報表示
 * 
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import * as Phaser from 'phaser';
import {
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    ExperienceSource,
    UnitStats
} from '../../types/experience';
import { Unit } from '../../types/gameplay';
import { UserNotification, NotificationType } from './ExperienceErrorHandler';

/**
 * 経験値獲得表示データ
 */
export interface ExperienceGainDisplay {
    characterId: string;
    amount: number;
    source: ExperienceSource;
    position: { x: number; y: number };
    color?: string;
    duration?: number;
}

/**
 * レベルアップ演出設定
 */
export interface LevelUpEffectConfig {
    duration: number;
    glowColor: number;
    particleCount: number;
    soundEnabled: boolean;
    animationSpeed: number;
}

/**
 * 経験値バー設定
 */
export interface ExperienceBarConfig {
    width: number;
    height: number;
    backgroundColor: number;
    fillColor: number;
    borderColor: number;
    borderWidth: number;
    showText: boolean;
    textStyle: Phaser.Types.GameObjects.Text.TextStyle;
}

/**
 * 成長結果表示設定
 */
export interface GrowthResultsConfig {
    panelWidth: number;
    panelHeight: number;
    backgroundColor: number;
    borderColor: number;
    titleStyle: Phaser.Types.GameObjects.Text.TextStyle;
    statStyle: Phaser.Types.GameObjects.Text.TextStyle;
    showAnimation: boolean;
    displayDuration: number;
}

/**
 * ExperienceUIクラス
 * 経験値システムのすべてのUI表示を管理
 */
export class ExperienceUI {
    private scene: Phaser.Scene;
    private uiContainer: Phaser.GameObjects.Container;

    // UI要素のコンテナ
    private experienceGainContainer: Phaser.GameObjects.Container;
    private levelUpEffectContainer: Phaser.GameObjects.Container;
    private experienceBarContainer: Phaser.GameObjects.Container;
    private growthResultsContainer: Phaser.GameObjects.Container;
    private characterInfoContainer: Phaser.GameObjects.Container;

    // 設定
    private levelUpEffectConfig: LevelUpEffectConfig;
    private experienceBarConfig: ExperienceBarConfig;
    private growthResultsConfig: GrowthResultsConfig;

    // UI深度設定
    private readonly UI_DEPTH = 2000;
    private readonly POPUP_DEPTH = 2001;
    private readonly EFFECT_DEPTH = 2002;
    private readonly MODAL_DEPTH = 2003;

    // アクティブな表示要素の追跡
    private activeExperienceGains: Set<Phaser.GameObjects.Container> = new Set();
    private activeLevelUpEffects: Set<Phaser.GameObjects.Container> = new Set();
    private activeExperienceBars: Map<string, Phaser.GameObjects.Container> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // メインUIコンテナを作成
        this.uiContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.UI_DEPTH);

        // 各機能のコンテナを作成
        this.createContainers();

        // デフォルト設定を初期化
        this.initializeConfigs();
    }

    /**
     * 各機能のコンテナを作成
     */
    private createContainers(): void {
        this.experienceGainContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.POPUP_DEPTH);

        this.levelUpEffectContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.EFFECT_DEPTH);

        this.experienceBarContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.UI_DEPTH);

        this.growthResultsContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.MODAL_DEPTH);

        this.characterInfoContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.UI_DEPTH);

        // メインコンテナに追加
        this.uiContainer.add([
            this.experienceBarContainer,
            this.characterInfoContainer,
            this.experienceGainContainer,
            this.levelUpEffectContainer,
            this.growthResultsContainer
        ]);
    }

    /**
     * デフォルト設定を初期化
     */
    private initializeConfigs(): void {
        this.levelUpEffectConfig = {
            duration: 2000,
            glowColor: 0xffff00,
            particleCount: 20,
            soundEnabled: true,
            animationSpeed: 1.0
        };

        this.experienceBarConfig = {
            width: 200,
            height: 20,
            backgroundColor: 0x333333,
            fillColor: 0x00ff00,
            borderColor: 0xffffff,
            borderWidth: 2,
            showText: true,
            textStyle: {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }
        };

        this.growthResultsConfig = {
            panelWidth: 400,
            panelHeight: 300,
            backgroundColor: 0x000000,
            borderColor: 0xffffff,
            titleStyle: {
                fontSize: '24px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            },
            statStyle: {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: 'Arial'
            },
            showAnimation: true,
            displayDuration: 5000
        };
    }

    /**
     * 経験値獲得ポップアップ表示を実装
     * 要件: 6.1
     */
    public showExperienceGain(display: ExperienceGainDisplay): void {
        const { characterId, amount, source, position, color, duration } = display;

        if (amount <= 0) {
            return;
        }

        // 表示色を決定
        const displayColor = color || this.getExperienceSourceColor(source);

        // 表示テキストを作成
        const text = `+${amount} EXP`;

        // ポップアップコンテナを作成
        const popupContainer = this.scene.add.container(position.x, position.y);

        // 背景を作成
        const background = this.scene.add.graphics()
            .fillStyle(0x000000, 0.7)
            .fillRoundedRect(-30, -12, 60, 24, 8)
            .lineStyle(1, parseInt(displayColor.replace('#', '0x')), 1)
            .strokeRoundedRect(-30, -12, 60, 24, 8);

        // テキストを作成
        const expText = this.scene.add.text(0, 0, text, {
            fontSize: '16px',
            color: displayColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // ソース情報を小さく表示
        const sourceText = this.scene.add.text(0, 15, this.getExperienceSourceText(source), {
            fontSize: '10px',
            color: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        popupContainer.add([background, expText, sourceText]);
        this.experienceGainContainer.add(popupContainer);
        this.activeExperienceGains.add(popupContainer);

        // アニメーション
        const animationDuration = duration || 2000;

        // 上昇アニメーション
        this.scene.tweens.add({
            targets: popupContainer,
            y: position.y - 50,
            alpha: 0,
            duration: animationDuration,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.activeExperienceGains.delete(popupContainer);
                popupContainer.destroy();
            }
        });

        // スケールアニメーション
        this.scene.tweens.add({
            targets: popupContainer,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            ease: 'Back.easeOut',
            yoyo: true
        });
    }

    /**
     * レベルアップ演出表示を実装
     * 要件: 6.2
     */
    public async showLevelUpEffect(character: Unit, result: LevelUpResult): Promise<void> {
        return new Promise((resolve) => {
            const characterPosition = this.getCharacterScreenPosition(character);

            // レベルアップエフェクトコンテナを作成
            const effectContainer = this.scene.add.container(characterPosition.x, characterPosition.y);

            // 光る円エフェクト
            const glowCircle = this.scene.add.graphics()
                .fillStyle(this.levelUpEffectConfig.glowColor, 0.8)
                .fillCircle(0, 0, 50);

            // レベルアップテキスト
            const levelUpText = this.scene.add.text(0, -80, 'LEVEL UP!', {
                fontSize: '32px',
                color: '#ffff00',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            // レベル表示
            const levelText = this.scene.add.text(0, -40, `Lv.${result.oldLevel} → Lv.${result.newLevel}`, {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);

            effectContainer.add([glowCircle, levelUpText, levelText]);
            this.levelUpEffectContainer.add(effectContainer);
            this.activeLevelUpEffects.add(effectContainer);

            // パーティクルエフェクト
            this.createLevelUpParticles(characterPosition);

            // アニメーション
            const duration = this.levelUpEffectConfig.duration;

            // 光る円のアニメーション
            this.scene.tweens.add({
                targets: glowCircle,
                scaleX: 2,
                scaleY: 2,
                alpha: 0,
                duration: duration * 0.8,
                ease: 'Power2.easeOut'
            });

            // テキストのアニメーション
            this.scene.tweens.add({
                targets: [levelUpText, levelText],
                y: '-=20',
                alpha: 0,
                duration: duration,
                ease: 'Power2.easeOut',
                delay: duration * 0.3,
                onComplete: () => {
                    this.activeLevelUpEffects.delete(effectContainer);
                    effectContainer.destroy();
                    resolve();
                }
            });

            // 音効果（設定で有効な場合）
            if (this.levelUpEffectConfig.soundEnabled) {
                // TODO: サウンドシステムが実装されたら音を再生
                console.log('Level up sound effect would play here');
            }
        });
    }

    /**
     * 経験値バー更新を実装
     * 要件: 6.3
     */
    public updateExperienceBar(characterId: string, experienceInfo: ExperienceInfo): void {
        let barContainer = this.activeExperienceBars.get(characterId);

        if (!barContainer) {
            barContainer = this.createExperienceBar(characterId);
            this.activeExperienceBars.set(characterId, barContainer);
            this.experienceBarContainer.add(barContainer);
        }

        // バーの要素を取得
        const barBackground = barContainer.getAt(0) as Phaser.GameObjects.Graphics;
        const barFill = barContainer.getAt(1) as Phaser.GameObjects.Graphics;
        const barText = barContainer.getAt(2) as Phaser.GameObjects.Text;

        // 進捗率を計算
        const progress = Math.min(experienceInfo.experienceProgress, 1.0);
        const fillWidth = (this.experienceBarConfig.width - this.experienceBarConfig.borderWidth * 2) * progress;

        // バーの塗りつぶしを更新
        barFill.clear()
            .fillStyle(this.experienceBarConfig.fillColor, 1)
            .fillRect(
                this.experienceBarConfig.borderWidth,
                this.experienceBarConfig.borderWidth,
                fillWidth,
                this.experienceBarConfig.height - this.experienceBarConfig.borderWidth * 2
            );

        // テキストを更新
        if (this.experienceBarConfig.showText) {
            const text = experienceInfo.isMaxLevel
                ? 'MAX LEVEL'
                : `${experienceInfo.currentExperience}/${experienceInfo.currentExperience + experienceInfo.experienceToNextLevel}`;
            barText.setText(text);
        }

        // アニメーション効果
        this.scene.tweens.add({
            targets: barFill,
            alpha: 0.8,
            duration: 200,
            yoyo: true,
            ease: 'Power2.easeInOut'
        });
    }

    /**
     * 成長結果表示を実装
     * 要件: 6.4
     */
    public showGrowthResults(character: Unit, growthResult: StatGrowthResult): void {
        // 既存の成長結果パネルをクリア
        this.growthResultsContainer.removeAll(true);

        const config = this.growthResultsConfig;
        const camera = this.scene.cameras.main;

        // パネル位置を計算
        const panelX = camera.width / 2 - config.panelWidth / 2;
        const panelY = camera.height / 2 - config.panelHeight / 2;

        // パネルコンテナを作成
        const panel = this.scene.add.container(panelX, panelY);

        // 背景を作成
        const background = this.scene.add.graphics()
            .fillStyle(config.backgroundColor, 0.9)
            .fillRoundedRect(0, 0, config.panelWidth, config.panelHeight, 12)
            .lineStyle(3, config.borderColor, 1)
            .strokeRoundedRect(0, 0, config.panelWidth, config.panelHeight, 12);

        // タイトル
        const title = this.scene.add.text(config.panelWidth / 2, 30, 'Stat Growth', config.titleStyle)
            .setOrigin(0.5);

        // キャラクター名
        const characterName = this.scene.add.text(config.panelWidth / 2, 60, character.name, {
            fontSize: '20px',
            color: '#ffff00',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 成長した能力値を表示
        const statNames = ['HP', 'MP', 'Attack', 'Defense', 'Speed', 'Skill', 'Luck'];
        const statKeys: (keyof StatGrowthResult)[] = ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'];

        let yOffset = 100;
        const statTexts: Phaser.GameObjects.Text[] = [];

        statKeys.forEach((key, index) => {
            const growth = growthResult[key];
            if (growth > 0) {
                const statText = this.scene.add.text(
                    config.panelWidth / 2,
                    yOffset,
                    `${statNames[index]}: +${growth}`,
                    {
                        ...config.statStyle,
                        color: '#00ff00'
                    }
                ).setOrigin(0.5);

                statTexts.push(statText);
                yOffset += 25;
            }
        });

        // 成長がない場合のメッセージ
        if (statTexts.length === 0) {
            const noGrowthText = this.scene.add.text(
                config.panelWidth / 2,
                yOffset,
                'No stat growth this level',
                {
                    ...config.statStyle,
                    color: '#cccccc'
                }
            ).setOrigin(0.5);
            statTexts.push(noGrowthText);
        }

        // 閉じるボタン
        const closeButton = this.scene.add.text(
            config.panelWidth / 2,
            config.panelHeight - 40,
            'Continue',
            {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'Arial',
                backgroundColor: '#444444',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.hideGrowthResults();
            })
            .on('pointerover', () => {
                closeButton.setBackgroundColor('#666666');
            })
            .on('pointerout', () => {
                closeButton.setBackgroundColor('#444444');
            });

        // パネルに要素を追加
        panel.add([background, title, characterName, ...statTexts, closeButton]);
        this.growthResultsContainer.add(panel);

        // アニメーション表示
        if (config.showAnimation) {
            panel.setAlpha(0).setScale(0.8);

            this.scene.tweens.add({
                targets: panel,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 300,
                ease: 'Back.easeOut'
            });

            // 能力値テキストを順次表示
            statTexts.forEach((text, index) => {
                text.setAlpha(0);
                this.scene.tweens.add({
                    targets: text,
                    alpha: 1,
                    duration: 200,
                    delay: 500 + index * 100,
                    ease: 'Power2.easeOut'
                });
            });
        }

        // 自動非表示タイマー
        this.scene.time.delayedCall(config.displayDuration, () => {
            this.hideGrowthResults();
        });
    }

    /**
     * キャラクター経験値情報表示を実装
     * 要件: 6.5
     */
    public displayExperienceInfo(character: Unit, experienceInfo: ExperienceInfo): void {
        // 既存の情報パネルをクリア
        this.characterInfoContainer.removeAll(true);

        const camera = this.scene.cameras.main;
        const panelWidth = 250;
        const panelHeight = 120;
        const x = camera.width - panelWidth - 20;
        const y = camera.height - panelHeight - 20;

        // パネルコンテナを作成
        const infoPanel = this.scene.add.container(x, y);

        // 背景
        const background = this.scene.add.graphics()
            .fillStyle(0x000000, 0.8)
            .fillRoundedRect(0, 0, panelWidth, panelHeight, 8)
            .lineStyle(2, 0x00ff00, 1)
            .strokeRoundedRect(0, 0, panelWidth, panelHeight, 8);

        // キャラクター名とレベル
        const nameText = this.scene.add.text(15, 15, `${character.name} (Lv.${experienceInfo.currentLevel})`, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // 経験値情報
        const expText = experienceInfo.isMaxLevel
            ? 'MAX LEVEL'
            : `EXP: ${experienceInfo.currentExperience}/${experienceInfo.currentExperience + experienceInfo.experienceToNextLevel}`;

        const experienceText = this.scene.add.text(15, 40, expText, {
            fontSize: '14px',
            color: '#00ff00',
            fontFamily: 'Arial'
        });

        // 経験値バー
        const barY = 65;
        const barWidth = panelWidth - 30;
        const barHeight = 12;

        const expBarBackground = this.scene.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRect(15, barY, barWidth, barHeight)
            .lineStyle(1, 0xffffff, 1)
            .strokeRect(15, barY, barWidth, barHeight);

        if (!experienceInfo.isMaxLevel) {
            const fillWidth = barWidth * experienceInfo.experienceProgress;
            const expBarFill = this.scene.add.graphics()
                .fillStyle(0x00ff00, 1)
                .fillRect(15, barY, fillWidth, barHeight);

            infoPanel.add(expBarFill);
        }

        // 次のレベルまでの情報
        const nextLevelText = experienceInfo.isMaxLevel
            ? ''
            : `To next: ${experienceInfo.experienceToNextLevel} EXP`;

        const nextText = this.scene.add.text(15, 85, nextLevelText, {
            fontSize: '12px',
            color: '#cccccc',
            fontFamily: 'Arial'
        });

        // パネルに要素を追加
        infoPanel.add([background, nameText, experienceText, expBarBackground, nextText]);
        this.characterInfoContainer.add(infoPanel);
    }

    /**
     * 成長結果パネルを非表示
     */
    public hideGrowthResults(): void {
        this.growthResultsContainer.removeAll(true);
    }

    /**
     * キャラクター経験値情報を非表示
     */
    public hideExperienceInfo(): void {
        this.characterInfoContainer.removeAll(true);
    }

    /**
     * 経験値バーを非表示
     */
    public hideExperienceBar(characterId: string): void {
        const barContainer = this.activeExperienceBars.get(characterId);
        if (barContainer) {
            barContainer.destroy();
            this.activeExperienceBars.delete(characterId);
        }
    }

    /**
     * すべてのUI要素をクリア
     */
    public clearAll(): void {
        this.experienceGainContainer.removeAll(true);
        this.levelUpEffectContainer.removeAll(true);
        this.experienceBarContainer.removeAll(true);
        this.growthResultsContainer.removeAll(true);
        this.characterInfoContainer.removeAll(true);

        this.activeExperienceGains.clear();
        this.activeLevelUpEffects.clear();
        this.activeExperienceBars.clear();
    }

    /**
     * UI要素を破棄
     */
    public destroy(): void {
        this.clearAll();
        this.uiContainer.destroy();
    }

    /**
     * 画面サイズ変更時の調整
     */
    public resize(width: number, height: number): void {
        // 経験値情報パネルの位置を調整
        if (this.characterInfoContainer.list.length > 0) {
            const panel = this.characterInfoContainer.list[0] as Phaser.GameObjects.Container;
            panel.setPosition(width - 270, height - 140);
        }
    }

    // ヘルパーメソッド

    /**
     * 経験値ソースに応じた色を取得
     */
    private getExperienceSourceColor(source: ExperienceSource): string {
        switch (source) {
            case ExperienceSource.ATTACK_HIT:
                return '#ff6666';
            case ExperienceSource.ENEMY_DEFEAT:
                return '#ffff00';
            case ExperienceSource.ALLY_SUPPORT:
                return '#66ff66';
            case ExperienceSource.HEALING:
                return '#66ffff';
            case ExperienceSource.SKILL_USE:
                return '#ff66ff';
            default:
                return '#ffffff';
        }
    }

    /**
     * 経験値ソースのテキストを取得
     */
    private getExperienceSourceText(source: ExperienceSource): string {
        switch (source) {
            case ExperienceSource.ATTACK_HIT:
                return 'Hit';
            case ExperienceSource.ENEMY_DEFEAT:
                return 'Defeat';
            case ExperienceSource.ALLY_SUPPORT:
                return 'Support';
            case ExperienceSource.HEALING:
                return 'Heal';
            case ExperienceSource.SKILL_USE:
                return 'Skill';
            default:
                return 'EXP';
        }
    }

    /**
     * キャラクターのスクリーン座標を取得
     */
    private getCharacterScreenPosition(character: Unit): { x: number; y: number } {
        // TODO: 実際のキャラクター位置からスクリーン座標を計算
        // 現在はダミー実装
        return {
            x: character.position.x * 32 + 16,
            y: character.position.y * 32 + 16
        };
    }

    /**
     * 経験値バーを作成
     */
    private createExperienceBar(characterId: string): Phaser.GameObjects.Container {
        const config = this.experienceBarConfig;
        const container = this.scene.add.container(0, 0);

        // 背景
        const background = this.scene.add.graphics()
            .fillStyle(config.backgroundColor, 1)
            .fillRect(0, 0, config.width, config.height)
            .lineStyle(config.borderWidth, config.borderColor, 1)
            .strokeRect(0, 0, config.width, config.height);

        // 塗りつぶし部分
        const fill = this.scene.add.graphics();

        // テキスト
        const text = this.scene.add.text(config.width / 2, config.height / 2, '', config.textStyle)
            .setOrigin(0.5);

        container.add([background, fill, text]);
        return container;
    }

    /**
     * レベルアップパーティクルエフェクトを作成
     */
    private createLevelUpParticles(position: { x: number; y: number }): void {
        const particleCount = this.levelUpEffectConfig.particleCount;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.graphics()
                .fillStyle(0xffff00, 1)
                .fillCircle(0, 0, 3);

            particle.setPosition(position.x, position.y);
            this.levelUpEffectContainer.add(particle);

            // ランダムな方向に飛ばす
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 50 + Math.random() * 50;
            const targetX = position.x + Math.cos(angle) * distance;
            const targetY = position.y + Math.sin(angle) * distance;

            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                duration: 1000 + Math.random() * 500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    /**
     * 設定を更新
     */
    public updateConfig(config: Partial<{
        levelUpEffect: Partial<LevelUpEffectConfig>;
        experienceBar: Partial<ExperienceBarConfig>;
        growthResults: Partial<GrowthResultsConfig>;
    }>): void {
        if (config.levelUpEffect) {
            this.levelUpEffectConfig = { ...this.levelUpEffectConfig, ...config.levelUpEffect };
        }

        if (config.experienceBar) {
            this.experienceBarConfig = { ...this.experienceBarConfig, ...config.experienceBar };
        }

        if (config.growthResults) {
            this.growthResultsConfig = { ...this.growthResultsConfig, ...config.growthResults };
        }
    }

    /**
     * ユーザー通知を表示
     * エラーハンドリングシステムからの通知を表示
     */
    public showUserNotification(notification: UserNotification): void {
        try {
            const notificationContainer = this.scene.add.container(0, 0);
            notificationContainer.setDepth(this.POPUP_DEPTH + 100);

            // 通知パネルの背景色を決定
            const backgroundColor = this.getNotificationBackgroundColor(notification.type);
            const borderColor = this.getNotificationBorderColor(notification.type);

            // 通知パネルを作成
            const panelWidth = 400;
            const panelHeight = notification.details ? 150 : 100;
            const panelX = this.scene.cameras.main.width - panelWidth - 20;
            const panelY = 20;

            const panel = this.scene.add.graphics();
            panel.fillStyle(backgroundColor, 0.9);
            panel.lineStyle(2, borderColor, 1);
            panel.fillRoundedRect(0, 0, panelWidth, panelHeight, 8);
            panel.strokeRoundedRect(0, 0, panelWidth, panelHeight, 8);

            // タイトルテキスト
            const titleText = this.scene.add.text(15, 15, notification.title, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            });

            // メッセージテキスト
            const messageText = this.scene.add.text(15, 40, notification.message, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff',
                wordWrap: { width: panelWidth - 30 }
            });

            // 詳細テキスト（存在する場合）
            let detailsText: Phaser.GameObjects.Text | null = null;
            if (notification.details) {
                detailsText = this.scene.add.text(15, 80, notification.details, {
                    fontSize: '12px',
                    fontFamily: 'Arial',
                    color: '#cccccc',
                    wordWrap: { width: panelWidth - 30 }
                });
            }

            // 通知アイコン
            const iconText = this.scene.add.text(panelWidth - 30, 15, this.getNotificationIcon(notification.type), {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });

            // コンテナに追加
            notificationContainer.add([panel, titleText, messageText, iconText]);
            if (detailsText) {
                notificationContainer.add(detailsText);
            }

            // 位置を設定
            notificationContainer.setPosition(panelX, panelY);

            // アニメーション: スライドイン
            notificationContainer.setX(this.scene.cameras.main.width);
            this.scene.tweens.add({
                targets: notificationContainer,
                x: panelX,
                duration: 300,
                ease: 'Power2'
            });

            // 自動非表示の設定
            if (notification.autoHide !== false) {
                const duration = notification.duration || 5000;
                this.scene.time.delayedCall(duration, () => {
                    this.hideNotification(notificationContainer);
                });
            }

            // クリックで閉じる機能
            panel.setInteractive(new Phaser.Geom.Rectangle(0, 0, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains);
            panel.on('pointerdown', () => {
                this.hideNotification(notificationContainer);
            });

            // 推奨アクションボタン（存在する場合）
            if (notification.suggestedActions && notification.suggestedActions.length > 0) {
                this.addActionButtons(notificationContainer, notification.suggestedActions, panelWidth, panelHeight);
            }

            console.log(`User notification displayed: ${notification.title}`);

        } catch (error) {
            console.error('Failed to show user notification:', error);
            // フォールバック: コンソールに通知内容を出力
            console.warn(`[Notification] ${notification.title}: ${notification.message}`);
        }
    }

    /**
     * 通知を非表示にする
     */
    private hideNotification(notificationContainer: Phaser.GameObjects.Container): void {
        this.scene.tweens.add({
            targets: notificationContainer,
            x: this.scene.cameras.main.width,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                notificationContainer.destroy();
            }
        });
    }

    /**
     * 通知タイプに応じた背景色を取得
     */
    private getNotificationBackgroundColor(type: NotificationType): number {
        switch (type) {
            case NotificationType.ERROR:
                return 0x8B0000; // ダークレッド
            case NotificationType.WARNING:
                return 0xFF8C00; // ダークオレンジ
            case NotificationType.SUCCESS:
                return 0x006400; // ダークグリーン
            case NotificationType.INFO:
            default:
                return 0x1E3A8A; // ダークブルー
        }
    }

    /**
     * 通知タイプに応じた境界線色を取得
     */
    private getNotificationBorderColor(type: NotificationType): number {
        switch (type) {
            case NotificationType.ERROR:
                return 0xFF0000; // レッド
            case NotificationType.WARNING:
                return 0xFFA500; // オレンジ
            case NotificationType.SUCCESS:
                return 0x00FF00; // グリーン
            case NotificationType.INFO:
            default:
                return 0x3B82F6; // ブルー
        }
    }

    /**
     * 通知タイプに応じたアイコンを取得
     */
    private getNotificationIcon(type: NotificationType): string {
        switch (type) {
            case NotificationType.ERROR:
                return '⚠';
            case NotificationType.WARNING:
                return '⚠';
            case NotificationType.SUCCESS:
                return '✓';
            case NotificationType.INFO:
            default:
                return 'ℹ';
        }
    }

    /**
     * 推奨アクションボタンを追加
     */
    private addActionButtons(
        container: Phaser.GameObjects.Container,
        actions: string[],
        panelWidth: number,
        panelHeight: number
    ): void {
        const buttonHeight = 25;
        const buttonSpacing = 5;
        const startY = panelHeight - (actions.length * (buttonHeight + buttonSpacing)) - 10;

        actions.forEach((action, index) => {
            const buttonY = startY + (index * (buttonHeight + buttonSpacing));

            const button = this.scene.add.graphics();
            button.fillStyle(0x4A5568, 0.8);
            button.lineStyle(1, 0x718096, 1);
            button.fillRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);
            button.strokeRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);

            const buttonText = this.scene.add.text(panelWidth / 2, buttonY + buttonHeight / 2, action, {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5);

            button.setInteractive(
                new Phaser.Geom.Rectangle(15, buttonY, panelWidth - 30, buttonHeight),
                Phaser.Geom.Rectangle.Contains
            );

            button.on('pointerdown', () => {
                console.log(`Action selected: ${action}`);
                // アクション実行のイベントを発行
                this.scene.events.emit('notification-action-selected', action);
                this.hideNotification(container);
            });

            button.on('pointerover', () => {
                button.clear();
                button.fillStyle(0x5A6578, 0.9);
                button.lineStyle(1, 0x718096, 1);
                button.fillRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);
                button.strokeRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);
            });

            button.on('pointerout', () => {
                button.clear();
                button.fillStyle(0x4A5568, 0.8);
                button.lineStyle(1, 0x718096, 1);
                button.fillRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);
                button.strokeRoundedRect(15, buttonY, panelWidth - 30, buttonHeight, 4);
            });

            container.add([button, buttonText]);
        });
    }

    /**
     * エラー回復ガイダンスを表示
     */
    public showRecoveryGuidance(
        title: string,
        message: string,
        steps: string[],
        onComplete?: () => void
    ): void {
        try {
            const guidanceContainer = this.scene.add.container(0, 0);
            guidanceContainer.setDepth(this.POPUP_DEPTH + 200);

            const panelWidth = 500;
            const panelHeight = 300;
            const panelX = (this.scene.cameras.main.width - panelWidth) / 2;
            const panelY = (this.scene.cameras.main.height - panelHeight) / 2;

            // 背景オーバーレイ
            const overlay = this.scene.add.graphics();
            overlay.fillStyle(0x000000, 0.7);
            overlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);

            // ガイダンスパネル
            const panel = this.scene.add.graphics();
            panel.fillStyle(0x2D3748, 0.95);
            panel.lineStyle(2, 0x4A5568, 1);
            panel.fillRoundedRect(0, 0, panelWidth, panelHeight, 12);
            panel.strokeRoundedRect(0, 0, panelWidth, panelHeight, 12);

            // タイトル
            const titleText = this.scene.add.text(panelWidth / 2, 30, title, {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // メッセージ
            const messageText = this.scene.add.text(30, 70, message, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff',
                wordWrap: { width: panelWidth - 60 }
            });

            // ステップリスト
            let currentY = 120;
            steps.forEach((step, index) => {
                const stepText = this.scene.add.text(50, currentY, `${index + 1}. ${step}`, {
                    fontSize: '13px',
                    fontFamily: 'Arial',
                    color: '#E2E8F0',
                    wordWrap: { width: panelWidth - 80 }
                });
                currentY += stepText.height + 10;
            });

            // 完了ボタン
            const buttonWidth = 100;
            const buttonHeight = 35;
            const buttonX = (panelWidth - buttonWidth) / 2;
            const buttonY = panelHeight - 50;

            const completeButton = this.scene.add.graphics();
            completeButton.fillStyle(0x3182CE, 0.9);
            completeButton.lineStyle(1, 0x4299E1, 1);
            completeButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 6);
            completeButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 6);

            const completeButtonText = this.scene.add.text(
                buttonX + buttonWidth / 2,
                buttonY + buttonHeight / 2,
                '完了',
                {
                    fontSize: '14px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5);

            completeButton.setInteractive(
                new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
                Phaser.Geom.Rectangle.Contains
            );

            completeButton.on('pointerdown', () => {
                guidanceContainer.destroy();
                if (onComplete) {
                    onComplete();
                }
            });

            // コンテナに追加
            guidanceContainer.add([
                overlay, panel, titleText, messageText, completeButton, completeButtonText
            ]);

            // ステップテキストを追加
            steps.forEach((step, index) => {
                const stepText = this.scene.add.text(50, 120 + (index * 25), `${index + 1}. ${step}`, {
                    fontSize: '13px',
                    fontFamily: 'Arial',
                    color: '#E2E8F0',
                    wordWrap: { width: panelWidth - 80 }
                });
                guidanceContainer.add(stepText);
            });

            guidanceContainer.setPosition(panelX, panelY);

            // フェードイン
            guidanceContainer.setAlpha(0);
            this.scene.tweens.add({
                targets: guidanceContainer,
                alpha: 1,
                duration: 300,
                ease: 'Power2'
            });

            console.log(`Recovery guidance displayed: ${title}`);

        } catch (error) {
            console.error('Failed to show recovery guidance:', error);
        }
    }

    /**
     * デバッグ情報を取得
     */
    public getDebugInfo(): {
        activeGains: number;
        activeEffects: number;
        activeBars: number;
        containerVisible: boolean;
    } {
        return {
            activeGains: this.activeExperienceGains.size,
            activeEffects: this.activeLevelUpEffects.size,
            activeBars: this.activeExperienceBars.size,
            containerVisible: this.uiContainer.visible
        };
    }
}