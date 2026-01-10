/**
 * Item Data Validation Tests
 * Tests for validating item data JSON files against schema and business rules
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import {
  ItemType,
  ItemRarity,
  EquipmentSlotType,
  ConsumableType,
  TargetType,
  EffectType,
  EffectTarget,
  InventoryTypeValidators,
} from '../../../game/src/types/inventory';

describe('Item Data Validation', () => {
  const itemDataPath = path.join(process.cwd(), 'data', 'items.json');
  const schemaPath = path.join(process.cwd(), 'data', 'schemas', 'item-schema.json');

  let itemData: any;
  let schema: any;
  let ajv: Ajv;

  // Load data files before tests
  try {
    const itemDataContent = fs.readFileSync(itemDataPath, 'utf-8');
    itemData = JSON.parse(itemDataContent);

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);

    ajv = new Ajv({ allErrors: true });
  } catch (error) {
    console.error('Failed to load data files:', error);
  }

  describe('File Existence', () => {
    test('items.json should exist', () => {
      expect(fs.existsSync(itemDataPath)).toBe(true);
    });

    test('item-schema.json should exist', () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    test('items.json should be valid JSON', () => {
      expect(() => JSON.parse(fs.readFileSync(itemDataPath, 'utf-8'))).not.toThrow();
    });

    test('item-schema.json should be valid JSON', () => {
      expect(() => JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))).not.toThrow();
    });
  });

  describe('JSON Schema Validation', () => {
    test('items.json should conform to item-schema.json', () => {
      const validate = ajv.compile(schema);
      const valid = validate(itemData);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    test('schema should have all required definitions', () => {
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.baseItem).toBeDefined();
      expect(schema.definitions.equipment).toBeDefined();
      expect(schema.definitions.consumable).toBeDefined();
      expect(schema.definitions.equipmentStats).toBeDefined();
      expect(schema.definitions.equipmentRequirements).toBeDefined();
      expect(schema.definitions.itemEffect).toBeDefined();
    });
  });

  describe('Data Structure Validation', () => {
    test('should have all item categories', () => {
      expect(itemData.weapons).toBeDefined();
      expect(itemData.armor).toBeDefined();
      expect(itemData.accessories).toBeDefined();
      expect(itemData.consumables).toBeDefined();
      expect(itemData.materials).toBeDefined();
      expect(itemData.key_items).toBeDefined();
    });

    test('all categories should be arrays', () => {
      expect(Array.isArray(itemData.weapons)).toBe(true);
      expect(Array.isArray(itemData.armor)).toBe(true);
      expect(Array.isArray(itemData.accessories)).toBe(true);
      expect(Array.isArray(itemData.consumables)).toBe(true);
      expect(Array.isArray(itemData.materials)).toBe(true);
      expect(Array.isArray(itemData.key_items)).toBe(true);
    });

    test('should have at least one item in each category', () => {
      expect(itemData.weapons.length).toBeGreaterThan(0);
      expect(itemData.armor.length).toBeGreaterThan(0);
      expect(itemData.accessories.length).toBeGreaterThan(0);
      expect(itemData.consumables.length).toBeGreaterThan(0);
    });
  });

  describe('Item ID Uniqueness', () => {
    test('all item IDs should be unique across all categories', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
        ...itemData.materials,
        ...itemData.key_items,
      ];

      const ids = allItems.map((item: any) => item.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    test('item IDs should follow naming convention', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
        ...itemData.materials,
        ...itemData.key_items,
      ];

      const idPattern = /^[a-z_]+$/;

      allItems.forEach((item: any) => {
        expect(item.id).toMatch(idPattern);
      });
    });
  });

  describe('Weapon Validation', () => {
    test('all weapons should have valid equipment structure', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(InventoryTypeValidators.isValidEquipment(weapon)).toBe(true);
      });
    });

    test('all weapons should have weapon type', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(weapon.type).toBe(ItemType.WEAPON);
      });
    });

    test('all weapons should have weapon slot', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(weapon.slot).toBe(EquipmentSlotType.WEAPON);
      });
    });

    test('weapon durability should not exceed maxDurability', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(weapon.durability).toBeLessThanOrEqual(weapon.maxDurability);
        expect(weapon.durability).toBeGreaterThanOrEqual(0);
      });
    });

    test('weapon stats should be valid', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(InventoryTypeValidators.isValidEquipmentStats(weapon.stats)).toBe(true);
      });
    });
  });

  describe('Armor Validation', () => {
    test('all armor should have valid equipment structure', () => {
      itemData.armor.forEach((armor: any) => {
        expect(InventoryTypeValidators.isValidEquipment(armor)).toBe(true);
      });
    });

    test('all armor should have armor type', () => {
      itemData.armor.forEach((armor: any) => {
        expect(armor.type).toBe(ItemType.ARMOR);
      });
    });

    test('all armor should have armor slot', () => {
      itemData.armor.forEach((armor: any) => {
        expect(armor.slot).toBe(EquipmentSlotType.ARMOR);
      });
    });

    test('armor should provide defense bonus', () => {
      itemData.armor.forEach((armor: any) => {
        expect(armor.stats.defense).toBeDefined();
        expect(armor.stats.defense).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessory Validation', () => {
    test('all accessories should have valid equipment structure', () => {
      itemData.accessories.forEach((accessory: any) => {
        expect(InventoryTypeValidators.isValidEquipment(accessory)).toBe(true);
      });
    });

    test('all accessories should have accessory type', () => {
      itemData.accessories.forEach((accessory: any) => {
        expect(accessory.type).toBe(ItemType.ACCESSORY);
      });
    });

    test('all accessories should have valid accessory slot', () => {
      itemData.accessories.forEach((accessory: any) => {
        expect([EquipmentSlotType.ACCESSORY1, EquipmentSlotType.ACCESSORY2]).toContain(
          accessory.slot
        );
      });
    });
  });

  describe('Consumable Validation', () => {
    test('all consumables should have valid consumable structure', () => {
      itemData.consumables.forEach((consumable: any) => {
        expect(InventoryTypeValidators.isValidConsumable(consumable)).toBe(true);
      });
    });

    test('all consumables should have consumable type', () => {
      itemData.consumables.forEach((consumable: any) => {
        expect(consumable.type).toBe(ItemType.CONSUMABLE);
      });
    });

    test('all consumables should have valid consumableType', () => {
      const validTypes = Object.values(ConsumableType);

      itemData.consumables.forEach((consumable: any) => {
        expect(validTypes).toContain(consumable.consumableType);
      });
    });

    test('all consumables should have at least one effect', () => {
      itemData.consumables.forEach((consumable: any) => {
        expect(consumable.effects.length).toBeGreaterThan(0);
      });
    });

    test('all consumables should have valid targetType', () => {
      const validTargets = Object.values(TargetType);

      itemData.consumables.forEach((consumable: any) => {
        expect(validTargets).toContain(consumable.targetType);
      });
    });

    test('consumables should be stackable', () => {
      itemData.consumables.forEach((consumable: any) => {
        expect(consumable.maxStack).toBeGreaterThan(1);
      });
    });
  });

  describe('Item Effect Validation', () => {
    test('all item effects should be valid', () => {
      const allItems = [...itemData.weapons, ...itemData.armor, ...itemData.accessories];

      allItems.forEach((item: any) => {
        if (item.effects && item.effects.length > 0) {
          item.effects.forEach((effect: any) => {
            expect(InventoryTypeValidators.isValidItemEffect(effect)).toBe(true);
          });
        }
      });
    });

    test('effect types should be valid', () => {
      const validTypes = Object.values(EffectType);
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
      ];

      allItems.forEach((item: any) => {
        if (item.effects && item.effects.length > 0) {
          item.effects.forEach((effect: any) => {
            expect(validTypes).toContain(effect.type);
          });
        }
      });
    });

    test('effect targets should be valid', () => {
      const validTargets = Object.values(EffectTarget);
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
      ];

      allItems.forEach((item: any) => {
        if (item.effects && item.effects.length > 0) {
          item.effects.forEach((effect: any) => {
            expect(validTargets).toContain(effect.target);
          });
        }
      });
    });

    test('effect durations should be non-negative', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
      ];

      allItems.forEach((item: any) => {
        if (item.effects && item.effects.length > 0) {
          item.effects.forEach((effect: any) => {
            expect(effect.duration).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });
  });

  describe('Equipment Requirements Validation', () => {
    test('all equipment requirements should be valid', () => {
      const allEquipment = [...itemData.weapons, ...itemData.armor, ...itemData.accessories];

      allEquipment.forEach((equipment: any) => {
        expect(InventoryTypeValidators.isValidEquipmentRequirements(equipment.requirements)).toBe(
          true
        );
      });
    });

    test('level requirements should be reasonable', () => {
      const allEquipment = [...itemData.weapons, ...itemData.armor, ...itemData.accessories];

      allEquipment.forEach((equipment: any) => {
        if (equipment.requirements.level) {
          expect(equipment.requirements.level).toBeGreaterThan(0);
          expect(equipment.requirements.level).toBeLessThanOrEqual(99);
        }
      });
    });
  });

  describe('Rarity Distribution', () => {
    test('should have items of all rarity levels', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
      ];

      const rarities = new Set(allItems.map((item: any) => item.rarity));

      expect(rarities.has(ItemRarity.COMMON)).toBe(true);
      expect(rarities.has(ItemRarity.UNCOMMON)).toBe(true);
      expect(rarities.has(ItemRarity.RARE)).toBe(true);
    });

    test('rarity should match item power level', () => {
      // Legendary items should have higher stats
      const legendaryWeapons = itemData.weapons.filter(
        (w: any) => w.rarity === ItemRarity.LEGENDARY
      );

      legendaryWeapons.forEach((weapon: any) => {
        expect(weapon.stats.attack).toBeGreaterThan(30);
      });
    });
  });

  describe('Price Validation', () => {
    test('buy price should be higher than sell price', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
        ...itemData.materials,
      ];

      allItems.forEach((item: any) => {
        if (item.buyPrice > 0) {
          expect(item.buyPrice).toBeGreaterThanOrEqual(item.sellPrice);
        }
      });
    });

    test('higher rarity items should be more expensive', () => {
      const rarityOrder = [
        ItemRarity.COMMON,
        ItemRarity.UNCOMMON,
        ItemRarity.RARE,
        ItemRarity.EPIC,
        ItemRarity.LEGENDARY,
      ];

      const weapons = itemData.weapons;
      const commonWeapons = weapons.filter((w: any) => w.rarity === ItemRarity.COMMON);
      const legendaryWeapons = weapons.filter((w: any) => w.rarity === ItemRarity.LEGENDARY);

      if (commonWeapons.length > 0 && legendaryWeapons.length > 0) {
        const avgCommonPrice =
          commonWeapons.reduce((sum: number, w: any) => sum + w.buyPrice, 0) /
          commonWeapons.length;
        const avgLegendaryPrice =
          legendaryWeapons.reduce((sum: number, w: any) => sum + w.buyPrice, 0) /
          legendaryWeapons.length;

        expect(avgLegendaryPrice).toBeGreaterThan(avgCommonPrice);
      }
    });
  });

  describe('Icon Path Validation', () => {
    test('all items should have icon paths', () => {
      const allItems = [
        ...itemData.weapons,
        ...itemData.armor,
        ...itemData.accessories,
        ...itemData.consumables,
        ...itemData.materials,
        ...itemData.key_items,
      ];

      allItems.forEach((item: any) => {
        expect(item.iconPath).toBeDefined();
        expect(item.iconPath).toMatch(/^assets\/items\//);
      });
    });

    test('icon paths should match item categories', () => {
      itemData.weapons.forEach((weapon: any) => {
        expect(weapon.iconPath).toMatch(/^assets\/items\/weapons\//);
      });

      itemData.armor.forEach((armor: any) => {
        expect(armor.iconPath).toMatch(/^assets\/items\/armor\//);
      });

      itemData.accessories.forEach((accessory: any) => {
        expect(accessory.iconPath).toMatch(/^assets\/items\/accessories\//);
      });

      itemData.consumables.forEach((consumable: any) => {
        expect(consumable.iconPath).toMatch(/^assets\/items\/consumables\//);
      });
    });
  });

  describe('Data Integrity', () => {
    test('should have balanced item distribution', () => {
      expect(itemData.weapons.length).toBeGreaterThanOrEqual(3);
      expect(itemData.armor.length).toBeGreaterThanOrEqual(3);
      expect(itemData.accessories.length).toBeGreaterThanOrEqual(3);
      expect(itemData.consumables.length).toBeGreaterThanOrEqual(5);
    });

    test('should have variety in item effects', () => {
      const allEffects = [
        ...itemData.weapons.flatMap((w: any) => w.effects),
        ...itemData.armor.flatMap((a: any) => a.effects),
        ...itemData.consumables.flatMap((c: any) => c.effects),
      ];

      const effectTypes = new Set(allEffects.map((e: any) => e.type));

      expect(effectTypes.size).toBeGreaterThan(3);
    });

    test('should have items for different level ranges', () => {
      const allEquipment = [...itemData.weapons, ...itemData.armor, ...itemData.accessories];

      const lowLevelItems = allEquipment.filter(
        (e: any) => !e.requirements.level || e.requirements.level <= 5
      );
      const midLevelItems = allEquipment.filter(
        (e: any) => e.requirements.level > 5 && e.requirements.level <= 15
      );
      const highLevelItems = allEquipment.filter((e: any) => e.requirements.level > 15);

      expect(lowLevelItems.length).toBeGreaterThan(0);
      expect(midLevelItems.length).toBeGreaterThan(0);
    });
  });
});
