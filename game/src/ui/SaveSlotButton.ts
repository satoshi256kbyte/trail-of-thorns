/**
 * SaveSlotButton - セーブスロットボタンコンポーネント
 * Task 4.1.2: SaveSlotListとSaveSlotButtonの実装
 *
 * 個別のセーブスロットを表示するボタンコンポーネント
 * Phaser.GameObjects.Containerを継承し、スロット情報を視覚的に表示
 */

import * as Phaser from 'phaser';
import { SaveSlot } from '../types/chapterStage';
import { NavigableElement } from '../utils/KeyboardNavigationManager';

/**
 * SaveSlotButton class
 * セーブスロット1つ分の表示と選択を管理
 */
export class SaveSlotButton extends Phaser.GameObjects.Container implements NavigableElement {
  private slotId: number;
  private saveSlot: SaveSlot;
  private isAutoSave: boolean;
  private isSelected: boolean = false;
  private isFocused: boolean = false;

  // UI要素
  private background?: Phaser.GameObjects.Rectangle;
  private slotNumberText?: Phaser.GameObjects.Text;
  private chapterNameText?: Phaser.GameObjects.Text;
  private lastSavedText?: Phaser.GameObjects.Text;
  private playTimeText?: Phaser.GameObjects.Text;
  private emptySlotText?: Phaser.GameObjects.Text;
  private focusOverlay?: Phaser.GameObjects.Rectangle;

  // レイアウト定数
  private static readonly WIDTH = 300;
  private static readonly HEIGHT = 100;
  private static readonly PADDING = 10;
  private static readonly BACKGROUND_COLOR = 0x2c3e50;
  private static readonly SELECTED_COLOR = 0x3498db;
  private static readonly FOCUS_COLOR = 0x2ecc71;
  private static readonly EMPTY_COLOR = 0x34495e;

  // コールバック
  private onSelectCallback?: (slotId: number) => void;

  /**
   * Constructor
   * @param scene - Phaser scene instance
   * @param x - X position
   * @param y - Y position
   * @param saveSlot - セーブスロット情報
   * @param onSelect - 選択時のコールバック
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    saveSlot: SaveSlot,
    onSelect?: (slotId: number) => void
  ) {
    super(scene, x, y);

    this.slotId = saveSlot.slotId;
    this.saveSlot = saveSlot;
    this.isAutoSave = saveSlot.slotId === 0;
    this.onSelectCallback = onSelect;

    // シーンに追加
    scene.add.existing(this);

    // UI要素の作成
    this.createBackground();
    this.createSlotInfo();
    this.createFocusOverlay();

    // インタラクティブ設定
    this.setupInteractive();

    console.log(`SaveSlotButton created: slot ${this.slotId}`);
  }

  /**
   * 背景の作成
   */
  private createBackground(): void {
    const isEmpty = this.saveSlot.saveData === null;
    const bgColor = isEmpty ? SaveSlotButton.EMPTY_COLOR : SaveSlotButton.BACKGROUND_COLOR;

    this.background = this.scene.add.rectangle(
      0,
      0,
      SaveSlotButton.WIDTH,
      SaveSlotButton.HEIGHT,
      bgColor,
      1
    );

    this.background.setStrokeStyle(2, 0x7f8c8d);
    this.add(this.background);
  }

  /**
   * スロット情報の作成
   */
  private createSlotInfo(): void {
    const isEmpty = this.saveSlot.saveData === null;

    // スロット番号またはオートセーブ表示
    const slotLabel = this.isAutoSave ? 'オートセーブ' : `スロット${this.slotId}`;

    this.slotNumberText = this.scene.add.text(
      -SaveSlotButton.WIDTH / 2 + SaveSlotButton.PADDING,
      -SaveSlotButton.HEIGHT / 2 + SaveSlotButton.PADDING,
      slotLabel,
      {
        fontSize: '18px',
        color: this.isAutoSave ? '#f39c12' : '#ecf0f1',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      }
    );

    this.add(this.slotNumberText);

    if (isEmpty) {
      // 空スロットの表示
      this.emptySlotText = this.scene.add.text(
        0,
        0,
        '空きスロット',
        {
          fontSize: '16px',
          color: '#95a5a6',
          fontFamily: 'Arial, sans-serif',
          align: 'center',
        }
      );

      this.emptySlotText.setOrigin(0.5, 0.5);
      this.add(this.emptySlotText);
    } else {
      // セーブデータありの表示
      this.createSaveDataInfo();
    }
  }

