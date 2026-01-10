import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

/**
 * エラーメッセージの種類
 * Error Message Type
 */
export type ErrorMessageType = 'error' | 'warning' | 'info';

/**
 * エラーメッセージ設定
 * Error Message Configuration
 */
export interface ErrorMessageConfig {
  /** メッセージタイトル */
  title: string;
  /** メッセージ本文 */
  message: string;
  /** 推奨される対処法 */
  action?: string;
  /** メッセージ種別 */
  type: ErrorMessageType;
  /** 表示時間（ミリ秒）、0で自動非表示なし */
  duration?: number;
}

/**
 * ErrorMessage class
 * エラー、警告、情報メッセージを表示するUIコンポーネント
 * Displays error, warning, and info messages with appropriate styling
 */
export class ErrorMessage extends Phaser.GameObjects.Container {
  private backgroundRect?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private actionText?: Phaser.GameObjects.Text;
  private iconText?: Phaser.GameObjects.Text;
  private config: ErrorMessageConfig;
  private autoHideTimer?: Phaser.Time.TimerEvent;

  /**
   * Constructor
   * @param scene - Phaser scene
   * @param x - X position
   * @param y - Y position
   * @param config - Error message configuration
   */
  constructor(scene: Phaser.Scene, x: number, y: number, config: ErrorMessageConfig) {
    super(scene, x, y);

    this.config = config;

    // Add to scene
    scene.add.existing(this);

    // Create message UI
    this.createMessageUI();

    // Add shake effect for error type
    if (config.type === 'error') {
      this.addShakeEffect();
    }

    // Setup auto-hide if duration is specified
    if (config.duration && config.duration > 0) {
      this.setupAutoHide(config.duration);
    }

    // Set depth to ensure visibility
    this.setDepth(3000);

    console.log(`ErrorMessage created: ${config.type} - ${config.title}`);
  }

  /**
   * Private helper method: Create message UI
   * Create all visual elements for the error message
   */
  private createMessageUI(): void {
    const width = 600;
    const padding = 20;
    const iconSize = 40;

    // Determine colors based on message type
    const colors = this.getColorsForType(this.config.type);

    // Create background
    this.backgroundRect = this.scene.add.graphics();
    this.backgroundRect.fillStyle(colors.background, 0.95);
    this.backgroundRect.lineStyle(3, colors.border, 1);
    
    // Calculate height based on content
    let currentY = padding;
    const titleHeight = 30;
    const messageHeight = this.calculateTextHeight(this.config.message, width - padding * 2 - iconSize - 10);
    const actionHeight = this.config.action ? this.calculateTextHeight(this.config.action, width - padding * 2) + 10 : 0;
    const totalHeight = padding * 2 + titleHeight + messageHeight + actionHeight + 20;

    this.backgroundRect.fillRoundedRect(0, 0, width, totalHeight, 10);
    this.backgroundRect.strokeRoundedRect(0, 0, width, totalHeight, 10);
    this.add(this.backgroundRect);

    // Create icon
    this.iconText = this.scene.add.text(
      padding,
      padding,
      this.getIconForType(this.config.type),
      {
        fontSize: `${iconSize}px`,
        color: colors.icon,
        fontFamily: 'Arial',
      }
    );
    this.add(this.iconText);

    // Create title
    this.titleText = this.scene.add.text(
      padding + iconSize + 10,
      padding,
      this.config.title,
      {
        fontSize: '24px',
        color: colors.text,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }
    );
    this.add(this.titleText);

    currentY += titleHeight + 10;

    // Create message
    this.messageText = this.scene.add.text(
      padding,
      currentY,
      this.config.message,
      {
        fontSize: '18px',
        color: colors.text,
        fontFamily: 'Arial',
        wordWrap: { width: width - padding * 2 },
      }
    );
    this.add(this.messageText);

    currentY += messageHeight + 10;

    // Create action text if provided
    if (this.config.action) {
      this.actionText = this.scene.add.text(
        padding,
        currentY,
        `💡 ${this.config.action}`,
        {
          fontSize: '16px',
          color: colors.action,
          fontFamily: 'Arial',
          fontStyle: 'italic',
          wordWrap: { width: width - padding * 2 },
        }
      );
      this.add(this.actionText);
    }

    // Center the container
    this.setPosition(
      GameConfig.GAME_WIDTH / 2 - width / 2,
      GameConfig.GAME_HEIGHT / 2 - totalHeight / 2
    );
  }

  /**
   * Private helper method: Get colors for message type
   * @param type - Message type
   * @returns Color configuration
   */
  private getColorsForType(type: ErrorMessageType): {
    background: number;
    border: number;
    text: string;
    icon: string;
    action: string;
  } {
    switch (type) {
      case 'error':
        return {
          background: 0x3d1414, // Dark red
          border: 0xff6666, // Light red
          text: '#ffffff',
          icon: '#ff6666',
          action: '#ffcccc',
        };
      case 'warning':
        return {
          background: 0x3d2e14, // Dark orange
          border: 0xffaa00, // Orange
          text: '#ffffff',
          icon: '#ffaa00',
          action: '#ffd966',
        };
      case 'info':
        return {
          background: 0x14283d, // Dark blue
          border: 0x66aaff, // Light blue
          text: '#ffffff',
          icon: '#66aaff',
          action: '#cce5ff',
        };
    }
  }

