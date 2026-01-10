/**
 * ItemDataLoader - アイテムデータの読み込みと管理を担当するクラス
 * 
 * 要件5.1, 5.4に対応:
 * - JSONファイルからアイテムデータを読み込む
 * - アイテム定義の取得機能
 * - アセット読み込み機能
 */

import * as Phaser from 'phaser';
import {
  Item,
  ItemDefinition,
  Equipment,
  Consumable,
  ItemType,
  InventoryTypeValidators,
} from '../types/inventory';

/**
 * アイテムデータローダーのエラー
 */
export class ItemDataLoaderError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ItemDataLoaderError';
  }
}

/**
 * ItemDataLoaderクラス
 * アイテムデータの読み込み、検証、管理を行う
 */
export class ItemDataLoader {
  private scene: Phaser.Scene;
  private itemDefinitions: Map<string, ItemDefinition>;
  private loadedAssets: Set<string>;
  private isInitialized: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.itemDefinitions = new Map();
    this.loadedAssets = new Set();
    this.isInitialized = false;
  }

  /**
   * JSONファイルからアイテムデータを読み込む
   * 要件5.1対応
   * 
   * @param filePath - JSONファイルのパス
   * @returns アイテムデータの配列
   */
  async loadItemData(filePath: string): Promise<ItemDefinition[]> {
    try {
      console.log(`[ItemDataLoader] Loading item data from: ${filePath}`);

      // Phaserのキャッシュからデータを取得
      const cacheKey = this.getCacheKey(filePath);
      
      // データが既にロード済みの場合
      if (this.scene.cache.json.exists(cacheKey)) {
        const data = this.scene.cache.json.get(cacheKey);
        return this.processItemData(data);
      }

      // データをロード
      return new Promise((resolve, reject) => {
        this.scene.load.json(cacheKey, filePath);
        
        this.scene.load.once('complete', () => {
          try {
            const data = this.scene.cache.json.get(cacheKey);
            if (!data) {
              throw new ItemDataLoaderError(
                `Failed to load item data from ${filePath}`,
                'LOAD_FAILED',
                { filePath }
              );
            }
            
            const itemDefinitions = this.processItemData(data);
            resolve(itemDefinitions);
          } catch (error) {
            reject(error);
          }
        });

        this.scene.load.once('loaderror', (file: Phaser.Loader.File) => {
          reject(
            new ItemDataLoaderError(
              `Failed to load file: ${file.key}`,
              'FILE_NOT_FOUND',
              { filePath, fileKey: file.key }
            )
          );
        });

        this.scene.load.start();
      });
    } catch (error) {
      console.error('[ItemDataLoader] Error loading item data:', error);
      throw error;
    }
  }

  /**
   * データを処理してItemDefinitionの配列に変換
   * 
   * @param data - 生のJSONデータ
   * @returns ItemDefinitionの配列
   */
  private processItemData(data: any): ItemDefinition[] {
    if (!Array.isArray(data)) {
      throw new ItemDataLoaderError(
        'Item data must be an array',
        'INVALID_DATA_FORMAT',
        { dataType: typeof data }
      );
    }

    const itemDefinitions: ItemDefinition[] = [];

    for (const itemData of data) {
      try {
        const definition = this.createItemDefinition(itemData);
        itemDefinitions.push(definition);
        
        // 内部マップに保存
        this.itemDefinitions.set(definition.id, definition);
      } catch (error) {
        console.error('[ItemDataLoader] Error processing item:', itemData, error);
        // 個別のアイテムエラーは警告として扱い、処理を続行
        console.warn(`[ItemDataLoader] Skipping invalid item: ${itemData.id}`);
      }
    }

    this.isInitialized = true;
    console.log(`[ItemDataLoader] Loaded ${itemDefinitions.length} item definitions`);

    return itemDefinitions;
  }

  /**
   * ItemDefinitionを作成
   * 
   * @param data - アイテムデータ
   * @returns ItemDefinition
   */
  private createItemDefinition(data: any): ItemDefinition {
    if (!data.id || typeof data.id !== 'string') {
      throw new ItemDataLoaderError(
        'Item must have a valid id',
        'INVALID_ITEM_ID',
        { data }
      );
    }

    // 基本アイテムデータの検証
    if (!InventoryTypeValidators.isValidItem(data)) {
      throw new ItemDataLoaderError(
        `Invalid item data for id: ${data.id}`,
        'INVALID_ITEM_DATA',
        { itemId: data.id }
      );
    }

    const definition: ItemDefinition = {
      id: data.id,
      baseItem: data as Item,
      dropRate: data.dropRate,
      obtainableFrom: data.obtainableFrom,
    };

    // 装備データの追加
    if (
      data.type === ItemType.WEAPON ||
      data.type === ItemType.ARMOR ||
      data.type === ItemType.ACCESSORY
    ) {
      if (InventoryTypeValidators.isValidEquipment(data)) {
        definition.equipmentData = data as Equipment;
      } else {
        throw new ItemDataLoaderError(
          `Invalid equipment data for id: ${data.id}`,
          'INVALID_EQUIPMENT_DATA',
          { itemId: data.id }
        );
      }
    }

    // 消耗品データの追加
    if (data.type === ItemType.CONSUMABLE) {
      if (InventoryTypeValidators.isValidConsumable(data)) {
        definition.consumableData = data as Consumable;
      } else {
        throw new ItemDataLoaderError(
          `Invalid consumable data for id: ${data.id}`,
          'INVALID_CONSUMABLE_DATA',
          { itemId: data.id }
        );
      }
    }

    return definition;
  }

  /**
   * アイテムの画像アセットを動的に読み込む
   * 要件5.4対応
   * 
   * @param itemIds - 読み込むアイテムIDの配列
   */
  async loadItemAssets(itemIds: string[]): Promise<void> {
    try {
      console.log(`[ItemDataLoader] Loading assets for ${itemIds.length} items`);

      const assetsToLoad: Array<{ key: string; path: string }> = [];

      for (const itemId of itemIds) {
        const definition = this.itemDefinitions.get(itemId);
        if (!definition) {
          console.warn(`[ItemDataLoader] Item definition not found: ${itemId}`);
          continue;
        }

        const iconPath = definition.baseItem.iconPath;
        if (!iconPath) {
          console.warn(`[ItemDataLoader] No icon path for item: ${itemId}`);
          continue;
        }

        // 既にロード済みの場合はスキップ
        if (this.loadedAssets.has(iconPath)) {
          continue;
        }

        assetsToLoad.push({
          key: this.getAssetKey(itemId),
          path: iconPath,
        });
      }

      if (assetsToLoad.length === 0) {
        console.log('[ItemDataLoader] No new assets to load');
        return;
      }

      // アセットをロード
      return new Promise((resolve, reject) => {
        for (const asset of assetsToLoad) {
          this.scene.load.image(asset.key, asset.path);
        }

        this.scene.load.once('complete', () => {
          // ロード済みアセットを記録
          for (const asset of assetsToLoad) {
            this.loadedAssets.add(asset.path);
          }
          console.log(`[ItemDataLoader] Loaded ${assetsToLoad.length} assets`);
          resolve();
        });

        this.scene.load.once('loaderror', (file: Phaser.Loader.File) => {
          console.error(`[ItemDataLoader] Failed to load asset: ${file.key}`);
          reject(
            new ItemDataLoaderError(
              `Failed to load asset: ${file.key}`,
              'ASSET_LOAD_FAILED',
              { fileKey: file.key }
            )
          );
        });

        this.scene.load.start();
      });
    } catch (error) {
      console.error('[ItemDataLoader] Error loading assets:', error);
      throw error;
    }
  }

  /**
   * アイテム定義を取得
   * 要件5.1対応
   * 
   * @param itemId - アイテムID
   * @returns アイテム定義、存在しない場合はnull
   */
  getItemDefinition(itemId: string): ItemDefinition | null {
    return this.itemDefinitions.get(itemId) || null;
  }

  /**
   * 全てのアイテム定義を取得
   * 要件5.1対応
   * 
   * @returns 全てのアイテム定義の配列
   */
  getAllItemDefinitions(): ItemDefinition[] {
    return Array.from(this.itemDefinitions.values());
  }

  /**
   * 初期化済みかどうかを確認
   * 
   * @returns 初期化済みの場合true
   */
  isLoaded(): boolean {
    return this.isInitialized;
  }

  /**
   * アイテム数を取得
   * 
   * @returns ロード済みアイテムの数
   */
  getItemCount(): number {
    return this.itemDefinitions.size;
  }

  /**
   * アセットがロード済みかどうかを確認
   * 
   * @param itemId - アイテムID
   * @returns ロード済みの場合true
   */
  isAssetLoaded(itemId: string): boolean {
    const definition = this.itemDefinitions.get(itemId);
    if (!definition) {
      return false;
    }
    return this.loadedAssets.has(definition.baseItem.iconPath);
  }

  /**
   * キャッシュキーを生成
   * 
   * @param filePath - ファイルパス
   * @returns キャッシュキー
   */
  private getCacheKey(filePath: string): string {
    return `item-data-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  /**
   * アセットキーを生成
   * 
   * @param itemId - アイテムID
   * @returns アセットキー
   */
  private getAssetKey(itemId: string): string {
    return `item-icon-${itemId}`;
  }

  /**
   * データをクリア
   */
  clear(): void {
    this.itemDefinitions.clear();
    this.loadedAssets.clear();
    this.isInitialized = false;
    console.log('[ItemDataLoader] Data cleared');
  }

  /**
   * デバッグ情報を取得
   * 
   * @returns デバッグ情報
   */
  getDebugInfo(): {
    itemCount: number;
    loadedAssetCount: number;
    isInitialized: boolean;
    itemIds: string[];
  } {
    return {
      itemCount: this.itemDefinitions.size,
      loadedAssetCount: this.loadedAssets.size,
      isInitialized: this.isInitialized,
      itemIds: Array.from(this.itemDefinitions.keys()),
    };
  }
}
