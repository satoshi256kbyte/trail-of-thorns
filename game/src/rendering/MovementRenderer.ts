/**
 * MovementRenderer - Visual feedback system for character movement
 *
 * This class handles all visual feedback related to character movement including:
 * - Movement range highlighting with color coding
 * - Movement path display with animated arrows
 * - Visual cleanup and state management
 */

import * as Phaser from 'phaser';
import { Position, Unit, MapData } from '../types/gameplay';
import { MovementAnimationConfig } from '../types/movement';
import { PositionUtils } from '../types/movement';

/**
 * Movement highlight types for different visual feedback
 */
export enum MovementHighlightType {
  REACHABLE = 'reachable',
  UNREACHABLE = 'unreachable',
  PATH = 'path',
  SELECTED = 'selected',
  DESTINATION = 'destination',
  ERROR = 'error',
  BLOCKED = 'blocked',
  ALTERNATIVE = 'alternative',
  WARNING = 'warning',
}

/**
 * Movement highlight configuration
 */
export interface MovementHighlight {
  position: Position;
  type: MovementHighlightType;
  color: number;
  alpha: number;
  animated?: boolean;
}

/**
 * Path arrow configuration for animated path display
 */
export interface PathArrow {
  from: Position;
  to: Position;
  sprite: Phaser.GameObjects.Sprite;
  tween?: Phaser.Tweens.Tween;
}

/**
 * Movement renderer configuration
 */
export interface MovementRenderConfig {
  tileSize: number;
  colors: {
    reachable: number;
    unreachable: number;
    path: number;
    selected: number;
    destination: number;
    error: number;
    blocked: number;
    alternative: number;
    warning: number;
  };
  alphas: {
    reachable: number;
    unreachable: number;
    path: number;
    selected: number;
    destination: number;
    error: number;
    blocked: number;
    alternative: number;
    warning: number;
  };
  pathArrowKey: string;
  animationSpeed: number;
  pulseSpeed: number;
}

/**
 * Default movement renderer configuration
 */
const DEFAULT_CONFIG: MovementRenderConfig = {
  tileSize: 32,
  colors: {
    reachable: 0x00ff00, // Green for reachable tiles
    unreachable: 0xff0000, // Red for unreachable tiles
    path: 0x0080ff, // Blue for movement path
    selected: 0xffff00, // Yellow for selected character
    destination: 0xff8000, // Orange for destination
    error: 0xff0000, // Red for error states
    blocked: 0x800000, // Dark red for blocked positions
    alternative: 0x00ffff, // Cyan for alternative positions
    warning: 0xffaa00, // Orange-yellow for warnings
  },
  alphas: {
    reachable: 0.4,
    unreachable: 0.2,
    path: 0.6,
    selected: 0.5,
    destination: 0.7,
    error: 0.8,
    blocked: 0.6,
    alternative: 0.5,
    warning: 0.6,
  },
  pathArrowKey: 'path-arrow',
  animationSpeed: 500,
  pulseSpeed: 1000,
};

/**
 * Memory management configuration
 */
interface MemoryManagementConfig {
  maxHighlights: number;
  maxPathArrows: number;
  maxActiveTweens: number;
  cleanupInterval: number;
  texturePoolSize: number;
}

/**
 * Memory usage metrics
 */
interface MemoryMetrics {
  highlightCount: number;
  pathArrowCount: number;
  activeTweenCount: number;
  textureMemoryUsage: number;
  totalGraphicsObjects: number;
  peakMemoryUsage: number;
}

/**
 * MovementRenderer handles visual feedback for the movement system
 */
export class MovementRenderer {
  private scene: Phaser.Scene;
  private config: MovementRenderConfig;
  private mapData: MapData | null = null;

  // Memory management configuration
  private memoryConfig: MemoryManagementConfig = {
    maxHighlights: 200,
    maxPathArrows: 50,
    maxActiveTweens: 100,
    cleanupInterval: 5000,
    texturePoolSize: 20,
  };

