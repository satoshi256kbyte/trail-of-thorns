/**
 * MapRenderer - Handles battlefield map visualization and grid display
 * Responsible for loading map data, rendering the tactical grid, and providing visual feedback
 */

import * as Phaser from 'phaser';
import {
  MapData,
  MapLayer,
  Position,
  GameplayError,
  GameplayErrorResult,
  Unit,
} from '../types/gameplay';
import { TerrainCost } from '../types/movement';

/**
 * Tile highlight configuration
 */
export interface TileHighlight {
  position: Position;
  color: number;
  alpha?: number;
  type?: 'movement' | 'attack' | 'target' | 'danger' | 'special';
}

/**
 * Battle UI highlight colors
 */
export const BATTLE_HIGHLIGHT_COLORS = {
  ATTACK_RANGE: 0xff4444,
  MOVEMENT_RANGE: 0x4444ff,
  TARGET_SELECTED: 0xffff44,
  ENEMY_RANGE: 0xff8888,
  HEALING_RANGE: 0x44ff44,
  SPECIAL_ABILITY: 0xff44ff,
} as const;

/**
 * Map rendering configuration
 */
export interface MapRenderConfig {
  tileSize: number;
  gridColor: number;
  gridAlpha: number;
  showGrid: boolean;
}

/**
 * MapRenderer class for battlefield display
 * Manages map visualization, grid overlay, and tile highlighting
 */
export class MapRenderer {
  private scene: Phaser.Scene;
  private mapData: MapData | null = null;
  private tileMap: Phaser.Tilemaps.Tilemap | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private config: MapRenderConfig;
  private currentHighlights: TileHighlight[] = [];
  private occupiedPositions: Map<string, Unit> = new Map();
  private terrainCosts: TerrainCost;

  /**
   * Creates a new MapRenderer instance
   * @param scene - The Phaser scene to render in
   * @param config - Rendering configuration
   * @param terrainCosts - Terrain cost configuration
   */
  constructor(scene: Phaser.Scene, config?: Partial<MapRenderConfig>, terrainCosts?: TerrainCost) {
    this.scene = scene;
    this.config = {
      tileSize: 32,
      gridColor: 0xffffff,
      gridAlpha: 0.3,
      showGrid: true,
      ...config,
    };

    // Initialize default terrain costs
    this.terrainCosts = terrainCosts || this.getDefaultTerrainCosts();

    this.initializeGraphics();
  }

  /**
   * Initialize graphics objects for rendering
   */
  private initializeGraphics(): void {
    // Create graphics object for grid overlay
    this.gridGraphics = this.scene.add.graphics();
    this.gridGraphics.setDepth(100); // Ensure grid is above map layers

    // Create graphics object for tile highlights
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(150); // Ensure highlights are above grid
  }

  /**
   * Load and display map data from JSON
   * @param mapData - Map data to load and render
   * @returns Promise resolving to success/error result
   */
  public async loadMap(mapData: MapData): Promise<GameplayErrorResult> {
    try {
      // Validate map data
      if (!this.validateMapData(mapData)) {
        return {
          success: false,
          error: GameplayError.MAP_LOAD_FAILED,
          message: 'Invalid map data structure',
          details: mapData,
        };
      }

      // Store map data
      this.mapData = mapData;

      // Update config with map tile size
      this.config.tileSize = mapData.tileSize;

      // Create tilemap
      await this.createTilemap(mapData);

      // Render grid if enabled
      if (this.config.showGrid) {
        this.renderGrid();
      }

      return {
        success: true,
        message: `Map loaded successfully: ${mapData.width}x${mapData.height}`,
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.MAP_LOAD_FAILED,
        message: 'Failed to load map data',
        details: error,
      };
    }
  }