  /**
   * セーブデータ情報の作成
   */
  private createSaveDataInfo(): void {
    if (!this.saveSlot.saveData) return;

    const saveData = this.saveSlot.saveData;

    // 章名表示
    const chapterName = saveData.chapterState.currentChapterId || '不明な章';
    this.chapterNameText = this.scene.add.text(
      -SaveSlotButton.WIDTH / 2 + SaveSlotButton.PADDING,
      -SaveSlotButton.HEIGHT / 2 + SaveSlotButton.PADDING + 25,
      chapterName,
      {
        fontSize: '16px',
        color: '#ecf0f1',
        fontFamily: 'Arial, sans-serif',
      }
    );

    this.add(this.chapterNameText);

    // 最終保存日時表示
    const lastSavedDate = new Date(saveData.timestamp);
    const dateStr = this.formatDate(lastSavedDate);

    this.lastSavedText = this.scene.add.text(
      -SaveSlotButton.WIDTH / 2 + SaveSlotButton.PADDING,
      -SaveSlotButton.HEIGHT / 2 + SaveSlotButton.PADDING + 45,
      dateStr,
      {
        fontSize: '14px',
        color: '#bdc3c7',
        fontFamily: 'Arial, sans-serif',
      }
    );

    this.add(this.lastSavedText);

    // プレイ時間表示
    const playTimeStr = this.formatPlayTime(saveData.playTime);

    this.playTimeText = this.scene.add.text(
      -SaveSlotButton.WIDTH / 2 + SaveSlotButton.PADDING,
      -SaveSlotButton.HEIGHT / 2 + SaveSlotButton.PADDING + 65,
      playTimeStr,
      {
        fontSize: '14px',
        color: '#bdc3c7',
        fontFamily: 'Arial, sans-serif',
      }
    );

    this.add(this.playTimeText);
  }

  /**
   * フォーカスオーバーレイの作成
   */
  private createFocusOverlay(): void {
    this.focusOverlay = this.scene.add.rectangle(
      0,
      0,
      SaveSlotButton.WIDTH,
      SaveSlotButton.HEIGHT,
      SaveSlotButton.FOCUS_COLOR,
      0.2
    );

    this.focusOverlay.setStrokeStyle(3, SaveSlotButton.FOCUS_COLOR);
    this.focusOverlay.setVisible(false);
    this.add(this.focusOverlay);

    // フォーカスオーバーレイを最前面に
    this.bringToTop(this.focusOverlay);
  }

  /**
   * インタラクティブ設定
   */
  private setupInteractive(): void {
    if (!this.background) return;

    this.background.setInteractive({ useHandCursor: true });

    // クリックイベント
    this.background.on('pointerdown', () => {
      this.handleSelect();
    });

    // ホバーイベント
    this.background.on('pointerover', () => {
      this.handleHover();
    });

    this.background.on('pointerout', () => {
      this.handleHoverOut();
    });
  }

  /**
   * 選択処理
   */
  private handleSelect(): void {
    console.log(`SaveSlotButton selected: slot ${this.slotId}`);

    if (this.onSelectCallback) {
      this.onSelectCallback(this.slotId);
    }
  }

  /**
   * ホバー処理
   */
  private handleHover(): void {
    if (!this.background || this.isSelected) return;

    this.scene.tweens.add({
      targets: this.background,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 100,
      ease: 'Power2',
    });
  }

  /**
   * ホバー解除処理
   */
  private handleHoverOut(): void {
    if (!this.background || this.isSelected) return;

    this.scene.tweens.add({
      targets: this.background,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2',
    });
  }

  /**
   * 選択状態の設定
   * @param selected - 選択状態
   */
  public setSelected(selected: boolean): void {
    this.isSelected = selected;

    if (!this.background) return;

    if (selected) {
      // 選択時: 色変更とスケールアップアニメーション
      this.background.setFillStyle(SaveSlotButton.SELECTED_COLOR);
      this.background.setStrokeStyle(3, 0xffffff);

      // スケールアップアニメーション
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Back.easeOut',
      });

