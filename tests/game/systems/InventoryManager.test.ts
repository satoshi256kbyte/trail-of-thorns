/**
 * InventoryManager ユニットテスト
 * 
 * 要件1.1, 1.2, 1.3, 1.4, 1.5, 1.6の検証
 * エッジケースとエラーハンドリングをテスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import {
  Item,
  ItemType,
  ItemRarity,
  ItemSortType,
} from '../../../game/src/types/inventory';

// モックシーン
class MockScene {
  cache = {
    json: {
      exists: () => false,
      get: () => null,
    },
  };
  load = {
    json: () => {},
    image: () => {},
    once: () => {},
    start: () => {},
  };
}

// テスト用アイテム生成
const createTestItem = (
  id: string,
  name: string = 'Test Item',
  maxStack: number = 99,
  type: ItemType = ItemType.CONSUMABLE,
  rarity: ItemRarity = ItemRarity.COMMON
): Item => ({
  id,
  name,
  description: 'Test item description',
  type,
  rarity,
  iconPath: `/assets/items/${id}.png`,
  maxStack,
  sellPrice: 100,
  buyPrice: 200,
});

describe('InventoryManager Unit Tests', () => {
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;
  let mockScene: MockScene;

  beforeEach(() => {
    mockScene = new MockScene();
    itemDataLoader = new ItemDataLoader(mockScene as any);
    inventoryManager = new InventoryManager(itemDataLoader, 100);
  });

  describe('基本機能', () => {
    test('空のインベントリが正しく初期化される', () => {
      const debugInfo = inventoryManager.getDebugInfo();

      expect(debugInfo.usedSlots).toBe(0);
      expect(debugInfo.maxSlots).toBe(100);
      expect(debugInfo.availableSlots).toBe(100);
      expect(debugInfo.totalItems).toBe(0);
      expect(debugInfo.uniqueItems).toBe(0);
    });

    test('アイテムを追加できる', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      const result = inventoryManager.addItem(item, 5);

      expect(result.success).toBe(true);
      expect(result.affectedSlots.length).toBeGreaterThan(0);
      expect(inventoryManager.getItemCount('potion-1')).toBe(5);
    });

    test('アイテムを削除できる', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      inventoryManager.addItem(item, 10);

      const result = inventoryManager.removeItem('potion-1', 3);

      expect(result.success).toBe(true);
      expect(inventoryManager.getItemCount('potion-1')).toBe(7);
    });

    test('アイテムを取得できる', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      inventoryManager.addItem(item, 1);

      const retrievedItem = inventoryManager.getItem('potion-1');

      expect(retrievedItem).not.toBeNull();
      expect(retrievedItem?.id).toBe('potion-1');
      expect(retrievedItem?.name).toBe('Health Potion');
    });

    test('全アイテムを取得できる', () => {
      const item1 = createTestItem('potion-1', 'Health Potion');
      const item2 = createTestItem('potion-2', 'Mana Potion');

      inventoryManager.addItem(item1, 1);
      inventoryManager.addItem(item2, 1);

      const allItems = inventoryManager.getAllItems();

      expect(allItems.length).toBe(100); // 全スロット数
      const nonEmptySlots = allItems.filter(slot => !slot.isEmpty);
      expect(nonEmptySlots.length).toBe(2);
    });
  });

  describe('容量管理', () => {
    test('満杯チェックが正しく動作する', () => {
      expect(inventoryManager.isFull()).toBe(false);

      // インベントリを満杯にする
      for (let i = 0; i < 100; i++) {
        const item = createTestItem(`item-${i}`, `Item ${i}`, 1);
        inventoryManager.addItem(item, 1);
      }

      expect(inventoryManager.isFull()).toBe(true);
    });

    test('空きスロット数が正しく計算される', () => {
      expect(inventoryManager.getAvailableSlots()).toBe(100);

      const item = createTestItem('potion-1', 'Health Potion', 1);
      inventoryManager.addItem(item, 1);

      expect(inventoryManager.getAvailableSlots()).toBe(99);
    });

    test('満杯時にアイテム追加が拒否される', () => {
      // インベントリを満杯にする
      for (let i = 0; i < 100; i++) {
        const item = createTestItem(`item-${i}`, `Item ${i}`, 1);
        inventoryManager.addItem(item, 1);
      }

      const newItem = createTestItem('new-item', 'New Item', 1);
      const result = inventoryManager.addItem(newItem, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('full');
    });
  });

  describe('アイテムスタック', () => {
    test('同じアイテムが正しくスタックされる', () => {
      const item = createTestItem('potion-1', 'Health Potion', 99);

      inventoryManager.addItem(item, 10);
      inventoryManager.addItem(item, 20);

      expect(inventoryManager.getItemCount('potion-1')).toBe(30);

      const debugInfo = inventoryManager.getDebugInfo();
      expect(debugInfo.usedSlots).toBe(1); // 1スロットのみ使用
    });

    test('maxStackを超えると新しいスロットが使用される', () => {
      const item = createTestItem('potion-1', 'Health Potion', 10);

      inventoryManager.addItem(item, 25);

      expect(inventoryManager.getItemCount('potion-1')).toBe(25);

      const debugInfo = inventoryManager.getDebugInfo();
      expect(debugInfo.usedSlots).toBe(3); // 10 + 10 + 5 = 3スロット
    });
  });

  describe('ソート機能', () => {
    test('種類別ソートが正しく動作する', () => {
      const weapon = createTestItem('sword-1', 'Sword', 1, ItemType.WEAPON);
      const armor = createTestItem('armor-1', 'Armor', 1, ItemType.ARMOR);
      const consumable = createTestItem('potion-1', 'Potion', 1, ItemType.CONSUMABLE);

      inventoryManager.addItem(consumable, 1);
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);

      inventoryManager.sortItems(ItemSortType.TYPE);

      const allItems = inventoryManager.getAllItems().filter(slot => !slot.isEmpty);

      // 種類が連続していることを確認
      const types = allItems.map(slot => slot.item!.type);
      for (let i = 0; i < types.length - 1; i++) {
        if (types[i] !== types[i + 1]) {
          // 種類が変わった後、前の種類が再び出現しないことを確認
          for (let j = i + 1; j < types.length; j++) {
            expect(types[j]).not.toBe(types[i]);
          }
        }
      }
    });

    test('レアリティ別ソートが正しく動作する', () => {
      const common = createTestItem('item-1', 'Common Item', 1, ItemType.CONSUMABLE, ItemRarity.COMMON);
      const rare = createTestItem('item-2', 'Rare Item', 1, ItemType.CONSUMABLE, ItemRarity.RARE);
      const legendary = createTestItem('item-3', 'Legendary Item', 1, ItemType.CONSUMABLE, ItemRarity.LEGENDARY);

      inventoryManager.addItem(common, 1);
      inventoryManager.addItem(rare, 1);
      inventoryManager.addItem(legendary, 1);

      inventoryManager.sortItems(ItemSortType.RARITY);

      const allItems = inventoryManager.getAllItems().filter(slot => !slot.isEmpty);

      // レアリティが降順であることを確認
      expect(allItems[0].item!.rarity).toBe(ItemRarity.LEGENDARY);
      expect(allItems[1].item!.rarity).toBe(ItemRarity.RARE);
      expect(allItems[2].item!.rarity).toBe(ItemRarity.COMMON);
    });

    test('名前順ソートが正しく動作する', () => {
      const itemC = createTestItem('item-c', 'C Item');
      const itemA = createTestItem('item-a', 'A Item');
      const itemB = createTestItem('item-b', 'B Item');

      inventoryManager.addItem(itemC, 1);
      inventoryManager.addItem(itemA, 1);
      inventoryManager.addItem(itemB, 1);

      inventoryManager.sortItems(ItemSortType.NAME);

      const allItems = inventoryManager.getAllItems().filter(slot => !slot.isEmpty);

      expect(allItems[0].item!.name).toBe('A Item');
      expect(allItems[1].item!.name).toBe('B Item');
      expect(allItems[2].item!.name).toBe('C Item');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なアイテムの追加が拒否される', () => {
      const invalidItem = { id: 'invalid' } as any;
      const result = inventoryManager.addItem(invalidItem, 1);

      expect(result.success).toBe(false);
    });

    test('0以下の数量での追加が拒否される', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      const result = inventoryManager.addItem(item, 0);

      expect(result.success).toBe(false);
    });

    test('0以下の数量での削除が拒否される', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      inventoryManager.addItem(item, 10);

      const result = inventoryManager.removeItem('potion-1', 0);

      expect(result.success).toBe(false);
    });

    test('存在しないアイテムの削除が拒否される', () => {
      const result = inventoryManager.removeItem('non-existent', 1);

      expect(result.success).toBe(false);
    });

    test('数量不足での削除が拒否される', () => {
      const item = createTestItem('potion-1', 'Health Potion');
      inventoryManager.addItem(item, 5);

      const result = inventoryManager.removeItem('potion-1', 10);

      expect(result.success).toBe(false);
    });

    test('存在しないアイテムの取得はnullを返す', () => {
      const item = inventoryManager.getItem('non-existent');

      expect(item).toBeNull();
    });
  });

  describe('エッジケース', () => {
    test('空のインベントリからアイテムを削除しようとすると失敗する', () => {
      const result = inventoryManager.removeItem('any-item', 1);

      expect(result.success).toBe(false);
    });

    test('インベントリをクリアすると全てのアイテムが削除される', () => {
      const item1 = createTestItem('potion-1', 'Health Potion');
      const item2 = createTestItem('potion-2', 'Mana Potion');

      inventoryManager.addItem(item1, 5);
      inventoryManager.addItem(item2, 3);

      inventoryManager.clear();

      const debugInfo = inventoryManager.getDebugInfo();
      expect(debugInfo.usedSlots).toBe(0);
      expect(debugInfo.totalItems).toBe(0);
    });

    test('maxStack=1のアイテムは複数スロットに分散される', () => {
      const item = createTestItem('key-1', 'Key', 1);

      inventoryManager.addItem(item, 5);

      const debugInfo = inventoryManager.getDebugInfo();
      expect(debugInfo.usedSlots).toBe(5);
      expect(inventoryManager.getItemCount('key-1')).toBe(5);
    });

    test('大量のアイテムを追加しても容量制限を超えない', () => {
      const item = createTestItem('potion-1', 'Health Potion', 1);

      // 150個追加を試みる（容量は100）
      inventoryManager.addItem(item, 150);

      const debugInfo = inventoryManager.getDebugInfo();
      expect(debugInfo.usedSlots).toBeLessThanOrEqual(100);
    });
  });

  describe('アイテム情報の正確性', () => {
    test('追加したアイテムの詳細情報が保持される', () => {
      const item = createTestItem('potion-1', 'Health Potion', 99, ItemType.CONSUMABLE, ItemRarity.RARE);
      item.sellPrice = 150;
      item.buyPrice = 300;

      inventoryManager.addItem(item, 1);

      const retrievedItem = inventoryManager.getItem('potion-1');

      expect(retrievedItem).not.toBeNull();
      expect(retrievedItem?.id).toBe('potion-1');
      expect(retrievedItem?.name).toBe('Health Potion');
      expect(retrievedItem?.type).toBe(ItemType.CONSUMABLE);
      expect(retrievedItem?.rarity).toBe(ItemRarity.RARE);
      expect(retrievedItem?.maxStack).toBe(99);
      expect(retrievedItem?.sellPrice).toBe(150);
      expect(retrievedItem?.buyPrice).toBe(300);
    });

    test('アイテム数量が正確に追跡される', () => {
      const item = createTestItem('potion-1', 'Health Potion');

      inventoryManager.addItem(item, 10);
      expect(inventoryManager.getItemCount('potion-1')).toBe(10);

      inventoryManager.addItem(item, 5);
      expect(inventoryManager.getItemCount('potion-1')).toBe(15);

      inventoryManager.removeItem('potion-1', 7);
      expect(inventoryManager.getItemCount('potion-1')).toBe(8);
    });
  });
});
