/**
 * CharacterManager - Manages character operations, positioning, and interactions
 * 
 * This class handles:
 * - Loading and positioning characters from stage data
 * - Character selection and interaction
 * - Character movement and position updates
 * - Character display and visual state management
 * - Character data validation and error handling
 */

import { Unit, Position, StageData, GameplayError, GameplayErrorResult, TypeValidators } from '../types/gameplay';

export interface CharacterDisplayConfig {
    /** Character sprite scale */
    spriteScale: number;
    /** Selection highlight color */
    selectionColor: number;
    /** Selection highlight alpha */
    selectionAlpha: number;
    /** Movement highlight color */
    movementColor: number;
    /** Movement highlight alpha */
    movementAlpha: number;
    /** Character info display offset */
    infoOffset: { x: number; y: number };
    /** Animation speeds */
    animationSpeeds: {
        idle: number;
        move: number;
        attack: number;
    };
}

export interface CharacterSprite extends Phaser.GameObjects.Sprite {
    unitId: string;
    selectionHighlight?: Phaser.GameObjects.Graphics;
    movementHighlight?: Phaser.GameObjects.Graphics;
    infoText?: Phaser.GameObjects.Text;
}

export class CharacterManager {
    private scene: Phaser.Scene;
    private characters: Map<string, Unit>;
    private characterSprites: Map<string, CharacterSprite>;
    private selectedCharacter?: Unit;
    private config: CharacterDisplayConfig;
    private eventEmitter?: Phaser.Events.EventEmitter;
    private tileSize: number;

    // Graphics objects for highlights
    private selectionGraphics?: Phaser.GameObjects.Graphics;
    private movementGraphics?: Phaser.GameObjects.Graphics;

    // Default configuration
    private static readonly DEFAULT_CONFIG: CharacterDisplayConfig = {
        spriteScale: 1.0,
        selectionColor: 0x00ff00,
        selectionAlpha: 0.7,
        movementColor: 0x0080ff,
        movementAlpha: 0.5,
        infoOffset: { x: 0, y: -40 },
        animationSpeeds: {
            idle: 1.0,
            move: 1.5,
            attack: 2.0
        }
    };

    constructor(
        scene: Phaser.Scene,
        tileSize: number = 32,
        config?: Partial<CharacterDisplayConfig>,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        this.scene = scene;
        this.tileSize = tileSize;
        this.characters = new Map();
        this.characterSprites = new Map();
        this.config = { ...CharacterManager.DEFAULT_CONFIG, ...config };
        this.eventEmitter = eventEmitter;

        this.initializeGraphics();
        this.createPlaceholderTextures();
    }

    /**
     * Initialize graphics objects for highlights
     */
    private initializeGraphics(): void {
        this.selectionGraphics = this.scene.add.graphics();
        this.movementGraphics = this.scene.add.graphics();

        // Set depth to ensure highlights appear below characters but above map
        this.selectionGraphics.setDepth(10);
        this.movementGraphics.setDepth(9);
    }

    /**
     * Create placeholder textures for character sprites
     */
    private createPlaceholderTextures(): void {
        try {
            // Only create textures if we have a proper Phaser scene with textures
            if (!this.scene.textures || typeof this.scene.textures.exists !== 'function') {
                return; // Skip texture creation in test environment
            }

            // Create a simple colored rectangle texture for character placeholders
            const textureKey = 'character-placeholder';

            // Check if texture already exists
            if (!this.scene.textures.exists(textureKey)) {
                // Create a 32x32 colored rectangle
                const graphics = this.scene.add.graphics();
                graphics.fillStyle(0x4080ff); // Blue color
                graphics.fillRect(0, 0, 32, 32);
                graphics.lineStyle(2, 0x000000); // Black border
                graphics.strokeRect(0, 0, 32, 32);

                // Generate texture from graphics
                graphics.generateTexture(textureKey, 32, 32);
                graphics.destroy();
            }
        } catch (error) {
            // Silently fail in test environment
            // In production, this would be logged appropriately
        }
    }

