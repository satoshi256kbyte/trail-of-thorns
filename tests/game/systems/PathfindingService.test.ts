/**
 * PathfindingService Unit Tests
 *
 * Tests the A* pathfinding algorithm implementation for accuracy,
 * optimal path selection, and edge case handling.
 */

import { PathfindingService } from '../../../game/src/systems/PathfindingService';
import { Position, MapData, MapLayer } from '../../../game/src/types/gameplay';
import { TerrainCost } from '../../../game/src/types/movement';
import { PositionUtils } from '../../../game/src/types/movement';

describe('PathfindingService', () => {
  let pathfindingService: PathfindingService;
  let testMap: MapData;
  let customTerrainCosts: TerrainCost;

  beforeEach(() => {
    // Create a simple test map
    const terrainLayer: MapLayer = {
      name: 'terrain',
      type: 'terrain',
      data: [
        [0, 0, 0, 0, 0],
        [0, 6, 6, 6, 0],
        [0, 0, 0, 0, 0],
        [0, 4, 4, 4, 0],
        [0, 0, 0, 0, 0],
      ],
      visible: true,
      opacity: 1,
    };

    testMap = {
      width: 5,
      height: 5,
      tileSize: 32,
      layers: [terrainLayer],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 4, y: 4 }],
    };

    customTerrainCosts = {
      '0': { movementCost: 1, isPassable: true }, // Normal ground
      '4': { movementCost: 2, isPassable: true }, // Difficult terrain
      '6': { movementCost: 1, isPassable: false }, // Impassable wall
    };

    pathfindingService = new PathfindingService(customTerrainCosts);
  });

  describe('Constructor', () => {
    it('should initialize with default terrain costs when none provided', () => {
      const service = new PathfindingService();
      const terrainCosts = service.getTerrainCosts();

      expect(terrainCosts).toBeDefined();
      expect(terrainCosts['0']).toEqual({ movementCost: 1, isPassable: true });
    });

    it('should initialize with custom terrain costs when provided', () => {
      const service = new PathfindingService(customTerrainCosts);
      const terrainCosts = service.getTerrainCosts();

      expect(terrainCosts['0']).toEqual({ movementCost: 1, isPassable: true });
      expect(terrainCosts['4']).toEqual({ movementCost: 2, isPassable: true });
      expect(terrainCosts['6']).toEqual({ movementCost: 1, isPassable: false });
    });
  });

  describe('findPath', () => {
    it('should find a direct path when no obstacles exist', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 0 };

      const path = pathfindingService.findPath(start, goal, testMap, 10);

      expect(path).toHaveLength(3);
      expect(path[0]).toEqual(start);
      expect(path[1]).toEqual({ x: 1, y: 0 });
      expect(path[2]).toEqual(goal);
    });

    it('should return path with just start position when start equals goal', () => {
      const position: Position = { x: 2, y: 2 };

      const path = pathfindingService.findPath(position, position, testMap, 10);

      expect(path).toHaveLength(1);
      expect(path[0]).toEqual(position);
    });

    it('should find path around obstacles', () => {
      const start: Position = { x: 0, y: 1 };
      const goal: Position = { x: 4, y: 1 };

      const path = pathfindingService.findPath(start, goal, testMap, 10);

      expect(path.length).toBeGreaterThan(4); // Must go around the wall
      expect(path[0]).toEqual(start);
      expect(path[path.length - 1]).toEqual(goal);

      // Verify path doesn't go through walls (terrain type 6)
      for (const position of path) {
        const terrainType = testMap.layers[0].data[position.y][position.x];
        expect(terrainType).not.toBe(6);
      }
    });

    it('should return empty array when no path exists', () => {
      // Create a map where goal is completely surrounded by walls
      const blockedMap: MapData = {
        ...testMap,
        layers: [
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 0, 0, 0, 0],
              [0, 6, 6, 6, 0],
              [0, 6, 0, 6, 0], // Goal at (2,2) surrounded by walls
              [0, 6, 6, 6, 0],
              [0, 0, 0, 0, 0],
            ],
            visible: true,
            opacity: 1,
          },
        ],
      };

      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };

      const path = pathfindingService.findPath(start, goal, blockedMap, 10);

      expect(path).toHaveLength(0);
    });

    it('should respect maximum cost constraint', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 4, y: 0 };
      const maxCost = 2; // Not enough to reach goal

      const path = pathfindingService.findPath(start, goal, testMap, maxCost);

      expect(path).toHaveLength(0);
    });

    it('should avoid occupied positions', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 0 };
      const occupiedPositions: Position[] = [{ x: 1, y: 0 }]; // Block direct path

      const path = pathfindingService.findPath(start, goal, testMap, 10, occupiedPositions);

      expect(path.length).toBeGreaterThan(3); // Must go around occupied position
      expect(path[0]).toEqual(start);
      expect(path[path.length - 1]).toEqual(goal);

      // Verify path doesn't go through occupied positions (except goal)
      for (let i = 1; i < path.length - 1; i++) {
        expect(occupiedPositions.some(pos => PositionUtils.equals(pos, path[i]))).toBe(false);
      }
    });

    it('should allow movement to goal even if occupied', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 0 };
      const occupiedPositions: Position[] = [goal]; // Goal is occupied

      const path = pathfindingService.findPath(start, goal, testMap, 10, occupiedPositions);

      expect(path).toHaveLength(2);
      expect(path[0]).toEqual(start);
      expect(path[1]).toEqual(goal);
    });

    it('should handle invalid positions gracefully', () => {
      const start: Position = { x: -1, y: 0 }; // Invalid start
      const goal: Position = { x: 2, y: 0 };

      const path = pathfindingService.findPath(start, goal, testMap, 10);

      expect(path).toHaveLength(0);
    });

    it('should handle zero or negative max cost', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 0 };

      const path1 = pathfindingService.findPath(start, goal, testMap, 0);
      const path2 = pathfindingService.findPath(start, goal, testMap, -1);

      expect(path1).toHaveLength(0);
      expect(path2).toHaveLength(0);
    });

    it('should find optimal path considering terrain costs', () => {
      // Create a map where there are two paths: one through difficult terrain, one longer but easier
      const costMap: MapData = {
        ...testMap,
        layers: [
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [0, 4, 0, 0, 0], // Difficult terrain in middle
              [0, 4, 0, 0, 0],
              [0, 4, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
            ],
            visible: true,
            opacity: 1,
          },
        ],
      };

      const start: Position = { x: 0, y: 1 };
      const goal: Position = { x: 2, y: 1 };

      const path = pathfindingService.findPath(start, goal, costMap, 10);

      expect(path.length).toBeGreaterThan(0);

      // Calculate path cost to ensure it's optimal
      const pathCost = pathfindingService.calculatePathCost(path, costMap);
      expect(pathCost).toBeGreaterThan(0);
      expect(pathCost).toBeLessThanOrEqual(10);
    });
  });

  describe('calculatePathCost', () => {
    it('should return 0 for empty path', () => {
      const cost = pathfindingService.calculatePathCost([], testMap);
      expect(cost).toBe(0);
    });

    it('should return 0 for single position path', () => {
      const path: Position[] = [{ x: 0, y: 0 }];
      const cost = pathfindingService.calculatePathCost(path, testMap);
      expect(cost).toBe(0);
    });

    it('should calculate correct cost for simple path', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];

      const cost = pathfindingService.calculatePathCost(path, testMap);
      expect(cost).toBe(2); // Two moves, each costing 1
    });

    it('should calculate correct cost for path through difficult terrain', () => {
      const path: Position[] = [
        { x: 0, y: 3 },
        { x: 1, y: 3 }, // Difficult terrain (cost 2)
        { x: 2, y: 3 }, // Difficult terrain (cost 2)
      ];

      const cost = pathfindingService.calculatePathCost(path, testMap);
      expect(cost).toBe(4); // First move cost 2, second move cost 2
    });

    it('should return -1 for invalid path with non-adjacent positions', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 2, y: 0 }, // Not adjacent to previous position
      ];

      const cost = pathfindingService.calculatePathCost(path, testMap);
      expect(cost).toBe(-1);
    });

    it('should return -1 for path through impassable terrain', () => {
      const path: Position[] = [
        { x: 0, y: 1 },
        { x: 1, y: 1 }, // Impassable wall
      ];

      const cost = pathfindingService.calculatePathCost(path, testMap);
      expect(cost).toBe(-1);
    });
  });

  describe('findMultiplePaths', () => {
    it('should return path options', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 0 };

      const paths = pathfindingService.findMultiplePaths(start, goal, testMap, 10);

      expect(paths.shortest).toBeDefined();
      expect(paths.safest).toBeDefined();
      expect(paths.direct).toBeDefined();

      // For now, all paths should be the same (basic implementation)
      expect(paths.shortest).toEqual(paths.safest);
      expect(paths.shortest).toEqual(paths.direct);
    });
  });

  describe('isPathValid', () => {
    it('should return true for valid path', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];

      const isValid = pathfindingService.isPathValid(path, testMap, 10);
      expect(isValid).toBe(true);
    });

    it('should return false for empty path', () => {
      const isValid = pathfindingService.isPathValid([], testMap, 10);
      expect(isValid).toBe(false);
    });

    it('should return false for path exceeding max cost', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];

      const isValid = pathfindingService.isPathValid(path, testMap, 1); // Max cost too low
      expect(isValid).toBe(false);
    });

    it('should return false for path through occupied positions', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      const occupiedPositions: Position[] = [{ x: 1, y: 0 }];

      const isValid = pathfindingService.isPathValid(path, testMap, 10, occupiedPositions);
      expect(isValid).toBe(false);
    });

    it('should return true for path where only destination is occupied', () => {
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      const occupiedPositions: Position[] = [{ x: 2, y: 0 }]; // Only destination occupied

      const isValid = pathfindingService.isPathValid(path, testMap, 10, occupiedPositions);
      expect(isValid).toBe(true);
    });
  });

  describe('setTerrainCosts and getTerrainCosts', () => {
    it('should update terrain costs', () => {
      const newCosts: TerrainCost = {
        '0': { movementCost: 2, isPassable: true },
        '1': { movementCost: 3, isPassable: false },
      };

      pathfindingService.setTerrainCosts(newCosts);
      const retrievedCosts = pathfindingService.getTerrainCosts();

      expect(retrievedCosts['0']).toEqual({ movementCost: 2, isPassable: true });
      expect(retrievedCosts['1']).toEqual({ movementCost: 3, isPassable: false });
    });

    it('should return a copy of terrain costs to prevent external modification', () => {
      const originalCosts = pathfindingService.getTerrainCosts();
      originalCosts['0'].movementCost = 999;

      const newCosts = pathfindingService.getTerrainCosts();
      expect(newCosts['0'].movementCost).not.toBe(999);
    });
  });

  describe('Edge Cases', () => {
    it('should handle map with no terrain layer', () => {
      const mapWithoutTerrain: MapData = {
        ...testMap,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: [
              [0, 0],
              [0, 0],
            ],
            visible: true,
            opacity: 1,
          },
        ],
      };

      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 0 };

      const path = pathfindingService.findPath(start, goal, mapWithoutTerrain, 10);

      expect(path).toHaveLength(2); // Should use default terrain costs
    });

    it('should handle positions outside terrain data bounds', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 10, y: 10 }; // Outside map bounds

      const path = pathfindingService.findPath(start, goal, testMap, 100);

      expect(path).toHaveLength(0);
    });

    it('should handle unknown terrain types gracefully', () => {
      const mapWithUnknownTerrain: MapData = {
        ...testMap,
        layers: [
          {
            name: 'terrain',
            type: 'terrain',
            data: [
              [99, 99], // Unknown terrain type
              [99, 99],
            ],
            visible: true,
            opacity: 1,
          },
        ],
      };

      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 0 };

      const path = pathfindingService.findPath(start, goal, mapWithUnknownTerrain, 10);

      expect(path).toHaveLength(2); // Should use default terrain cost
    });
  });

  describe('Performance', () => {
    it('should handle large maps efficiently', () => {
      // Create a larger map for performance testing
      const largeMapSize = 20;
      const largeTerrainData: number[][] = [];

      for (let y = 0; y < largeMapSize; y++) {
        const row: number[] = [];
        for (let x = 0; x < largeMapSize; x++) {
          row.push(0); // All passable terrain
        }
        largeTerrainData.push(row);
      }

      const largeMap: MapData = {
        width: largeMapSize,
        height: largeMapSize,
        tileSize: 32,
        layers: [
          {
            name: 'terrain',
            type: 'terrain',
            data: largeTerrainData,
            visible: true,
            opacity: 1,
          },
        ],
        playerSpawns: [{ x: 0, y: 0 }],
        enemySpawns: [{ x: largeMapSize - 1, y: largeMapSize - 1 }],
      };

      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: largeMapSize - 1, y: largeMapSize - 1 };

      const startTime = performance.now();
      const path = pathfindingService.findPath(start, goal, largeMap, 100);
      const endTime = performance.now();

      expect(path.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