  /**
   * Create Phaser tilemap from map data
   * @param mapData - Map data to create tilemap from
   */
  private async createTilemap(mapData: MapData): Promise<void> {
    // Clean up existing tilemap
    if (this.tileMap) {
      this.tileMap.destroy();
    }

    // Create new tilemap
    this.tileMap = this.scene.make.tilemap({
      data: this.convertLayersToTileData(mapData.layers),
      tileWidth: mapData.tileSize,
      tileHeight: mapData.tileSize,
      width: mapData.width,
      height: mapData.height,
    });

    // For now, create a simple colored tileset
    // In a full implementation, this would load actual tile images
    const tiles = this.tileMap.addTilesetImage('tiles', null, mapData.tileSize, mapData.tileSize);

    // Create layers from map data
    mapData.layers.forEach((layerData, index) => {
      if (layerData.visible) {
        const layer = this.tileMap!.createLayer(index, tiles, 0, 0);
        if (layer) {
          layer.setAlpha(layerData.opacity);
          layer.setDepth(index * 10); // Layer depth based on order
        }
      }
    });
  }

  /**
   * Convert map layers to Phaser tilemap data format
   * @param layers - Map layers to convert
   * @returns Converted tile data
   */
  private convertLayersToTileData(layers: MapLayer[]): number[][] {
    // For simplicity, use the first layer's data
    // In a full implementation, this would properly handle multiple layers
    if (layers.length > 0) {
      return layers[0].data;
    }

    // Return empty data if no layers
    return [];
  }

  /**
   * Render tactical grid overlay
   */
  public renderGrid(): void {
    if (!this.gridGraphics || !this.mapData) {
      return;
    }

    // Clear existing grid
    this.gridGraphics.clear();

    // Set grid style
    this.gridGraphics.lineStyle(1, this.config.gridColor, this.config.gridAlpha);

    const { width, height, tileSize } = this.mapData;

    // Draw vertical lines
    for (let x = 0; x <= width; x++) {
      const xPos = x * tileSize;
      this.gridGraphics.moveTo(xPos, 0);
      this.gridGraphics.lineTo(xPos, height * tileSize);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y++) {
      const yPos = y * tileSize;
      this.gridGraphics.moveTo(0, yPos);
      this.gridGraphics.lineTo(width * tileSize, yPos);
    }

    // Stroke the grid
    this.gridGraphics.strokePath();
  }

  /**
   * Highlight specific tiles with visual feedback
   * @param highlights - Array of tile highlights to display
   */
  public highlightTiles(highlights: TileHighlight[]): void {
    if (!this.highlightGraphics || !this.mapData) {
      return;
    }

    // Store current highlights
    this.currentHighlights = [...highlights];

    // Clear existing highlights
    this.highlightGraphics.clear();

    // Draw each highlight
    highlights.forEach(highlight => {
      if (this.isValidPosition(highlight.position)) {
        this.drawTileHighlight(highlight);
      }
    });
  }

  /**
   * Highlight attack range for battle system
   * @param positions - Positions within attack range
   * @param attackerPosition - Position of the attacking unit
   */
  public highlightAttackRange(positions: Position[], attackerPosition?: Position): void {
    const highlights: TileHighlight[] = positions.map(pos => ({
      position: pos,
      color: BATTLE_HIGHLIGHT_COLORS.ATTACK_RANGE,
      alpha: 0.4,
      type: 'attack',
    }));

    // Highlight attacker position differently if provided
    if (attackerPosition && this.isValidPosition(attackerPosition)) {
      highlights.push({
        position: attackerPosition,
        color: BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        alpha: 0.6,
        type: 'special',
      });
    }

    this.highlightTiles(highlights);
  }

  /**
   * Highlight selected target for battle system
   * @param targetPosition - Position of the selected target
   * @param areaPositions - Additional positions affected by area attacks
   */
  public highlightBattleTarget(targetPosition: Position, areaPositions?: Position[]): void {
    const highlights: TileHighlight[] = [
      {
        position: targetPosition,
        color: BATTLE_HIGHLIGHT_COLORS.TARGET_SELECTED,
        alpha: 0.8,
        type: 'target',
      },
    ];

    // Add area effect highlights if provided
    if (areaPositions) {
      areaPositions.forEach(pos => {
        if (!this.positionsEqual(pos, targetPosition)) {
          highlights.push({
            position: pos,
            color: BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE,
            alpha: 0.5,
            type: 'danger',
          });
        }
      });
    }

    this.highlightTiles(highlights);
  }