  // Graphics objects for different types of highlights
  private rangeGraphics: Phaser.GameObjects.Graphics;
  private pathGraphics: Phaser.GameObjects.Graphics;
  private selectionGraphics: Phaser.GameObjects.Graphics;

  // Path arrow management with object pooling
  private pathArrows: PathArrow[] = [];
  private arrowContainer: Phaser.GameObjects.Container;
  private arrowPool: Phaser.GameObjects.Sprite[] = [];

  // Current state tracking
  private currentRangeHighlights: MovementHighlight[] = [];
  private currentPath: Position[] = [];
  private selectedCharacterPosition: Position | null = null;

  // Animation tweens for cleanup
  private activeTweens: Phaser.Tweens.Tween[] = [];

  // Memory monitoring
  private memoryMetrics: MemoryMetrics = {
    highlightCount: 0,
    pathArrowCount: 0,
    activeTweenCount: 0,
    textureMemoryUsage: 0,
    totalGraphicsObjects: 0,
    peakMemoryUsage: 0,
  };

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Creates a new MovementRenderer instance
   * @param scene - The Phaser scene to render in
   * @param config - Optional configuration overrides
   */
  constructor(scene: Phaser.Scene, config?: Partial<MovementRenderConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.initializeGraphics();
    this.createPathArrowTexture();
    this.initializeArrowPool();
    this.startMemoryManagement();
  }

  /**
   * Initialize graphics objects for rendering
   */
  private initializeGraphics(): void {
    // Create graphics objects with appropriate depth ordering
    this.rangeGraphics = this.scene.add.graphics();
    this.rangeGraphics.setDepth(200); // Above map but below path

    this.pathGraphics = this.scene.add.graphics();
    this.pathGraphics.setDepth(250); // Above range highlights

    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setDepth(300); // Above everything else

    // Create container for path arrows
    this.arrowContainer = this.scene.add.container(0, 0);
    this.arrowContainer.setDepth(275); // Between path graphics and selection
  }

  /**
   * Create texture for path arrows if it doesn't exist
   */
  private createPathArrowTexture(): void {
    const textureKey = this.config.pathArrowKey;

    // Check if texture already exists
    if (this.scene.textures.exists(textureKey)) {
      return;
    }

    // Create arrow texture programmatically
    const size = Math.floor(this.config.tileSize * 0.6);
    const graphics = this.scene.add.graphics();

    // Draw arrow shape
    graphics.fillStyle(0xffffff);
    graphics.beginPath();
    graphics.moveTo(size * 0.2, size * 0.3);
    graphics.lineTo(size * 0.7, size * 0.5);
    graphics.lineTo(size * 0.2, size * 0.7);
    graphics.lineTo(size * 0.4, size * 0.5);
    graphics.closePath();
    graphics.fillPath();

    // Generate texture from graphics
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();

    // Update memory metrics
    this.memoryMetrics.textureMemoryUsage += size * size * 4; // Approximate RGBA bytes
  }

  /**
   * Initialize arrow sprite pool for memory efficiency
   */
  private initializeArrowPool(): void {
    for (let i = 0; i < this.memoryConfig.texturePoolSize; i++) {
      const arrow = this.scene.add.sprite(0, 0, this.config.pathArrowKey);
      arrow.setVisible(false);
      arrow.setActive(false);
      this.arrowPool.push(arrow);
    }
  }

