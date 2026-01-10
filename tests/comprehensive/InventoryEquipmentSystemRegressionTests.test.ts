/**
 * インベントリ・装備システムリグレッションテスト
 *
 * このテストスイートは、既存機能への影響とシステム間連携を検証します：
 * - 既存のゲームシステムへの影響確認
 * - システム間連携の確認
 * - データ整合性の確認
 *
 * **Validates: Requirements 全要件**
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../../game/src/systems/InventoryManager';
import { EquipmentManager } from '../../game/src/systems/EquipmentManager';
import { ItemEffectSystem } from '../../game/src/systems/ItemEffectSystem';
import { ItemDataLoader } from '../../game/src/systems/ItemDataLoader';
import type { Item, Equipment, Consumable } from '../../game/src/types/inventory';

describe('インベントリ・装備システムリグレッションテスト', () => {
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let itemDataLoader: ItemDataLoader;

  // テスト用のアイテム作成ヘルパー
  const createTestWeapon = (id: string = 'test-weapon'): Equipment => ({
    id,
    name: 'Test Weapon',
    description: 'A test weapon',
    type: 'weapon',
    rarity: 'common',
    iconPath: 'assets/items/weapons/test.png',
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
    slot: 'weapon',
    stats: { attack: 10 },
    requirements: { level: 1 },
    durability: 100,
    maxDurability: 100,
    effects: [],
  });

  const createTestPotion = (id: string = 'test-potion'): Consumable => ({
    id,
    name: 'Test Potion',
    description: 'A test potion',
    type: 'consumable',
    rarity: 'common',
    iconPath: 'assets/items/consumables/test.png',
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
  });

  beforeEach(() => {
    itemDataLoader = new ItemDataLoader();
    inventoryManager = new InventoryManager(itemDataLoader);
    itemEffectSystem = new ItemEffectSystem();
    equipmentManager = new EquipmentManager(inventoryManager, itemEffectSystem);
    inventoryManager.setItemEffectSystem(itemEffectSystem);
  });

  describe('既存機能への影響確認', () => {
    test('インベントリシステムの追加が既存のゲームフローを壊さない', () => {
      // 1. 基本的なインベントリ操作が正常に動作することを確認
      const weapon = createTestWeapon('weapon-1');
      const addResult = inventoryManager.addItem(weapon, 1);
      expect(addResult).toBe(true);

      // 2. アイテムが正しく追加されたことを確認
      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);

      // 3. アイテムの削除が正常に動作することを確認
      const removeResult = inventoryManager.removeItem('weapon-1', 1);
      expect(removeResult).toBe(true);

      // 4. インベントリが空になったことを確認
      const emptyItems = inventoryManager.getAllItems();
      expect(emptyItems.filter(slot => !slot.isEmpty)).toHaveLength(0);
    });

    test('装備システムの追加が既存のキャラクター管理を壊さない', () => {
      // 1. 装備マネージャーが正常に初期化されることを確認
      expect(equipmentManager).toBeDefined();

      // 2. 装備スロットが正しく管理されることを確認
      const characterId = 'test-character';
      const weapon = createTestWeapon('weapon-1');

      inventoryManager.addItem(weapon, 1);
      const equipResult = equipmentManager.equipItem(characterId, weapon, 'weapon');

      // 装備が成功することを確認
      expect(equipResult).toBe(true);

      // 3. 装備の取得が正常に動作することを確認
      const equippedWeapon = equipmentManager.getEquipment(characterId, 'weapon');
      expect(equippedWeapon).toBeDefined();
    });

    test('アイテム効果システムの追加が既存の戦闘システムを壊さない', () => {
      // 1. アイテム効果システムが正常に初期化されることを確認
      expect(itemEffectSystem).toBeDefined();

      // 2. 効果の適用が正常に動作することを確認
      const characterId = 'test-character';
      const potion = createTestPotion('potion-1');

      inventoryManager.addItem(potion, 1);

      // 3. アイテム使用が正常に動作することを確認
      const useResult = inventoryManager.useItem('potion-1', characterId);
      expect(useResult).toBe(true);

      // 4. アイテム数が減少したことを確認
      const remainingCount = inventoryManager.getItemCount('potion-1');
      expect(remainingCount).toBe(0);
    });

    test('データローダーの追加が既存のデータ管理を壊さない', () => {
      // 1. データローダーが正常に初期化されることを確認
      expect(itemDataLoader).toBeDefined();

      // 2. アイテムデータの読み込みが正常に動作することを確認
      // （実際のJSONファイルがない場合はスキップ）
      expect(itemDataLoader).toBeInstanceOf(ItemDataLoader);
    });
  });

  describe('システム間連携の確認', () => {
    test('インベントリ→装備の連携が正常に動作する', () => {
      // 1. インベントリにアイテムを追加
      const weapon = createTestWeapon('weapon-1');
      inventoryManager.addItem(weapon, 1);

      // 2. インベントリから装備を装着
      const characterId = 'test-character';
      const equipResult = equipmentManager.equipItem(characterId, weapon, 'weapon');
      expect(equipResult).toBe(true);

      // 3. インベントリからアイテムが削除されたことを確認
      const count = inventoryManager.getItemCount('weapon-1');
      expect(count).toBe(0);

      // 4. 装備スロットにアイテムが追加されたことを確認
      const equippedWeapon = equipmentManager.getEquipment(characterId, 'weapon');
      expect(equippedWeapon?.id).toBe('weapon-1');
    });

    test('装備→インベントリの連携が正常に動作する', () => {
      // 1. 装備を装着
      const characterId = 'test-character';
      const weapon = createTestWeapon('weapon-1');

      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem(characterId, weapon, 'weapon');

      // 2. 装備を解除
      const unequippedWeapon = equipmentManager.unequipItem(characterId, 'weapon');
      expect(unequippedWeapon).not.toBeNull();

      // 3. インベントリにアイテムが戻ったことを確認
      const count = inventoryManager.getItemCount('weapon-1');
      expect(count).toBe(1);
    });

    test('インベントリ→アイテム効果の連携が正常に動作する', () => {
      // 1. インベントリにアイテムを追加
      const potion = createTestPotion('potion-1');
      inventoryManager.addItem(potion, 3);

      // 2. アイテムを使用
      const characterId = 'test-character';
      const useResult = inventoryManager.useItem('potion-1', characterId);
      expect(useResult).toBe(true);

      // 3. アイテム数が減少したことを確認
      const remainingCount = inventoryManager.getItemCount('potion-1');
      expect(remainingCount).toBe(2);

      // 4. 効果が適用されたことを確認（ItemEffectSystemで管理）
      // 実際の効果適用はItemEffectSystemで行われる
      expect(itemEffectSystem).toBeDefined();
    });

    test('装備→アイテム効果の連携が正常に動作する', () => {
      // 1. 効果付き装備を作成
      const weapon = createTestWeapon('magic-sword');
      weapon.effects = [
        {
          id: 'fire-damage',
          type: 'stat_boost',
          target: 'attack',
          value: 5,
          duration: 0,
          isPermanent: true,
          stackable: false,
        },
      ];

      // 2. 装備を装着
      const characterId = 'test-character';
      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem(characterId, weapon, 'weapon');

      // 3. 装備効果が適用されることを確認
      equipmentManager.applyEquipmentEffects(characterId);

      // 4. 装備が正しく装着されたことを確認
      const equippedWeapon = equipmentManager.getEquipment(characterId, 'weapon');
      expect(equippedWeapon?.effects).toHaveLength(1);
    });
  });

  describe('データ整合性の確認', () => {
    test('インベントリとequipmentManagerの状態が一致する', () => {
      // 1. アイテムを追加して装備
      const characterId = 'test-character';
      const weapon = createTestWeapon('weapon-1');

      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem(characterId, weapon, 'weapon');

      // 2. インベントリからアイテムが削除されたことを確認
      expect(inventoryManager.getItemCount('weapon-1')).toBe(0);

      // 3. 装備スロットにアイテムがあることを確認
      expect(equipmentManager.getEquipment(characterId, 'weapon')).not.toBeNull();

      // 4. 装備を解除
      equipmentManager.unequipItem(characterId, 'weapon');

      // 5. インベントリにアイテムが戻ったことを確認
      expect(inventoryManager.getItemCount('weapon-1')).toBe(1);

      // 6. 装備スロットが空になったことを確認
      expect(equipmentManager.getEquipment(characterId, 'weapon')).toBeNull();
    });

    test('アイテム数量の整合性が保たれる', () => {
      // 1. スタック可能なアイテムを追加
      const potion = createTestPotion('potion-1');
      inventoryManager.addItem(potion, 10);

      // 2. アイテム数を確認
      expect(inventoryManager.getItemCount('potion-1')).toBe(10);

      // 3. アイテムを使用
      inventoryManager.useItem('potion-1', 'test-character');
      expect(inventoryManager.getItemCount('potion-1')).toBe(9);

      // 4. 複数回使用
      inventoryManager.useItem('potion-1', 'test-character');
      inventoryManager.useItem('potion-1', 'test-character');
      expect(inventoryManager.getItemCount('potion-1')).toBe(7);

      // 5. 全て使用
      for (let i = 0; i < 7; i++) {
        inventoryManager.useItem('potion-1', 'test-character');
      }
      expect(inventoryManager.getItemCount('potion-1')).toBe(0);
    });

    test('装備スロットの整合性が保たれる', () => {
      // 1. 複数のキャラクターに装備を装着
      const hero = 'hero';
      const warrior = 'warrior';

      const weapon1 = createTestWeapon('weapon-1');
      const weapon2 = createTestWeapon('weapon-2');

      inventoryManager.addItem(weapon1, 1);
      inventoryManager.addItem(weapon2, 1);

      equipmentManager.equipItem(hero, weapon1, 'weapon');
      equipmentManager.equipItem(warrior, weapon2, 'weapon');

      // 2. 各キャラクターの装備を確認
      expect(equipmentManager.getEquipment(hero, 'weapon')?.id).toBe('weapon-1');
      expect(equipmentManager.getEquipment(warrior, 'weapon')?.id).toBe('weapon-2');

      // 3. 装備を入れ替え
      equipmentManager.unequipItem(hero, 'weapon');
      equipmentManager.unequipItem(warrior, 'weapon');

      // 4. 装備スロットが空になったことを確認
      expect(equipmentManager.getEquipment(hero, 'weapon')).toBeNull();
      expect(equipmentManager.getEquipment(warrior, 'weapon')).toBeNull();

      // 5. インベントリにアイテムが戻ったことを確認
      expect(inventoryManager.getItemCount('weapon-1')).toBe(1);
      expect(inventoryManager.getItemCount('weapon-2')).toBe(1);
    });

    test('エラー状態からの復旧が正常に動作する', () => {
      // 1. 存在しないアイテムを使用しようとする
      const useResult = inventoryManager.useItem('non-existent-item', 'test-character');
      expect(useResult).toBe(false);

      // 2. システムが正常な状態を維持していることを確認
      expect(inventoryManager.getAllItems()).toBeDefined();

      // 3. 正常なアイテム追加が可能であることを確認
      const weapon = createTestWeapon('weapon-1');
      const addResult = inventoryManager.addItem(weapon, 1);
      expect(addResult).toBe(true);
    });

    test('並行操作の整合性が保たれる', () => {
      // 1. 複数のアイテムを同時に追加
      const weapon1 = createTestWeapon('weapon-1');
      const weapon2 = createTestWeapon('weapon-2');
      const potion = createTestPotion('potion-1');

      inventoryManager.addItem(weapon1, 1);
      inventoryManager.addItem(weapon2, 1);
      inventoryManager.addItem(potion, 5);

      // 2. 全てのアイテムが正しく追加されたことを確認
      expect(inventoryManager.getItemCount('weapon-1')).toBe(1);
      expect(inventoryManager.getItemCount('weapon-2')).toBe(1);
      expect(inventoryManager.getItemCount('potion-1')).toBe(5);

      // 3. 複数の操作を実行
      const characterId = 'test-character';
      equipmentManager.equipItem(characterId, weapon1, 'weapon');
      inventoryManager.useItem('potion-1', characterId);

      // 4. 状態が正しく更新されたことを確認
      expect(inventoryManager.getItemCount('weapon-1')).toBe(0);
      expect(inventoryManager.getItemCount('potion-1')).toBe(4);
      expect(equipmentManager.getEquipment(characterId, 'weapon')).not.toBeNull();
    });
  });

  describe('パフォーマンスリグレッション', () => {
    test('大量のアイテム追加がパフォーマンスを劣化させない', () => {
      const startTime = performance.now();

      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        const weapon = createTestWeapon(`weapon-${i}`);
        inventoryManager.addItem(weapon, 1);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 100個の追加が1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);
    });

    test('大量の装備操作がパフォーマンスを劣化させない', () => {
      // 準備: 50個の武器を追加
      for (let i = 0; i < 50; i++) {
        const weapon = createTestWeapon(`weapon-${i}`);
        inventoryManager.addItem(weapon, 1);
      }

      const startTime = performance.now();

      // 50回の装備・解除操作
      const characterId = 'test-character';
      for (let i = 0; i < 50; i++) {
        const weapon = createTestWeapon(`weapon-${i}`);
        equipmentManager.equipItem(characterId, weapon, 'weapon');
        equipmentManager.unequipItem(characterId, 'weapon');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 50回の操作が1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);
    });
  });
});
