/**
 * EquipmentManager ユニットテスト
 * 
 * Feature: inventory-equipment-system
 * 
 * このテストファイルは、EquipmentManagerの装備スロット管理と
 * エラーハンドリングを検証します。
 * 
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { ItemEffectSystem, Character } from '../../../game/src/systems/ItemEffectSystem';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import {
  Equipment,
  EquipmentSlotType,
  ItemType,
  ItemRarity,
} from '../../../game/src/types/inventory';

describe('EquipmentManager ユニットテスト', () => {
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  // テスト用のキャラクター
  const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
    id: 'test_char',
    name: 'Test Character',
    level: 10,
    maxHP: 100,
    currentHP: 100,
    maxMP: 50,
    currentMP: 50,
    stats: {
      attack: 20,
      defense: 15,
      speed: 10,
      accuracy: 80,
      evasion: 10,
    },
    ...overrides,
  });

  // テスト用の装備
  const createTestEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
    id: 'test_weapon',
    name: 'Test Weapon',
    description: 'A test weapon',
    type: ItemType.WEAPON,
    rarity: ItemRarity.COMMON,
    iconPath: 'assets/items/weapons/test.png',
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
    slot: EquipmentSlotType.WEAPON,
    stats: {
      attack: 10,
    },
    requirements: {
      level: 5,
    },
    durability: 100,
    maxDurability: 100,
    effects: [],
    ...overrides,
  });

  beforeEach(() => {
    itemDataLoader = new ItemDataLoader();
    itemEffectSystem = new ItemEffectSystem();
    inventoryManager = new InventoryManager(itemDataLoader, 100);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);
  });

  describe('装備スロット管理', () => {
    test('キャラクターの装備データを初期化できる', () => {
      // 要件: 2.1, 2.2, 2.3
      const characterId = 'char_1';

      equipmentManager.initializeCharacterEquipment(characterId);

      const equipmentSet = equipmentManager.getAllEquipment(characterId);

      expect(equipmentSet).toBeDefined();
      expect(equipmentSet.weapon).toBeNull();
      expect(equipmentSet.armor).toBeNull();
      expect(equipmentSet.accessory1).toBeNull();
      expect(equipmentSet.accessory2).toBeNull();
    });

    test('武器スロットに装備を装着できる', () => {
      // 要件: 2.1
      const character = createTestCharacter();
      const weapon = createTestEquipment();

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);

      const result = equipmentManager.equipItem(
        character.id,
        weapon,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(result.success).toBe(true);
      expect(result.newEquipment).toEqual(weapon);

      const equippedWeapon = equipmentManager.getEquipment(character.id, EquipmentSlotType.WEAPON);
      expect(equippedWeapon).toEqual(weapon);
    });

    test('防具スロットに装備を装着できる', () => {
      // 要件: 2.2
      const character = createTestCharacter();
      const armor = createTestEquipment({
        id: 'test_armor',
        name: 'Test Armor',
        type: ItemType.ARMOR,
        slot: EquipmentSlotType.ARMOR,
        stats: { defense: 10 },
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(armor, 1);

      const result = equipmentManager.equipItem(
        character.id,
        armor,
        EquipmentSlotType.ARMOR,
        character
      );

      expect(result.success).toBe(true);
      expect(result.newEquipment).toEqual(armor);

      const equippedArmor = equipmentManager.getEquipment(character.id, EquipmentSlotType.ARMOR);
      expect(equippedArmor).toEqual(armor);
    });

    test('アクセサリスロット1に装備を装着できる', () => {
      // 要件: 2.3
      const character = createTestCharacter();
      const accessory = createTestEquipment({
        id: 'test_accessory1',
        name: 'Test Accessory 1',
        type: ItemType.ACCESSORY,
        slot: EquipmentSlotType.ACCESSORY1,
        stats: { speed: 5 },
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(accessory, 1);

      const result = equipmentManager.equipItem(
        character.id,
        accessory,
        EquipmentSlotType.ACCESSORY1,
        character
      );

      expect(result.success).toBe(true);
      expect(result.newEquipment).toEqual(accessory);

      const equippedAccessory = equipmentManager.getEquipment(
        character.id,
        EquipmentSlotType.ACCESSORY1
      );
      expect(equippedAccessory).toEqual(accessory);
    });

    test('アクセサリスロット2に装備を装着できる', () => {
      // 要件: 2.3
      const character = createTestCharacter();
      const accessory = createTestEquipment({
        id: 'test_accessory2',
        name: 'Test Accessory 2',
        type: ItemType.ACCESSORY,
        slot: EquipmentSlotType.ACCESSORY2,
        stats: { evasion: 5 },
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(accessory, 1);

      const result = equipmentManager.equipItem(
        character.id,
        accessory,
        EquipmentSlotType.ACCESSORY2,
        character
      );

      expect(result.success).toBe(true);
      expect(result.newEquipment).toEqual(accessory);

      const equippedAccessory = equipmentManager.getEquipment(
        character.id,
        EquipmentSlotType.ACCESSORY2
      );
      expect(equippedAccessory).toEqual(accessory);
    });

    test('装備を解除できる', () => {
      // 要件: 2.5
      const character = createTestCharacter();
      const weapon = createTestEquipment();

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);

      equipmentManager.equipItem(character.id, weapon, EquipmentSlotType.WEAPON, character);

      const unequippedWeapon = equipmentManager.unequipItem(
        character.id,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(unequippedWeapon).toEqual(weapon);

      const currentWeapon = equipmentManager.getEquipment(character.id, EquipmentSlotType.WEAPON);
      expect(currentWeapon).toBeNull();
    });

    test('全装備を取得できる', () => {
      // 要件: 2.1, 2.2, 2.3
      const character = createTestCharacter();
      const weapon = createTestEquipment();
      const armor = createTestEquipment({
        id: 'test_armor',
        name: 'Test Armor',
        type: ItemType.ARMOR,
        slot: EquipmentSlotType.ARMOR,
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);

      equipmentManager.equipItem(character.id, weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.equipItem(character.id, armor, EquipmentSlotType.ARMOR, character);

      const equipmentSet = equipmentManager.getAllEquipment(character.id);

      expect(equipmentSet.weapon).toEqual(weapon);
      expect(equipmentSet.armor).toEqual(armor);
      expect(equipmentSet.accessory1).toBeNull();
      expect(equipmentSet.accessory2).toBeNull();
    });

    test('存在しないキャラクターの装備を取得すると空の装備セットが返る', () => {
      const equipmentSet = equipmentManager.getAllEquipment('non_existent_char');

      expect(equipmentSet.weapon).toBeNull();
      expect(equipmentSet.armor).toBeNull();
      expect(equipmentSet.accessory1).toBeNull();
      expect(equipmentSet.accessory2).toBeNull();
    });

    test('存在しないスロットの装備を取得するとnullが返る', () => {
      const character = createTestCharacter();

      equipmentManager.initializeCharacterEquipment(character.id);

      const equipment = equipmentManager.getEquipment(character.id, EquipmentSlotType.WEAPON);

      expect(equipment).toBeNull();
    });

    test('装備を解除しようとしたが装備がない場合はnullが返る', () => {
      const character = createTestCharacter();

      equipmentManager.initializeCharacterEquipment(character.id);

      const unequippedWeapon = equipmentManager.unequipItem(
        character.id,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(unequippedWeapon).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    test('無効な装備データを装着しようとすると失敗する', () => {
      // 要件: 2.7
      const character = createTestCharacter();
      const invalidEquipment = {} as Equipment; // 無効な装備データ

      equipmentManager.initializeCharacterEquipment(character.id);

      const result = equipmentManager.equipItem(
        character.id,
        invalidEquipment,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('無効な装備データ');
    });

    test('間違ったスロットに装備を装着しようとすると失敗する', () => {
      // 要件: 2.7
      const character = createTestCharacter();
      const weapon = createTestEquipment({
        slot: EquipmentSlotType.WEAPON,
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);

      // 武器を防具スロットに装着しようとする
      const result = equipmentManager.equipItem(
        character.id,
        weapon,
        EquipmentSlotType.ARMOR,
        character
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('装着できません');
    });

    test('レベル条件を満たさない装備を装着しようとすると失敗する', () => {
      // 要件: 2.7, 4.3
      const character = createTestCharacter({ level: 3 });
      const weapon = createTestEquipment({
        requirements: {
          level: 10, // キャラクターのレベルより高い
        },
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);

      const result = equipmentManager.equipItem(
        character.id,
        weapon,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('装備条件を満たしていません');
      expect(result.message).toContain('レベル10以上が必要');
    });

    test('能力値条件を満たさない装備を装着しようとすると失敗する', () => {
      // 要件: 2.7, 4.4
      const character = createTestCharacter({
        stats: {
          attack: 10,
          defense: 5,
          speed: 5,
          accuracy: 50,
          evasion: 5,
        },
      });
      const weapon = createTestEquipment({
        requirements: {
          level: 1,
          stats: {
            attack: 20, // キャラクターの攻撃力より高い
          },
        },
      });

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);

      const result = equipmentManager.equipItem(
        character.id,
        weapon,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('装備条件を満たしていません');
      expect(result.message).toContain('攻撃力20以上が必要');
    });

    test('インベントリに装備がない場合は装着に失敗する', () => {
      // 要件: 2.6
      const character = createTestCharacter();
      const weapon = createTestEquipment();

      equipmentManager.initializeCharacterEquipment(character.id);
      // インベントリに追加しない

      const result = equipmentManager.equipItem(
        character.id,
        weapon,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('インベントリにアイテムが存在しません');
    });

    test('装備の入れ替えが正しく動作する', () => {
      // 要件: 2.6
      const character = createTestCharacter();
      const weapon1 = createTestEquipment({ id: 'weapon1', name: 'Weapon 1' });
      const weapon2 = createTestEquipment({ id: 'weapon2', name: 'Weapon 2' });

      equipmentManager.initializeCharacterEquipment(character.id);

      // 最初の武器を装着
      inventoryManager.addItem(weapon1, 1);
      const equipResult1 = equipmentManager.equipItem(
        character.id,
        weapon1,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(equipResult1.success).toBe(true);
      expect(equipResult1.newEquipment).toEqual(weapon1);

      // 2番目の武器を装着（入れ替え）
      inventoryManager.addItem(weapon2, 1);
      const equipResult2 = equipmentManager.equipItem(
        character.id,
        weapon2,
        EquipmentSlotType.WEAPON,
        character
      );

      expect(equipResult2.success).toBe(true);
      expect(equipResult2.previousEquipment).toEqual(weapon1);
      expect(equipResult2.newEquipment).toEqual(weapon2);

      // 新しい装備が装着されていることを確認
      const currentWeapon = equipmentManager.getEquipment(character.id, EquipmentSlotType.WEAPON);
      expect(currentWeapon).toEqual(weapon2);

      // 古い装備がインベントリに戻っていることを確認
      const weapon1Count = inventoryManager.getItemCount('weapon1');
      expect(weapon1Count).toBe(1);
    });

    test('装備条件チェックが正しく動作する', () => {
      // 要件: 2.7, 4.3, 4.4
      const character = createTestCharacter({ level: 10 });
      const weapon = createTestEquipment({
        requirements: {
          level: 5,
        },
      });

      equipmentManager.initializeCharacterEquipment(character.id);

      const canEquip = equipmentManager.canEquip(character.id, weapon, character);

      expect(canEquip).toBe(true);
    });

    test('装備条件チェックで条件を満たさない場合はfalseが返る', () => {
      // 要件: 2.7, 4.3, 4.4
      const character = createTestCharacter({ level: 3 });
      const weapon = createTestEquipment({
        requirements: {
          level: 10,
        },
      });

      equipmentManager.initializeCharacterEquipment(character.id);

      const canEquip = equipmentManager.canEquip(character.id, weapon, character);

      expect(canEquip).toBe(false);
    });

    test('装備条件の詳細チェック結果を取得できる', () => {
      // 要件: 2.7, 4.3, 4.4
      const character = createTestCharacter({
        level: 3,
        stats: {
          attack: 10,
          defense: 5,
          speed: 5,
          accuracy: 50,
          evasion: 5,
        },
      });
      const weapon = createTestEquipment({
        requirements: {
          level: 10,
          stats: {
            attack: 20,
            defense: 10,
          },
        },
      });

      equipmentManager.initializeCharacterEquipment(character.id);

      const checkResult = equipmentManager.checkEquipmentRequirements(
        character.id,
        weapon,
        character
      );

      expect(checkResult.canEquip).toBe(false);
      expect(checkResult.failureReasons).toHaveLength(3);
      expect(checkResult.failureReasons).toContain('レベル10以上が必要です');
      expect(checkResult.failureReasons).toContain('攻撃力20以上が必要です');
      expect(checkResult.failureReasons).toContain('防御力10以上が必要です');
      expect(checkResult.missingRequirements.level).toBe(10);
      expect(checkResult.missingRequirements.stats?.attack).toBe(20);
      expect(checkResult.missingRequirements.stats?.defense).toBe(10);
    });
  });

  describe('デバッグ機能', () => {
    test('デバッグ情報を取得できる', () => {
      const character1 = createTestCharacter({ id: 'char_1' });
      const character2 = createTestCharacter({ id: 'char_2' });
      const weapon = createTestEquipment();

      equipmentManager.initializeCharacterEquipment(character1.id);
      equipmentManager.initializeCharacterEquipment(character2.id);

      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem(character1.id, weapon, EquipmentSlotType.WEAPON, character1);

      const debugInfo = equipmentManager.getDebugInfo();

      expect(debugInfo.totalCharacters).toBe(2);
      expect(debugInfo.charactersWithEquipment).toBe(1);
    });

    test('システムをクリアできる', () => {
      const character = createTestCharacter();
      const weapon = createTestEquipment();

      equipmentManager.initializeCharacterEquipment(character.id);
      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem(character.id, weapon, EquipmentSlotType.WEAPON, character);

      equipmentManager.clear();

      const equipmentSet = equipmentManager.getAllEquipment(character.id);

      expect(equipmentSet.weapon).toBeNull();
      expect(equipmentSet.armor).toBeNull();
      expect(equipmentSet.accessory1).toBeNull();
      expect(equipmentSet.accessory2).toBeNull();
    });
  });
});
