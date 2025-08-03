/**
 * Data validation utilities for SRPG gameplay
 * Provides comprehensive validation for stage data, map bounds, and game objects
 */

import {
  StageData,
  MapData,
  Unit,
  Position,
  VictoryCondition,
  GameplayError,
  GameplayErrorResult,
  TypeValidators,
} from '../types/gameplay';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Map bounds validation result
 */
export interface MapBoundsResult {
  isValid: boolean;
  position: Position;
  mapWidth: number;
  mapHeight: number;
  error?: string;
}

/**
 * Comprehensive data validator for SRPG gameplay
 */
export class DataValidator {
  /**
   * Validates complete stage data structure and content
   * @param stageData The stage data to validate
   * @returns Validation result with detailed error information
   */
  static validateStageData(stageData: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Basic null/undefined check
    if (!stageData || typeof stageData !== 'object') {
      result.isValid = false;
      result.errors.push('Invalid stage data structure');
      return result;
    }

    // Perform detailed validation instead of using the strict TypeValidator
    const stage = stageData;

    // Validate stage metadata
    this.validateStageMetadata(stage, result);

    // Validate map data
    this.validateMapDataContent(stage.mapData, result);

    // Validate units
    this.validateUnits(stage.playerUnits, 'player', stage.mapData, result);
    this.validateUnits(stage.enemyUnits, 'enemy', stage.mapData, result);

    // Validate victory conditions
    this.validateVictoryConditions(stage.victoryConditions, stage, result);

    // Validate defeat conditions if present
    if (stage.defeatConditions) {
      this.validateVictoryConditions(stage.defeatConditions, stage, result);
    }

    // Cross-validation checks
    this.performCrossValidation(stage, result);

    return result;
  }

  /**
   * Validates if a position is within map bounds
   * @param position The position to check
   * @param mapData The map data containing bounds information
   * @returns Map bounds validation result
   */
  static validateMapBounds(position: Position, mapData: MapData): MapBoundsResult {
    const result: MapBoundsResult = {
      isValid: true,
      position,
      mapWidth: mapData.width,
      mapHeight: mapData.height,
    };

    // Check if position is valid
    if (!TypeValidators.isValidPosition(position)) {
      result.isValid = false;
      result.error = 'Invalid position structure';
      return result;
    }

    // Check bounds
    if (position.x < 0 || position.x >= mapData.width) {
      result.isValid = false;
      result.error = `X coordinate ${position.x} is out of bounds (0-${mapData.width - 1})`;
      return result;
    }

    if (position.y < 0 || position.y >= mapData.height) {
      result.isValid = false;
      result.error = `Y coordinate ${position.y} is out of bounds (0-${mapData.height - 1})`;
      return result;
    }

    return result;
  }

  /**
   * Validates stage metadata (ID, name, description)
   */
  private static validateStageMetadata(stage: StageData, result: ValidationResult): void {
    if (!stage.id || stage.id.trim().length === 0) {
      result.errors.push('Stage ID cannot be empty');
      result.isValid = false;
    }

    if (!stage.name || stage.name.trim().length === 0) {
      result.errors.push('Stage name cannot be empty');
      result.isValid = false;
    }

    if (!stage.description || stage.description.trim().length === 0) {
      result.warnings.push('Stage description is empty');
    }

    // Check for reasonable ID format
    if (stage.id && !/^[a-zA-Z0-9_-]+$/.test(stage.id)) {
      result.warnings.push('Stage ID contains special characters that may cause issues');
    }
  }

  /**
   * Validates map data content and structure
   */
  private static validateMapDataContent(mapData: MapData, result: ValidationResult): void {
    // Validate map dimensions
    if (mapData.width < 5 || mapData.height < 5) {
      result.warnings.push('Map is very small (less than 5x5), gameplay may be limited');
    }

    if (mapData.width > 50 || mapData.height > 50) {
      result.warnings.push('Map is very large (more than 50x50), performance may be affected');
    }

    // Validate tile size
    if (mapData.tileSize < 16 || mapData.tileSize > 128) {
      result.warnings.push('Unusual tile size, recommended range is 16-128 pixels');
    }

    // Validate layers
    this.validateMapLayers(mapData, result);

    // Validate spawn points
    this.validateSpawnPoints(mapData, result);
  }

