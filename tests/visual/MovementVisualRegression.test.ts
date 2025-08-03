/**
 * Movement Visual Regression Tests
 *
 * Tests visual feedback consistency and prevents visual regressions in movement system
 * Implements requirement 14.3: Implement visual regression tests for movement feedback
 */

import { MovementRenderer } from '../../game/src/rendering/MovementRenderer';
import { Unit, Position, MapData } from '../../game/src/types/gameplay';
import { MovementHighlightType } from '../../game/src/types/movement';

// Visual test utilities
interface VisualSnapshot {
  id: string;
  timestamp: number;
  highlights: HighlightSnapshot[];
  pathArrows: PathArrowSnapshot[];
  animations: AnimationSnapshot[];
  metadata: {
    mapSize: { width: number; height: number };
    unitCount: number;
    highlightCount: number;
  };
}

interface HighlightSnapshot {
  position: Position;
  color: number;
  alpha: number;
  type: MovementHighlightType;
  depth: number;
}

interface PathArrowSnapshot {
  position: Position;
  rotation: number;
  scale: number;
  tint: number;
  alpha: number;
}

interface AnimationSnapshot {
  targetId: string;
  type: 'movement' | 'highlight' | 'path';
  startPosition: Position;
  endPosition: Position;
  duration: number;
  easing: string;
  progress: number;
}

class VisualTestRecorder {
  private snapshots: Map<string, VisualSnapshot> = new Map();
  private baselineSnapshots: Map<string, VisualSnapshot> = new Map();

