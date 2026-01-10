/**
 * InventoryManager プロパティベーステスト
 * 
 * 要件1.1, 1.2, 1.3, 1.4, 1.5, 1.6の検証
 * 各プロパティテストは100回の反復で実行
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
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
const createTestItem = (id: string, maxStack: number = 99): Item => ({
  id,
  name: `Test Item ${id}`,
  description: 'Test item description',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.COMMON,
  iconPath: `/assets/items/${id}.png`,
  maxStack,
  sellPrice: 100,
  buyPrice: 200,
});

// fast-check用のアイテムジェネレーター
const itemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  type: fc.constantFrom(...Object.values(ItemType)),
  rarity: fc.constantFrom(...Object.values(ItemRarity)),
  iconPath: fc.string({ minLength: 1, maxLength: 100 }),
  maxStack: fc.integer({ min: 1, max: 999 }),
  sellPrice: fc.integer({ min: 0, max: 999999 }),
  buyPrice: fc.integer({ min: 0, max: 999999 }),
});

describe('InventoryManager Property-Based Tests', () => {
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;
  let mockScene: MockScene;

  beforeEach(() => {
    mockScene = new MockScene();
    itemDataLoader = new ItemDataLoader(mockScene as any);
    inventoryManager = new InventoryManager(itemDataLoader, 100);
  });

  /**
   * プロパティ1: インベントリ容量制限
   * 検証要件: 1.1
   * 
   * Feature: inventory-equipment-system, Property 1: 任意のアイテム追加操作後、インベントリ内のアイテム総数は100以下でなければならない
   */
  describe('プロパティ1: インベントリ容量制限', () => {
    test('任意のアイテム追加操作後、インベントリ内のアイテム総数は100以下', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              itemArb,
              fc.integer({ min: 1, max: 10 })
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (itemsWithQuantities) => {
            // 新しいインベントリマネージャーを作成
            const manager = new InventoryManager(itemDataLoader, 100);

            // アイテムを追加
            for (const [item, quantity] of itemsWithQuantities) {
              manager.addItem(item as Item, quantity);
            }

            // 使用中のスロット数を確認
            const debugInfo = manager.getDebugInfo();
            expect(debugInfo.usedSlots).toBeLessThanOrEqual(100);
            expect(debugInfo.usedSlots).toBeGreaterThanOrEqual(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ2: アイテム追加の正確性
   * 検証要件: 1.2
   * 
   * Feature: inventory-equipment-system, Property 2: 任意の有効なアイテムをインベントリに追加した後、そのアイテムがインベントリ内に存在し、数量が正しく反映される
   */
  describe('プロパティ2: アイテム追加の正確性', () => {
    test('任意の有効なアイテムを追加した後、そのアイテムが存在し数量が正しい', () => {
      fc.assert(
        fc.property(
          itemArb,
          fc.integer({ min: 1, max: 50 }),
          (item, quantity) => {
            const manager = new InventoryManager(itemDataLoader, 100);
            const testItem = item as Item;

            // アイテムを追加
            const result = manager.addItem(testItem, quantity);

            if (result.success) {
              // アイテムが存在することを確認
              const retrievedItem = manager.getItem(testItem.id);
              expect(retrievedItem).not.toBeNull();
              expect(retrievedItem?.id).toBe(testItem.id);

              // 数量が正しいことを確認
              const actualQuantity = manager.getItemCount(testItem.id);
              expect(actualQuantity).toBe(quantity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ3: 満杯時の追加拒否
   * 検証要件: 1.3
   * 
   * Feature: inventory-equipment-system, Property 3: 任意の満杯状態のインベントリに対するアイテム追加試行は拒否され、インベントリの状態は変更されない
   */
  describe('プロパティ3: 満杯時の追加拒否', () => {
    test('満杯状態のインベントリへのアイテム追加は拒否される', () => {
      fc.assert(
        fc.property(
          itemArb,
          fc.integer({ min: 1, max: 10 }),
          (newItem, quantity) => {
            const manager = new InventoryManager(itemDataLoader, 100);

            // インベントリを満杯にする
            for (let i = 0; i < 100; i++) {
              const item = createTestItem(`item-${i}`, 1);
              manager.addItem(item, 1);
            }

            // 満杯であることを確認
            expect(manager.isFull()).toBe(true);

            // 状態を保存
            const beforeDebugInfo = manager.getDebugInfo();

            // 新しいアイテムを追加試行
            const result = manager.addItem(newItem as Item, quantity);

            // 追加が拒否されることを確認
            expect(result.success).toBe(false);

            // 状態が変更されていないことを確認
            const afterDebugInfo = manager.getDebugInfo();
            expect(afterDebugInfo.usedSlots).toBe(beforeDebugInfo.usedSlots);
            expect(afterDebugInfo.totalItems).toBe(beforeDebugInfo.totalItems);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ4: アイテム削除の正確性
   * 検証要件: 1.4
   * 
   * Feature: inventory-equipment-system, Property 4: 任意のインベントリ内のアイテムを削除した後、そのアイテムがインベントリから消えるか、数量が正しく減少する
   */
  describe('プロパティ4: アイテム削除の正確性', () => {
    test('任意のアイテムを削除した後、数量が正しく減少する', () => {
      fc.assert(
        fc.property(
          itemArb,
          fc.integer({ min: 10, max: 50 }),
          fc.integer({ min: 1, max: 10 }),
          (item, addQuantity, removeQuantity) => {
            const manager = new InventoryManager(itemDataLoader, 100);
            const testItem = item as Item;

            // アイテムを追加
            manager.addItem(testItem, addQuantity);
            const beforeQuantity = manager.getItemCount(testItem.id);

            // アイテムを削除
            const result = manager.removeItem(testItem.id, Math.min(removeQuantity, beforeQuantity));

            if (result.success) {
              const afterQuantity = manager.getItemCount(testItem.id);
              const expectedQuantity = beforeQuantity - Math.min(removeQuantity, beforeQuantity);

              expect(afterQuantity).toBe(expectedQuantity);

              // 全て削除された場合、アイテムが存在しないことを確認
              if (expectedQuantity === 0) {
                expect(manager.getItem(testItem.id)).toBeNull();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ5: ソート後の順序保証
   * 検証要件: 1.5
   * 
   * Feature: inventory-equipment-system, Property 5: 任意のインベントリをアイテム種類でソートした後、同じ種類のアイテムが連続して配置される
   */
  describe('プロパティ5: ソート後の順序保証', () => {
    test('種類別ソート後、同じ種類のアイテムが連続して配置される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(itemArb, fc.integer({ min: 1, max: 5 })),
            { minLength: 5, maxLength: 20 }
          ),
          (itemsWithQuantities) => {
            const manager = new InventoryManager(itemDataLoader, 100);

            // アイテムを追加
            for (const [item, quantity] of itemsWithQuantities) {
              manager.addItem(item as Item, quantity);
            }

            // 種類別にソート
            manager.sortItems(ItemSortType.TYPE);

            // ソート後のアイテムを取得
            const allItems = manager.getAllItems().filter(slot => !slot.isEmpty);

            // 同じ種類のアイテムが連続していることを確認
            for (let i = 0; i < allItems.length - 1; i++) {
              const currentType = allItems[i].item!.type;
              const nextType = allItems[i + 1].item!.type;

              // 現在のアイテムと次のアイテムの種類が異なる場合、
              // それ以降に現在の種類のアイテムが出現しないことを確認
              if (currentType !== nextType) {
                for (let j = i + 2; j < allItems.length; j++) {
                  expect(allItems[j].item!.type).not.toBe(currentType);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('レアリティ別ソート後、レアリティが降順に配置される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(itemArb, fc.integer({ min: 1, max: 5 })),
            { minLength: 5, maxLength: 20 }
          ),
          (itemsWithQuantities) => {
            const manager = new InventoryManager(itemDataLoader, 100);

            // アイテムを追加
            for (const [item, quantity] of itemsWithQuantities) {
              manager.addItem(item as Item, quantity);
            }

            // レアリティ別にソート
            manager.sortItems(ItemSortType.RARITY);

            // ソート後のアイテムを取得
            const allItems = manager.getAllItems().filter(slot => !slot.isEmpty);

            const rarityOrder: Record<ItemRarity, number> = {
              [ItemRarity.COMMON]: 0,
              [ItemRarity.UNCOMMON]: 1,
              [ItemRarity.RARE]: 2,
              [ItemRarity.EPIC]: 3,
              [ItemRarity.LEGENDARY]: 4,
            };

            // レアリティが降順であることを確認
            for (let i = 0; i < allItems.length - 1; i++) {
              const currentRarity = rarityOrder[allItems[i].item!.rarity];
              const nextRarity = rarityOrder[allItems[i + 1].item!.rarity];

              expect(currentRarity).toBeGreaterThanOrEqual(nextRarity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('名前順ソート後、アイテムがアルファベット順に配置される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(itemArb, fc.integer({ min: 1, max: 5 })),
            { minLength: 5, maxLength: 20 }
          ),
          (itemsWithQuantities) => {
            const manager = new InventoryManager(itemDataLoader, 100);

            // アイテムを追加
            for (const [item, quantity] of itemsWithQuantities) {
              manager.addItem(item as Item, quantity);
            }

            // 名前順にソート
            manager.sortItems(ItemSortType.NAME);

            // ソート後のアイテムを取得
            const allItems = manager.getAllItems().filter(slot => !slot.isEmpty);

            // 名前が昇順であることを確認
            for (let i = 0; i < allItems.length - 1; i++) {
              const currentName = allItems[i].item!.name;
              const nextName = allItems[i + 1].item!.name;

              expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ6: アイテム情報の正確性
   * 検証要件: 1.6
   * 
   * Feature: inventory-equipment-system, Property 6: 任意のインベントリ内のアイテムについて、取得した詳細情報（名前、説明、効果、数量）がアイテム定義と一致する
   */
  describe('プロパティ6: アイテム情報の正確性', () => {
    test('任意のアイテムの詳細情報が元のアイテム定義と一致する', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(itemArb, fc.integer({ min: 1, max: 10 })),
            { minLength: 1, maxLength: 20 }
          ),
          (itemsWithQuantities) => {
            const manager = new InventoryManager(itemDataLoader, 100);

            // アイテムを追加し、元の定義を保存（同じIDのアイテムは数量を合計）
            const itemDefinitions = new Map<string, { item: Item; totalQuantity: number }>();
            for (const [item, quantity] of itemsWithQuantities) {
              const testItem = item as Item;
              manager.addItem(testItem, quantity);
              
              // 同じIDのアイテムがある場合は数量を合計
              if (itemDefinitions.has(testItem.id)) {
                const existing = itemDefinitions.get(testItem.id)!;
                existing.totalQuantity += quantity;
              } else {
                itemDefinitions.set(testItem.id, { item: testItem, totalQuantity: quantity });
              }
            }

            // 各アイテムの情報を確認
            for (const [itemId, definition] of itemDefinitions) {
              const retrievedItem = manager.getItem(itemId);

              if (retrievedItem) {
                // 基本情報が一致することを確認
                expect(retrievedItem.id).toBe(definition.item.id);
                expect(retrievedItem.name).toBe(definition.item.name);
                expect(retrievedItem.description).toBe(definition.item.description);
                expect(retrievedItem.type).toBe(definition.item.type);
                expect(retrievedItem.rarity).toBe(definition.item.rarity);
                expect(retrievedItem.maxStack).toBe(definition.item.maxStack);
                expect(retrievedItem.sellPrice).toBe(definition.item.sellPrice);
                expect(retrievedItem.buyPrice).toBe(definition.item.buyPrice);

                // 数量が正しいことを確認（スタッキングを考慮）
                const actualQuantity = manager.getItemCount(itemId);
                expect(actualQuantity).toBe(definition.totalQuantity);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
