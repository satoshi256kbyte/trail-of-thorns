/**
 * ItemDataLoader Unit Tests
 * 
 * 要件5.1, 5.3, 5.4のテスト:
 * - JSON読み込みの正確性をテスト
 * - エラーハンドリングをテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { ItemDataLoader, ItemDataLoaderError } from '../../../game/src/systems/ItemDataLoader';
import { ItemType, ItemRarity, EquipmentSlotType } from '../../../game/src/types/inventory';

/**
 * モックシーンを作成
 */
function createMockScene(): Phaser.Scene {
  const mockCache = {
    json: {
      exists: vi.fn().mockReturnValue(false),
      get: vi.fn(),
    },
  };

  const mockLoad = {
    json: vi.fn(),
    image: vi.fn(),
    once: vi.fn(),
    start: vi.fn(),
  };

  return {
    cache: mockCache,
    load: mockLoad,
  } as any;
}

/**
 * 有効なアイテムデータを作成
 */
function createValidItemData() {
  return [
    {
      id: 'sword-001',
      name: 'Iron Sword',
      description: 'A basic iron sword',
      type: ItemType.WEAPON,
      rarity: ItemRarity.COMMON,
      iconPath: 'assets/items/sword-001.png',
      maxStack: 1,
      sellPrice: 100,
      buyPrice: 200,
      slot: EquipmentSlotType.WEAPON,
      stats: {
        attack: 10,
        defense: 0,
      },
      requirements: {
        level: 1,
      },
      durability: 100,
      maxDurability: 100,
      effects: [],
    },
    {
      id: 'potion-001',
      name: 'Health Potion',
      description: 'Restores 50 HP',
      type: ItemType.CONSUMABLE,
      rarity: ItemRarity.COMMON,
      iconPath: 'assets/items/potion-001.png',
      maxStack: 99,
      sellPrice: 50,
      buyPrice: 100,
      consumableType: 'healing',
      effects: [
        {
          id: 'heal-50',
          type: 'hp_recovery',
          target: 'hp',
          value: 50,
          duration: 0,
          isPermanent: false,
          stackable: false,
        },
      ],
      usableInBattle: true,
      targetType: 'single',
    },
  ];
}

