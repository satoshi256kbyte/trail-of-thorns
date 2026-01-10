/**
 * EquipmentManager プロパティベーステスト
 * 
 * Feature: inventory-equipment-system
 * 
 * このテストファイルは、EquipmentManagerの正確性プロパティを検証します。
 * 各テストは最低100回の反復で実行されます。
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { ItemEffectSystem, Character } from '../../../game/src/systems/ItemEffectSystem';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import {
  Equipment,
  EquipmentSlotType,
  ItemType,
  ItemRarity,
  EquipmentStats,
  EquipmentRequirements,
  InventoryUtils,
} from '../../../game/src/types/inventory';

// テスト用のArbitraries（ランダムデータ生成器）

/**
 * 装備能力値のArbitrary
 */
const equipmentStatsArbitrary = fc.record({
  hp: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  mp: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  attack: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  defense: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  speed: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
  accuracy: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
  evasion: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
});

/**
 * 装備条件のArbitrary
 */
const equipmentRequirementsArbitrary = fc.record({
  level: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
  job: fc.option(fc.constantFrom('warrior', 'mage', 'archer'), { nil: undefined }),
  stats: fc.option(equipmentStatsArbitrary, { nil: undefined }),
});

/**
 * 装備のArbitrary
 */
const equipmentArbitrary = (slot: EquipmentSlotType) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 0, maxLength: 100 }),
    type: fc.constant(
      slot === EquipmentSlotType.WEAPON
        ? ItemType.WEAPON
        : slot === EquipmentSlotType.ARMOR
        ? ItemType.ARMOR
        : ItemType.ACCESSORY
    ),
    rarity: fc.constantFrom(
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
      ItemRarity.LEGENDARY
    ),
    iconPath: fc.constant('assets/items/icon.png'),
    maxStack: fc.constant(1),
    sellPrice: fc.integer({ min: 0, max: 10000 }),
    buyPrice: fc.integer({ min: 0, max: 20000 }),
    slot: fc.constant(slot),
    stats: equipmentStatsArbitrary,
    requirements: equipmentRequirementsArbitrary,
    durability: fc.integer({ min: 1, max: 100 }),
    maxDurability: fc.constant(100),
    effects: fc.constant([]),
  }) as fc.Arbitrary<Equipment>;

/**
 * キャラクターのArbitrary
 */
const characterArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  level: fc.integer({ min: 1, max: 99 }),
  currentHP: fc.integer({ min: 1, max: 1000 }),
  maxHP: fc.integer({ min: 1, max: 1000 }),
  currentMP: fc.integer({ min: 0, max: 500 }),
  maxMP: fc.integer({ min: 0, max: 500 }),
  stats: fc.record({
    attack: fc.integer({ min: 1, max: 100 }),
    defense: fc.integer({ min: 1, max: 100 }),
    speed: fc.integer({ min: 1, max: 100 }),
    accuracy: fc.integer({ min: 1, max: 100 }),
    evasion: fc.integer({ min: 1, max: 100 }),
  }),
  statusEffects: fc.constant([]),
}) as fc.Arbitrary<Character>;