  /**
   * Show enemy threat ranges for tactical awareness
   * @param threatRanges - Map of enemy positions to their threat ranges
   */
  public showEnemyThreatRanges(threatRanges: Map<string, Position[]>): void {
    const highlights: TileHighlight[] = [];

    threatRanges.forEach((positions, enemyId) => {
      positions.forEach(pos => {
        highlights.push({
          position: pos,
          color: BATTLE_HIGHLIGHT_COLORS.ENEMY_RANGE,
          alpha: 0.2,
          type: 'danger',
        });
      });
    });

    this.highlightTiles(highlights);
  }

  /**
   * Draw a single tile highlight
   * @param highlight - Tile highlight to draw
   */
  private drawTileHighlight(highlight: TileHighlight): void {
    if (!this.highlightGraphics || !this.mapData) {
      return;
    }

    const { x, y } = highlight.position;
    const { tileSize } = this.mapData;
    const alpha = highlight.alpha ?? 0.5;

    // Calculate screen position
    const screenX = x * tileSize;
    const screenY = y * tileSize;

    // Set fill style
    this.highlightGraphics.fillStyle(highlight.color, alpha);

    // Draw highlight rectangle
    this.highlightGraphics.fillRect(screenX, screenY, tileSize, tileSize);
  }

  /**
   * Clear all tile highlights
   */
  public clearHighlights(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
    this.currentHighlights = [];
  }

  /**
   * Get tile at world position
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns Tile position or null if invalid
   */
  public getTileAtWorldPosition(worldX: number, worldY: number): Position | null {
    if (!this.mapData) {
      return null;
    }

    const tileX = Math.floor(worldX / this.mapData.tileSize);
    const tileY = Math.floor(worldY / this.mapData.tileSize);

    if (this.isValidPosition({ x: tileX, y: tileY })) {
      return { x: tileX, y: tileY };
    }

    return null;
  }

  /**
   * Convert tile position to world position
   * @param tilePosition - Tile coordinates
   * @returns World coordinates or null if invalid
   */
  public tileToWorldPosition(tilePosition: Position): Position | null {
    if (!this.mapData || !this.isValidPosition(tilePosition)) {
      return null;
    }

    return {
      x: tilePosition.x * this.mapData.tileSize + this.mapData.tileSize / 2,
      y: tilePosition.y * this.mapData.tileSize + this.mapData.tileSize / 2,
    };
  }

  /**
   * Check if a position is valid within the map bounds
   * @param position - Position to validate
   * @returns True if position is valid
   */
  public isValidPosition(position: Position): boolean {
    if (!this.mapData) {
      return false;
    }

    return (
      position.x >= 0 &&
      position.x < this.mapData.width &&
      position.y >= 0 &&
      position.y < this.mapData.height
    );
  }

  /**
   * Validate map data structure
   * @param mapData - Map data to validate
   * @returns True if map data is valid
   */
  private validateMapData(mapData: MapData): boolean {
    return !!(
      mapData &&
      typeof mapData.width === 'number' &&
      typeof mapData.height === 'number' &&
      typeof mapData.tileSize === 'number' &&
      Array.isArray(mapData.layers) &&
      Array.isArray(mapData.playerSpawns) &&
      Array.isArray(mapData.enemySpawns) &&
      mapData.width > 0 &&
      mapData.height > 0 &&
      mapData.tileSize > 0 &&
      mapData.layers.length > 0
    );
  }

  /**
   * Toggle grid visibility
   * @param visible - Whether grid should be visible
   */
  public setGridVisible(visible: boolean): void {
    this.config.showGrid = visible;

    if (this.gridGraphics) {
      this.gridGraphics.setVisible(visible);
    }

    if (visible && this.mapData) {
      this.renderGrid();
    }
  }

