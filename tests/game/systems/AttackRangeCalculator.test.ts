/**
 * Unit tests for AttackRangeCalculator
 * Tests weapon range calculations, obstacle detection, and area of effect calculations
 */

import { AttackRangeCalculator } from '../../../game/src/systems/AttackRangeCalculator';
import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { Position, Unit, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, RangePattern } from '../../../game/src/types/battle';

// Mock MapRenderer for testing
class MockMapRenderer {
  private passablePositions: Set<string> = new Set();
  private occupiedPositions: Set<string> = new Set();

  constructor() {
    // Default: all positions are passable
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        this.passablePositions.add(`${x},${y}`);
      }
    }
  }

  isTerrainPassable(position: Position): boolean {
    return this.passablePositions.has(`${position.x},${position.y}`);
  }

  isPositionOccupied(position: Position): boolean {
    return this.occupiedPositions.has(`${position.x},${position.y}`);
  }

  setTerrainPassable(position: Position, passable: boolean): void {
    const key = `${position.x},${position.y}`;
    if (passable) {
      this.passablePositions.add(key);
    } else {
      this.passablePositions.delete(key);
    }
  }

  setPositionOccupied(position: Position, occupied: boolean): void {
    const key = `${position.x},${position.y}`;
    if (occupied) {
      this.occupiedPositions.add(key);
    } else {
      this.occupiedPositions.delete(key);
    }
  }
}

