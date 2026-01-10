/**
 * EquipmentManager データ永続化プロパティテスト
 * 
 * Feature: inventory-equipment-system
 * Property 23: 装備状態のセーブ・ロード
 * 検証要件: 9.2, 9.4
 * 
 * このテストは、装備状態のセーブ・ロード機能が正しく動作することを検証します。
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
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
} from '../../../game/src/types/inventory';

describe('EquipmentManager データ永続化プロパティテスト', () => {
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  // テスト用の装備ジェネレーター
  const equipmentArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `equip_${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ maxLength: 200 }),
    type: fc.constantFrom(ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY),
    rarity: fc.constantFrom(
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
      ItemRarity.LEGENDARY
    ),
    iconPath: fc.constant('assets/items/default.png'),
    maxStack: fc.constant(1),
    sellPrice: fc.integer({ min: 0, max: 10000 }),
    buyPrice: fc.integer({ min: 0, max: 10000 }),
    slot: fc.constantFrom(
      EquipmentSlotType.WEAPON,
      EquipmentSlotType.ARMOR,
      EquipmentSlotType.ACCESSORY1,
      EquipmentSlotType.ACCESSORY2
    ),
    stats: fc.record({
      hp: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
      mp: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
      attack: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
      defense: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
      speed: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
    }),
    requirements: fc.record({
      level: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
      job: fc.option(fc.constant('warrior'), { nil: undefined }),
    }),
    durability: fc.integer({ min: 50, max: 100 }),
    maxDurability: fc.constant(100),
    effects: fc.constant([]),
  });

  // テスト用のキャラクタージェネレーター
  const characterArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `char_${s}`),
    level: fc.integer({ min: 1, max: 50 }),
    maxHP: fc.integer({ min: 50, max: 200 }),
    currentHP: fc.integer({ min: 1, max: 200 }),
    maxMP: fc.integer({ min: 20, max: 100 }),
    currentMP: fc.integer({ min: 0, max: 100 }),
    stats: fc.record({
      attack: fc.integer({ min: 10, max: 50 }),
      defense: fc.integer({ min: 10, max: 50 }),
      speed: fc.integer({ min: 5, max: 20 }),
      accuracy: fc.integer({ min: 70, max: 100 }),
      evasion: fc.integer({ min: 5, max: 30 }),
    }),
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // ItemDataLoaderのモックを作成
    itemDataLoader = {
      getItemDefinition: (itemId: string) => {
        // テスト用の装備定義を返す
        return {
          id: itemId,
          baseItem: {
            id: itemId,
            name: `Test Equipment ${itemId}`,
            description: 'Test equipment description',
            type: ItemType.WEAPON,
            rarity: ItemRarity.COMMON,
            iconPath: 'assets/items/default.png',
            maxStack: 1,
            sellPrice: 100,
            buyPrice: 200,
          },
          equipmentData: {
            id: itemId,
            name: `Test Equipment ${itemId}`,
            description: 'Test equipment description',
            type: ItemType.WEAPON,
            rarity: ItemRarity.COMMON,
            iconPath: 'assets/items/default.png',
            maxStack: 1,
            sellPrice: 100,
            buyPrice: 200,
            slot: EquipmentSlotType.WEAPON,
            stats: {
              attack: 10,
              defense: 5,
            },
            requirements: {
              level: 1,
            },
            durability: 100,
            maxDurability: 100,
            effects: [],
          },
        };
      },
    } as any;

    itemEffectSystem = new ItemEffectSystem();
    inventoryManager = new InventoryManager(itemDataLoader, 100);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Property 23: 装備状態のセーブ・ロード
   * 検証要件: 9.2, 9.4
   * 
   * 任意のキャラクターの装備状態をセーブしてロードすると、
   * 全ての装備スロットの状態が正確に復元される
   */
  test('Property 23: 装備状態のセーブ・ロード - セーブ後にロードすると元の状態が復元される', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            character: characterArbitrary,
            equipment: equipmentArbitrary,
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (characterEquipments) => {
          const manager = new EquipmentManager(itemEffectSystem, inventoryManager);

          // 各キャラクターに装備を装着
          const equippedCharacters: Array<{
            characterId: string;
            slot: EquipmentSlotType;
            equipmentId: string;
          }> = [];

          for (const { character, equipment } of characterEquipments) {
            // キャラクター装備データを初期化
            manager.initializeCharacterEquipment(character.id);

            // インベントリに装備を追加
            inventoryManager.addItem(equipment, 1);

            // 装備を装着
            const result = manager.equipItem(
              character.id,
              equipment,
              equipment.slot,
              character as Character
            );

            if (result.success) {
              equippedCharacters.push({
                characterId: character.id,
                slot: equipment.slot,
                equipmentId: equipment.id,
              });
            }
          }

          // セーブ前の状態を記録
          const beforeSave = equippedCharacters.map(({ characterId, slot }) => ({
            characterId,
            slot,
            equipmentId: manager.getEquipment(characterId, slot)?.id || null,
          }));

          // セーブ
          const saveSuccess = manager.saveToLocalStorage('test_equipment');
          expect(saveSuccess).toBe(true);

          // 新しいマネージャーを作成してロード
          const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
          const loadSuccess = newManager.loadFromLocalStorage('test_equipment', itemDataLoader);
          expect(loadSuccess).toBe(true);

          // ロード後の状態を検証
          const afterLoad = equippedCharacters.map(({ characterId, slot }) => ({
            characterId,
            slot,
            equipmentId: newManager.getEquipment(characterId, slot)?.id || null,
          }));

          // 各装備が一致することを確認
          for (let i = 0; i < beforeSave.length; i++) {
            expect(afterLoad[i].equipmentId).toBe(beforeSave[i].equipmentId);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23補助: 装備なしのキャラクターのセーブ・ロード', () => {
    // キャラクターを初期化（装備なし）
    equipmentManager.initializeCharacterEquipment('char_1');
    equipmentManager.initializeCharacterEquipment('char_2');

    // セーブ
    const saveSuccess = equipmentManager.saveToLocalStorage('test_no_equipment');
    expect(saveSuccess).toBe(true);

    // ロード
    const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
    const loadSuccess = newManager.loadFromLocalStorage('test_no_equipment', itemDataLoader);
    expect(loadSuccess).toBe(true);

    // 装備がないことを確認
    expect(newManager.getEquipment('char_1', EquipmentSlotType.WEAPON)).toBeNull();
    expect(newManager.getEquipment('char_2', EquipmentSlotType.WEAPON)).toBeNull();
  });

  test('Property 23補助: 全スロット装備済みのセーブ・ロード', () => {
    fc.assert(
      fc.property(characterArbitrary, (character) => {
        const manager = new EquipmentManager(itemEffectSystem, inventoryManager);
        manager.initializeCharacterEquipment(character.id);

        // 全スロットに装備を装着
        const slots = [
          EquipmentSlotType.WEAPON,
          EquipmentSlotType.ARMOR,
          EquipmentSlotType.ACCESSORY1,
          EquipmentSlotType.ACCESSORY2,
        ];

        for (const slot of slots) {
          const equipment: Equipment = {
            id: `equip_${slot}`,
            name: `Test ${slot}`,
            description: 'Test equipment',
            type: ItemType.WEAPON,
            rarity: ItemRarity.COMMON,
            iconPath: 'assets/items/default.png',
            maxStack: 1,
            sellPrice: 100,
            buyPrice: 200,
            slot,
            stats: { attack: 10 },
            requirements: { level: 1 },
            durability: 100,
            maxDurability: 100,
            effects: [],
          };

          inventoryManager.addItem(equipment, 1);
          manager.equipItem(character.id, equipment, slot, character as Character);
        }

        // セーブ
        const saveSuccess = manager.saveToLocalStorage('test_full_equipment');
        expect(saveSuccess).toBe(true);

        // ロード
        const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
        const loadSuccess = newManager.loadFromLocalStorage('test_full_equipment', itemDataLoader);
        expect(loadSuccess).toBe(true);

        // 全スロットに装備があることを確認
        for (const slot of slots) {
          const equipment = newManager.getEquipment(character.id, slot);
          expect(equipment).not.toBeNull();
        }

        return true;
      }),
      { numRuns: 20 }
    );
  });

  test('Property 23補助: セーブデータが存在しない場合のロード', () => {
    const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
    const loadSuccess = newManager.loadFromLocalStorage('non_existent_key', itemDataLoader);

    // ロードは失敗するが、エラーは発生しない
    expect(loadSuccess).toBe(false);

    // 装備データは空のまま
    expect(newManager.getDebugInfo().totalCharacters).toBe(0);
  });

  test('Property 23補助: 複数キャラクターの装備状態のセーブ・ロード', () => {
    fc.assert(
      fc.property(
        fc.array(characterArbitrary, { minLength: 1, maxLength: 6 }),
        (characters) => {
          const manager = new EquipmentManager(itemEffectSystem, inventoryManager);

          // 各キャラクターに装備を装着
          for (const character of characters) {
            manager.initializeCharacterEquipment(character.id);

            const equipment: Equipment = {
              id: `equip_${character.id}`,
              name: `Equipment for ${character.id}`,
              description: 'Test equipment',
              type: ItemType.WEAPON,
              rarity: ItemRarity.COMMON,
              iconPath: 'assets/items/default.png',
              maxStack: 1,
              sellPrice: 100,
              buyPrice: 200,
              slot: EquipmentSlotType.WEAPON,
              stats: { attack: 10 },
              requirements: { level: 1 },
              durability: 100,
              maxDurability: 100,
              effects: [],
            };

            inventoryManager.addItem(equipment, 1);
            manager.equipItem(character.id, equipment, EquipmentSlotType.WEAPON, character as Character);
          }

          // セーブ
          const saveSuccess = manager.saveToLocalStorage('test_multi_character');
          expect(saveSuccess).toBe(true);

          // ロード
          const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
          const loadSuccess = newManager.loadFromLocalStorage('test_multi_character', itemDataLoader);
          expect(loadSuccess).toBe(true);

          // 全キャラクターの装備が復元されていることを確認
          for (const character of characters) {
            const equipment = newManager.getEquipment(character.id, EquipmentSlotType.WEAPON);
            expect(equipment).not.toBeNull();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
