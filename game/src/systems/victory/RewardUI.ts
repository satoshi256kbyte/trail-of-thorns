/**
 * 報酬表示UIシステム
 * 勝利画面、敗北画面、報酬詳細、クリア評価、薔薇の力獲得、仲間化成功表示を管理
 */

import Phaser from 'phaser';
import {
  StageRewards,
  ClearRating,
  StagePerformance,
  BossReward,
  RecruitmentReward,
} from '../../types/reward';
import { Unit } from '../../types/gameplay';

/**
 * 報酬UI設定
 */
export interface RewardUIConfig {
  // 画面設定
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  backgroundColor: number;
  backgroundAlpha: number;

  // テキスト設定
  titleFontSize: string;
  subtitleFontSize: string;
  bodyFontSize: string;
  smallFontSize: string;

  // 色設定
  titleColor: string;
  textColor: string;
  highlightColor: string;
  successColor: string;
  failureColor: string;

  // アニメーション設定
  fadeInDuration: number;
  fadeOutDuration: number;
  itemRevealDelay: number;
  itemRevealDuration: number;

  // UI深度
  uiDepth: number;
}

/**
 * 報酬画面要素
 */
interface RewardScreenElements {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  overlay: Phaser.GameObjects.Rectangle;
  titleText: Phaser.GameObjects.Text;
  elements: Phaser.GameObjects.GameObject[];
}

/**
 * 報酬表示UIクラス
 */