  recordSnapshot(id: string, renderer: MovementRenderer, metadata: any): VisualSnapshot {
    const snapshot: VisualSnapshot = {
      id,
      timestamp: Date.now(),
      highlights: this.captureHighlights(renderer),
      pathArrows: this.capturePathArrows(renderer),
      animations: this.captureAnimations(renderer),
      metadata,
    };

    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  private captureHighlights(renderer: MovementRenderer): HighlightSnapshot[] {
    const highlights: HighlightSnapshot[] = [];
    const visualState = renderer.getVisualState();

    for (const highlight of visualState.activeHighlights) {
      highlights.push({
        position: { ...highlight.position },
        color: highlight.color,
        alpha: highlight.alpha,
        type: highlight.type,
        depth: highlight.depth,
      });
    }

    return highlights.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  }

  private capturePathArrows(renderer: MovementRenderer): PathArrowSnapshot[] {
    const arrows: PathArrowSnapshot[] = [];
    const visualState = renderer.getVisualState();

    for (const arrow of visualState.activePathArrows) {
      arrows.push({
        position: { ...arrow.position },
        rotation: arrow.rotation,
        scale: arrow.scale,
        tint: arrow.tint,
        alpha: arrow.alpha,
      });
    }

    return arrows.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  }

  private captureAnimations(renderer: MovementRenderer): AnimationSnapshot[] {
    const animations: AnimationSnapshot[] = [];
    const visualState = renderer.getVisualState();

    for (const anim of visualState.activeAnimations) {
      animations.push({
        targetId: anim.targetId,
        type: anim.type,
        startPosition: { ...anim.startPosition },
        endPosition: { ...anim.endPosition },
        duration: anim.duration,
        easing: anim.easing,
        progress: anim.progress,
      });
    }

    return animations.sort((a, b) => a.targetId.localeCompare(b.targetId));
  }

  compareSnapshots(current: VisualSnapshot, baseline: VisualSnapshot): VisualDifference {
    const differences: VisualDifference = {
      id: current.id,
      hasChanges: false,
      highlightDifferences: [],
      pathArrowDifferences: [],
      animationDifferences: [],
      metadataDifferences: [],
    };

    // Compare highlights
    differences.highlightDifferences = this.compareHighlights(
      current.highlights,
      baseline.highlights
    );

    // Compare path arrows
    differences.pathArrowDifferences = this.comparePathArrows(
      current.pathArrows,
      baseline.pathArrows
    );

    // Compare animations
    differences.animationDifferences = this.compareAnimations(
      current.animations,
      baseline.animations
    );

    // Compare metadata
    differences.metadataDifferences = this.compareMetadata(current.metadata, baseline.metadata);

    differences.hasChanges =
      differences.highlightDifferences.length > 0 ||
      differences.pathArrowDifferences.length > 0 ||
      differences.animationDifferences.length > 0 ||
      differences.metadataDifferences.length > 0;

    return differences;
  }

  private compareHighlights(current: HighlightSnapshot[], baseline: HighlightSnapshot[]): string[] {
    const differences: string[] = [];

    if (current.length !== baseline.length) {
      differences.push(`Highlight count mismatch: ${current.length} vs ${baseline.length}`);
    }

    const maxLength = Math.max(current.length, baseline.length);
    for (let i = 0; i < maxLength; i++) {
      const curr = current[i];
      const base = baseline[i];

      if (!curr && base) {
        differences.push(`Missing highlight at index ${i}: ${JSON.stringify(base)}`);
      } else if (curr && !base) {
        differences.push(`Extra highlight at index ${i}: ${JSON.stringify(curr)}`);
      } else if (curr && base) {
        if (curr.position.x !== base.position.x || curr.position.y !== base.position.y) {
          differences.push(
            `Position mismatch at index ${i}: (${curr.position.x},${curr.position.y}) vs (${base.position.x},${base.position.y})`
          );
        }
        if (curr.color !== base.color) {
          differences.push(`Color mismatch at index ${i}: ${curr.color} vs ${base.color}`);
        }
        if (Math.abs(curr.alpha - base.alpha) > 0.01) {
          differences.push(`Alpha mismatch at index ${i}: ${curr.alpha} vs ${base.alpha}`);
        }
        if (curr.type !== base.type) {
          differences.push(`Type mismatch at index ${i}: ${curr.type} vs ${base.type}`);
        }
      }
    }

    return differences;
  }

  private comparePathArrows(current: PathArrowSnapshot[], baseline: PathArrowSnapshot[]): string[] {
    const differences: string[] = [];

    if (current.length !== baseline.length) {
      differences.push(`Path arrow count mismatch: ${current.length} vs ${baseline.length}`);
    }

    const maxLength = Math.max(current.length, baseline.length);
    for (let i = 0; i < maxLength; i++) {
      const curr = current[i];
      const base = baseline[i];

      if (!curr && base) {
        differences.push(`Missing path arrow at index ${i}`);
      } else if (curr && !base) {
        differences.push(`Extra path arrow at index ${i}`);
      } else if (curr && base) {
        if (curr.position.x !== base.position.x || curr.position.y !== base.position.y) {
          differences.push(`Arrow position mismatch at index ${i}`);
        }
        if (Math.abs(curr.rotation - base.rotation) > 0.01) {
          differences.push(
            `Arrow rotation mismatch at index ${i}: ${curr.rotation} vs ${base.rotation}`
          );
        }
        if (Math.abs(curr.scale - base.scale) > 0.01) {
          differences.push(`Arrow scale mismatch at index ${i}: ${curr.scale} vs ${base.scale}`);
        }
      }
    }

    return differences;
  }

  private compareAnimations(current: AnimationSnapshot[], baseline: AnimationSnapshot[]): string[] {
    const differences: string[] = [];

    if (current.length !== baseline.length) {
      differences.push(`Animation count mismatch: ${current.length} vs ${baseline.length}`);
    }

    // Compare by targetId since animations might be in different orders
    const currentMap = new Map(current.map(a => [a.targetId, a]));
    const baselineMap = new Map(baseline.map(a => [a.targetId, a]));

    for (const [id, curr] of currentMap) {
      const base = baselineMap.get(id);
      if (!base) {
        differences.push(`Extra animation for target ${id}`);
      } else {
        if (curr.type !== base.type) {
          differences.push(`Animation type mismatch for ${id}: ${curr.type} vs ${base.type}`);
        }
        if (Math.abs(curr.duration - base.duration) > 10) {
          differences.push(
            `Animation duration mismatch for ${id}: ${curr.duration} vs ${base.duration}`
          );
        }
      }
    }

    for (const [id] of baselineMap) {
      if (!currentMap.has(id)) {
        differences.push(`Missing animation for target ${id}`);
      }
    }

    return differences;
  }

  private compareMetadata(current: any, baseline: any): string[] {
    const differences: string[] = [];

    if (current.mapSize.width !== baseline.mapSize.width) {
      differences.push(`Map width mismatch: ${current.mapSize.width} vs ${baseline.mapSize.width}`);
    }
    if (current.mapSize.height !== baseline.mapSize.height) {
      differences.push(
        `Map height mismatch: ${current.mapSize.height} vs ${baseline.mapSize.height}`
      );
    }
    if (current.unitCount !== baseline.unitCount) {
      differences.push(`Unit count mismatch: ${current.unitCount} vs ${baseline.unitCount}`);
    }
    if (current.highlightCount !== baseline.highlightCount) {
      differences.push(
        `Highlight count mismatch: ${current.highlightCount} vs ${baseline.highlightCount}`
      );
    }

    return differences;
  }

  setBaseline(id: string, snapshot: VisualSnapshot): void {
    this.baselineSnapshots.set(id, snapshot);
  }

  getBaseline(id: string): VisualSnapshot | undefined {
    return this.baselineSnapshots.get(id);
  }

  clearSnapshots(): void {
    this.snapshots.clear();
  }
}

interface VisualDifference {
  id: string;
  hasChanges: boolean;
  highlightDifferences: string[];
  pathArrowDifferences: string[];
  animationDifferences: string[];
  metadataDifferences: string[];
}

// Mock Phaser scene with visual tracking
const createMockSceneWithVisualTracking = () => {
  const graphicsObjects: any[] = [];
  const spriteObjects: any[] = [];
  const containerObjects: any[] = [];

  return {
    add: {
      graphics: jest.fn(() => {
        const graphics = {
          clear: jest.fn(),
          fillStyle: jest.fn(),
          fillRect: jest.fn(),
          lineStyle: jest.fn(),
          strokeRect: jest.fn(),
          setDepth: jest.fn(),
          destroy: jest.fn(),
          alpha: 0.5,
          x: 0,
          y: 0,
          visible: true,
        };
        graphicsObjects.push(graphics);
        return graphics;
      }),
      sprite: jest.fn(() => {
        const sprite = {
          setPosition: jest.fn(),
          setRotation: jest.fn(),
          setTint: jest.fn(),
          setAlpha: jest.fn(),
          setVisible: jest.fn(),
          setScale: jest.fn(),
          destroy: jest.fn(),
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          tint: 0xffffff,
          visible: true,
        };
        spriteObjects.push(sprite);
        return sprite;
      }),
      container: jest.fn(() => {
        const container = {
          add: jest.fn(),
          removeAll: jest.fn(),
          setDepth: jest.fn(),
          destroy: jest.fn(),
          x: 0,
          y: 0,
          visible: true,
        };
        containerObjects.push(container);
        return container;
      }),
    },
    tweens: {
      add: jest.fn(() => ({
        destroy: jest.fn(),
        stop: jest.fn(),
        isDestroyed: jest.fn(() => false),
        progress: 0,
      })),
    },
    textures: {
      exists: jest.fn(() => true),
    },
    _testHelpers: {
      getGraphicsObjects: () => [...graphicsObjects],
      getSpriteObjects: () => [...spriteObjects],
      getContainerObjects: () => [...containerObjects],
      clearObjects: () => {
        graphicsObjects.length = 0;
        spriteObjects.length = 0;
        containerObjects.length = 0;
      },
    },
  } as any;
};

// Test data
const createTestUnit = (id: string, position: Position): Unit => ({
  id,
  name: `Test Unit ${id}`,
  position: { ...position },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 4,
  },
  currentHP: 100,
  currentMP: 50,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
});

