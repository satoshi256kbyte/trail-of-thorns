/**
 * ItemValidator Property-Based Tests
 * 
 * Feature: inventory-equipment-system, Property 17: データスキーマ検証
 * 検証要件: 5.2
 * 
 * プロパティ17: 任意の不正なアイテムデータは、スキーマ検証によって拒否される
 */

import { describe, test, expect } from 'vitest';
import { ItemValidator } from '../../../game/src/systems/ItemValidator';
import { ItemType, ItemRarity, EquipmentSlotType, ConsumableType, TargetType } from '../../../game/src/types/inventory';

/**
 * ランダムな文字列を生成
 */
function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ランダムな数値を生成
 */
function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ランダムなブール値を生成
 */
function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

/**
 * カウンターで一意なIDを生成
 */
let itemIdCounter = 0;

/**
 * 有効なアイテムデータを生成
 */
function generateValidItem(): any {
  itemIdCounter++;
  return {
    id: `item-${Date.now()}-${itemIdCounter}-${randomString(8)}`,
    name: `Test Item ${randomString(5)}`,
    description: `Description for ${randomString(10)}`,
    type: Object.values(ItemType)[randomNumber(0, Object.values(ItemType).length - 1)],
    rarity: Object.values(ItemRarity)[randomNumber(0, Object.values(ItemRarity).length - 1)],
    iconPath: `assets/items/${randomString(8)}.png`,
    maxStack: randomNumber(1, 99),
    sellPrice: randomNumber(0, 1000),
    buyPrice: randomNumber(0, 2000),
  };
}

/**
 * 有効な装備データを生成
 */
function generateValidEquipment(): any {
  const equipmentTypes = [ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY];
  const type = equipmentTypes[randomNumber(0, equipmentTypes.length - 1)];
  
  return {
    ...generateValidItem(),
    type,
    slot: Object.values(EquipmentSlotType)[randomNumber(0, Object.values(EquipmentSlotType).length - 1)],
    stats: {
      hp: randomNumber(0, 100),
      mp: randomNumber(0, 50),
      attack: randomNumber(0, 50),
      defense: randomNumber(0, 50),
      speed: randomNumber(0, 20),
      accuracy: randomNumber(0, 100),
      evasion: randomNumber(0, 100),
    },
    requirements: {
      level: randomNumber(1, 50),
      job: randomBoolean() ? `job-${randomString(5)}` : undefined,
    },
    durability: randomNumber(50, 100),
    maxDurability: 100,
    effects: [],
  };
}

/**
 * 有効な消耗品データを生成
 */
function generateValidConsumable(): any {
  return {
    ...generateValidItem(),
    type: ItemType.CONSUMABLE,
    consumableType: Object.values(ConsumableType)[randomNumber(0, Object.values(ConsumableType).length - 1)],
    effects: [],
    usableInBattle: randomBoolean(),
    targetType: Object.values(TargetType)[randomNumber(0, Object.values(TargetType).length - 1)],
  };
}

/**
 * 不正なアイテムデータを生成（必須フィールド欠落）
 */
function generateInvalidItemMissingFields(): any {
  itemIdCounter++;
  const baseItem = generateValidItem();
  const invalidCases = [
    { ...baseItem, id: undefined },
    { ...baseItem, id: '' },
    { ...baseItem, id: 123 },
    { ...baseItem, name: undefined },
    { ...baseItem, name: '' },
    { ...baseItem, name: 123 },
    { ...baseItem, type: 'invalid-type' },
    { ...baseItem, type: undefined },
  ];
  
  return invalidCases[randomNumber(0, invalidCases.length - 1)];
}

/**
 * 不正なアイテムデータを生成（無効な数値）
 */
function generateInvalidItemInvalidNumbers(): any {
  const invalidCases = [
    { ...generateValidItem(), maxStack: 0 },
    { ...generateValidItem(), maxStack: -1 },
    { ...generateValidItem(), maxStack: 'not-a-number' },
    { ...generateValidItem(), sellPrice: -1 },
    { ...generateValidItem(), sellPrice: 'not-a-number' },
    { ...generateValidItem(), buyPrice: -1 },
    { ...generateValidItem(), buyPrice: 'not-a-number' },
  ];
  
  return invalidCases[randomNumber(0, invalidCases.length - 1)];
}

/**
 * 不正な装備データを生成
 */
function generateInvalidEquipment(): any {
  const invalidCases = [
    { ...generateValidEquipment(), slot: 'invalid-slot' },
    { ...generateValidEquipment(), slot: undefined },
    { ...generateValidEquipment(), stats: 'not-an-object' },
    { ...generateValidEquipment(), stats: undefined },
    { ...generateValidEquipment(), requirements: 'not-an-object' },
    { ...generateValidEquipment(), durability: -1 },
    { ...generateValidEquipment(), maxDurability: 0 },
    { ...generateValidEquipment(), maxDurability: -1 },
    { ...generateValidEquipment(), durability: 150, maxDurability: 100 },
    { ...generateValidEquipment(), effects: 'not-an-array' },
  ];
  
  return invalidCases[randomNumber(0, invalidCases.length - 1)];
}

/**
 * 不正な消耗品データを生成
 */
function generateInvalidConsumable(): any {
  itemIdCounter++;
  const baseConsumable = generateValidConsumable();
  const invalidCases = [
    { ...baseConsumable, consumableType: 'invalid-type' },
    { ...baseConsumable, consumableType: undefined },
    { ...baseConsumable, targetType: 'invalid-type' },
    { ...baseConsumable, targetType: undefined },
    { ...baseConsumable, effects: 'not-an-array' },
  ];
  
  return invalidCases[randomNumber(0, invalidCases.length - 1)];
}

