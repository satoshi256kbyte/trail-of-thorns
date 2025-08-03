/**
 * Unit tests for MovementCalculator with collision detection
 * Tests enhanced movement calculations with MapRenderer integration
 */

import { MovementCalculator } from '../../../game/src/systems/MovementCalculator';
import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { TerrainCost } from '../../../game/src/types/movement';

describe('MovementCalculator - Collision Detection', () => {
  let calculator: MovementCalculator;
  let mapRenderer: MapRenderer;
  let mockScene: any;
  let testUnit: Unit;
  let testMap: MapData;
  let testUnits: Unit[];

  beforeEach(() => {
    // Mock Phaser scene
    mockScene = {
      add: {
        graphics: jest.fn().mockReturnValue({
          setDepth: jest.fn().mockReturnThis(),
          clear: jest.fn(),
          lineStyle: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          strokePath: jest.fn(),
          fillStyle: jest.fn(),
          fillRect: jest.fn(),
          setVisible: jest.fn(),
          destroy: jest.fn(),
        }),
      },
      make: {
        tilemap: jest.fn().mockReturnValue({
          addTilesetImage: jest.fn(),
          createLayer: jest.fn().mockReturnValue({
            setAlpha: jest.fn(),
            setDepth: jest.fn(),
          }),
          destroy: jest.fn(),
        }),
      },
    };

    calculator = new MovementCalculator();
    mapRenderer = new MapRenderer(mockScene);

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

    // Create test map with mixed terrain and obstacles
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
            [0, 0, 6, 0, 0], // Normal terrain with wall
            [0, 4, 4, 4, 0], // Difficult terrain
            [6, 4, 0, 4, 6], // Mixed terrain with walls
            [0, 4, 4, 4, 0], // Difficult terrain
            [0, 0, 6, 0, 0], // Normal terrain with wall
          ],
          visible: true,
          opacity: 0.8,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 4, y: 4 }],
    };

    // Create other units for collision testing
    testUnits = [
      testUnit,
      {
        id: 'enemy1',
        name: 'Enemy 1',
        position: { x: 1, y: 2 },
        stats: {
          maxHP: 80,
          maxMP: 30,
          attack: 8,
          defense: 4,
          speed: 6,
          movement: 2,
        } as UnitStats,
        currentHP: 80,
        currentMP: 30,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'ally1',
        name: 'Ally 1',
        position: { x: 3, y: 2 },
        stats: {
          maxHP: 90,
          maxMP: 40,
          attack: 9,
          defense: 6,
          speed: 7,
          movement: 3,
        } as UnitStats,
        currentHP: 90,
        currentMP: 40,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      },
    ];
  });

  afterEach(() => {
    mapRenderer.destroy();
  });

  describe('MapRenderer integration', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      calculator.setMapRenderer(mapRenderer);
    });

    it('should use MapRenderer for terrain cost calculation', () => {
      const cost = calculator.getMovementCost({ x: 2, y: 2 }, { x: 1, y: 2 }, testMap);
      expect(cost).toBe(2); // Difficult terrain cost
    });

    it('should use MapRenderer for impassable terrain detection', () => {
      const cost = calculator.getMovementCost({ x: 2, y: 2 }, { x: 0, y: 2 }, testMap);
      expect(cost).toBe(-1); // Wall is impassable
    });

    it('should calculate movement range with unit collision detection', () => {
      const range = calculator.calculateMovementRange(testUnit, testMap);

      // Should include starting position
      expect(range).toContainEqual({ x: 2, y: 2 });

      // Should not include positions occupied by other units
      expect(range).not.toContainEqual({ x: 1, y: 2 }); // Enemy position
      expect(range).not.toContainEqual({ x: 3, y: 2 }); // Ally position

      // Should not include impassable terrain
      expect(range).not.toContainEqual({ x: 0, y: 2 }); // Wall
      expect(range).not.toContainEqual({ x: 4, y: 2 }); // Wall
    });

    it('should allow movement to positions with passable terrain', () => {
      const range = calculator.calculateMovementRange(testUnit, testMap);

      // Should include reachable positions with normal terrain
      expect(range).toContainEqual({ x: 2, y: 1 }); // North (difficult terrain, cost 2)
      expect(range).toContainEqual({ x: 2, y: 3 }); // South (difficult terrain, cost 2)

      // Should include positions reachable within movement range
      // Check for positions that are actually reachable based on the terrain layout
      expect(range).toContainEqual({ x: 2, y: 1 }); // North (difficult terrain, cost 2)
      expect(range).toContainEqual({ x: 2, y: 3 }); // South (difficult terrain, cost 2)
    });
  });

  describe('position reachability with collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      calculator.setMapRenderer(mapRenderer);
    });

    it('should return false for positions occupied by other units', () => {
      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 1, y: 2 }, // Enemy position
        testMap
      );
      expect(reachable).toBe(false);
    });

    it('should return false for impassable terrain', () => {
      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 0, y: 2 }, // Wall position
        testMap
      );
      expect(reachable).toBe(false);
    });

    it('should return true for reachable empty positions', () => {
      const reachable = calculator.isPositionReachable(
        testUnit,
        { x: 2, y: 1 }, // Adjacent difficult terrain
        testMap
      );
      expect(reachable).toBe(true);
    });

    it('should return true for current position', () => {
      const reachable = calculator.isPositionReachable(testUnit, testUnit.position, testMap);
      expect(reachable).toBe(true);
    });
  });

  describe('movement cost calculation with collision', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      calculator.setMapRenderer(mapRenderer);
    });

    it('should return correct cost for reachable terrain', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 2, y: 1 }, // Reachable position through difficult terrain
        testMap
      );
      expect(cost).toBe(2); // 1 step north through difficult terrain
    });

    it('should return -1 for unreachable positions due to terrain', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 0, y: 2 }, // Wall position
        testMap
      );
      expect(cost).toBe(-1);
    });

    it('should return -1 for positions beyond movement range', () => {
      const cost = calculator.getMovementCostToPosition(
        testUnit,
        { x: 0, y: 0 }, // Too far away
        testMap
      );
      expect(cost).toBe(-1);
    });
  });

  describe('fallback behavior without MapRenderer', () => {
    it('should use original implementation when MapRenderer not set', () => {
      // Don't set MapRenderer
      const range = calculator.calculateMovementRange(testUnit, testMap, []);

      // Should still calculate movement range using original algorithm
      expect(range.length).toBeGreaterThan(0);
      expect(range).toContainEqual({ x: 2, y: 2 }); // Starting position
    });

    it('should handle occupied positions in fallback mode', () => {
      const occupiedPositions = [
        { x: 1, y: 2 },
        { x: 3, y: 2 },
      ];
      const range = calculator.calculateMovementRange(testUnit, testMap, occupiedPositions);

      // Should not include occupied positions
      expect(range).not.toContainEqual({ x: 1, y: 2 });
      expect(range).not.toContainEqual({ x: 3, y: 2 });
    });
  });

  describe('complex terrain scenarios', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      calculator.setMapRenderer(mapRenderer);
    });

    it('should handle mixed terrain with varying costs', () => {
      const range = calculator.calculateMovementRange(testUnit, testMap);

      // Verify that movement respects terrain costs
      const reachablePositions = range.filter(
        pos => pos.x !== testUnit.position.x || pos.y !== testUnit.position.y
      );

      for (const pos of reachablePositions) {
        const cost = calculator.getMovementCostToPosition(testUnit, pos, testMap);
        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeLessThanOrEqual(testUnit.stats.movement);
      }
    });

    it('should find paths around obstacles', () => {
      // Test movement to a position that is reachable
      const destination = { x: 2, y: 3 }; // South of starting position
      const reachable = calculator.isPositionReachable(testUnit, destination, testMap);

      expect(reachable).toBe(true);

      const cost = calculator.getMovementCostToPosition(testUnit, destination, testMap);
      expect(cost).toBe(2); // Should find a path within movement range
    });

    it('should respect unit collision in pathfinding', () => {
      // Place unit to block direct path
      const blockingUnit = {
        ...testUnits[1],
        position: { x: 2, y: 1 }, // Block north movement
      };

      mapRenderer.updateUnitPositions([testUnit, blockingUnit, testUnits[2]]);

      const range = calculator.calculateMovementRange(testUnit, testMap);

      // Should not include the blocked position
      expect(range).not.toContainEqual({ x: 2, y: 1 });

      // Should still be able to reach other positions
      expect(range).toContainEqual({ x: 2, y: 3 }); // South
    });
  });

  describe('performance with collision detection', () => {
    it('should handle large maps with many units efficiently', () => {
      // Create larger map
      const largeMap = {
        ...testMap,
        width: 20,
        height: 20,
        layers: [
          {
            ...testMap.layers[0],
            data: Array(20).fill(Array(20).fill(1)),
          },
          {
            ...testMap.layers[1],
            data: Array(20).fill(Array(20).fill(0)), // All normal terrain
          },
        ],
      };

      // Create many units
      const manyUnits: Unit[] = [];
      for (let i = 0; i < 50; i++) {
        manyUnits.push({
          ...testUnit,
          id: `unit-${i}`,
          position: { x: i % 20, y: Math.floor(i / 20) },
        });
      }

      const largeMapRenderer = new MapRenderer(mockScene);
      largeMapRenderer.loadMap(largeMap);
      largeMapRenderer.updateUnitPositions(manyUnits);

      const largeCalculator = new MovementCalculator();
      largeCalculator.setMapRenderer(largeMapRenderer);

      const start = performance.now();
      const range = largeCalculator.calculateMovementRange(testUnit, largeMap);
      const end = performance.now();

      expect(range.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in reasonable time

      largeMapRenderer.destroy();
    });
  });

  describe('edge cases with collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      calculator.setMapRenderer(mapRenderer);
    });

    it('should handle empty unit list', () => {
      mapRenderer.updateUnitPositions([]);
      const range = calculator.calculateMovementRange(testUnit, testMap);

      expect(range.length).toBeGreaterThan(0);
      expect(range).toContainEqual({ x: 2, y: 2 });
    });

    it('should handle unit with zero movement', () => {
      const immobileUnit = { ...testUnit, stats: { ...testUnit.stats, movement: 0 } };
      mapRenderer.updateUnitPositions([immobileUnit]);

      const range = calculator.calculateMovementRange(immobileUnit, testMap);
      expect(range).toEqual([{ x: 2, y: 2 }]); // Only starting position
    });

    it('should handle completely blocked unit', () => {
      // Create scenario where unit is completely surrounded
      const surroundedMap = {
        ...testMap,
        layers: [
          testMap.layers[0],
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6],
              [6, 6, 0, 6, 6], // Only center is passable
              [6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const blockedRenderer = new MapRenderer(mockScene);
      blockedRenderer.loadMap(surroundedMap);

      const blockedCalculator = new MovementCalculator();
      blockedCalculator.setMapRenderer(blockedRenderer);

      const range = blockedCalculator.calculateMovementRange(testUnit, surroundedMap);
      expect(range).toEqual([{ x: 2, y: 2 }]); // Only starting position

      blockedRenderer.destroy();
    });
  });
});