describe('EquipmentManager Property-Based Tests', () => {
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  beforeEach(() => {
    itemEffectSystem = new ItemEffectSystem();
    itemDataLoader = new ItemDataLoader();
    inventoryManager = new InventoryManager(itemDataLoader);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);
  });

  /**
   * プロパティ7: 装備スロットの存在保証
   * 検証要件: 2.1, 2.2, 2.3
   * 
   * 任意のキャラクターは、武器スロット1つ、防具スロット1つ、アクセサリスロット2つを持つ
   */
  test('Property 7: Equipment slot existence guarantee', () => {
    fc.assert(
      fc.property(characterArbitrary, character => {
        // キャラクターの装備を初期化
        equipmentManager.initializeCharacterEquipment(character.id);

        // 全装備を取得
        const equipmentSet = equipmentManager.getAllEquipment(character.id);

        // 装備セットが正しい構造を持つことを確認
        expect(equipmentSet).toHaveProperty('weapon');
        expect(equipmentSet).toHaveProperty('armor');
        expect(equipmentSet).toHaveProperty('accessory1');
        expect(equipmentSet).toHaveProperty('accessory2');

        // 初期状態では全てnull
        expect(equipmentSet.weapon).toBeNull();
        expect(equipmentSet.armor).toBeNull();
        expect(equipmentSet.accessory1).toBeNull();
        expect(equipmentSet.accessory2).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ8: 装備効果の適用と除去
   * 検証要件: 2.4, 2.5, 3.1
   * 
   * 任意の装備品をキャラクターに装着した後、キャラクターの能力値が装備の効果分だけ変化し、
   * 装備を解除すると元の能力値に戻る
   */
  test('Property 8: Equipment effect application and removal', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        equipmentArbitrary(EquipmentSlotType.WEAPON),
        (character, equipment) => {
          // 初期能力値を記録
          const initialMaxHP = character.maxHP;
          const initialMaxMP = character.maxMP;
          const initialAttack = character.stats.attack;
          const initialDefense = character.stats.defense;
          const initialSpeed = character.stats.speed;
          const initialAccuracy = character.stats.accuracy;
          const initialEvasion = character.stats.evasion;

          // 装備条件を満たすようにキャラクターを調整
          if (equipment.requirements.level) {
            character.level = Math.max(character.level, equipment.requirements.level);
          }

          // インベントリに装備を追加
          inventoryManager.addItem(equipment, 1);

          // 装備を装着
          const equipResult = equipmentManager.equipItem(
            character.id,
            equipment,
            EquipmentSlotType.WEAPON,
            character
          );

          if (equipResult.success) {
            // 能力値が変化していることを確認
            if (equipment.stats.hp) {
              expect(character.maxHP).toBe(initialMaxHP + equipment.stats.hp);
            }
            if (equipment.stats.mp) {
              expect(character.maxMP).toBe(initialMaxMP + equipment.stats.mp);
            }
            if (equipment.stats.attack) {
              expect(character.stats.attack).toBe(initialAttack + equipment.stats.attack);
            }
            if (equipment.stats.defense) {
              expect(character.stats.defense).toBe(initialDefense + equipment.stats.defense);
            }
            if (equipment.stats.speed) {
              expect(character.stats.speed).toBe(initialSpeed + equipment.stats.speed);
            }
            if (equipment.stats.accuracy) {
              expect(character.stats.accuracy).toBe(initialAccuracy + equipment.stats.accuracy);
            }
            if (equipment.stats.evasion) {
              expect(character.stats.evasion).toBe(initialEvasion + equipment.stats.evasion);
            }

            // 装備を解除
            const unequippedItem = equipmentManager.unequipItem(
              character.id,
              EquipmentSlotType.WEAPON,
              character
            );

            expect(unequippedItem).not.toBeNull();

            // 能力値が元に戻っていることを確認
            expect(character.maxHP).toBe(initialMaxHP);
            expect(character.maxMP).toBe(initialMaxMP);
            expect(character.stats.attack).toBe(initialAttack);
            expect(character.stats.defense).toBe(initialDefense);
            expect(character.stats.speed).toBe(initialSpeed);
            expect(character.stats.accuracy).toBe(initialAccuracy);
            expect(character.stats.evasion).toBe(initialEvasion);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ9: 装備入れ替えの正確性
   * 検証要件: 2.6
   * 
   * 任意の装備スロットに既に装備がある状態で新しい装備を装着すると、
   * 古い装備がインベントリに戻り、新しい装備が装着される
   */
  test('Property 9: Equipment replacement accuracy', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        equipmentArbitrary(EquipmentSlotType.WEAPON),
        equipmentArbitrary(EquipmentSlotType.WEAPON),
        (character, equipment1, equipment2) => {
          // 2つの装備が同じIDを持つ場合はスキップ（fast-checkの縮小で発生する可能性がある）
          fc.pre(equipment1.id !== equipment2.id);

          // 各テストケースで新しいマネージャーインスタンスを作成（状態の分離）
          const testItemEffectSystem = new ItemEffectSystem();
          const testItemDataLoader = new ItemDataLoader();
          const testInventoryManager = new InventoryManager(testItemDataLoader);
          const testEquipmentManager = new EquipmentManager(testItemEffectSystem, testInventoryManager);

          // 装備条件を満たすようにキャラクターを調整
          const maxLevel = Math.max(
            equipment1.requirements.level || 1,
            equipment2.requirements.level || 1
          );
          character.level = Math.max(character.level, maxLevel);

          // インベントリに装備を追加
          testInventoryManager.addItem(equipment1, 1);
          testInventoryManager.addItem(equipment2, 1);

          // 最初の装備を装着
          const equipResult1 = testEquipmentManager.equipItem(
            character.id,
            equipment1,
            EquipmentSlotType.WEAPON,
            character
          );

          if (equipResult1.success) {
            // インベントリから装備1が削除されていることを確認
            const equipment1Count = testInventoryManager.getItemCount(equipment1.id);
            expect(equipment1Count).toBe(0);

            // 2番目の装備を装着（入れ替え）
            const equipResult2 = testEquipmentManager.equipItem(
              character.id,
              equipment2,
              EquipmentSlotType.WEAPON,
              character
            );

            if (equipResult2.success) {
              // 古い装備（equipment1）がインベントリに戻っていることを確認
              const equipment1CountAfter = testInventoryManager.getItemCount(equipment1.id);
              expect(equipment1CountAfter).toBe(1);

              // 新しい装備（equipment2）が装着されていることを確認
              const currentEquipment = testEquipmentManager.getEquipment(
                character.id,
                EquipmentSlotType.WEAPON
              );
              expect(currentEquipment).not.toBeNull();
              expect(currentEquipment?.id).toBe(equipment2.id);

              // インベントリから装備2が削除されていることを確認
              const equipment2Count = testInventoryManager.getItemCount(equipment2.id);
              expect(equipment2Count).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ10: 装備条件チェック
   * 検証要件: 2.7, 4.3, 4.4
   * 
   * 任意の装備条件（レベル、職業）を満たさないキャラクターによる装備試行は拒否され、
   * 装備状態は変更されない
   */
  test('Property 10: Equipment requirement check', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        equipmentArbitrary(EquipmentSlotType.WEAPON),
        (character, equipment) => {
          // 装備条件を満たさないようにキャラクターを調整
          if (equipment.requirements.level) {
            character.level = Math.max(1, equipment.requirements.level - 1);
          }

          // インベントリに装備を追加
          inventoryManager.addItem(equipment, 1);

          // 装備前の状態を記録
          const equipmentBefore = equipmentManager.getEquipment(
            character.id,
            EquipmentSlotType.WEAPON
          );
          const inventoryCountBefore = inventoryManager.getItemCount(equipment.id);

          // 装備を試行
          const equipResult = equipmentManager.equipItem(
            character.id,
            equipment,
            EquipmentSlotType.WEAPON,
            character
          );

          // レベル条件を満たさない場合、装備は失敗する
          if (equipment.requirements.level && character.level < equipment.requirements.level) {
            expect(equipResult.success).toBe(false);

            // 装備状態が変更されていないことを確認
            const equipmentAfter = equipmentManager.getEquipment(
              character.id,
              EquipmentSlotType.WEAPON
            );
            expect(equipmentAfter).toEqual(equipmentBefore);

            // インベントリの状態が変更されていないことを確認
            const inventoryCountAfter = inventoryManager.getItemCount(equipment.id);
            expect(inventoryCountAfter).toBe(inventoryCountBefore);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