  /**
   * Update grid color and alpha
   * @param color - New grid color
   * @param alpha - New grid alpha
   */
  public updateGridStyle(color: number, alpha: number): void {
    this.config.gridColor = color;
    this.config.gridAlpha = alpha;

    if (this.config.showGrid && this.mapData) {
      this.renderGrid();
    }
  }

  /**
   * Get current map data
   * @returns Current map data or null
   */
  public getMapData(): MapData | null {
    return this.mapData;
  }

  /**
   * Get current highlights
   * @returns Array of current tile highlights
   */
  public getCurrentHighlights(): TileHighlight[] {
    return [...this.currentHighlights];
  }

  /**
   * Get terrain cost for movement between two positions
   * @param from - Starting position
   * @param to - Destination position
   * @returns Movement cost or -1 if impassable
   */
  public getTerrainMovementCost(from: Position, to: Position): number {
    if (!this.mapData || !this.isValidPosition(to)) {
      return -1;
    }

    const terrainType = this.getTerrainTypeAt(to);
    const terrainConfig = this.terrainCosts[terrainType.toString()];

    if (!terrainConfig) {
      return this.terrainCosts['0']?.movementCost || 1;
    }

    return terrainConfig.isPassable ? terrainConfig.movementCost : -1;
  }

  /**
   * Check if a position has passable terrain
   * @param position - Position to check
   * @returns True if terrain is passable
   */
  public isTerrainPassable(position: Position): boolean {
    if (!this.mapData || !this.isValidPosition(position)) {
      return false;
    }

    const terrainType = this.getTerrainTypeAt(position);
    const terrainConfig = this.terrainCosts[terrainType.toString()];

    if (!terrainConfig) {
      return this.terrainCosts['0']?.isPassable || true;
    }

    return terrainConfig.isPassable;
  }

  /**
   * Get terrain type at a specific position
   * @param position - Position to check
   * @returns Terrain type ID
   */
  public getTerrainTypeAt(position: Position): number {
    if (!this.mapData) {
      return 0;
    }

    // Find terrain layer
    const terrainLayer = this.mapData.layers.find(layer => layer.type === 'terrain');

    if (!terrainLayer || !terrainLayer.data) {
      return 0; // Default terrain type
    }

    // Validate position bounds
    if (
      position.y < 0 ||
      position.y >= terrainLayer.data.length ||
      position.x < 0 ||
      position.x >= terrainLayer.data[position.y].length
    ) {
      return 0; // Default terrain type for out-of-bounds
    }

    return terrainLayer.data[position.y][position.x];
  }

  /**
   * Update unit positions for collision detection
   * @param units - Array of units to track
   */
  public updateUnitPositions(units: Unit[]): void {
    this.occupiedPositions.clear();

    for (const unit of units) {
      if (unit.currentHP > 0) {
        // Only track living units
        const positionKey = `${unit.position.x},${unit.position.y}`;
        this.occupiedPositions.set(positionKey, unit);
      }
    }
  }

  /**
   * Check if a position is occupied by a unit
   * @param position - Position to check
   * @param excludeUnit - Unit to exclude from collision check (optional)
   * @returns True if position is occupied
   */
  public isPositionOccupied(position: Position, excludeUnit?: Unit): boolean {
    const positionKey = `${position.x},${position.y}`;
    const occupyingUnit = this.occupiedPositions.get(positionKey);

    if (!occupyingUnit) {
      return false;
    }

    // Exclude the specified unit from collision check
    if (excludeUnit && occupyingUnit.id === excludeUnit.id) {
      return false;
    }

    return true;
  }

  /**
   * Get the unit occupying a specific position
   * @param position - Position to check
   * @returns Unit at position or null if unoccupied
   */
  public getUnitAtPosition(position: Position): Unit | null {
    const positionKey = `${position.x},${position.y}`;
    return this.occupiedPositions.get(positionKey) || null;
  }

