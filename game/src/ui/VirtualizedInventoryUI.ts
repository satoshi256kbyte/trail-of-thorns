/**
 * VirtualizedInventoryUI - 仮想スクロールを使用した最適化されたインベントリUI
 * 
 * パフォーマンス最適化:
 * - 仮想スクロール: 表示領域内のアイテムのみをレンダリング
 * - オブジェクトプール: スロット表示オブジェクトの再利用
 * - レンダリング最適化: 不要な再描画を削減
 * 
 * 要件11.1, 11.3対応:
 * - インベントリ画面を500ms以内に表示
 * - 100個のアイテムを保持してもフレームレートを60fps以上維持
 */

import * as Phaser from 'phaser';
import { InventoryManager } from '../systems/InventoryManager';
import { Item, ItemSortType, InventorySlot } from '../types/inventory';

/**
 * 仮想スクロール設定
 */
export interface VirtualScrollConfig {
  /** 表示する行数 */
  visibleRows: number;
  /** 行の高さ */
  rowHeight: number;
  /** バッファ行数（スクロール時のスムーズさのため） */
  bufferRows: number;
}

/**
 * オブジェクトプール
 * スロット表示オブジェクトを再利用してメモリ使用量とGCを削減
 */
class SlotDisplayPool {
  private pool: Phaser.GameObjects.Container[] = [];
  private scene: Phaser.Scene;
  private slotSize: number;

  constructor(scene: Phaser.Scene, slotSize: number, initialSize: number = 20) {
    this.scene = scene;
    this.slotSize = slotSize;

    // 初期プールを作成
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createSlotContainer());
    }
  }

  /**
   * スロットコンテナを作成
   */
  private createSlotContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    container.setVisible(false);

    // 背景
    const background = this.scene.add
      .rectangle(0, 0, this.slotSize, this.slotSize, 0x333333, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    container.add(background);
    container.setData('background', background);

    return container;
  }

  /**
   * プールからコンテナを取得
   */
  acquire(): Phaser.GameObjects.Container {
    if (this.pool.length > 0) {
      const container = this.pool.pop()!;
      container.setVisible(true);
      return container;
    }

    // プールが空の場合は新規作成
    return this.createSlotContainer();
  }

  /**
   * コンテナをプールに返却
   */
  release(container: Phaser.GameObjects.Container): void {
    // コンテナをクリーンアップ
    container.setVisible(false);
    container.setPosition(0, 0);

    // 追加されたオブジェクトを削除（背景以外）
    const background = container.getData('background');
    container.removeAll(false);
    if (background) {
      container.add(background);
    }

    this.pool.push(container);
  }

  /**
   * プールをクリア
   */
  clear(): void {
    this.pool.forEach(container => container.destroy());
    this.pool = [];
  }
}

/**
 * VirtualizedInventoryUIクラス
 * 仮想スクロールを使用した最適化されたインベントリUI
 */
export class VirtualizedInventoryUI {
  private scene: Phaser.Scene;
  private inventoryManager: InventoryManager;
  private virtualScrollConfig: VirtualScrollConfig;

  // オブジェクトプール
  private slotPool: SlotDisplayPool;

  // 仮想スクロール状態
  private scrollOffset: number = 0;
  private totalRows: number = 0;
  private visibleSlots: Map<number, Phaser.GameObjects.Container> = new Map();

  // キャッシュ
  private cachedItems: InventorySlot[] = [];
  private isDirty: boolean = true;

  // パフォーマンス測定
  private renderStartTime: number = 0;

  /**
   * コンストラクタ
   */
  constructor(
    scene: Phaser.Scene,
    inventoryManager: InventoryManager,
    config?: Partial<VirtualScrollConfig>
  ) {
    this.scene = scene;
    this.inventoryManager = inventoryManager;

    this.virtualScrollConfig = {
      visibleRows: 10,
      rowHeight: 72,
      bufferRows: 2,
      ...config,
    };

    // オブジェクトプールを初期化
    const poolSize = (this.virtualScrollConfig.visibleRows + this.virtualScrollConfig.bufferRows * 2) * 10;
    this.slotPool = new SlotDisplayPool(scene, 64, poolSize);

    console.log('[VirtualizedInventoryUI] Initialized with object pool');
  }

