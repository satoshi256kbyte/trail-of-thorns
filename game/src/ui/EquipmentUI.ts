/**
 * EquipmentUI - 装備画面の表示と操作を担当するUIコンポーネント
 * 
 * 要件7.1, 7.2, 7.3, 7.4, 7.5, 7.6に対応:
 * - キャラクターの装備画面表示
 * - 各装備スロットに装着中の装備品を表示
 * - 装備可能なアイテム一覧表示
 * - 装備変更前後の能力値比較
 * - 装備条件を満たさないアイテムのグレーアウト表示
 * - 装備変更のプレビュー機能
 */

import * as Phaser from 'phaser';
import { EquipmentManager } from '../systems/EquipmentManager';
import { InventoryManager } from '../systems/InventoryManager';
import {
  Equipment,
  EquipmentSet,
  EquipmentSlotType,
  EquipmentStats,
  EquipmentCheckResult,
  Item,
} from '../types/inventory';
import { Character } from '../systems/ItemEffectSystem';

/**
 * 装備UI設定
 */
export interface EquipmentUIConfig {
  /** UI表示位置 */
  position: { x: number; y: number };
  /** UIの深度 */
  depth: number;
  /** 背景色 */
  backgroundColor: number;
  /** 背景の透明度 */
  backgroundAlpha: number;
  /** スロット表示サイズ */
  slotSize: number;
  /** アイテムリストの幅 */
  itemListWidth: number;
  /** アイテムリストの高さ */
  itemListHeight: number;
}

/**
 * 装備スロット表示データ
 */
export interface EquipmentSlotDisplay {
  slotType: EquipmentSlotType;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  nameText?: Phaser.GameObjects.Text;
  equipment: Equipment | null;
  isSelected: boolean;
}

/**
 * アイテムリスト項目表示データ
 */
export interface ItemListItemDisplay {
  item: Equipment;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  statsText?: Phaser.GameObjects.Text;
  canEquip: boolean;
  isSelected: boolean;
}

/**
 * EquipmentUIクラス
 * 装備画面の表示と操作を管理
 */
