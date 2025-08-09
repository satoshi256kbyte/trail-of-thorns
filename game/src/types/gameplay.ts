/**
 * Core gameplay type definitions for the SRPG
 * Contains all fundamental interfaces and types used throughout the game
 */

/**
 * 2D position coordinates
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Character/Unit statistics
 */
export interface UnitStats {
    maxHP: number;
    maxMP: number;
    attack: number;
    defense: number;
    speed: number;
    movement: number;
}

/**
 * Equipment slot types
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

/**
 * Equipment item interface
 */
export interface Equipment {
    id: string;
    name: string;
    type: string;
    attackBonus?: number;
    defenseBonus?: number;
    speedBonus?: number;
    movementBonus?: number;
    element: string;
    specialEffects: any[];
    durability: number;
    maxDurability: number;
    description: string;
}

/**
 * Character equipment loadout
 */
export interface CharacterEquipment {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
}

/**
 * Game unit (player or enemy character)
 */
export interface Unit {
    id: string;
    name: string;
    position: Position;
    stats: UnitStats;
    currentHP: number;
    currentMP: number;
    faction: 'player' | 'enemy';
    hasActed: boolean;
    hasMoved: boolean;
    equipment: CharacterEquipment;
    sprite?: Phaser.GameObjects.Sprite;
    skillData?: import('./skill').CharacterSkillData;
}

/**
 * Map layer definition
 */
export interface MapLayer {
    name: string;
    type: 'background' | 'terrain' | 'objects' | 'collision';
    data: number[][];
    visible: boolean;
    opacity: number;
}

/**
 * Map data structure
 */
export interface MapData {
    width: number;
    height: number;
    tileSize: number;
    layers: MapLayer[];
    playerSpawns: Position[];
    enemySpawns: Position[];
}

/**
 * Victory condition types
 */
export interface VictoryCondition {
    type: 'defeat_all' | 'reach_position' | 'survive_turns' | 'protect_unit';
    target?: string; // unit ID or position reference
    position?: Position;
    turns?: number;
    description: string;
}

/**
 * Stage data containing all information for a battle
 */
export interface StageData {
    id: string;
    name: string;
    description: string;
    mapData: MapData;
    playerUnits: Unit[];
    enemyUnits: Unit[];
    victoryConditions: VictoryCondition[];
    defeatConditions?: VictoryCondition[];
}

/**
 * Game action types
 */
export type GameActionType = 'move' | 'attack' | 'skill' | 'item' | 'wait' | 'defend';

/**
 * Game action interface
 */
export interface GameAction {
    type: GameActionType;
    unitId: string;
    targetId?: string;
    targetPosition?: Position;
    skillId?: string;
    itemId?: string;
    metadata?: Record<string, any>;
}

/**
 * Current game state
 */
export interface GameState {
    currentTurn: number;
    activePlayer: 'player' | 'enemy';
    phase: 'select' | 'move' | 'action' | 'enemy' | 'victory' | 'defeat';
    selectedUnit?: Unit;
    gameResult?: 'victory' | 'defeat' | null;
    turnOrder: Unit[];
    activeUnitIndex: number;
}

/**
 * Gameplay error types
 */
export enum GameplayError {
    INVALID_STAGE_DATA = 'INVALID_STAGE_DATA',
    CHARACTER_LOAD_FAILED = 'CHARACTER_LOAD_FAILED',
    MAP_LOAD_FAILED = 'MAP_LOAD_FAILED',
    INVALID_ACTION = 'INVALID_ACTION',
    CAMERA_BOUNDS_ERROR = 'CAMERA_BOUNDS_ERROR',
    INVALID_POSITION = 'INVALID_POSITION',
    UNIT_NOT_FOUND = 'UNIT_NOT_FOUND',
    INVALID_TURN_STATE = 'INVALID_TURN_STATE',
    // Movement-specific errors
    MOVEMENT_CHARACTER_ALREADY_MOVED = 'MOVEMENT_CHARACTER_ALREADY_MOVED',
    MOVEMENT_DESTINATION_UNREACHABLE = 'MOVEMENT_DESTINATION_UNREACHABLE',
    MOVEMENT_DESTINATION_OCCUPIED = 'MOVEMENT_DESTINATION_OCCUPIED',
    MOVEMENT_INSUFFICIENT_POINTS = 'MOVEMENT_INSUFFICIENT_POINTS',
    MOVEMENT_INVALID_CHARACTER = 'MOVEMENT_INVALID_CHARACTER',
    MOVEMENT_IN_PROGRESS = 'MOVEMENT_IN_PROGRESS',
    MOVEMENT_PATH_BLOCKED = 'MOVEMENT_PATH_BLOCKED',
    MOVEMENT_ANIMATION_FAILED = 'MOVEMENT_ANIMATION_FAILED',
    MOVEMENT_WRONG_TURN = 'MOVEMENT_WRONG_TURN',
}

/**
 * Error handling result
 */
export interface GameplayErrorResult {
    success: boolean;
    error?: GameplayError;
    message?: string;
    details?: any;
}

/**
 * Type guards and validation functions
 */
export class TypeValidators {
    /**
     * Validates if a position is valid
     */
    static isValidPosition(position: any): position is Position {
        return (
            typeof position === 'object' &&
            position !== null &&
            position.hasOwnProperty('x') &&
            position.hasOwnProperty('y') &&
            typeof position.x === 'number' &&
            typeof position.y === 'number' &&
            Number.isFinite(position.x) &&
            Number.isFinite(position.y)
        );
    }

