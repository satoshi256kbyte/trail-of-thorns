/**
 * インベントリ・装備システム型定義のテスト
 */

import {
  ItemType,
  ItemRarity,
  EquipmentSlotType,
  ConsumableType,
  TargetType,
  EffectType,
  EffectTarget,
  ItemSortType,
  Item,
  EquipmentStats,
  EquipmentRequirements,
  ItemEffect,
  Equipment,
  Consumable,
  InventorySlot,
  EquipmentSet,
  InventoryData,
  ItemDefinition,
  EquipmentCheckResult,
  ItemUseResult,
  InventoryOperationResult,
  EquipmentOperationResult,
  InventoryTypeValidators,
  InventoryUtils,
} from '../../../game/src/types/inventory';

describe('Inventory System Types', () => {
  describe('Enums', () => {
    test('ItemType should have all required values', () => {
      expect(ItemType.WEAPON).toBe('weapon');
      expect(ItemType.ARMOR).toBe('armor');
      expect(ItemType.ACCESSORY).toBe('accessory');
      expect(ItemType.CONSUMABLE).toBe('consumable');
      expect(ItemType.MATERIAL).toBe('material');
      expect(ItemType.KEY).toBe('key');
    });

    test('ItemRarity should have all required values', () => {
      expect(ItemRarity.COMMON).toBe('common');
      expect(ItemRarity.UNCOMMON).toBe('uncommon');
      expect(ItemRarity.RARE).toBe('rare');
      expect(ItemRarity.EPIC).toBe('epic');
      expect(ItemRarity.LEGENDARY).toBe('legendary');
    });

    test('EquipmentSlotType should have all required values', () => {
      expect(EquipmentSlotType.WEAPON).toBe('weapon');
      expect(EquipmentSlotType.ARMOR).toBe('armor');
      expect(EquipmentSlotType.ACCESSORY1).toBe('accessory1');
      expect(EquipmentSlotType.ACCESSORY2).toBe('accessory2');
    });

    test('ConsumableType should have all required values', () => {
      expect(ConsumableType.HEALING).toBe('healing');
      expect(ConsumableType.BUFF).toBe('buff');
      expect(ConsumableType.DEBUFF).toBe('debuff');
      expect(ConsumableType.CURE).toBe('cure');
      expect(ConsumableType.REVIVE).toBe('revive');
    });

    test('TargetType should have all required values', () => {
      expect(TargetType.SELF).toBe('self');
      expect(TargetType.SINGLE).toBe('single');
      expect(TargetType.ALL).toBe('all');
      expect(TargetType.AREA).toBe('area');
    });

    test('EffectType should have all required values', () => {
      expect(EffectType.STAT_BOOST).toBe('stat_boost');
      expect(EffectType.STAT_REDUCTION).toBe('stat_reduction');
      expect(EffectType.HP_RECOVERY).toBe('hp_recovery');
      expect(EffectType.MP_RECOVERY).toBe('mp_recovery');
      expect(EffectType.STATUS_CURE).toBe('status_cure');
      expect(EffectType.STATUS_INFLICT).toBe('status_inflict');
      expect(EffectType.DAMAGE).toBe('damage');
      expect(EffectType.SHIELD).toBe('shield');
    });

    test('EffectTarget should have all required values', () => {
      expect(EffectTarget.HP).toBe('hp');
      expect(EffectTarget.MP).toBe('mp');
      expect(EffectTarget.ATTACK).toBe('attack');
      expect(EffectTarget.DEFENSE).toBe('defense');
      expect(EffectTarget.SPEED).toBe('speed');
      expect(EffectTarget.ACCURACY).toBe('accuracy');
      expect(EffectTarget.EVASION).toBe('evasion');
      expect(EffectTarget.STATUS).toBe('status');
    });

    test('ItemSortType should have all required values', () => {
      expect(ItemSortType.TYPE).toBe('type');
      expect(ItemSortType.RARITY).toBe('rarity');
      expect(ItemSortType.NAME).toBe('name');
      expect(ItemSortType.QUANTITY).toBe('quantity');
    });
  });

  describe('Basic Type Structures', () => {
    test('Item should have all required properties', () => {
      const item: Item = {
        id: 'item_001',
        name: 'テストアイテム',
        description: 'テスト用のアイテムです',
        type: ItemType.MATERIAL,
        rarity: ItemRarity.COMMON,
        iconPath: 'assets/items/test.png',
        maxStack: 99,
        sellPrice: 10,
        buyPrice: 20,
      };

      expect(typeof item.id).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(Object.values(ItemType)).toContain(item.type);
      expect(Object.values(ItemRarity)).toContain(item.rarity);
      expect(typeof item.iconPath).toBe('string');
      expect(typeof item.maxStack).toBe('number');
      expect(typeof item.sellPrice).toBe('number');
      expect(typeof item.buyPrice).toBe('number');
    });

    test('EquipmentStats should have all optional properties', () => {
      const stats: EquipmentStats = {
        hp: 10,
        mp: 5,
        attack: 8,
        defense: 6,
        speed: 3,
        accuracy: 4,
        evasion: 2,
      };

      expect(typeof stats.hp).toBe('number');
      expect(typeof stats.mp).toBe('number');
      expect(typeof stats.attack).toBe('number');
      expect(typeof stats.defense).toBe('number');
      expect(typeof stats.speed).toBe('number');
      expect(typeof stats.accuracy).toBe('number');
      expect(typeof stats.evasion).toBe('number');
    });

    test('EquipmentRequirements should have all optional properties', () => {
      const requirements: EquipmentRequirements = {
        level: 10,
        job: 'warrior',
        stats: {
          attack: 15,
          defense: 10,
        },
      };

      expect(typeof requirements.level).toBe('number');
      expect(typeof requirements.job).toBe('string');
      expect(typeof requirements.stats).toBe('object');
    });

    test('ItemEffect should have all required properties', () => {
      const effect: ItemEffect = {
        id: 'effect_001',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 50,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      expect(typeof effect.id).toBe('string');
      expect(Object.values(EffectType)).toContain(effect.type);
      expect(Object.values(EffectTarget)).toContain(effect.target);
      expect(typeof effect.value).toBe('number');
      expect(typeof effect.duration).toBe('number');
      expect(typeof effect.isPermanent).toBe('boolean');
      expect(typeof effect.stackable).toBe('boolean');
    });
  });

  describe('Complex Type Structures', () => {
    test('Equipment should have all required properties', () => {
      const equipment: Equipment = {
        id: 'sword_001',
        name: '鉄の剣',
        description: '基本的な鉄製の剣',
        type: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        iconPath: 'assets/weapons/iron_sword.png',
        maxStack: 1,
        sellPrice: 100,
        buyPrice: 200,
        slot: EquipmentSlotType.WEAPON,
        stats: {
          attack: 10,
          accuracy: 5,
        },
        requirements: {
          level: 5,
        },
        durability: 100,
        maxDurability: 100,
        effects: [],
      };

      expect(typeof equipment.id).toBe('string');
      expect([ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY]).toContain(equipment.type);
      expect(Object.values(EquipmentSlotType)).toContain(equipment.slot);
      expect(typeof equipment.stats).toBe('object');
      expect(typeof equipment.requirements).toBe('object');
      expect(typeof equipment.durability).toBe('number');
      expect(typeof equipment.maxDurability).toBe('number');
      expect(Array.isArray(equipment.effects)).toBe(true);
    });

    test('Consumable should have all required properties', () => {
      const consumable: Consumable = {
        id: 'potion_001',
        name: '回復薬',
        description: 'HPを50回復する',
        type: ItemType.CONSUMABLE,
        rarity: ItemRarity.COMMON,
        iconPath: 'assets/items/potion.png',
        maxStack: 99,
        sellPrice: 25,
        buyPrice: 50,
        consumableType: ConsumableType.HEALING,
        effects: [
          {
            id: 'heal_effect',
            type: EffectType.HP_RECOVERY,
            target: EffectTarget.HP,
            value: 50,
            duration: 0,
            isPermanent: true,
            stackable: false,
          },
        ],
        usableInBattle: true,
        targetType: TargetType.SINGLE,
      };

      expect(consumable.type).toBe(ItemType.CONSUMABLE);
      expect(Object.values(ConsumableType)).toContain(consumable.consumableType);
      expect(Array.isArray(consumable.effects)).toBe(true);
      expect(typeof consumable.usableInBattle).toBe('boolean');
      expect(Object.values(TargetType)).toContain(consumable.targetType);
    });

    test('InventorySlot should have all required properties', () => {
      const slot: InventorySlot = {
        slotIndex: 0,
        item: {
          id: 'item_001',
          name: 'テストアイテム',
          description: 'テスト用',
          type: ItemType.MATERIAL,
          rarity: ItemRarity.COMMON,
          iconPath: 'test.png',
          maxStack: 99,
          sellPrice: 10,
          buyPrice: 20,
        },
        quantity: 5,
        isEmpty: false,
      };

      expect(typeof slot.slotIndex).toBe('number');
      expect(slot.item !== null || slot.isEmpty).toBe(true);
      expect(typeof slot.quantity).toBe('number');
      expect(typeof slot.isEmpty).toBe('boolean');
    });

    test('EquipmentSet should have all required properties', () => {
      const equipmentSet: EquipmentSet = {
        weapon: null,
        armor: null,
        accessory1: null,
        accessory2: null,
      };

      expect('weapon' in equipmentSet).toBe(true);
      expect('armor' in equipmentSet).toBe(true);
      expect('accessory1' in equipmentSet).toBe(true);
      expect('accessory2' in equipmentSet).toBe(true);
    });

    test('InventoryData should have all required properties', () => {
      const inventoryData: InventoryData = {
        slots: Array.from({ length: 100 }, (_, i) => ({
          slotIndex: i,
          item: null,
          quantity: 0,
          isEmpty: true,
        })),
        maxSlots: 100,
        usedSlots: 0,
        gold: 1000,
      };

      expect(Array.isArray(inventoryData.slots)).toBe(true);
      expect(typeof inventoryData.maxSlots).toBe('number');
      expect(typeof inventoryData.usedSlots).toBe('number');
      expect(typeof inventoryData.gold).toBe('number');
      expect(inventoryData.slots.length).toBe(inventoryData.maxSlots);
    });
  });

  describe('Result Types', () => {
    test('EquipmentCheckResult should have all required properties', () => {
      const result: EquipmentCheckResult = {
        canEquip: false,
        failureReasons: ['レベル不足', '職業不一致'],
        missingRequirements: {
          level: 5,
          job: 'warrior',
        },
      };

      expect(typeof result.canEquip).toBe('boolean');
      expect(Array.isArray(result.failureReasons)).toBe(true);
      expect(typeof result.missingRequirements).toBe('object');
    });

    test('ItemUseResult should have all required properties', () => {
      const result: ItemUseResult = {
        success: true,
        effectsApplied: [],
        itemConsumed: true,
        remainingQuantity: 4,
        message: 'HPを50回復しました',
      };

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.effectsApplied)).toBe(true);
      expect(typeof result.itemConsumed).toBe('boolean');
      expect(typeof result.remainingQuantity).toBe('number');
      expect(typeof result.message).toBe('string');
    });

    test('InventoryOperationResult should have all required properties', () => {
      const result: InventoryOperationResult = {
        success: true,
        message: 'アイテムを追加しました',
        affectedSlots: [0, 1],
        newQuantity: 10,
      };

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(Array.isArray(result.affectedSlots)).toBe(true);
    });

    test('EquipmentOperationResult should have all required properties', () => {
      const result: EquipmentOperationResult = {
        success: true,
        message: '装備を変更しました',
        previousEquipment: null,
        newEquipment: null,
        statsChanged: {
          attack: 10,
          defense: 5,
        },
      };

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.statsChanged).toBe('object');
    });
  });

  describe('Type Validators', () => {
    test('isValidItem should validate item structure', () => {
      const validItem: Item = {
        id: 'item_001',
        name: 'テストアイテム',
        description: 'テスト用',
        type: ItemType.MATERIAL,
        rarity: ItemRarity.COMMON,
        iconPath: 'test.png',
        maxStack: 99,
        sellPrice: 10,
        buyPrice: 20,
      };

      expect(InventoryTypeValidators.isValidItem(validItem)).toBe(true);
      expect(InventoryTypeValidators.isValidItem(null)).toBe(false);
      expect(InventoryTypeValidators.isValidItem({})).toBe(false);
    });

    test('isValidEquipment should validate equipment structure', () => {
      const validEquipment: Equipment = {
        id: 'sword_001',
        name: '鉄の剣',
        description: '基本的な剣',
        type: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        iconPath: 'sword.png',
        maxStack: 1,
        sellPrice: 100,
        buyPrice: 200,
        slot: EquipmentSlotType.WEAPON,
        stats: { attack: 10 },
        requirements: {},
        durability: 100,
        maxDurability: 100,
        effects: [],
      };

      expect(InventoryTypeValidators.isValidEquipment(validEquipment)).toBe(true);
    });

    test('isValidConsumable should validate consumable structure', () => {
      const validConsumable: Consumable = {
        id: 'potion_001',
        name: '回復薬',
        description: 'HP回復',
        type: ItemType.CONSUMABLE,
        rarity: ItemRarity.COMMON,
        iconPath: 'potion.png',
        maxStack: 99,
        sellPrice: 25,
        buyPrice: 50,
        consumableType: ConsumableType.HEALING,
        effects: [],
        usableInBattle: true,
        targetType: TargetType.SINGLE,
      };

      expect(InventoryTypeValidators.isValidConsumable(validConsumable)).toBe(true);
    });

    test('isValidItemEffect should validate effect structure', () => {
      const validEffect: ItemEffect = {
        id: 'effect_001',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 50,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      expect(InventoryTypeValidators.isValidItemEffect(validEffect)).toBe(true);
      expect(InventoryTypeValidators.isValidItemEffect(null)).toBe(false);
    });

    test('isValidInventorySlot should validate slot structure', () => {
      const validSlot: InventorySlot = {
        slotIndex: 0,
        item: null,
        quantity: 0,
        isEmpty: true,
      };

      expect(InventoryTypeValidators.isValidInventorySlot(validSlot)).toBe(true);
    });

    test('isValidEquipmentSet should validate equipment set structure', () => {
      const validSet: EquipmentSet = {
        weapon: null,
        armor: null,
        accessory1: null,
        accessory2: null,
      };

      expect(InventoryTypeValidators.isValidEquipmentSet(validSet)).toBe(true);
    });

    test('isValidInventoryData should validate inventory data structure', () => {
      const validData: InventoryData = {
        slots: Array.from({ length: 100 }, (_, i) => ({
          slotIndex: i,
          item: null,
          quantity: 0,
          isEmpty: true,
        })),
        maxSlots: 100,
        usedSlots: 0,
        gold: 1000,
      };

      expect(InventoryTypeValidators.isValidInventoryData(validData)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('calculateTotalStats should sum equipment stats', () => {
      const equipmentSet: EquipmentSet = {
        weapon: {
          id: 'sword',
          name: '剣',
          description: '',
          type: ItemType.WEAPON,
          rarity: ItemRarity.COMMON,
          iconPath: '',
          maxStack: 1,
          sellPrice: 0,
          buyPrice: 0,
          slot: EquipmentSlotType.WEAPON,
          stats: { attack: 10, accuracy: 5 },
          requirements: {},
          durability: 100,
          maxDurability: 100,
          effects: [],
        },
        armor: {
          id: 'armor',
          name: '鎧',
          description: '',
          type: ItemType.ARMOR,
          rarity: ItemRarity.COMMON,
          iconPath: '',
          maxStack: 1,
          sellPrice: 0,
          buyPrice: 0,
          slot: EquipmentSlotType.ARMOR,
          stats: { defense: 15, hp: 20 },
          requirements: {},
          durability: 100,
          maxDurability: 100,
          effects: [],
        },
        accessory1: null,
        accessory2: null,
      };

      const totalStats = InventoryUtils.calculateTotalStats(equipmentSet);

      expect(totalStats.attack).toBe(10);
      expect(totalStats.defense).toBe(15);
      expect(totalStats.hp).toBe(20);
      expect(totalStats.accuracy).toBe(5);
    });

    test('getRarityColor should return correct colors', () => {
      expect(InventoryUtils.getRarityColor(ItemRarity.COMMON)).toBe('#FFFFFF');
      expect(InventoryUtils.getRarityColor(ItemRarity.UNCOMMON)).toBe('#1EFF00');
      expect(InventoryUtils.getRarityColor(ItemRarity.RARE)).toBe('#0070DD');
      expect(InventoryUtils.getRarityColor(ItemRarity.EPIC)).toBe('#A335EE');
      expect(InventoryUtils.getRarityColor(ItemRarity.LEGENDARY)).toBe('#FF8000');
    });

    test('createEmptySlot should create valid empty slot', () => {
      const slot = InventoryUtils.createEmptySlot(5);

      expect(slot.slotIndex).toBe(5);
      expect(slot.item).toBeNull();
      expect(slot.quantity).toBe(0);
      expect(slot.isEmpty).toBe(true);
    });

    test('createEmptyEquipmentSet should create valid empty set', () => {
      const set = InventoryUtils.createEmptyEquipmentSet();

      expect(set.weapon).toBeNull();
      expect(set.armor).toBeNull();
      expect(set.accessory1).toBeNull();
      expect(set.accessory2).toBeNull();
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle items with zero prices', () => {
      const item: Item = {
        id: 'free_item',
        name: '無料アイテム',
        description: '価格が0のアイテム',
        type: ItemType.KEY,
        rarity: ItemRarity.COMMON,
        iconPath: 'key.png',
        maxStack: 1,
        sellPrice: 0,
        buyPrice: 0,
      };

      expect(InventoryTypeValidators.isValidItem(item)).toBe(true);
    });

    test('should handle equipment with zero durability', () => {
      const equipment: Equipment = {
        id: 'broken_sword',
        name: '壊れた剣',
        description: '耐久度が0の剣',
        type: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        iconPath: 'broken.png',
        maxStack: 1,
        sellPrice: 1,
        buyPrice: 1,
        slot: EquipmentSlotType.WEAPON,
        stats: {},
        requirements: {},
        durability: 0,
        maxDurability: 100,
        effects: [],
      };

      expect(InventoryTypeValidators.isValidEquipment(equipment)).toBe(true);
    });

    test('should handle empty inventory', () => {
      const emptyInventory: InventoryData = {
        slots: Array.from({ length: 100 }, (_, i) =>
          InventoryUtils.createEmptySlot(i)
        ),
        maxSlots: 100,
        usedSlots: 0,
        gold: 0,
      };

      expect(InventoryTypeValidators.isValidInventoryData(emptyInventory)).toBe(true);
    });

    test('should handle maximum stack size', () => {
      const item: Item = {
        id: 'stackable',
        name: 'スタック可能アイテム',
        description: '最大99個まで',
        type: ItemType.MATERIAL,
        rarity: ItemRarity.COMMON,
        iconPath: 'material.png',
        maxStack: 99,
        sellPrice: 1,
        buyPrice: 2,
      };

      expect(item.maxStack).toBe(99);
      expect(InventoryTypeValidators.isValidItem(item)).toBe(true);
    });

    test('should handle equipment with no requirements', () => {
      const equipment: Equipment = {
        id: 'basic_item',
        name: '基本装備',
        description: '要件なし',
        type: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        iconPath: 'basic.png',
        maxStack: 1,
        sellPrice: 10,
        buyPrice: 20,
        slot: EquipmentSlotType.WEAPON,
        stats: { attack: 5 },
        requirements: {},
        durability: 50,
        maxDurability: 50,
        effects: [],
      };

      expect(InventoryTypeValidators.isValidEquipment(equipment)).toBe(true);
    });
  });
});
