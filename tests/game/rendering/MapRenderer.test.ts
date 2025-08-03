/**
 * Unit tests for MapRenderer
 * Tests map loading, grid rendering, and tile highlighting functionality
 */

import * as Phaser from 'phaser';
import { MapRenderer, TileHighlight } from '../../../game/src/rendering/MapRenderer';
import { MapData, MapLayer, Position, GameplayError } from '../../../game/src/types/gameplay';

// Mock Phaser scene and graphics objects
const createMockGraphics = () => ({
  setDepth: jest.fn(),
  clear: jest.fn(),
  lineStyle: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  strokePath: jest.fn(),
  fillStyle: jest.fn(),
  fillRect: jest.fn(),
  setVisible: jest.fn(),
  destroy: jest.fn(),
});

const mockScene = {
  add: {
    graphics: jest.fn(),
  },
  make: {
    tilemap: jest.fn(() => ({
      addTilesetImage: jest.fn(() => ({})),
      createLayer: jest.fn(() => ({
        setAlpha: jest.fn(),
        setDepth: jest.fn(),
      })),
      destroy: jest.fn(),
    })),
  },
} as unknown as Phaser.Scene;

describe('MapRenderer', () => {
  let mapRenderer: MapRenderer;
  let mockMapData: MapData;
  let mockGridGraphics: any;
  let mockHighlightGraphics: any;
  let graphicsCallCount: number;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    graphicsCallCount = 0;

    // Create separate mock graphics objects
    mockGridGraphics = createMockGraphics();
    mockHighlightGraphics = createMockGraphics();

    // Mock scene.add.graphics to return graphics objects in order
    (mockScene.add.graphics as jest.Mock).mockImplementation(() => {
      graphicsCallCount++;
      if (graphicsCallCount === 1) {
        return mockGridGraphics;
      } else if (graphicsCallCount === 2) {
        return mockHighlightGraphics;
      } else {
        return createMockGraphics();
      }
    });

    // Create test map data
    mockMapData = {
      width: 10,
      height: 8,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: Array(8)
            .fill(null)
            .map(() => Array(10).fill(1)),
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'terrain',
          type: 'terrain',
          data: Array(8)
            .fill(null)
            .map(() => Array(10).fill(0)),
          visible: true,
          opacity: 0.8,
        },
      ],
      playerSpawns: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      enemySpawns: [
        { x: 8, y: 6 },
        { x: 9, y: 6 },
      ],
    };

    mapRenderer = new MapRenderer(mockScene);
  });

  afterEach(() => {
    mapRenderer.destroy();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2); // Grid and highlight graphics
      expect(mockGridGraphics.setDepth).toHaveBeenCalledWith(100); // Grid depth
      expect(mockHighlightGraphics.setDepth).toHaveBeenCalledWith(150); // Highlight depth
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        tileSize: 64,
        gridColor: 0xff0000,
        gridAlpha: 0.5,
        showGrid: false,
      };

      const customRenderer = new MapRenderer(mockScene, customConfig);
      expect(customRenderer).toBeDefined();
      customRenderer.destroy();
    });
  });

  describe('loadMap', () => {
    it('should successfully load valid map data', async () => {
      const result = await mapRenderer.loadMap(mockMapData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Map loaded successfully');
      expect(mockScene.make.tilemap).toHaveBeenCalled();
    });

    it('should reject invalid map data', async () => {
      const invalidMapData = {
        width: -1,
        height: 0,
        tileSize: 0,
        layers: [],
        playerSpawns: [],
        enemySpawns: [],
      } as MapData;

      const result = await mapRenderer.loadMap(invalidMapData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.MAP_LOAD_FAILED);
      expect(result.message).toContain('Invalid map data structure');
    });

    it('should handle missing required properties', async () => {
      const incompleteMapData = {
        width: 10,
        height: 8,
        // Missing other required properties
      } as MapData;

      const result = await mapRenderer.loadMap(incompleteMapData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.MAP_LOAD_FAILED);
    });

    it('should update tile size from map data', async () => {
      const customTileSize = 64;
      const mapDataWithCustomTileSize = {
        ...mockMapData,
        tileSize: customTileSize,
      };

      await mapRenderer.loadMap(mapDataWithCustomTileSize);

      // Verify that the tile size is used in tilemap creation
      expect(mockScene.make.tilemap).toHaveBeenCalledWith(
        expect.objectContaining({
          tileWidth: customTileSize,
          tileHeight: customTileSize,
        })
      );
    });
  });

  describe('renderGrid', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should render grid with correct dimensions', () => {
      // Clear the mock calls from loadMap (which calls renderGrid automatically)
      mockGridGraphics.moveTo.mockClear();
      mockGridGraphics.lineTo.mockClear();
      mockGridGraphics.clear.mockClear();
      mockGridGraphics.lineStyle.mockClear();
      mockGridGraphics.strokePath.mockClear();

      mapRenderer.renderGrid();

      expect(mockGridGraphics.clear).toHaveBeenCalled();
      expect(mockGridGraphics.lineStyle).toHaveBeenCalledWith(1, 0xffffff, 0.3);

      // Should draw vertical lines (width + 1) and horizontal lines (height + 1)
      // Each line requires one moveTo and one lineTo call
      const expectedCalls = mockMapData.width + 1 + (mockMapData.height + 1);
      expect(mockGridGraphics.moveTo).toHaveBeenCalledTimes(expectedCalls);
      expect(mockGridGraphics.lineTo).toHaveBeenCalledTimes(expectedCalls);
      expect(mockGridGraphics.strokePath).toHaveBeenCalled();
    });

    it('should not render grid if no map data loaded', () => {
      const emptyRenderer = new MapRenderer(mockScene);

      // Should not throw error when calling renderGrid without map data
      expect(() => emptyRenderer.renderGrid()).not.toThrow();

      emptyRenderer.destroy();
    });

    it('should handle grid visibility toggle', () => {
      mapRenderer.setGridVisible(false);
      expect(mockGridGraphics.setVisible).toHaveBeenCalledWith(false);

      mapRenderer.setGridVisible(true);
      expect(mockGridGraphics.setVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('highlightTiles', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should highlight valid tile positions', () => {
      const highlights: TileHighlight[] = [
        { position: { x: 2, y: 3 }, color: 0xff0000, alpha: 0.5 },
        { position: { x: 5, y: 1 }, color: 0x00ff00, alpha: 0.7 },
      ];

      mapRenderer.highlightTiles(highlights);

      expect(mockHighlightGraphics.clear).toHaveBeenCalled();
      expect(mockHighlightGraphics.fillStyle).toHaveBeenCalledWith(0xff0000, 0.5);
      expect(mockHighlightGraphics.fillStyle).toHaveBeenCalledWith(0x00ff00, 0.7);
      expect(mockHighlightGraphics.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should ignore invalid tile positions', () => {
      const highlights: TileHighlight[] = [
        { position: { x: -1, y: 3 }, color: 0xff0000 }, // Invalid: negative x
        { position: { x: 15, y: 1 }, color: 0x00ff00 }, // Invalid: x out of bounds
        { position: { x: 2, y: 10 }, color: 0x0000ff }, // Invalid: y out of bounds
      ];

      mapRenderer.highlightTiles(highlights);

      expect(mockHighlightGraphics.clear).toHaveBeenCalled();
      expect(mockHighlightGraphics.fillStyle).not.toHaveBeenCalled();
      expect(mockHighlightGraphics.fillRect).not.toHaveBeenCalled();
    });

    it('should use default alpha if not specified', () => {
      const highlights: TileHighlight[] = [
        { position: { x: 2, y: 3 }, color: 0xff0000 }, // No alpha specified
      ];

      mapRenderer.highlightTiles(highlights);

      expect(mockHighlightGraphics.fillStyle).toHaveBeenCalledWith(0xff0000, 0.5); // Default alpha
    });

    it('should store current highlights', () => {
      const highlights: TileHighlight[] = [{ position: { x: 2, y: 3 }, color: 0xff0000 }];

      mapRenderer.highlightTiles(highlights);
      const currentHighlights = mapRenderer.getCurrentHighlights();

      expect(currentHighlights).toHaveLength(1);
      expect(currentHighlights[0]).toEqual(highlights[0]);
    });
  });

  describe('clearHighlights', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should clear all highlights', () => {
      const highlights: TileHighlight[] = [{ position: { x: 2, y: 3 }, color: 0xff0000 }];

      mapRenderer.highlightTiles(highlights);
      expect(mapRenderer.getCurrentHighlights()).toHaveLength(1);

      mapRenderer.clearHighlights();
      expect(mockHighlightGraphics.clear).toHaveBeenCalled();
      expect(mapRenderer.getCurrentHighlights()).toHaveLength(0);
    });
  });

  describe('Position conversion utilities', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should convert world position to tile position', () => {
      const worldX = 96; // 3 * 32
      const worldY = 128; // 4 * 32

      const tilePos = mapRenderer.getTileAtWorldPosition(worldX, worldY);

      expect(tilePos).toEqual({ x: 3, y: 4 });
    });

    it('should return null for invalid world positions', () => {
      const invalidWorldX = -50;
      const invalidWorldY = 1000;

      const tilePos = mapRenderer.getTileAtWorldPosition(invalidWorldX, invalidWorldY);

      expect(tilePos).toBeNull();
    });

    it('should convert tile position to world position', () => {
      const tilePos: Position = { x: 3, y: 4 };

      const worldPos = mapRenderer.tileToWorldPosition(tilePos);

      expect(worldPos).toEqual({
        x: 3 * 32 + 16, // Center of tile
        y: 4 * 32 + 16,
      });
    });

    it('should return null for invalid tile positions', () => {
      const invalidTilePos: Position = { x: -1, y: 15 };

      const worldPos = mapRenderer.tileToWorldPosition(invalidTilePos);

      expect(worldPos).toBeNull();
    });
  });

  describe('Position validation', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should validate positions within map bounds', () => {
      expect(mapRenderer.isValidPosition({ x: 0, y: 0 })).toBe(true);
      expect(mapRenderer.isValidPosition({ x: 5, y: 4 })).toBe(true);
      expect(mapRenderer.isValidPosition({ x: 9, y: 7 })).toBe(true); // Max valid position
    });

    it('should reject positions outside map bounds', () => {
      expect(mapRenderer.isValidPosition({ x: -1, y: 0 })).toBe(false);
      expect(mapRenderer.isValidPosition({ x: 0, y: -1 })).toBe(false);
      expect(mapRenderer.isValidPosition({ x: 10, y: 0 })).toBe(false); // x >= width
      expect(mapRenderer.isValidPosition({ x: 0, y: 8 })).toBe(false); // y >= height
    });

    it('should return false when no map data is loaded', () => {
      const emptyRenderer = new MapRenderer(mockScene);
      expect(emptyRenderer.isValidPosition({ x: 0, y: 0 })).toBe(false);
      emptyRenderer.destroy();
    });
  });

  describe('Grid style updates', () => {
    beforeEach(async () => {
      await mapRenderer.loadMap(mockMapData);
    });

    it('should update grid color and alpha', () => {
      const newColor = 0xff0000;
      const newAlpha = 0.8;

      mapRenderer.updateGridStyle(newColor, newAlpha);

      // Should trigger re-render with new style
      expect(mockGridGraphics.lineStyle).toHaveBeenCalledWith(1, newColor, newAlpha);
    });
  });

  describe('getMapData', () => {
    it('should return null when no map is loaded', () => {
      expect(mapRenderer.getMapData()).toBeNull();
    });

    it('should return current map data when loaded', async () => {
      await mapRenderer.loadMap(mockMapData);
      const retrievedMapData = mapRenderer.getMapData();

      expect(retrievedMapData).toEqual(mockMapData);
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      await mapRenderer.loadMap(mockMapData);

      mapRenderer.destroy();

      expect(mockGridGraphics.destroy).toHaveBeenCalled();
      expect(mockHighlightGraphics.destroy).toHaveBeenCalled();
      expect(mapRenderer.getMapData()).toBeNull();
      expect(mapRenderer.getCurrentHighlights()).toHaveLength(0);
    });

    it('should handle destroy when no resources are allocated', () => {
      const emptyRenderer = new MapRenderer(mockScene);

      expect(() => emptyRenderer.destroy()).not.toThrow();
    });
  });
});
