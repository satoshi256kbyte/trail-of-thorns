/**
 * SaveSlotDetailPanel - セーブスロット詳細情報パネル
 * Task 4.1.3: SaveSlotDetailPanelの実装
 *
 * 選択中のセーブスロットの詳細情報を表示するパネルコンポーネント
 */

import * as Phaser from 'phaser';
import { SaveSlot, SaveData } from '../types/chapterStage';
import { SaveDataValidator } from '../systems/chapterStage/SaveDataValidator';

/**
 * SaveSlotDetailPanel class
 * 選択中のスロットの詳細情報表示
 */
export class SaveSlotDetailPanel extends Phaser.GameObjects.Container {
  private currentSlot: SaveSlot | null = null;
  private validator: SaveDataValidator;

  // UI要素
  private background?: Phaser.GameObjects.Rectangle;
  private border?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private contentContainer?: Phaser.GameObjects.Container;

  // レイアウト定数
  private static readonly WIDTH = 600;
  private static readonly HEIGHT = 500;
  private static readonly PADDING = 20;
  private static readonly LINE_HEIGHT = 30;
  private static readonly BACKGROUND_COLOR = 0x2c3e50;
  private static readonly BORDER_COLOR = 0x7f8c8d;
  private static readonly TITLE_COLOR = '#ecf0f1';
  private static readonly TEXT_COLOR = '#bdc3c7';
  private static readonly WARNING_COLOR = '#e74c3c';
  private static readonly EMPTY_COLOR = '#95a5a6';

  /**
   * Constructor
   * @param scene - Phaser scene instance
   * @param x - X position
   * @param y - Y position
   */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // バリデーターの初期化
    this.validator = new SaveDataValidator();

    // シーンに追加
    scene.add.existing(this);

    // UI要素の作成
    this.createBackground();
    this.createTitle();
    this.createContentContainer();