  /**
   * Validates map layers
   */
  private static validateMapLayers(mapData: MapData, result: ValidationResult): void {
    const layerTypes = mapData.layers.map(layer => layer.type);

    // Check for required layer types
    if (!layerTypes.includes('background')) {
      result.warnings.push('No background layer found');
    }

    if (!layerTypes.includes('terrain')) {
      result.warnings.push('No terrain layer found');
    }

    // Validate layer data dimensions
    mapData.layers.forEach((layer, index) => {
      if (layer.data.length !== mapData.height) {
        result.errors.push(
          `Layer ${index} (${layer.name}) height mismatch: expected ${mapData.height}, got ${layer.data.length}`
        );
        result.isValid = false;
      }

      layer.data.forEach((row, rowIndex) => {
        if (row.length !== mapData.width) {
          result.errors.push(
            `Layer ${index} (${layer.name}) row ${rowIndex} width mismatch: expected ${mapData.width}, got ${row.length}`
          );
          result.isValid = false;
        }
      });
    });
  }

  /**
   * Validates spawn points
   */
  private static validateSpawnPoints(mapData: MapData, result: ValidationResult): void {
    // Check player spawns
    if (mapData.playerSpawns.length === 0) {
      result.errors.push('No player spawn points defined');
      result.isValid = false;
    }

    // Check enemy spawns
    if (mapData.enemySpawns.length === 0) {
      result.errors.push('No enemy spawn points defined');
      result.isValid = false;
    }

    // Validate spawn positions are within bounds
    mapData.playerSpawns.forEach((spawn, index) => {
      const boundsResult = this.validateMapBounds(spawn, mapData);
      if (!boundsResult.isValid) {
        result.errors.push(`Player spawn ${index} is out of bounds: ${boundsResult.error}`);
        result.isValid = false;
      }
    });

    mapData.enemySpawns.forEach((spawn, index) => {
      const boundsResult = this.validateMapBounds(spawn, mapData);
      if (!boundsResult.isValid) {
        result.errors.push(`Enemy spawn ${index} is out of bounds: ${boundsResult.error}`);
        result.isValid = false;
      }
    });

    // Check for overlapping spawns
    this.checkSpawnOverlaps(mapData, result);
  }

