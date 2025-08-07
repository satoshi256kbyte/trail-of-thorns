/**
 * Unit tests for WeaponDataLoader
 * Tests weapon and equipment data loading and validation
 */

import { WeaponDataLoader } from '../../../game/src/utils/WeaponDataLoader';
import { WeaponType, Element } from '../../../game/src/types/battle';

// Mock fetch
global.fetch = jest.fn();

describe('WeaponDataLoader', () => {
  let weaponDataLoader: WeaponDataLoader;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    weaponDataLoader = WeaponDataLoader.getInstance();
    weaponDataLoader.clearCache(); // Clear cache between tests
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    jest.clearAllMocks();
  });

  describe('loadWeaponData', () => {
    it('should load and validate weapon data successfully', async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-001',
            name: 'Iron Sword',
            type: 'sword',
            attackPower: 15,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'none',
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            durability: 50,
            maxDurability: 50,
            description: 'A basic iron sword',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('sword-001');
      expect(result.data![0].type).toBe(WeaponType.SWORD);
      expect(result.data![0].element).toBe(Element.NONE);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch weapons.json');
    });

    it('should handle invalid JSON structure', async () => {
      const invalidData = { notWeapons: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData,
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid weapon data format');
    });

    it('should validate weapon fields and reject invalid weapons', async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'invalid-weapon',
            name: 'Invalid Weapon',
            type: 'invalid-type', // Invalid weapon type
            attackPower: -5, // Invalid negative attack power
            range: 0, // Invalid zero range
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'invalid-element', // Invalid element
            criticalRate: 150, // Invalid critical rate > 100
            accuracy: -10, // Invalid negative accuracy
            specialEffects: [],
            description: 'An invalid weapon',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });

    it('should validate special effects correctly', async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-002',
            name: 'Flame Sword',
            type: 'sword',
            attackPower: 20,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'fire',
            criticalRate: 15,
            accuracy: 80,
            specialEffects: [
              {
                type: 'burn',
                chance: 25,
                duration: 3,
                power: 5,
                description: 'Burns the target',
              },
            ],
            description: 'A flaming sword',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(true);
      expect(result.data![0].specialEffects).toHaveLength(1);
      expect(result.data![0].specialEffects[0].type).toBe('burn');
    });

    it('should reject weapons with invalid special effects', async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-003',
            name: 'Invalid Effect Sword',
            type: 'sword',
            attackPower: 20,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'fire',
            criticalRate: 15,
            accuracy: 80,
            specialEffects: [
              {
                type: 'invalid-effect', // Invalid effect type
                chance: 150, // Invalid chance > 100
                duration: -1, // Invalid negative duration
                power: -5, // Invalid negative power
                description: 'Invalid effect',
              },
            ],
            description: 'A sword with invalid effects',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      const result = await weaponDataLoader.loadWeaponData();

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });
  });

  describe('loadEquipmentData', () => {
    it('should load and validate equipment data successfully', async () => {
      const mockEquipmentData = {
        armor: [
          {
            id: 'armor-001',
            name: 'Leather Armor',
            type: 'light',
            defenseBonus: 5,
            element: 'none',
            specialEffects: [],
            durability: 40,
            maxDurability: 40,
            description: 'Basic leather armor',
          },
        ],
        accessories: [
          {
            id: 'accessory-001',
            name: 'Power Ring',
            type: 'ring',
            attackBonus: 3,
            defenseBonus: 0,
            element: 'none',
            specialEffects: [],
            durability: 100,
            maxDurability: 100,
            description: 'A ring that enhances attack power',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEquipmentData,
      } as Response);

      const result = await weaponDataLoader.loadEquipmentData();

      expect(result.success).toBe(true);
      expect(result.data!.armor).toHaveLength(1);
      expect(result.data!.accessories).toHaveLength(1);
      expect(result.data!.armor[0].id).toBe('armor-001');
      expect(result.data!.accessories[0].id).toBe('accessory-001');
    });

    it('should handle invalid equipment data structure', async () => {
      const invalidData = { notArmor: [], notAccessories: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData,
      } as Response);

      const result = await weaponDataLoader.loadEquipmentData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid equipment data format');
    });

    it('should validate equipment fields correctly', async () => {
      const mockEquipmentData = {
        armor: [
          {
            id: '', // Invalid empty ID
            name: 'Invalid Armor',
            type: 'light',
            defenseBonus: -5, // Invalid negative defense bonus
            element: 'invalid-element', // Invalid element
            specialEffects: [],
            durability: -10, // Invalid negative durability
            maxDurability: 40,
            description: 'Invalid armor',
          },
        ],
        accessories: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEquipmentData,
      } as Response);

      const result = await weaponDataLoader.loadEquipmentData();

      expect(result.success).toBe(true); // Should succeed but with validation errors
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });
  });

  describe('loadAllData', () => {
    it('should load both weapon and equipment data successfully', async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-001',
            name: 'Iron Sword',
            type: 'sword',
            attackPower: 15,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'none',
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            durability: 50,
            maxDurability: 50,
            description: 'A basic iron sword',
          },
        ],
      };

      const mockEquipmentData = {
        armor: [
          {
            id: 'armor-001',
            name: 'Leather Armor',
            type: 'light',
            defenseBonus: 5,
            element: 'none',
            specialEffects: [],
            durability: 40,
            maxDurability: 40,
            description: 'Basic leather armor',
          },
        ],
        accessories: [],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWeaponData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEquipmentData,
        } as Response);

      const result = await weaponDataLoader.loadAllData();

      expect(result.success).toBe(true);
      expect(result.data!.weapons).toHaveLength(1);
      expect(result.data!.armor).toHaveLength(1);
      expect(result.data!.accessories).toHaveLength(0);
      expect(weaponDataLoader.isDataLoaded()).toBe(true);
    });

    it('should fail if weapon data loading fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await weaponDataLoader.loadAllData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load weapon data');
    });
  });

  describe('caching and retrieval', () => {
    beforeEach(async () => {
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-001',
            name: 'Iron Sword',
            type: 'sword',
            attackPower: 15,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'none',
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            durability: 50,
            maxDurability: 50,
            description: 'A basic iron sword',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      await weaponDataLoader.loadWeaponData();
    });

    it('should cache and retrieve weapons by ID', () => {
      const weapon = weaponDataLoader.getWeapon('sword-001');

      expect(weapon).toBeDefined();
      expect(weapon!.id).toBe('sword-001');
      expect(weapon!.name).toBe('Iron Sword');
    });

    it('should return undefined for non-existent weapon', () => {
      const weapon = weaponDataLoader.getWeapon('non-existent');

      expect(weapon).toBeUndefined();
    });

    it('should return all weapons', () => {
      const weapons = weaponDataLoader.getAllWeapons();

      expect(weapons).toHaveLength(1);
      expect(weapons[0].id).toBe('sword-001');
    });

    it('should filter weapons by type', () => {
      const swords = weaponDataLoader.getWeaponsByType(WeaponType.SWORD);

      expect(swords).toHaveLength(1);
      expect(swords[0].type).toBe(WeaponType.SWORD);
    });
  });

  describe('durability management', () => {
    let mockWeapon: any;

    beforeEach(() => {
      mockWeapon = {
        id: 'sword-001',
        name: 'Iron Sword',
        type: WeaponType.SWORD,
        attackPower: 15,
        durability: 30,
        maxDurability: 50,
      };
    });

    it('should calculate durability status correctly', () => {
      const status = weaponDataLoader.getWeaponDurabilityStatus(mockWeapon);

      expect(status.percentage).toBe(60); // 30/50 * 100
      expect(status.status).toBe('good');
      expect(status.performanceMultiplier).toBe(0.95);
    });

    it('should handle excellent condition weapons', () => {
      mockWeapon.durability = 45; // 90% durability

      const status = weaponDataLoader.getWeaponDurabilityStatus(mockWeapon);

      expect(status.status).toBe('excellent');
      expect(status.performanceMultiplier).toBe(1.0);
    });

    it('should handle broken weapons', () => {
      mockWeapon.durability = 0;
      mockWeapon.maxDurability = 50; // Ensure maxDurability is set

      const status = weaponDataLoader.getWeaponDurabilityStatus(mockWeapon);

      expect(status.status).toBe('broken');
      expect(status.performanceMultiplier).toBe(0.1);
    });

    it('should damage weapon durability', () => {
      const damagedWeapon = weaponDataLoader.damageWeaponDurability(mockWeapon, 5);

      expect(damagedWeapon.durability).toBe(25); // 30 - 5
      expect(damagedWeapon.id).toBe(mockWeapon.id); // Should be same weapon
    });

    it('should not reduce durability below zero', () => {
      const damagedWeapon = weaponDataLoader.damageWeaponDurability(mockWeapon, 50);

      expect(damagedWeapon.durability).toBe(0);
    });

    it('should repair weapon durability', () => {
      const repairedWeapon = weaponDataLoader.repairWeapon(mockWeapon, 10);

      expect(repairedWeapon.durability).toBe(40); // 30 + 10
    });

    it('should fully repair weapon when no amount specified', () => {
      const repairedWeapon = weaponDataLoader.repairWeapon(mockWeapon);

      expect(repairedWeapon.durability).toBe(50); // Full repair to max
    });

    it('should not repair beyond max durability', () => {
      const repairedWeapon = weaponDataLoader.repairWeapon(mockWeapon, 30);

      expect(repairedWeapon.durability).toBe(50); // Capped at max durability
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      // Load some data first
      const mockWeaponData = {
        weapons: [
          {
            id: 'sword-001',
            name: 'Iron Sword',
            type: 'sword',
            attackPower: 15,
            range: 1,
            rangePattern: {
              type: 'single',
              range: 1,
              pattern: [{ x: 0, y: -1 }],
            },
            element: 'none',
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            durability: 50,
            maxDurability: 50,
            description: 'A basic iron sword',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeaponData,
      } as Response);

      await weaponDataLoader.loadWeaponData();
      // Note: loadWeaponData() doesn't set dataLoaded flag, only loadAllData() does
      expect(weaponDataLoader.getWeapon('sword-001')).toBeDefined();
      expect(weaponDataLoader.getWeapon('sword-001')).toBeDefined();

      // Clear cache
      weaponDataLoader.clearCache();

      expect(weaponDataLoader.isDataLoaded()).toBe(false);
      expect(weaponDataLoader.getWeapon('sword-001')).toBeUndefined();
    });
  });
});