  /**
   * Start memory management timer
   */
  private startMemoryManagement(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.memoryConfig.cleanupInterval);
  }

  /**
   * Set map data for coordinate calculations
   * @param mapData - Map data containing tile size and dimensions
   */
  public setMapData(mapData: MapData): void {
    this.mapData = mapData;
    this.config.tileSize = mapData.tileSize;
  }

  /**
   * Highlight movement range with tile color coding
   * @param positions - Array of positions within movement range
   * @param character - Character for which to show movement range
   */
  public highlightMovementRange(positions: Position[], character: Unit): void {
    if (!this.mapData) {
      console.warn('MovementRenderer: Map data not set');
      return;
    }

    // Clear existing range highlights
    this.clearRangeHighlights();

    // Create highlights for each position
    const highlights: MovementHighlight[] = positions.map(position => ({
      position: PositionUtils.clone(position),
      type: MovementHighlightType.REACHABLE,
      color: this.config.colors.reachable,
      alpha: this.config.alphas.reachable,
      animated: false,
    }));

    // Add character selection highlight
    if (character.position) {
      highlights.push({
        position: PositionUtils.clone(character.position),
        type: MovementHighlightType.SELECTED,
        color: this.config.colors.selected,
        alpha: this.config.alphas.selected,
        animated: true,
      });

      this.selectedCharacterPosition = PositionUtils.clone(character.position);
    }

    // Store current highlights
    this.currentRangeHighlights = highlights;

    // Render highlights
    this.renderRangeHighlights();
  }

  /**
   * Show movement path with animated path arrows
   * @param path - Array of positions representing the movement path
   */
  public showMovementPath(path: Position[]): void {
    if (!this.mapData || path.length < 2) {
      this.clearPath();
      return;
    }

    // Clear existing path
    this.clearPath();

    // Store current path
    this.currentPath = path.map(pos => PositionUtils.clone(pos));

    // Render path highlights
    this.renderPathHighlights(path);

    // Create animated path arrows
    this.createPathArrows(path);

    // Highlight destination
    this.highlightDestination(path[path.length - 1]);
  }

  /**
   * Clear all highlights and reset visual state
   */
  public clearHighlights(): void {
    this.clearRangeHighlights();
    this.clearPath();
    this.clearSelection();
    this.clearAllTweens();
  }

  /**
   * Clear only movement range highlights
   */
  public clearRangeHighlights(): void {
    this.rangeGraphics.clear();
    this.currentRangeHighlights = [];
  }

  /**
   * Clear only movement path display
   */
  public clearPath(): void {
    this.pathGraphics.clear();
    this.clearPathArrows();
    this.currentPath = [];
  }

  /**
   * Clear character selection highlight
   */
  public clearSelection(): void {
    this.selectionGraphics.clear();
    this.selectedCharacterPosition = null;
  }

  /**
   * Update configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<MovementRenderConfig>): void {
    this.config = { ...this.config, ...config };

    // Refresh current displays with new config
    if (this.currentRangeHighlights.length > 0) {
      this.renderRangeHighlights();
    }

    if (this.currentPath.length > 0) {
      this.showMovementPath(this.currentPath);
    }
  }

  /**
   * Get current movement range highlights
   * @returns Array of current range highlights
   */
  public getCurrentRangeHighlights(): MovementHighlight[] {
    return [...this.currentRangeHighlights];
  }

  /**
   * Get current movement path
   * @returns Array of positions in current path
   */
  public getCurrentPath(): Position[] {
    return [...this.currentPath];
  }

  /**
   * Check if a position is currently highlighted
   * @param position - Position to check
   * @returns True if position is highlighted
   */
  public isPositionHighlighted(position: Position): boolean {
    return this.currentRangeHighlights.some(highlight =>
      PositionUtils.equals(highlight.position, position)
    );
  }

  /**
   * Render movement range highlights
   */
  private renderRangeHighlights(): void {
    this.rangeGraphics.clear();

    this.currentRangeHighlights.forEach(highlight => {
      this.drawTileHighlight(this.rangeGraphics, highlight);

      // Add pulsing animation for selected character
      if (highlight.type === MovementHighlightType.SELECTED && highlight.animated) {
        this.addPulseAnimation(highlight.position);
      }
    });
  }

  /**
   * Render movement path highlights
   * @param path - Path to render
   */
  private renderPathHighlights(path: Position[]): void {
    this.pathGraphics.clear();

    // Draw path tiles (excluding start and end)
    for (let i = 1; i < path.length - 1; i++) {
      const highlight: MovementHighlight = {
        position: path[i],
        type: MovementHighlightType.PATH,
        color: this.config.colors.path,
        alpha: this.config.alphas.path,
      };

      this.drawTileHighlight(this.pathGraphics, highlight);
    }
  }

  /**
   * Create animated arrows along the movement path
   * @param path - Path to create arrows for
   */
  private createPathArrows(path: Position[]): void {
    this.clearPathArrows();

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      const arrow = this.createPathArrow(from, to, i);
      if (arrow) {
        this.pathArrows.push(arrow);
      }
    }
  }

  /**
   * Create a single path arrow between two positions using object pooling
   * @param from - Starting position
   * @param to - Ending position
   * @param index - Arrow index for animation delay
   * @returns Created path arrow or null
   */
  private createPathArrow(from: Position, to: Position, index: number): PathArrow | null {
    if (!this.mapData) {
      return null;
    }

    // Check memory limits
    if (this.pathArrows.length >= this.memoryConfig.maxPathArrows) {
      console.warn('MovementRenderer: Maximum path arrows reached, skipping creation');
      return null;
    }

    // Calculate world positions
    const fromWorld = this.tileToWorldPosition(from);
    const toWorld = this.tileToWorldPosition(to);

    if (!fromWorld || !toWorld) {
      return null;
    }

    // Calculate arrow position (midpoint between tiles)
    const arrowX = (fromWorld.x + toWorld.x) / 2;
    const arrowY = (fromWorld.y + toWorld.y) / 2;

    // Calculate arrow rotation
    const angle = Phaser.Math.Angle.Between(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y);

    // Get sprite from pool or create new one
    let sprite: Phaser.GameObjects.Sprite;
    if (this.arrowPool.length > 0) {
      sprite = this.arrowPool.pop()!;
      sprite.setPosition(arrowX, arrowY);
      sprite.setVisible(true);
      sprite.setActive(true);
    } else {
      sprite = this.scene.add.sprite(arrowX, arrowY, this.config.pathArrowKey);
      this.memoryMetrics.totalGraphicsObjects++;
    }

    sprite.setRotation(angle);
    sprite.setTint(this.config.colors.path);
    sprite.setAlpha(0);

    // Add to container
    this.arrowContainer.add(sprite);

    // Create fade-in animation with delay
    const tween = this.scene.tweens.add({
      targets: sprite,
      alpha: 0.8,
      duration: this.config.animationSpeed,
      delay: index * 100,
      ease: 'Power2',
    });

    this.addTween(tween);

    const pathArrow = {
      from: PositionUtils.clone(from),
      to: PositionUtils.clone(to),
      sprite: sprite,
      tween: tween,
    };

    // Update memory metrics
    this.memoryMetrics.pathArrowCount++;
    this.updatePeakMemoryUsage();

    return pathArrow;
  }

  /**
   * Highlight the destination tile
   * @param destination - Destination position
   */
  private highlightDestination(destination: Position): void {
    const highlight: MovementHighlight = {
      position: destination,
      type: MovementHighlightType.DESTINATION,
      color: this.config.colors.destination,
      alpha: this.config.alphas.destination,
      animated: true,
    };

    this.drawTileHighlight(this.pathGraphics, highlight);
    this.addPulseAnimation(destination);
  }

  /**
   * Draw a single tile highlight
   * @param graphics - Graphics object to draw on
   * @param highlight - Highlight configuration
   */
  private drawTileHighlight(
    graphics: Phaser.GameObjects.Graphics,
    highlight: MovementHighlight
  ): void {
    if (!this.mapData) {
      return;
    }

    const worldPos = this.tileToWorldPosition(highlight.position);
    if (!worldPos) {
      return;
    }

    const halfTile = this.config.tileSize / 2;
    const x = worldPos.x - halfTile;
    const y = worldPos.y - halfTile;

    graphics.fillStyle(highlight.color, highlight.alpha);
    graphics.fillRect(x, y, this.config.tileSize, this.config.tileSize);

    // Add border for certain highlight types
    if (
      highlight.type === MovementHighlightType.SELECTED ||
      highlight.type === MovementHighlightType.DESTINATION
    ) {
      graphics.lineStyle(2, highlight.color, 1);
      graphics.strokeRect(x, y, this.config.tileSize, this.config.tileSize);
    }
  }

  /**
   * Add pulsing animation to a tile position
   * @param position - Position to animate
   */
  private addPulseAnimation(position: Position): void {
    if (!this.mapData) {
      return;
    }

    const worldPos = this.tileToWorldPosition(position);
    if (!worldPos) {
      return;
    }

    // Create a temporary graphics object for the pulse effect
    const pulseGraphics = this.scene.add.graphics();
    pulseGraphics.setDepth(350); // Above everything else

    const halfTile = this.config.tileSize / 2;
    const x = worldPos.x - halfTile;
    const y = worldPos.y - halfTile;

    // Create pulsing tween
    const tween = this.scene.tweens.add({
      targets: pulseGraphics,
      alpha: { from: 0.8, to: 0.2 },
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: this.config.pulseSpeed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        pulseGraphics.clear();
        pulseGraphics.fillStyle(this.config.colors.selected, pulseGraphics.alpha);
        pulseGraphics.fillRect(x, y, this.config.tileSize, this.config.tileSize);
      },
      onDestroy: () => {
        pulseGraphics.destroy();
      },
    });

    this.activeTweens.push(tween);
  }

  /**
   * Clear all path arrows with memory management
   */
  private clearPathArrows(): void {
    this.pathArrows.forEach(arrow => {
      if (arrow.tween && !arrow.tween.isDestroyed()) {
        arrow.tween.destroy();
      }

      // Return sprite to pool if possible
      if (this.arrowPool.length < this.memoryConfig.texturePoolSize) {
        arrow.sprite.setVisible(false);
        arrow.sprite.setActive(false);
        arrow.sprite.setAlpha(1);
        arrow.sprite.setTint(0xffffff);
        this.arrowContainer.remove(arrow.sprite);
        this.arrowPool.push(arrow.sprite);
      } else {
        arrow.sprite.destroy();
        this.memoryMetrics.totalGraphicsObjects--;
      }
    });

    this.pathArrows = [];
    this.memoryMetrics.pathArrowCount = 0;
    this.arrowContainer.removeAll(false); // Don't destroy, just remove
  }

  /**
   * Clear all active tweens with memory management
   */
  private clearAllTweens(): void {
    this.activeTweens.forEach(tween => {
      if (tween && !tween.isDestroyed()) {
        tween.destroy();
      }
    });

    this.activeTweens = [];
    this.memoryMetrics.activeTweenCount = 0;
  }

  /**
   * Add tween with memory limit checking
   */
  private addTween(tween: Phaser.Tweens.Tween): void {
    // Check memory limits
    if (this.activeTweens.length >= this.memoryConfig.maxActiveTweens) {
      // Remove oldest tween
      const oldestTween = this.activeTweens.shift();
      if (oldestTween && !oldestTween.isDestroyed()) {
        oldestTween.destroy();
      }
    }

    this.activeTweens.push(tween);
    this.memoryMetrics.activeTweenCount = this.activeTweens.length;
    this.updatePeakMemoryUsage();
  }

  /**
   * Convert tile position to world position
   * @param tilePosition - Tile coordinates
   * @returns World coordinates or null if invalid
   */
  private tileToWorldPosition(tilePosition: Position): Position | null {
    if (!this.mapData) {
      return null;
    }

    return {
      x: tilePosition.x * this.config.tileSize + this.config.tileSize / 2,
      y: tilePosition.y * this.config.tileSize + this.config.tileSize / 2,
    };
  }

  /**
   * Show error feedback for invalid movement attempt
   * @param position - Position where error occurred
   * @param errorType - Type of error for visual styling
   * @param duration - How long to show the error (optional)
   */
  public showMovementError(
    position: Position,
    errorType: 'blocked' | 'unreachable' | 'occupied' = 'blocked',
    duration?: number
  ): void {
    if (!this.mapData) {
      return;
    }

    const worldPos = this.tileToWorldPosition(position);
    if (!worldPos) {
      return;
    }

    // Create error highlight
    const errorGraphics = this.scene.add.graphics();
    errorGraphics.setDepth(400); // Above everything else

    const color =
      errorType === 'blocked'
        ? this.config.colors.blocked
        : errorType === 'unreachable'
          ? this.config.colors.unreachable
          : this.config.colors.error;

    const alpha =
      errorType === 'blocked'
        ? this.config.alphas.blocked
        : errorType === 'unreachable'
          ? this.config.alphas.unreachable
          : this.config.alphas.error;

    const halfTile = this.config.tileSize / 2;
    const x = worldPos.x - halfTile;
    const y = worldPos.y - halfTile;

    // Draw error highlight with pulsing effect
    const drawError = (currentAlpha: number) => {
      errorGraphics.clear();
      errorGraphics.fillStyle(color, currentAlpha);
      errorGraphics.fillRect(x, y, this.config.tileSize, this.config.tileSize);

      // Add X mark for blocked/error states
      if (errorType === 'blocked' || errorType === 'occupied') {
        errorGraphics.lineStyle(3, 0xffffff, currentAlpha);
        const margin = this.config.tileSize * 0.2;
        errorGraphics.beginPath();
        errorGraphics.moveTo(x + margin, y + margin);
        errorGraphics.lineTo(x + this.config.tileSize - margin, y + this.config.tileSize - margin);
        errorGraphics.moveTo(x + this.config.tileSize - margin, y + margin);
        errorGraphics.lineTo(x + margin, y + this.config.tileSize - margin);
        errorGraphics.strokePath();
      }
    };

    // Initial draw
    drawError(alpha);

    // Create pulsing animation
    const tween = this.scene.tweens.add({
      targets: { alpha: alpha },
      alpha: alpha * 0.3,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onUpdate: (tween, target) => {
        drawError(target.alpha);
      },
      onComplete: () => {
        // Fade out
        this.scene.tweens.add({
          targets: { alpha: target.alpha },
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onUpdate: (tween, target) => {
            drawError(target.alpha);
          },
          onComplete: () => {
            errorGraphics.destroy();
          },
        });
      },
    });

    this.activeTweens.push(tween);

    // Auto-cleanup after duration if specified
    if (duration) {
      setTimeout(() => {
        if (!tween.isDestroyed()) {
          tween.destroy();
          errorGraphics.destroy();
        }
      }, duration);
    }
  }

  /**
   * Show alternative movement positions
   * @param positions - Alternative positions to highlight
   * @param duration - How long to show alternatives (optional)
   */
  public showAlternativePositions(positions: Position[], duration?: number): void {
    if (!this.mapData || positions.length === 0) {
      return;
    }

    const alternativeGraphics = this.scene.add.graphics();
    alternativeGraphics.setDepth(350);

    positions.forEach((position, index) => {
      const worldPos = this.tileToWorldPosition(position);
      if (!worldPos) {
        return;
      }

      const halfTile = this.config.tileSize / 2;
      const x = worldPos.x - halfTile;
      const y = worldPos.y - halfTile;

      // Draw alternative highlight with staggered animation
      const tween = this.scene.tweens.add({
        targets: alternativeGraphics,
        alpha: { from: 0, to: this.config.alphas.alternative },
        duration: 400,
        delay: index * 100,
        ease: 'Power2',
        onStart: () => {
          alternativeGraphics.fillStyle(
            this.config.colors.alternative,
            this.config.alphas.alternative
          );
          alternativeGraphics.fillRect(x, y, this.config.tileSize, this.config.tileSize);

          // Add border to make it more visible
          alternativeGraphics.lineStyle(2, this.config.colors.alternative, 1);
          alternativeGraphics.strokeRect(x, y, this.config.tileSize, this.config.tileSize);
        },
      });

      this.activeTweens.push(tween);
    });

    // Auto-cleanup after duration if specified
    if (duration) {
      setTimeout(() => {
        alternativeGraphics.destroy();
      }, duration);
    }
  }

  /**
   * Show warning feedback for risky movement
   * @param position - Position to warn about
   * @param warningType - Type of warning
   * @param duration - How long to show warning (optional)
   */
  public showMovementWarning(
    position: Position,
    warningType: 'dangerous' | 'suboptimal' = 'dangerous',
    duration?: number
  ): void {
    if (!this.mapData) {
      return;
    }

    const worldPos = this.tileToWorldPosition(position);
    if (!worldPos) {
      return;
    }

    const warningGraphics = this.scene.add.graphics();
    warningGraphics.setDepth(375);

    const halfTile = this.config.tileSize / 2;
    const x = worldPos.x - halfTile;
    const y = worldPos.y - halfTile;

    // Draw warning with animated border
    const drawWarning = (borderAlpha: number) => {
      warningGraphics.clear();

      // Fill with warning color
      warningGraphics.fillStyle(this.config.colors.warning, this.config.alphas.warning * 0.5);
      warningGraphics.fillRect(x, y, this.config.tileSize, this.config.tileSize);

      // Animated border
      warningGraphics.lineStyle(3, this.config.colors.warning, borderAlpha);
      warningGraphics.strokeRect(x, y, this.config.tileSize, this.config.tileSize);

      // Add warning symbol (triangle with !)
      if (warningType === 'dangerous') {
        const centerX = worldPos.x;
        const centerY = worldPos.y;
        const size = this.config.tileSize * 0.3;

        warningGraphics.fillStyle(0xffffff, borderAlpha);
        warningGraphics.beginPath();
        warningGraphics.moveTo(centerX, centerY - size);
        warningGraphics.lineTo(centerX - size, centerY + size);
        warningGraphics.lineTo(centerX + size, centerY + size);
        warningGraphics.closePath();
        warningGraphics.fillPath();

        // Exclamation mark
        warningGraphics.fillStyle(this.config.colors.warning, borderAlpha);
        warningGraphics.fillRect(centerX - 2, centerY - size * 0.5, 4, size * 0.7);
        warningGraphics.fillCircle(centerX, centerY + size * 0.3, 2);
      }
    };

    // Create pulsing border animation
    const tween = this.scene.tweens.add({
      targets: { alpha: 1 },
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween, target) => {
        drawWarning(target.alpha);
      },
    });

    this.activeTweens.push(tween);

    // Auto-cleanup after duration if specified
    if (duration) {
      setTimeout(() => {
        if (!tween.isDestroyed()) {
          tween.destroy();
        }
        warningGraphics.destroy();
      }, duration);
    }
  }

  /**
   * Show character selection error feedback
   * @param character - Character with selection error
   * @param errorType - Type of selection error
   * @param duration - How long to show error (optional)
   */
  public showCharacterSelectionError(
    character: Unit,
    errorType: 'already_moved' | 'invalid' | 'wrong_turn' = 'invalid',
    duration?: number
  ): void {
    if (!this.mapData) {
      return;
    }

    const worldPos = this.tileToWorldPosition(character.position);
    if (!worldPos) {
      return;
    }

    const errorGraphics = this.scene.add.graphics();
    errorGraphics.setDepth(450); // Above everything

    const color =
      errorType === 'already_moved'
        ? this.config.colors.warning
        : errorType === 'wrong_turn'
          ? this.config.colors.blocked
          : this.config.colors.error;

    const halfTile = this.config.tileSize / 2;
    const x = worldPos.x - halfTile;
    const y = worldPos.y - halfTile;

    // Create shake effect for character selection error
    const originalX = x;
    const originalY = y;
    let shakeCount = 0;
    const maxShakes = 6;

    const shakeAnimation = () => {
      if (shakeCount >= maxShakes) {
        errorGraphics.destroy();
        return;
      }

      const shakeX = originalX + (Math.random() - 0.5) * 8;
      const shakeY = originalY + (Math.random() - 0.5) * 8;

      errorGraphics.clear();
      errorGraphics.lineStyle(4, color, 0.8);
      errorGraphics.strokeRect(shakeX, shakeY, this.config.tileSize, this.config.tileSize);

      shakeCount++;
      setTimeout(shakeAnimation, 100);
    };

    shakeAnimation();

    // Auto-cleanup after duration if specified
    if (duration) {
      setTimeout(() => {
        errorGraphics.destroy();
      }, duration);
    }
  }

  /**
   * Clear all error feedback visuals
   */
  public clearErrorFeedback(): void {
    // This will be handled by the general clearHighlights method
    // but we can add specific error cleanup here if needed
    this.clearAllTweens();
  }

  /**
   * Perform memory cleanup to prevent memory leaks
   */
  private performMemoryCleanup(): void {
    // Clean up destroyed tweens
    this.activeTweens = this.activeTweens.filter(tween => !tween.isDestroyed());
    this.memoryMetrics.activeTweenCount = this.activeTweens.length;

    // Clean up inactive path arrows
    this.pathArrows = this.pathArrows.filter(arrow => {
      if (!arrow.sprite.active || arrow.sprite.alpha === 0) {
        if (arrow.tween && !arrow.tween.isDestroyed()) {
          arrow.tween.destroy();
        }

        // Return to pool if possible
        if (this.arrowPool.length < this.memoryConfig.texturePoolSize) {
          arrow.sprite.setVisible(false);
          arrow.sprite.setActive(false);
          this.arrowPool.push(arrow.sprite);
        } else {
          arrow.sprite.destroy();
          this.memoryMetrics.totalGraphicsObjects--;
        }
        return false;
      }
      return true;
    });

    this.memoryMetrics.pathArrowCount = this.pathArrows.length;

    // Limit highlights if too many
    if (this.currentRangeHighlights.length > this.memoryConfig.maxHighlights) {
      this.currentRangeHighlights = this.currentRangeHighlights.slice(
        0,
        this.memoryConfig.maxHighlights
      );
      this.renderRangeHighlights(); // Re-render with limited highlights
    }

    this.memoryMetrics.highlightCount = this.currentRangeHighlights.length;
  }

  /**
   * Update peak memory usage tracking
   */
  private updatePeakMemoryUsage(): void {
    const currentUsage =
      this.memoryMetrics.highlightCount +
      this.memoryMetrics.pathArrowCount +
      this.memoryMetrics.activeTweenCount;

    if (currentUsage > this.memoryMetrics.peakMemoryUsage) {
      this.memoryMetrics.peakMemoryUsage = currentUsage;
    }
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryMetrics(): MemoryMetrics {
    return { ...this.memoryMetrics };
  }

  /**
   * Update memory management configuration
   */
  public updateMemoryConfig(config: Partial<MemoryManagementConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config };
  }

  /**
   * Force memory cleanup (useful for testing or when memory is low)
   */
  public forceMemoryCleanup(): void {
    this.performMemoryCleanup();

    // More aggressive cleanup
    this.clearAllTweens();
    this.clearPathArrows();

    // Clear graphics to free GPU memory
    this.rangeGraphics.clear();
    this.pathGraphics.clear();
    this.selectionGraphics.clear();

    // Reset state
    this.currentRangeHighlights = [];
    this.currentPath = [];
    this.selectedCharacterPosition = null;

    // Reset metrics
    this.memoryMetrics.highlightCount = 0;
    this.memoryMetrics.pathArrowCount = 0;
    this.memoryMetrics.activeTweenCount = 0;
  }

  /**
   * Destroy the movement renderer and clean up resources
   */
  public destroy(): void {
    // Stop memory management timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all highlights and animations
    this.clearHighlights();

    // Destroy arrow pool
    this.arrowPool.forEach(arrow => arrow.destroy());
    this.arrowPool = [];

    // Destroy graphics objects
    if (this.rangeGraphics) {
      this.rangeGraphics.destroy();
    }

    if (this.pathGraphics) {
      this.pathGraphics.destroy();
    }

    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
    }

    // Destroy arrow container
    if (this.arrowContainer) {
      this.arrowContainer.destroy();
    }

    // Clear arrays
    this.pathArrows = [];
    this.currentRangeHighlights = [];
    this.currentPath = [];
    this.activeTweens = [];

    // Clear references
    this.mapData = null;
    this.selectedCharacterPosition = null;

    // Reset memory metrics
    this.memoryMetrics = {
      highlightCount: 0,
      pathArrowCount: 0,
      activeTweenCount: 0,
      textureMemoryUsage: 0,
      totalGraphicsObjects: 0,
      peakMemoryUsage: 0,
    };
  }
}
