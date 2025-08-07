/**
 * MapRenderer Battle Highlights test suite
 * Tests the battle-specific highlighting functionality of MapRenderer
 */

import * as Phaser from 'phaser';
import { MapRenderer, BATTLE_HIGHLIGHT_COLORS } from '../../../game/src/rendering/MapRenderer';
import { MapData, Position } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: jest.fn().mockReturnValue({
      setDepth: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      strokePath: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      setVisible: jest.fn().mockReturnThis(),
    }),
    group: jest.fn().mockReturnValue({
      add: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
    }),
  },
  make: {
    tilemap: jest.fn().mockReturnValue({
      addTilesetImage: jest.fn().mockReturnValue({}),
      createLayer: jest.fn().mockReturnValue({
        setAlpha: jest.fn(),
        setDepth: jest.fn(),
      }),
      destroy: jest.fn(),
    }),
  },
} as any;

// Mock map data
const mockMapData: MapData = {
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
    },
  ],
  playerSpawns: [{ x: 1, y: 1 }],
  enemySpawns: [{ x: 8, y: 8 }],
};

describe('MapRenderer Battle Highlights', () => {
  let mapRenderer: MapRenderer;
  let mockGraphics: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGraphics = {
      setDepth: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      strokePath: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      setVisible: jest.fn().mockReturnThis(),
    };

    mockScene.add.graphics.mockReturnValue(mockGraphics);

    mapRenderer = new MapRenderer(mockScene);
    await mapRenderer.loadMap(mockMapData);
  });

  afterEach(() => {
    if (mapRenderer) {
      mapRenderer.destroy();
    }
  });

  describe('Attack Range Highlighting', () => {
    test('should highlight attack range positions', () => {
      const attackPositions = [
        { x: 4, y: 5 },
        { x: 5, y: 4 },
        { x: 5, y: 6 },
        { x: 6, y: 5 },
      ];
      const attackerPosition = { x: 5, y: 5 };

      mapRenderer.highlightAttackRange(attackPositions, attackerPosition);

      // Should clear existing highlights
      expect(mockGraphics.clear).toHaveBeenCalled();

      // Should draw attack range highlights
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.ATTACK_RANGE,
        0.4
      );

      // Should draw attacker position highlight
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        0.6
      );

      // Should draw rectangles for each position
      attackPositions.forEach(pos => {
        expect(mockGraphics.fillRect).toHaveBeenCalledWith(pos.x * 32, pos.y * 32, 32, 32);
      });

      // Should draw rectangle for attacker position
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(
        attackerPosition.x * 32,
        attackerPosition.y * 32,
        32,
        32
      );
    });

    test('should highlight attack range without attacker position', () => {
      const attackPositions = [
        { x: 4, y: 5 },
        { x: 6, y: 5 },
      ];

      mapRenderer.highlightAttackRange(attackPositions);

      // Should only draw attack range highlights
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.ATTACK_RANGE,
        0.4
      );

      // Should not draw attacker position highlight
      expect(mockGraphics.fillStyle).not.toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        0.6
      );

      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(attackPositions.length);
    });

    test('should filter out invalid positions', () => {
      const attackPositions = [
        { x: 4, y: 5 }, // Valid
        { x: -1, y: 5 }, // Invalid (out of bounds)
        { x: 5, y: 15 }, // Invalid (out of bounds)
        { x: 6, y: 5 }, // Valid
      ];

      mapRenderer.highlightAttackRange(attackPositions);

      // Should only draw valid positions (2 rectangles)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(2);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(4 * 32, 5 * 32, 32, 32);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(6 * 32, 5 * 32, 32, 32);
    });
  });

  describe('Battle Target Highlighting', () => {
    test('should highlight selected target', () => {
      const targetPosition = { x: 7, y: 6 };

      mapRenderer.highlightBattleTarget(targetPosition);

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        0.8
      );
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(
        targetPosition.x * 32,
        targetPosition.y * 32,
        32,
        32
      );
    });

    test('should highlight target with area effect', () => {
      const targetPosition = { x: 7, y: 6 };
      const areaPositions = [
        { x: 6, y: 6 },
        { x: 8, y: 6 },
        { x: 7, y: 5 },
        { x: 7, y: 7 },
      ];

      mapRenderer.highlightBattleTarget(targetPosition, areaPositions);

      // Should highlight main target
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        0.8
      );

      // Should highlight area effect positions
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE, 0.5);

      // Should draw rectangles for all positions
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(5); // 1 target + 4 area
    });

    test('should not duplicate target position in area highlights', () => {
      const targetPosition = { x: 7, y: 6 };
      const areaPositions = [
        { x: 7, y: 6 }, // Same as target
        { x: 6, y: 6 },
        { x: 8, y: 6 },
      ];

      mapRenderer.highlightBattleTarget(targetPosition, areaPositions);

      // Should only draw 3 rectangles (1 target + 2 unique area positions)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(3);
    });

    test('should handle invalid target position', () => {
      const invalidTargetPosition = { x: -1, y: 6 };

      mapRenderer.highlightBattleTarget(invalidTargetPosition);

      // Should still clear highlights but not draw anything
      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('Enemy Threat Range Display', () => {
    test('should show enemy threat ranges', () => {
      const threatRanges = new Map([
        [
          'enemy1',
          [
            { x: 3, y: 3 },
            { x: 4, y: 3 },
            { x: 3, y: 4 },
          ],
        ],
        [
          'enemy2',
          [
            { x: 7, y: 7 },
            { x: 8, y: 7 },
          ],
        ],
      ]);

      mapRenderer.showEnemyThreatRanges(threatRanges);

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE, 0.2);

      // Should draw rectangles for all threat positions (5 total)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(5);

      // Check specific positions
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(3 * 32, 3 * 32, 32, 32);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(4 * 32, 3 * 32, 32, 32);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(7 * 32, 7 * 32, 32, 32);
    });

    test('should handle empty threat ranges', () => {
      const emptyThreatRanges = new Map<string, Position[]>();

      mapRenderer.showEnemyThreatRanges(emptyThreatRanges);

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillRect).not.toHaveBeenCalled();
    });

    test('should filter out invalid threat positions', () => {
      const threatRanges = new Map([
        [
          'enemy1',
          [
            { x: 3, y: 3 }, // Valid
            { x: -1, y: 3 }, // Invalid
            { x: 15, y: 15 }, // Invalid
            { x: 4, y: 3 }, // Valid
          ],
        ],
      ]);

      mapRenderer.showEnemyThreatRanges(threatRanges);

      // Should only draw valid positions (2 rectangles)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Highlight Management', () => {
    test('should clear all highlights', () => {
      // First set some highlights
      mapRenderer.highlightAttackRange([{ x: 5, y: 5 }]);

      // Then clear them
      mapRenderer.clearHighlights();

      // Should have called clear at least twice (once for set, once for clear)
      expect(mockGraphics.clear).toHaveBeenCalledWith();
    });

    test('should store current highlights', () => {
      const positions = [
        { x: 4, y: 5 },
        { x: 6, y: 5 },
      ];
      mapRenderer.highlightAttackRange(positions);

      const currentHighlights = mapRenderer.getCurrentHighlights();
      expect(currentHighlights).toHaveLength(positions.length + 0); // No attacker position
    });

    test('should replace previous highlights when setting new ones', () => {
      // Set initial highlights
      mapRenderer.highlightAttackRange([{ x: 4, y: 5 }]);

      // Set new highlights
      mapRenderer.highlightBattleTarget({ x: 7, y: 6 });

      // Should have cleared previous highlights
      expect(mockGraphics.clear).toHaveBeenCalledWith();
    });
  });

  describe('Battle Highlight Colors', () => {
    test('should use correct colors for different highlight types', () => {
      // Test attack range color
      mapRenderer.highlightAttackRange([{ x: 5, y: 5 }]);
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.ATTACK_RANGE,
        0.4
      );

      // Test target selection color
      mapRenderer.highlightBattleTarget({ x: 6, y: 6 });
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(
        BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        0.8
      );

      // Test enemy range color
      mapRenderer.showEnemyThreatRanges(new Map([['enemy1', [{ x: 7, y: 7 }]]]));
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE, 0.2);
    });

    test('should have correct color constants', () => {
      expect(BATTLE_HIGHLIGHT_COLORS.ATTACK_RANGE).toBe(0xff4444);
      expect(BATTLE_HIGHLIGHT_COLORS.MOVEMENT_RANGE).toBe(0x4444ff);
      expect(BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED).toBe(0xffff44);
      expect(BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE).toBe(0xff8888);
      expect(BATTLE_HIGHLIGHT_COLORS.HEALING_RANGE).toBe(0x44ff44);
      expect(BATTLE_HIGHLIGHT_COLORS.SPECIAL_ABILITY).toBe(0xff44ff);
    });
  });

  describe('Integration with Existing Highlight System', () => {
    test('should work with existing highlightTiles method', () => {
      const highlights = [
        {
          position: { x: 5, y: 5 },
          color: 0x00ff00,
          alpha: 0.5,
          type: 'movement' as const,
        },
        {
          position: { x: 6, y: 5 },
          color: 0xff0000,
          alpha: 0.7,
          type: 'attack' as const,
        },
      ];

      mapRenderer.highlightTiles(highlights);

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(2);
    });

    test('should maintain compatibility with position validation', () => {
      const validPosition = { x: 5, y: 5 };
      const invalidPosition = { x: -1, y: 15 };

      expect(mapRenderer.isValidPosition(validPosition)).toBe(true);
      expect(mapRenderer.isValidPosition(invalidPosition)).toBe(false);

      // Battle highlights should respect position validation
      mapRenderer.highlightAttackRange([validPosition, invalidPosition]);
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(1); // Only valid position
    });
  });

  describe('Error Handling', () => {
    test('should handle missing graphics gracefully', () => {
      // Create renderer without proper initialization
      const emptyRenderer = new MapRenderer(mockScene);

      expect(() => {
        emptyRenderer.highlightAttackRange([{ x: 5, y: 5 }]);
        emptyRenderer.highlightBattleTarget({ x: 6, y: 6 });
        emptyRenderer.showEnemyThreatRanges(new Map());
      }).not.toThrow();
    });

    test('should handle empty position arrays', () => {
      expect(() => {
        mapRenderer.highlightAttackRange([]);
        mapRenderer.showEnemyThreatRanges(new Map());
      }).not.toThrow();

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillRect).not.toHaveBeenCalled();
    });
  });
});