  /**
   * Private helper method: Get icon for message type
   * @param type - Message type
   * @returns Icon character
   */
  private getIconForType(type: ErrorMessageType): string {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  }

  /**
   * Private helper method: Calculate text height
   * @param text - Text content
   * @param maxWidth - Maximum width
   * @returns Estimated height
   */
  private calculateTextHeight(text: string, maxWidth: number): number {
    // Rough estimation: 20px per line, accounting for word wrap
    const charsPerLine = Math.floor(maxWidth / 10); // Rough estimate
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * 20;
  }

  /**
   * Private helper method: Add shake effect for error messages
   * Shakes the container left and right to draw attention
   */
  private addShakeEffect(): void {
    const originalX = this.x;

    // Create shake animation
    this.scene.tweens.add({
      targets: this,
      x: originalX - 10,
      duration: 50,
      yoyo: true,
      repeat: 3, // Shake 4 times (0, 1, 2, 3)
      ease: 'Power2',
      onComplete: () => {
        // Ensure we end at the original position
        this.x = originalX;
      },
    });
  }

  /**
   * Private helper method: Setup auto-hide timer
   * @param duration - Duration in milliseconds
   */
  private setupAutoHide(duration: number): void {
    this.autoHideTimer = this.scene.time.delayedCall(duration, () => {
      this.hide();
    });
  }

  /**
   * Public method: Hide the message with fade-out animation
   */
  public hide(): void {
    // Cancel auto-hide timer if exists
    if (this.autoHideTimer) {
      this.autoHideTimer.remove();
      this.autoHideTimer = undefined;
    }

    // Fade out animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Override destroy method to clean up resources
   */
  public destroy(fromScene?: boolean): void {
    // Cancel auto-hide timer
    if (this.autoHideTimer) {
      this.autoHideTimer.remove();
      this.autoHideTimer = undefined;
    }

    // Clean up graphics
    if (this.backgroundRect) {
      this.backgroundRect.destroy();
      this.backgroundRect = undefined;
    }

    // Clean up text objects
    if (this.titleText) {
      this.titleText.destroy();
      this.titleText = undefined;
    }

    if (this.messageText) {
      this.messageText.destroy();
      this.messageText = undefined;
    }

    if (this.actionText) {
      this.actionText.destroy();
      this.actionText = undefined;
    }

    if (this.iconText) {
      this.iconText.destroy();
      this.iconText = undefined;
    }

    // Call parent destroy
    super.destroy(fromScene);

    console.log('ErrorMessage destroyed');
  }
}

/**
 * エラーメッセージの定義済み設定
 * Predefined Error Message Configurations
 */
export const ERROR_MESSAGES = {
  DATA_CORRUPTED: {
    title: 'データ破損エラー',
    message: 'セーブデータが破損しています。',
    action: 'このスロットを削除して新しくセーブしてください。',
    type: 'error' as ErrorMessageType,
  },
  STORAGE_UNAVAILABLE: {
    title: 'ストレージ利用不可',
    message: 'ブラウザのストレージ機能が利用できません。',
    action: 'ブラウザの設定でCookieとサイトデータを有効にしてください。',
    type: 'error' as ErrorMessageType,
  },
  QUOTA_EXCEEDED: {
    title: '容量不足',
    message: 'ストレージの容量が不足しています。',
    action: '不要なセーブデータを削除してください。',
    type: 'warning' as ErrorMessageType,
  },
  SAVE_FAILED: {
    title: '保存失敗',
    message: 'データの保存に失敗しました。',
    action: '再度お試しいただくか、別のスロットに保存してください。',
    type: 'error' as ErrorMessageType,
  },
  LOAD_FAILED: {
    title: '読み込み失敗',
    message: 'データの読み込みに失敗しました。',
    action: 'データが破損している可能性があります。別のスロットをお試しください。',
    type: 'error' as ErrorMessageType,
  },
  DELETE_FAILED: {
    title: '削除失敗',
    message: 'データの削除に失敗しました。',
    action: '再度お試しください。',
    type: 'error' as ErrorMessageType,
  },
  EMPTY_SLOT: {
    title: '空きスロット',
    message: 'このスロットにはデータがありません。',
    action: 'データがあるスロットを選択してください。',
    type: 'warning' as ErrorMessageType,
  },
  AUTOSAVE_SLOT: {
    title: 'オートセーブ専用',
    message: 'スロット0はオートセーブ専用です。',
    action: '別のスロット（1-9）を選択してください。',
    type: 'warning' as ErrorMessageType,
  },
};