      // 選択枠のフェードイン（フォーカスオーバーレイを活用）
      if (this.focusOverlay) {
        this.focusOverlay.setVisible(true);
        this.focusOverlay.setAlpha(0);
        this.focusOverlay.setStrokeStyle(3, SaveSlotButton.SELECTED_COLOR);

        this.scene.tweens.add({
          targets: this.focusOverlay,
          alpha: 0.3,
          duration: 200,
          ease: 'Power2',
        });
      }
    } else {
      // 選択解除時: 色変更とスケールダウンアニメーション
      const isEmpty = this.saveSlot.saveData === null;
      const bgColor = isEmpty ? SaveSlotButton.EMPTY_COLOR : SaveSlotButton.BACKGROUND_COLOR;
      this.background.setFillStyle(bgColor);
      this.background.setStrokeStyle(2, 0x7f8c8d);

      // スケールダウンアニメーション
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Power2',
      });

      // 選択枠のフェードアウト
      if (this.focusOverlay && !this.isFocused) {
        this.scene.tweens.add({
          targets: this.focusOverlay,
          alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            if (this.focusOverlay && !this.isFocused) {
              this.focusOverlay.setVisible(false);
            }
          },
        });
      }
    }
  }

  /**
   * セーブスロット情報の更新
   * @param saveSlot - 新しいセーブスロット情報
   */
  public updateSaveSlot(saveSlot: SaveSlot): void {
    this.saveSlot = saveSlot;

    // 既存のUI要素を削除
    this.removeAll(true);

    // UI要素を再作成
    this.createBackground();
    this.createSlotInfo();
    this.createFocusOverlay();

    console.log(`SaveSlotButton updated: slot ${this.slotId}`);
  }

  /**
   * スロットIDの取得
   * @returns スロットID
   */
  public getSlotId(): number {
    return this.slotId;
  }

  /**
   * セーブデータの有無を取得
   * @returns セーブデータがある場合true
   */
  public hasSaveData(): boolean {
    return this.saveSlot.saveData !== null;
  }

  /**
   * オートセーブスロットかどうかを取得
   * @returns オートセーブスロットの場合true
   */
  public isAutoSaveSlot(): boolean {
    return this.isAutoSave;
  }

  /**
   * 日付のフォーマット
   * @param date - Date object
   * @returns フォーマットされた日付文字列
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  /**
   * プレイ時間のフォーマット
   * @param playTime - プレイ時間（ミリ秒）
   * @returns フォーマットされたプレイ時間文字列
   */
  private formatPlayTime(playTime: number): string {
    const totalSeconds = Math.floor(playTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // NavigableElement interface implementation

  /**
   * Get the display object for visual focus indication
   * @returns This container as the display object
   */
  public getDisplayObject(): Phaser.GameObjects.GameObject {
    return this;
  }

  /**
   * Called when element receives focus
   * Shows visual focus indicator
   */
  public onFocus(): void {
    if (this.isFocused) return;

    this.isFocused = true;

    if (this.focusOverlay) {
      this.focusOverlay.setVisible(true);
      this.focusOverlay.setAlpha(0);

      this.scene.tweens.add({
        targets: this.focusOverlay,
        alpha: 0.2,
        duration: 200,
        ease: 'Power2',
      });
    }

    console.log(`SaveSlotButton focused: slot ${this.slotId}`);
  }

  /**
   * Called when element loses focus
   * Hides visual focus indicator
   */
  public onBlur(): void {
    if (!this.isFocused) return;

    this.isFocused = false;

    if (this.focusOverlay) {
      this.scene.tweens.add({
        targets: this.focusOverlay,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          if (this.focusOverlay) {
            this.focusOverlay.setVisible(false);
          }
        },
      });
    }

    console.log(`SaveSlotButton blurred: slot ${this.slotId}`);
  }

  /**
   * Called when element is activated (Enter/Space pressed)
   * Triggers the button's select action
   */
  public onActivate(): void {
    if (this.isInteractive()) {
      this.handleSelect();
    }

    console.log(`SaveSlotButton activated: slot ${this.slotId}`);
  }

  /**
   * Check if element is currently interactive/enabled
   * @returns True if interactive, false otherwise
   */
  public isInteractive(): boolean {
    return this.background !== undefined && this.background.input !== null;
  }

  /**
   * Get unique identifier for this element
   * @returns Element ID
   */
  public getId(): string {
    return `save-slot-button-${this.slotId}`;
  }

  /**
   * Cleanup method
   */
  public destroy(fromScene?: boolean): void {
    // Clean up focus state
    if (this.isFocused) {
      this.onBlur();
    }

    // Destroy all child objects
    this.removeAll(true);

    console.log(`SaveSlotButton destroyed: slot ${this.slotId}`);

    // Call parent destroy
    super.destroy(fromScene);
  }
}