const createTestMapData = (): MapData => ({
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
});

describe('Movement Visual Regression Tests', () => {
  let movementRenderer: MovementRenderer;
  let mockScene: any;
  let visualRecorder: VisualTestRecorder;
  let testMapData: MapData;

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = createMockSceneWithVisualTracking();
    movementRenderer = new MovementRenderer(mockScene);
    visualRecorder = new VisualTestRecorder();
    testMapData = createTestMapData();

    // Clear any existing objects
    mockScene._testHelpers.clearObjects();
  });

  afterEach(() => {
    if (movementRenderer) {
      movementRenderer.clearHighlights();
      movementRenderer.forceMemoryCleanup();
    }
    visualRecorder.clearSnapshots();
  });

  describe('Movement Range Highlight Visuals', () => {
    test('should maintain consistent movement range highlighting', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const movementRange = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 6, y: 5 },
        { x: 5, y: 4 },
        { x: 5, y: 6 },
      ];

      // Create baseline
      movementRenderer.highlightMovementRange(movementRange, testUnit);
      const baseline = visualRecorder.recordSnapshot('movement-range-basic', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: movementRange.length,
      });
      visualRecorder.setBaseline('movement-range-basic', baseline);

      // Clear and recreate
      movementRenderer.clearHighlights();
      movementRenderer.highlightMovementRange(movementRange, testUnit);
      const current = visualRecorder.recordSnapshot('movement-range-basic', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: movementRange.length,
      });

      // Compare
      const differences = visualRecorder.compareSnapshots(current, baseline);

      expect(differences.hasChanges).toBe(false);
      if (differences.hasChanges) {
        console.log('Movement range highlighting differences:', differences);
      }
    });

    test('should maintain consistent highlight colors for different movement types', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const reachablePositions = [
        { x: 4, y: 5 },
        { x: 6, y: 5 },
      ];
      const unreachablePositions = [
        { x: 2, y: 5 },
        { x: 8, y: 5 },
      ];

      // Test reachable highlights
      movementRenderer.highlightMovementRange(reachablePositions, testUnit);
      const reachableSnapshot = visualRecorder.recordSnapshot(
        'reachable-highlights',
        movementRenderer,
        {
          mapSize: { width: testMapData.width, height: testMapData.height },
          unitCount: 1,
          highlightCount: reachablePositions.length,
        }
      );

      // Clear and test unreachable highlights
      movementRenderer.clearHighlights();
      movementRenderer.highlightUnreachablePositions(unreachablePositions);
      const unreachableSnapshot = visualRecorder.recordSnapshot(
        'unreachable-highlights',
        movementRenderer,
        {
          mapSize: { width: testMapData.width, height: testMapData.height },
          unitCount: 1,
          highlightCount: unreachablePositions.length,
        }
      );

      // Verify different visual treatment
      expect(reachableSnapshot.highlights[0].color).not.toBe(
        unreachableSnapshot.highlights[0].color
      );
      expect(reachableSnapshot.highlights[0].type).not.toBe(unreachableSnapshot.highlights[0].type);
    });

    test('should maintain consistent highlight layering and depth', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const positions = [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
      ];

      movementRenderer.highlightMovementRange(positions, testUnit);
      const snapshot = visualRecorder.recordSnapshot('highlight-layering', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: positions.length,
      });

      // Verify consistent depth values
      const depths = snapshot.highlights.map(h => h.depth);
      const uniqueDepths = new Set(depths);

      // All highlights should have the same depth for consistency
      expect(uniqueDepths.size).toBe(1);

      // Depth should be appropriate for movement highlights
      expect(depths[0]).toBeGreaterThan(0);
      expect(depths[0]).toBeLessThan(1000);
    });
  });

  describe('Movement Path Visual Consistency', () => {
    test('should maintain consistent path arrow rendering', () => {
      const path = [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ];

      // Create baseline
      movementRenderer.showMovementPath(path);
      const baseline = visualRecorder.recordSnapshot('path-arrows-basic', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });
      visualRecorder.setBaseline('path-arrows-basic', baseline);

      // Clear and recreate
      movementRenderer.clearHighlights();
      movementRenderer.showMovementPath(path);
      const current = visualRecorder.recordSnapshot('path-arrows-basic', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });

      // Compare
      const differences = visualRecorder.compareSnapshots(current, baseline);

      expect(differences.hasChanges).toBe(false);
      if (differences.hasChanges) {
        console.log('Path arrow differences:', differences);
      }
    });

    test('should maintain consistent arrow rotation for different directions', () => {
      const paths = [
        [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ], // East
        [
          { x: 5, y: 5 },
          { x: 5, y: 4 },
        ], // North
        [
          { x: 5, y: 5 },
          { x: 4, y: 5 },
        ], // West
        [
          { x: 5, y: 5 },
          { x: 5, y: 6 },
        ], // South
      ];

      const snapshots: VisualSnapshot[] = [];

      for (let i = 0; i < paths.length; i++) {
        movementRenderer.clearHighlights();
        movementRenderer.showMovementPath(paths[i]);

        const snapshot = visualRecorder.recordSnapshot(`path-direction-${i}`, movementRenderer, {
          mapSize: { width: testMapData.width, height: testMapData.height },
          unitCount: 1,
          highlightCount: 0,
        });
        snapshots.push(snapshot);
      }

      // Verify different rotations for different directions
      const rotations = snapshots.map(s => s.pathArrows[0]?.rotation || 0);
      const uniqueRotations = new Set(rotations);

      expect(uniqueRotations.size).toBe(4); // Should have 4 different rotations

      // Verify rotations are in expected ranges
      rotations.forEach(rotation => {
        expect(rotation).toBeGreaterThanOrEqual(0);
        expect(rotation).toBeLessThan(2 * Math.PI);
      });
    });

    test('should maintain consistent path visualization for complex paths', () => {
      const complexPath = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 5, y: 4 },
        { x: 5, y: 5 },
      ];

      movementRenderer.showMovementPath(complexPath);
      const snapshot = visualRecorder.recordSnapshot('complex-path', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });

      // Verify path arrow count matches path segments
      expect(snapshot.pathArrows.length).toBe(complexPath.length - 1);

      // Verify arrows are positioned correctly
      for (let i = 0; i < snapshot.pathArrows.length; i++) {
        const arrow = snapshot.pathArrows[i];
        const expectedPosition = complexPath[i];

        expect(arrow.position.x).toBe(expectedPosition.x);
        expect(arrow.position.y).toBe(expectedPosition.y);
      }
    });
  });

  describe('Animation Visual Consistency', () => {
    test('should maintain consistent movement animation properties', async () => {
      const testUnit = createTestUnit('test', { x: 2, y: 2 });
      const path = [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ];

      // Start animation
      const animationPromise = movementRenderer.animateMovement(testUnit, path);

      // Capture animation state
      const snapshot = visualRecorder.recordSnapshot('movement-animation', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });

      // Verify animation properties
      expect(snapshot.animations.length).toBeGreaterThan(0);

      const animation = snapshot.animations[0];
      expect(animation.type).toBe('movement');
      expect(animation.targetId).toBe(testUnit.id);
      expect(animation.duration).toBeGreaterThan(0);
      expect(animation.easing).toBeDefined();

      // Wait for animation to complete
      await animationPromise;
    });

    test('should maintain consistent highlight fade animations', () => {
      const positions = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
      ];
      const testUnit = createTestUnit('test', { x: 3, y: 3 });

      // Create highlights with fade animation
      movementRenderer.highlightMovementRange(positions, testUnit);
      movementRenderer.fadeOutHighlights();

      const snapshot = visualRecorder.recordSnapshot('highlight-fade', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: positions.length,
      });

      // Verify fade animations are created
      const fadeAnimations = snapshot.animations.filter(a => a.type === 'highlight');
      expect(fadeAnimations.length).toBeGreaterThan(0);

      // Verify fade animation properties
      fadeAnimations.forEach(anim => {
        expect(anim.duration).toBeGreaterThan(0);
        expect(anim.easing).toBeDefined();
      });
    });
  });

  describe('Visual State Cleanup', () => {
    test('should maintain clean visual state after operations', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const positions = [
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ];
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ];

      // Create visual elements
      movementRenderer.highlightMovementRange(positions, testUnit);
      movementRenderer.showMovementPath(path);

      // Verify elements are created
      let snapshot = visualRecorder.recordSnapshot('before-cleanup', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: positions.length,
      });

      expect(snapshot.highlights.length).toBeGreaterThan(0);
      expect(snapshot.pathArrows.length).toBeGreaterThan(0);

      // Clear all visual elements
      movementRenderer.clearHighlights();

      // Verify clean state
      snapshot = visualRecorder.recordSnapshot('after-cleanup', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });

      expect(snapshot.highlights.length).toBe(0);
      expect(snapshot.pathArrows.length).toBe(0);
      expect(snapshot.animations.length).toBe(0);
    });

    test('should prevent visual memory leaks', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });

      // Create and destroy many visual elements
      for (let i = 0; i < 10; i++) {
        const positions = [
          { x: 3 + i, y: 3 },
          { x: 4 + i, y: 3 },
          { x: 5 + i, y: 3 },
        ];

        movementRenderer.highlightMovementRange(positions, testUnit);
        movementRenderer.clearHighlights();
      }

      // Force memory cleanup
      movementRenderer.forceMemoryCleanup();

      // Verify clean state
      const snapshot = visualRecorder.recordSnapshot('memory-leak-test', movementRenderer, {
        mapSize: { width: testMapData.width, height: testMapData.height },
        unitCount: 1,
        highlightCount: 0,
      });

      expect(snapshot.highlights.length).toBe(0);
      expect(snapshot.pathArrows.length).toBe(0);
      expect(snapshot.animations.length).toBe(0);

      // Verify Phaser objects were properly destroyed
      const graphicsObjects = mockScene._testHelpers.getGraphicsObjects();
      const spriteObjects = mockScene._testHelpers.getSpriteObjects();

      // All objects should have been destroyed
      graphicsObjects.forEach(obj => {
        expect(obj.destroy).toHaveBeenCalled();
      });
      spriteObjects.forEach(obj => {
        expect(obj.destroy).toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Browser Visual Consistency', () => {
    test('should maintain consistent rendering across different configurations', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const positions = [
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ];

      // Test different renderer configurations
      const configs = [
        { tileSize: 32, highlightAlpha: 0.5 },
        { tileSize: 48, highlightAlpha: 0.7 },
        { tileSize: 64, highlightAlpha: 0.3 },
      ];

      const snapshots: VisualSnapshot[] = [];

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];

        // Update renderer configuration
        movementRenderer.updateConfig(config);
        movementRenderer.highlightMovementRange(positions, testUnit);

        const snapshot = visualRecorder.recordSnapshot(`config-${i}`, movementRenderer, {
          mapSize: { width: testMapData.width, height: testMapData.height },
          unitCount: 1,
          highlightCount: positions.length,
        });
        snapshots.push(snapshot);

        movementRenderer.clearHighlights();
      }

      // Verify each configuration produces consistent results
      snapshots.forEach((snapshot, index) => {
        expect(snapshot.highlights.length).toBe(positions.length);
        expect(snapshot.highlights[0].alpha).toBe(configs[index].highlightAlpha);
      });
    });

    test('should handle different screen resolutions consistently', () => {
      const testUnit = createTestUnit('test', { x: 5, y: 5 });
      const positions = [
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ];

      // Simulate different screen resolutions
      const resolutions = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 },
      ];

      const snapshots: VisualSnapshot[] = [];

      for (let i = 0; i < resolutions.length; i++) {
        const resolution = resolutions[i];

        // Update renderer for resolution
        movementRenderer.updateScreenResolution(resolution.width, resolution.height);
        movementRenderer.highlightMovementRange(positions, testUnit);

        const snapshot = visualRecorder.recordSnapshot(`resolution-${i}`, movementRenderer, {
          mapSize: { width: testMapData.width, height: testMapData.height },
          unitCount: 1,
          highlightCount: positions.length,
        });
        snapshots.push(snapshot);

        movementRenderer.clearHighlights();
      }

      // Verify consistent highlight positioning across resolutions
      snapshots.forEach(snapshot => {
        expect(snapshot.highlights.length).toBe(positions.length);

        // Positions should be the same regardless of resolution
        for (let j = 0; j < positions.length; j++) {
          expect(snapshot.highlights[j].position).toEqual(positions[j]);
        }
      });
    });
  });
});
