/**
 * Unit tests for MovementCalculator
 * Tests movement range calculation, terrain cost application, and position validation
 */

import { MovementCalculator } from '../../../game/src/systems/MovementCalculator';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { TerrainCost } from '../../../game/src/types/movement';
import { PositionUtils } from '../../../game/src/types/movement';

describe('MovementCalculator', () => {
  let calculator: MovementCalculator;
  let testUnit: Unit;
  let testMap: MapData;

  beforeEach(() => {
    calculator = new MovementCalculator();

    // Create test unit with 3 movement points
    testUnit = {
      id: 'test-unit',
      name: 'Test Unit',
      position: { x: 2, y: 2 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 10,
        defense: 5,
        speed: 8,
        movement: 3,
      } as UnitStats,
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    // Create simple 5x5 test map with mixed terrain
    testMap = {
      width: 5,
      height: 5,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: [
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
          ],
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'terrain',
          type: 'terrain',
          data: [
            [0, 0, 0, 0, 0], // Normal terrain (cost 1)
            [0, 4, 4, 4, 0], // Difficult terrain (cost 2)
            [0, 4, 0, 4, 0], // Mixed terrain
            [0, 4, 4, 4, 0], // Difficult terrain
            [0, 0, 0, 0, 0], // Normal terrain
          ],
          visible: true,
          opacity: 0.8,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 4, y: 4 }],
    };
  });

  describe('constructor', () => {
    it('should initialize with default terrain costs', () => {
      const calc = new MovementCalculator();
      const terrainCosts = calc.getTerrainCosts();

      expect(terrainCosts['0']).toEqual({ movementCost: 1, isPassable: true });
      expect(terrainCosts['4']).toEqual({ movementCost: 2, isPassable: true });
    });

    it('should accept custom terrain costs', () => {
      const customCosts: TerrainCost = {
        '0': { movementCost: 2, isPassable: true },
        '1': { movementCost: 3, isPassable: false },
      };

      const calc = new MovementCalculator(customCosts);
      const terrainCosts = calc.getTerrainCosts();

      expect(terrainCosts['0']).toEqual({ movementCost: 2, isPassable: true });
      expect(terrainCosts['1']).toEqual({ movementCost: 3, isPassable: false });
    });
  });

  describe('calculateMovementRange', () => {
    it('should calculate basic movement range on flat terrain', () => {
      // Place unit on flat terrain map
      const flatMap = {
        ...testMap,
        layers: [
          testMap.layers[0],
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const range = calculator.calculateMovementRange(testUnit, flatMap);

      // Should include starting position and all positions within 3 movement
      expect(range).toContainEqual({ x: 2, y: 2 }); // Starting position
      expect(range).toContainEqual({ x: 1, y: 2 }); // 1 step west
      expect(range).toContainEqual({ x: 3, y: 2 }); // 1 step east
      expect(range).toContainEqual({ x: 2, y: 1 }); // 1 step north
      expect(range).toContainEqual({ x: 2, y: 3 }); // 1 step south
      expect(range).toContainEqual({ x: 0, y: 2 }); // 2 steps west
      expect(range).toContainEqual({ x: 4, y: 2 }); // 2 steps east

      // Should not include positions beyond movement range
      expect(range).not.toContainEqual({ x: 2, y: -1 }); // Out of bounds
      expect(range).not.toContainEqual({ x: 5, y: 2 }); // Out of bounds
    });

    it('should respect terrain movement costs', () => {
      const range = calculator.calculateMovementRange(testUnit, testMap);

      // Should include starting position
      expect(range).toContainEqual({ x: 2, y: 2 });

      // Should include adjacent normal terrain (cost 1)
      expect(range).toContainEqual({ x: 2, y: 0 }); // North 2 steps
      expect(range).toContainEqual({ x: 2, y: 4 }); // South 2 steps
      expect(range).toContainEqual({ x: 0, y: 2 }); // West 2 steps
      expect(range).toContainEqual({ x: 4, y: 2 }); // East 2 steps

      // Difficult terrain (cost 2) should limit range
      expect(range).toContainEqual({ x: 1, y: 2 }); // Adjacent difficult terrain (cost 2, total 2)
      expect(range).toContainEqual({ x: 3, y: 2 }); // Adjacent difficult terrain (cost 2, total 2)
    });

    it('should handle occupied positions', () => {
      const occupiedPositions: Position[] = [
        { x: 1, y: 2 }, // Block west movement
        { x: 3, y: 2 }, // Block east movement
      ];

      const range = calculator.calculateMovementRange(testUnit, testMap, occupiedPositions);

      // Should not include occupied positions
      expect(range).not.toContainEqual({ x: 1, y: 2 });
      expect(range).not.toContainEqual({ x: 3, y: 2 });

      // Should still include starting position
      expect(range).toContainEqual({ x: 2, y: 2 });

      // Should include unblocked directions
      expect(range).toContainEqual({ x: 2, y: 1 }); // North
      expect(range).toContainEqual({ x: 2, y: 3 }); // South
    });

    it('should handle impassable terrain', () => {
      const impassableMap = {
        ...testMap,
        layers: [
          testMap.layers[0],
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 0, 0, 0, 0],
              [0, 6, 6, 6, 0], // Impassable terrain
              [0, 6, 0, 6, 0],
              [0, 6, 6, 6, 0],
              [0, 0, 0, 0, 0],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const range = calculator.calculateMovementRange(testUnit, impassableMap);

      // Should include starting position
      expect(range).toContainEqual({ x: 2, y: 2 });

      // Should not include impassable terrain
      expect(range).not.toContainEqual({ x: 1, y: 1 });
      expect(range).not.toContainEqual({ x: 3, y: 1 });
      expect(range).not.toContainEqual({ x: 1, y: 2 }); // West impassable
      expect(range).not.toContainEqual({ x: 3, y: 2 }); // East impassable

      // The unit is surrounded by impassable terrain, so it can only stay in place
      // or move to positions that don't require going through impassable terrain
      expect(range.length).toBe(1); // Only starting position should be reachable
    });

    it('should handle edge cases', () => {
      // Test with null/undefined inputs
      expect(calculator.calculateMovementRange(null as any, testMap)).toEqual([]);
      expect(calculator.calculateMovementRange(testUnit, null as any)).toEqual([]);

      // Test with zero movement
      const immobileUnit = { ...testUnit, stats: { ...testUnit.stats, movement: 0 } };
      const range = calculator.calculateMovementRange(immobileUnit, testMap);
      expect(range).toEqual([{ x: 2, y: 2 }]); // Only starting position
    });

    it('should handle map boundaries correctly', () => {
      // Place unit at map edge
      const edgeUnit = { ...testUnit, position: { x: 0, y: 0 } };
      const range = calculator.calculateMovementRange(edgeUnit, testMap);

      // Should include starting position
      expect(range).toContainEqual({ x: 0, y: 0 });

      // Should not include out-of-bounds positions
      expect(range).not.toContainEqual({ x: -1, y: 0 });
      expect(range).not.toContainEqual({ x: 0, y: -1 });

      // Should include valid adjacent positions
      expect(range).toContainEqual({ x: 1, y: 0 });
      expect(range).toContainEqual({ x: 0, y: 1 });
    });
  });

  describe('getMovementCost', () => {
    it('should return correct cost for normal terrain', () => {
      const cost = calculator.getMovementCost(
        { x: 2, y: 2 },
        { x: 2, y: 0 }, // Normal terrain
        testMap
      );
      expect(cost).toBe(1);
    });

    it('should return correct cost for difficult terrain', () => {
      const cost = calculator.getMovementCost(
        { x: 2, y: 2 },
        { x: 1, y: 2 }, // Difficult terrain (type 4)
        testMap
      );
      expect(cost).toBe(2);
    });

    it('should return -1 for impassable terrain', () => {
      const impassableMap = {
        ...testMap,
        layers: [
          testMap.layers[0],
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 0, 0, 0, 0],
              [0, 6, 0, 0, 0], // Impassable terrain
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const cost = calculator.getMovementCost(
        { x: 0, y: 1 },
        { x: 1, y: 1 }, // Impassable terrain
        impassableMap
      );
      expect(cost).toBe(-1);
    });

    it('should return -1 for out-of-bounds positions', () => {
      const cost = calculator.getMovementCost(
        { x: 2, y: 2 },
        { x: -1, y: 2 }, // Out of bounds
        testMap
      );
      expect(cost).toBe(-1);
    });

    it('should handle missing terrain layer', () => {
      const noTerrainMap = {
        ...testMap,
        layers: [testMap.layers[0]], // Only background layer
      };

      const cost = calculator.getMovementCost({ x: 2, y: 2 }, { x: 2, y: 1 }, noTerrainMap);
      expect(cost).toBe(1); // Default cost
    });
  });

  describe('isPositionReachable', () => {
    it('should return true for reachable positions', () => {
      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 2, y: 0 }, // 2 steps north
        testMap
      );
      expect(reachable).toBe(true);
    });

    it('should return false for unreachable positions', () => {
      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 0, y: 0 }, // Too far away
        testMap
      );
      expect(reachable).toBe(false);
    });

    it('should return true for current position', () => {
      const reachable = calculator.isPositionReachable(testUnit, testUnit.position, testMap);
      expect(reachable).toBe(true);
    });

    it('should return false for occupied positions', () => {
      const occupiedPositions: Position[] = [{ x: 2, y: 1 }];

      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 2, y: 1 },
        testMap,
        occupiedPositions
      );
      expect(reachable).toBe(false);
    });

    it('should return false for out-of-bounds positions', () => {
      const reachable = calculator.isPositionReachable(testUnit, { x: -1, y: 2 }, testMap);
      expect(reachable).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(calculator.isPositionReachable(null as any, { x: 1, y: 1 }, testMap)).toBe(false);
      expect(calculator.isPositionReachable(testUnit, null as any, testMap)).toBe(false);
      expect(calculator.isPositionReachable(testUnit, { x: 1, y: 1 }, null as any)).toBe(false);
    });
  });

  describe('getMovementCostToPosition', () => {
    it('should return 0 for current position', () => {
      const cost = calculator.getMovementCostToPosition(testUnit, testUnit.position, testMap);
      expect(cost).toBe(0);
    });

    it('should return correct cost for reachable position', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 2, y: 0 }, // 2 steps north through mixed terrain
        testMap
      );
      // From (2,2) to (2,0): (2,2) -> (2,1) -> (2,0)
      // Step to (2,1) costs 2 (difficult terrain), step to (2,0) costs 1 (normal terrain)
      // Total cost: 2 + 1 = 3
      expect(cost).toBe(3);
    });

    it('should return correct cost through difficult terrain', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 1, y: 2 }, // 1 step west on difficult terrain
        testMap
      );
      expect(cost).toBe(2); // Cost 2 for difficult terrain
    });

    it('should return -1 for unreachable positions', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 0, y: 0 }, // Too far away
        testMap
      );
      expect(cost).toBe(-1);
    });

    it('should handle occupied positions', () => {
      const occupiedPositions: Position[] = [{ x: 2, y: 1 }];

      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 2, y: 1 },
        testMap,
        occupiedPositions
      );
      expect(cost).toBe(-1);
    });
  });

  describe('terrain cost configuration', () => {
    it('should allow updating terrain costs', () => {
      const newCosts: TerrainCost = {
        '0': { movementCost: 3, isPassable: true },
        '4': { movementCost: 5, isPassable: false },
      };

      calculator.setTerrainCosts(newCosts);
      const retrievedCosts = calculator.getTerrainCosts();

      expect(retrievedCosts['0']).toEqual({ movementCost: 3, isPassable: true });
      expect(retrievedCosts['4']).toEqual({ movementCost: 5, isPassable: false });
    });

    it('should not modify original terrain costs object', () => {
      const originalCosts = calculator.getTerrainCosts();
      const modifiedCosts = calculator.getTerrainCosts();
      modifiedCosts['0'].movementCost = 999;

      const currentCosts = calculator.getTerrainCosts();
      expect(currentCosts['0'].movementCost).not.toBe(999);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large movement ranges efficiently', () => {
      const highMovementUnit = {
        ...testUnit,
        stats: { ...testUnit.stats, movement: 10 },
      };

      const start = performance.now();
      const range = calculator.calculateMovementRange(highMovementUnit, testMap);
      const end = performance.now();

      expect(range.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle complex terrain patterns', () => {
      const complexMap = {
        ...testMap,
        width: 10,
        height: 10,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(10).fill(Array(10).fill(1)),
            visible: true,
            opacity: 1.0,
          },
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 4, 0, 4, 0, 4, 0, 4, 0, 4],
              [4, 0, 4, 0, 4, 0, 4, 0, 4, 0],
              [0, 4, 0, 4, 0, 4, 0, 4, 0, 4],
              [4, 0, 4, 0, 4, 0, 4, 0, 4, 0],
              [0, 4, 0, 4, 0, 4, 0, 4, 0, 4],
              [4, 0, 4, 0, 4, 0, 4, 0, 4, 0],
              [0, 4, 0, 4, 0, 4, 0, 4, 0, 4],
              [4, 0, 4, 0, 4, 0, 4, 0, 4, 0],
              [0, 4, 0, 4, 0, 4, 0, 4, 0, 4],
              [4, 0, 4, 0, 4, 0, 4, 0, 4, 0],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const complexUnit = { ...testUnit, position: { x: 0, y: 0 } };
      const range = calculator.calculateMovementRange(complexUnit, complexMap);

      expect(range.length).toBeGreaterThan(1);
      expect(range).toContainEqual({ x: 0, y: 0 }); // Starting position
    });
  });
});
