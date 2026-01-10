/**
 * EquipmentManager データ永続化ユニットテスト
 * 
 * タスク12.4: データ永続化のユニットテストを作成
 * 要件: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * このテストは、装備状態のセーブ・ロード機能の正確性とデータ整合性を検証します。
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EquipmentManager } from '../../../../game/src/systems/EquipmentManager';
import { ItemEffectSystem, Character } from '../../../../game/src/systems/ItemEffectSystem';
import { InventoryManager } from '../../../../game/src/systems/InventoryManager';
import { ItemDataLoader } from '../../../../game/src/systems/ItemDataLoader';
import {
  Equipment,
  EquipmentSlotType,
  ItemType,
  ItemRarity,
} from '../../../../game/src/types/inventory';

describe('EquipmentManager データ永続化ユニットテスト', () => {
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let inventoryManager: InventoryManager;
  let itemDataLoader: ItemDataLoader;

  // テスト用の装備を作成
  const createTestEquipment = (
    id: string,
    slot: EquipmentSlotType,
    stats: any = {}
  ): Equipment => ({
    id,
    name: `Test Equipment ${id}`,
    description: 'Test equipment description',
    type: ItemType.WEAPON,
    rarity: ItemRarity.COMMON,
    iconPath: 'assets/items/default.png',
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
    slot,
    stats: {
      attack: 10,
      defense: 5,
      ...stats,
    },
    requirements: {
      level: 1,
    },
    durability: 100,
    maxDurability: 100,
    effects: [],
  });

  // テスト用のキャラクターを作成
  const createTestCharacter = (id: string): Character => ({
    id,
    level: 10,
    maxHP: 100,
    currentHP: 100,
    maxMP: 50,
    currentMP: 50,
    stats: {
      attack: 20,
      defense: 15,
      speed: 10,
      accuracy: 85,
      evasion: 10,
    },
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // ItemDataLoaderのモックを作成
    itemDataLoader = {
      getItemDefinition: (itemId: string) => {
        const slot = itemId.includes('weapon')
          ? EquipmentSlotType.WEAPON
          : itemId.includes('armor')
          ? EquipmentSlotType.ARMOR
          : EquipmentSlotType.ACCESSORY1;

        return {
          id: itemId,
          baseItem: {
            id: itemId,
            name: `Test Equipment ${itemId}`,
            description: 'Test equipment',
            type: ItemType.WEAPON,
            rarity: ItemRarity.COMMON,
            iconPath: 'assets/items/default.png',
            maxStack: 1,
            sellPrice: 100,
            buyPrice: 200,
          },
          equipmentData: createTestEquipment(itemId, slot),
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

  describe('serializeEquipmentData - シリアライズ機能', () => {
    test('要件9.2: 装備なしの状態を正しくシリアライズできる', () => {
      equipmentManager.initializeCharacterEquipment('char-1');

      const serialized = equipmentManager.serializeEquipmentData();
      const data = JSON.parse(serialized);

      expect(data.version).toBe('1.0.0');
      expect(data.characters).toHaveLength(1);
      expect(data.characters[0].characterId).toBe('char-1');
      expect(data.characters[0].equipment.weapon).toBeNull();
      expect(data.characters[0].equipment.armor).toBeNull();
      expect(data.timestamp).toBeGreaterThan(0);
    });

    test('要件9.2: 装備を含む状態を正しくシリアライズできる', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const armor = createTestEquipment('armor-1', EquipmentSlotType.ARMOR);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.equipItem('char-1', armor, EquipmentSlotType.ARMOR, character);

      const serialized = equipmentManager.serializeEquipmentData();
      const data = JSON.parse(serialized);

      expect(data.characters).toHaveLength(1);
      expect(data.characters[0].equipment.weapon).toBe('weapon-1');
      expect(data.characters[0].equipment.armor).toBe('armor-1');
    });

    test('要件9.2: 複数キャラクターの装備を正しくシリアライズできる', () => {
      const char1 = createTestCharacter('char-1');
      const char2 = createTestCharacter('char-2');
      const weapon1 = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const weapon2 = createTestEquipment('weapon-2', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      equipmentManager.initializeCharacterEquipment('char-2');
      inventoryManager.addItem(weapon1, 1);
      inventoryManager.addItem(weapon2, 1);
      equipmentManager.equipItem('char-1', weapon1, EquipmentSlotType.WEAPON, char1);
      equipmentManager.equipItem('char-2', weapon2, EquipmentSlotType.WEAPON, char2);

      const serialized = equipmentManager.serializeEquipmentData();
      const data = JSON.parse(serialized);

      expect(data.characters).toHaveLength(2);
      const char1Data = data.characters.find((c: any) => c.characterId === 'char-1');
      const char2Data = data.characters.find((c: any) => c.characterId === 'char-2');
      expect(char1Data.equipment.weapon).toBe('weapon-1');
      expect(char2Data.equipment.weapon).toBe('weapon-2');
    });

    test('要件9.2: 全スロットの装備を正しくシリアライズできる', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const armor = createTestEquipment('armor-1', EquipmentSlotType.ARMOR);
      const acc1 = createTestEquipment('acc-1', EquipmentSlotType.ACCESSORY1);
      const acc2 = createTestEquipment('acc-2', EquipmentSlotType.ACCESSORY2);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      inventoryManager.addItem(acc1, 1);
      inventoryManager.addItem(acc2, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.equipItem('char-1', armor, EquipmentSlotType.ARMOR, character);
      equipmentManager.equipItem('char-1', acc1, EquipmentSlotType.ACCESSORY1, character);
      equipmentManager.equipItem('char-1', acc2, EquipmentSlotType.ACCESSORY2, character);

      const serialized = equipmentManager.serializeEquipmentData();
      const data = JSON.parse(serialized);

      const charData = data.characters[0];
      expect(charData.equipment.weapon).toBe('weapon-1');
      expect(charData.equipment.armor).toBe('armor-1');
      expect(charData.equipment.accessory1).toBe('acc-1');
      expect(charData.equipment.accessory2).toBe('acc-2');
    });
  });

  describe('deserializeEquipmentData - デシリアライズ機能', () => {
    test('要件9.4: 正しいデータから装備状態を復元できる', () => {
      const saveData = {
        version: '1.0.0',
        characters: [
          {
            characterId: 'char-1',
            equipment: {
              weapon: 'weapon-1',
              armor: null,
              accessory1: null,
              accessory2: null,
            },
            appliedStats: { attack: 10 },
          },
        ],
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(saveData);
      const success = equipmentManager.deserializeEquipmentData(serialized, itemDataLoader);

      expect(success).toBe(true);
      const weapon = equipmentManager.getEquipment('char-1', EquipmentSlotType.WEAPON);
      expect(weapon).not.toBeNull();
      expect(weapon?.id).toBe('weapon-1');
    });

    test('要件9.4: 装備なしのキャラクターを復元できる', () => {
      const saveData = {
        version: '1.0.0',
        characters: [
          {
            characterId: 'char-1',
            equipment: {
              weapon: null,
              armor: null,
              accessory1: null,
              accessory2: null,
            },
            appliedStats: {},
          },
        ],
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(saveData);
      const success = equipmentManager.deserializeEquipmentData(serialized, itemDataLoader);

      expect(success).toBe(true);
      expect(equipmentManager.getEquipment('char-1', EquipmentSlotType.WEAPON)).toBeNull();
    });

    test('要件9.4: 複数キャラクターの装備状態を復元できる', () => {
      const saveData = {
        version: '1.0.0',
        characters: [
          {
            characterId: 'char-1',
            equipment: { weapon: 'weapon-1', armor: null, accessory1: null, accessory2: null },
            appliedStats: {},
          },
          {
            characterId: 'char-2',
            equipment: { weapon: 'weapon-2', armor: null, accessory1: null, accessory2: null },
            appliedStats: {},
          },
        ],
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(saveData);
      const success = equipmentManager.deserializeEquipmentData(serialized, itemDataLoader);

      expect(success).toBe(true);
      expect(equipmentManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
      expect(equipmentManager.getEquipment('char-2', EquipmentSlotType.WEAPON)?.id).toBe('weapon-2');
    });

    test('要件9.4: 存在しない装備IDはスキップされる', () => {
      const mockLoader = {
        getItemDefinition: (itemId: string) => {
          if (itemId === 'invalid-weapon') {
            return null;
          }
          return itemDataLoader.getItemDefinition(itemId);
        },
      } as any;

      const saveData = {
        version: '1.0.0',
        characters: [
          {
            characterId: 'char-1',
            equipment: {
              weapon: 'invalid-weapon',
              armor: 'armor-1',
              accessory1: null,
              accessory2: null,
            },
            appliedStats: {},
          },
        ],
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(saveData);
      const manager = new EquipmentManager(itemEffectSystem, inventoryManager);
      const success = manager.deserializeEquipmentData(serialized, mockLoader);

      expect(success).toBe(true);
      expect(manager.getEquipment('char-1', EquipmentSlotType.WEAPON)).toBeNull();
      expect(manager.getEquipment('char-1', EquipmentSlotType.ARMOR)).not.toBeNull();
    });
  });

  describe('saveToLocalStorage - LocalStorage保存', () => {
    test('要件9.2: LocalStorageに正しく保存できる', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);

      const success = equipmentManager.saveToLocalStorage('test_key');

      expect(success).toBe(true);
      const saved = localStorage.getItem('test_key');
      expect(saved).not.toBeNull();

      const data = JSON.parse(saved!);
      expect(data.characters[0].equipment.weapon).toBe('weapon-1');
    });

    test('要件9.2: デフォルトキーで保存できる', () => {
      equipmentManager.initializeCharacterEquipment('char-1');
      const success = equipmentManager.saveToLocalStorage();

      expect(success).toBe(true);
      expect(localStorage.getItem('equipment_data')).not.toBeNull();
    });

    test('要件9.2: 既存のデータを上書きできる', () => {
      const char1 = createTestCharacter('char-1');
      const weapon1 = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const weapon2 = createTestEquipment('weapon-2', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon1, 1);
      equipmentManager.equipItem('char-1', weapon1, EquipmentSlotType.WEAPON, char1);
      equipmentManager.saveToLocalStorage('test_key');

      equipmentManager.clear();
      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon2, 1);
      equipmentManager.equipItem('char-1', weapon2, EquipmentSlotType.WEAPON, char1);
      equipmentManager.saveToLocalStorage('test_key');

      const saved = localStorage.getItem('test_key');
      const data = JSON.parse(saved!);
      expect(data.characters[0].equipment.weapon).toBe('weapon-2');
    });
  });

  describe('loadFromLocalStorage - LocalStorage読み込み', () => {
    test('要件9.4: LocalStorageから正しく読み込める', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.saveToLocalStorage('test_key');

      const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      const success = newManager.loadFromLocalStorage('test_key', itemDataLoader);

      expect(success).toBe(true);
      expect(newManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
    });

    test('要件9.4: 存在しないキーの読み込みは失敗する', () => {
      const success = equipmentManager.loadFromLocalStorage('non_existent_key', itemDataLoader);

      expect(success).toBe(false);
      expect(equipmentManager.getDebugInfo().totalCharacters).toBe(0);
    });

    test('要件9.4: 破損したデータの読み込みはエラーをスローする', () => {
      localStorage.setItem('corrupted_key', '{ corrupted data }');

      expect(() => {
        equipmentManager.loadFromLocalStorage('corrupted_key', itemDataLoader);
      }).toThrow();
    });
  });

  describe('データ整合性テスト', () => {
    test('要件9.2, 9.4: セーブ・ロード後に装備状態が一致する', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const armor = createTestEquipment('armor-1', EquipmentSlotType.ARMOR);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.equipItem('char-1', armor, EquipmentSlotType.ARMOR, character);

      equipmentManager.saveToLocalStorage('test_key');

      const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      newManager.loadFromLocalStorage('test_key', itemDataLoader);

      expect(newManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
      expect(newManager.getEquipment('char-1', EquipmentSlotType.ARMOR)?.id).toBe('armor-1');
    });

    test('要件9.2, 9.4: 複数回のセーブ・ロードでデータが保持される', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);

      // 1回目のセーブ・ロード
      equipmentManager.saveToLocalStorage('test_key');
      let newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      newManager.loadFromLocalStorage('test_key', itemDataLoader);
      expect(newManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');

      // 2回目のセーブ・ロード
      newManager.saveToLocalStorage('test_key');
      const finalManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      finalManager.loadFromLocalStorage('test_key', itemDataLoader);
      expect(finalManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
    });

    test('要件9.2, 9.4: 全スロット装備済みの状態をセーブ・ロードできる', () => {
      const character = createTestCharacter('char-1');
      const weapon = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const armor = createTestEquipment('armor-1', EquipmentSlotType.ARMOR);
      const acc1 = createTestEquipment('acc-1', EquipmentSlotType.ACCESSORY1);
      const acc2 = createTestEquipment('acc-2', EquipmentSlotType.ACCESSORY2);

      equipmentManager.initializeCharacterEquipment('char-1');
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      inventoryManager.addItem(acc1, 1);
      inventoryManager.addItem(acc2, 1);
      equipmentManager.equipItem('char-1', weapon, EquipmentSlotType.WEAPON, character);
      equipmentManager.equipItem('char-1', armor, EquipmentSlotType.ARMOR, character);
      equipmentManager.equipItem('char-1', acc1, EquipmentSlotType.ACCESSORY1, character);
      equipmentManager.equipItem('char-1', acc2, EquipmentSlotType.ACCESSORY2, character);

      equipmentManager.saveToLocalStorage('test_key');

      const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      newManager.loadFromLocalStorage('test_key', itemDataLoader);

      expect(newManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
      expect(newManager.getEquipment('char-1', EquipmentSlotType.ARMOR)?.id).toBe('armor-1');
      expect(newManager.getEquipment('char-1', EquipmentSlotType.ACCESSORY1)?.id).toBe('acc-1');
      expect(newManager.getEquipment('char-1', EquipmentSlotType.ACCESSORY2)?.id).toBe('acc-2');
    });

    test('要件9.2, 9.4: 複数キャラクターの装備状態をセーブ・ロードできる', () => {
      const char1 = createTestCharacter('char-1');
      const char2 = createTestCharacter('char-2');
      const weapon1 = createTestEquipment('weapon-1', EquipmentSlotType.WEAPON);
      const weapon2 = createTestEquipment('weapon-2', EquipmentSlotType.WEAPON);

      equipmentManager.initializeCharacterEquipment('char-1');
      equipmentManager.initializeCharacterEquipment('char-2');
      inventoryManager.addItem(weapon1, 1);
      inventoryManager.addItem(weapon2, 1);
      equipmentManager.equipItem('char-1', weapon1, EquipmentSlotType.WEAPON, char1);
      equipmentManager.equipItem('char-2', weapon2, EquipmentSlotType.WEAPON, char2);

      equipmentManager.saveToLocalStorage('test_key');

      const newManager = new EquipmentManager(itemEffectSystem, inventoryManager);
      newManager.loadFromLocalStorage('test_key', itemDataLoader);

      expect(newManager.getEquipment('char-1', EquipmentSlotType.WEAPON)?.id).toBe('weapon-1');
      expect(newManager.getEquipment('char-2', EquipmentSlotType.WEAPON)?.id).toBe('weapon-2');
    });
  });

  describe('エラーハンドリング', () => {
    test('要件9.5: シリアライズエラーが適切に処理される', () => {
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn(() => {
        throw new Error('Stringify error');
      });

      expect(() => {
        equipmentManager.serializeEquipmentData();
      }).toThrow();

      JSON.stringify = originalStringify;
    });

    test('要件9.5: デシリアライズエラーが適切に処理される', () => {
      const invalidData = 'not a json';

      expect(() => {
        equipmentManager.deserializeEquipmentData(invalidData, itemDataLoader);
      }).toThrow();
    });

    test('要件9.5: LocalStorage保存エラーが適切に処理される', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      equipmentManager.initializeCharacterEquipment('char-1');

      expect(() => {
        equipmentManager.saveToLocalStorage('test_key');
      }).toThrow();

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
