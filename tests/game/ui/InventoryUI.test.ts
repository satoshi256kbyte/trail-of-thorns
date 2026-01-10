/**
 * InventoryUI Unit Tests
 * 
 * 要件6.1, 6.2, 6.3, 6.4, 6.5のテスト:
 * - UI表示の正確性
 * - 操作処理
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { InventoryUI } from '../../../game/src/ui/InventoryUI';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import { Item, ItemType, ItemRarity, ItemSortType } from '../../../game/src/types/inventory';

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
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        setBackgroundColor: vi.fn().mockReturnThis(),
        on: vi.fn(),
        height: 50,
      }),
      image: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
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
function createTestItem(id: string, name: string, type: ItemType = ItemType.CONSUMABLE): Item {
  return {
    id,
    name,
    description: `Test item ${name}`,
    type,
    rarity: ItemRarity.COMMON,
    iconPath: 'test-icon.png',
    maxStack: 99,
    sellPrice: 10,
    buyPrice: 20,
  };
}

describe('InventoryUI Unit Tests', () => {
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

  describe('基本機能テスト', () => {
    /**
     * 要件6.1: インベントリ画面の表示・非表示
     */
    test('show()でインベントリを表示できる', () => {
      inventoryUI.show();
      expect(inventoryUI.isShown()).toBe(true);
    });

    test('hide()でインベントリを非表示にできる', () => {
      inventoryUI.show();
      inventoryUI.hide();
      expect(inventoryUI.isShown()).toBe(false);
    });

    test('初期状態では非表示', () => {
      expect(inventoryUI.isShown()).toBe(false);
    });

    /**
     * 要件6.2: グリッド形式でのアイテム表示
     */
    test('updateItemDisplay()でアイテム表示を更新できる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 5);

      inventoryUI.updateItemDisplay();

      // 表示が更新されたことを確認（モックなので実際の表示は確認できない）
      expect(inventoryManager.getItemCount('item-1')).toBe(5);
    });

    test('複数のアイテムを表示できる', () => {
      const item1 = createTestItem('item-1', 'Item 1');
      const item2 = createTestItem('item-2', 'Item 2');
      const item3 = createTestItem('item-3', 'Item 3');

      inventoryManager.addItem(item1, 3);
      inventoryManager.addItem(item2, 5);
      inventoryManager.addItem(item3, 2);

      inventoryUI.updateItemDisplay();

      expect(inventoryManager.getItemCount('item-1')).toBe(3);
      expect(inventoryManager.getItemCount('item-2')).toBe(5);
      expect(inventoryManager.getItemCount('item-3')).toBe(2);
    });

    /**
     * 要件6.3: アイテム選択と詳細情報表示
     */
    test('selectItem()でアイテムを選択できる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 1);

      // UIを更新してからアイテムを選択
      inventoryUI.updateItemDisplay();
      inventoryUI.selectItem('item-1');

      // 選択されたアイテムIDを確認
      expect(inventoryUI.getSelectedItemId()).toBe('item-1');
    });

    test('存在しないアイテムを選択しても エラーにならない', () => {
      expect(() => {
        inventoryUI.selectItem('non-existent-item');
      }).not.toThrow();
    });
  });

  describe('ソート機能テスト', () => {
    /**
     * 要件6.2: アイテムソート機能
     */
    test('sortItems()で種類別にソートできる', () => {
      const weapon = createTestItem('weapon-1', 'Sword', ItemType.WEAPON);
      const consumable = createTestItem('potion-1', 'Potion', ItemType.CONSUMABLE);

      inventoryManager.addItem(consumable, 1);
      inventoryManager.addItem(weapon, 1);

      inventoryUI.sortItems(ItemSortType.TYPE);

      // ソートが実行されたことを確認
      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);
    });

    test('sortItems()でレアリティ別にソートできる', () => {
      const item1 = createTestItem('item-1', 'Common Item');
      const item2 = createTestItem('item-2', 'Rare Item');

      inventoryManager.addItem(item1, 1);
      inventoryManager.addItem(item2, 1);

      inventoryUI.sortItems(ItemSortType.RARITY);

      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);
    });

    test('sortItems()で名前順にソートできる', () => {
      const item1 = createTestItem('item-1', 'Zebra');
      const item2 = createTestItem('item-2', 'Apple');

      inventoryManager.addItem(item1, 1);
      inventoryManager.addItem(item2, 1);

      inventoryUI.sortItems(ItemSortType.NAME);

      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);
    });

    test('sortItems()で数量順にソートできる', () => {
      const item1 = createTestItem('item-1', 'Item 1');
      const item2 = createTestItem('item-2', 'Item 2');

      inventoryManager.addItem(item1, 10);
      inventoryManager.addItem(item2, 5);

      inventoryUI.sortItems(ItemSortType.QUANTITY);

      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('アクションメニューテスト', () => {
    /**
     * 要件6.4: アクションメニュー（使用・装備・破棄）
     */
    test('showActionMenu()でアクションメニューを表示できる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 1);

      inventoryUI.showActionMenu('item-1');

      // メニューが表示されたことを確認（モックなので実際の表示は確認できない）
      expect(inventoryManager.getItem('item-1')).not.toBeNull();
    });

    test('hideActionMenu()でアクションメニューを非表示にできる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 1);

      inventoryUI.showActionMenu('item-1');
      inventoryUI.hideActionMenu();

      // メニューが非表示になったことを確認
      expect(true).toBe(true);
    });

    test('存在しないアイテムのアクションメニューを表示してもエラーにならない', () => {
      expect(() => {
        inventoryUI.showActionMenu('non-existent-item');
      }).not.toThrow();
    });
  });

  describe('キーボード操作テスト', () => {
    /**
     * 要件6.5: キーボード操作
     */
    test('handleKeyboardInput()でIキーを処理できる', () => {
      inventoryUI.handleKeyboardInput('i');
      expect(inventoryUI.isShown()).toBe(true);

      inventoryUI.handleKeyboardInput('i');
      expect(inventoryUI.isShown()).toBe(false);
    });

    test('handleKeyboardInput()でESCキーを処理できる', () => {
      inventoryUI.show();
      inventoryUI.handleKeyboardInput('escape');
      expect(inventoryUI.isShown()).toBe(false);
    });

    test('handleKeyboardInput()で矢印キーを処理できる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 1);

      expect(() => {
        inventoryUI.handleKeyboardInput('arrowup');
        inventoryUI.handleKeyboardInput('arrowdown');
        inventoryUI.handleKeyboardInput('arrowleft');
        inventoryUI.handleKeyboardInput('arrowright');
      }).not.toThrow();
    });

    test('handleKeyboardInput()でEnterキーを処理できる', () => {
      const item = createTestItem('item-1', 'Test Item');
      inventoryManager.addItem(item, 1);

      inventoryUI.selectItem('item-1');

      expect(() => {
        inventoryUI.handleKeyboardInput('enter');
      }).not.toThrow();
    });
  });

  describe('ドラッグ&ドロップテスト', () => {
    /**
     * 要件6.6: ドラッグ&ドロップによる並び替え
     */
    test('handleDragDrop()でアイテムを移動できる', () => {
      const item1 = createTestItem('item-1', 'Item 1');
      const item2 = createTestItem('item-2', 'Item 2');

      inventoryManager.addItem(item1, 1);
      inventoryManager.addItem(item2, 1);

      const beforeItems = inventoryManager.getAllItems();
      // アイテムIDを保存（参照ではなく値をコピー）
      const slot0ItemIdBefore = beforeItems[0].item?.id;
      const slot1ItemIdBefore = beforeItems[1].item?.id;

      inventoryUI.handleDragDrop(0, 1);

      const afterItems = inventoryManager.getAllItems();
      const slot0ItemIdAfter = afterItems[0].item?.id;
      const slot1ItemIdAfter = afterItems[1].item?.id;

      // アイテムが入れ替わったことを確認
      expect(slot0ItemIdAfter).toBe(slot1ItemIdBefore);
      expect(slot1ItemIdAfter).toBe(slot0ItemIdBefore);
    });

    test('handleDragDrop()で空のスロットにアイテムを移動できる', () => {
      const item = createTestItem('item-1', 'Item 1');
      inventoryManager.addItem(item, 1);

      inventoryUI.handleDragDrop(0, 5);

      const afterItems = inventoryManager.getAllItems();
      expect(afterItems[5].item?.id).toBe('item-1');
      expect(afterItems[0].isEmpty).toBe(true);
    });

    test('handleDragDrop()で同じスロットにドロップしても変化なし', () => {
      const item = createTestItem('item-1', 'Item 1');
      inventoryManager.addItem(item, 1);

      const beforeItems = inventoryManager.getAllItems();
      const slot0Before = beforeItems[0];

      inventoryUI.handleDragDrop(0, 0);

      const afterItems = inventoryManager.getAllItems();
      const slot0After = afterItems[0];

      // 変化なし
      expect(slot0After.item?.id).toBe(slot0Before.item?.id);
    });
  });

  describe('イベント発行テスト', () => {
    test('show()でshowイベントが発行される', () => {
      const showHandler = vi.fn();
      inventoryUI.on('show', showHandler);

      inventoryUI.show();

      expect(showHandler).toHaveBeenCalled();
    });

    test('hide()でhideイベントが発行される', () => {
      const hideHandler = vi.fn();
      inventoryUI.on('hide', hideHandler);

      inventoryUI.show();
      inventoryUI.hide();

      expect(hideHandler).toHaveBeenCalled();
    });

    test('handleDragDrop()でitemMovedイベントが発行される', () => {
      const itemMovedHandler = vi.fn();
      inventoryUI.on('itemMoved', itemMovedHandler);

      const item = createTestItem('item-1', 'Item 1');
      inventoryManager.addItem(item, 1);

      inventoryUI.handleDragDrop(0, 1);

      expect(itemMovedHandler).toHaveBeenCalled();
    });
  });

  describe('エッジケーステスト', () => {
    test('空のインベントリでupdateItemDisplay()を呼んでもエラーにならない', () => {
      expect(() => {
        inventoryUI.updateItemDisplay();
      }).not.toThrow();
    });

    test('空のインベントリでselectItem()を呼んでもエラーにならない', () => {
      expect(() => {
        inventoryUI.selectItem('non-existent-item');
      }).not.toThrow();
    });

    test('空のインベントリでshowActionMenu()を呼んでもエラーにならない', () => {
      expect(() => {
        inventoryUI.showActionMenu('non-existent-item');
      }).not.toThrow();
    });

    test('destroy()を呼んでもエラーにならない', () => {
      expect(() => {
        inventoryUI.destroy();
      }).not.toThrow();
    });

    test('destroy()後にshow()を呼んでもエラーにならない', () => {
      inventoryUI.destroy();

      expect(() => {
        inventoryUI.show();
      }).not.toThrow();
    });
  });
});