describe('ItemValidator Property-Based Tests', () => {
  describe('Property 17: データスキーマ検証 - 有効なデータの受け入れ', () => {
    test('任意の有効なアイテムデータは検証を通過する', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const validItem = generateValidItem();
        const result = ItemValidator.validateItem(validItem);
        
        // 有効なデータはエラーなしで検証を通過する
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    test('任意の有効な装備データは検証を通過する', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const validEquipment = generateValidEquipment();
        const result = ItemValidator.validateEquipment(validEquipment);
        
        // 有効なデータはエラーなしで検証を通過する
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    test('任意の有効な消耗品データは検証を通過する', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const validConsumable = generateValidConsumable();
        const result = ItemValidator.validateConsumable(validConsumable);
        
        // 有効なデータはエラーなしで検証を通過する
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  describe('Property 17: データスキーマ検証 - 不正なデータの拒否', () => {
    test('任意の必須フィールドが欠落したアイテムデータは検証で拒否される', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const invalidItem = generateInvalidItemMissingFields();
        const result = ItemValidator.validateItem(invalidItem);
        
        // 不正なデータは検証で拒否される（エラーが存在する）
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('任意の無効な数値を持つアイテムデータは検証で警告またはエラーが発生する', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const invalidItem = generateInvalidItemInvalidNumbers();
        const result = ItemValidator.validateItem(invalidItem);
        
        // 不正なデータは警告またはエラーが発生する
        const totalIssues = result.errors.length + result.warnings.length;
        expect(totalIssues).toBeGreaterThan(0);
      }
    });

    test('任意の不正な装備データは検証で拒否される', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const invalidEquipment = generateInvalidEquipment();
        const result = ItemValidator.validateEquipment(invalidEquipment);
        
        // 不正なデータは検証で拒否される（エラーまたは警告が存在する）
        const totalIssues = result.errors.length + result.warnings.length;
        expect(totalIssues).toBeGreaterThan(0);
      }
    });

    test('任意の不正な消耗品データは検証で拒否される', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const invalidConsumable = generateInvalidConsumable();
        const result = ItemValidator.validateConsumable(invalidConsumable);
        
        // 不正なデータは検証で拒否される（エラーが存在する）
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Property 17: データスキーマ検証 - デフォルト値の適用', () => {
    test('任意の警告を持つデータにデフォルト値を適用すると有効なデータになる', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const itemWithWarnings = generateInvalidItemInvalidNumbers();
        const validationResult = ItemValidator.validateItem(itemWithWarnings);
        
        // デフォルト値を適用
        const correctedItem = ItemValidator.applyDefaults(itemWithWarnings, validationResult);
        
        // 修正後のデータを再検証
        const revalidationResult = ItemValidator.validateItem(correctedItem);
        
        // デフォルト値適用後は警告が減少または解消される
        expect(revalidationResult.warnings.length).toBeLessThanOrEqual(validationResult.warnings.length);
        
        // 数値フィールドが有効な値になっている
        if (correctedItem.maxStack !== undefined) {
          expect(correctedItem.maxStack).toBeGreaterThan(0);
        }
        if (correctedItem.sellPrice !== undefined) {
          expect(correctedItem.sellPrice).toBeGreaterThanOrEqual(0);
        }
        if (correctedItem.buyPrice !== undefined) {
          expect(correctedItem.buyPrice).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('任意の装備データにデフォルト値を適用すると必須フィールドが補完される', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const equipment = generateValidEquipment();
        // 一部のフィールドを削除
        delete equipment.stats;
        delete equipment.requirements;
        
        const validationResult = ItemValidator.validateEquipment(equipment);
        const correctedEquipment = ItemValidator.applyDefaults(equipment, validationResult);
        
        // デフォルト値が適用されている
        expect(correctedEquipment.stats).toBeDefined();
        expect(typeof correctedEquipment.stats).toBe('object');
        expect(correctedEquipment.requirements).toBeDefined();
        expect(typeof correctedEquipment.requirements).toBe('object');
      }
    });
  });

  describe('Property 17: データスキーマ検証 - バッチ検証', () => {
    test('任意のアイテムデータの配列をバッチ検証すると各アイテムの結果が返される', () => {
      // 100回の反復テスト
      for (let i = 0; i < 100; i++) {
        const itemCount = randomNumber(5, 20);
        const items: any[] = [];
        const usedIds = new Set<string>();
        
        // ランダムなアイテムデータを生成（有効・無効混在、ID重複なし）
        for (let j = 0; j < itemCount; j++) {
          let item: any;
          let attempts = 0;
          
          // ID重複を避けるため、最大10回試行
          do {
            if (randomBoolean()) {
              item = generateValidItem();
            } else {
              item = generateInvalidItemMissingFields();
            }
            attempts++;
          } while (usedIds.has(item.id) && attempts < 10);
          
          // それでも重複する場合は強制的にユニークなIDを付与
          if (usedIds.has(item.id)) {
            item.id = `unique-${Date.now()}-${j}-${randomString(8)}`;
          }
          
          usedIds.add(item.id);
          items.push(item);
        }
        
        const results = ItemValidator.validateBatch(items);
        
        // 全てのアイテムに対して結果が返される
        expect(results.size).toBe(itemCount);
        
        // 各結果が有効なValidationResult構造を持つ
        results.forEach((result, itemId) => {
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('warnings');
          expect(Array.isArray(result.errors)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);
        });
      }
    });
  });
});