describe('AttackRangeCalculator', () => {
  let calculator: AttackRangeCalculator;
  let mockMapRenderer: MockMapRenderer;
  let testUnit: Unit;
  let testMapData: MapData;

  beforeEach(() => {
    mockMapRenderer = new MockMapRenderer();
    calculator = new AttackRangeCalculator(mockMapRenderer as any);

    // Create test unit
    const testStats: UnitStats = {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    };

    testUnit = {
      id: 'test-unit',
      name: 'Test Unit',
      position: { x: 5, y: 5 },
      stats: testStats,
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    // Create test map data
    testMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      layers: [],
      playerSpawns: [],
      enemySpawns: [],
    };
  });

  describe('calculateAttackRange', () => {
    test('should calculate range for sword (melee weapon)', () => {
      const sword: Weapon = {
        id: 'test-sword',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'custom', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A test sword',
      };

      const result = calculator.calculateAttackRange(testUnit, sword, testMapData);

      expect(result.validPositions).toHaveLength(8); // 8 adjacent tiles
      expect(result.attacker).toBe(testUnit);
      expect(result.weapon).toBe(sword);

      // Check that adjacent positions are included
      const expectedPositions = [
        { x: 5, y: 4 }, // North
        { x: 6, y: 5 }, // East
        { x: 5, y: 6 }, // South
        { x: 4, y: 5 }, // West
        { x: 4, y: 4 }, // Northwest
        { x: 6, y: 4 }, // Northeast
        { x: 6, y: 6 }, // Southeast
        { x: 4, y: 6 }, // Southwest
      ];

      expectedPositions.forEach(expectedPos => {
        expect(result.validPositions).toContainEqual(expectedPos);
      });
    });

    test('should calculate range for bow (ranged weapon)', () => {
      const bow: Weapon = {
        id: 'test-bow',
        name: 'Test Bow',
        type: WeaponType.BOW,
        attackPower: 20,
        range: 3,
        rangePattern: { type: 'single', range: 3, pattern: [] },
        element: Element.NONE,
        criticalRate: 15,
        accuracy: 85,
        specialEffects: [],
        description: 'A test bow',
      };

      const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

      // Should include all positions within Manhattan distance of 3
      expect(result.validPositions.length).toBeGreaterThan(8);

      // Check specific positions
      expect(result.validPositions).toContainEqual({ x: 5, y: 2 }); // Range 3 north
      expect(result.validPositions).toContainEqual({ x: 8, y: 5 }); // Range 3 east
      expect(result.validPositions).toContainEqual({ x: 2, y: 5 }); // Range 3 west

      // Should not include positions beyond range
      expect(result.validPositions).not.toContainEqual({ x: 5, y: 1 }); // Range 4 north
      expect(result.validPositions).not.toContainEqual({ x: 9, y: 5 }); // Range 4 east
    });

    test('should calculate range for spear (line weapon)', () => {
      const spear: Weapon = {
        id: 'test-spear',
        name: 'Test Spear',
        type: WeaponType.SPEAR,
        attackPower: 22,
        range: 2,
        rangePattern: { type: 'line', range: 2, pattern: [] },
        element: Element.NONE,
        criticalRate: 8,
        accuracy: 88,
        specialEffects: [],
        description: 'A test spear',
      };

      const result = calculator.calculateAttackRange(testUnit, spear, testMapData);

      // Should include positions in 4 cardinal directions
      const expectedPositions = [
        { x: 5, y: 4 },
        { x: 5, y: 3 }, // North
        { x: 6, y: 5 },
        { x: 7, y: 5 }, // East
        { x: 5, y: 6 },
        { x: 5, y: 7 }, // South
        { x: 4, y: 5 },
        { x: 3, y: 5 }, // West
      ];

      expectedPositions.forEach(expectedPos => {
        expect(result.validPositions).toContainEqual(expectedPos);
      });

      // Should not include diagonal positions
      expect(result.validPositions).not.toContainEqual({ x: 6, y: 4 });
      expect(result.validPositions).not.toContainEqual({ x: 4, y: 4 });
    });

    test('should calculate range for staff (cross pattern)', () => {
      const staff: Weapon = {
        id: 'test-staff',
        name: 'Test Staff',
        type: WeaponType.STAFF,
        attackPower: 18,
        range: 2,
        rangePattern: { type: 'cross', range: 2, pattern: [] },
        element: Element.LIGHT,
        criticalRate: 5,
        accuracy: 95,
        specialEffects: [],
        description: 'A test staff',
      };

      const result = calculator.calculateAttackRange(testUnit, staff, testMapData);

      // Should include positions in cross pattern
      const expectedPositions = [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }, // Horizontal
        { x: 5, y: 3 },
        { x: 5, y: 4 },
        { x: 5, y: 6 },
        { x: 5, y: 7 }, // Vertical
      ];

      expectedPositions.forEach(expectedPos => {
        expect(result.validPositions).toContainEqual(expectedPos);
      });

      // Should not include diagonal positions
      expect(result.validPositions).not.toContainEqual({ x: 6, y: 4 });
      expect(result.validPositions).not.toContainEqual({ x: 4, y: 6 });
    });

    test('should calculate range for axe (area weapon)', () => {
      const axe: Weapon = {
        id: 'test-axe',
        name: 'Test Axe',
        type: WeaponType.AXE,
        attackPower: 28,
        range: 2,
        rangePattern: { type: 'area', range: 2, pattern: [] },
        element: Element.NONE,
        criticalRate: 12,
        accuracy: 80,
        specialEffects: [],
        description: 'A test axe',
      };

      const result = calculator.calculateAttackRange(testUnit, axe, testMapData);

      // Should include positions in area pattern (Chebyshev distance)
      expect(result.validPositions).toContainEqual({ x: 3, y: 3 }); // Corner
      expect(result.validPositions).toContainEqual({ x: 7, y: 7 }); // Corner
      expect(result.validPositions).toContainEqual({ x: 5, y: 3 }); // Edge
      expect(result.validPositions).toContainEqual({ x: 7, y: 5 }); // Edge

      // Should not include positions beyond Chebyshev distance of 2
      expect(result.validPositions).not.toContainEqual({ x: 2, y: 5 }); // Distance 3
      expect(result.validPositions).not.toContainEqual({ x: 5, y: 8 }); // Distance 3
    });

    test('should respect map boundaries', () => {
      // Position unit near edge
      testUnit.position = { x: 1, y: 1 };

      const bow: Weapon = {
        id: 'test-bow',
        name: 'Test Bow',
        type: WeaponType.BOW,
        attackPower: 20,
        range: 3,
        rangePattern: { type: 'single', range: 3, pattern: [] },
        element: Element.NONE,
        criticalRate: 15,
        accuracy: 85,
        specialEffects: [],
        description: 'A test bow',
      };

      const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

      // Should not include positions outside map bounds
      result.validPositions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(testMapData.width);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(testMapData.height);
      });
    });

    test('should handle custom weapon range patterns', () => {
      const customPattern: RangePattern = {
        type: 'custom',
        range: 2,
        pattern: [
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ],
      };

      const customWeapon: Weapon = {
        id: 'custom-weapon',
        name: 'Custom Weapon',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 2,
        rangePattern: customPattern,
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A custom weapon',
      };

      const result = calculator.calculateAttackRange(testUnit, customWeapon, testMapData);

      // Should use the custom pattern
      expect(result.validPositions).toContainEqual({ x: 6, y: 5 }); // 1,0 relative
      expect(result.validPositions).toContainEqual({ x: 7, y: 5 }); // 2,0 relative
      expect(result.validPositions).toContainEqual({ x: 5, y: 6 }); // 0,1 relative
      expect(result.validPositions).toContainEqual({ x: 5, y: 7 }); // 0,2 relative

      expect(result.validPositions).toHaveLength(4);
    });

    test('should throw error for invalid inputs', () => {
      const sword: Weapon = {
        id: 'test-sword',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'custom', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A test sword',
      };

      expect(() => {
        calculator.calculateAttackRange(null as any, sword, testMapData);
      }).toThrow();

      expect(() => {
        calculator.calculateAttackRange(testUnit, null as any, testMapData);
      }).toThrow();
    });
  });

  describe('isAttackBlocked', () => {
    test('should return false for adjacent attacks', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 4 }; // Adjacent

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(false);
    });

    test('should detect blocked attacks through impassable terrain', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 2 };

      // Block the path
      mockMapRenderer.setTerrainPassable({ x: 5, y: 3 }, false);

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(true);
    });

    test('should allow attacks through passable terrain', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 2 };

      // Ensure path is clear
      mockMapRenderer.setTerrainPassable({ x: 5, y: 4 }, true);
      mockMapRenderer.setTerrainPassable({ x: 5, y: 3 }, true);

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(false);
    });

    test('should detect blocked attacks to impassable target', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 4 };

      // Block the target position
      mockMapRenderer.setTerrainPassable(to, false);

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(true);
    });

    test('should respect configuration settings', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 2 };

      // Block the path
      mockMapRenderer.setTerrainPassable({ x: 5, y: 3 }, false);

      // Disable obstacle blocking
      calculator.updateConfig({ enableObstacleBlocking: false });

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(false);
    });

    test('should handle diagonal line of sight', () => {
      const from = { x: 5, y: 5 };
      const to = { x: 7, y: 3 };

      // Block a position along the diagonal path
      mockMapRenderer.setTerrainPassable({ x: 6, y: 4 }, false);

      const result = calculator.isAttackBlocked(from, to);
      expect(result).toBe(true);
    });
  });

  describe('calculateAreaOfEffect', () => {
    test('should return only center position for weapons without AoE', () => {
      const weapon: Weapon = {
        id: 'single-target',
        name: 'Single Target',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'single', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'Single target weapon',
      };

      const center = { x: 5, y: 5 };
      const result = calculator.calculateAreaOfEffect(center, weapon, testMapData);

      expect(result).toEqual([center]);
    });

    test('should calculate area of effect for AoE weapons', () => {
      const aoeWeapon: Weapon = {
        id: 'aoe-weapon',
        name: 'AoE Weapon',
        type: WeaponType.STAFF,
        attackPower: 20,
        range: 3,
        rangePattern: {
          type: 'area',
          range: 3,
          pattern: [],
          areaOfEffect: 2,
        },
        element: Element.FIRE,
        criticalRate: 5,
        accuracy: 95,
        specialEffects: [],
        description: 'Area of effect weapon',
      };

      const center = { x: 5, y: 5 };
      const result = calculator.calculateAreaOfEffect(center, aoeWeapon, testMapData);

      // Should include center and surrounding positions within radius 2
      expect(result).toContainEqual({ x: 5, y: 5 }); // Center
      expect(result).toContainEqual({ x: 5, y: 3 }); // North 2
      expect(result).toContainEqual({ x: 7, y: 5 }); // East 2
      expect(result).toContainEqual({ x: 5, y: 7 }); // South 2
      expect(result).toContainEqual({ x: 3, y: 5 }); // West 2
      expect(result).toContainEqual({ x: 4, y: 4 }); // Diagonal within range

      // Should not include positions beyond AoE radius
      expect(result).not.toContainEqual({ x: 5, y: 2 }); // North 3
      expect(result).not.toContainEqual({ x: 8, y: 5 }); // East 3
    });

    test('should respect map boundaries for AoE', () => {
      const aoeWeapon: Weapon = {
        id: 'aoe-weapon',
        name: 'AoE Weapon',
        type: WeaponType.STAFF,
        attackPower: 20,
        range: 3,
        rangePattern: {
          type: 'area',
          range: 3,
          pattern: [],
          areaOfEffect: 3,
        },
        element: Element.FIRE,
        criticalRate: 5,
        accuracy: 95,
        specialEffects: [],
        description: 'Area of effect weapon',
      };

      // Position near map edge
      const center = { x: 1, y: 1 };
      const result = calculator.calculateAreaOfEffect(center, aoeWeapon, testMapData);

      // All positions should be within map bounds
      result.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(testMapData.width);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(testMapData.height);
      });
    });
  });

  describe('getWeaponRangePattern', () => {
    test('should use weapon-defined pattern when available', () => {
      const customPattern: RangePattern = {
        type: 'custom',
        range: 2,
        pattern: [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
      };

      const weapon: Weapon = {
        id: 'custom-weapon',
        name: 'Custom Weapon',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 2,
        rangePattern: customPattern,
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'Custom weapon',
      };

      const result = calculator.getWeaponRangePattern(weapon, { x: 5, y: 5 });

      expect(result.pattern).toBe(customPattern);
      expect(result.positions).toContainEqual({ x: 6, y: 5 }); // 1,0 relative
      expect(result.positions).toContainEqual({ x: 5, y: 6 }); // 0,1 relative
      expect(result.positions).toHaveLength(2);
    });

    test('should generate pattern for weapon type when no custom pattern', () => {
      const weapon: Weapon = {
        id: 'bow',
        name: 'Bow',
        type: WeaponType.BOW,
        attackPower: 20,
        range: 2,
        rangePattern: { type: 'single', range: 2, pattern: [] }, // Empty pattern
        element: Element.NONE,
        criticalRate: 15,
        accuracy: 85,
        specialEffects: [],
        description: 'Bow weapon',
      };

      const result = calculator.getWeaponRangePattern(weapon, { x: 5, y: 5 });

      expect(result.pattern.type).toBe('single');
      expect(result.positions.length).toBeGreaterThan(0);
    });
  });

  describe('utility methods', () => {
    test('should calculate threat range correctly', () => {
      const sword: Weapon = {
        id: 'test-sword',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'custom', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A test sword',
      };

      const threatRange = calculator.calculateThreatRange(testUnit, sword, testMapData);
      expect(threatRange.length).toBe(8); // 8 adjacent positions
    });

    test('should check if position is threatened', () => {
      const sword: Weapon = {
        id: 'test-sword',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'custom', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A test sword',
      };

      const threatenedPosition = { x: 5, y: 4 }; // Adjacent
      const safePosition = { x: 5, y: 2 }; // Not adjacent

      expect(
        calculator.isPositionThreatened(threatenedPosition, testUnit, sword, testMapData)
      ).toBe(true);
      expect(calculator.isPositionThreatened(safePosition, testUnit, sword, testMapData)).toBe(
        false
      );
    });

    test('should get attacking positions for target', () => {
      const bow: Weapon = {
        id: 'test-bow',
        name: 'Test Bow',
        type: WeaponType.BOW,
        attackPower: 20,
        range: 2,
        rangePattern: { type: 'single', range: 2, pattern: [] },
        element: Element.NONE,
        criticalRate: 15,
        accuracy: 85,
        specialEffects: [],
        description: 'A test bow',
      };

      const targetPosition = { x: 5, y: 5 };
      const attackingPositions = calculator.getAttackingPositions(targetPosition, bow, testMapData);

      expect(attackingPositions.length).toBeGreaterThan(0);

      // All attacking positions should be within weapon range of target
      attackingPositions.forEach(pos => {
        const distance = Math.abs(pos.x - targetPosition.x) + Math.abs(pos.y - targetPosition.y);
        expect(distance).toBeLessThanOrEqual(bow.range);
      });
    });

    test('should update configuration correctly', () => {
      const newConfig = {
        maxCalculationRange: 15,
        enableObstacleBlocking: false,
      };

      calculator.updateConfig(newConfig);
      const config = calculator.getConfig();

      expect(config.maxCalculationRange).toBe(15);
      expect(config.enableObstacleBlocking).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle zero range weapons', () => {
      const zeroRangeWeapon: Weapon = {
        id: 'zero-range',
        name: 'Zero Range',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 0,
        rangePattern: { type: 'single', range: 0, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'Zero range weapon',
      };

      const result = calculator.calculateAttackRange(testUnit, zeroRangeWeapon, testMapData);

      // Should still generate adjacent pattern for melee weapons
      expect(result.validPositions.length).toBeGreaterThan(0);
    });

    test('should handle very large range weapons', () => {
      const largeRangeWeapon: Weapon = {
        id: 'large-range',
        name: 'Large Range',
        type: WeaponType.BOW,
        attackPower: 20,
        range: 100, // Very large range
        rangePattern: { type: 'single', range: 100, pattern: [] },
        element: Element.NONE,
        criticalRate: 15,
        accuracy: 85,
        specialEffects: [],
        description: 'Large range weapon',
      };

      const result = calculator.calculateAttackRange(testUnit, largeRangeWeapon, testMapData);

      // Should be limited by maxCalculationRange config
      const maxDistance = Math.max(
        ...result.validPositions.map(
          pos => Math.abs(pos.x - testUnit.position.x) + Math.abs(pos.y - testUnit.position.y)
        )
      );

      expect(maxDistance).toBeLessThanOrEqual(calculator.getConfig().maxCalculationRange);
    });

    test('should handle calculator without map renderer', () => {
      const calculatorWithoutMap = new AttackRangeCalculator();

      const sword: Weapon = {
        id: 'test-sword',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
        range: 1,
        rangePattern: { type: 'custom', range: 1, pattern: [] },
        element: Element.NONE,
        criticalRate: 10,
        accuracy: 90,
        specialEffects: [],
        description: 'A test sword',
      };

      // Should not throw error
      const result = calculatorWithoutMap.calculateAttackRange(testUnit, sword, testMapData);
      expect(result.validPositions.length).toBeGreaterThan(0);

      // Blocking checks should return false without map renderer
      expect(calculatorWithoutMap.isAttackBlocked({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(false);
    });
  });
});
