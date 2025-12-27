/**
 * ボス情報UIシステム
 * ボス登場演出、HPバー表示、フェーズ表示、撃破演出、薔薇の力獲得演出を管理
 */

import Phaser from 'phaser';
import { BossData, RoseEssenceType } from '../../types/boss';
import { Unit } from '../../types/gameplay';

/**
 * ボスUI設定
 */
export interface BossUIConfig {
  // HPバー設定
  healthBarX: number;
  healthBarY: number;
  healthBarWidth: number;
  healthBarHeight: number;
  healthBarBackgroundColor: number;
  healthBarHealthColor: number;
  healthBarBorderColor: number;
  healthBarBorderWidth: number;

  // 演出設定
  introductionDuration: number;
  defeatDuration: number;
  phaseChangeDuration: number;
  roseEssenceGainDuration: number;

  // アニメーション設定
  fadeInDuration: number;
  fadeOutDuration: number;

  // UI深度
  uiDepth: number;
}

/**
 * ボスHPバー要素
 */
interface BossHealthBarElements {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  healthBar: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  phaseText?: Phaser.GameObjects.Text;
  maxWidth: number;
}

/**
 * ボス情報UIクラス
 */
export class BossUI extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: BossUIConfig;

  // UI要素
  private bossHealthBars: Map<string, BossHealthBarElements>;
  private activeEffects: Set<Phaser.GameObjects.GameObject>;
  private effectsContainer: Phaser.GameObjects.Container;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: BossUIConfig = {
    healthBarX: 400,
    healthBarY: 50,
    healthBarWidth: 400,
    healthBarHeight: 30,
    healthBarBackgroundColor: 0x000000,
    healthBarHealthColor: 0xff0000,
    healthBarBorderColor: 0xffffff,
    healthBarBorderWidth: 2,
    introductionDuration: 3000,
    defeatDuration: 3000,
    phaseChangeDuration: 2000,
    roseEssenceGainDuration: 3000,
    fadeInDuration: 500,
    fadeOutDuration: 500,
    uiDepth: 1000,
  };

  constructor(scene: Phaser.Scene, config?: Partial<BossUIConfig>) {
    super();
    this.scene = scene;
    this.config = { ...BossUI.DEFAULT_CONFIG, ...config };
    this.bossHealthBars = new Map();
    this.activeEffects = new Set();
    this.effectsContainer = scene.add.container(0, 0);
    this.effectsContainer.setDepth(this.config.uiDepth);

    console.log('[BossUI] Initialized');
  }

  /**
   * ボス登場演出UIを表示
   * @param boss ボスユニット
   * @param bossData ボスデータ
   * @returns 演出完了のPromise
   */
  async showBossIntroduction(boss: Unit, bossData: BossData): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log(`[BossUI] Showing boss introduction for ${bossData.name}`);

        // 画面を暗転
        const overlay = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0x000000,
          0
        );
        overlay.setDepth(this.config.uiDepth - 1);
        this.activeEffects.add(overlay);

        // 暗転アニメーション
        this.scene.tweens.add({
          targets: overlay,
          alpha: 0.8,
          duration: this.config.fadeInDuration,
          ease: 'Power2',
          onComplete: () => {
            // ボス名表示
            const bossNameText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY - 60,
              bossData.name,
              {
                fontSize: '56px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6,
                shadow: {
                  offsetX: 3,
                  offsetY: 3,
                  color: '#000000',
                  blur: 5,
                  fill: true,
                },
              }
            );
            bossNameText.setOrigin(0.5);
            bossNameText.setDepth(this.config.uiDepth + 1);
            bossNameText.setAlpha(0);
            this.activeEffects.add(bossNameText);

            // ボスタイトル表示
            const bossTitleText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY + 20,
              bossData.title,
              {
                fontSize: '28px',
                color: '#ffffff',
                fontStyle: 'italic',
                stroke: '#000000',
                strokeThickness: 3,
              }
            );
            bossTitleText.setOrigin(0.5);
            bossTitleText.setDepth(this.config.uiDepth + 1);
            bossTitleText.setAlpha(0);
            this.activeEffects.add(bossTitleText);

            // ボス説明表示
            if (bossData.description) {
              const descriptionText = this.scene.add.text(
                this.scene.cameras.main.centerX,
                this.scene.cameras.main.centerY + 70,
                bossData.description,
                {
                  fontSize: '18px',
                  color: '#cccccc',
                  align: 'center',
                  wordWrap: { width: 600 },
                }
              );
              descriptionText.setOrigin(0.5);
              descriptionText.setDepth(this.config.uiDepth + 1);
              descriptionText.setAlpha(0);
              this.activeEffects.add(descriptionText);

              // テキストフェードイン（説明付き）
              this.scene.tweens.add({
                targets: [bossNameText, bossTitleText, descriptionText],
                alpha: 1,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                  this.completeIntroduction(
                    overlay,
                    [bossNameText, bossTitleText, descriptionText],
                    resolve
                  );
                },
              });
            } else {
              // テキストフェードイン（説明なし）
              this.scene.tweens.add({
                targets: [bossNameText, bossTitleText],
                alpha: 1,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                  this.completeIntroduction(overlay, [bossNameText, bossTitleText], resolve);
                },
              });
            }
          },
        });

        this.emit('boss-introduction-started', { bossId: boss.id, bossName: bossData.name });
      } catch (error) {
        console.error('[BossUI] Error showing boss introduction:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * 登場演出を完了
   */
  private completeIntroduction(
    overlay: Phaser.GameObjects.Rectangle,
    textElements: Phaser.GameObjects.Text[],
    resolve: () => void
  ): void {
    // 少し待機
    this.scene.time.delayedCall(
      this.config.introductionDuration - this.config.fadeInDuration - this.config.fadeOutDuration,
      () => {
        // フェードアウト
        this.scene.tweens.add({
          targets: [overlay, ...textElements],
          alpha: 0,
          duration: this.config.fadeOutDuration,
          ease: 'Power2',
          onComplete: () => {
            // クリーンアップ
            overlay.destroy();
            textElements.forEach((text) => text.destroy());
            this.activeEffects.delete(overlay);
            textElements.forEach((text) => this.activeEffects.delete(text));
            resolve();
            this.emit('boss-introduction-completed');
          },
        });
      }
    );
  }

  /**
   * ボスHPバーを表示
   * @param boss ボスユニット
   * @param bossData ボスデータ
   */
  showBossHealthBar(boss: Unit, bossData: BossData): void {
    try {
      console.log(`[BossUI] Showing boss health bar for ${bossData.name}`);

      // 既存のHPバーがあれば削除
      if (this.bossHealthBars.has(boss.id)) {
        this.hideBossHealthBar(boss.id);
      }

      // HPバーコンテナを作成
      const healthBarContainer = this.scene.add.container(
        this.config.healthBarX,
        this.config.healthBarY
      );
      healthBarContainer.setDepth(this.config.uiDepth - 10);

      // 背景
      const background = this.scene.add.rectangle(
        0,
        0,
        this.config.healthBarWidth,
        this.config.healthBarHeight,
        this.config.healthBarBackgroundColor
      );

      // HPバー
      const healthBar = this.scene.add.rectangle(
        -this.config.healthBarWidth / 2,
        0,
        this.config.healthBarWidth,
        this.config.healthBarHeight,
        this.config.healthBarHealthColor
      );
      healthBar.setOrigin(0, 0.5);

      // 枠線
      const border = this.scene.add.rectangle(
        0,
        0,
        this.config.healthBarWidth,
        this.config.healthBarHeight
      );
      border.setStrokeStyle(this.config.healthBarBorderWidth, this.config.healthBarBorderColor);
      border.setFillStyle(0x000000, 0);

      // ボス名テキスト
      const nameText = this.scene.add.text(
        -this.config.healthBarWidth / 2,
        -this.config.healthBarHeight / 2 - 25,
        bossData.name,
        {
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        }
      );

      // HP数値テキスト
      const hpText = this.scene.add.text(
        0,
        0,
        `${boss.currentHP} / ${boss.stats.maxHP}`,
        {
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        }
      );
      hpText.setOrigin(0.5);

      // フェーズテキスト（初期は非表示）
      const phaseText = this.scene.add.text(
        this.config.healthBarWidth / 2 + 10,
        0,
        `Phase ${bossData.currentPhase}`,
        {
          fontSize: '16px',
          color: '#ffaa00',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        }
      );
      phaseText.setOrigin(0, 0.5);

      // コンテナに追加
      healthBarContainer.add([background, healthBar, border, nameText, hpText, phaseText]);

      // データを保存
      const elements: BossHealthBarElements = {
        container: healthBarContainer,
        background,
        healthBar,
        border,
        nameText,
        hpText,
        phaseText,
        maxWidth: this.config.healthBarWidth,
      };

      this.bossHealthBars.set(boss.id, elements);

      // 初期HP更新
      this.updateBossHealthBar(boss);

      // フェードイン
      healthBarContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: healthBarContainer,
        alpha: 1,
        duration: this.config.fadeInDuration,
        ease: 'Power2',
      });

      this.emit('boss-health-bar-shown', { bossId: boss.id, bossName: bossData.name });
    } catch (error) {
      console.error('[BossUI] Error showing boss health bar:', error);
    }
  }

  /**
   * ボスHPバーを更新
   * @param boss ボスユニット
   */
  updateBossHealthBar(boss: Unit): void {
    try {
      const elements = this.bossHealthBars.get(boss.id);
      if (!elements) {
        return;
      }

      // HP割合を計算
      const hpPercentage = Math.max(0, boss.currentHP / boss.stats.maxHP);

      // HPバーの幅を更新
      const newWidth = elements.maxWidth * hpPercentage;
      this.scene.tweens.add({
        targets: elements.healthBar,
        width: newWidth,
        duration: 300,
        ease: 'Power2',
      });

      // HP数値を更新
      elements.hpText.setText(`${Math.max(0, boss.currentHP)} / ${boss.stats.maxHP}`);

      // HPが低い場合は色を変更
      if (hpPercentage < 0.3) {
        elements.healthBar.setFillStyle(0xff0000); // 赤
      } else if (hpPercentage < 0.6) {
        elements.healthBar.setFillStyle(0xffaa00); // オレンジ
      } else {
        elements.healthBar.setFillStyle(this.config.healthBarHealthColor);
      }

      this.emit('boss-health-bar-updated', {
        bossId: boss.id,
        currentHP: boss.currentHP,
        maxHP: boss.stats.maxHP,
        percentage: hpPercentage,
      });
    } catch (error) {
      console.error('[BossUI] Error updating boss health bar:', error);
    }
  }

  /**
   * ボスHPバーを非表示
   * @param bossId ボスID
   */
  hideBossHealthBar(bossId: string): void {
    try {
      const elements = this.bossHealthBars.get(bossId);
      if (elements) {
        this.scene.tweens.add({
          targets: elements.container,
          alpha: 0,
          duration: this.config.fadeOutDuration,
          ease: 'Power2',
          onComplete: () => {
            elements.container.destroy();
            this.bossHealthBars.delete(bossId);
            this.emit('boss-health-bar-hidden', { bossId });
          },
        });
      }
    } catch (error) {
      console.error('[BossUI] Error hiding boss health bar:', error);
    }
  }

  /**
   * ボスフェーズを表示
   * @param phase 現在のフェーズ番号
   * @param totalPhases 総フェーズ数
   */
  showBossPhase(phase: number, totalPhases: number): void {
    try {
      console.log(`[BossUI] Showing boss phase ${phase}/${totalPhases}`);

      // 全てのHPバーのフェーズテキストを更新
      this.bossHealthBars.forEach((elements) => {
        if (elements.phaseText) {
          elements.phaseText.setText(`Phase ${phase}/${totalPhases}`);

          // フェーズテキストを強調
          this.scene.tweens.add({
            targets: elements.phaseText,
            scale: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
          });
        }
      });

      // フェーズ変化通知を画面中央に表示
      const phaseNotification = this.scene.add.text(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY - 100,
        `フェーズ ${phase}`,
        {
          fontSize: '48px',
          color: '#ff0000',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 4,
            fill: true,
          },
        }
      );
      phaseNotification.setOrigin(0.5);
      phaseNotification.setDepth(this.config.uiDepth + 1);
      phaseNotification.setAlpha(0);
      phaseNotification.setScale(0.5);
      this.activeEffects.add(phaseNotification);

      // アニメーション
      this.scene.tweens.add({
        targets: phaseNotification,
        alpha: 1,
        scale: 1.2,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 少し待機してフェードアウト
          this.scene.time.delayedCall(1500, () => {
            this.scene.tweens.add({
              targets: phaseNotification,
              alpha: 0,
              scale: 0.8,
              duration: 300,
              ease: 'Power2',
              onComplete: () => {
                phaseNotification.destroy();
                this.activeEffects.delete(phaseNotification);
              },
            });
          });
        },
      });

      this.emit('boss-phase-shown', { phase, totalPhases });
    } catch (error) {
      console.error('[BossUI] Error showing boss phase:', error);
    }
  }

  /**
   * ボス撃破演出UIを表示
   * @param boss 撃破されたボスユニット
   * @param bossData ボスデータ
   * @returns 演出完了のPromise
   */
  async showBossDefeatCutscene(boss: Unit, bossData: BossData): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log(`[BossUI] Showing boss defeat cutscene for ${bossData.name}`);

        // HPバーを非表示
        this.hideBossHealthBar(boss.id);

        // 撃破エフェクト（フラッシュ）
        const flash = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0xffffff,
          0
        );
        flash.setDepth(this.config.uiDepth - 1);
        this.activeEffects.add(flash);

        // 画面シェイク
        this.scene.cameras.main.shake(500, 0.015);

        // フラッシュアニメーション
        this.scene.tweens.add({
          targets: flash,
          alpha: 0.9,
          duration: 150,
          yoyo: true,
          repeat: 3,
          ease: 'Power2',
          onComplete: () => {
            // 撃破メッセージ表示
            const defeatText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY - 40,
              `${bossData.name}`,
              {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5,
              }
            );
            defeatText.setOrigin(0.5);
            defeatText.setDepth(this.config.uiDepth + 1);
            defeatText.setAlpha(0);
            this.activeEffects.add(defeatText);

            const defeatedText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY + 30,
              '撃破！',
              {
                fontSize: '64px',
                color: '#ffff00',
                fontStyle: 'bold',
                stroke: '#ff0000',
                strokeThickness: 6,
                shadow: {
                  offsetX: 4,
                  offsetY: 4,
                  color: '#000000',
                  blur: 8,
                  fill: true,
                },
              }
            );
            defeatedText.setOrigin(0.5);
            defeatedText.setDepth(this.config.uiDepth + 1);
            defeatedText.setAlpha(0);
            defeatedText.setScale(0.5);
            this.activeEffects.add(defeatedText);

            // テキストアニメーション
            this.scene.tweens.add({
              targets: [defeatText, defeatedText],
              alpha: 1,
              scale: 1.3,
              duration: 600,
              ease: 'Back.easeOut',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(
                  this.config.defeatDuration - 1200,
                  () => {
                    // フェードアウト
                    this.scene.tweens.add({
                      targets: [flash, defeatText, defeatedText],
                      alpha: 0,
                      duration: this.config.fadeOutDuration,
                      ease: 'Power2',
                      onComplete: () => {
                        // クリーンアップ
                        flash.destroy();
                        defeatText.destroy();
                        defeatedText.destroy();
                        this.activeEffects.delete(flash);
                        this.activeEffects.delete(defeatText);
                        this.activeEffects.delete(defeatedText);
                        resolve();
                        this.emit('boss-defeat-cutscene-completed', {
                          bossId: boss.id,
                          bossName: bossData.name,
                        });
                      },
                    });
                  }
                );
              },
            });
          },
        });

        this.emit('boss-defeat-cutscene-started', { bossId: boss.id, bossName: bossData.name });
      } catch (error) {
        console.error('[BossUI] Error showing boss defeat cutscene:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * 薔薇の力獲得演出を表示
   * @param amount 獲得量
   * @param type 薔薇の力の種類
   * @returns 演出完了のPromise
   */
  async showRoseEssenceGain(amount: number, type: RoseEssenceType): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log(`[BossUI] Showing rose essence gain: ${amount} ${type}`);

        // 薔薇の力の色と名前を取得
        const essenceColor = this.getRoseEssenceColor(type);
        const essenceName = this.getRoseEssenceName(type);

        // 背景エフェクト
        const essenceGlow = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          essenceColor,
          0
        );
        essenceGlow.setDepth(this.config.uiDepth - 1);
        this.activeEffects.add(essenceGlow);

        // グローアニメーション
        this.scene.tweens.add({
          targets: essenceGlow,
          alpha: 0.4,
          duration: 600,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // 薔薇のアイコン（簡易的に花の絵文字で代用）
            const roseIcon = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY - 80,
              '🌹',
              {
                fontSize: '80px',
              }
            );
            roseIcon.setOrigin(0.5);
            roseIcon.setDepth(this.config.uiDepth + 1);
            roseIcon.setAlpha(0);
            roseIcon.setScale(0.5);
            this.activeEffects.add(roseIcon);

            // 獲得メッセージ
            const gainText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY,
              `${essenceName}を獲得！`,
              {
                fontSize: '42px',
                color: `#${essenceColor.toString(16).padStart(6, '0')}`,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5,
                shadow: {
                  offsetX: 3,
                  offsetY: 3,
                  color: '#000000',
                  blur: 6,
                  fill: true,
                },
              }
            );
            gainText.setOrigin(0.5);
            gainText.setDepth(this.config.uiDepth + 1);
            gainText.setAlpha(0);
            this.activeEffects.add(gainText);

            // 獲得量テキスト
            const amountText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY + 60,
              `+${amount}`,
              {
                fontSize: '56px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5,
                shadow: {
                  offsetX: 3,
                  offsetY: 3,
                  color: '#000000',
                  blur: 6,
                  fill: true,
                },
              }
            );
            amountText.setOrigin(0.5);
            amountText.setDepth(this.config.uiDepth + 1);
            amountText.setAlpha(0);
            amountText.setScale(0.5);
            this.activeEffects.add(amountText);

            // テキストアニメーション
            this.scene.tweens.add({
              targets: [roseIcon, gainText, amountText],
              alpha: 1,
              scale: 1.2,
              y: '-=20',
              duration: 800,
              ease: 'Back.easeOut',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(
                  this.config.roseEssenceGainDuration - 1600,
                  () => {
                    // フェードアウト
                    this.scene.tweens.add({
                      targets: [essenceGlow, roseIcon, gainText, amountText],
                      alpha: 0,
                      duration: this.config.fadeOutDuration,
                      ease: 'Power2',
                      onComplete: () => {
                        // クリーンアップ
                        essenceGlow.destroy();
                        roseIcon.destroy();
                        gainText.destroy();
                        amountText.destroy();
                        this.activeEffects.delete(essenceGlow);
                        this.activeEffects.delete(roseIcon);
                        this.activeEffects.delete(gainText);
                        this.activeEffects.delete(amountText);
                        resolve();
                        this.emit('rose-essence-gain-completed', { amount, type });
                      },
                    });
                  }
                );
              },
            });
          },
        });

        this.emit('rose-essence-gain-started', { amount, type });
      } catch (error) {
        console.error('[BossUI] Error showing rose essence gain:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * 薔薇の力の色を取得
   * @param type 薔薇の力の種類
   * @returns 色コード
   */
  private getRoseEssenceColor(type: RoseEssenceType): number {
    switch (type) {
      case RoseEssenceType.CRIMSON:
        return 0xff0000; // 紅
      case RoseEssenceType.SHADOW:
        return 0x4b0082; // 影（インディゴ）
      case RoseEssenceType.THORN:
        return 0x8b4513; // 棘（茶色）
      case RoseEssenceType.CURSED:
        return 0x800080; // 呪い（紫）
      default:
        return 0xff0000;
    }
  }

  /**
   * 薔薇の力の名前を取得
   * @param type 薔薇の力の種類
   * @returns 名前
   */
  private getRoseEssenceName(type: RoseEssenceType): string {
    switch (type) {
      case RoseEssenceType.CRIMSON:
        return '紅の薔薇';
      case RoseEssenceType.SHADOW:
        return '影の薔薇';
      case RoseEssenceType.THORN:
        return '棘の薔薇';
      case RoseEssenceType.CURSED:
        return '呪いの薔薇';
      default:
        return '薔薇の力';
    }
  }

  /**
   * すべてのアクティブなエフェクトをクリア
   */
  clearAllEffects(): void {
    try {
      // アクティブなエフェクトを破棄
      this.activeEffects.forEach((effect) => {
        if (effect && effect.scene) {
          effect.destroy();
        }
      });
      this.activeEffects.clear();

      // HPバーを破棄
      this.bossHealthBars.forEach((elements) => {
        elements.container.destroy();
      });
      this.bossHealthBars.clear();

      console.log('[BossUI] Cleared all effects');
    } catch (error) {
      console.error('[BossUI] Error clearing all effects:', error);
    }
  }

  /**
   * システムを破棄
   */
  destroy(): void {
    this.clearAllEffects();
    if (this.effectsContainer) {
      this.effectsContainer.destroy();
    }
    this.removeAllListeners();
    console.log('[BossUI] Destroyed');
  }
}
