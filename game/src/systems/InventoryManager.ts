/**
 * InventoryManager - インベントリの管理を担当するコアコンポーネント
 * 
 * 要件1.1, 1.2, 1.3, 1.4, 1.5, 1.6に対応:
 * - 最大100個のアイテムを保管
 * - アイテムの追加・削除機能
 * - インベントリ状態管理
 * - アイテムソート機能
 * - アイテム使用機能
 */

import {
  Item,
  InventoryData,
  InventorySlot,
  InventoryOperationResult,
  ItemSortType,
  ItemUseResult,
  InventoryUtils,
  InventoryTypeValidators,
  Consumable,
  ItemType,
  ItemEffect,
} from '../types/inventory';
import { ItemDataLoader } from './ItemDataLoader';
import { InventoryErrorHandler, ErrorSeverity } from './inventory/InventoryErrorHandler';

/**
 * インベントリマネージャーのエラー
 */
export class InventoryManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InventoryManagerError';
  }
}

/**
 * InventoryManagerクラス
 * インベントリの管理を行う
 */
export class InventoryManager {
  private inventoryData: InventoryData;
  private itemDataLoader: ItemDataLoader;
  private maxSlots: number = 100; // 要件1.1: 最大100個のアイテムを保管
  private itemEffectSystem: any | null = null; // ItemEffectSystemとの連携用（タスク5で実装）
  private errorHandler: InventoryErrorHandler;

  constructor(itemDataLoader: ItemDataLoader, maxSlots: number = 100, errorHandler?: InventoryErrorHandler) {
    this.itemDataLoader = itemDataLoader;
    this.maxSlots = maxSlots;
    this.inventoryData = this.createEmptyInventory();
    this.errorHandler = errorHandler || new InventoryErrorHandler();
  }

  /**
   * ItemEffectSystemを設定
   * タスク5で実装されるItemEffectSystemとの連携用
   * 
   * @param itemEffectSystem - ItemEffectSystemインスタンス
   */
  setItemEffectSystem(itemEffectSystem: any): void {
    this.itemEffectSystem = itemEffectSystem;
  }

  /**
   * 空のインベントリを作成
   * 
   * @returns 空のインベントリデータ
   */
  private createEmptyInventory(): InventoryData {
    const slots: InventorySlot[] = [];
    for (let i = 0; i < this.maxSlots; i++) {
      slots.push(InventoryUtils.createEmptySlot(i));
    }

    return {
      slots,
      maxSlots: this.maxSlots,
      usedSlots: 0,
      gold: 0,
    };
  }

  /**
   * アイテムを追加
   * 要件1.2対応: アイテムをインベントリに追加
   * 
   * @param item - 追加するアイテム
   * @param quantity - 追加する数量
   * @returns 操作結果
   */
  addItem(item: Item, quantity: number = 1): InventoryOperationResult {
    try {
      // 入力検証
      if (!InventoryTypeValidators.isValidItem(item)) {
        this.errorHandler.handleInvalidOperationError(
          'addItem',
          '無効なアイテムデータです'
        );
        return {
          success: false,
          message: 'Invalid item data',
          affectedSlots: [],
        };
      }

      if (quantity <= 0) {
        this.errorHandler.handleInvalidOperationError(
          'addItem',
          '数量は1以上である必要があります'
        );
        return {
          success: false,
          message: 'Quantity must be greater than 0',
          affectedSlots: [],
        };
      }

      // 要件1.3対応: 満杯チェック
      if (!InventoryUtils.hasSpaceForItem(this.inventoryData, item, quantity)) {
        this.errorHandler.handleInvalidOperationError(
          'addItem',
          'インベントリが満杯です'
        );
        return {
          success: false,
          message: 'Inventory is full',
          affectedSlots: [],
        };
      }

      const affectedSlots: number[] = [];
      let remainingQuantity = quantity;

      // 既存のスロットにスタック
      for (const slot of this.inventoryData.slots) {
        if (slot.item?.id === item.id && slot.quantity < item.maxStack) {
          const availableSpace = item.maxStack - slot.quantity;
          const addAmount = Math.min(availableSpace, remainingQuantity);

          slot.quantity += addAmount;
          remainingQuantity -= addAmount;
          affectedSlots.push(slot.slotIndex);

          if (remainingQuantity === 0) {
            break;
          }
        }
      }

      // 新しいスロットに追加
      if (remainingQuantity > 0) {
        for (const slot of this.inventoryData.slots) {
          if (slot.isEmpty) {
            const addAmount = Math.min(item.maxStack, remainingQuantity);

            slot.item = { ...item };
            slot.quantity = addAmount;
            slot.isEmpty = false;
            remainingQuantity -= addAmount;
            affectedSlots.push(slot.slotIndex);

            this.inventoryData.usedSlots++;

            if (remainingQuantity === 0) {
              break;
            }
          }
        }
      }

      console.log(`[InventoryManager] Added ${quantity} x ${item.name}`);

      return {
        success: true,
        message: `Added ${quantity} x ${item.name}`,
        affectedSlots,
        newQuantity: this.getItemCount(item.id),
      };
    } catch (error) {
      this.errorHandler.createAndLogError(
        'ADD_ITEM_FAILED',
        'Failed to add item',
        ErrorSeverity.ERROR,
        { item: item?.id || 'unknown', quantity, error: (error as Error).message }
      );
      console.error('[InventoryManager] Error adding item:', error);
      return {
        success: false,
        message: 'Failed to add item',
        affectedSlots: [],
      };
    }
  }

