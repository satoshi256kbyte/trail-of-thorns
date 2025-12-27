/**
 * ボス戦演出システム
 * ボス登場、撃破、フェーズ変化、HPバー表示、薔薇の力獲得演出を管理
 */

import Phaser from 'phaser';
import { BossData, RoseEssenceType } from '../../types/boss';
import { Unit } from '../../types/gameplay';

/**
 * 演出設定
 */
export interface EffectConfig {
  duration: number; // 演出時間（ミリ秒）
  fadeInDuration?: number; // フェードイン時間
  fadeOutDuration?: number; // フェードアウト時間
  scale?: number; // スケール
  alpha?: number; // 透明度
}

/**
 * ボスHPバー設定
 */
export interface BossHealthBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  healthColor: number;
  borderColor: number;
  borderWidth: number;
}

/**
 * ボス戦演出システムクラス
 */
export class BossEffects {
  private scene: Phaser.Scene;
  private effectsContainer: Phaser.GameObjects.Container;
  private bossHealthBars: Map<string, Phaser.GameObjects.Container>;
  private activeEffects: Set<Phaser.GameObjects.GameObject>;

  // デフォルト設定
  private readonly DEFAULT_EFFECT_CONFIG: EffectConfig = {
    duration: 2000,
    fadeInDuration: 500,
    fadeOutDuration: 500,
    scale: 1.0,
    alpha: 1.0,
  };

  private readonly DEFAULT_HEALTHBAR_CONFIG: BossHealthBarConfig = {
    x: 400,
    y: 50,
    width: 400,
    height: 30,
    backgroundColor: 0x000000,
    healthColor: 0xff0000,
    borderColor: 0xffffff,
    borderWidth: 2,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.effectsContainer = scene.add.container(0, 0);
    this.effectsContainer.setDepth(1000); // 最前面に表示
    this.bossHealthBars = new Map();
    this.activeEffects = new Set();
  }

