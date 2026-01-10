/**
 * InventoryUI - インベントリ画面の表示と操作を担当するUIコンポーネント
 * 
 * 要件6.1, 6.2, 6.3, 6.4, 6.5, 6.6に対応:
 * - インベントリ画面の表示・非表示
 * - グリッド形式でのアイテム表示
 * - アイテム選択と詳細情報表示
 * - アクションメニュー（使用・装備・破棄）
 * - キーボード・マウス操作
 * - ドラッグ&ドロップによる並び替え
 */

import * as Phaser from 'phaser';
import { InventoryManager } from '../systems/InventoryManager';
import { Item, ItemSortType, InventorySlot } from '../types/inventory';

/**
 * インベントリUI設定
 */
export interface InventoryUIConfig {
  /** グリッドの列数 */
  gridColumns: number;
  /** グリッドの行数 */
  gridRows: number;
  /** スロットのサイズ */
  slotSize: number;
  /** スロット間のスペース */
  slotSpacing: number;
  /** UI表示位置 */
  position: { x: number; y: number };
  /** UIの深度 */
  depth: number;
  /** 背景色 */
  backgroundColor: number;
  /** 背景の透明度 */
  backgroundAlpha: number;
}

/**
 * アイテムスロット表示データ
 */
export interface ItemSlotDisplay {
  slotIndex: number;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  quantityText?: Phaser.GameObjects.Text;
  item: Item | null;
  quantity: number;
  isSelected: boolean;
  isDragging: boolean;
}

/**
 * アクションメニュー項目
 */
export interface ActionMenuItem {
  label: string;
  action: () => void;
  enabled: boolean;
}

/**
 * InventoryUIクラス
 * インベントリ画面の表示と操作を管理
 */
