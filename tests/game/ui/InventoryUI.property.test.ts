/**
 * InventoryUI Property-Based Tests
 * 
 * プロパティ18: ドラッグ&ドロップによる並び替え
 * 検証要件: 6.6
 * 
 * Feature: inventory-equipment-system, Property 18: ドラッグ&ドロップによる並び替え
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { InventoryUI } from '../../../game/src/ui/InventoryUI';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import { Item, ItemType, ItemRarity } from '../../../game/src/types/inventory';

/**
 * モックシーンの作成
 */
function createMockScene() {
  const mockScene = {
    add: {
      container: vi.fn().mockReturnValue({
        setDepth: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        add: vi.fn(),
        removeAll: vi.fn(),
        destroy: vi.fn(),
      }),
      rectangle: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setStrokeStyle: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        setBackgroundColor: vi.fn().mockReturnThis(),
        on: vi.fn(),
        destroy: vi.fn(),
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        setBackgroundColor: vi.fn().mockReturnThis(),
        on: vi.fn(),
        height: 50,
        destroy: vi.fn(),
      }),
      image: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      }),
    },
    input: {
      keyboard: {
        on: vi.fn(),
      },
    },
  };

  return mockScene as any;
}

/**
 * テスト用のアイテム生成
 */
function createTestItem(id: string, name: string): Item {
  return {
    id,
    name,
    description: `Test item ${name}`,
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    iconPath: 'test-icon.png',
    maxStack: 99,
    sellPrice: 10,
    buyPrice: 20,
  };
}

describe('InventoryUI Property-Based Tests', () => {
  let mockScene: any;
  let inventoryUI: InventoryUI;
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  beforeEach(() => {
    mockScene = createMockScene();
    itemDataLoader = new ItemDataLoader(mockScene);
    inventoryManager = new InventoryManager(itemDataLoader);
    inventoryUI = new InventoryUI(mockScene, inventoryManager);
  });

  /**
   * プロパティ18: ドラッグ&ドロップによる並び替え
   * 
   * 任意の2つのインベントリスロット間でドラッグ&ドロップを実行すると、
   * アイテムの位置が正しく入れ替わる
   * 
   * 検証要件: 6.6
   */
  test('Property 18: ドラッグ&ドロップによる並び替え', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }), // fromSlot
        fc.integer({ min: 0, max: 99 }), // toSlot
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }), // アイテム数量
        (fromSlot, toSlot, quantities) => {
          // 異なるスロットのみテスト
          if (fromSlot === toSlot) {
            return true;
          }

          // インベントリをクリア
          inventoryManager.clear();

          // テストアイテムを追加
          const items: Item[] = [];
          for (let i = 0; i < quantities.length; i++) {
            const item = createTestItem(`item-${i}`, `Item ${i}`);
            items.push(item);
            inventoryManager.addItem(item, quantities[i]);
          }

          // 初期状態を記録（値をコピー）
          const beforeItems = inventoryManager.getAllItems();
          const fromItemBefore = {
            isEmpty: beforeItems[fromSlot].isEmpty,
            itemId: beforeItems[fromSlot].item?.id || null,
            quantity: beforeItems[fromSlot].quantity,
          };
          const toItemBefore = {
            isEmpty: beforeItems[toSlot].isEmpty,
            itemId: beforeItems[toSlot].item?.id || null,
            quantity: beforeItems[toSlot].quantity,
          };

          // ドラッグ&ドロップを実行
          inventoryUI.handleDragDrop(fromSlot, toSlot);

          // 結果を取得
          const afterItems = inventoryManager.getAllItems();
          const fromItemAfter = afterItems[fromSlot];
          const toItemAfter = afterItems[toSlot];

          // 検証: アイテムが入れ替わっている
          if (fromItemBefore.isEmpty && toItemBefore.isEmpty) {
            // 両方空の場合は変化なし
            expect(fromItemAfter.isEmpty).toBe(true);
            expect(toItemAfter.isEmpty).toBe(true);
          } else if (!fromItemBefore.isEmpty && toItemBefore.isEmpty) {
            // fromにアイテムがあり、toが空の場合は移動
            expect(toItemAfter.item?.id).toBe(fromItemBefore.itemId);
            expect(toItemAfter.quantity).toBe(fromItemBefore.quantity);
            expect(fromItemAfter.isEmpty).toBe(true);
          } else if (fromItemBefore.isEmpty && !toItemBefore.isEmpty) {
            // fromが空で、toにアイテムがある場合は移動
            expect(fromItemAfter.item?.id).toBe(toItemBefore.itemId);
            expect(fromItemAfter.quantity).toBe(toItemBefore.quantity);
            expect(toItemAfter.isEmpty).toBe(true);
          } else {
            // 両方にアイテムがある場合は入れ替え
            expect(fromItemAfter.item?.id).toBe(toItemBefore.itemId);
            expect(fromItemAfter.quantity).toBe(toItemBefore.quantity);
            expect(toItemAfter.item?.id).toBe(fromItemBefore.itemId);
            expect(toItemAfter.quantity).toBe(fromItemBefore.quantity);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 補助プロパティ: ドラッグ&ドロップ後のアイテム総数不変
   * 
   * ドラッグ&ドロップ操作後も、インベントリ内のアイテム総数は変わらない
   */
  test('補助プロパティ: ドラッグ&ドロップ後のアイテム総数不変', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
        (fromSlot, toSlot, quantities) => {
          if (fromSlot === toSlot) {
            return true;
          }

          inventoryManager.clear();

          // アイテムを追加
          for (let i = 0; i < quantities.length; i++) {
            const item = createTestItem(`item-${i}`, `Item ${i}`);
            inventoryManager.addItem(item, quantities[i]);
          }

          // 初期状態のアイテム総数を計算
          const beforeItems = inventoryManager.getAllItems();
          const totalBefore = beforeItems.reduce((sum, slot) => sum + slot.quantity, 0);

          // ドラッグ&ドロップを実行
          inventoryUI.handleDragDrop(fromSlot, toSlot);

          // 結果のアイテム総数を計算
          const afterItems = inventoryManager.getAllItems();
          const totalAfter = afterItems.reduce((sum, slot) => sum + slot.quantity, 0);

          // 検証: アイテム総数が変わらない
          expect(totalAfter).toBe(totalBefore);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 補助プロパティ: ドラッグ&ドロップの可逆性
   * 
   * ドラッグ&ドロップを2回実行すると元の状態に戻る
   */
  test('補助プロパティ: ドラッグ&ドロップの可逆性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
        (fromSlot, toSlot, quantities) => {
          if (fromSlot === toSlot) {
            return true;
          }

          inventoryManager.clear();

          // アイテムを追加
          for (let i = 0; i < quantities.length; i++) {
            const item = createTestItem(`item-${i}`, `Item ${i}`);
            inventoryManager.addItem(item, quantities[i]);
          }

          // 初期状態を記録
          const initialItems = inventoryManager.getAllItems();
          const initialState = initialItems.map(slot => ({
            itemId: slot.item?.id || null,
            quantity: slot.quantity,
            isEmpty: slot.isEmpty,
          }));

          // ドラッグ&ドロップを2回実行
          inventoryUI.handleDragDrop(fromSlot, toSlot);
          inventoryUI.handleDragDrop(toSlot, fromSlot);

          // 結果を取得
          const finalItems = inventoryManager.getAllItems();
          const finalState = finalItems.map(slot => ({
            itemId: slot.item?.id || null,
            quantity: slot.quantity,
            isEmpty: slot.isEmpty,
          }));

          // 検証: 元の状態に戻っている
          expect(finalState).toEqual(initialState);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