    /**
     * Load characters from stage data and position them on the map
     * 
     * @param stageData Stage data containing character information
     * @returns GameplayErrorResult indicating success or failure
     */
    loadCharacters(stageData: StageData): GameplayErrorResult {
        try {
            // Validate stage data
            if (!TypeValidators.isValidStageData(stageData)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Invalid stage data provided'
                };
            }

            // Clear existing characters
            this.clearAllCharacters();

            // Load player units
            const playerResult = this.loadUnits(stageData.playerUnits, 'player');
            if (!playerResult.success) {
                return playerResult;
            }

            // Load enemy units
            const enemyResult = this.loadUnits(stageData.enemyUnits, 'enemy');
            if (!enemyResult.success) {
                return enemyResult;
            }

            // Validate no position conflicts
            const positionValidation = this.validateCharacterPositions();
            if (!positionValidation.success) {
                return positionValidation;
            }

            // Emit characters loaded event
            this.eventEmitter?.emit('characters-loaded', {
                playerCount: stageData.playerUnits.length,
                enemyCount: stageData.enemyUnits.length,
                totalCount: this.characters.size
            });

            return { success: true };

        } catch (error) {
            this.clearAllCharacters();
            return {
                success: false,
                error: GameplayError.CHARACTER_LOAD_FAILED,
                message: 'Failed to load characters from stage data',
                details: error
            };
        }
    }

    /**
     * Load units of a specific faction
     * 
     * @param units Array of units to load
     * @param expectedFaction Expected faction for validation
     * @returns GameplayErrorResult indicating success or failure
     */
    private loadUnits(units: Unit[], expectedFaction: 'player' | 'enemy'): GameplayErrorResult {
        try {
            for (const unit of units) {
                // Validate unit
                if (!TypeValidators.isValidUnit(unit)) {
                    return {
                        success: false,
                        error: GameplayError.CHARACTER_LOAD_FAILED,
                        message: `Invalid unit data: ${unit?.id || 'unknown'}`
                    };
                }

                // Validate faction matches expected
                if (unit.faction !== expectedFaction) {
                    return {
                        success: false,
                        error: GameplayError.CHARACTER_LOAD_FAILED,
                        message: `Unit faction mismatch: expected ${expectedFaction}, got ${unit.faction} for unit ${unit.id}`
                    };
                }

                // Check for duplicate IDs
                if (this.characters.has(unit.id)) {
                    return {
                        success: false,
                        error: GameplayError.CHARACTER_LOAD_FAILED,
                        message: `Duplicate unit ID: ${unit.id}`
                    };
                }

                // Create a copy of the unit to avoid external modifications
                const unitCopy: Unit = {
                    ...unit,
                    position: { ...unit.position },
                    stats: { ...unit.stats }
                };

                // Add to characters map
                this.characters.set(unit.id, unitCopy);

                // Create sprite for the character
                const spriteResult = this.createCharacterSprite(unitCopy);
                if (!spriteResult.success) {
                    return spriteResult;
                }
            }

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.CHARACTER_LOAD_FAILED,
                message: `Failed to load ${expectedFaction} units`,
                details: error
            };
        }
    }

    /**
     * Create a sprite for a character
     * 
     * @param unit Unit to create sprite for
     * @returns GameplayErrorResult indicating success or failure
     */
    private createCharacterSprite(unit: Unit): GameplayErrorResult {
        try {
            // Calculate world position from grid position
            const worldPos = this.gridToWorldPosition(unit.position);

            // Create sprite (using a placeholder texture for now)
            // In a real implementation, this would use the unit's sprite texture
            let textureKey = '__DEFAULT';

            // Check if we have textures available (not in test environment)
            if (this.scene.textures && typeof this.scene.textures.exists === 'function') {
                textureKey = this.scene.textures.exists('character-placeholder')
                    ? 'character-placeholder'
                    : '__DEFAULT';
            }

            const sprite = this.scene.add.sprite(
                worldPos.x,
                worldPos.y,
                textureKey
            ) as CharacterSprite;

            // Set sprite properties
            sprite.unitId = unit.id;
            sprite.setScale(this.config.spriteScale);
            sprite.setDepth(20); // Characters appear above highlights and map

            // Set tint based on faction for easy identification
            if (unit.faction === 'player') {
                sprite.setTint(0x4080ff); // Blue tint for player units
            } else {
                sprite.setTint(0xff4040); // Red tint for enemy units
            }

            // Make sprite interactive
            sprite.setInteractive();

            // Add click handler
            sprite.on('pointerdown', () => {
                this.handleCharacterClick(unit.id);
            });

            // Store sprite reference
            this.characterSprites.set(unit.id, sprite);

            // Update unit with sprite reference
            unit.sprite = sprite;

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.CHARACTER_LOAD_FAILED,
                message: `Failed to create sprite for unit ${unit.id}`,
                details: error
            };
        }
    }

    /**
     * Handle character click events
     * 
     * @param unitId ID of the clicked unit
     */
    private handleCharacterClick(unitId: string): void {
        const unit = this.characters.get(unitId);
        if (unit) {
            this.selectCharacter(unitId);
        }
    }

    /**
     * Select a character by ID
     * 
     * @param characterId ID of character to select, or null to deselect
     * @returns GameplayErrorResult indicating success or failure
     */
    selectCharacter(characterId: string | null): GameplayErrorResult {
        try {
            // Handle deselection
            if (characterId === null) {
                this.clearSelection();
                this.eventEmitter?.emit('character-deselected');
                return { success: true };
            }

            // Find character
            const character = this.characters.get(characterId);
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Character not found: ${characterId}`
                };
            }

            // Clear previous selection
            this.clearSelection();

            // Set new selection
            this.selectedCharacter = character;

            // Update visual selection
            this.updateSelectionDisplay();

            // Emit character selected event
            this.eventEmitter?.emit('character-selected', {
                character: character,
                canAct: !character.hasActed,
                canMove: !character.hasMoved,
                position: character.position
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to select character',
                details: error
            };
        }
    }

    /**
     * Get character at a specific grid position
     * 
     * @param position Grid position to check
     * @returns Unit at position or null if none found
     */
    getCharacterAt(position: Position): Unit | null {
        try {
            if (!TypeValidators.isValidPosition(position)) {
                return null;
            }

            // Find character at the specified position
            for (const character of this.characters.values()) {
                if (character.position.x === position.x && character.position.y === position.y) {
                    return character;
                }
            }

            return null;

        } catch (error) {
            console.error('Error getting character at position:', error);
            return null;
        }
    }

    /**
     * Move a character to a new position
     * 
     * @param characterId ID of character to move
     * @param newPosition New grid position
     * @param animate Whether to animate the movement
     * @returns GameplayErrorResult indicating success or failure
     */
    moveCharacter(characterId: string, newPosition: Position, animate: boolean = true): GameplayErrorResult {
        try {
            // Validate inputs
            if (!TypeValidators.isValidPosition(newPosition)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_POSITION,
                    message: 'Invalid position provided'
                };
            }

            // Find character
            const character = this.characters.get(characterId);
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Character not found: ${characterId}`
                };
            }

            // Check if position is occupied by another character
            const occupyingCharacter = this.getCharacterAt(newPosition);
            if (occupyingCharacter && occupyingCharacter.id !== characterId) {
                return {
                    success: false,
                    error: GameplayError.INVALID_POSITION,
                    message: `Position occupied by character: ${occupyingCharacter.id}`
                };
            }

            // Store old position for event
            const oldPosition = { ...character.position };

            // Update character position
            character.position = { ...newPosition };

            // Update sprite position
            const sprite = this.characterSprites.get(characterId);
            if (sprite) {
                const worldPos = this.gridToWorldPosition(newPosition);

                if (animate) {
                    // Animate movement
                    this.scene.tweens.add({
                        targets: sprite,
                        x: worldPos.x,
                        y: worldPos.y,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            this.eventEmitter?.emit('character-move-complete', {
                                character: character,
                                oldPosition: oldPosition,
                                newPosition: newPosition
                            });
                        }
                    });
                } else {
                    // Immediate movement
                    sprite.setPosition(worldPos.x, worldPos.y);
                    this.eventEmitter?.emit('character-move-complete', {
                        character: character,
                        oldPosition: oldPosition,
                        newPosition: newPosition
                    });
                }
            }

            // Mark character as having moved
            character.hasMoved = true;

            // Update display
            this.updateCharacterDisplay(characterId);

            // Emit character moved event
            this.eventEmitter?.emit('character-moved', {
                character: character,
                oldPosition: oldPosition,
                newPosition: newPosition,
                animated: animate
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to move character',
                details: error
            };
        }
    }

    /**
     * Update character display (sprite, highlights, info)
     * 
     * @param characterId ID of character to update, or undefined to update all
     * @returns GameplayErrorResult indicating success or failure
     */
    updateCharacterDisplay(characterId?: string): GameplayErrorResult {
        try {
            if (characterId) {
                // Update specific character
                const character = this.characters.get(characterId);
                if (!character) {
                    return {
                        success: false,
                        error: GameplayError.UNIT_NOT_FOUND,
                        message: `Character not found: ${characterId}`
                    };
                }

                this.updateSingleCharacterDisplay(character);
            } else {
                // Update all characters
                for (const character of this.characters.values()) {
                    this.updateSingleCharacterDisplay(character);
                }
            }

            // Update selection display if needed
            if (this.selectedCharacter) {
                this.updateSelectionDisplay();
            }

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to update character display',
                details: error
            };
        }
    }

    /**
     * Update display for a single character
     * 
     * @param character Character to update
     */
    private updateSingleCharacterDisplay(character: Unit): void {
        const sprite = this.characterSprites.get(character.id);
        if (!sprite) return;

        // Update sprite alpha based on action state
        if (character.hasActed) {
            sprite.setAlpha(0.6); // Dimmed if already acted
        } else {
            sprite.setAlpha(1.0); // Full opacity if can still act
        }

        // Update tint based on health
        const healthRatio = character.currentHP / character.stats.maxHP;
        if (healthRatio < 0.3) {
            // Low health - red tint
            sprite.setTint(0xff0000);
        } else if (healthRatio < 0.6) {
            // Medium health - yellow tint
            sprite.setTint(0xffff00);
        } else {
            // Good health - faction color
            if (character.faction === 'player') {
                sprite.setTint(0x4080ff);
            } else {
                sprite.setTint(0xff4040);
            }
        }

        // Update position to match character data
        const worldPos = this.gridToWorldPosition(character.position);
        sprite.setPosition(worldPos.x, worldPos.y);
    }

    /**
     * Update selection display (highlight around selected character)
     */
    private updateSelectionDisplay(): void {
        if (!this.selectionGraphics || !this.selectedCharacter) return;

        this.selectionGraphics.clear();

        // Draw selection highlight
        const worldPos = this.gridToWorldPosition(this.selectedCharacter.position);
        const halfTile = this.tileSize / 2;

        this.selectionGraphics.lineStyle(3, this.config.selectionColor, this.config.selectionAlpha);
        this.selectionGraphics.strokeRect(
            worldPos.x - halfTile,
            worldPos.y - halfTile,
            this.tileSize,
            this.tileSize
        );
    }

    /**
     * Clear current selection
     */
    private clearSelection(): void {
        this.selectedCharacter = undefined;
        if (this.selectionGraphics) {
            this.selectionGraphics.clear();
        }
    }

    /**
     * Convert grid position to world position
     * 
     * @param gridPos Grid position
     * @returns World position in pixels
     */
    private gridToWorldPosition(gridPos: Position): Position {
        return {
            x: (gridPos.x * this.tileSize) + (this.tileSize / 2),
            y: (gridPos.y * this.tileSize) + (this.tileSize / 2)
        };
    }

    /**
     * Convert world position to grid position
     * 
     * @param worldPos World position in pixels
     * @returns Grid position
     */
    private worldToGridPosition(worldPos: Position): Position {
        return {
            x: Math.floor(worldPos.x / this.tileSize),
            y: Math.floor(worldPos.y / this.tileSize)
        };
    }

    /**
     * Validate that no two characters occupy the same position
     * 
     * @returns GameplayErrorResult indicating success or failure
     */
    private validateCharacterPositions(): GameplayErrorResult {
        const positions = new Set<string>();

        for (const character of this.characters.values()) {
            const posKey = `${character.position.x},${character.position.y}`;

            if (positions.has(posKey)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_POSITION,
                    message: `Multiple characters at position (${character.position.x}, ${character.position.y})`
                };
            }

            positions.add(posKey);
        }

        return { success: true };
    }

    /**
     * Clear all characters and sprites
     */
    private clearAllCharacters(): void {
        // Destroy all sprites
        for (const sprite of this.characterSprites.values()) {
            sprite.destroy();
        }

        // Clear maps
        this.characters.clear();
        this.characterSprites.clear();
        this.selectedCharacter = undefined;

        // Clear graphics
        if (this.selectionGraphics) {
            this.selectionGraphics.clear();
        }
        if (this.movementGraphics) {
            this.movementGraphics.clear();
        }
    }

    /**
     * Get all characters
     * 
     * @returns Array of all characters
     */
    getAllCharacters(): Unit[] {
        return Array.from(this.characters.values());
    }

    /**
     * Get characters by faction
     * 
     * @param faction Faction to filter by
     * @returns Array of characters of the specified faction
     */
    getCharactersByFaction(faction: 'player' | 'enemy'): Unit[] {
        return Array.from(this.characters.values()).filter(char => char.faction === faction);
    }

    /**
     * Get character by ID
     * 
     * @param characterId Character ID
     * @returns Character or undefined if not found
     */
    getCharacterById(characterId: string): Unit | undefined {
        return this.characters.get(characterId);
    }

    /**
     * Get currently selected character
     * 
     * @returns Currently selected character or undefined
     */
    getSelectedCharacter(): Unit | undefined {
        return this.selectedCharacter;
    }

    /**
     * Check if a position is occupied
     * 
     * @param position Position to check
     * @returns True if position is occupied
     */
    isPositionOccupied(position: Position): boolean {
        return this.getCharacterAt(position) !== null;
    }

    /**
     * Get all occupied positions
     * 
     * @returns Array of all occupied grid positions
     */
    getOccupiedPositions(): Position[] {
        return Array.from(this.characters.values()).map(char => ({ ...char.position }));
    }

    /**
     * Update character stats (for leveling up, equipment changes, etc.)
     * 
     * @param characterId Character ID
     * @param newStats New stats object
     * @returns GameplayErrorResult indicating success or failure
     */
    updateCharacterStats(characterId: string, newStats: Partial<Unit>): GameplayErrorResult {
        try {
            const character = this.characters.get(characterId);
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Character not found: ${characterId}`
                };
            }

            // Update character properties
            Object.assign(character, newStats);

            // Validate updated character
            if (!TypeValidators.isValidUnit(character)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Updated character data is invalid'
                };
            }

            // Update display
            this.updateCharacterDisplay(characterId);

            // Emit character updated event
            this.eventEmitter?.emit('character-updated', {
                character: character,
                updatedFields: Object.keys(newStats)
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to update character stats',
                details: error
            };
        }
    }

    /**
     * Reset all character action states (for new turn)
     */
    resetCharacterActions(): void {
        for (const character of this.characters.values()) {
            character.hasActed = false;
            character.hasMoved = false;
        }

        // Update all displays
        this.updateCharacterDisplay();

        this.eventEmitter?.emit('character-actions-reset');
    }

    /**
     * Get character count by faction
     * 
     * @returns Object with player and enemy counts
     */
    getCharacterCounts(): { player: number; enemy: number; total: number } {
        let playerCount = 0;
        let enemyCount = 0;

        for (const character of this.characters.values()) {
            if (character.faction === 'player') {
                playerCount++;
            } else {
                enemyCount++;
            }
        }

        return {
            player: playerCount,
            enemy: enemyCount,
            total: playerCount + enemyCount
        };
    }

    /**
     * Cleanup and destroy all resources
     */
    destroy(): void {
        this.clearAllCharacters();

        if (this.selectionGraphics) {
            this.selectionGraphics.destroy();
        }
        if (this.movementGraphics) {
            this.movementGraphics.destroy();
        }

        this.eventEmitter?.emit('character-manager-destroyed');
    }
}