describe('ItemDataLoader', () => {
  let mockScene: Phaser.Scene;
  let loader: ItemDataLoader;

  beforeEach(() => {
    mockScene = createMockScene();
    loader = new ItemDataLoader(mockScene);
  });

  describe('初期化', () => {
    test('新しいItemDataLoaderインスタンスが正しく初期化される', () => {
      expect(loader).toBeDefined();
      expect(loader.isLoaded()).toBe(false);
      expect(loader.getItemCount()).toBe(0);
    });

    test('デバッグ情報が正しく取得できる', () => {
      const debugInfo = loader.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('itemCount');
      expect(debugInfo).toHaveProperty('loadedAssetCount');
      expect(debugInfo).toHaveProperty('isInitialized');
      expect(debugInfo).toHaveProperty('itemIds');
      expect(debugInfo.itemCount).toBe(0);
      expect(debugInfo.isInitialized).toBe(false);
      expect(Array.isArray(debugInfo.itemIds)).toBe(true);
    });
  });

  describe('loadItemData - JSON読み込み', () => {
    test('有効なJSONデータを正しく読み込める', async () => {
      const validData = createValidItemData();
      
      // モックの設定
      mockScene.cache.json.get = vi.fn().mockReturnValue(validData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sword-001');
      expect(result[1].id).toBe('potion-001');
      expect(loader.isLoaded()).toBe(true);
      expect(loader.getItemCount()).toBe(2);
    });

    test('既にキャッシュされたデータを再利用できる', async () => {
      const validData = createValidItemData();
      
      // キャッシュが存在する場合
      mockScene.cache.json.exists = vi.fn().mockReturnValue(true);
      mockScene.cache.json.get = vi.fn().mockReturnValue(validData);

      const result = await loader.loadItemData('data/items.json');

      expect(result).toHaveLength(2);
      expect(mockScene.load.start).not.toHaveBeenCalled();
    });

    test('配列でないデータを読み込むとエラーが発生する', async () => {
      const invalidData = { notAnArray: true };
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(invalidData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      await expect(loader.loadItemData('data/items.json')).rejects.toThrow(ItemDataLoaderError);
      await expect(loader.loadItemData('data/items.json')).rejects.toThrow('Item data must be an array');
    });

    test('ファイル読み込みエラーが正しく処理される', async () => {
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'loaderror') {
          callback({ key: 'test-key' });
        }
      });

      await expect(loader.loadItemData('invalid/path.json')).rejects.toThrow(ItemDataLoaderError);
    });

    test('不正なアイテムデータはスキップされる', async () => {
      const mixedData = [
        ...createValidItemData(),
        {
          // IDが欠落している不正なデータ
          name: 'Invalid Item',
          type: ItemType.WEAPON,
        },
      ];
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(mixedData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      // 有効なアイテムのみが読み込まれる
      expect(result).toHaveLength(2);
      expect(loader.getItemCount()).toBe(2);
    });
  });

  describe('getItemDefinition - アイテム定義の取得', () => {
    beforeEach(async () => {
      const validData = createValidItemData();
      mockScene.cache.json.get = vi.fn().mockReturnValue(validData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });
      await loader.loadItemData('data/items.json');
    });

    test('存在するアイテムIDで定義を取得できる', () => {
      const definition = loader.getItemDefinition('sword-001');
      
      expect(definition).not.toBeNull();
      expect(definition?.id).toBe('sword-001');
      expect(definition?.baseItem.name).toBe('Iron Sword');
      expect(definition?.equipmentData).toBeDefined();
    });

    test('存在しないアイテムIDではnullが返される', () => {
      const definition = loader.getItemDefinition('non-existent-id');
      
      expect(definition).toBeNull();
    });

    test('全てのアイテム定義を取得できる', () => {
      const allDefinitions = loader.getAllItemDefinitions();
      
      expect(allDefinitions).toHaveLength(2);
      expect(allDefinitions[0].id).toBe('sword-001');
      expect(allDefinitions[1].id).toBe('potion-001');
    });
  });

  describe('loadItemAssets - アセット読み込み', () => {
    beforeEach(async () => {
      const validData = createValidItemData();
      mockScene.cache.json.get = vi.fn().mockReturnValue(validData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });
      await loader.loadItemData('data/items.json');
    });

    test('指定されたアイテムのアセットを読み込める', async () => {
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      await loader.loadItemAssets(['sword-001', 'potion-001']);

      expect(mockScene.load.image).toHaveBeenCalledTimes(2);
      expect(mockScene.load.start).toHaveBeenCalled();
    });

    test('既に読み込まれたアセットはスキップされる', async () => {
      // 最初の読み込み
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });
      await loader.loadItemAssets(['sword-001']);

      // 2回目の読み込み
      vi.clearAllMocks();
      await loader.loadItemAssets(['sword-001']);

      // 既に読み込まれているのでload.imageは呼ばれない
      expect(mockScene.load.image).not.toHaveBeenCalled();
    });

    test('存在しないアイテムIDは警告が出力される', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await loader.loadItemAssets(['non-existent-id']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Item definition not found')
      );

      consoleSpy.mockRestore();
    });

    test('アセット読み込みエラーが正しく処理される', async () => {
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'loaderror') {
          callback({ key: 'test-key' });
        }
      });

      await expect(loader.loadItemAssets(['sword-001'])).rejects.toThrow(ItemDataLoaderError);
    });

    test('アセットの読み込み状態を確認できる', async () => {
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      expect(loader.isAssetLoaded('sword-001')).toBe(false);

      await loader.loadItemAssets(['sword-001']);

      expect(loader.isAssetLoaded('sword-001')).toBe(true);
    });
  });

  describe('clear - データクリア', () => {
    test('データをクリアすると初期状態に戻る', async () => {
      const validData = createValidItemData();
      mockScene.cache.json.get = vi.fn().mockReturnValue(validData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      await loader.loadItemData('data/items.json');
      expect(loader.getItemCount()).toBe(2);
      expect(loader.isLoaded()).toBe(true);

      loader.clear();

      expect(loader.getItemCount()).toBe(0);
      expect(loader.isLoaded()).toBe(false);
      expect(loader.getAllItemDefinitions()).toHaveLength(0);
    });
  });

  describe('エラーハンドリング', () => {
    test('ItemDataLoaderErrorが正しい情報を持つ', () => {
      const error = new ItemDataLoaderError(
        'Test error message',
        'TEST_ERROR_CODE',
        { testContext: 'value' }
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR_CODE');
      expect(error.context).toEqual({ testContext: 'value' });
      expect(error.name).toBe('ItemDataLoaderError');
    });

    test('不正なアイテムIDを持つデータはエラーとして処理される', async () => {
      const invalidData = [
        {
          // IDが欠落
          name: 'Invalid Item',
          type: ItemType.WEAPON,
        },
      ];
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(invalidData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      // 不正なデータはスキップされる
      expect(result).toHaveLength(0);
    });

    test('装備データの検証エラーが正しく処理される', async () => {
      const invalidEquipmentData = [
        {
          id: 'invalid-equipment',
          name: 'Invalid Equipment',
          description: 'Invalid',
          type: ItemType.WEAPON,
          rarity: ItemRarity.COMMON,
          iconPath: 'test.png',
          maxStack: 1,
          sellPrice: 0,
          buyPrice: 0,
          // 必須フィールドが欠落
        },
      ];
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(invalidEquipmentData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      // 不正なデータはスキップされる
      expect(result).toHaveLength(0);
    });
  });

  describe('装備データと消耗品データの処理', () => {
    test('装備データが正しく処理される', async () => {
      const equipmentData = [
        {
          id: 'sword-001',
          name: 'Iron Sword',
          description: 'A basic iron sword',
          type: ItemType.WEAPON,
          rarity: ItemRarity.COMMON,
          iconPath: 'assets/items/sword-001.png',
          maxStack: 1,
          sellPrice: 100,
          buyPrice: 200,
          slot: EquipmentSlotType.WEAPON,
          stats: {
            attack: 10,
          },
          requirements: {
            level: 1,
          },
          durability: 100,
          maxDurability: 100,
          effects: [],
        },
      ];
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(equipmentData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      expect(result).toHaveLength(1);
      expect(result[0].equipmentData).toBeDefined();
      expect(result[0].equipmentData?.slot).toBe(EquipmentSlotType.WEAPON);
    });

    test('消耗品データが正しく処理される', async () => {
      const consumableData = [
        {
          id: 'potion-001',
          name: 'Health Potion',
          description: 'Restores 50 HP',
          type: ItemType.CONSUMABLE,
          rarity: ItemRarity.COMMON,
          iconPath: 'assets/items/potion-001.png',
          maxStack: 99,
          sellPrice: 50,
          buyPrice: 100,
          consumableType: 'healing',
          effects: [],
          usableInBattle: true,
          targetType: 'single',
        },
      ];
      
      mockScene.cache.json.get = vi.fn().mockReturnValue(consumableData);
      mockScene.load.once = vi.fn((event, callback) => {
        if (event === 'complete') {
          callback();
        }
      });

      const result = await loader.loadItemData('data/items.json');

      expect(result).toHaveLength(1);
      expect(result[0].consumableData).toBeDefined();
      expect(result[0].consumableData?.consumableType).toBe('healing');
    });
  });
});
