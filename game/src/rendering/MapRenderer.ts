/**
 * MapRenderer - Handles battlefield map visualization and grid display
 * Responsible for loading map data, rendering the tactical grid, and providing visual feedback
 */

import * as Phaser from 'phaser';
import { MapData, MapLayer, Position, GameplayError, GameplayErrorResult } from '../types/gameplay';

/**
 * Tile highlight configuration
 */
export interface TileHighlight {
    position: Position;
    color: number;
    alpha?: number;
}

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

    /**
     * Creates a new MapRenderer instance
     * @param scene - The Phaser scene to render in
     * @param config - Rendering configuration
     */
    constructor(scene: Phaser.Scene, config?: Partial<MapRenderConfig>) {
        this.scene = scene;
        this.config = {
            tileSize: 32,
            gridColor: 0xffffff,
            gridAlpha: 0.3,
            showGrid: true,
            ...config
        };

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
                    details: mapData
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
                message: `Map loaded successfully: ${mapData.width}x${mapData.height}`
            };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.MAP_LOAD_FAILED,
                message: 'Failed to load map data',
                details: error
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
            height: mapData.height
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
            y: tilePosition.y * this.mapData.tileSize + this.mapData.tileSize / 2
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
    }
}