  /**
   * Get all occupied positions
   * @returns Array of occupied positions
   */
  public getOccupiedPositions(): Position[] {
    return Array.from(this.occupiedPositions.keys()).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * Check if a position is blocked for movement
   * Combines terrain and unit collision checks
   * @param position - Position to check
   * @param excludeUnit - Unit to exclude from collision check (optional)
   * @returns True if position is blocked
   */
  public isPositionBlocked(position: Position, excludeUnit?: Unit): boolean {
    // Check if position is out of bounds
    if (!this.isValidPosition(position)) {
      return true;
    }

    // Check if terrain is impassable
    if (!this.isTerrainPassable(position)) {
      return true;
    }

    // Check if position is occupied by another unit
    if (this.isPositionOccupied(position, excludeUnit)) {
      return true;
    }

    return false;
  }

  /**
   * Find alternative paths around blocked positions
   * @param from - Starting position
   * @param to - Destination position
   * @param excludeUnit - Unit to exclude from collision checks
   * @returns Array of alternative positions to try
   */
  public findAlternativePositions(from: Position, to: Position, excludeUnit?: Unit): Position[] {
    const alternatives: Position[] = [];

    // Get adjacent positions to the destination
    const adjacentPositions = [
      { x: to.x, y: to.y - 1 }, // North
      { x: to.x + 1, y: to.y }, // East
      { x: to.x, y: to.y + 1 }, // South
      { x: to.x - 1, y: to.y }, // West
    ];

    // Filter out blocked positions and sort by distance from start
    for (const pos of adjacentPositions) {
      if (!this.isPositionBlocked(pos, excludeUnit)) {
        alternatives.push(pos);
      }
    }

    // Sort by Manhattan distance from starting position
    alternatives.sort((a, b) => {
      const distA = Math.abs(a.x - from.x) + Math.abs(a.y - from.y);
      const distB = Math.abs(b.x - from.x) + Math.abs(b.y - from.y);
      return distA - distB;
    });

    return alternatives;
  }

  /**
   * Update terrain cost configuration
   * @param terrainCosts - New terrain cost configuration
   */
  public setTerrainCosts(terrainCosts: TerrainCost): void {
    this.terrainCosts = { ...terrainCosts };
  }

  /**
   * Get current terrain cost configuration
   * @returns Current terrain cost configuration
   */
  public getTerrainCosts(): TerrainCost {
    const copy: TerrainCost = {};
    for (const key in this.terrainCosts) {
      copy[key] = { ...this.terrainCosts[key] };
    }
    return copy;
  }

  /**
   * Get default terrain cost configuration
   * @returns Default terrain costs
   */
  private getDefaultTerrainCosts(): TerrainCost {
    return {
      '0': { movementCost: 1, isPassable: true }, // Normal ground
      '1': { movementCost: 1, isPassable: true }, // Normal ground (alt)
      '2': { movementCost: 1, isPassable: true }, // Normal ground (alt2)
      '3': { movementCost: 1, isPassable: true }, // Normal ground (alt3)
      '4': { movementCost: 2, isPassable: true }, // Difficult terrain (forest/hills)
      '5': { movementCost: 3, isPassable: true }, // Very difficult terrain (mountains)
      '6': { movementCost: 1, isPassable: false }, // Impassable terrain (walls)
      '7': { movementCost: 1, isPassable: false }, // Impassable terrain (water)
      '8': { movementCost: 1, isPassable: false }, // Impassable terrain (void)
      '9': { movementCost: 1, isPassable: false }, // Impassable terrain (obstacles)
    };
  }

  /**
   * Check if two positions are equal
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns True if positions are equal
   */
  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  /**
   * Destroy the map renderer and clean up resources
   */
  public destroy(): void {
    if (this.tileMap) {
      this.tileMap.destroy();
      this.tileMap = null;
    }

    if (this.gridGraphics) {
      this.gridGraphics.destroy();
      this.gridGraphics = null;
    }

    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }

    this.mapData = null;
    this.currentHighlights = [];
    this.occupiedPositions.clear();
  }
}
