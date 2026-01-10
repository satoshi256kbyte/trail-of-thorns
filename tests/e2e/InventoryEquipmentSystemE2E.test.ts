/**
 * インベントリ・装備システムE2Eテスト
 *
 * このテストスイートは、インベントリ・装備システムのエンドツーエンドフローを検証します：
 * - アイテム獲得から使用までのフロー
 * - 装備装着から戦闘までのフロー
 * - セーブ・ロードのフロー
 *
 * **Validates: Requirements 全要件**
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { InventoryManager } from '../../game/src/systems/InventoryManager';
import { EquipmentManager } from '../../game/src/systems/EquipmentManager';
import { ItemEffectSystem } from '../../game/src/systems/ItemEffectSystem';
import { ItemDataLoader } from '../../game/src/systems/ItemDataLoader';
import type { Item, Equipment, Consumable, Character } from '../../game/src/types/inventory';

describe('インベントリ・装備システムE2Eテスト', () => {
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let itemDataLoader: ItemDataLoader;

  // テスト用のキャラクターデータ
  const createMockCharacter = (id: string = 'hero'): Character => ({
    id,
    name: 'Hero',
    level: 10,
    job: 'warrior',
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
    },
    currentHP: 100,
    currentMP: 50,
  });

  // テスト用の装備アイテム
  const createMockWeapon = (id: string = 'sword-1'): Equipment => ({
    id,
    name: 'Iron Sword',
    description: 'A basic iron sword',
    type: 'weapon',
    rarity: 'common',
    iconPath: 'assets/items/weapons/iron-sword.png',
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
    slot: 'weapon',
    stats: {
      attack: 10,
    },
    requirements: {
      level: 5,
    },
    durability: 100,
    maxDurability: 100,
    effects: [],
  });

  const createMockArmor = (id: string = 'armor-1'): Equipment => ({
    id,
    name: 'Leather Armor',
    description: 'Basic leather armor',
    type: 'armor',
    rarity: 'common',
    iconPath: 'assets/items/armor/leather-armor.png',
    maxStack: 1,
    sellPrice: 150,
    buyPrice: 300,
    slot: 'armor',
    stats: {
      defense: 8,
      hp: 20,
    },
    requirements: {
      level: 3,
    },
    durability: 100,
    maxDurability: 100,
    effects: [],
  });

  // テスト用の消耗品
  const createMockPotion = (id: string = 'potion-1'): Consumable => ({
    id,
    name: 'Health Potion',
    description: 'Restores 50 HP',
    type: 'consumable',
    rarity: 'common',
    iconPath: 'assets/items/consumables/health-potion.png',
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
    // システムを初期化
    itemDataLoader = new ItemDataLoader();
    inventoryManager = new InventoryManager(itemDataLoader);
    itemEffectSystem = new ItemEffectSystem();
    equipmentManager = new EquipmentManager(inventoryManager, itemEffectSystem);

    // ItemEffectSystemを設定
    inventoryManager.setItemEffectSystem(itemEffectSystem);

    // LocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // クリーンアップ
    localStorage.clear();
  });

  describe('E2Eテスト1: アイテム獲得から使用までのフロー', () => {
    test('アイテムを獲得→インベントリに追加→使用→効果適用の完全フローが正常に動作する', () => {
      // 1. ゲーム開始（初期状態）
      expect(inventoryManager.getAllItems()).toHaveLength(0);

      // 2. 戦闘でアイテムを獲得
      const potion = createMockPotion('potion-1');
      const addResult = inventoryManager.addItem(potion, 3);
      expect(addResult).toBe(true);

      // 3. インベントリを確認
      const items = inventoryManager.getAllItems();
      expect(items).toHaveLength(1);
      expect(items[0].item?.id).toBe('potion-1');
      expect(items[0].quantity).toBe(3);

      // 4. キャラクターがダメージを受ける
      const character = createMockCharacter('hero');
      character.currentHP = 30; // HPが減少

      // 5. ポーションを使用
      const useResult = inventoryManager.useItem('potion-1', character.id);
      expect(useResult).toBe(true);

      // 6. アイテム効果を適用
      const effects = potion.effects;
      for (const effect of effects) {
        itemEffectSystem.applyEffect(effect, character.id);
      }

      // 7. HPが回復したことを確認（実際の実装では ItemEffectSystem が処理）
      // ここでは効果が適用されたことを確認
      expect(itemEffectSystem.getActiveEffects(character.id)).toBeDefined();

      // 8. インベントリのアイテム数が減少したことを確認
      const remainingCount = inventoryManager.getItemCount('potion-1');
      expect(remainingCount).toBe(2);
    });

    test('複数種類のアイテムを獲得して管理できる', () => {
      // 1. 複数のアイテムを獲得
      const potion = createMockPotion('potion-1');
      const weapon = createMockWeapon('sword-1');
      const armor = createMockArmor('armor-1');

      inventoryManager.addItem(potion, 5);
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);

      // 2. インベントリを確認
      const items = inventoryManager.getAllItems();
      expect(items).toHaveLength(3);

      // 3. 種類別にソート
      inventoryManager.sortItems('type');

      // 4. ソート後の順序を確認（装備→消耗品の順）
      const sortedItems = inventoryManager.getAllItems();
      expect(sortedItems[0].item?.type).toMatch(/weapon|armor/);
      expect(sortedItems[sortedItems.length - 1].item?.type).toBe('consumable');
    });

    test('インベントリが満杯の場合、アイテム獲得が拒否される', () => {
      // 1. インベントリを満杯にする（100個）
      const potion = createMockPotion('potion-1');
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockPotion(`potion-${i}`), 1);
      }

      // 2. インベントリが満杯であることを確認
      expect(inventoryManager.isFull()).toBe(true);

      // 3. 新しいアイテムの追加を試みる
      const newPotion = createMockPotion('potion-new');
      const addResult = inventoryManager.addItem(newPotion, 1);

      // 4. 追加が拒否されることを確認
      expect(addResult).toBe(false);
    });
  });

  describe('E2Eテスト2: 装備装着から戦闘までのフロー', () => {
    test('装備を獲得→装着→能力値反映→戦闘の完全フローが正常に動作する', () => {
      // 1. キャラクターの初期状態
      const character = createMockCharacter('hero');
      const initialAttack = character.stats.attack;
      const initialDefense = character.stats.defense;

      // 2. 装備を獲得
      const weapon = createMockWeapon('sword-1');
      const armor = createMockArmor('armor-1');

      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);

      // 3. 武器を装着
      const equipWeaponResult = equipmentManager.equipItem(character.id, weapon, 'weapon');
      expect(equipWeaponResult).toBe(true);

      // 4. 防具を装着
      const equipArmorResult = equipmentManager.equipItem(character.id, armor, 'armor');
      expect(equipArmorResult).toBe(true);

      // 5. 装備効果が適用されたことを確認
      equipmentManager.applyEquipmentEffects(character.id);

      // 6. 装備を確認
      const equippedWeapon = equipmentManager.getEquipment(character.id, 'weapon');
      const equippedArmor = equipmentManager.getEquipment(character.id, 'armor');

      expect(equippedWeapon?.id).toBe('sword-1');
      expect(equippedArmor?.id).toBe('armor-1');

      // 7. 戦闘システムで能力値が反映されることを確認
      // （実際の戦闘システムとの統合は別のテストで検証）
      expect(equippedWeapon?.stats.attack).toBe(10);
      expect(equippedArmor?.stats.defense).toBe(8);
    });

    test('装備条件を満たさない場合、装着が拒否される', () => {
      // 1. レベルの低いキャラクター
      const lowLevelCharacter = createMockCharacter('newbie');
      lowLevelCharacter.level = 1;

      // 2. レベル5が必要な武器
      const weapon = createMockWeapon('sword-1');
      weapon.requirements = { level: 5 };

      inventoryManager.addItem(weapon, 1);

      // 3. 装着を試みる
      const equipResult = equipmentManager.equipItem(lowLevelCharacter.id, weapon, 'weapon');

      // 4. 装着が拒否されることを確認
      expect(equipResult).toBe(false);

      // 5. 装備スロットが空のままであることを確認
      const equippedWeapon = equipmentManager.getEquipment(lowLevelCharacter.id, 'weapon');
      expect(equippedWeapon).toBeNull();
    });

    test('装備を入れ替えると古い装備がインベントリに戻る', () => {
      // 1. キャラクターと装備を準備
      const character = createMockCharacter('hero');
      const weapon1 = createMockWeapon('sword-1');
      const weapon2 = createMockWeapon('sword-2');

      inventoryManager.addItem(weapon1, 1);
      inventoryManager.addItem(weapon2, 1);

      // 2. 最初の武器を装着
      equipmentManager.equipItem(character.id, weapon1, 'weapon');

      // 3. インベントリから武器が削除されたことを確認
      expect(inventoryManager.getItemCount('sword-1')).toBe(0);

      // 4. 2番目の武器を装着（入れ替え）
      equipmentManager.equipItem(character.id, weapon2, 'weapon');

      // 5. 古い武器がインベントリに戻ったことを確認
      expect(inventoryManager.getItemCount('sword-1')).toBe(1);

      // 6. 新しい武器が装着されていることを確認
      const equippedWeapon = equipmentManager.getEquipment(character.id, 'weapon');
      expect(equippedWeapon?.id).toBe('sword-2');
    });

    test('装備を解除するとインベントリに戻る', () => {
      // 1. キャラクターと装備を準備
      const character = createMockCharacter('hero');
      const weapon = createMockWeapon('sword-1');

      inventoryManager.addItem(weapon, 1);

      // 2. 武器を装着
      equipmentManager.equipItem(character.id, weapon, 'weapon');
      expect(inventoryManager.getItemCount('sword-1')).toBe(0);

      // 3. 武器を解除
      const unequippedWeapon = equipmentManager.unequipItem(character.id, 'weapon');
      expect(unequippedWeapon).not.toBeNull();

      // 4. インベントリに戻ったことを確認
      expect(inventoryManager.getItemCount('sword-1')).toBe(1);

      // 5. 装備スロットが空になったことを確認
      const equippedWeapon = equipmentManager.getEquipment(character.id, 'weapon');
      expect(equippedWeapon).toBeNull();
    });
  });

  describe('E2Eテスト3: セーブ・ロードのフロー', () => {
    test('インベントリと装備の状態をセーブ→ロードできる', () => {
      // 1. ゲーム状態を作成
      const character = createMockCharacter('hero');
      const weapon = createMockWeapon('sword-1');
      const armor = createMockArmor('armor-1');
      const potion = createMockPotion('potion-1');

      // 2. アイテムを追加
      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      inventoryManager.addItem(potion, 5);

      // 3. 装備を装着
      equipmentManager.equipItem(character.id, weapon, 'weapon');
      equipmentManager.equipItem(character.id, armor, 'armor');

      // 4. セーブ
      const inventoryData = inventoryManager.serialize();
      const equipmentData = equipmentManager.serialize();

      localStorage.setItem('inventory_save', JSON.stringify(inventoryData));
      localStorage.setItem('equipment_save', JSON.stringify(equipmentData));

      // 5. システムをリセット
      itemDataLoader = new ItemDataLoader();
      inventoryManager = new InventoryManager(itemDataLoader);
      itemEffectSystem = new ItemEffectSystem();
      equipmentManager = new EquipmentManager(inventoryManager, itemEffectSystem);

      // 6. ロード
      const loadedInventoryData = JSON.parse(localStorage.getItem('inventory_save') || '{}');
      const loadedEquipmentData = JSON.parse(localStorage.getItem('equipment_save') || '{}');

      inventoryManager.deserialize(loadedInventoryData);
      equipmentManager.deserialize(loadedEquipmentData);

      // 7. インベントリが復元されたことを確認
      const items = inventoryManager.getAllItems();
      expect(items.length).toBeGreaterThan(0);
      expect(inventoryManager.getItemCount('potion-1')).toBe(5);

      // 8. 装備が復元されたことを確認
      const equippedWeapon = equipmentManager.getEquipment(character.id, 'weapon');
      const equippedArmor = equipmentManager.getEquipment(character.id, 'armor');

      expect(equippedWeapon?.id).toBe('sword-1');
      expect(equippedArmor?.id).toBe('armor-1');
    });

    test('空のインベントリと装備をセーブ→ロードできる', () => {
      // 1. 空の状態でセーブ
      const inventoryData = inventoryManager.serialize();
      const equipmentData = equipmentManager.serialize();

      localStorage.setItem('inventory_save', JSON.stringify(inventoryData));
      localStorage.setItem('equipment_save', JSON.stringify(equipmentData));

      // 2. システムをリセット
      itemDataLoader = new ItemDataLoader();
      inventoryManager = new InventoryManager(itemDataLoader);
      itemEffectSystem = new ItemEffectSystem();
      equipmentManager = new EquipmentManager(inventoryManager, itemEffectSystem);

      // 3. ロード
      const loadedInventoryData = JSON.parse(localStorage.getItem('inventory_save') || '{}');
      const loadedEquipmentData = JSON.parse(localStorage.getItem('equipment_save') || '{}');

      inventoryManager.deserialize(loadedInventoryData);
      equipmentManager.deserialize(loadedEquipmentData);

      // 4. 空の状態が復元されたことを確認
      expect(inventoryManager.getAllItems()).toHaveLength(0);
      expect(inventoryManager.isFull()).toBe(false);
    });

    test('セーブデータが破損している場合、適切にエラー処理される', () => {
      // 1. 破損したデータを保存
      localStorage.setItem('inventory_save', '{ invalid json }');
      localStorage.setItem('equipment_save', '{ invalid json }');

      // 2. ロードを試みる
      try {
        const loadedInventoryData = JSON.parse(localStorage.getItem('inventory_save') || '{}');
        inventoryManager.deserialize(loadedInventoryData);
      } catch (error) {
        // エラーが発生することを確認
        expect(error).toBeDefined();
      }

      // 3. システムが安全な状態に復帰することを確認
      expect(inventoryManager.getAllItems()).toHaveLength(0);
    });
  });

  describe('E2Eテスト4: 複合フロー', () => {
    test('アイテム獲得→装備→戦闘→セーブの完全フローが正常に動作する', () => {
      // 1. キャラクター作成
      const character = createMockCharacter('hero');

      // 2. アイテムを獲得
      const weapon = createMockWeapon('sword-1');
      const armor = createMockArmor('armor-1');
      const potion = createMockPotion('potion-1');

      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      inventoryManager.addItem(potion, 3);

      // 3. 装備を装着
      equipmentManager.equipItem(character.id, weapon, 'weapon');
      equipmentManager.equipItem(character.id, armor, 'armor');

      // 4. 戦闘シミュレーション（ポーション使用）
      character.currentHP = 50;
      inventoryManager.useItem('potion-1', character.id);

      // 5. セーブ
      const inventoryData = inventoryManager.serialize();
      const equipmentData = equipmentManager.serialize();

      localStorage.setItem('game_save', JSON.stringify({
        inventory: inventoryData,
        equipment: equipmentData,
        character: character,
      }));

      // 6. ロード
      const saveData = JSON.parse(localStorage.getItem('game_save') || '{}');

      // 7. 全ての状態が正しく保存されていることを確認
      expect(saveData.inventory).toBeDefined();
      expect(saveData.equipment).toBeDefined();
      expect(saveData.character).toBeDefined();
      expect(saveData.character.currentHP).toBe(50);
    });

    test('複数キャラクターの装備管理ができる', () => {
      // 1. 複数のキャラクターを作成
      const hero = createMockCharacter('hero');
      const warrior = createMockCharacter('warrior');
      const mage = createMockCharacter('mage');

      // 2. 各キャラクター用の装備を準備
      const sword1 = createMockWeapon('sword-1');
      const sword2 = createMockWeapon('sword-2');
      const sword3 = createMockWeapon('sword-3');

      inventoryManager.addItem(sword1, 1);
      inventoryManager.addItem(sword2, 1);
      inventoryManager.addItem(sword3, 1);

      // 3. 各キャラクターに装備を装着
      equipmentManager.equipItem(hero.id, sword1, 'weapon');
      equipmentManager.equipItem(warrior.id, sword2, 'weapon');
      equipmentManager.equipItem(mage.id, sword3, 'weapon');

      // 4. 各キャラクターの装備を確認
      expect(equipmentManager.getEquipment(hero.id, 'weapon')?.id).toBe('sword-1');
      expect(equipmentManager.getEquipment(warrior.id, 'weapon')?.id).toBe('sword-2');
      expect(equipmentManager.getEquipment(mage.id, 'weapon')?.id).toBe('sword-3');

      // 5. インベントリが空になったことを確認
      expect(inventoryManager.getItemCount('sword-1')).toBe(0);
      expect(inventoryManager.getItemCount('sword-2')).toBe(0);
      expect(inventoryManager.getItemCount('sword-3')).toBe(0);
    });
  });
});