  /**
   * ボス登場演出を再生
   * @param boss ボスユニット
   * @param bossData ボスデータ
   * @param config 演出設定（オプション）
   * @returns 演出完了のPromise
   */
  async playBossIntroduction(
    boss: Unit,
    bossData: BossData,
    config?: Partial<EffectConfig>
  ): Promise<void> {
    const effectConfig = { ...this.DEFAULT_EFFECT_CONFIG, ...config };

    return new Promise((resolve) => {
      try {
        // 画面を暗転
        const overlay = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0x000000,
          0
        );
        overlay.setDepth(999);
        this.activeEffects.add(overlay);

        // 暗転アニメーション
        this.scene.tweens.add({
          targets: overlay,
          alpha: 0.7,
          duration: effectConfig.fadeInDuration || 500,
          ease: 'Power2',
          onComplete: () => {
            // ボス名とタイトルを表示
            const bossNameText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY - 50,
              bossData.name,
              {
                fontSize: '48px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
              }
            );
            bossNameText.setOrigin(0.5);
            bossNameText.setDepth(1001);
            bossNameText.setAlpha(0);
            this.activeEffects.add(bossNameText);

            const bossTitleText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY + 20,
              bossData.title,
              {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'italic',
              }
            );
            bossTitleText.setOrigin(0.5);
            bossTitleText.setDepth(1001);
            bossTitleText.setAlpha(0);
            this.activeEffects.add(bossTitleText);

            // テキストフェードイン
            this.scene.tweens.add({
              targets: [bossNameText, bossTitleText],
              alpha: 1,
              duration: 800,
              ease: 'Power2',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(effectConfig.duration - 1300, () => {
                  // フェードアウト
                  this.scene.tweens.add({
                    targets: [overlay, bossNameText, bossTitleText],
                    alpha: 0,
                    duration: effectConfig.fadeOutDuration || 500,
                    ease: 'Power2',
                    onComplete: () => {
                      // クリーンアップ
                      overlay.destroy();
                      bossNameText.destroy();
                      bossTitleText.destroy();
                      this.activeEffects.delete(overlay);
                      this.activeEffects.delete(bossNameText);
                      this.activeEffects.delete(bossTitleText);
                      resolve();
                    },
                  });
                });
              },
            });
          },
        });
      } catch (error) {
        console.error('Error playing boss introduction:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * ボス撃破演出を再生
   * @param boss 撃破されたボスユニット
   * @param bossData ボスデータ
   * @param config 演出設定（オプション）
   * @returns 演出完了のPromise
   */
  async playBossDefeatCutscene(
    boss: Unit,
    bossData: BossData,
    config?: Partial<EffectConfig>
  ): Promise<void> {
    const effectConfig = { ...this.DEFAULT_EFFECT_CONFIG, ...config };

    return new Promise((resolve) => {
      try {
        // 撃破エフェクト（フラッシュ）
        const flash = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0xffffff,
          0
        );
        flash.setDepth(999);
        this.activeEffects.add(flash);

        // フラッシュアニメーション
        this.scene.tweens.add({
          targets: flash,
          alpha: 0.8,
          duration: 200,
          yoyo: true,
          repeat: 2,
          ease: 'Power2',
          onComplete: () => {
            // 撃破メッセージ表示
            const defeatText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY,
              `${bossData.name} 撃破！`,
              {
                fontSize: '56px',
                color: '#ffff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6,
              }
            );
            defeatText.setOrigin(0.5);
            defeatText.setDepth(1001);
            defeatText.setAlpha(0);
            defeatText.setScale(0.5);
            this.activeEffects.add(defeatText);

            // テキストアニメーション
            this.scene.tweens.add({
              targets: defeatText,
              alpha: 1,
              scale: 1.2,
              duration: 600,
              ease: 'Back.easeOut',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(effectConfig.duration - 1000, () => {
                  // フェードアウト
                  this.scene.tweens.add({
                    targets: [flash, defeatText],
                    alpha: 0,
                    duration: effectConfig.fadeOutDuration || 500,
                    ease: 'Power2',
                    onComplete: () => {
                      // クリーンアップ
                      flash.destroy();
                      defeatText.destroy();
                      this.activeEffects.delete(flash);
                      this.activeEffects.delete(defeatText);
                      resolve();
                    },
                  });
                });
              },
            });
          },
        });
      } catch (error) {
        console.error('Error playing boss defeat cutscene:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * フェーズ変化演出を再生
   * @param boss ボスユニット
   * @param bossData ボスデータ
   * @param newPhase 新しいフェーズ番号
   * @param config 演出設定（オプション）
   * @returns 演出完了のPromise
   */
  async playPhaseChangeEffect(
    boss: Unit,
    bossData: BossData,
    newPhase: number,
    config?: Partial<EffectConfig>
  ): Promise<void> {
    const effectConfig = { ...this.DEFAULT_EFFECT_CONFIG, ...config };

    return new Promise((resolve) => {
      try {
        // 画面シェイク
        this.scene.cameras.main.shake(500, 0.01);

        // フェーズ変化エフェクト（赤いフラッシュ）
        const phaseFlash = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0xff0000,
          0
        );
        phaseFlash.setDepth(999);
        this.activeEffects.add(phaseFlash);

        // フラッシュアニメーション
        this.scene.tweens.add({
          targets: phaseFlash,
          alpha: 0.5,
          duration: 300,
          yoyo: true,
          ease: 'Power2',
          onComplete: () => {
            // フェーズ変化メッセージ
            const phaseText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY,
              `フェーズ ${newPhase}`,
              {
                fontSize: '48px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
              }
            );
            phaseText.setOrigin(0.5);
            phaseText.setDepth(1001);
            phaseText.setAlpha(0);
            this.activeEffects.add(phaseText);

            // テキストアニメーション
            this.scene.tweens.add({
              targets: phaseText,
              alpha: 1,
              scale: 1.5,
              duration: 400,
              ease: 'Power2',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(effectConfig.duration - 1000, () => {
                  // フェードアウト
                  this.scene.tweens.add({
                    targets: [phaseFlash, phaseText],
                    alpha: 0,
                    duration: effectConfig.fadeOutDuration || 500,
                    ease: 'Power2',
                    onComplete: () => {
                      // クリーンアップ
                      phaseFlash.destroy();
                      phaseText.destroy();
                      this.activeEffects.delete(phaseFlash);
                      this.activeEffects.delete(phaseText);
                      resolve();
                    },
                  });
                });
              },
            });
          },
        });
      } catch (error) {
        console.error('Error playing phase change effect:', error);
        resolve(); // エラーでも続行
      }
    });
  }

  /**
   * ボスHPバーを表示
   * @param boss ボスユニット
   * @param bossData ボスデータ
   * @param config HPバー設定（オプション）
   */
  showBossHealthBar(
    boss: Unit,
    bossData: BossData,
    config?: Partial<BossHealthBarConfig>
  ): void {
    try {
      // 既存のHPバーがあれば削除
      if (this.bossHealthBars.has(boss.id)) {
        this.hideBossHealthBar(boss.id);
      }

      const barConfig = { ...this.DEFAULT_HEALTHBAR_CONFIG, ...config };

      // HPバーコンテナを作成
      const healthBarContainer = this.scene.add.container(barConfig.x, barConfig.y);
      healthBarContainer.setDepth(900);

      // 背景
      const background = this.scene.add.rectangle(
        0,
        0,
        barConfig.width,
        barConfig.height,
        barConfig.backgroundColor
      );

      // HPバー
      const healthBar = this.scene.add.rectangle(
        -barConfig.width / 2,
        0,
        barConfig.width,
        barConfig.height,
        barConfig.healthColor
      );
      healthBar.setOrigin(0, 0.5);

      // 枠線
      const border = this.scene.add.rectangle(0, 0, barConfig.width, barConfig.height);
      border.setStrokeStyle(barConfig.borderWidth, barConfig.borderColor);
      border.setFillStyle(0x000000, 0); // 透明

      // ボス名テキスト
      const nameText = this.scene.add.text(-barConfig.width / 2, -barConfig.height / 2 - 20, bossData.name, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });

      // HP数値テキスト
      const hpText = this.scene.add.text(
        0,
        0,
        `${boss.currentHP} / ${boss.stats.maxHP}`,
        {
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold',
        }
      );
      hpText.setOrigin(0.5);

      // コンテナに追加
      healthBarContainer.add([background, healthBar, border, nameText, hpText]);

      // データを保存
      (healthBarContainer as any).healthBar = healthBar;
      (healthBarContainer as any).hpText = hpText;
      (healthBarContainer as any).maxWidth = barConfig.width;

      this.bossHealthBars.set(boss.id, healthBarContainer);

      // 初期HP更新
      this.updateBossHealthBar(boss);
    } catch (error) {
      console.error('Error showing boss health bar:', error);
    }
  }

  /**
   * ボスHPバーを更新
   * @param boss ボスユニット
   */
  updateBossHealthBar(boss: Unit): void {
    try {
      const healthBarContainer = this.bossHealthBars.get(boss.id);
      if (!healthBarContainer) {
        return;
      }

      const healthBar = (healthBarContainer as any).healthBar as Phaser.GameObjects.Rectangle;
      const hpText = (healthBarContainer as any).hpText as Phaser.GameObjects.Text;
      const maxWidth = (healthBarContainer as any).maxWidth as number;

      // HP割合を計算
      const hpPercentage = Math.max(0, boss.currentHP / boss.stats.maxHP);

      // HPバーの幅を更新
      const newWidth = maxWidth * hpPercentage;
      this.scene.tweens.add({
        targets: healthBar,
        width: newWidth,
        duration: 300,
        ease: 'Power2',
      });

      // HP数値を更新
      hpText.setText(`${Math.max(0, boss.currentHP)} / ${boss.stats.maxHP}`);

      // HPが低い場合は色を変更
      if (hpPercentage < 0.3) {
        healthBar.setFillStyle(0xff0000); // 赤
      } else if (hpPercentage < 0.6) {
        healthBar.setFillStyle(0xffaa00); // オレンジ
      } else {
        healthBar.setFillStyle(0xff0000); // 赤（デフォルト）
      }
    } catch (error) {
      console.error('Error updating boss health bar:', error);
    }
  }

  /**
   * ボスHPバーを非表示
   * @param bossId ボスID
   */
  hideBossHealthBar(bossId: string): void {
    try {
      const healthBarContainer = this.bossHealthBars.get(bossId);
      if (healthBarContainer) {
        healthBarContainer.destroy();
        this.bossHealthBars.delete(bossId);
      }
    } catch (error) {
      console.error('Error hiding boss health bar:', error);
    }
  }

  /**
   * 薔薇の力獲得演出を再生
   * @param amount 獲得量
   * @param type 薔薇の力の種類
   * @param config 演出設定（オプション）
   * @returns 演出完了のPromise
   */
  async playRoseEssenceGainEffect(
    amount: number,
    type: RoseEssenceType,
    config?: Partial<EffectConfig>
  ): Promise<void> {
    const effectConfig = { ...this.DEFAULT_EFFECT_CONFIG, ...config };

    return new Promise((resolve) => {
      try {
        // 薔薇の力の色を取得
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
        essenceGlow.setDepth(999);
        this.activeEffects.add(essenceGlow);

        // グローアニメーション
        this.scene.tweens.add({
          targets: essenceGlow,
          alpha: 0.3,
          duration: 600,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // 獲得メッセージ
            const gainText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY - 30,
              `${essenceName}を獲得！`,
              {
                fontSize: '40px',
                color: `#${essenceColor.toString(16).padStart(6, '0')}`,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
              }
            );
            gainText.setOrigin(0.5);
            gainText.setDepth(1001);
            gainText.setAlpha(0);
            this.activeEffects.add(gainText);

            // 獲得量テキスト
            const amountText = this.scene.add.text(
              this.scene.cameras.main.centerX,
              this.scene.cameras.main.centerY + 30,
              `+${amount}`,
              {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
              }
            );
            amountText.setOrigin(0.5);
            amountText.setDepth(1001);
            amountText.setAlpha(0);
            this.activeEffects.add(amountText);

            // テキストアニメーション
            this.scene.tweens.add({
              targets: [gainText, amountText],
              alpha: 1,
              y: '-=20',
              duration: 800,
              ease: 'Power2',
              onComplete: () => {
                // 少し待機
                this.scene.time.delayedCall(effectConfig.duration - 1400, () => {
                  // フェードアウト
                  this.scene.tweens.add({
                    targets: [essenceGlow, gainText, amountText],
                    alpha: 0,
                    duration: effectConfig.fadeOutDuration || 500,
                    ease: 'Power2',
                    onComplete: () => {
                      // クリーンアップ
                      essenceGlow.destroy();
                      gainText.destroy();
                      amountText.destroy();
                      this.activeEffects.delete(essenceGlow);
                      this.activeEffects.delete(gainText);
                      this.activeEffects.delete(amountText);
                      resolve();
                    },
                  });
                });
              },
            });
          },
        });
      } catch (error) {
        console.error('Error playing rose essence gain effect:', error);
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
        if (effect && !effect.scene) {
          return; // 既に破棄済み
        }
        effect.destroy();
      });
      this.activeEffects.clear();

      // HPバーを破棄
      this.bossHealthBars.forEach((container) => {
        container.destroy();
      });
      this.bossHealthBars.clear();
    } catch (error) {
      console.error('Error clearing all effects:', error);
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
  }
}