export class InventoryUI extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private inventoryManager: InventoryManager;
  private config: InventoryUIConfig;

  // UI containers
  private mainContainer?: Phaser.GameObjects.Container;
  private gridContainer?: Phaser.GameObjects.Container;
  private detailPanel?: Phaser.GameObjects.Container;
  private actionMenu?: Phaser.GameObjects.Container;

  // Slot displays
  private slotDisplays: Map<number, ItemSlotDisplay> = new Map();
  private selectedSlotIndex: number | null = null;
  private draggedSlotIndex: number | null = null;

  // UI state
  private isVisible: boolean = false;
  private currentSortType: ItemSortType = ItemSortType.TYPE;

  // Default configuration
  private static readonly DEFAULT_CONFIG: InventoryUIConfig = {
    gridColumns: 10,
    gridRows: 10,
    slotSize: 64,
    slotSpacing: 8,
    position: { x: 100, y: 100 },
    depth: 1000,
    backgroundColor: 0x000000,
    backgroundAlpha: 0.8,
  };

  /**
   * コンストラクタ
   * 
   * @param scene - Phaserシーン
   * @param inventoryManager - インベントリマネージャー
   * @param config - UI設定（オプション）
   */
  constructor(
    scene: Phaser.Scene,
    inventoryManager: InventoryManager,
    config?: Partial<InventoryUIConfig>
  ) {
    super();

    this.scene = scene;
    this.inventoryManager = inventoryManager;
    this.config = { ...InventoryUI.DEFAULT_CONFIG, ...config };

    this.initializeUI();
    this.setupInputHandlers();

    console.log('[InventoryUI] Initialized');
  }

  /**
   * UIを初期化
   * 要件6.1, 6.2対応: インベントリ画面の表示、グリッド形式表示
   */
  private initializeUI(): void {
    // メインコンテナを作成
    this.mainContainer = this.scene.add
      .container(this.config.position.x, this.config.position.y)
      .setDepth(this.config.depth)
      .setVisible(false);

    // 背景を作成
    const width = this.config.gridColumns * (this.config.slotSize + this.config.slotSpacing);
    const height = this.config.gridRows * (this.config.slotSize + this.config.slotSpacing) + 200;

    const background = this.scene.add
      .rectangle(0, 0, width, height, this.config.backgroundColor, this.config.backgroundAlpha)
      .setOrigin(0, 0);

    this.mainContainer.add(background);

    // グリッドコンテナを作成
    this.gridContainer = this.scene.add.container(0, 50);
    this.mainContainer.add(this.gridContainer);

    // スロットを作成
    this.createSlots();

    // 詳細パネルを作成
    this.createDetailPanel();

    // ソートボタンを作成
    this.createSortButtons();

    // 閉じるボタンを作成
    this.createCloseButton();
  }

  /**
   * スロットを作成
   * 要件6.2対応: グリッド形式でのアイテム表示
   */
  private createSlots(): void {
    const totalSlots = this.config.gridColumns * this.config.gridRows;

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / this.config.gridColumns);
      const col = i % this.config.gridColumns;

      const x = col * (this.config.slotSize + this.config.slotSpacing);
      const y = row * (this.config.slotSize + this.config.slotSpacing);

      const slotContainer = this.scene.add.container(x, y);

      // スロット背景
      const background = this.scene.add
        .rectangle(0, 0, this.config.slotSize, this.config.slotSize, 0x333333, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x666666);

      slotContainer.add(background);

      // インタラクティブに設定
      background.setInteractive({ useHandCursor: true });

      // クリックイベント
      background.on('pointerdown', () => this.onSlotClick(i));
      background.on('pointerover', () => this.onSlotHover(i));
      background.on('pointerout', () => this.onSlotOut(i));

      // ドラッグイベント
      background.on('dragstart', () => this.onDragStart(i));
      background.on('drag', (pointer: Phaser.Input.Pointer) => this.onDrag(i, pointer));
      background.on('dragend', () => this.onDragEnd(i));

      this.gridContainer!.add(slotContainer);

      // スロット表示データを保存
      const slotDisplay: ItemSlotDisplay = {
        slotIndex: i,
        container: slotContainer,
        background,
        item: null,
        quantity: 0,
        isSelected: false,
        isDragging: false,
      };

      this.slotDisplays.set(i, slotDisplay);
    }
  }

  /**
   * 詳細パネルを作成
   * 要件6.3対応: アイテムの詳細情報表示
   */
  private createDetailPanel(): void {
    const panelX = this.config.gridColumns * (this.config.slotSize + this.config.slotSpacing) + 20;
    const panelY = 50;
    const panelWidth = 300;
    const panelHeight = 400;

    this.detailPanel = this.scene.add.container(panelX, panelY);

    // パネル背景
    const background = this.scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.detailPanel.add(background);

    // タイトル
    const title = this.scene.add
      .text(10, 10, 'アイテム詳細', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(title);

    this.mainContainer!.add(this.detailPanel);
  }

  /**
   * ソートボタンを作成
   * 要件6.2対応: アイテムソート機能
   */
  private createSortButtons(): void {
    const buttonY = -30;
    const buttonSpacing = 100;
    const sortTypes = [
      { type: ItemSortType.TYPE, label: '種類' },
      { type: ItemSortType.RARITY, label: 'レア度' },
      { type: ItemSortType.NAME, label: '名前' },
      { type: ItemSortType.QUANTITY, label: '数量' },
    ];

    sortTypes.forEach((sortType, index) => {
      const buttonX = index * buttonSpacing;

      const button = this.scene.add
        .text(buttonX, buttonY, sortType.label, {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#444444',
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => this.sortItems(sortType.type));
      button.on('pointerover', () => button.setBackgroundColor('#666666'));
      button.on('pointerout', () => button.setBackgroundColor('#444444'));

      this.mainContainer!.add(button);
    });
  }

  /**
   * 閉じるボタンを作成
   */
  private createCloseButton(): void {
    const width = this.config.gridColumns * (this.config.slotSize + this.config.slotSpacing);

    const closeButton = this.scene.add
      .text(width - 80, -30, '閉じる', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#cc0000',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    closeButton.on('pointerdown', () => this.hide());
    closeButton.on('pointerover', () => closeButton.setBackgroundColor('#ff0000'));
    closeButton.on('pointerout', () => closeButton.setBackgroundColor('#cc0000'));

    this.mainContainer!.add(closeButton);
  }

  /**
   * 入力ハンドラーを設定
   * 要件6.5対応: キーボード・マウス操作
   */
  private setupInputHandlers(): void {
    // キーボード入力
    this.scene.input.keyboard?.on('keydown-I', () => {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    });

    this.scene.input.keyboard?.on('keydown-ESC', () => {
      if (this.isVisible) {
        this.hide();
      }
    });

    // 矢印キーでのナビゲーション
    this.scene.input.keyboard?.on('keydown-UP', () => this.navigateSlots('up'));
    this.scene.input.keyboard?.on('keydown-DOWN', () => this.navigateSlots('down'));
    this.scene.input.keyboard?.on('keydown-LEFT', () => this.navigateSlots('left'));
    this.scene.input.keyboard?.on('keydown-RIGHT', () => this.navigateSlots('right'));

    // Enterキーでアイテム選択
    this.scene.input.keyboard?.on('keydown-ENTER', () => {
      if (this.selectedSlotIndex !== null) {
        this.onSlotClick(this.selectedSlotIndex);
      }
    });
  }

  /**
   * 画面を表示
   * 要件6.1対応: インベントリ画面を表示
   */
  show(): void {
    if (this.isVisible) {
      return;
    }

    this.isVisible = true;
    this.mainContainer?.setVisible(true);
    this.updateItemDisplay();

    this.emit('show');
    console.log('[InventoryUI] Shown');
  }

  /**
   * 画面を非表示
   * 要件6.1対応: インベントリ画面を非表示
   */
  hide(): void {
    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    this.mainContainer?.setVisible(false);
    this.hideActionMenu();

    this.emit('hide');
    console.log('[InventoryUI] Hidden');
  }

  /**
   * アイテム表示を更新
   * 要件6.2, 6.3対応: グリッド表示、詳細情報表示
   */
  updateItemDisplay(): void {
    const allItems = this.inventoryManager.getAllItems();

    // 全スロットをクリア
    this.slotDisplays.forEach(slotDisplay => {
      this.clearSlot(slotDisplay);
    });

    // アイテムを表示
    allItems.forEach((inventorySlot: InventorySlot) => {
      const slotDisplay = this.slotDisplays.get(inventorySlot.slotIndex);
      if (slotDisplay && !inventorySlot.isEmpty && inventorySlot.item) {
        this.updateSlot(slotDisplay, inventorySlot.item, inventorySlot.quantity);
      }
    });

    console.log('[InventoryUI] Item display updated');
  }

  /**
   * スロットをクリア
   */
  private clearSlot(slotDisplay: ItemSlotDisplay): void {
    // アイコンを削除
    if (slotDisplay.icon) {
      slotDisplay.icon.destroy();
      slotDisplay.icon = undefined;
    }

    // 数量テキストを削除
    if (slotDisplay.quantityText) {
      slotDisplay.quantityText.destroy();
      slotDisplay.quantityText = undefined;
    }

    slotDisplay.item = null;
    slotDisplay.quantity = 0;
  }

  /**
   * スロットを更新
   */
  private updateSlot(slotDisplay: ItemSlotDisplay, item: Item, quantity: number): void {
    slotDisplay.item = item;
    slotDisplay.quantity = quantity;

    // アイコンを表示（実際のゲームではテクスチャを使用）
    const iconSize = this.config.slotSize - 8;
    const icon = this.scene.add
      .rectangle(4, 4, iconSize, iconSize, 0x888888, 1)
      .setOrigin(0, 0);

    slotDisplay.container.add(icon);
    slotDisplay.icon = icon as any;

    // 数量テキストを表示
    if (quantity > 1) {
      const quantityText = this.scene.add
        .text(this.config.slotSize - 5, this.config.slotSize - 5, quantity.toString(), {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 2, y: 2 },
        })
        .setOrigin(1, 1);

      slotDisplay.container.add(quantityText);
      slotDisplay.quantityText = quantityText;
    }
  }

  /**
   * アイテムを選択
   * 要件6.3対応: アイテム選択と詳細情報表示
   */
  selectItem(itemId: string): void {
    // アイテムを持つスロットを検索
    const allItems = this.inventoryManager.getAllItems();
    for (let i = 0; i < allItems.length; i++) {
      const slot = allItems[i];
      if (!slot.isEmpty && slot.item?.id === itemId) {
        this.onSlotClick(i);
        return;
      }
    }
  }

  /**
   * スロットクリック処理
   */
  private onSlotClick(slotIndex: number): void {
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (!slotDisplay) {
      return;
    }

    // 選択状態を更新
    if (this.selectedSlotIndex !== null) {
      const prevSlot = this.slotDisplays.get(this.selectedSlotIndex);
      if (prevSlot) {
        prevSlot.isSelected = false;
        prevSlot.background.setStrokeStyle(2, 0x666666);
      }
    }

    this.selectedSlotIndex = slotIndex;
    slotDisplay.isSelected = true;
    slotDisplay.background.setStrokeStyle(2, 0xffff00);

    // 詳細情報を表示
    this.showItemDetails(slotDisplay);

    // アクションメニューを表示
    if (slotDisplay.item) {
      this.showActionMenu(slotDisplay.item.id);
    }

    console.log(`[InventoryUI] Selected slot ${slotIndex}`);
  }

  /**
   * スロットホバー処理
   */
  private onSlotHover(slotIndex: number): void {
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (!slotDisplay || slotDisplay.isSelected) {
      return;
    }

    slotDisplay.background.setStrokeStyle(2, 0xaaaaaa);
  }

  /**
   * スロットアウト処理
   */
  private onSlotOut(slotIndex: number): void {
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (!slotDisplay || slotDisplay.isSelected) {
      return;
    }

    slotDisplay.background.setStrokeStyle(2, 0x666666);
  }

  /**
   * アイテム詳細を表示
   * 要件6.3対応: 詳細情報パネル、アイテム説明表示、効果情報表示
   */
  private showItemDetails(slotDisplay: ItemSlotDisplay): void {
    if (!this.detailPanel) {
      return;
    }

    // 既存の詳細情報をクリア
    this.detailPanel.removeAll(true);

    // パネル背景を再作成
    const panelWidth = 300;
    const panelHeight = 400;
    const background = this.scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.detailPanel.add(background);

    if (!slotDisplay.item) {
      // 空のスロット
      const emptyText = this.scene.add
        .text(10, 10, '空のスロット', {
          fontSize: '16px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.detailPanel.add(emptyText);
      return;
    }

    const item = slotDisplay.item;
    let yOffset = 10;

    // アイテム名
    const nameText = this.scene.add
      .text(10, yOffset, item.name, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(nameText);
    yOffset += 30;

    // アイテムタイプ
    const typeText = this.scene.add
      .text(10, yOffset, `種類: ${item.type}`, {
        fontSize: '14px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(typeText);
    yOffset += 25;

    // レアリティ
    const rarityText = this.scene.add
      .text(10, yOffset, `レア度: ${item.rarity}`, {
        fontSize: '14px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(rarityText);
    yOffset += 25;

    // 数量
    const quantityText = this.scene.add
      .text(10, yOffset, `数量: ${slotDisplay.quantity}`, {
        fontSize: '14px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(quantityText);
    yOffset += 35;

    // 説明
    const descText = this.scene.add
      .text(10, yOffset, item.description, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: panelWidth - 20 },
      })
      .setOrigin(0, 0);

    this.detailPanel.add(descText);
    yOffset += descText.height + 20;

    // 価格情報
    const priceText = this.scene.add
      .text(10, yOffset, `売却価格: ${item.sellPrice}G\n購入価格: ${item.buyPrice}G`, {
        fontSize: '12px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.detailPanel.add(priceText);
  }

  /**
   * アクションメニューを表示
   * 要件6.4対応: 使用・装備・破棄のアクションメニュー
   */
  showActionMenu(itemId: string): void {
    // 既存のメニューを削除
    this.hideActionMenu();

    const item = this.inventoryManager.getItem(itemId);
    if (!item) {
      return;
    }

    // メニューコンテナを作成
    const menuX = this.config.gridColumns * (this.config.slotSize + this.config.slotSpacing) + 20;
    const menuY = 500;

    this.actionMenu = this.scene.add.container(menuX, menuY);

    // メニュー背景
    const menuWidth = 300;
    const menuHeight = 200;
    const background = this.scene.add
      .rectangle(0, 0, menuWidth, menuHeight, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.actionMenu.add(background);

    // メニュー項目を作成
    const menuItems: ActionMenuItem[] = [];

    // 使用（消耗品のみ）
    if (item.type === 'consumable') {
      menuItems.push({
        label: '使用',
        action: () => this.useItem(itemId),
        enabled: true,
      });
    }

    // 装備（装備品のみ）
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
      menuItems.push({
        label: '装備',
        action: () => this.equipItem(itemId),
        enabled: true,
      });
    }

    // 破棄
    menuItems.push({
      label: '破棄',
      action: () => this.discardItem(itemId),
      enabled: true,
    });

    // キャンセル
    menuItems.push({
      label: 'キャンセル',
      action: () => this.hideActionMenu(),
      enabled: true,
    });

    // メニュー項目を表示
    let yOffset = 10;
    menuItems.forEach((menuItem, index) => {
      const button = this.scene.add
        .text(10, yOffset, menuItem.label, {
          fontSize: '16px',
          color: menuItem.enabled ? '#ffffff' : '#666666',
          backgroundColor: '#444444',
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0, 0);

      if (menuItem.enabled) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', menuItem.action);
        button.on('pointerover', () => button.setBackgroundColor('#666666'));
        button.on('pointerout', () => button.setBackgroundColor('#444444'));
      }

      this.actionMenu!.add(button);
      yOffset += 40;
    });

    this.mainContainer!.add(this.actionMenu);

    console.log('[InventoryUI] Action menu shown');
  }

  /**
   * アクションメニューを非表示
   */
  hideActionMenu(): void {
    if (this.actionMenu) {
      this.actionMenu.destroy();
      this.actionMenu = undefined;
    }
  }

  /**
   * アイテムを使用
   */
  private useItem(itemId: string): void {
    const result = this.inventoryManager.useItem(itemId);

    if (result.success) {
      this.updateItemDisplay();
      this.hideActionMenu();
      this.emit('itemUsed', { itemId, result });
      console.log(`[InventoryUI] Item used: ${itemId}`);
    } else {
      console.warn(`[InventoryUI] Failed to use item: ${result.message}`);
    }
  }

  /**
   * アイテムを装備
   */
  private equipItem(itemId: string): void {
    // EquipmentManagerとの連携（タスク9で実装予定）
    this.emit('equipRequested', { itemId });
    this.hideActionMenu();
    console.log(`[InventoryUI] Equipment requested: ${itemId}`);
  }

  /**
   * アイテムを破棄
   */
  private discardItem(itemId: string): void {
    // 確認ダイアログを表示（簡易実装）
    const confirmed = confirm('このアイテムを破棄しますか？');

    if (confirmed) {
      const result = this.inventoryManager.removeItem(itemId, 1);

      if (result.success) {
        this.updateItemDisplay();
        this.hideActionMenu();
        this.emit('itemDiscarded', { itemId });
        console.log(`[InventoryUI] Item discarded: ${itemId}`);
      } else {
        console.warn(`[InventoryUI] Failed to discard item: ${result.message}`);
      }
    }
  }

  /**
   * アイテムをソート
   * 要件6.2対応: アイテムソート機能
   */
  sortItems(sortType: ItemSortType): void {
    this.currentSortType = sortType;
    this.inventoryManager.sortItems(sortType);
    this.updateItemDisplay();

    console.log(`[InventoryUI] Items sorted by ${sortType}`);
  }

  /**
   * ドラッグ開始処理
   * 要件6.6対応: ドラッグ&ドロップによる並び替え
   */
  private onDragStart(slotIndex: number): void {
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (!slotDisplay || !slotDisplay.item) {
      return;
    }

    this.draggedSlotIndex = slotIndex;
    slotDisplay.isDragging = true;
    slotDisplay.background.setAlpha(0.5);

    console.log(`[InventoryUI] Drag started: slot ${slotIndex}`);
  }

  /**
   * ドラッグ中処理
   */
  private onDrag(slotIndex: number, pointer: Phaser.Input.Pointer): void {
    // ドラッグ中の視覚的フィードバック
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (slotDisplay) {
      // 実際のゲームではアイテムアイコンをポインターに追従させる
    }
  }

  /**
   * ドラッグ終了処理
   */
  private onDragEnd(slotIndex: number): void {
    const slotDisplay = this.slotDisplays.get(slotIndex);
    if (!slotDisplay) {
      return;
    }

    slotDisplay.isDragging = false;
    slotDisplay.background.setAlpha(1);

    if (this.draggedSlotIndex !== null && this.draggedSlotIndex !== slotIndex) {
      // スロット入れ替え処理
      this.handleDragDrop(this.draggedSlotIndex, slotIndex);
    }

    this.draggedSlotIndex = null;

    console.log(`[InventoryUI] Drag ended: slot ${slotIndex}`);
  }

  /**
   * ドラッグ&ドロップ処理
   * 要件6.6対応: アイテムの位置入れ替え
   */
  handleDragDrop(fromSlot: number, toSlot: number): void {
    if (fromSlot === toSlot) {
      return;
    }

    const allItems = this.inventoryManager.getAllItems();
    const fromItem = allItems[fromSlot];
    const toItem = allItems[toSlot];

    if (!fromItem || !toItem) {
      return;
    }

    // スロットの内容を入れ替え
    if (!fromItem.isEmpty && !toItem.isEmpty) {
      // 両方にアイテムがある場合は入れ替え
      const tempItem = fromItem.item;
      const tempQuantity = fromItem.quantity;
      const tempIsEmpty = fromItem.isEmpty;

      fromItem.item = toItem.item;
      fromItem.quantity = toItem.quantity;
      fromItem.isEmpty = toItem.isEmpty;

      toItem.item = tempItem;
      toItem.quantity = tempQuantity;
      toItem.isEmpty = tempIsEmpty;
    } else if (!fromItem.isEmpty && toItem.isEmpty) {
      // fromにアイテムがあり、toが空の場合は移動
      toItem.item = fromItem.item;
      toItem.quantity = fromItem.quantity;
      toItem.isEmpty = false;

      fromItem.item = null;
      fromItem.quantity = 0;
      fromItem.isEmpty = true;
    } else if (fromItem.isEmpty && !toItem.isEmpty) {
      // fromが空で、toにアイテムがある場合は移動
      fromItem.item = toItem.item;
      fromItem.quantity = toItem.quantity;
      fromItem.isEmpty = false;

      toItem.item = null;
      toItem.quantity = 0;
      toItem.isEmpty = true;
    }
    // 両方空の場合は何もしない

    this.updateItemDisplay();

    this.emit('itemMoved', { fromSlot, toSlot });
    console.log(`[InventoryUI] Item moved from slot ${fromSlot} to ${toSlot}`);
  }

  /**
   * キーボードナビゲーション
   * 要件6.5対応: キーボード操作
   */
  private navigateSlots(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.selectedSlotIndex === null) {
      this.selectedSlotIndex = 0;
      this.onSlotClick(0);
      return;
    }

    const currentRow = Math.floor(this.selectedSlotIndex / this.config.gridColumns);
    const currentCol = this.selectedSlotIndex % this.config.gridColumns;

    let newRow = currentRow;
    let newCol = currentCol;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'down':
        newRow = Math.min(this.config.gridRows - 1, currentRow + 1);
        break;
      case 'left':
        newCol = Math.max(0, currentCol - 1);
        break;
      case 'right':
        newCol = Math.min(this.config.gridColumns - 1, currentCol + 1);
        break;
    }

    const newIndex = newRow * this.config.gridColumns + newCol;
    this.onSlotClick(newIndex);
  }

  /**
   * キーボード入力処理
   * 要件6.5対応: キーボード操作
   */
  handleKeyboardInput(key: string): void {
    switch (key.toLowerCase()) {
      case 'i':
        this.isVisible ? this.hide() : this.show();
        break;
      case 'escape':
        this.hide();
        break;
      case 'arrowup':
        this.navigateSlots('up');
        break;
      case 'arrowdown':
        this.navigateSlots('down');
        break;
      case 'arrowleft':
        this.navigateSlots('left');
        break;
      case 'arrowright':
        this.navigateSlots('right');
        break;
      case 'enter':
        if (this.selectedSlotIndex !== null) {
          this.onSlotClick(this.selectedSlotIndex);
        }
        break;
    }
  }

  /**
   * UIを破棄
   */
  destroy(): void {
    this.mainContainer?.destroy();
    this.slotDisplays.clear();
    this.removeAllListeners();

    console.log('[InventoryUI] Destroyed');
  }

  /**
   * 表示状態を取得
   */
  isShown(): boolean {
    return this.isVisible;
  }

  /**
   * 選択中のアイテムIDを取得
   */
  getSelectedItemId(): string | null {
    if (this.selectedSlotIndex === null) {
      return null;
    }

    const slotDisplay = this.slotDisplays.get(this.selectedSlotIndex);
    return slotDisplay?.item?.id || null;
  }
}