  /**
   * アイテム表示を更新（最適化版）
   * 要件11.1対応: インベントリ画面を500ms以内に表示
   */
  updateItemDisplay(): void {
    this.renderStartTime = performance.now();

    // キャッシュが有効な場合は再利用
    if (!this.isDirty) {
      console.log('[VirtualizedInventoryUI] Using cached items');
      return;
    }

    // アイテムデータを取得してキャッシュ
    this.cachedItems = this.inventoryManager.getAllItems();
    this.isDirty = false;

    // 総行数を計算
    const gridColumns = 10;
    this.totalRows = Math.ceil(this.cachedItems.length / gridColumns);

    // 表示領域内のスロットのみをレンダリング
    this.renderVisibleSlots();

    const renderTime = performance.now() - this.renderStartTime;
    console.log(`[VirtualizedInventoryUI] Render time: ${renderTime.toFixed(2)}ms`);

    // パフォーマンス要件チェック（500ms以内）
    if (renderTime > 500) {
      console.warn(`[VirtualizedInventoryUI] Render time exceeded 500ms: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * 表示領域内のスロットのみをレンダリング
   * 要件11.3対応: 100個のアイテムを保持してもフレームレートを60fps以上維持
   */
  private renderVisibleSlots(): void {
    const gridColumns = 10;
    const startRow = Math.max(0, this.scrollOffset - this.virtualScrollConfig.bufferRows);
    const endRow = Math.min(
      this.totalRows,
      this.scrollOffset + this.virtualScrollConfig.visibleRows + this.virtualScrollConfig.bufferRows
    );

    // 現在表示されているスロットのインデックスを計算
    const visibleIndices = new Set<number>();
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const index = row * gridColumns + col;
        if (index < this.cachedItems.length) {
          visibleIndices.add(index);
        }
      }
    }

    // 表示範囲外のスロットをプールに返却
    this.visibleSlots.forEach((container, index) => {
      if (!visibleIndices.has(index)) {
        this.slotPool.release(container);
        this.visibleSlots.delete(index);
      }
    });

    // 表示範囲内のスロットをレンダリング
    visibleIndices.forEach(index => {
      if (!this.visibleSlots.has(index)) {
        const container = this.slotPool.acquire();
        this.updateSlotContent(container, this.cachedItems[index]);
        this.visibleSlots.set(index, container);
      }
    });

    console.log(`[VirtualizedInventoryUI] Rendered ${visibleIndices.size} visible slots`);
  }

  /**
   * スロットの内容を更新
   */
  private updateSlotContent(container: Phaser.GameObjects.Container, slot: InventorySlot): void {
    if (slot.isEmpty || !slot.item) {
      return;
    }

    const item = slot.item;

    // アイコンを追加（簡易実装）
    const iconSize = 56;
    const icon = this.scene.add
      .rectangle(4, 4, iconSize, iconSize, 0x888888, 1)
      .setOrigin(0, 0);

    container.add(icon);

    // 数量テキストを追加
    if (slot.quantity > 1) {
      const quantityText = this.scene.add
        .text(60, 60, slot.quantity.toString(), {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 2, y: 2 },
        })
        .setOrigin(1, 1);

      container.add(quantityText);
    }
  }

  /**
   * スクロール処理
   */
  scroll(delta: number): void {
    const newOffset = Math.max(0, Math.min(this.totalRows - this.virtualScrollConfig.visibleRows, this.scrollOffset + delta));

    if (newOffset !== this.scrollOffset) {
      this.scrollOffset = newOffset;
      this.renderVisibleSlots();
    }
  }

  /**
   * キャッシュを無効化
   */
  invalidateCache(): void {
    this.isDirty = true;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.visibleSlots.forEach(container => this.slotPool.release(container));
    this.visibleSlots.clear();
    this.slotPool.clear();

    console.log('[VirtualizedInventoryUI] Destroyed');
  }
}