    /**
     * Validates unit stats structure
     */
    static isValidUnitStats(stats: any): stats is UnitStats {
        return (
            typeof stats === 'object' &&
            stats !== null &&
            typeof stats.maxHP === 'number' &&
            typeof stats.maxMP === 'number' &&
            typeof stats.attack === 'number' &&
            typeof stats.defense === 'number' &&
            typeof stats.speed === 'number' &&
            typeof stats.movement === 'number' &&
            stats.maxHP > 0 &&
            stats.maxMP >= 0 &&
            stats.attack >= 0 &&
            stats.defense >= 0 &&
            stats.speed > 0 &&
            stats.movement > 0
        );
    }

    /**
     * Validates unit structure
     */
    static isValidUnit(unit: any): unit is Unit {
        return (
            typeof unit === 'object' &&
            unit !== null &&
            typeof unit.id === 'string' &&
            typeof unit.name === 'string' &&
            this.isValidPosition(unit.position) &&
            this.isValidUnitStats(unit.stats) &&
            typeof unit.currentHP === 'number' &&
            typeof unit.currentMP === 'number' &&
            (unit.faction === 'player' || unit.faction === 'enemy') &&
            typeof unit.hasActed === 'boolean' &&
            typeof unit.hasMoved === 'boolean' &&
            unit.currentHP >= 0 &&
            unit.currentHP <= unit.stats.maxHP &&
            unit.currentMP >= 0 &&
            unit.currentMP <= unit.stats.maxMP
        );
    }

    /**
     * Validates map layer structure
     */
    static isValidMapLayer(layer: any): layer is MapLayer {
        return (
            typeof layer === 'object' &&
            layer !== null &&
            typeof layer.name === 'string' &&
            ['background', 'terrain', 'objects', 'collision'].includes(layer.type) &&
            Array.isArray(layer.data) &&
            layer.data.every(
                (row: any) => Array.isArray(row) && row.every((cell: any) => typeof cell === 'number')
            ) &&
            typeof layer.visible === 'boolean' &&
            typeof layer.opacity === 'number' &&
            layer.opacity >= 0 &&
            layer.opacity <= 1
        );
    }

    /**
     * Validates map data structure
     */
    static isValidMapData(mapData: any): mapData is MapData {
        return (
            typeof mapData === 'object' &&
            mapData !== null &&
            typeof mapData.width === 'number' &&
            typeof mapData.height === 'number' &&
            typeof mapData.tileSize === 'number' &&
            Array.isArray(mapData.layers) &&
            Array.isArray(mapData.playerSpawns) &&
            Array.isArray(mapData.enemySpawns) &&
            mapData.width > 0 &&
            mapData.height > 0 &&
            mapData.tileSize > 0 &&
            mapData.layers.length > 0 &&
            mapData.layers.every((layer: any) => this.isValidMapLayer(layer)) &&
            mapData.playerSpawns.every((pos: any) => this.isValidPosition(pos)) &&
            mapData.enemySpawns.every((pos: any) => this.isValidPosition(pos))
        );
    }

    /**
     * Validates victory condition structure
     */
    static isValidVictoryCondition(condition: any): condition is VictoryCondition {
        const validTypes = ['defeat_all', 'reach_position', 'survive_turns', 'protect_unit'];
        return (
            typeof condition === 'object' &&
            condition !== null &&
            validTypes.includes(condition.type) &&
            typeof condition.description === 'string' &&
            (condition.target === undefined || typeof condition.target === 'string') &&
            (condition.position === undefined || this.isValidPosition(condition.position)) &&
            (condition.turns === undefined ||
                (typeof condition.turns === 'number' && condition.turns > 0))
        );
    }

    /**
     * Validates stage data structure
     */
    static isValidStageData(stageData: any): stageData is StageData {
        return (
            typeof stageData === 'object' &&
            stageData !== null &&
            typeof stageData.id === 'string' &&
            typeof stageData.name === 'string' &&
            typeof stageData.description === 'string' &&
            this.isValidMapData(stageData.mapData) &&
            Array.isArray(stageData.playerUnits) &&
            Array.isArray(stageData.enemyUnits) &&
            Array.isArray(stageData.victoryConditions) &&
            stageData.playerUnits.length > 0 &&
            stageData.enemyUnits.length > 0 &&
            stageData.victoryConditions.length > 0 &&
            stageData.playerUnits.every((unit: any) => this.isValidUnit(unit)) &&
            stageData.enemyUnits.every((unit: any) => this.isValidUnit(unit)) &&
            stageData.victoryConditions.every((condition: any) =>
                this.isValidVictoryCondition(condition)
            ) &&
            (stageData.defeatConditions === undefined ||
                (Array.isArray(stageData.defeatConditions) &&
                    stageData.defeatConditions.every((condition: any) =>
                        this.isValidVictoryCondition(condition)
                    )))
        );
    }

    /**
     * Validates game state structure
     */
    static isValidGameState(gameState: any): gameState is GameState {
        const validPhases = ['select', 'move', 'action', 'enemy', 'victory', 'defeat'];
        return (
            typeof gameState === 'object' &&
            gameState !== null &&
            typeof gameState.currentTurn === 'number' &&
            (gameState.activePlayer === 'player' || gameState.activePlayer === 'enemy') &&
            validPhases.includes(gameState.phase) &&
            (gameState.selectedUnit === undefined || this.isValidUnit(gameState.selectedUnit)) &&
            (gameState.gameResult === null ||
                gameState.gameResult === 'victory' ||
                gameState.gameResult === 'defeat') &&
            Array.isArray(gameState.turnOrder) &&
            typeof gameState.activeUnitIndex === 'number' &&
            gameState.currentTurn >= 1 &&
            gameState.activeUnitIndex >= 0 &&
            gameState.turnOrder.every((unit: any) => this.isValidUnit(unit))
        );
    }
}