  /**
   * アイテムを削除
   * 要件1.4対応: アイテムをインベントリから削除
   * 
   * @param itemId - 削除するアイテムのID
   * @param quantity - 削除する数量
   * @returns 操作結果
   */
  removeItem(itemId: string, quantity: number = 1): InventoryOperationResult {
    try {
      if (quantity <= 0) {
        this.errorHandler.handleInvalidOperationError(
          'removeItem',
          '数量は1以上である必要があります'
        );
        return {
          success: false,
          message: 'Quantity must be greater than 0',
          affectedSlots: [],
        };
      }

      const totalQuantity = this.getItemCount(itemId);
      if (totalQuantity < quantity) {
        this.errorHandler.handleInvalidOperationError(
          'removeItem',
          '削除するアイテムが不足しています'
        );
        return {
          success: false,
          message: 'Not enough items to remove',
          affectedSlots: [],
          newQuantity: totalQuantity,
        };
      }

      const affectedSlots: number[] = [];
      let remainingQuantity = quantity;

      // 後ろのスロットから削除
      for (let i = this.inventoryData.slots.length - 1; i >= 0; i--) {
        const slot = this.inventoryData.slots[i];

        if (slot.item?.id === itemId) {
          const removeAmount = Math.min(slot.quantity, remainingQuantity);

          slot.quantity -= removeAmount;
          remainingQuantity -= removeAmount;
          affectedSlots.push(slot.slotIndex);

          if (slot.quantity === 0) {
            slot.item = null;
            slot.isEmpty = true;
            this.inventoryData.usedSlots--;
          }

          if (remainingQuantity === 0) {
            break;
          }
        }
      }

      const itemName = this.getItem(itemId)?.name || itemId;
      console.log(`[InventoryManager] Removed ${quantity} x ${itemName}`);

      return {
        success: true,
        message: `Removed ${quantity} x ${itemName}`,
        affectedSlots,
        newQuantity: this.getItemCount(itemId),
      };
    } catch (error) {
      this.errorHandler.createAndLogError(
        'REMOVE_ITEM_FAILED',
        'Failed to remove item',
        ErrorSeverity.ERROR,
        { itemId, quantity, error: (error as Error).message }
      );
      console.error('[InventoryManager] Error removing item:', error);
      return {
        success: false,
        message: 'Failed to remove item',
        affectedSlots: [],
      };
    }
  }

  /**
   * アイテムを取得
   * 要件1.6対応: アイテムの詳細情報を取得
   * 
   * @param itemId - アイテムID
   * @returns アイテム、存在しない場合はnull
   */
  getItem(itemId: string): Item | null {
    const slot = this.inventoryData.slots.find(s => s.item?.id === itemId);
    return slot?.item || null;
  }

  /**
   * 全アイテムを取得
   * 要件1.6対応: 全てのアイテムスロットを取得
   * 
   * @returns 全てのインベントリスロット
   */
  getAllItems(): InventorySlot[] {
    return [...this.inventoryData.slots];
  }

