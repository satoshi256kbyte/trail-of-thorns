/**
 * Unit tests for EquipmentManager
 * Tests equipment integration with battle calculations
 */

import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { WeaponDataLoader } from '../../../game/src/utils/WeaponDataLoader';
import { Unit, Equipment } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element } from '../../../game/src/types/battle';

// Mock WeaponDataLoader
jest.mock('../../../game/src/utils/WeaponDataLoader');

describe('EquipmentManager', () => {
  let equipmentManager: EquipmentManager;
  let mockWeaponDataLoader: jest.Mocked<WeaponDataLoader>;
  let mockUnit: Unit;
  let mockWeapon: Weapon;
  let mockArmor: Equipment;
  let mockAccessory: Equipment;

  beforeEach(() => {
    // Setup mocks
    mockWeaponDataLoader = {
      getWeapon: jest.fn(),
      getWeaponDurabilityStatus: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    (WeaponDataLoader.getInstance as jest.Mock).mockReturnValue(mockWeaponDataLoader);

    equipmentManager = new EquipmentManager();

    // Create mock data
    mockWeapon = {
      id: 'sword-001',
      name: 'Iron Sword',
      type: WeaponType.SWORD,
      attackPower: 15,
      range: 1,
      rangePattern: {
        type: 'single',
        range: 1,
        pattern: [{ x: 0, y: -1 }],
      },
      element: Element.NONE,
      criticalRate: 10,
      accuracy: 85,
      specialEffects: [],
      durability: 50,
      maxDurability: 50,
      description: 'A basic iron sword',
    };

    mockArmor = {
      id: 'armor-001',
      name: 'Leather Armor',
      type: 'light',
      defenseBonus: 5,
      element: 'none',
      specialEffects: [],
      durability: 40,
      maxDurability: 40,
      description: 'Basic leather armor',
    };

    mockAccessory = {
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
    };

    mockUnit = {
      id: 'unit-001',
      name: 'Test Unit',
      position: { x: 0, y: 0 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
      equipment: {
        weapon: mockArmor, // Using armor as weapon equipment for testing
        armor: mockArmor,
        accessory: mockAccessory,
      },
    };

    // Setup mock returns
    mockWeaponDataLoader.getWeapon.mockReturnValue(mockWeapon);
    mockWeaponDataLoader.getWeaponDurabilityStatus.mockReturnValue({
      percentage: 100,
      status: 'excellent',
      performanceMultiplier: 1.0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEquipmentEffects', () => {
    it('should calculate total equipment bonuses correctly', () => {
      const effects = equipmentManager.calculateEquipmentEffects(mockUnit);

      expect(effects.attackBonus).toBe(3); // From accessory
      expect(effects.defenseBonus).toBe(5); // From armor
      expect(effects.speedBonus).toBe(0);
      expect(effects.movementBonus).toBe(0);
      expect(effects.durabilityMultiplier).toBe(1.0);
    });

    it('should handle unit with no equipment', () => {
      const unitWithoutEquipment: Unit = {
        ...mockUnit,
        equipment: {},
      };

      const effects = equipmentManager.calculateEquipmentEffects(unitWithoutEquipment);

      expect(effects.attackBonus).toBe(0);
      expect(effects.defenseBonus).toBe(0);
      expect(effects.speedBonus).toBe(0);
      expect(effects.movementBonus).toBe(0);
      expect(effects.durabilityMultiplier).toBe(1.0);
    });

    it('should apply elemental resistance from armor', () => {
      const fireArmor: Equipment = {
        ...mockArmor,
        element: 'fire',
      };

      const unitWithFireArmor: Unit = {
        ...mockUnit,
        equipment: {
          armor: fireArmor,
        },
      };

      const effects = equipmentManager.calculateEquipmentEffects(unitWithFireArmor);

      expect(effects.elementalResistances.get(Element.FIRE)).toBe(25);
    });

    it('should handle damaged armor with reduced effectiveness', () => {
      const damagedArmor: Equipment = {
        ...mockArmor,
        durability: 15, // 37.5% durability
        maxDurability: 40,
      };

      const unitWithDamagedArmor: Unit = {
        ...mockUnit,
        equipment: {
          armor: damagedArmor,
        },
      };

      const effects = equipmentManager.calculateEquipmentEffects(unitWithDamagedArmor);

      // Defense should be reduced due to low durability
      expect(effects.defenseBonus).toBeLessThan(5);
    });
  });

  describe('getEffectiveWeapon', () => {
    it('should return effective weapon with equipment bonuses', () => {
      const effectiveWeapon = equipmentManager.getEffectiveWeapon(mockUnit);

      expect(effectiveWeapon).toBeDefined();
      expect(effectiveWeapon!.attackPower).toBe(18); // Base weapon (15) + accessory bonus (3)
    });

    it('should return null for unit without weapon', () => {
      const unitWithoutWeapon: Unit = {
        ...mockUnit,
        equipment: {},
      };

      const effectiveWeapon = equipmentManager.getEffectiveWeapon(unitWithoutWeapon);

      expect(effectiveWeapon).toBeNull();
    });

    it('should apply durability effects to weapon performance', () => {
      mockWeaponDataLoader.getWeaponDurabilityStatus.mockReturnValue({
        percentage: 50,
        status: 'worn',
        performanceMultiplier: 0.85,
      });

      const effectiveWeapon = equipmentManager.getEffectiveWeapon(mockUnit);

      expect(effectiveWeapon).toBeDefined();
      expect(effectiveWeapon!.attackPower).toBe(15); // Base weapon attack power (durability applied before equipment bonuses)
    });
  });

  describe('getEffectiveStats', () => {
    it('should return stats with equipment bonuses applied', () => {
      const effectiveStats = equipmentManager.getEffectiveStats(mockUnit);

      expect(effectiveStats.attack).toBe(23); // 20 base + 3 from accessory
      expect(effectiveStats.defense).toBe(20); // 15 base + 5 from armor
      expect(effectiveStats.speed).toBe(10); // No speed bonus
      expect(effectiveStats.movement).toBe(3); // No movement bonus
    });

    it('should handle multiple stat bonuses', () => {
      const speedAccessory: Equipment = {
        ...mockAccessory,
        speedBonus: 2,
        movementBonus: 1,
      };

      const unitWithSpeedAccessory: Unit = {
        ...mockUnit,
        equipment: {
          ...mockUnit.equipment,
          accessory: speedAccessory,
        },
      };

      const effectiveStats = equipmentManager.getEffectiveStats(unitWithSpeedAccessory);

      expect(effectiveStats.attack).toBe(23); // 20 base + 3 from accessory
      expect(effectiveStats.defense).toBe(20); // 15 base + 5 from armor
      expect(effectiveStats.speed).toBe(12); // 10 base + 2 from accessory
      expect(effectiveStats.movement).toBe(4); // 3 base + 1 from accessory
    });
  });

  describe('getEquipmentDamageModifiers', () => {
    it('should return damage modifiers from equipment', () => {
      const attacker = mockUnit;
      const target = mockUnit;

      const modifiers = equipmentManager.getEquipmentDamageModifiers(
        attacker,
        target,
        Element.FIRE
      );

      expect(Array.isArray(modifiers)).toBe(true);
      // Should include durability modifier if weapon condition is not perfect
    });

    it('should include elemental resistance modifiers', () => {
      const fireResistantArmor: Equipment = {
        ...mockArmor,
        element: 'fire',
      };

      const targetWithFireResistance: Unit = {
        ...mockUnit,
        equipment: {
          armor: fireResistantArmor,
        },
      };

      const modifiers = equipmentManager.getEquipmentDamageModifiers(
        mockUnit,
        targetWithFireResistance,
        Element.FIRE
      );

      const resistanceModifier = modifiers.find(
        mod => mod.type === 'elemental' && mod.source === 'equipment_resistance'
      );
      expect(resistanceModifier).toBeDefined();
      expect(resistanceModifier!.multiplier).toBeLessThan(1.0); // Should reduce damage
    });
  });

  describe('validateEquipment', () => {
    it('should validate weapon equipment correctly', () => {
      const validation = equipmentManager.validateEquipment(mockUnit, mockArmor, 'weapon');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject null equipment', () => {
      const validation = equipmentManager.validateEquipment(mockUnit, null as any, 'weapon');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Equipment is null or undefined');
    });

    it('should warn about broken equipment', () => {
      const brokenEquipment: Equipment = {
        ...mockArmor,
        durability: 0,
      };

      const validation = equipmentManager.validateEquipment(mockUnit, brokenEquipment, 'armor');

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain(
        'Equipment is broken and will provide reduced benefits'
      );
    });

    it('should warn about heavily damaged equipment', () => {
      const damagedEquipment: Equipment = {
        ...mockArmor,
        durability: 5, // Less than 20% of max durability
        maxDurability: 40,
      };

      const validation = equipmentManager.validateEquipment(mockUnit, damagedEquipment, 'armor');

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Equipment is heavily damaged');
    });
  });

  describe('equipItem', () => {
    it('should equip item to unit successfully', () => {
      const updatedUnit = equipmentManager.equipItem(mockUnit, mockArmor, 'armor');

      expect(updatedUnit.equipment.armor).toBe(mockArmor);
      expect(updatedUnit.id).toBe(mockUnit.id); // Should be same unit
    });

    it('should throw error for invalid equipment', () => {
      expect(() => {
        equipmentManager.equipItem(mockUnit, null as any, 'weapon');
      }).toThrow('Cannot equip item');
    });
  });

  describe('unequipItem', () => {
    it('should unequip item from unit successfully', () => {
      const updatedUnit = equipmentManager.unequipItem(mockUnit, 'armor');

      expect(updatedUnit.equipment.armor).toBeUndefined();
      expect(updatedUnit.id).toBe(mockUnit.id); // Should be same unit
    });
  });

  describe('damageEquipmentDurability', () => {
    it('should reduce equipment durability', () => {
      const updatedUnit = equipmentManager.damageEquipmentDurability(mockUnit, 'armor', 5);

      expect(updatedUnit.equipment.armor!.durability).toBe(35); // 40 - 5
    });

    it('should not reduce durability below zero', () => {
      const updatedUnit = equipmentManager.damageEquipmentDurability(mockUnit, 'armor', 50);

      expect(updatedUnit.equipment.armor!.durability).toBe(0);
    });

    it('should handle unit without equipment in slot', () => {
      const unitWithoutArmor: Unit = {
        ...mockUnit,
        equipment: {},
      };

      const updatedUnit = equipmentManager.damageEquipmentDurability(unitWithoutArmor, 'armor', 5);

      expect(updatedUnit).toBe(unitWithoutArmor); // Should return same unit
    });
  });

  describe('getEquipmentSummary', () => {
    it('should generate equipment summary for unit', () => {
      const summary = equipmentManager.getEquipmentSummary(mockUnit);

      expect(summary).toContain('Equipment Summary for Test Unit');
      expect(summary).toContain('Weapon:');
      expect(summary).toContain('Armor:');
      expect(summary).toContain('Accessory:');
      expect(summary).toContain('Total Equipment Bonuses:');
    });

    it('should handle unit with no equipment', () => {
      const unitWithoutEquipment: Unit = {
        ...mockUnit,
        equipment: {},
      };

      const summary = equipmentManager.getEquipmentSummary(unitWithoutEquipment);

      expect(summary).toContain('Weapon: None');
      expect(summary).toContain('Armor: None');
      expect(summary).toContain('Accessory: None');
    });
  });
});
