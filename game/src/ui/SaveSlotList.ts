/**
 * SaveSlotList - セーブスロットリストコンポーネント
 * Task 4.1.2: SaveSlotListとSaveSlotButtonの実装
 *
 * 10個のセーブスロットを管理し、一覧表示するコンポーネント
 */

import * as Phaser from 'phaser';
import { SaveSlot } from '../types/chapterStage';
import { SaveSlotButton } from './SaveSlotButton';

/**
 * SaveSlotList class
 * セーブスロット一覧の表示と選択管理
 */
export class SaveSlotList {
  private scene: Phaser.Scene;
  private slotButtons: SaveSlotButton[] = [];
  private selectedIndex: number = -1;
  private onSlotSelectCallback?: (slotId: number) => void;

  // レイアウト定数
  private static readonly SLOT_SPACING = 110;
  private static readonly MAX_VISIBLE_SLOTS = 10;

  // コンテナ
  private container?: Phaser.GameObjects.Container;

  /**
   * Constructor
   * @param scene - Phaser scene instance
   * @param x - X position
   * @param y - Y position
   * @param onSlotSelect - スロット選択時のコールバック
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onSlotSelect?: (slotId: number) => void
  ) {
    this.scene = scene;
    this.onSlotSelectCallback = onSlotSelect;

    // コンテナの作成
    this.container = this.scene.add.container(x, y);

    console.log('SaveSlotList created');
  }

  /**
   * セーブスロット一覧の作成
   * @param saveSlots - セーブスロット情報の配列
   */
  public create(saveSlots: SaveSlot[]): void {
    // 既存のボタンをクリア
    this.clear();

    // 10個のスロットボタンを作成
    for (let i = 0; i < SaveSlotList.MAX_VISIBLE_SLOTS; i++) {
      const saveSlot = saveSlots[i];

      if (!saveSlot) {
        console.warn(`SaveSlot ${i} not found`);
        continue;
      }

      const yOffset = i * SaveSlotList.SLOT_SPACING;

      const slotButton = new SaveSlotButton(
        this.scene,
        0,
        yOffset,
        saveSlot,
        (slotId) => this.handleSlotSelect(slotId)
      );

      this.slotButtons.push(slotButton);

      if (this.container) {
        this.container.add(slotButton);
      }
    }

    console.log(`SaveSlotList: ${this.slotButtons.length} slots created`);
  }

  /**
   * スロット選択処理
   * @param slotId - 選択されたスロットID
   */
  private handleSlotSelect(slotId: number): void {
    // 選択状態の更新
    this.selectSlotById(slotId);

    // コールバック実行
    if (this.onSlotSelectCallback) {
      this.onSlotSelectCallback(slotId);
    }

    console.log(`SaveSlotList: slot ${slotId} selected`);
  }

  /**
   * スロットIDで選択
   * @param slotId - スロットID
   */
  public selectSlotById(slotId: number): void {
    const index = this.slotButtons.findIndex((button) => button.getSlotId() === slotId);

    if (index !== -1) {
      this.selectSlot(index);
    }
  }

  /**
   * インデックスでスロット選択
   * @param index - スロットインデックス
   */
  public selectSlot(index: number): void {
    if (index < 0 || index >= this.slotButtons.length) {
      console.warn(`Invalid slot index: ${index}`);
      return;
    }

    // 前の選択を解除
    if (this.selectedIndex !== -1 && this.slotButtons[this.selectedIndex]) {
      this.slotButtons[this.selectedIndex].setSelected(false);
    }

    // 新しい選択を設定
    this.selectedIndex = index;
    this.slotButtons[index].setSelected(true);

    console.log(`SaveSlotList: slot index ${index} selected`);
  }

  /**
   * 次のスロットを選択
   */
  public selectNext(): void {
    if (this.slotButtons.length === 0) return;

    const nextIndex = (this.selectedIndex + 1) % this.slotButtons.length;
    this.selectSlot(nextIndex);
  }

  /**
   * 前のスロットを選択
   */
  public selectPrevious(): void {
    if (this.slotButtons.length === 0) return;

    const prevIndex =
      this.selectedIndex <= 0 ? this.slotButtons.length - 1 : this.selectedIndex - 1;
    this.selectSlot(prevIndex);
  }

  /**
   * セーブスロット情報の更新
   * @param saveSlots - 新しいセーブスロット情報の配列
   */
  public updateSlots(saveSlots: SaveSlot[]): void {
    for (let i = 0; i < this.slotButtons.length; i++) {
      const saveSlot = saveSlots[i];

      if (saveSlot && this.slotButtons[i]) {
        this.slotButtons[i].updateSaveSlot(saveSlot);
      }
    }

    console.log('SaveSlotList: slots updated');
  }

  /**
   * 選択中のスロットIDを取得
   * @returns 選択中のスロットID、未選択の場合はnull
   */
  public getSelectedSlotId(): number | null {
    if (this.selectedIndex === -1 || !this.slotButtons[this.selectedIndex]) {
      return null;
    }

    return this.slotButtons[this.selectedIndex].getSlotId();
  }

  /**
   * 選択中のスロットボタンを取得
   * @returns 選択中のスロットボタン、未選択の場合はnull
   */
  public getSelectedSlotButton(): SaveSlotButton | null {
    if (this.selectedIndex === -1 || !this.slotButtons[this.selectedIndex]) {
      return null;
    }

    return this.slotButtons[this.selectedIndex];
  }

  /**
   * 全スロットボタンを取得
   * @returns スロットボタンの配列
   */
  public getSlotButtons(): SaveSlotButton[] {
    return [...this.slotButtons];
  }

  /**
   * スロットボタンをIDで取得
   * @param slotId - スロットID
   * @returns スロットボタン、見つからない場合はnull
   */
  public getSlotButtonById(slotId: number): SaveSlotButton | null {
    return this.slotButtons.find((button) => button.getSlotId() === slotId) || null;
  }

  /**
   * 選択中のスロットがセーブデータを持っているかチェック
   * @returns セーブデータがある場合true
   */
  public selectedSlotHasSaveData(): boolean {
    const selectedButton = this.getSelectedSlotButton();
    return selectedButton ? selectedButton.hasSaveData() : false;
  }

  /**
   * 選択中のスロットがオートセーブスロットかチェック
   * @returns オートセーブスロットの場合true
   */
  public selectedSlotIsAutoSave(): boolean {
    const selectedButton = this.getSelectedSlotButton();
    return selectedButton ? selectedButton.isAutoSaveSlot() : false;
  }

  /**
   * スロット数を取得
   * @returns スロット数
   */
  public getSlotCount(): number {
    return this.slotButtons.length;
  }

  /**
   * 全スロットをクリア
   */
  public clear(): void {
    // 全ボタンを破棄
    this.slotButtons.forEach((button) => {
      button.destroy();
    });

    this.slotButtons = [];
    this.selectedIndex = -1;

    console.log('SaveSlotList: cleared');
  }

  /**
   * コンテナの表示/非表示
   * @param visible - 表示する場合true
   */
  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }

  /**
   * コンテナの位置設定
   * @param x - X position
   * @param y - Y position
   */
  public setPosition(x: number, y: number): void {
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  /**
   * コンテナの取得
   * @returns Phaser container
   */
  public getContainer(): Phaser.GameObjects.Container | undefined {
    return this.container;
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    // 全ボタンを破棄
    this.clear();

    // コンテナを破棄
    if (this.container) {
      this.container.destroy();
      this.container = undefined;
    }

    console.log('SaveSlotList: destroyed');
  }
}
