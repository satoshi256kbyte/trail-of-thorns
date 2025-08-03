/**
 * Unit tests for PathfindingService with collision detection
 * Tests enhanced pathfinding with MapRenderer integration and alternative path finding
 */

import { PathfindingService } from '../../../game/src/systems/PathfindingService';
import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { TerrainCost } from '../../../game/src/types/movement';

describe('PathfindingService - Collision Detection', () => {
  let pathfindingService: PathfindingService;
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

    pathfindingService = new PathfindingService();
    mapRenderer = new MapRenderer(mockScene);

    // Create test unit
    testUnit = {
      id: 'test-unit',
      name: 'Test Unit',
      position: { x: 0, y: 0 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 10,
        defense: 5,
        speed: 8,
        movement: 5,
      } as UnitStats,
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    // Create test map with obstacles and varied terrain
    testMap = {
      width: 6,
      height: 6,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: [
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
          ],
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'terrain',
          type: 'terrain',
          data: [
            [0, 0, 6, 0, 0, 0], // Wall at (2,0)
            [0, 4, 6, 4, 0, 0], // Wall at (2,1), difficult terrain
            [0, 0, 6, 0, 0, 0], // Wall at (2,2)
            [0, 0, 0, 0, 4, 4], // Difficult terrain
            [0, 0, 0, 0, 4, 4], // Difficult terrain
            [0, 0, 0, 0, 0, 0], // Normal terrain
          ],
          visible: true,
          opacity: 0.8,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 5, y: 5 }],
    };

    // Create units for collision testing
    testUnits = [
      testUnit,
      {
        id: 'blocker1',
        name: 'Blocker 1',
        position: { x: 1, y: 1 },
        stats: testUnit.stats,
        currentHP: 100,
        currentMP: 50,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'blocker2',
        name: 'Blocker 2',
        position: { x: 3, y: 3 },
        stats: testUnit.stats,
        currentHP: 100,
        currentMP: 50,
        faction: 'enemy',
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
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should use MapRenderer for enhanced pathfinding', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        testMap,
        10,
        [],
        testUnit
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 5, y: 5 });
    });

    it('should avoid positions occupied by other units', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        testMap,
        10,
        [],
        testUnit
      );

      // Path should not go through occupied positions
      for (const pos of path) {
        if (pos.x === 1 && pos.y === 1) {
          fail('Path should not go through occupied position (1,1)');
        }
        if (pos.x === 3 && pos.y === 3) {
          fail('Path should not go through occupied position (3,3)');
        }
      }
    });

    it('should avoid impassable terrain', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        testMap,
        10,
        [],
        testUnit
      );

      // Path should not go through walls
      for (const pos of path) {
        if (pos.x === 2) {
          fail(`Path should not go through wall at (2, ${pos.y})`);
        }
      }
    });

    it('should find path around obstacles', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        testMap,
        15,
        [],
        testUnit
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });

      // Verify path goes around the wall
      const hasDetour = path.some(pos => pos.y !== 0);
      expect(hasDetour).toBe(true);
    });
  });

  describe('alternative path finding', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should find alternative paths when direct path is blocked', () => {
      const alternatives = pathfindingService.findAlternativePaths(
        { x: 0, y: 0 },
        { x: 1, y: 1 }, // Occupied position
        testMap,
        10,
        testUnit
      );

      // Should return at least empty array (no direct path possible)
      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);

      // If alternatives exist, they should be valid paths
      for (const path of alternatives) {
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual({ x: 0, y: 0 }); // Should start from start position
      }
    });

    it('should return direct path when available', () => {
      const alternatives = pathfindingService.findAlternativePaths(
        { x: 0, y: 0 },
        { x: 0, y: 3 }, // Unoccupied position
        testMap,
        10,
        testUnit
      );

      expect(alternatives.length).toBeGreaterThan(0);

      // First alternative should be the direct path
      const directPath = alternatives[0];
      expect(directPath[0]).toEqual({ x: 0, y: 0 });
      expect(directPath[directPath.length - 1]).toEqual({ x: 0, y: 3 });
    });

    it('should handle cases where no alternatives exist', () => {
      // Create completely blocked scenario
      const blockedMap = {
        ...testMap,
        layers: [
          testMap.layers[0],
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6, 6],
              [6, 6, 6, 6, 6, 6],
            ],
            visible: true,
            opacity: 0.8,
          },
        ],
      };

      const blockedRenderer = new MapRenderer(mockScene);
      blockedRenderer.loadMap(blockedMap);

      const blockedPathfinding = new PathfindingService();
      blockedPathfinding.setMapRenderer(blockedRenderer);

      const alternatives = blockedPathfinding.findAlternativePaths(
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        blockedMap,
        10,
        testUnit
      );

      expect(alternatives).toHaveLength(0);
      blockedRenderer.destroy();
    });
  });

  describe('terrain cost consideration', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should respect terrain movement costs in pathfinding', () => {
      const path = pathfindingService.findPath({ x: 0, y: 3 }, { x: 5, y: 3 }, testMap, 10);

      const pathCost = pathfindingService.calculatePathCost(path, testMap);
      expect(pathCost).toBeGreaterThan(5); // Should account for difficult terrain
      expect(pathCost).toBeLessThanOrEqual(10); // Should be within max cost
    });

    it('should find optimal path considering terrain costs', () => {
      // Compare paths through different terrain types
      const pathThroughDifficult = pathfindingService.findPath(
        { x: 0, y: 3 },
        { x: 5, y: 4 }, // Through difficult terrain
        testMap,
        15
      );

      const pathAroundDifficult = pathfindingService.findPath(
        { x: 0, y: 3 },
        { x: 5, y: 5 }, // Around difficult terrain
        testMap,
        15
      );

      if (pathThroughDifficult.length > 0 && pathAroundDifficult.length > 0) {
        const costThroughDifficult = pathfindingService.calculatePathCost(
          pathThroughDifficult,
          testMap
        );
        const costAroundDifficult = pathfindingService.calculatePathCost(
          pathAroundDifficult,
          testMap
        );

        // Algorithm should prefer lower cost paths
        expect(costThroughDifficult).toBeGreaterThan(costAroundDifficult);
      }
    });

    it('should reject paths that exceed maximum cost', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        testMap,
        3 // Very low max cost
      );

      expect(path).toHaveLength(0);
    });
  });

  describe('unit exclusion in collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should exclude specified unit from collision checks', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 1, y: 1 }, // Position occupied by blocker1
        testMap,
        10,
        [],
        testUnits[1] // Exclude blocker1
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 1, y: 1 });
    });

    it('should still avoid other units not excluded', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        testMap,
        15,
        [],
        testUnits[1] // Exclude blocker1 but not blocker2
      );

      // Path should not go through blocker2's position
      for (const pos of path) {
        if (pos.x === 3 && pos.y === 3) {
          fail('Path should not go through non-excluded unit position (3,3)');
        }
      }
    });
  });

  describe('fallback behavior without MapRenderer', () => {
    it('should use original pathfinding when MapRenderer not set', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 1, y: 3 }, // Reachable position
        testMap,
        10,
        [{ x: 1, y: 1 }] // Occupied positions array
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 1, y: 3 });
    });

    it('should handle occupied positions in fallback mode', () => {
      const occupiedPositions = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ];
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 1, y: 3 },
        testMap,
        10,
        occupiedPositions
      );

      // Path should avoid occupied positions
      for (const pos of path) {
        for (const occupied of occupiedPositions) {
          if (pos.x === occupied.x && pos.y === occupied.y) {
            fail(`Path should not go through occupied position (${occupied.x},${occupied.y})`);
          }
        }
      }
    });
  });

  describe('path validation with collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should validate paths correctly with unit positions', () => {
      const validPath = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ];

      const isValid = pathfindingService.isPathValid(validPath, testMap, 10, []);
      expect(isValid).toBe(true);
    });

    it('should reject paths through occupied positions', () => {
      const invalidPath = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }, // Occupied by blocker1
        { x: 2, y: 2 },
      ];

      const occupiedPositions = [{ x: 1, y: 1 }];
      const isValid = pathfindingService.isPathValid(invalidPath, testMap, 10, occupiedPositions);
      expect(isValid).toBe(false);
    });

    it('should reject paths through impassable terrain', () => {
      const invalidPath = [
        { x: 1, y: 0 },
        { x: 2, y: 0 }, // Wall
        { x: 3, y: 0 },
      ];

      const isValid = pathfindingService.isPathValid(invalidPath, testMap, 10, []);
      expect(isValid).toBe(false);
    });
  });

  describe('performance with collision detection', () => {
    it('should handle complex scenarios efficiently', () => {
      // Create larger map with many obstacles
      const complexMap = {
        ...testMap,
        width: 15,
        height: 15,
        layers: [
          {
            ...testMap.layers[0],
            data: Array(15).fill(Array(15).fill(1)),
          },
          {
            ...testMap.layers[1],
            data: Array(15)
              .fill(null)
              .map((_, y) =>
                Array(15)
                  .fill(null)
                  .map((_, x) => {
                    // Create maze-like pattern
                    if ((x + y) % 3 === 0 && x % 2 === 1) return 6; // Walls
                    if ((x + y) % 4 === 0) return 4; // Difficult terrain
                    return 0; // Normal terrain
                  })
              ),
          },
        ],
      };

      const complexRenderer = new MapRenderer(mockScene);
      complexRenderer.loadMap(complexMap);

      const complexPathfinding = new PathfindingService();
      complexPathfinding.setMapRenderer(complexRenderer);

      const start = performance.now();
      const path = complexPathfinding.findPath({ x: 0, y: 0 }, { x: 14, y: 14 }, complexMap, 50);
      const end = performance.now();

      expect(end - start).toBeLessThan(200); // Should complete in reasonable time
      if (path.length > 0) {
        expect(path[0]).toEqual({ x: 0, y: 0 });
        expect(path[path.length - 1]).toEqual({ x: 14, y: 14 });
      }

      complexRenderer.destroy();
    });
  });

  describe('edge cases with collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      pathfindingService.setMapRenderer(mapRenderer);
    });

    it('should handle same start and goal positions', () => {
      const path = pathfindingService.findPath({ x: 2, y: 2 }, { x: 2, y: 2 }, testMap, 10);

      expect(path).toEqual([{ x: 2, y: 2 }]);
    });

    it('should handle unreachable destinations', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 2, y: 1 }, // Wall position
        testMap,
        10
      );

      expect(path).toHaveLength(0);
    });

    it('should handle zero movement cost', () => {
      const path = pathfindingService.findPath(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        testMap,
        0 // Zero max cost
      );

      expect(path).toHaveLength(0);
    });
  });
});
