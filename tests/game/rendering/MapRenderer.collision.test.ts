/**
 * Unit tests for MapRenderer collision detection and terrain interaction
 * Tests terrain cost data, unit collision detection, and alternative path finding
 */

import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { Unit, Position, MapData, UnitStats } from '../../../game/src/types/gameplay';
import { TerrainCost } from '../../../game/src/types/movement';

describe('MapRenderer - Collision Detection and Terrain Interaction', () => {
  let mapRenderer: MapRenderer;
  let mockScene: any;
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

    // Create test map with mixed terrain
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
            [0, 0, 6, 0, 0], // Normal terrain with wall in middle
            [0, 4, 4, 4, 0], // Difficult terrain
            [6, 4, 0, 4, 6], // Mixed terrain with walls
            [0, 4, 4, 4, 0], // Difficult terrain
            [0, 0, 6, 0, 0], // Normal terrain with wall in middle
          ],
          visible: true,
          opacity: 0.8,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 4, y: 4 }],
    };

    // Create test units
    testUnits = [
      {
        id: 'player1',
        name: 'Player 1',
        position: { x: 1, y: 1 },
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
      },
      {
        id: 'enemy1',
        name: 'Enemy 1',
        position: { x: 3, y: 3 },
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
    ];

    mapRenderer = new MapRenderer(mockScene);
  });

  afterEach(() => {
    mapRenderer.destroy();
  });

  describe('terrain cost data', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
    });

    it('should return correct movement cost for normal terrain', () => {
      const cost = mapRenderer.getTerrainMovementCost({ x: 0, y: 0 }, { x: 0, y: 1 });
      expect(cost).toBe(1);
    });

    it('should return correct movement cost for difficult terrain', () => {
      const cost = mapRenderer.getTerrainMovementCost({ x: 1, y: 0 }, { x: 1, y: 1 });
      expect(cost).toBe(2); // Difficult terrain (type 4)
    });

    it('should return -1 for impassable terrain', () => {
      const cost = mapRenderer.getTerrainMovementCost({ x: 1, y: 0 }, { x: 2, y: 0 });
      expect(cost).toBe(-1); // Wall (type 6)
    });

    it('should return -1 for out-of-bounds positions', () => {
      const cost = mapRenderer.getTerrainMovementCost({ x: 0, y: 0 }, { x: -1, y: 0 });
      expect(cost).toBe(-1);
    });

    it('should handle custom terrain costs', () => {
      const customCosts: TerrainCost = {
        '0': { movementCost: 2, isPassable: true },
        '4': { movementCost: 5, isPassable: true },
        '6': { movementCost: 1, isPassable: false },
      };

      mapRenderer.setTerrainCosts(customCosts);

      expect(mapRenderer.getTerrainMovementCost({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(2);
      expect(mapRenderer.getTerrainMovementCost({ x: 1, y: 0 }, { x: 1, y: 1 })).toBe(5);
      expect(mapRenderer.getTerrainMovementCost({ x: 1, y: 0 }, { x: 2, y: 0 })).toBe(-1);
    });
  });

  describe('terrain passability', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
    });

    it('should identify passable terrain correctly', () => {
      expect(mapRenderer.isTerrainPassable({ x: 0, y: 0 })).toBe(true); // Normal terrain
      expect(mapRenderer.isTerrainPassable({ x: 1, y: 1 })).toBe(true); // Difficult terrain
    });

    it('should identify impassable terrain correctly', () => {
      expect(mapRenderer.isTerrainPassable({ x: 2, y: 0 })).toBe(false); // Wall
      expect(mapRenderer.isTerrainPassable({ x: 0, y: 2 })).toBe(false); // Wall
    });

    it('should return false for out-of-bounds positions', () => {
      expect(mapRenderer.isTerrainPassable({ x: -1, y: 0 })).toBe(false);
      expect(mapRenderer.isTerrainPassable({ x: 5, y: 0 })).toBe(false);
    });
  });

  describe('unit collision detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
    });

    it('should detect occupied positions correctly', () => {
      expect(mapRenderer.isPositionOccupied({ x: 1, y: 1 })).toBe(true); // Player 1 position
      expect(mapRenderer.isPositionOccupied({ x: 3, y: 3 })).toBe(true); // Enemy 1 position
      expect(mapRenderer.isPositionOccupied({ x: 0, y: 0 })).toBe(false); // Empty position
    });

    it('should exclude specified unit from collision check', () => {
      const player1 = testUnits[0];
      expect(mapRenderer.isPositionOccupied({ x: 1, y: 1 }, player1)).toBe(false);
      expect(mapRenderer.isPositionOccupied({ x: 3, y: 3 }, player1)).toBe(true);
    });

    it('should return correct unit at position', () => {
      const unitAtPos = mapRenderer.getUnitAtPosition({ x: 1, y: 1 });
      expect(unitAtPos).toBe(testUnits[0]);

      const noUnit = mapRenderer.getUnitAtPosition({ x: 0, y: 0 });
      expect(noUnit).toBeNull();
    });

    it('should return all occupied positions', () => {
      const occupiedPositions = mapRenderer.getOccupiedPositions();
      expect(occupiedPositions).toHaveLength(2);
      expect(occupiedPositions).toContainEqual({ x: 1, y: 1 });
      expect(occupiedPositions).toContainEqual({ x: 3, y: 3 });
    });

    it('should ignore dead units in collision detection', () => {
      const deadUnit = { ...testUnits[0], currentHP: 0 };
      mapRenderer.updateUnitPositions([deadUnit, testUnits[1]]);

      expect(mapRenderer.isPositionOccupied({ x: 1, y: 1 })).toBe(false);
      expect(mapRenderer.isPositionOccupied({ x: 3, y: 3 })).toBe(true);
    });
  });

  describe('position blocking detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
    });

    it('should detect blocked positions correctly', () => {
      // Out of bounds
      expect(mapRenderer.isPositionBlocked({ x: -1, y: 0 })).toBe(true);
      expect(mapRenderer.isPositionBlocked({ x: 5, y: 0 })).toBe(true);

      // Impassable terrain
      expect(mapRenderer.isPositionBlocked({ x: 2, y: 0 })).toBe(true);
      expect(mapRenderer.isPositionBlocked({ x: 0, y: 2 })).toBe(true);

      // Occupied by unit
      expect(mapRenderer.isPositionBlocked({ x: 1, y: 1 })).toBe(true);
      expect(mapRenderer.isPositionBlocked({ x: 3, y: 3 })).toBe(true);

      // Free position
      expect(mapRenderer.isPositionBlocked({ x: 0, y: 0 })).toBe(false);
    });

    it('should exclude specified unit from blocking check', () => {
      const player1 = testUnits[0];
      expect(mapRenderer.isPositionBlocked({ x: 1, y: 1 }, player1)).toBe(false);
      expect(mapRenderer.isPositionBlocked({ x: 3, y: 3 }, player1)).toBe(true);
    });
  });

  describe('alternative path finding', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
    });

    it('should find alternative positions around blocked destination', () => {
      const alternatives = mapRenderer.findAlternativePositions(
        { x: 0, y: 0 },
        { x: 1, y: 1 }, // Occupied by player1
        testUnits[0] // Exclude player1
      );

      expect(alternatives.length).toBeGreaterThan(0);

      // Should include adjacent positions that are not blocked
      const validAlternatives = alternatives.filter(
        pos => !mapRenderer.isPositionBlocked(pos, testUnits[0])
      );
      expect(validAlternatives.length).toBe(alternatives.length);
    });

    it('should sort alternatives by distance from start', () => {
      const alternatives = mapRenderer.findAlternativePositions({ x: 0, y: 0 }, { x: 2, y: 2 });

      if (alternatives.length > 1) {
        for (let i = 1; i < alternatives.length; i++) {
          const distPrev =
            Math.abs(alternatives[i - 1].x - 0) + Math.abs(alternatives[i - 1].y - 0);
          const distCurr = Math.abs(alternatives[i].x - 0) + Math.abs(alternatives[i].y - 0);
          expect(distCurr).toBeGreaterThanOrEqual(distPrev);
        }
      }
    });

    it('should return empty array when no alternatives available', () => {
      // Create a scenario where destination is surrounded by walls
      const blockedMap = {
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
      blockedRenderer.loadMap(blockedMap);

      const alternatives = blockedRenderer.findAlternativePositions({ x: 0, y: 0 }, { x: 2, y: 2 });

      expect(alternatives).toHaveLength(0);
      blockedRenderer.destroy();
    });
  });

  describe('terrain type detection', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
    });

    it('should return correct terrain type for valid positions', () => {
      expect(mapRenderer.getTerrainTypeAt({ x: 0, y: 0 })).toBe(0); // Normal terrain
      expect(mapRenderer.getTerrainTypeAt({ x: 1, y: 1 })).toBe(4); // Difficult terrain
      expect(mapRenderer.getTerrainTypeAt({ x: 2, y: 0 })).toBe(6); // Wall
    });

    it('should return default terrain type for out-of-bounds positions', () => {
      expect(mapRenderer.getTerrainTypeAt({ x: -1, y: 0 })).toBe(0);
      expect(mapRenderer.getTerrainTypeAt({ x: 5, y: 0 })).toBe(0);
    });

    it('should handle missing terrain layer', () => {
      const noTerrainMap = {
        ...testMap,
        layers: [testMap.layers[0]], // Only background layer
      };

      const noTerrainRenderer = new MapRenderer(mockScene);
      noTerrainRenderer.loadMap(noTerrainMap);

      expect(noTerrainRenderer.getTerrainTypeAt({ x: 2, y: 2 })).toBe(0);
      noTerrainRenderer.destroy();
    });
  });

  describe('terrain cost configuration', () => {
    it('should allow updating terrain costs', () => {
      const newCosts: TerrainCost = {
        '0': { movementCost: 3, isPassable: true },
        '4': { movementCost: 5, isPassable: false },
      };

      mapRenderer.setTerrainCosts(newCosts);
      const retrievedCosts = mapRenderer.getTerrainCosts();

      expect(retrievedCosts['0']).toEqual({ movementCost: 3, isPassable: true });
      expect(retrievedCosts['4']).toEqual({ movementCost: 5, isPassable: false });
    });

    it('should not modify original terrain costs object', () => {
      const originalCosts = mapRenderer.getTerrainCosts();
      const modifiedCosts = mapRenderer.getTerrainCosts();
      modifiedCosts['0'].movementCost = 999;

      const currentCosts = mapRenderer.getTerrainCosts();
      expect(currentCosts['0'].movementCost).not.toBe(999);
    });
  });

  describe('integration with movement systems', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(testMap);
      mapRenderer.updateUnitPositions(testUnits);
    });

    it('should provide consistent terrain data for movement calculations', () => {
      // Test various terrain types
      const positions = [
        { pos: { x: 0, y: 0 }, expectedCost: 1, expectedPassable: true },
        { pos: { x: 1, y: 1 }, expectedCost: 2, expectedPassable: true },
        { pos: { x: 2, y: 0 }, expectedCost: -1, expectedPassable: false },
      ];

      for (const test of positions) {
        const cost = mapRenderer.getTerrainMovementCost({ x: 0, y: 0 }, test.pos);
        const passable = mapRenderer.isTerrainPassable(test.pos);

        expect(cost).toBe(test.expectedCost);
        expect(passable).toBe(test.expectedPassable);
      }
    });

    it('should handle unit position updates correctly', () => {
      // Move a unit
      const updatedUnits = [...testUnits];
      updatedUnits[0] = { ...updatedUnits[0], position: { x: 0, y: 0 } };

      mapRenderer.updateUnitPositions(updatedUnits);

      // Old position should be free
      expect(mapRenderer.isPositionOccupied({ x: 1, y: 1 })).toBe(false);
      // New position should be occupied
      expect(mapRenderer.isPositionOccupied({ x: 0, y: 0 })).toBe(true);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle empty unit list', () => {
      mapRenderer.updateUnitPositions([]);
      expect(mapRenderer.getOccupiedPositions()).toHaveLength(0);
      expect(mapRenderer.isPositionOccupied({ x: 1, y: 1 })).toBe(false);
    });

    it('should handle large number of units efficiently', () => {
      const manyUnits: Unit[] = [];
      for (let i = 0; i < 100; i++) {
        manyUnits.push({
          id: `unit-${i}`,
          name: `Unit ${i}`,
          position: { x: i % 5, y: Math.floor(i / 5) % 5 },
          stats: testUnits[0].stats,
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        });
      }

      const start = performance.now();
      mapRenderer.updateUnitPositions(manyUnits);
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should complete quickly
      expect(mapRenderer.getOccupiedPositions().length).toBeGreaterThan(0);
    });

    it('should handle units at same position', () => {
      const overlappingUnits = [
        { ...testUnits[0], id: 'unit1', position: { x: 2, y: 2 } },
        { ...testUnits[1], id: 'unit2', position: { x: 2, y: 2 } },
      ];

      mapRenderer.updateUnitPositions(overlappingUnits);

      expect(mapRenderer.isPositionOccupied({ x: 2, y: 2 })).toBe(true);
      // Should return one of the units (last one processed)
      const unitAtPos = mapRenderer.getUnitAtPosition({ x: 2, y: 2 });
      expect(unitAtPos).toBeTruthy();
      expect(['unit1', 'unit2']).toContain(unitAtPos!.id);
    });
  });
});