  /**
   * アイテム数を取得
   * 
   * @param itemId - アイテムID
   * @returns アイテムの総数
   */
  getItemCount(itemId: string): number {
    return this.inventoryData.slots
      .filter(slot => slot.item?.id === itemId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
  }

  /**
   * 空きスロット数を取得
   * 要件1.3対応: 空きスロット計算
   * 
   * @returns 空きスロット数
   */
  getAvailableSlots(): number {
    return this.maxSlots - this.inventoryData.usedSlots;
  }

  /**
   * インベントリが満杯かどうかをチェック
   * 要件1.3対応: 満杯チェック機能
   * 
   * @returns 満杯の場合true
   */
  isFull(): boolean {
    return this.inventoryData.usedSlots >= this.maxSlots;
  }

  /**
   * アイテムを使用
   * 要件1.4, 3.2対応: 消耗品の使用処理、アイテム数量の減少、ItemEffectSystemとの連携
   * 
   * @param itemId - 使用するアイテムのID
   * @param targetCharacterId - 対象キャラクターID（オプション）
   * @returns アイテム使用結果
   */
  useItem(itemId: string, targetCharacterId?: string): ItemUseResult {
    try {
      // アイテムの存在確認
      const item = this.getItem(itemId);
      if (!item) {
        this.errorHandler.handleInvalidOperationError(
          'useItem',
          'アイテムがインベントリに存在しません'
        );
        return {
          success: false,
          effectsApplied: [],
          itemConsumed: false,
          remainingQuantity: 0,
          message: 'Item not found in inventory',
        };
      }

      // 消耗品かどうかを確認
      if (item.type !== ItemType.CONSUMABLE) {
        this.errorHandler.handleInvalidOperationError(
          'useItem',
          'このアイテムは使用できません'
        );
        return {
          success: false,
          effectsApplied: [],
          itemConsumed: false,
          remainingQuantity: this.getItemCount(itemId),
          message: 'Item is not consumable',
        };
      }

      // アイテム定義を取得
      const itemDefinition = this.itemDataLoader.getItemDefinition(itemId);
      if (!itemDefinition || !itemDefinition.consumableData) {
        this.errorHandler.handleInvalidOperationError(
          'useItem',
          '無効な消耗品データです'
        );
        return {
          success: false,
          effectsApplied: [],
          itemConsumed: false,
          remainingQuantity: this.getItemCount(itemId),
          message: 'Invalid consumable data',
        };
      }

      const consumable = itemDefinition.consumableData;
      const effects = consumable.effects;

      // ItemEffectSystemとの連携（タスク5で実装予定）
      if (this.itemEffectSystem && targetCharacterId) {
        try {
          // 効果を適用
          for (const effect of effects) {
            this.itemEffectSystem.applyEffect(effect, targetCharacterId);
          }
        } catch (error) {
          this.errorHandler.createAndLogError(
            'APPLY_EFFECT_FAILED',
            'Failed to apply item effects',
            ErrorSeverity.ERROR,
            { itemId, targetCharacterId, error: (error as Error).message }
          );
          console.error('[InventoryManager] Error applying effects:', error);
          return {
            success: false,
            effectsApplied: [],
            itemConsumed: false,
            remainingQuantity: this.getItemCount(itemId),
            message: 'Failed to apply item effects',
          };
        }
      }

      // アイテムを消費
      const removeResult = this.removeItem(itemId, 1);
      if (!removeResult.success) {
        return {
          success: false,
          effectsApplied: [],
          itemConsumed: false,
          remainingQuantity: this.getItemCount(itemId),
          message: 'Failed to consume item',
        };
      }

      console.log(`[InventoryManager] Used ${item.name}`);

      return {
        success: true,
        effectsApplied: effects,
        itemConsumed: true,
        remainingQuantity: removeResult.newQuantity || 0,
        message: `Used ${item.name}`,
      };
    } catch (error) {
      this.errorHandler.createAndLogError(
        'USE_ITEM_FAILED',
        'Failed to use item',
        ErrorSeverity.ERROR,
        { itemId, targetCharacterId, error: (error as Error).message }
      );
      console.error('[InventoryManager] Error using item:', error);
      return {
        success: false,
        effectsApplied: [],
        itemConsumed: false,
        remainingQuantity: 0,
        message: 'Failed to use item',
      };
    }
  }

  /**
   * アイテムをソート
   * 要件1.5対応: 種類別、レアリティ別、名前順ソート
   * 
   * @param sortType - ソートタイプ
   */
  sortItems(sortType: ItemSortType): void {
    try {
      // 空でないスロットを取得
      const nonEmptySlots = this.inventoryData.slots.filter(slot => !slot.isEmpty);

      // ソート
      switch (sortType) {
        case ItemSortType.TYPE:
          nonEmptySlots.sort((a, b) => {
            if (a.item!.type !== b.item!.type) {
              return a.item!.type.localeCompare(b.item!.type);
            }
            return a.item!.name.localeCompare(b.item!.name);
          });
          break;

        case ItemSortType.RARITY:
          const rarityOrder = {
            common: 0,
            uncommon: 1,
            rare: 2,
            epic: 3,
            legendary: 4,
          };
          nonEmptySlots.sort((a, b) => {
            const rarityA = rarityOrder[a.item!.rarity];
            const rarityB = rarityOrder[b.item!.rarity];
            if (rarityA !== rarityB) {
              return rarityB - rarityA; // 降順（レアリティが高い順）
            }
            return a.item!.name.localeCompare(b.item!.name);
          });
          break;

        case ItemSortType.NAME:
          nonEmptySlots.sort((a, b) => a.item!.name.localeCompare(b.item!.name));
          break;

        case ItemSortType.QUANTITY:
          nonEmptySlots.sort((a, b) => {
            if (a.quantity !== b.quantity) {
              return b.quantity - a.quantity; // 降順（数量が多い順）
            }
            return a.item!.name.localeCompare(b.item!.name);
          });
          break;

        default:
          console.warn(`[InventoryManager] Unknown sort type: ${sortType}`);
          return;
      }

      // スロットを再配置
      for (let i = 0; i < this.inventoryData.slots.length; i++) {
        if (i < nonEmptySlots.length) {
          const sortedSlot = nonEmptySlots[i];
          this.inventoryData.slots[i] = {
            slotIndex: i,
            item: sortedSlot.item,
            quantity: sortedSlot.quantity,
            isEmpty: false,
          };
        } else {
          this.inventoryData.slots[i] = InventoryUtils.createEmptySlot(i);
        }
      }

      console.log(`[InventoryManager] Sorted items by ${sortType}`);
    } catch (error) {
      this.errorHandler.createAndLogError(
        'SORT_ITEMS_FAILED',
        'Failed to sort items',
        ErrorSeverity.WARNING,
        { sortType, error: (error as Error).message }
      );
      console.error('[InventoryManager] Error sorting items:', error);
    }
  }

  /**
   * インベントリデータを取得
   * 
   * @returns インベントリデータ（参照）
   */
  getInventoryData(): InventoryData {
    return this.inventoryData;
  }

  /**
   * インベントリをクリア
   * 
   */
  clear(): void {
    this.inventoryData = this.createEmptyInventory();
    console.log('[InventoryManager] Inventory cleared');
  }

  /**
   * インベントリデータをシリアライズ
   * 要件9.1, 9.5対応: インベントリデータをJSON形式でシリアライズ
   * 
   * @returns シリアライズされたインベントリデータ
   */
  serializeInventoryData(): string {
    try {
      // 保存用のデータ構造を作成
      const saveData = {
        version: '1.0.0',
        maxSlots: this.maxSlots,
        usedSlots: this.inventoryData.usedSlots,
        gold: this.inventoryData.gold,
        slots: this.inventoryData.slots
          .filter(slot => !slot.isEmpty)
          .map(slot => ({
            slotIndex: slot.slotIndex,
            itemId: slot.item!.id,
            quantity: slot.quantity,
          })),
        timestamp: Date.now(),
      };

      return JSON.stringify(saveData);
    } catch (error) {
      this.errorHandler.handleStorageError('save', error as Error);
      console.error('[InventoryManager] Error serializing inventory data:', error);
      throw new InventoryManagerError(
        'Failed to serialize inventory data',
        'SERIALIZE_FAILED',
        { error }
      );
    }
  }

  /**
   * インベントリデータをデシリアライズ
   * 要件9.3対応: シリアライズされたデータからインベントリを復元
   * 
   * @param serializedData シリアライズされたデータ
   * @returns デシリアライズ成功フラグ
   */
  deserializeInventoryData(serializedData: string): boolean {
    try {
      const saveData = JSON.parse(serializedData);

      // バージョンチェック
      if (!saveData.version) {
        console.warn('[InventoryManager] No version information in save data');
      }

      // インベントリをクリア
      this.clear();

      // 所持金を復元
      if (saveData.gold !== undefined) {
        this.inventoryData.gold = saveData.gold;
      }

      // アイテムを復元
      if (Array.isArray(saveData.slots)) {
        for (const slotData of saveData.slots) {
          // アイテム定義を取得
          const itemDefinition = this.itemDataLoader.getItemDefinition(slotData.itemId);
          if (!itemDefinition) {
            console.warn(`[InventoryManager] Item definition not found: ${slotData.itemId}`);
            continue;
          }

          // アイテムを追加
          const item = itemDefinition.baseItem;
          const addResult = this.addItem(item, slotData.quantity);

          if (!addResult.success) {
            console.warn(
              `[InventoryManager] Failed to restore item: ${slotData.itemId}`,
              addResult.message
            );
          }
        }
      }

      console.log('[InventoryManager] Inventory data deserialized successfully');
      return true;
    } catch (error) {
      this.errorHandler.handleStorageError('load', error as Error);
      console.error('[InventoryManager] Error deserializing inventory data:', error);
      throw new InventoryManagerError(
        'Failed to deserialize inventory data',
        'DESERIALIZE_FAILED',
        { error }
      );
    }
  }

  /**
   * インベントリをLocalStorageに保存
   * 要件9.1, 9.5対応: LocalStorageへの保存
   * 
   * @param key 保存キー（デフォルト: 'inventory_data'）
   * @returns 保存成功フラグ
   */
  saveToLocalStorage(key: string = 'inventory_data'): boolean {
    try {
      const serializedData = this.serializeInventoryData();
      localStorage.setItem(key, serializedData);

      console.log(`[InventoryManager] Inventory saved to localStorage: ${key}`);
      return true;
    } catch (error) {
      this.errorHandler.handleStorageError('save', error as Error);
      console.error('[InventoryManager] Error saving to localStorage:', error);

      if (error instanceof DOMException && error.code === 22) {
        throw new InventoryManagerError(
          'Storage quota exceeded',
          'STORAGE_FULL',
          { error }
        );
      }

      throw new InventoryManagerError(
        'Failed to save to localStorage',
        'SAVE_FAILED',
        { error }
      );
    }
  }

  /**
   * インベントリをLocalStorageから読み込み
   * 要件9.3対応: LocalStorageからの読み込み
   * 
   * @param key 読み込みキー（デフォルト: 'inventory_data'）
   * @returns 読み込み成功フラグ
   */
  loadFromLocalStorage(key: string = 'inventory_data'): boolean {
    try {
      const serializedData = localStorage.getItem(key);

      if (!serializedData) {
        console.warn(`[InventoryManager] No save data found: ${key}`);
        return false;
      }

      const success = this.deserializeInventoryData(serializedData);

      if (success) {
        console.log(`[InventoryManager] Inventory loaded from localStorage: ${key}`);
      }

      return success;
    } catch (error) {
      this.errorHandler.handleStorageError('load', error as Error);
      console.error('[InventoryManager] Error loading from localStorage:', error);

      throw new InventoryManagerError(
        'Failed to load from localStorage',
        'LOAD_FAILED',
        { error }
      );
    }
  }

  /**
   * エラーハンドラーを取得
   * 
   * @returns エラーハンドラー
   */
  getErrorHandler(): InventoryErrorHandler {
    return this.errorHandler;
  }

  /**
   * デバッグ情報を取得
   * 
   * @returns デバッグ情報
   */
  getDebugInfo(): {
    usedSlots: number;
    maxSlots: number;
    availableSlots: number;
    totalItems: number;
    uniqueItems: number;
  } {
    const uniqueItems = new Set(
      this.inventoryData.slots.filter(s => !s.isEmpty).map(s => s.item!.id)
    ).size;

    const totalItems = this.inventoryData.slots
      .filter(s => !s.isEmpty)
      .reduce((sum, slot) => sum + slot.quantity, 0);

    return {
      usedSlots: this.inventoryData.usedSlots,
      maxSlots: this.maxSlots,
      availableSlots: this.getAvailableSlots(),
      totalItems,
      uniqueItems,
    };
  }
}