export class RewardUI extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: RewardUIConfig;

  // UI要素
  private currentScreen: RewardScreenElements | null;
  private isShowingScreen: boolean;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: RewardUIConfig = {
    screenX: 400,
    screenY: 300,
    screenWidth: 700,
    screenHeight: 500,
    backgroundColor: 0x000000,
    backgroundAlpha: 0.9,
    titleFontSize: '48px',
    subtitleFontSize: '32px',
    bodyFontSize: '24px',
    smallFontSize: '18px',
    titleColor: '#ffffff',
    textColor: '#ffffff',
    highlightColor: '#ffff00',
    successColor: '#00ff00',
    failureColor: '#ff0000',
    fadeInDuration: 500,
    fadeOutDuration: 300,
    itemRevealDelay: 200,
    itemRevealDuration: 400,
    uiDepth: 2000,
  };

  constructor(scene: Phaser.Scene, config?: Partial<RewardUIConfig>) {
    super();
    this.scene = scene;
    this.config = { ...RewardUI.DEFAULT_CONFIG, ...config };
    this.currentScreen = null;
    this.isShowingScreen = false;

    console.log('[RewardUI] Initialized');
  }

  /**
   * 勝利画面を表示
   * @param rewards ステージ報酬
   * @returns 画面表示完了のPromise
   */
  async showVictoryScreen(rewards: StageRewards): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log('[RewardUI] Showing victory screen');

        if (this.isShowingScreen) {
          console.warn('[RewardUI] Screen already showing, clearing first');
          this.clearCurrentScreen();
        }

        this.isShowingScreen = true;

        // 画面コンテナを作成
        const container = this.scene.add.container(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY
        );
        container.setDepth(this.config.uiDepth);
        container.setAlpha(0);

        // 背景オーバーレイ
        const overlay = this.scene.add.rectangle(
          0,
          0,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          this.config.backgroundColor,
          this.config.backgroundAlpha
        );

        // 背景パネル
        const background = this.scene.add.rectangle(
          0,
          0,
          this.config.screenWidth,
          this.config.screenHeight,
          0x1a1a1a
        );
        background.setStrokeStyle(4, 0xffd700);

        // タイトルテキスト
        const titleText = this.scene.add.text(0, -this.config.screenHeight / 2 + 60, 'VICTORY!', {
          fontSize: this.config.titleFontSize,
          color: this.config.successColor,
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
        });
        titleText.setOrigin(0.5);

        // 要素を配列に格納
        const elements: Phaser.GameObjects.GameObject[] = [overlay, background, titleText];

        // コンテナに追加
        container.add(elements);

        // 画面データを保存
        this.currentScreen = {
          container,
          background,
          overlay,
          titleText,
          elements,
        };

        // フェードイン
        this.scene.tweens.add({
          targets: container,
          alpha: 1,
          duration: this.config.fadeInDuration,
          ease: 'Power2',
          onComplete: () => {
            // タイトルアニメーション
            this.scene.tweens.add({
              targets: titleText,
              scale: 1.2,
              duration: 300,
              yoyo: true,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                this.emit('victory-screen-shown');
                resolve();
              },
            });
          },
        });

        this.emit('victory-screen-started');
      } catch (error) {
        console.error('[RewardUI] Error showing victory screen:', error);
        this.isShowingScreen = false;
        resolve();
      }
    });
  }

  /**
   * 敗北画面を表示
   * @returns 画面表示完了のPromise
   */
  async showDefeatScreen(): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log('[RewardUI] Showing defeat screen');

        if (this.isShowingScreen) {
          console.warn('[RewardUI] Screen already showing, clearing first');
          this.clearCurrentScreen();
        }

        this.isShowingScreen = true;

        // 画面コンテナを作成
        const container = this.scene.add.container(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY
        );
        container.setDepth(this.config.uiDepth);
        container.setAlpha(0);

        // 背景オーバーレイ
        const overlay = this.scene.add.rectangle(
          0,
          0,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          this.config.backgroundColor,
          this.config.backgroundAlpha
        );

        // 背景パネル
        const background = this.scene.add.rectangle(
          0,
          0,
          this.config.screenWidth,
          this.config.screenHeight,
          0x1a1a1a
        );
        background.setStrokeStyle(4, 0x8b0000);

        // タイトルテキスト
        const titleText = this.scene.add.text(0, -this.config.screenHeight / 2 + 60, 'DEFEAT', {
          fontSize: this.config.titleFontSize,
          color: this.config.failureColor,
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
        });
        titleText.setOrigin(0.5);

        // メッセージテキスト
        const messageText = this.scene.add.text(
          0,
          0,
          'ステージに失敗しました\n\n再挑戦してください',
          {
            fontSize: this.config.bodyFontSize,
            color: this.config.textColor,
            align: 'center',
            lineSpacing: 10,
          }
        );
        messageText.setOrigin(0.5);

        // 要素を配列に格納
        const elements: Phaser.GameObjects.GameObject[] = [
          overlay,
          background,
          titleText,
          messageText,
        ];

        // コンテナに追加
        container.add(elements);

        // 画面データを保存
        this.currentScreen = {
          container,
          background,
          overlay,
          titleText,
          elements,
        };

        // フェードイン
        this.scene.tweens.add({
          targets: container,
          alpha: 1,
          duration: this.config.fadeInDuration,
          ease: 'Power2',
          onComplete: () => {
            this.emit('defeat-screen-shown');
            resolve();
          },
        });

        this.emit('defeat-screen-started');
      } catch (error) {
        console.error('[RewardUI] Error showing defeat screen:', error);
        this.isShowingScreen = false;
        resolve();
      }
    });
  }

  /**
   * 報酬詳細を表示
   * @param rewards ステージ報酬
   */
  showRewardDetails(rewards: StageRewards): void {
    try {
      console.log('[RewardUI] Showing reward details');

      if (!this.currentScreen) {
        console.warn('[RewardUI] No current screen to add reward details');
        return;
      }

      const startY = -this.config.screenHeight / 2 + 140;
      let currentY = startY;
      const lineHeight = 40;
      const sectionSpacing = 20;

      // 基本経験値
      if (rewards.baseExperience > 0) {
        const expText = this.scene.add.text(
          0,
          currentY,
          `基本経験値: ${rewards.baseExperience}`,
          {
            fontSize: this.config.bodyFontSize,
            color: this.config.textColor,
          }
        );
        expText.setOrigin(0.5);
        expText.setAlpha(0);
        this.currentScreen.container.add(expText);
        this.currentScreen.elements.push(expText);

        // アニメーション
        this.scene.tweens.add({
          targets: expText,
          alpha: 1,
          x: '+=10',
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay,
          ease: 'Power2',
        });

        currentY += lineHeight;
      }

      // ボス撃破報酬
      if (rewards.bossRewards && rewards.bossRewards.length > 0) {
        currentY += sectionSpacing;

        const bossTitle = this.scene.add.text(0, currentY, 'ボス撃破報酬:', {
          fontSize: this.config.subtitleFontSize,
          color: this.config.highlightColor,
          fontStyle: 'bold',
        });
        bossTitle.setOrigin(0.5);
        bossTitle.setAlpha(0);
        this.currentScreen.container.add(bossTitle);
        this.currentScreen.elements.push(bossTitle);

        this.scene.tweens.add({
          targets: bossTitle,
          alpha: 1,
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * 2,
          ease: 'Power2',
        });

        currentY += lineHeight;

        rewards.bossRewards.forEach((bossReward, index) => {
          const bossText = this.scene.add.text(
            0,
            currentY,
            `  ${bossReward.bossName}: 経験値+${bossReward.experienceBonus}`,
            {
              fontSize: this.config.bodyFontSize,
              color: this.config.textColor,
            }
          );
          bossText.setOrigin(0.5);
          bossText.setAlpha(0);
          this.currentScreen.container.add(bossText);
          this.currentScreen.elements.push(bossText);

          this.scene.tweens.add({
            targets: bossText,
            alpha: 1,
            x: '+=10',
            duration: this.config.itemRevealDuration,
            delay: this.config.itemRevealDelay * (3 + index),
            ease: 'Power2',
          });

          currentY += lineHeight;
        });
      }

      // 仲間化報酬
      if (rewards.recruitmentRewards && rewards.recruitmentRewards.length > 0) {
        currentY += sectionSpacing;

        const recruitTitle = this.scene.add.text(0, currentY, '仲間化報酬:', {
          fontSize: this.config.subtitleFontSize,
          color: this.config.highlightColor,
          fontStyle: 'bold',
        });
        recruitTitle.setOrigin(0.5);
        recruitTitle.setAlpha(0);
        this.currentScreen.container.add(recruitTitle);
        this.currentScreen.elements.push(recruitTitle);

        this.scene.tweens.add({
          targets: recruitTitle,
          alpha: 1,
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * 5,
          ease: 'Power2',
        });

        currentY += lineHeight;

        rewards.recruitmentRewards.forEach((recruitReward, index) => {
          const recruitText = this.scene.add.text(
            0,
            currentY,
            `  ${recruitReward.characterName}: ボーナス+${recruitReward.recruitmentBonus}`,
            {
              fontSize: this.config.bodyFontSize,
              color: this.config.textColor,
            }
          );
          recruitText.setOrigin(0.5);
          recruitText.setAlpha(0);
          this.currentScreen.container.add(recruitText);
          this.currentScreen.elements.push(recruitText);

          this.scene.tweens.add({
            targets: recruitText,
            alpha: 1,
            x: '+=10',
            duration: this.config.itemRevealDuration,
            delay: this.config.itemRevealDelay * (6 + index),
            ease: 'Power2',
          });

          currentY += lineHeight;
        });
      }

      this.emit('reward-details-shown', { rewards });
    } catch (error) {
      console.error('[RewardUI] Error showing reward details:', error);
    }
  }

  /**
   * クリア評価を表示
   * @param rating クリア評価
   * @param performance ステージパフォーマンス
   */
  showClearRating(rating: ClearRating, performance: StagePerformance): void {
    try {
      console.log(`[RewardUI] Showing clear rating: ${rating}`);

      if (!this.currentScreen) {
        console.warn('[RewardUI] No current screen to add clear rating');
        return;
      }

      // 評価の色を取得
      const ratingColor = this.getRatingColor(rating);

      // 評価テキスト
      const ratingText = this.scene.add.text(
        0,
        -this.config.screenHeight / 2 + 100,
        `評価: ${rating}`,
        {
          fontSize: this.config.subtitleFontSize,
          color: ratingColor,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        }
      );
      ratingText.setOrigin(0.5);
      ratingText.setAlpha(0);
      ratingText.setScale(0.5);
      this.currentScreen.container.add(ratingText);
      this.currentScreen.elements.push(ratingText);

      // アニメーション
      this.scene.tweens.add({
        targets: ratingText,
        alpha: 1,
        scale: 1.3,
        duration: 600,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 少し縮小
          this.scene.tweens.add({
            targets: ratingText,
            scale: 1,
            duration: 200,
            ease: 'Power2',
          });
        },
      });

      // パフォーマンス詳細（小さく表示）
      const performanceY = this.config.screenHeight / 2 - 80;
      const performanceText = this.scene.add.text(
        0,
        performanceY,
        `ターン数: ${performance.turnsUsed} | 撃破: ${performance.enemiesDefeated} | ロスト: ${performance.unitsLost}`,
        {
          fontSize: this.config.smallFontSize,
          color: '#cccccc',
        }
      );
      performanceText.setOrigin(0.5);
      performanceText.setAlpha(0);
      this.currentScreen.container.add(performanceText);
      this.currentScreen.elements.push(performanceText);

      this.scene.tweens.add({
        targets: performanceText,
        alpha: 1,
        duration: this.config.itemRevealDuration,
        delay: 400,
        ease: 'Power2',
      });

      this.emit('clear-rating-shown', { rating, performance });
    } catch (error) {
      console.error('[RewardUI] Error showing clear rating:', error);
    }
  }

  /**
   * 薔薇の力獲得を表示
   * @param reward ボス撃破報酬
   */
  showRoseEssenceReward(reward: BossReward): void {
    try {
      console.log(`[RewardUI] Showing rose essence reward: ${reward.roseEssenceAmount}`);

      if (!this.currentScreen) {
        console.warn('[RewardUI] No current screen to add rose essence reward');
        return;
      }

      // 薔薇の力セクション
      const roseY = 50;

      const roseTitle = this.scene.add.text(0, roseY, '薔薇の力を獲得！', {
        fontSize: this.config.subtitleFontSize,
        color: '#ff69b4',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      });
      roseTitle.setOrigin(0.5);
      roseTitle.setAlpha(0);
      this.currentScreen.container.add(roseTitle);
      this.currentScreen.elements.push(roseTitle);

      // 薔薇のアイコン
      const roseIcon = this.scene.add.text(0, roseY + 50, '🌹', {
        fontSize: '48px',
      });
      roseIcon.setOrigin(0.5);
      roseIcon.setAlpha(0);
      roseIcon.setScale(0.5);
      this.currentScreen.container.add(roseIcon);
      this.currentScreen.elements.push(roseIcon);

      // 獲得量テキスト
      const amountText = this.scene.add.text(
        0,
        roseY + 110,
        `+${reward.roseEssenceAmount}`,
        {
          fontSize: this.config.bodyFontSize,
          color: this.config.highlightColor,
          fontStyle: 'bold',
        }
      );
      amountText.setOrigin(0.5);
      amountText.setAlpha(0);
      this.currentScreen.container.add(amountText);
      this.currentScreen.elements.push(amountText);

      // アニメーション
      this.scene.tweens.add({
        targets: [roseTitle, roseIcon, amountText],
        alpha: 1,
        scale: 1.2,
        duration: 600,
        delay: this.config.itemRevealDelay * 8,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 少し縮小
          this.scene.tweens.add({
            targets: [roseTitle, roseIcon, amountText],
            scale: 1,
            duration: 200,
            ease: 'Power2',
          });
        },
      });

      this.emit('rose-essence-reward-shown', { reward });
    } catch (error) {
      console.error('[RewardUI] Error showing rose essence reward:', error);
    }
  }

  /**
   * 仲間化成功を表示
   * @param characters 仲間化したキャラクター
   */
  showRecruitmentSuccess(characters: Unit[]): void {
    try {
      console.log(`[RewardUI] Showing recruitment success for ${characters.length} characters`);

      if (!this.currentScreen) {
        console.warn('[RewardUI] No current screen to add recruitment success');
        return;
      }

      if (characters.length === 0) {
        return;
      }

      // 仲間化セクション
      const recruitY = -50;

      const recruitTitle = this.scene.add.text(0, recruitY, '仲間化成功！', {
        fontSize: this.config.subtitleFontSize,
        color: this.config.successColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      });
      recruitTitle.setOrigin(0.5);
      recruitTitle.setAlpha(0);
      this.currentScreen.container.add(recruitTitle);
      this.currentScreen.elements.push(recruitTitle);

      // アニメーション
      this.scene.tweens.add({
        targets: recruitTitle,
        alpha: 1,
        scale: 1.2,
        duration: 600,
        delay: this.config.itemRevealDelay * 10,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: recruitTitle,
            scale: 1,
            duration: 200,
            ease: 'Power2',
          });
        },
      });

      // キャラクター名を表示
      let charY = recruitY + 50;
      characters.forEach((character, index) => {
        const charText = this.scene.add.text(0, charY, `  ${character.name}`, {
          fontSize: this.config.bodyFontSize,
          color: this.config.textColor,
        });
        charText.setOrigin(0.5);
        charText.setAlpha(0);
        this.currentScreen.container.add(charText);
        this.currentScreen.elements.push(charText);

        this.scene.tweens.add({
          targets: charText,
          alpha: 1,
          x: '+=10',
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * (11 + index),
          ease: 'Power2',
        });

        charY += 35;
      });

      this.emit('recruitment-success-shown', { characters });
    } catch (error) {
      console.error('[RewardUI] Error showing recruitment success:', error);
    }
  }

  /**
   * ランクアップ可能通知を表示
   * 要件7.4: 報酬画面でのランクアップ案内表示を実装
   * 
   * @param candidates ランクアップ可能キャラクター情報
   */
  showRankUpAvailableNotification(candidates: any[]): void {
    try {
      console.log(
        `[RewardUI] Showing rank up available notification for ${candidates.length} candidates`
      );

      if (!this.currentScreen) {
        console.warn('[RewardUI] No current screen to add rank up notification');
        return;
      }

      if (candidates.length === 0) {
        return;
      }

      // ランクアップ通知セクション
      const rankUpY = 150;

      // タイトル
      const rankUpTitle = this.scene.add.text(0, rankUpY, 'ランクアップ可能！', {
        fontSize: this.config.subtitleFontSize,
        color: '#ff69b4',
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
      });
      rankUpTitle.setOrigin(0.5);
      rankUpTitle.setAlpha(0);
      this.currentScreen.container.add(rankUpTitle);
      this.currentScreen.elements.push(rankUpTitle);

      // アイコン（星マーク）
      const rankUpIcon = this.scene.add.text(0, rankUpY + 50, '⭐', {
        fontSize: '36px',
      });
      rankUpIcon.setOrigin(0.5);
      rankUpIcon.setAlpha(0);
      rankUpIcon.setScale(0.5);
      this.currentScreen.container.add(rankUpIcon);
      this.currentScreen.elements.push(rankUpIcon);

      // 説明テキスト
      const descText = this.scene.add.text(
        0,
        rankUpY + 100,
        `${candidates.length}人のキャラクターがランクアップ可能です`,
        {
          fontSize: this.config.bodyFontSize,
          color: this.config.textColor,
          align: 'center',
        }
      );
      descText.setOrigin(0.5);
      descText.setAlpha(0);
      this.currentScreen.container.add(descText);
      this.currentScreen.elements.push(descText);

      // キャラクター一覧（最大3人まで表示）
      const displayCandidates = candidates.slice(0, 3);
      let candidateY = rankUpY + 140;

      displayCandidates.forEach((candidate, index) => {
        const candidateText = this.scene.add.text(
          0,
          candidateY,
          `  ${candidate.characterId}: ${candidate.currentJobName} Lv${candidate.currentRank} → Lv${candidate.nextRank}`,
          {
            fontSize: this.config.smallFontSize,
            color: '#ffff00',
          }
        );
        candidateText.setOrigin(0.5);
        candidateText.setAlpha(0);
        this.currentScreen.container.add(candidateText);
        this.currentScreen.elements.push(candidateText);

        this.scene.tweens.add({
          targets: candidateText,
          alpha: 1,
          x: '+=10',
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * (14 + index),
          ease: 'Power2',
        });

        candidateY += 30;
      });

      // 3人以上いる場合は「他N人」と表示
      if (candidates.length > 3) {
        const moreText = this.scene.add.text(
          0,
          candidateY,
          `  他${candidates.length - 3}人`,
          {
            fontSize: this.config.smallFontSize,
            color: '#cccccc',
          }
        );
        moreText.setOrigin(0.5);
        moreText.setAlpha(0);
        this.currentScreen.container.add(moreText);
        this.currentScreen.elements.push(moreText);

        this.scene.tweens.add({
          targets: moreText,
          alpha: 1,
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * 17,
          ease: 'Power2',
        });
      }

      // タイトルとアイコンのアニメーション
      this.scene.tweens.add({
        targets: [rankUpTitle, rankUpIcon, descText],
        alpha: 1,
        scale: 1.2,
        duration: 600,
        delay: this.config.itemRevealDelay * 12,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 少し縮小
          this.scene.tweens.add({
            targets: [rankUpTitle, rankUpIcon, descText],
            scale: 1,
            duration: 200,
            ease: 'Power2',
          });

          // アイコンを回転させる
          this.scene.tweens.add({
            targets: rankUpIcon,
            angle: 360,
            duration: 1000,
            repeat: -1,
            ease: 'Linear',
          });
        },
      });

      this.emit('rank-up-notification-shown', { candidates });
    } catch (error) {
      console.error('[RewardUI] Error showing rank up notification:', error);
    }
  }

  /**
   * 報酬受け取り確認
   * @returns 確認結果のPromise
   */
  async confirmRewardCollection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log('[RewardUI] Confirming reward collection');

        if (!this.currentScreen) {
          console.warn('[RewardUI] No current screen for confirmation');
          resolve(false);
          return;
        }

        // 確認ボタンを追加
        const buttonY = this.config.screenHeight / 2 - 40;

        const confirmButton = this.scene.add.rectangle(0, buttonY, 200, 50, 0x4caf50);
        confirmButton.setStrokeStyle(2, 0xffffff);
        confirmButton.setInteractive({ useHandCursor: true });

        const confirmText = this.scene.add.text(0, buttonY, '確認', {
          fontSize: this.config.bodyFontSize,
          color: this.config.textColor,
          fontStyle: 'bold',
        });
        confirmText.setOrigin(0.5);

        confirmButton.setAlpha(0);
        confirmText.setAlpha(0);

        this.currentScreen.container.add([confirmButton, confirmText]);
        this.currentScreen.elements.push(confirmButton, confirmText);

        // ボタンアニメーション
        this.scene.tweens.add({
          targets: [confirmButton, confirmText],
          alpha: 1,
          duration: this.config.itemRevealDuration,
          delay: this.config.itemRevealDelay * 15,
          ease: 'Power2',
        });

        // ホバーエフェクト
        confirmButton.on('pointerover', () => {
          this.scene.tweens.add({
            targets: confirmButton,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            ease: 'Power2',
          });
        });

        confirmButton.on('pointerout', () => {
          this.scene.tweens.add({
            targets: confirmButton,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Power2',
          });
        });

        // クリックイベント
        confirmButton.on('pointerdown', () => {
          console.log('[RewardUI] Reward collection confirmed');
          this.emit('reward-collection-confirmed');

          // 画面をフェードアウト
          this.scene.tweens.add({
            targets: this.currentScreen!.container,
            alpha: 0,
            duration: this.config.fadeOutDuration,
            ease: 'Power2',
            onComplete: () => {
              this.clearCurrentScreen();
              resolve(true);
            },
          });
        });

        this.emit('reward-collection-confirmation-shown');
      } catch (error) {
        console.error('[RewardUI] Error confirming reward collection:', error);
        resolve(false);
      }
    });
  }

  /**
   * 評価の色を取得
   * @param rating クリア評価
   * @returns 色コード
   */
  private getRatingColor(rating: ClearRating): string {
    switch (rating) {
      case ClearRating.S:
        return '#ffd700'; // ゴールド
      case ClearRating.A:
        return '#00ff00'; // 緑
      case ClearRating.B:
        return '#00bfff'; // 青
      case ClearRating.C:
        return '#ffaa00'; // オレンジ
      case ClearRating.D:
        return '#ff0000'; // 赤
      default:
        return '#ffffff';
    }
  }

  /**
   * 現在の画面をクリア
   */
  private clearCurrentScreen(): void {
    try {
      if (this.currentScreen) {
        this.currentScreen.container.destroy();
        this.currentScreen = null;
        this.isShowingScreen = false;
        console.log('[RewardUI] Current screen cleared');
      }
    } catch (error) {
      console.error('[RewardUI] Error clearing current screen:', error);
    }
  }

  /**
   * すべての画面をクリア
   */
  clearAllScreens(): void {
    this.clearCurrentScreen();
    console.log('[RewardUI] All screens cleared');
  }

  /**
   * システムを破棄
   */
  destroy(): void {
    this.clearAllScreens();
    this.removeAllListeners();
    console.log('[RewardUI] Destroyed');
  }
}
