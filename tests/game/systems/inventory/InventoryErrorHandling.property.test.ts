/**
 * インベントリ・装備システムのエラーハンドリング プロパティベーステスト
 * 
 * Feature: inventory-equipment-system
 * 
 * このテストは以下のプロパティを検証します：
 * - プロパティ24: 不正操作の拒否（要件10.2）
 * - プロパティ25: 装備失敗時の状態保持（要件10.3）
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { InventoryManager } from '../../../../game/src/systems/InventoryManager';
import { EquipmentManager } from '../../../../game/src/systems/EquipmentManager';
import { ItemEffectSystem, Character } from '../../../../game/src/systems/ItemEffectSystem';
import { ItemDataLoader } from '../../../../game/src/systems/ItemDataLoader';
import { InventoryErrorHandler } from '../../../../game/src/systems/inventory/InventoryErrorHandler';
import {
  Item,
  Equipment,
  ItemType,
  ItemRarity,
  EquipmentSlotType,
  InventoryData,
  EquipmentSet,
} from '../../../../game/src/types/inventory';

describe('インベントリ・装備システム エラーハンドリング プロパティテスト', () => {
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let itemDataLoader: ItemDataLoader;
  let errorHandler: InventoryErrorHandler;

  beforeEach(() => {
    errorHandler = new InventoryErrorHandler();
    itemDataLoader = new ItemDataLoader();
    itemEffectSystem = new ItemEffectSystem(errorHandler);
    inventoryManager = new InventoryManager(itemDataLoader, 100, errorHandler);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager, errorHandler);
  });

  /**
   * プロパティ24: 不正操作の拒否
   * 
   * *任意の*不正なアイテム操作（存在しないアイテムの使用、無効なスロットへのアクセス等）は
   * 拒否され、システムの状態は変更されない
   * 
   * **検証要件: 10.2**
   */
  describe('プロパティ24: 不正操作の拒否', () => {
    test('存在しないアイテムの使用は拒否され、インベントリの状態は変更されない', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // 存在しないアイテムID
          (nonExistentItemId) => {
            // 初期状態を記録
            const initialData = inventoryManager.getInventoryData();
            const initialUsedSlots = initialData.usedSlots;
            const initialGold = initialData.gold;

            // 存在しないアイテムを使用しようとする
            const result = inventoryManager.useItem(nonExistentItemId);

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);
            expect(result.itemConsumed).toBe(false);

            // インベントリの状態が変更されていないことを確認
            const finalData = inventoryManager.getInventoryData();
            expect(finalData.usedSlots).toBe(initialUsedSlots);
            expect(finalData.gold).toBe(initialGold);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('無効な数量でのアイテム追加は拒否され、インベントリの状態は変更されない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 0 }), // 無効な数量（0以下）
          (invalidQuantity) => {
            // テスト用アイテムを作成
            const testItem: Item = {
              id: 'test_item',
              name: 'テストアイテム',
              description: 'テスト用',
              type: ItemType.MATERIAL,
              rarity: ItemRarity.COMMON,
              iconPath: 'test.png',
              maxStack: 99,
              sellPrice: 10,
              buyPrice: 20,
            };

            // 初期状態を記録
            const initialData = inventoryManager.getInventoryData();
            const initialUsedSlots = initialData.usedSlots;

            // 無効な数量でアイテムを追加しようとする
            const result = inventoryManager.addItem(testItem, invalidQuantity);

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);

            // インベントリの状態が変更されていないことを確認
            const finalData = inventoryManager.getInventoryData();
            expect(finalData.usedSlots).toBe(initialUsedSlots);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('無効な数量でのアイテム削除は拒否され、インベントリの状態は変更されない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 0 }), // 無効な数量（0以下）
          (invalidQuantity) => {
            // テスト用アイテムを追加
            const testItem: Item = {
              id: 'test_item_remove',
              name: 'テストアイテム',
              description: 'テスト用',
              type: ItemType.MATERIAL,
              rarity: ItemRarity.COMMON,
              iconPath: 'test.png',
              maxStack: 99,
              sellPrice: 10,
              buyPrice: 20,
            };

            inventoryManager.addItem(testItem, 10);

            // 初期状態を記録
            const initialCount = inventoryManager.getItemCount(testItem.id);

            // 無効な数量でアイテムを削除しようとする
            const result = inventoryManager.removeItem(testItem.id, invalidQuantity);

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);

            // アイテム数が変更されていないことを確認
            const finalCount = inventoryManager.getItemCount(testItem.id);
            expect(finalCount).toBe(initialCount);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('存在しないアイテムの削除は拒否され、インベントリの状態は変更されない', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // 存在しないアイテムID
          fc.integer({ min: 1, max: 10 }), // 削除数量
          (nonExistentItemId, quantity) => {
            // 初期状態を記録
            const initialData = inventoryManager.getInventoryData();
            const initialUsedSlots = initialData.usedSlots;

            // 存在しないアイテムを削除しようとする
            const result = inventoryManager.removeItem(nonExistentItemId, quantity);

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);

            // インベントリの状態が変更されていないことを確認
            const finalData = inventoryManager.getInventoryData();
            expect(finalData.usedSlots).toBe(initialUsedSlots);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ25: 装備失敗時の状態保持
   * 
   * *任意の*装備装着の失敗時、キャラクターの装備状態とインベントリの状態は変更されない
   * 
   * **検証要件: 10.3**
   */
  describe('プロパティ25: 装備失敗時の状態保持', () => {
    test('装備条件を満たさない装備の装着は拒否され、装備状態とインベントリは変更されない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // キャラクターレベル
          fc.integer({ min: 11, max: 50 }), // 装備の必要レベル（キャラクターレベルより高い）
          (characterLevel, requiredLevel) => {
            // テスト用キャラクターを作成
            const character: Character = {
              id: 'test_character',
              name: 'テストキャラクター',
              level: characterLevel,
              currentHP: 100,
              maxHP: 100,
              currentMP: 50,
              maxMP: 50,
              stats: {
                attack: 10,
                defense: 10,
                speed: 10,
                accuracy: 10,
                evasion: 10,
              },
              statusEffects: [],
            };

            // テスト用装備を作成（レベル条件を満たさない）
            const equipment: Equipment = {
              id: 'test_equipment',
              name: 'テスト装備',
              description: 'テスト用',
              type: ItemType.WEAPON,
              rarity: ItemRarity.COMMON,
              iconPath: 'test.png',
              maxStack: 1,
              sellPrice: 100,
              buyPrice: 200,
              slot: EquipmentSlotType.WEAPON,
              stats: {
                attack: 20,
              },
              requirements: {
                level: requiredLevel,
              },
              durability: 100,
              maxDurability: 100,
              effects: [],
            };

            // 装備をインベントリに追加
            inventoryManager.addItem(equipment, 1);

            // 初期状態を記録
            const initialEquipmentSet = equipmentManager.getAllEquipment(character.id);
            const initialInventoryCount = inventoryManager.getItemCount(equipment.id);
            const initialCharacterStats = { ...character.stats };

            // 装備を装着しようとする
            const result = equipmentManager.equipItem(
              character.id,
              equipment,
              EquipmentSlotType.WEAPON,
              character
            );

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);

            // 装備状態が変更されていないことを確認
            const finalEquipmentSet = equipmentManager.getAllEquipment(character.id);
            expect(finalEquipmentSet.weapon).toEqual(initialEquipmentSet.weapon);

            // インベントリの状態が変更されていないことを確認
            const finalInventoryCount = inventoryManager.getItemCount(equipment.id);
            expect(finalInventoryCount).toBe(initialInventoryCount);

            // キャラクターの能力値が変更されていないことを確認
            expect(character.stats).toEqual(initialCharacterStats);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('無効な装備データでの装着は拒否され、装備状態とインベントリは変更されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(EquipmentSlotType.WEAPON, EquipmentSlotType.ARMOR), // 装備スロット
          fc.constantFrom(EquipmentSlotType.ARMOR, EquipmentSlotType.ACCESSORY1), // 異なるスロット
          (targetSlot, wrongSlot) => {
            // スロットが異なることを確認
            fc.pre(targetSlot !== wrongSlot);

            // テスト用キャラクターを作成
            const character: Character = {
              id: 'test_character_2',
              name: 'テストキャラクター2',
              level: 10,
              currentHP: 100,
              maxHP: 100,
              currentMP: 50,
              maxMP: 50,
              stats: {
                attack: 10,
                defense: 10,
                speed: 10,
                accuracy: 10,
                evasion: 10,
              },
              statusEffects: [],
            };

            // テスト用装備を作成（スロットが一致しない）
            const equipment: Equipment = {
              id: 'test_equipment_wrong_slot',
              name: 'テスト装備',
              description: 'テスト用',
              type: ItemType.WEAPON,
              rarity: ItemRarity.COMMON,
              iconPath: 'test.png',
              maxStack: 1,
              sellPrice: 100,
              buyPrice: 200,
              slot: wrongSlot, // 異なるスロット
              stats: {
                attack: 20,
              },
              requirements: {},
              durability: 100,
              maxDurability: 100,
              effects: [],
            };

            // 装備をインベントリに追加
            inventoryManager.addItem(equipment, 1);

            // 初期状態を記録
            const initialEquipmentSet = equipmentManager.getAllEquipment(character.id);
            const initialInventoryCount = inventoryManager.getItemCount(equipment.id);

            // 間違ったスロットに装備を装着しようとする
            const result = equipmentManager.equipItem(
              character.id,
              equipment,
              targetSlot,
              character
            );

            // 操作が拒否されることを確認
            expect(result.success).toBe(false);

            // 装備状態が変更されていないことを確認
            const finalEquipmentSet = equipmentManager.getAllEquipment(character.id);
            expect(finalEquipmentSet).toEqual(initialEquipmentSet);

            // インベントリの状態が変更されていないことを確認
            const finalInventoryCount = inventoryManager.getItemCount(equipment.id);
            expect(finalInventoryCount).toBe(initialInventoryCount);

            // エラーログが記録されていることを確認
            const errorLog = errorHandler.getErrorLog();
            expect(errorLog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