export class EquipmentUI extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private equipmentManager: EquipmentManager;
  private inventoryManager: InventoryManager;
  private config: EquipmentUIConfig;

  // UI containers
  private mainContainer?: Phaser.GameObjects.Container;
  private equipmentSlotsContainer?: Phaser.GameObjects.Container;
  private itemListContainer?: Phaser.GameObjects.Container;
  private statComparisonPanel?: Phaser.GameObjects.Container;
  private previewPanel?: Phaser.GameObjects.Container;

  // Current state
  private currentCharacterId: string | null = null;
  private currentCharacter: Character | null = null;
  private selectedSlotType: EquipmentSlotType | null = null;
  private selectedItem: Equipment | null = null;
  private isVisible: boolean = false;

  // Display data
  private slotDisplays: Map<EquipmentSlotType, EquipmentSlotDisplay> = new Map();
  private itemListDisplays: ItemListItemDisplay[] = [];

  // Default configuration
  private static readonly DEFAULT_CONFIG: EquipmentUIConfig = {
    position: { x: 100, y: 100 },
    depth: 1000,
    backgroundColor: 0x000000,
    backgroundAlpha: 0.8,
    slotSize: 80,
    itemListWidth: 400,
    itemListHeight: 500,
  };

  /**
   * コンストラクタ
   * 
   * @param scene - Phaserシーン
   * @param equipmentManager - 装備マネージャー
   * @param inventoryManager - インベントリマネージャー
   * @param config - UI設定（オプション）
   */
  constructor(
    scene: Phaser.Scene,
    equipmentManager: EquipmentManager,
    inventoryManager: InventoryManager,
    config?: Partial<EquipmentUIConfig>
  ) {
    super();

    this.scene = scene;
    this.equipmentManager = equipmentManager;
    this.inventoryManager = inventoryManager;
    this.config = { ...EquipmentUI.DEFAULT_CONFIG, ...config };

    this.initializeUI();
    this.setupInputHandlers();

    console.log('[EquipmentUI] Initialized');
  }

  /**
   * UIを初期化
   * 要件7.1対応: キャラクターの装備画面を表示
   */
  private initializeUI(): void {
    // メインコンテナを作成
    this.mainContainer = this.scene.add
      .container(this.config.position.x, this.config.position.y)
      .setDepth(this.config.depth)
      .setVisible(false);

    // 背景を作成
    const width = 1000;
    const height = 700;

    const background = this.scene.add
      .rectangle(0, 0, width, height, this.config.backgroundColor, this.config.backgroundAlpha)
      .setOrigin(0, 0);

    this.mainContainer.add(background);

    // タイトルを作成
    const title = this.scene.add
      .text(20, 20, '装備画面', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.mainContainer.add(title);

    // 装備スロットコンテナを作成
    this.createEquipmentSlots();

    // アイテムリストコンテナを作成
    this.createItemListContainer();

    // 能力値比較パネルを作成
    this.createStatComparisonPanel();

    // プレビューパネルを作成
    this.createPreviewPanel();

    // 閉じるボタンを作成
    this.createCloseButton();
  }

  /**
   * 装備スロットを作成
   * 要件7.2対応: 各装備スロットに装着中の装備品を表示
   */
  private createEquipmentSlots(): void {
    this.equipmentSlotsContainer = this.scene.add.container(20, 70);

    const slotTypes = [
      { type: EquipmentSlotType.WEAPON, label: '武器', y: 0 },
      { type: EquipmentSlotType.ARMOR, label: '防具', y: 100 },
      { type: EquipmentSlotType.ACCESSORY1, label: 'アクセサリ1', y: 200 },
      { type: EquipmentSlotType.ACCESSORY2, label: 'アクセサリ2', y: 300 },
    ];

    slotTypes.forEach(slotInfo => {
      const slotContainer = this.scene.add.container(0, slotInfo.y);

      // スロット背景
      const background = this.scene.add
        .rectangle(0, 0, 300, this.config.slotSize, 0x333333, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x666666);

      slotContainer.add(background);

      // スロットラベル
      const label = this.scene.add
        .text(10, 10, slotInfo.label, {
          fontSize: '16px',
          color: '#cccccc',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      slotContainer.add(label);

      // 装備名テキスト（後で更新）
      const nameText = this.scene.add
        .text(10, 35, '未装備', {
          fontSize: '14px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      slotContainer.add(nameText);

      // インタラクティブに設定
      background.setInteractive({ useHandCursor: true });
      background.on('pointerdown', () => this.onSlotClick(slotInfo.type));
      background.on('pointerover', () => this.onSlotHover(slotInfo.type));
      background.on('pointerout', () => this.onSlotOut(slotInfo.type));

      this.equipmentSlotsContainer!.add(slotContainer);

      // スロット表示データを保存
      const slotDisplay: EquipmentSlotDisplay = {
        slotType: slotInfo.type,
        container: slotContainer,
        background,
        nameText,
        equipment: null,
        isSelected: false,
      };

      this.slotDisplays.set(slotInfo.type, slotDisplay);
    });

    this.mainContainer!.add(this.equipmentSlotsContainer);
  }

  /**
   * アイテムリストコンテナを作成
   * 要件7.3対応: 装備可能なアイテム一覧を表示
   */
  private createItemListContainer(): void {
    const listX = 350;
    const listY = 70;

    this.itemListContainer = this.scene.add.container(listX, listY);

    // リスト背景
    const background = this.scene.add
      .rectangle(
        0,
        0,
        this.config.itemListWidth,
        this.config.itemListHeight,
        0x222222,
        1
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.itemListContainer.add(background);

    // リストタイトル
    const title = this.scene.add
      .text(10, 10, '装備可能アイテム', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.itemListContainer.add(title);

    this.mainContainer!.add(this.itemListContainer);
  }

  /**
   * 能力値比較パネルを作成
   * 要件7.4対応: 装備変更前後の能力値比較を表示
   */
  private createStatComparisonPanel(): void {
    const panelX = 770;
    const panelY = 70;

    this.statComparisonPanel = this.scene.add.container(panelX, panelY);

    // パネル背景
    const background = this.scene.add
      .rectangle(0, 0, 210, 300, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.statComparisonPanel.add(background);

    // パネルタイトル
    const title = this.scene.add
      .text(10, 10, '能力値比較', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.statComparisonPanel.add(title);

    this.mainContainer!.add(this.statComparisonPanel);
  }

  /**
   * プレビューパネルを作成
   * 要件7.6対応: 装備変更のプレビュー機能
   */
  private createPreviewPanel(): void {
    const panelX = 770;
    const panelY = 390;

    this.previewPanel = this.scene.add.container(panelX, panelY);

    // パネル背景
    const background = this.scene.add
      .rectangle(0, 0, 210, 180, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.previewPanel.add(background);

    // パネルタイトル
    const title = this.scene.add
      .text(10, 10, 'プレビュー', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(title);

    this.mainContainer!.add(this.previewPanel);
  }

  /**
   * 閉じるボタンを作成
   */
  private createCloseButton(): void {
    const closeButton = this.scene.add
      .text(900, 20, '閉じる', {
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
   */
  private setupInputHandlers(): void {
    // ESCキーで閉じる
    this.scene.input.keyboard?.on('keydown-ESC', () => {
      if (this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 画面を表示
   * 要件7.1対応: キャラクターの装備画面を表示
   * 
   * @param characterId キャラクターID
   * @param character キャラクター情報
   */
  show(characterId: string, character: Character): void {
    if (this.isVisible) {
      return;
    }

    this.currentCharacterId = characterId;
    this.currentCharacter = character;
    this.isVisible = true;
    this.mainContainer?.setVisible(true);

    // 装備表示を更新
    this.updateEquipmentDisplay(characterId);

    this.emit('show', { characterId });
    console.log(`[EquipmentUI] Shown for character ${characterId}`);
  }

  /**
   * 画面を非表示
   */
  hide(): void {
    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    this.mainContainer?.setVisible(false);

    // 状態をリセット
    this.currentCharacterId = null;
    this.currentCharacter = null;
    this.selectedSlotType = null;
    this.selectedItem = null;

    this.emit('hide');
    console.log('[EquipmentUI] Hidden');
  }

  /**
   * 装備表示を更新
   * 要件7.2対応: 各装備スロットに装着中の装備品を表示
   * 
   * @param characterId キャラクターID
   */
  updateEquipmentDisplay(characterId: string): void {
    if (!this.currentCharacter) {
      console.warn('[EquipmentUI] No current character set');
      return;
    }

    const equipmentSet = this.equipmentManager.getAllEquipment(characterId);

    // 各スロットの表示を更新
    this.slotDisplays.forEach((slotDisplay, slotType) => {
      const equipment = this.getEquipmentFromSet(equipmentSet, slotType);
      this.updateSlotDisplay(slotDisplay, equipment);
    });

    console.log(`[EquipmentUI] Equipment display updated for character ${characterId}`);
  }

  /**
   * スロット表示を更新
   */
  private updateSlotDisplay(slotDisplay: EquipmentSlotDisplay, equipment: Equipment | null): void {
    slotDisplay.equipment = equipment;

    // 装備名テキストを更新
    if (slotDisplay.nameText) {
      if (equipment) {
        slotDisplay.nameText.setText(equipment.name);
        slotDisplay.nameText.setColor('#ffffff');
      } else {
        slotDisplay.nameText.setText('未装備');
        slotDisplay.nameText.setColor('#888888');
      }
    }

    // アイコンを更新（実際のゲームではテクスチャを使用）
    if (slotDisplay.icon) {
      slotDisplay.icon.destroy();
      slotDisplay.icon = undefined;
    }

    if (equipment) {
      const iconSize = 50;
      const icon = this.scene.add
        .rectangle(200, 15, iconSize, iconSize, 0x888888, 1)
        .setOrigin(0, 0);

      slotDisplay.container.add(icon);
      slotDisplay.icon = icon as any;
    }
  }

  /**
   * スロットクリック処理
   */
  private onSlotClick(slotType: EquipmentSlotType): void {
    if (!this.currentCharacterId || !this.currentCharacter) {
      return;
    }

    // 選択状態を更新
    this.slotDisplays.forEach((display, type) => {
      display.isSelected = type === slotType;
      display.background.setStrokeStyle(2, display.isSelected ? 0xffff00 : 0x666666);
    });

    this.selectedSlotType = slotType;

    // 装備可能アイテム一覧を表示
    this.showEquippableItems(slotType);

    console.log(`[EquipmentUI] Selected slot ${slotType}`);
  }

  /**
   * スロットホバー処理
   */
  private onSlotHover(slotType: EquipmentSlotType): void {
    const slotDisplay = this.slotDisplays.get(slotType);
    if (!slotDisplay || slotDisplay.isSelected) {
      return;
    }

    slotDisplay.background.setStrokeStyle(2, 0xaaaaaa);
  }

  /**
   * スロットアウト処理
   */
  private onSlotOut(slotType: EquipmentSlotType): void {
    const slotDisplay = this.slotDisplays.get(slotType);
    if (!slotDisplay || slotDisplay.isSelected) {
      return;
    }

    slotDisplay.background.setStrokeStyle(2, 0x666666);
  }

  /**
   * 装備セットから装備を取得
   */
  private getEquipmentFromSet(equipmentSet: EquipmentSet, slotType: EquipmentSlotType): Equipment | null {
    switch (slotType) {
      case EquipmentSlotType.WEAPON:
        return equipmentSet.weapon;
      case EquipmentSlotType.ARMOR:
        return equipmentSet.armor;
      case EquipmentSlotType.ACCESSORY1:
        return equipmentSet.accessory1;
      case EquipmentSlotType.ACCESSORY2:
        return equipmentSet.accessory2;
      default:
        return null;
    }
  }

  /**
   * UIを破棄
   */
  destroy(): void {
    this.mainContainer?.destroy();
    this.slotDisplays.clear();
    this.itemListDisplays = [];
    this.removeAllListeners();

    console.log('[EquipmentUI] Destroyed');
  }

  /**
   * 表示状態を取得
   */
  isShown(): boolean {
    return this.isVisible;
  }

  /**
   * 現在のキャラクターIDを取得
   */
  getCurrentCharacterId(): string | null {
    return this.currentCharacterId;
  }

  /**
   * 選択中のスロットタイプを取得
   */
  getSelectedSlotType(): EquipmentSlotType | null {
    return this.selectedSlotType;
  }

  // 以下のメソッドは次のサブタスクで実装
  selectSlot(slot: EquipmentSlotType): void {
    this.onSlotClick(slot);
  }

  /**
   * 装備可能アイテム一覧を表示
   * 要件7.3, 7.5対応: スロット選択時の一覧表示、装備条件による絞り込み、グレーアウト表示
   * 
   * @param slot 装備スロット
   */
  showEquippableItems(slot: EquipmentSlotType): void {
    if (!this.currentCharacterId || !this.currentCharacter || !this.itemListContainer) {
      return;
    }

    // 既存のアイテムリストをクリア
    this.clearItemList();

    // インベントリから装備可能なアイテムを取得
    const allItems = this.inventoryManager.getAllItems();
    const equippableItems: Equipment[] = [];

    for (const inventorySlot of allItems) {
      if (inventorySlot.isEmpty || !inventorySlot.item) {
        continue;
      }

      const item = inventorySlot.item;

      // 装備品かチェック
      if (
        item.type !== 'weapon' &&
        item.type !== 'armor' &&
        item.type !== 'accessory'
      ) {
        continue;
      }

      const equipment = item as Equipment;

      // スロットタイプが一致するかチェック
      if (equipment.slot === slot) {
        equippableItems.push(equipment);
      }
    }

    // アイテムリストを表示
    let yOffset = 40;
    const itemHeight = 60;

    equippableItems.forEach((equipment, index) => {
      // 装備条件をチェック（要件7.5）
      const checkResult = this.equipmentManager.checkEquipmentRequirements(
        this.currentCharacterId!,
        equipment,
        this.currentCharacter!
      );

      const canEquip = checkResult.canEquip;

      // アイテムコンテナを作成
      const itemContainer = this.scene.add.container(5, yOffset);

      // アイテム背景
      const background = this.scene.add
        .rectangle(0, 0, this.config.itemListWidth - 10, itemHeight - 5, 0x333333, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x666666);

      itemContainer.add(background);

      // アイテム名（要件7.5: グレーアウト表示）
      const nameColor = canEquip ? '#ffffff' : '#666666';
      const nameText = this.scene.add
        .text(10, 5, equipment.name, {
          fontSize: '16px',
          color: nameColor,
          fontFamily: 'Arial',
          fontStyle: canEquip ? 'normal' : 'italic',
        })
        .setOrigin(0, 0);

      itemContainer.add(nameText);

      // 能力値情報を表示
      const statsInfo = this.formatEquipmentStats(equipment.stats);
      const statsText = this.scene.add
        .text(10, 25, statsInfo, {
          fontSize: '12px',
          color: canEquip ? '#cccccc' : '#555555',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      itemContainer.add(statsText);

      // 装備条件が満たされていない場合、理由を表示
      if (!canEquip && checkResult.failureReasons.length > 0) {
        const reasonText = this.scene.add
          .text(10, 42, `条件不足: ${checkResult.failureReasons[0]}`, {
            fontSize: '10px',
            color: '#ff6666',
            fontFamily: 'Arial',
          })
          .setOrigin(0, 0);

        itemContainer.add(reasonText);
      }

      // インタラクティブに設定（装備可能な場合のみ）
      if (canEquip) {
        background.setInteractive({ useHandCursor: true });
        background.on('pointerdown', () => this.onItemClick(equipment));
        background.on('pointerover', () => {
          background.setFillStyle(0x444444);
          this.showEquipmentPreview(equipment);
        });
        background.on('pointerout', () => {
          background.setFillStyle(0x333333);
        });
      }

      this.itemListContainer!.add(itemContainer);

      // アイテムリスト表示データを保存
      const itemDisplay: ItemListItemDisplay = {
        item: equipment,
        container: itemContainer,
        background,
        nameText,
        statsText,
        canEquip,
        isSelected: false,
      };

      this.itemListDisplays.push(itemDisplay);

      yOffset += itemHeight;
    });

    // アイテムが見つからない場合
    if (equippableItems.length === 0) {
      const emptyText = this.scene.add
        .text(10, 40, '装備可能なアイテムがありません', {
          fontSize: '14px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.itemListContainer!.add(emptyText);
    }

    console.log(`[EquipmentUI] Showing ${equippableItems.length} equippable items for ${slot}`);
  }

  /**
   * アイテムリストをクリア
   */
  private clearItemList(): void {
    if (!this.itemListContainer) {
      return;
    }

    // 既存のアイテム表示を削除（タイトルと背景は残す）
    this.itemListDisplays.forEach(display => {
      display.container.destroy();
    });

    this.itemListDisplays = [];
  }

  /**
   * 装備能力値をフォーマット
   */
  private formatEquipmentStats(stats: EquipmentStats): string {
    const parts: string[] = [];

    if (stats.hp) parts.push(`HP+${stats.hp}`);
    if (stats.mp) parts.push(`MP+${stats.mp}`);
    if (stats.attack) parts.push(`攻撃+${stats.attack}`);
    if (stats.defense) parts.push(`防御+${stats.defense}`);
    if (stats.speed) parts.push(`速度+${stats.speed}`);
    if (stats.accuracy) parts.push(`命中+${stats.accuracy}`);
    if (stats.evasion) parts.push(`回避+${stats.evasion}`);

    return parts.length > 0 ? parts.join(', ') : '能力値ボーナスなし';
  }

  /**
   * アイテムクリック処理
   */
  private onItemClick(equipment: Equipment): void {
    if (!this.currentCharacterId || !this.currentCharacter || !this.selectedSlotType) {
      return;
    }

    this.selectedItem = equipment;

    // 能力値比較を表示
    const currentEquipment = this.equipmentManager.getEquipment(
      this.currentCharacterId,
      this.selectedSlotType
    );

    this.showStatComparison(currentEquipment, equipment);

    // 装備変更を実行するか確認
    const confirmed = confirm(`${equipment.name}を装備しますか？`);

    if (confirmed) {
      const result = this.equipmentManager.equipItem(
        this.currentCharacterId,
        equipment,
        this.selectedSlotType,
        this.currentCharacter
      );

      if (result.success) {
        // 装備表示を更新
        this.updateEquipmentDisplay(this.currentCharacterId);

        // アイテムリストを更新
        this.showEquippableItems(this.selectedSlotType);

        this.emit('equipmentChanged', {
          characterId: this.currentCharacterId,
          slot: this.selectedSlotType,
          equipment,
        });

        console.log(`[EquipmentUI] Equipment changed: ${equipment.name}`);
      } else {
        alert(`装備に失敗しました: ${result.message}`);
      }
    }
  }

  /**
   * 能力値比較を表示
   * 要件7.4対応: 装備変更前後の能力値比較、能力値差分の表示、視覚的な強調表示
   * 
   * @param currentEquipment 現在の装備
   * @param newEquipment 新しい装備
   */
  showStatComparison(currentEquipment: Equipment | null, newEquipment: Equipment): void {
    if (!this.statComparisonPanel) {
      return;
    }

    // 既存の比較表示をクリア
    this.statComparisonPanel.removeAll(true);

    // パネル背景を再作成
    const background = this.scene.add
      .rectangle(0, 0, 210, 300, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.statComparisonPanel.add(background);

    // パネルタイトル
    const title = this.scene.add
      .text(10, 10, '能力値比較', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.statComparisonPanel.add(title);

    let yOffset = 40;

    // 現在の装備情報
    const currentText = this.scene.add
      .text(10, yOffset, '現在の装備:', {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.statComparisonPanel.add(currentText);
    yOffset += 20;

    if (currentEquipment) {
      const currentName = this.scene.add
        .text(10, yOffset, currentEquipment.name, {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.statComparisonPanel.add(currentName);
      yOffset += 20;
    } else {
      const noneText = this.scene.add
        .text(10, yOffset, 'なし', {
          fontSize: '11px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.statComparisonPanel.add(noneText);
      yOffset += 20;
    }

    // 新しい装備情報
    yOffset += 5;
    const newText = this.scene.add
      .text(10, yOffset, '新しい装備:', {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.statComparisonPanel.add(newText);
    yOffset += 20;

    const newName = this.scene.add
      .text(10, yOffset, newEquipment.name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.statComparisonPanel.add(newName);
    yOffset += 25;

    // 能力値差分を計算
    const currentStats = currentEquipment?.stats || {};
    const newStats = newEquipment.stats;

    const statDiffs = {
      hp: (newStats.hp || 0) - (currentStats.hp || 0),
      mp: (newStats.mp || 0) - (currentStats.mp || 0),
      attack: (newStats.attack || 0) - (currentStats.attack || 0),
      defense: (newStats.defense || 0) - (currentStats.defense || 0),
      speed: (newStats.speed || 0) - (currentStats.speed || 0),
      accuracy: (newStats.accuracy || 0) - (currentStats.accuracy || 0),
      evasion: (newStats.evasion || 0) - (currentStats.evasion || 0),
    };

    // 能力値差分を表示（要件7.4: 視覚的な強調表示）
    const statLabels = [
      { key: 'hp', label: 'HP' },
      { key: 'mp', label: 'MP' },
      { key: 'attack', label: '攻撃' },
      { key: 'defense', label: '防御' },
      { key: 'speed', label: '速度' },
      { key: 'accuracy', label: '命中' },
      { key: 'evasion', label: '回避' },
    ];

    statLabels.forEach(stat => {
      const diff = statDiffs[stat.key as keyof typeof statDiffs];

      if (diff !== 0) {
        // 差分の色を決定（プラスは緑、マイナスは赤）
        const color = diff > 0 ? '#00ff00' : '#ff0000';
        const sign = diff > 0 ? '+' : '';

        const statText = this.scene.add
          .text(10, yOffset, `${stat.label}: ${sign}${diff}`, {
            fontSize: '12px',
            color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
          })
          .setOrigin(0, 0);

        this.statComparisonPanel.add(statText);
        yOffset += 18;
      }
    });

    // 差分がない場合
    if (Object.values(statDiffs).every(diff => diff === 0)) {
      const noDiffText = this.scene.add
        .text(10, yOffset, '能力値変化なし', {
          fontSize: '11px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.statComparisonPanel.add(noDiffText);
    }

    console.log('[EquipmentUI] Stat comparison displayed');
  }

  /**
   * 装備プレビューを表示
   * 要件7.6対応: プレビュー表示、装備変更のシミュレーション、キャンセル機能
   * 
   * @param equipment 装備
   */
  showEquipmentPreview(equipment: Equipment): void {
    if (!this.previewPanel) {
      return;
    }

    // 既存のプレビューをクリア
    this.previewPanel.removeAll(true);

    // パネル背景を再作成
    const background = this.scene.add
      .rectangle(0, 0, 210, 180, 0x222222, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x666666);

    this.previewPanel.add(background);

    // パネルタイトル
    const title = this.scene.add
      .text(10, 10, 'プレビュー', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(title);

    let yOffset = 35;

    // 装備名
    const nameText = this.scene.add
      .text(10, yOffset, equipment.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(nameText);
    yOffset += 25;

    // レアリティ
    const rarityText = this.scene.add
      .text(10, yOffset, `レア度: ${equipment.rarity}`, {
        fontSize: '11px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(rarityText);
    yOffset += 18;

    // 耐久度
    const durabilityText = this.scene.add
      .text(10, yOffset, `耐久度: ${equipment.durability}/${equipment.maxDurability}`, {
        fontSize: '11px',
        color: '#cccccc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(durabilityText);
    yOffset += 20;

    // 能力値ボーナス
    const statsTitle = this.scene.add
      .text(10, yOffset, '能力値:', {
        fontSize: '11px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);

    this.previewPanel.add(statsTitle);
    yOffset += 16;

    // 能力値を表示
    const stats = equipment.stats;
    const statParts: string[] = [];

    if (stats.hp) statParts.push(`HP+${stats.hp}`);
    if (stats.mp) statParts.push(`MP+${stats.mp}`);
    if (stats.attack) statParts.push(`攻撃+${stats.attack}`);
    if (stats.defense) statParts.push(`防御+${stats.defense}`);
    if (stats.speed) statParts.push(`速度+${stats.speed}`);
    if (stats.accuracy) statParts.push(`命中+${stats.accuracy}`);
    if (stats.evasion) statParts.push(`回避+${stats.evasion}`);

    if (statParts.length > 0) {
      const statsText = this.scene.add
        .text(10, yOffset, statParts.join('\n'), {
          fontSize: '10px',
          color: '#00ff00',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.previewPanel.add(statsText);
    } else {
      const noStatsText = this.scene.add
        .text(10, yOffset, 'なし', {
          fontSize: '10px',
          color: '#888888',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);

      this.previewPanel.add(noStatsText);
    }

    console.log(`[EquipmentUI] Preview displayed for ${equipment.name}`);
  }
}
