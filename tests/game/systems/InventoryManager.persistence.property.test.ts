/**
 * InventoryManager データ永続化プロパティテスト
 * 
 * Feature: inventory-equipment-system
 * Property 22: インベントリのセーブ・ロード
 * 検証要件: 9.1, 9.3
 * 
 * このテストは、インベントリのセーブ・ロード機能が正しく動作することを検証します。
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import { Item, ItemType, ItemRarity } from '../../../game/src/types/inventory';

describe('InventoryManager データ永続化プロパティテスト', () => {
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  // テスト用のアイテムジェネレーター（ユニークなIDを生成）
  const itemArbitrary = fc.record({
    id: fc.uuid().map(uuid => `item_${uuid}`), // UUIDを使用してユニークなIDを生成
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ maxLength: 200 }),
    type: fc.constantFrom(
      ItemType.WEAPON,
      ItemType.ARMOR,
      ItemType.ACCESSORY,
      ItemType.CONSUMABLE,
      ItemType.MATERIAL
    ),
    rarity: fc.constantFrom(
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
      ItemRarity.LEGENDARY
    ),
    iconPath: fc.constant('assets/items/default.png'),
    maxStack: fc.integer({ min: 1, max: 99 }),
    sellPrice: fc.integer({ min: 0, max: 10000 }),
    buyPrice: fc.integer({ min: 0, max: 10000 }),
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // ItemDataLoaderのモックを作成
    itemDataLoader = {
      getItemDefinition: (itemId: string) => {
        // テスト用のアイテム定義を返す
        return {
          id: itemId,
          baseItem: {
            id: itemId,
            name: `Test Item ${itemId}`,
            description: 'Test item description',
            type: ItemType.CONSUMABLE,
            rarity: ItemRarity.COMMON,
            iconPath: 'assets/items/default.png',
            maxStack: 10,
            sellPrice: 100,
            buyPrice: 200,
          },
        };
      },
    } as any;

    inventoryManager = new InventoryManager(itemDataLoader, 100);
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Property 22: インベントリのセーブ・ロード
   * 検証要件: 9.1, 9.3
   * 
   * 任意のインベントリ状態をセーブしてロードすると、
   * 全てのアイテムと数量が正確に復元される
   * 
   * 注: ロード時にaddItemを使用するため、スタック可能なアイテムは
   * 自動的にスタックされる。そのため、スロット配置ではなく、
   * アイテムIDごとの総数量が一致することを検証する。
   */
  test('Property 22: インベントリのセーブ・ロード - セーブ後にロードすると元の状態が復元される', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            item: itemArbitrary,
            quantity: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (itemsToAdd) => {
          // 新しいインベントリマネージャーを作成
          const manager = new InventoryManager(itemDataLoader, 100);

          // アイテムを追加
          for (const { item, quantity } of itemsToAdd) {
            manager.addItem(item, quantity);
          }

          // セーブ前の状態を記録（アイテムIDごとの総数量）
          const beforeSave = new Map<string, number>();
          for (const slot of manager.getAllItems()) {
            if (!slot.isEmpty && slot.item) {
              const currentCount = beforeSave.get(slot.item.id) || 0;
              beforeSave.set(slot.item.id, currentCount + slot.quantity);
            }
          }

          // セーブ
          const saveSuccess = manager.saveToLocalStorage('test_inventory');
          expect(saveSuccess).toBe(true);

          // 新しいマネージャーを作成してロード
          const newManager = new InventoryManager(itemDataLoader, 100);
          const loadSuccess = newManager.loadFromLocalStorage('test_inventory');
          expect(loadSuccess).toBe(true);

          // ロード後の状態を検証（アイテムIDごとの総数量）
          const afterLoad = new Map<string, number>();
          for (const slot of newManager.getAllItems()) {
            if (!slot.isEmpty && slot.item) {
              const currentCount = afterLoad.get(slot.item.id) || 0;
              afterLoad.set(slot.item.id, currentCount + slot.quantity);
            }
          }

          // アイテム数が一致することを確認
          expect(afterLoad.size).toBe(beforeSave.size);

          // 各アイテムの総数量が一致することを確認
          for (const [itemId, count] of beforeSave.entries()) {
            expect(afterLoad.get(itemId)).toBe(count);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22補助: 空のインベントリのセーブ・ロード', () => {
    // 空のインベントリをセーブ
    const saveSuccess = inventoryManager.saveToLocalStorage('test_empty_inventory');
    expect(saveSuccess).toBe(true);

    // 新しいマネージャーを作成してロード
    const newManager = new InventoryManager(itemDataLoader, 100);
    const loadSuccess = newManager.loadFromLocalStorage('test_empty_inventory');
    expect(loadSuccess).toBe(true);

    // 空であることを確認
    expect(newManager.getInventoryData().usedSlots).toBe(0);
    expect(newManager.getAllItems().filter(slot => !slot.isEmpty)).toHaveLength(0);
  });

  test('Property 22補助: 満杯のインベントリのセーブ・ロード', () => {
    fc.assert(
      fc.property(
        fc.array(itemArbitrary, { minLength: 100, maxLength: 100 }),
        (items) => {
          const manager = new InventoryManager(itemDataLoader, 100);

          // 100個のアイテムを追加（満杯にする）
          let addedCount = 0;
          for (const item of items) {
            const result = manager.addItem(item, 1);
            if (result.success) {
              addedCount++;
            }
            if (addedCount >= 100) break;
          }

          // セーブ
          const saveSuccess = manager.saveToLocalStorage('test_full_inventory');
          expect(saveSuccess).toBe(true);

          // ロード
          const newManager = new InventoryManager(itemDataLoader, 100);
          const loadSuccess = newManager.loadFromLocalStorage('test_full_inventory');
          expect(loadSuccess).toBe(true);

          // 使用スロット数が一致することを確認
          expect(newManager.getInventoryData().usedSlots).toBe(manager.getInventoryData().usedSlots);

          return true;
        }
      ),
      { numRuns: 10 } // 満杯テストは時間がかかるので回数を減らす
    );
  });

  test('Property 22補助: セーブデータが存在しない場合のロード', () => {
    const newManager = new InventoryManager(itemDataLoader, 100);
    const loadSuccess = newManager.loadFromLocalStorage('non_existent_key');

    // ロードは失敗するが、エラーは発生しない
    expect(loadSuccess).toBe(false);

    // インベントリは空のまま
    expect(newManager.getInventoryData().usedSlots).toBe(0);
  });

  test('Property 22補助: 複数回のセーブ・ロードサイクル', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            item: itemArbitrary,
            quantity: fc.integer({ min: 1, max: 5 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (itemsToAdd) => {
          let manager = new InventoryManager(itemDataLoader, 100);

          // 3回のセーブ・ロードサイクルを実行
          for (let cycle = 0; cycle < 3; cycle++) {
            // アイテムを追加
            for (const { item, quantity } of itemsToAdd) {
              manager.addItem(item, quantity);
            }

            // セーブ
            const saveSuccess = manager.saveToLocalStorage('test_cycle_inventory');
            expect(saveSuccess).toBe(true);

            // 新しいマネージャーでロード
            const newManager = new InventoryManager(itemDataLoader, 100);
            const loadSuccess = newManager.loadFromLocalStorage('test_cycle_inventory');
            expect(loadSuccess).toBe(true);

            // 次のサイクルで使用
            manager = newManager;
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
