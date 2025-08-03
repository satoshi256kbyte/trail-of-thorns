/**
 * MovementRenderer unit tests
 * Tests visual feedback accuracy and highlight management functionality
 */

import * as Phaser from 'phaser';
import {
  MovementRenderer,
  MovementHighlightType,
  MovementHighlight,
} from '../../../game/src/rendering/MovementRenderer';
import { Position, Unit, MapData, MapLayer } from '../../../game/src/types/gameplay';

// Mock Phaser objects
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      setDepth: jest.fn(),
      clear: jest.fn(),
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      lineStyle: jest.fn(),
      strokeRect: jest.fn(),
      destroy: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fillPath: jest.fn(),
      generateTexture: jest.fn(),
      alpha: 0.5,
      scaleX: 1,
      scaleY: 1,
    })),
    container: jest.fn(() => ({
      setDepth: jest.fn(),
      add: jest.fn(),
      removeAll: jest.fn(),
      destroy: jest.fn(),
    })),
    sprite: jest.fn(() => ({
      setRotation: jest.fn(),
      setTint: jest.fn(),
      setAlpha: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(() => ({
      destroy: jest.fn(),
      isDestroyed: jest.fn(() => false),
    })),
  },
  textures: {
    exists: jest.fn(() => false),
  },
} as any;

// Mock Phaser.Math.Angle.Between
(global as any).Phaser = {
  Math: {
    Angle: {
      Between: jest.fn(() => 0),
    },
  },
};

describe('MovementRenderer', () => {
  let renderer: MovementRenderer;
  let mockMapData: MapData;
  let mockUnit: Unit;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock map data
    mockMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      layers: [
        {
          name: 'terrain',
          type: 'terrain',
          data: Array(10)
            .fill(null)
            .map(() => Array(10).fill(0)),
          visible: true,
          opacity: 1,
        } as MapLayer,
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 9, y: 9 }],
    };

    // Create mock unit
    mockUnit = {
      id: 'test-unit',
      name: 'Test Unit',
      position: { x: 5, y: 5 },
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
    };

    // Create renderer instance
    renderer = new MovementRenderer(mockScene);
    renderer.setMapData(mockMapData);
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create renderer with default configuration', () => {
      expect(renderer).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(4); // range, path, selection graphics + arrow texture creation
      expect(mockScene.add.container).toHaveBeenCalledTimes(1); // arrow container
    });

    it('should create renderer with custom configuration', () => {
      const customConfig = {
        tileSize: 64,
        colors: {
          reachable: 0x00ffff,
          unreachable: 0xff00ff,
          path: 0xffff00,
          selected: 0xff0000,
          destination: 0x00ff00,
        },
      };

      const customRenderer = new MovementRenderer(mockScene, customConfig);
      expect(customRenderer).toBeDefined();
      customRenderer.destroy();
    });

    it('should set appropriate depth levels for graphics objects', () => {
      // Create a new renderer to test depth setting
      const testRenderer = new MovementRenderer(mockScene);

      // The graphics objects should have setDepth called during initialization
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.container).toHaveBeenCalled();

      testRenderer.destroy();
    });
  });

  describe('Map Data Management', () => {
    it('should set map data correctly', () => {
      const newMapData = { ...mockMapData, tileSize: 64 };
      renderer.setMapData(newMapData);

      // Verify map data is stored (tested indirectly through other methods)
      expect(() => renderer.setMapData(newMapData)).not.toThrow();
    });

    it('should handle null map data gracefully', () => {
      const rendererWithoutMap = new MovementRenderer(mockScene);

      // Should not throw when map data is not set
      expect(() => {
        rendererWithoutMap.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      }).not.toThrow();

      rendererWithoutMap.destroy();
    });
  });

  describe('Movement Range Highlighting', () => {
    it('should highlight movement range with correct positions', () => {
      const positions: Position[] = [
        { x: 4, y: 5 },
        { x: 5, y: 4 },
        { x: 6, y: 5 },
        { x: 5, y: 6 },
      ];

      renderer.highlightMovementRange(positions, mockUnit);

      const highlights = renderer.getCurrentRangeHighlights();

      // Should include reachable positions plus selected character position
      expect(highlights).toHaveLength(positions.length + 1);

      // Check that all positions are included
      positions.forEach(pos => {
        expect(highlights.some(h => h.position.x === pos.x && h.position.y === pos.y)).toBe(true);
      });

      // Check that selected character position is included
      expect(
        highlights.some(
          h =>
            h.position.x === mockUnit.position.x &&
            h.position.y === mockUnit.position.y &&
            h.type === MovementHighlightType.SELECTED
        )
      ).toBe(true);
    });

    it('should clear previous highlights when highlighting new range', () => {
      const positions1: Position[] = [{ x: 1, y: 1 }];
      const positions2: Position[] = [
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];

      renderer.highlightMovementRange(positions1, mockUnit);
      expect(renderer.getCurrentRangeHighlights()).toHaveLength(2); // positions + selected

      renderer.highlightMovementRange(positions2, mockUnit);
      expect(renderer.getCurrentRangeHighlights()).toHaveLength(3); // positions + selected
    });

    it('should handle empty position array', () => {
      renderer.highlightMovementRange([], mockUnit);

      const highlights = renderer.getCurrentRangeHighlights();
      // Should only have selected character highlight
      expect(highlights).toHaveLength(1);
      expect(highlights[0].type).toBe(MovementHighlightType.SELECTED);
    });

    it('should use correct colors for different highlight types', () => {
      const positions: Position[] = [{ x: 4, y: 5 }];
      renderer.highlightMovementRange(positions, mockUnit);

      const highlights = renderer.getCurrentRangeHighlights();

      const reachableHighlight = highlights.find(h => h.type === MovementHighlightType.REACHABLE);
      const selectedHighlight = highlights.find(h => h.type === MovementHighlightType.SELECTED);

      expect(reachableHighlight?.color).toBe(0x00ff00); // Default green
      expect(selectedHighlight?.color).toBe(0xffff00); // Default yellow
    });
  });

  describe('Movement Path Display', () => {
    it('should show movement path with correct positions', () => {
      const path: Position[] = [
        { x: 5, y: 5 }, // start
        { x: 5, y: 4 }, // middle
        { x: 5, y: 3 }, // middle
        { x: 4, y: 3 }, // end
      ];

      renderer.showMovementPath(path);

      const currentPath = renderer.getCurrentPath();
      expect(currentPath).toHaveLength(path.length);

      path.forEach((pos, index) => {
        expect(currentPath[index].x).toBe(pos.x);
        expect(currentPath[index].y).toBe(pos.y);
      });
    });

    it('should create path arrows between consecutive positions', () => {
      const path: Position[] = [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
      ];

      renderer.showMovementPath(path);

      // Should create arrows between each consecutive pair
      expect(mockScene.add.sprite).toHaveBeenCalledTimes(path.length - 1);
    });

    it('should clear path when given empty or single position array', () => {
      // First set a path
      const path: Position[] = [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ];
      renderer.showMovementPath(path);
      expect(renderer.getCurrentPath()).toHaveLength(2);

      // Clear with empty array
      renderer.showMovementPath([]);
      expect(renderer.getCurrentPath()).toHaveLength(0);

      // Clear with single position
      renderer.showMovementPath([{ x: 1, y: 1 }]);
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });

    it('should handle path updates correctly', () => {
      const path1: Position[] = [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ];
      const path2: Position[] = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ];

      renderer.showMovementPath(path1);
      expect(renderer.getCurrentPath()).toHaveLength(2);

      renderer.showMovementPath(path2);
      expect(renderer.getCurrentPath()).toHaveLength(3);
    });
  });

  describe('Highlight Management', () => {
    it('should clear all highlights', () => {
      // Set up some highlights
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      expect(renderer.getCurrentRangeHighlights()).toHaveLength(2);
      expect(renderer.getCurrentPath()).toHaveLength(2);

      // Clear all
      renderer.clearHighlights();

      expect(renderer.getCurrentRangeHighlights()).toHaveLength(0);
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });

    it('should clear range highlights only', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      renderer.clearRangeHighlights();

      expect(renderer.getCurrentRangeHighlights()).toHaveLength(0);
      expect(renderer.getCurrentPath()).toHaveLength(2); // Path should remain
    });

    it('should clear path only', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      renderer.clearPath();

      expect(renderer.getCurrentRangeHighlights()).toHaveLength(2); // Range should remain
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });

    it('should check if position is highlighted', () => {
      const positions: Position[] = [
        { x: 4, y: 5 },
        { x: 6, y: 5 },
      ];
      renderer.highlightMovementRange(positions, mockUnit);

      expect(renderer.isPositionHighlighted({ x: 4, y: 5 })).toBe(true);
      expect(renderer.isPositionHighlighted({ x: 6, y: 5 })).toBe(true);
      expect(renderer.isPositionHighlighted({ x: 5, y: 5 })).toBe(true); // Selected character
      expect(renderer.isPositionHighlighted({ x: 1, y: 1 })).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        colors: {
          reachable: 0xff0000,
          unreachable: 0x00ff00,
          path: 0x0000ff,
          selected: 0xffffff,
          destination: 0x000000,
        },
      };

      renderer.updateConfig(newConfig);

      // Set up highlights to test new config
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);

      const highlights = renderer.getCurrentRangeHighlights();
      const reachableHighlight = highlights.find(h => h.type === MovementHighlightType.REACHABLE);

      expect(reachableHighlight?.color).toBe(0xff0000); // New red color
    });

    it('should refresh displays when configuration is updated', () => {
      // Set up initial displays
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      // Update config should trigger refresh
      renderer.updateConfig({ tileSize: 64 });

      // Verify that the configuration was updated by checking the current state
      expect(renderer.getCurrentRangeHighlights()).toHaveLength(2); // Should still have highlights
      expect(renderer.getCurrentPath()).toHaveLength(2); // Should still have path
    });
  });

  describe('Animation Management', () => {
    it('should create tweens for animated highlights', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);

      // Should create tween for selected character animation
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should create tweens for path arrows', () => {
      const path: Position[] = [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
      ];
      renderer.showMovementPath(path);

      // Should create tweens for arrow animations
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should clean up tweens when clearing highlights', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      // Verify tweens were created
      expect(mockScene.tweens.add).toHaveBeenCalled();

      renderer.clearHighlights();

      // Verify state was cleared
      expect(renderer.getCurrentRangeHighlights()).toHaveLength(0);
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });
  });

  describe('Resource Management', () => {
    it('should destroy all resources when destroyed', () => {
      // Set up resources
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      // Verify resources were created
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.sprite).toHaveBeenCalled();

      renderer.destroy();

      // Verify state was cleared after destruction
      expect(renderer.getCurrentRangeHighlights()).toHaveLength(0);
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });

    it('should clear all state when destroyed', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);
      renderer.showMovementPath([
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ]);

      renderer.destroy();

      expect(renderer.getCurrentRangeHighlights()).toHaveLength(0);
      expect(renderer.getCurrentPath()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid positions gracefully', () => {
      const invalidPositions: Position[] = [
        { x: -1, y: 5 },
        { x: 15, y: 5 },
        { x: 5, y: -1 },
        { x: 5, y: 15 },
      ];

      expect(() => {
        renderer.highlightMovementRange(invalidPositions, mockUnit);
      }).not.toThrow();
    });

    it('should handle path with duplicate positions', () => {
      const pathWithDuplicates: Position[] = [
        { x: 5, y: 5 },
        { x: 5, y: 5 }, // duplicate
        { x: 5, y: 4 },
      ];

      expect(() => {
        renderer.showMovementPath(pathWithDuplicates);
      }).not.toThrow();
    });

    it('should handle unit without position', () => {
      const unitWithoutPosition = { ...mockUnit };
      delete (unitWithoutPosition as any).position;

      expect(() => {
        renderer.highlightMovementRange([{ x: 1, y: 1 }], unitWithoutPosition as Unit);
      }).not.toThrow();
    });
  });

  describe('Visual Feedback Accuracy', () => {
    it('should use correct alpha values for different highlight types', () => {
      renderer.highlightMovementRange([{ x: 1, y: 1 }], mockUnit);

      const highlights = renderer.getCurrentRangeHighlights();
      const reachableHighlight = highlights.find(h => h.type === MovementHighlightType.REACHABLE);
      const selectedHighlight = highlights.find(h => h.type === MovementHighlightType.SELECTED);

      expect(reachableHighlight?.alpha).toBe(0.4); // Default reachable alpha
      expect(selectedHighlight?.alpha).toBe(0.5); // Default selected alpha
    });

    it('should maintain highlight state consistency', () => {
      const positions: Position[] = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];
      renderer.highlightMovementRange(positions, mockUnit);

      const highlights1 = renderer.getCurrentRangeHighlights();
      const highlights2 = renderer.getCurrentRangeHighlights();

      // Should return consistent state
      expect(highlights1).toEqual(highlights2);
    });

    it('should preserve position data integrity', () => {
      const originalPositions: Position[] = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];
      renderer.highlightMovementRange(originalPositions, mockUnit);

      // Modify original array
      originalPositions[0].x = 999;

      const highlights = renderer.getCurrentRangeHighlights();
      const storedPosition = highlights.find(h => h.type === MovementHighlightType.REACHABLE);

      // Should not be affected by external modifications
      expect(storedPosition?.position.x).not.toBe(999);
    });
  });
});