    console.log('SaveSlotDetailPanel created');
  }

  /**
   * 背景の作成
   */
  private createBackground(): void {
    // 背景パネル
    this.background = this.scene.add.rectangle(
      0,
      0,
      SaveSlotDetailPanel.WIDTH,
      SaveSlotDetailPanel.HEIGHT,
      SaveSlotDetailPanel.BACKGROUND_COLOR,
      1
    );

    this.add(this.background);

    // ボーダー
    this.border = this.scene.add.rectangle(
      0,
      0,
      SaveSlotDetailPanel.WIDTH,
      SaveSlotDetailPanel.HEIGHT,
      0x000000,
      0
    );

    this.border.setStrokeStyle(2, SaveSlotDetailPanel.BORDER_COLOR);
    this.add(this.border);
  }

  /**
   * タイトルの作成
   */
  private createTitle(): void {
    this.titleText = this.scene.add.text(
      -SaveSlotDetailPanel.WIDTH / 2 + SaveSlotDetailPanel.PADDING,
      -SaveSlotDetailPanel.HEIGHT / 2 + SaveSlotDetailPanel.PADDING,
      '詳細情報',
      {
        fontSize: '24px',
        color: SaveSlotDetailPanel.TITLE_COLOR,
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      }
    );

    this.add(this.titleText);
  }

  /**
   * コンテンツコンテナの作成
   */
  private createContentContainer(): void {
    this.contentContainer = this.scene.add.container(
      -SaveSlotDetailPanel.WIDTH / 2 + SaveSlotDetailPanel.PADDING,
      -SaveSlotDetailPanel.HEIGHT / 2 + SaveSlotDetailPanel.PADDING + 50
    );

    this.add(this.contentContainer);
  }

  /**
   * 詳細情報の更新
   * @param slot - セーブスロット情報
   */
  public updateDetails(slot: SaveSlot | null): void {
    this.currentSlot = slot;

    // コンテンツをクリア
    this.clearContent();

    if (!slot) {
      this.showEmptyMessage();
      return;
    }

    if (!slot.saveData) {
      this.showEmptySlotMessage();
      return;
    }

    // セーブデータの詳細を表示
    this.showSaveDataDetails(slot.saveData);

    // データ検証と警告表示
    this.validateAndShowWarnings(slot.saveData);

    console.log(`SaveSlotDetailPanel: details updated for slot ${slot.slotId}`);
  }

  /**
   * コンテンツのクリア
   */
  private clearContent(): void {
    if (this.contentContainer) {
      this.contentContainer.removeAll(true);
    }
  }

  /**
   * 空メッセージの表示（スロット未選択）
   */
  private showEmptyMessage(): void {
    if (!this.contentContainer) return;

    const emptyText = this.scene.add.text(
      0,
      SaveSlotDetailPanel.HEIGHT / 2 - 100,
      'スロットを選択してください',
      {
        fontSize: '18px',
        color: SaveSlotDetailPanel.EMPTY_COLOR,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
      }
    );

    this.contentContainer.add(emptyText);
  }

  /**
   * 空スロットメッセージの表示
   */
  private showEmptySlotMessage(): void {
    if (!this.contentContainer) return;

    const emptyText = this.scene.add.text(
      0,
      SaveSlotDetailPanel.HEIGHT / 2 - 100,
      'データなし',
      {
        fontSize: '20px',
        color: SaveSlotDetailPanel.EMPTY_COLOR,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
        fontStyle: 'bold',
      }
    );

    this.contentContainer.add(emptyText);
  }

  /**
   * セーブデータ詳細の表示
   * @param saveData - セーブデータ
   */
  private showSaveDataDetails(saveData: SaveData): void {
    if (!this.contentContainer) return;

    let yOffset = 0;

    // 章名とステージ名
    const chapterName = saveData.chapterState.chapterId || '不明な章';
    const stageName = saveData.chapterState.currentStageIndex !== undefined
      ? `ステージ ${saveData.chapterState.currentStageIndex + 1}`
      : '不明なステージ';

    const chapterText = this.scene.add.text(
      0,
      yOffset,
      `章: ${chapterName}`,
      {
        fontSize: '18px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(chapterText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT;

    const stageText = this.scene.add.text(
      0,
      yOffset,
      `${stageName}`,
      {
        fontSize: '16px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(stageText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT + 10;

    // 推奨レベル（仮の値、実際のデータ構造に応じて調整）
    const recommendedLevel = 5; // TODO: 実際のデータから取得
    const levelText = this.scene.add.text(
      0,
      yOffset,
      `推奨レベル: ${recommendedLevel}`,
      {
        fontSize: '16px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(levelText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT;

    // プレイ時間
    const playTimeStr = this.formatPlayTime(saveData.playTime);
    const playTimeText = this.scene.add.text(
      0,
      yOffset,
      `プレイ時間: ${playTimeStr}`,
      {
        fontSize: '16px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(playTimeText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT;

    // 最終保存日時
    const lastSavedDate = new Date(saveData.timestamp);
    const dateStr = this.formatDate(lastSavedDate);
    const lastSavedText = this.scene.add.text(
      0,
      yOffset,
      `最終保存: ${dateStr}`,
      {
        fontSize: '16px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(lastSavedText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT + 10;

    // パーティ編成
    yOffset = this.showPartyComposition(saveData, yOffset);

    // 完了済みステージ数
    yOffset = this.showCompletedStages(saveData, yOffset);

    // データ破損警告（必要に応じて）
    // TODO: SaveDataValidatorとの統合
  }

  /**
   * パーティ編成情報の表示
   * @param saveData - セーブデータ
   * @param yOffset - Y座標オフセット
   * @returns 更新後のY座標オフセット
   */
  private showPartyComposition(saveData: SaveData, yOffset: number): number {
    if (!this.contentContainer) return yOffset;

    const partyTitle = this.scene.add.text(
      0,
      yOffset,
      'パーティ編成:',
      {
        fontSize: '18px',
        color: SaveSlotDetailPanel.TITLE_COLOR,
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      }
    );
    this.contentContainer.add(partyTitle);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT;

    // パーティメンバーの表示（最大6人）
    const members = saveData.partyComposition?.members || [];
    if (members.length === 0) {
      const noMembersText = this.scene.add.text(
        10,
        yOffset,
        'パーティメンバーなし',
        {
          fontSize: '14px',
          color: SaveSlotDetailPanel.EMPTY_COLOR,
          fontFamily: 'Arial, sans-serif',
        }
      );
      this.contentContainer.add(noMembersText);
      yOffset += SaveSlotDetailPanel.LINE_HEIGHT;
    } else {
      members.slice(0, 6).forEach((memberId, index) => {
        const memberText = this.scene.add.text(
          10,
          yOffset,
          `- ${memberId}`,
          {
            fontSize: '14px',
            color: SaveSlotDetailPanel.TEXT_COLOR,
            fontFamily: 'Arial, sans-serif',
          }
        );
        this.contentContainer.add(memberText);
        yOffset += SaveSlotDetailPanel.LINE_HEIGHT - 5;
      });
    }

    yOffset += 10;
    return yOffset;
  }

  /**
   * 完了済みステージ数の表示
   * @param saveData - セーブデータ
   * @param yOffset - Y座標オフセット
   * @returns 更新後のY座標オフセット
   */
  private showCompletedStages(saveData: SaveData, yOffset: number): number {
    if (!this.contentContainer) return yOffset;

    const completedCount = saveData.chapterState.completedStageIds?.length || 0;
    const totalCount = saveData.stageProgress?.stages?.length || 0;

    const completedText = this.scene.add.text(
      0,
      yOffset,
      `完了ステージ: ${completedCount}/${totalCount}`,
      {
        fontSize: '16px',
        color: SaveSlotDetailPanel.TEXT_COLOR,
        fontFamily: 'Arial, sans-serif',
      }
    );
    this.contentContainer.add(completedText);
    yOffset += SaveSlotDetailPanel.LINE_HEIGHT;

    return yOffset;
  }

  /**
   * データ破損警告の表示
   */
  private showCorruptionWarning(): void {
    if (!this.contentContainer) return;

    const warningText = this.scene.add.text(
      0,
      SaveSlotDetailPanel.HEIGHT - 100,
      '⚠ データ破損',
      {
        fontSize: '18px',
        color: SaveSlotDetailPanel.WARNING_COLOR,
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      }
    );

    this.contentContainer.add(warningText);
  }

  /**
   * データ検証と警告表示
   * @param saveData - セーブデータ
   */
  private validateAndShowWarnings(saveData: SaveData): void {
    if (!this.contentContainer) return;

    // データ検証
    const validationResult = this.validator.validateSaveData(saveData);

    // エラーがある場合は警告を表示
    if (!validationResult.isValid) {
      this.showCorruptionWarning();
      
      console.warn('Save data validation failed:', validationResult.errors);
    }

    // 警告がある場合はログに出力
    if (validationResult.warnings.length > 0) {
      console.warn('Save data warnings:', validationResult.warnings);
    }
  }

  /**
   * 日付のフォーマット
   * @param date - Date object
   * @returns フォーマットされた日付文字列（年/月/日 時:分形式）
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
   * @returns フォーマットされたプレイ時間文字列（時:分:秒形式）
   */
  private formatPlayTime(playTime: number): string {
    const totalSeconds = Math.floor(playTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * 現在のスロット情報を取得
   * @returns 現在のスロット情報
   */
  public getCurrentSlot(): SaveSlot | null {
    return this.currentSlot;
  }

  /**
   * パネルの表示/非表示
   * @param visible - 表示する場合true
   */
  public setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Cleanup method
   */
  public destroy(fromScene?: boolean): void {
    // コンテンツをクリア
    this.clearContent();

    // 全子要素を破棄
    this.removeAll(true);

    console.log('SaveSlotDetailPanel destroyed');

    // Call parent destroy
    super.destroy(fromScene);
  }
}