  /**
   * Checks for overlapping spawn points
   */
  private static checkSpawnOverlaps(mapData: MapData, result: ValidationResult): void {
    const allSpawns = [
      ...mapData.playerSpawns.map(pos => ({ ...pos, type: 'player' })),
      ...mapData.enemySpawns.map(pos => ({ ...pos, type: 'enemy' })),
    ];

    for (let i = 0; i < allSpawns.length; i++) {
      for (let j = i + 1; j < allSpawns.length; j++) {
        if (allSpawns[i].x === allSpawns[j].x && allSpawns[i].y === allSpawns[j].y) {
          result.errors.push(
            `Spawn point overlap at (${allSpawns[i].x}, ${allSpawns[i].y}) between ${allSpawns[i].type} and ${allSpawns[j].type}`
          );
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Validates units array
   */
  private static validateUnits(
    units: Unit[],
    faction: 'player' | 'enemy',
    mapData: MapData,
    result: ValidationResult
  ): void {
    if (units.length === 0) {
      result.errors.push(`No ${faction} units defined`);
      result.isValid = false;
      return;
    }

    // Check for duplicate IDs
    const unitIds = units.map(unit => unit.id);
    const duplicateIds = unitIds.filter((id, index) => unitIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      result.errors.push(`Duplicate ${faction} unit IDs: ${duplicateIds.join(', ')}`);
      result.isValid = false;
    }

    // Validate each unit
    units.forEach((unit, index) => {
      this.validateUnit(unit, index, faction, mapData, result);
    });
  }

  /**
   * Validates individual unit
   */
  private static validateUnit(
    unit: Unit,
    index: number,
    faction: string,
    mapData: MapData,
    result: ValidationResult
  ): void {
    // Check position bounds
    const boundsResult = this.validateMapBounds(unit.position, mapData);
    if (!boundsResult.isValid) {
      result.errors.push(
        `${faction} unit ${index} (${unit.name}) position is out of bounds: ${boundsResult.error}`
      );
      result.isValid = false;
    }

    // Check faction consistency
    if (unit.faction !== faction) {
      result.errors.push(
        `${faction} unit ${index} (${unit.name}) has incorrect faction: ${unit.faction}`
      );
      result.isValid = false;
    }

    // Validate stats ranges
    if (unit.stats.maxHP > 9999) {
      result.warnings.push(
        `${faction} unit ${index} (${unit.name}) has very high HP: ${unit.stats.maxHP}`
      );
    }

    if (unit.stats.movement > 10) {
      result.warnings.push(
        `${faction} unit ${index} (${unit.name}) has very high movement: ${unit.stats.movement}`
      );
    }

    // Check for reasonable stat values
    if (unit.stats.speed <= 0) {
      result.errors.push(
        `${faction} unit ${index} (${unit.name}) has invalid speed: ${unit.stats.speed}`
      );
      result.isValid = false;
    }
  }

  /**
   * Validates victory conditions
   */
  private static validateVictoryConditions(
    conditions: VictoryCondition[],
    stage: StageData,
    result: ValidationResult
  ): void {
    conditions.forEach((condition, index) => {
      switch (condition.type) {
        case 'reach_position':
          if (!condition.position) {
            result.errors.push(`Victory condition ${index} (reach_position) missing position`);
            result.isValid = false;
          } else {
            const boundsResult = this.validateMapBounds(condition.position, stage.mapData);
            if (!boundsResult.isValid) {
              result.errors.push(
                `Victory condition ${index} position out of bounds: ${boundsResult.error}`
              );
              result.isValid = false;
            }
          }
          break;

        case 'protect_unit':
          if (!condition.target) {
            result.errors.push(`Victory condition ${index} (protect_unit) missing target unit ID`);
            result.isValid = false;
          } else {
            const unitExists = [...stage.playerUnits, ...stage.enemyUnits].some(
              unit => unit.id === condition.target
            );
            if (!unitExists) {
              result.errors.push(
                `Victory condition ${index} references non-existent unit: ${condition.target}`
              );
              result.isValid = false;
            }
          }
          break;

        case 'survive_turns':
          if (!condition.turns || condition.turns <= 0) {
            result.errors.push(
              `Victory condition ${index} (survive_turns) has invalid turn count: ${condition.turns}`
            );
            result.isValid = false;
          }
          break;
      }
    });
  }

  /**
   * Performs cross-validation checks between different parts of stage data
   */
  private static performCrossValidation(stage: StageData, result: ValidationResult): void {
    // Check if there are enough spawn points for units
    if (stage.playerUnits.length > stage.mapData.playerSpawns.length) {
      result.warnings.push(
        `More player units (${stage.playerUnits.length}) than spawn points (${stage.mapData.playerSpawns.length})`
      );
    }

    if (stage.enemyUnits.length > stage.mapData.enemySpawns.length) {
      result.warnings.push(
        `More enemy units (${stage.enemyUnits.length}) than spawn points (${stage.mapData.enemySpawns.length})`
      );
    }

    // Check for unit position overlaps
    this.checkUnitPositionOverlaps(stage, result);

    // Validate balance
    this.validateGameBalance(stage, result);
  }

  /**
   * Checks for overlapping unit positions
   */
  private static checkUnitPositionOverlaps(stage: StageData, result: ValidationResult): void {
    const allUnits = [...stage.playerUnits, ...stage.enemyUnits];

    for (let i = 0; i < allUnits.length; i++) {
      for (let j = i + 1; j < allUnits.length; j++) {
        if (
          allUnits[i].position.x === allUnits[j].position.x &&
          allUnits[i].position.y === allUnits[j].position.y
        ) {
          result.errors.push(
            `Unit position overlap at (${allUnits[i].position.x}, ${allUnits[i].position.y}) between ${allUnits[i].name} and ${allUnits[j].name}`
          );
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Validates basic game balance
   */
  private static validateGameBalance(stage: StageData, result: ValidationResult): void {
    const playerCount = stage.playerUnits.length;
    const enemyCount = stage.enemyUnits.length;

    // Check unit count balance
    if (enemyCount > playerCount * 3) {
      result.warnings.push(
        `Enemy units (${enemyCount}) significantly outnumber player units (${playerCount})`
      );
    }

    // Calculate total stats for basic balance check
    const playerTotalHP = stage.playerUnits.reduce((sum, unit) => sum + unit.stats.maxHP, 0);
    const enemyTotalHP = stage.enemyUnits.reduce((sum, unit) => sum + unit.stats.maxHP, 0);

    if (enemyTotalHP > playerTotalHP * 2) {
      result.warnings.push('Enemy total HP significantly exceeds player total HP');
    }
  }

  /**
   * Quick validation for basic stage data structure
   * @param stageData The stage data to validate
   * @returns True if basic structure is valid
   */
  static isValidStageDataStructure(stageData: any): boolean {
    return TypeValidators.isValidStageData(stageData);
  }

  /**
   * Validates a position array (for spawn points, etc.)
   * @param positions Array of positions to validate
   * @param mapData Map data for bounds checking
   * @returns Validation result
   */
  static validatePositionArray(positions: Position[], mapData: MapData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    positions.forEach((position, index) => {
      const boundsResult = this.validateMapBounds(position, mapData);
      if (!boundsResult.isValid) {
        result.errors.push(`Position ${index} is invalid: ${boundsResult.error}`);
        result.isValid = false;
      }
    });

    return result;
  }
}
