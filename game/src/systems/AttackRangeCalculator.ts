/**
 * AttackRangeCalculator - Calculates attack ranges and patterns for different weapon types
 * Handles weapon-specific range calculations, obstacle detection, and area of effect calculations
 */

import { Position, Unit, MapData } from '../types/gameplay';
import { Weapon, WeaponType, RangePattern, AttackRangeResult, BattleError } from '../types/battle';
import { MapRenderer } from '../rendering/MapRenderer';

/**
 * Configuration for attack range calculations
 */
export interface AttackRangeConfig {
  maxCalculationRange: number; // Maximum range to calculate (performance limit)
  enableObstacleBlocking: boolean; // Whether obstacles block attacks
  enableUnitBlocking: boolean; // Whether units block attacks
  diagonalAttackAllowed: boolean; // Whether diagonal attacks are allowed
}

/**
 * Result of range pattern calculation
 */
export interface RangePatternResult {
  pattern: RangePattern;
  positions: Position[];
  blockedPositions: Position[];
}

/**
 * AttackRangeCalculator class for weapon range calculations
 * Provides comprehensive attack range calculation for different weapon types
 */
export class AttackRangeCalculator {
  private mapRenderer: MapRenderer | null = null;
  private config: AttackRangeConfig;

  /**
   * Creates a new AttackRangeCalculator instance
   * @param mapRenderer - Map renderer for collision detection (optional)
   * @param config - Configuration for range calculations
   */
  constructor(mapRenderer?: MapRenderer, config?: Partial<AttackRangeConfig>) {
    this.mapRenderer = mapRenderer || null;
    this.config = {
      maxCalculationRange: 20,
      enableObstacleBlocking: true,
      enableUnitBlocking: false, // Units don't block attacks by default
      diagonalAttackAllowed: true,
      ...config,
    };
  }

  /**
   * Calculate attack range for a unit with their equipped weapon
   * @param attacker - The attacking unit
   * @param weapon - The weapon being used
   * @param mapData - Map data for bounds checking (optional)
   * @returns Attack range calculation result
   */
  public calculateAttackRange(
    attacker: Unit,
    weapon: Weapon,
    mapData?: MapData
  ): AttackRangeResult {
    // Validate inputs
    if (!attacker || !weapon) {
      throw new Error(`${BattleError.INVALID_ATTACKER}: Invalid attacker or weapon`);
    }

    // Get weapon range pattern
    const patternResult = this.getWeaponRangePattern(weapon, attacker.position);

    // Filter positions based on map bounds and obstacles
    const validPositions: Position[] = [];
    const blockedPositions: Position[] = [];

    for (const position of patternResult.positions) {
      // Check map bounds
      if (mapData && !this.isWithinMapBounds(position, mapData)) {
        continue;
      }

      // Check if position is blocked by obstacles
      if (this.isAttackBlocked(attacker.position, position)) {
        blockedPositions.push(position);
      } else {
        validPositions.push(position);
      }
    }

    return {
      validPositions,
      blockedPositions,
      weapon,
      attacker,
    };
  }

  /**
   * Get weapon range pattern based on weapon type and position
   * @param weapon - The weapon to get pattern for
   * @param attackerPosition - Position of the attacker
   * @returns Range pattern calculation result
   */
  public getWeaponRangePattern(weapon: Weapon, attackerPosition: Position): RangePatternResult {
    // Use weapon's defined range pattern if available
    if (weapon.rangePattern && weapon.rangePattern.pattern.length > 0) {
      return this.applyPatternToPosition(weapon.rangePattern, attackerPosition);
    }

    // Generate pattern based on weapon type
    const pattern = this.generatePatternForWeaponType(weapon.type, weapon.range);
    return this.applyPatternToPosition(pattern, attackerPosition);
  }

  /**
   * Generate range pattern for specific weapon type
   * @param weaponType - Type of weapon
   * @param range - Maximum range of the weapon
   * @returns Generated range pattern
   */
  private generatePatternForWeaponType(weaponType: WeaponType, range: number): RangePattern {
    const clampedRange = Math.min(range, this.config.maxCalculationRange);

    switch (weaponType) {
      case WeaponType.SWORD:
      case WeaponType.DAGGER:
        // Melee weapons: adjacent tiles only
        return {
          type: 'custom',
          range: 1,
          pattern: this.generateAdjacentPattern(),
        };

      case WeaponType.SPEAR:
        // Spears: line attack in 4 directions
        return {
          type: 'line',
          range: clampedRange,
          pattern: this.generateLinePattern(clampedRange),
        };

      case WeaponType.BOW:
        // Bows: ranged attack in all directions
        return {
          type: 'single',
          range: clampedRange,
          pattern: this.generateRangedPattern(clampedRange),
        };

      case WeaponType.STAFF:
        // Staves: cross pattern for magic
        return {
          type: 'cross',
          range: clampedRange,
          pattern: this.generateCrossPattern(clampedRange),
        };

      case WeaponType.AXE:
        // Axes: short range with wider arc
        return {
          type: 'area',
          range: Math.min(2, clampedRange),
          pattern: this.generateAreaPattern(Math.min(2, clampedRange)),
        };

      default:
        // Default: single target at range
        return {
          type: 'single',
          range: clampedRange,
          pattern: this.generateRangedPattern(clampedRange),
        };
    }
  }

  /**
   * Generate adjacent tile pattern (melee weapons)
   * @returns Array of adjacent positions relative to (0,0)
   */
  private generateAdjacentPattern(): Position[] {
    const positions: Position[] = [];

    // 4-directional adjacent tiles
    positions.push(
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 }, // East
      { x: 0, y: 1 }, // South
      { x: -1, y: 0 } // West
    );

    // Add diagonal positions if allowed
    if (this.config.diagonalAttackAllowed) {
      positions.push(
        { x: -1, y: -1 }, // Northwest
        { x: 1, y: -1 }, // Northeast
        { x: 1, y: 1 }, // Southeast
        { x: -1, y: 1 } // Southwest
      );
    }

    return positions;
  }

  /**
   * Generate line pattern (spears)
   * @param range - Maximum range
   * @returns Array of positions in line patterns
   */
  private generateLinePattern(range: number): Position[] {
    const positions: Position[] = [];

    // Four cardinal directions
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 }, // East
      { x: 0, y: 1 }, // South
      { x: -1, y: 0 }, // West
    ];

    for (const direction of directions) {
      for (let i = 1; i <= range; i++) {
        positions.push({
          x: direction.x * i,
          y: direction.y * i,
        });
      }
    }

    return positions;
  }

  /**
   * Generate ranged pattern (bows)
   * @param range - Maximum range
   * @returns Array of positions within range
   */
  private generateRangedPattern(range: number): Position[] {
    const positions: Position[] = [];

    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        // Skip center position (attacker's position)
        if (x === 0 && y === 0) {
          continue;
        }

        // Calculate Manhattan distance
        const distance = Math.abs(x) + Math.abs(y);

        // Include position if within range
        if (distance <= range) {
          positions.push({ x, y });
        }
      }
    }

    return positions;
  }

  /**
   * Generate cross pattern (staves)
   * @param range - Maximum range
   * @returns Array of positions in cross pattern
   */
  private generateCrossPattern(range: number): Position[] {
    const positions: Position[] = [];

    // Horizontal line
    for (let x = -range; x <= range; x++) {
      if (x !== 0) {
        positions.push({ x, y: 0 });
      }
    }

    // Vertical line
    for (let y = -range; y <= range; y++) {
      if (y !== 0) {
        positions.push({ x: 0, y });
      }
    }

    return positions;
  }

  /**
   * Generate area pattern (axes)
   * @param range - Maximum range
   * @returns Array of positions in area pattern
   */
  private generateAreaPattern(range: number): Position[] {
    const positions: Position[] = [];

    // Create a wider attack pattern for axes
    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        // Skip center position
        if (x === 0 && y === 0) {
          continue;
        }

        // Use Chebyshev distance (max of x,y differences) for area attacks
        const distance = Math.max(Math.abs(x), Math.abs(y));

        if (distance <= range) {
          positions.push({ x, y });
        }
      }
    }

    return positions;
  }

  /**
   * Apply range pattern to specific position
   * @param pattern - Range pattern to apply
   * @param position - Position to apply pattern to
   * @returns Pattern result with absolute positions
   */
  private applyPatternToPosition(pattern: RangePattern, position: Position): RangePatternResult {
    const positions: Position[] = [];
    const blockedPositions: Position[] = [];

    for (const relativePos of pattern.pattern) {
      const absolutePos: Position = {
        x: position.x + relativePos.x,
        y: position.y + relativePos.y,
      };

      positions.push(absolutePos);
    }

    return {
      pattern,
      positions,
      blockedPositions,
    };
  }

  /**
   * Check if an attack is blocked by obstacles between two positions
   * @param from - Starting position
   * @param to - Target position
   * @returns True if attack is blocked
   */
  public isAttackBlocked(from: Position, to: Position): boolean {
    // If obstacle blocking is disabled, attacks are never blocked
    if (!this.config.enableObstacleBlocking) {
      return false;
    }

    // If no map renderer is available, assume no blocking
    if (!this.mapRenderer) {
      return false;
    }

    // Check if target position itself is blocked
    if (!this.mapRenderer.isTerrainPassable(to)) {
      return true;
    }

    // For adjacent attacks, no line-of-sight check needed
    const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (distance <= 1) {
      return false;
    }

    // Perform line-of-sight check for ranged attacks
    return this.isLineOfSightBlocked(from, to);
  }

  /**
   * Check if line of sight is blocked between two positions
   * @param from - Starting position
   * @param to - Target position
   * @returns True if line of sight is blocked
   */
  private isLineOfSightBlocked(from: Position, to: Position): boolean {
    if (!this.mapRenderer) {
      return false;
    }

    // Use Bresenham's line algorithm to check each tile along the path
    const positions = this.getLinePositions(from, to);

    // Check each position along the line (excluding start and end)
    for (let i = 1; i < positions.length - 1; i++) {
      const position = positions[i];

      // Check if this position blocks line of sight
      if (!this.mapRenderer.isTerrainPassable(position)) {
        return true;
      }

      // Optionally check for unit blocking
      if (this.config.enableUnitBlocking && this.mapRenderer.isPositionOccupied(position)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all positions along a line between two points using Bresenham's algorithm
   * @param from - Starting position
   * @param to - Ending position
   * @returns Array of positions along the line
   */
  private getLinePositions(from: Position, to: Position): Position[] {
    const positions: Position[] = [];

    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      positions.push({ x: x0, y: y0 });

      if (x0 === x1 && y0 === y1) {
        break;
      }

      const e2 = 2 * err;

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }

      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return positions;
  }

  /**
   * Calculate area of effect for range attacks
   * @param centerPosition - Center position of the area attack
   * @param weapon - Weapon being used
   * @param mapData - Map data for bounds checking (optional)
   * @returns Array of positions affected by area attack
   */
  public calculateAreaOfEffect(
    centerPosition: Position,
    weapon: Weapon,
    mapData?: MapData
  ): Position[] {
    const affectedPositions: Position[] = [];

    // Get area of effect radius from weapon
    const aoeRadius = weapon.rangePattern?.areaOfEffect || 0;

    // If no area of effect, return only the center position
    if (aoeRadius === 0) {
      return [centerPosition];
    }

    // Calculate all positions within the area of effect
    for (let x = -aoeRadius; x <= aoeRadius; x++) {
      for (let y = -aoeRadius; y <= aoeRadius; y++) {
        const position: Position = {
          x: centerPosition.x + x,
          y: centerPosition.y + y,
        };

        // Check if position is within area of effect range
        const distance = Math.abs(x) + Math.abs(y);
        if (distance <= aoeRadius) {
          // Check map bounds if provided
          if (!mapData || this.isWithinMapBounds(position, mapData)) {
            affectedPositions.push(position);
          }
        }
      }
    }

    return affectedPositions;
  }

  /**
   * Check if a position is within map bounds
   * @param position - Position to check
   * @param mapData - Map data with bounds information
   * @returns True if position is within bounds
   */
  private isWithinMapBounds(position: Position, mapData: MapData): boolean {
    return (
      position.x >= 0 &&
      position.x < mapData.width &&
      position.y >= 0 &&
      position.y < mapData.height
    );
  }

  /**
   * Get all positions that can attack a specific target position
   * @param targetPosition - Position of the target
   * @param weapon - Weapon being used
   * @param mapData - Map data for bounds checking (optional)
   * @returns Array of positions that can attack the target
   */
  public getAttackingPositions(
    targetPosition: Position,
    weapon: Weapon,
    mapData?: MapData
  ): Position[] {
    const attackingPositions: Position[] = [];
    const range = weapon.range;

    // Calculate potential attacking positions based on weapon range
    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        // Skip the target position itself
        if (x === 0 && y === 0) {
          continue;
        }

        const attackerPosition: Position = {
          x: targetPosition.x + x,
          y: targetPosition.y + y,
        };

        // Check map bounds
        if (mapData && !this.isWithinMapBounds(attackerPosition, mapData)) {
          continue;
        }

        // Check if this position can attack the target
        const attackRange = this.calculateAttackRange(
          { position: attackerPosition } as Unit,
          weapon,
          mapData
        );

        // Check if target position is in the attack range
        const canAttackTarget = attackRange.validPositions.some(
          pos => pos.x === targetPosition.x && pos.y === targetPosition.y
        );

        if (canAttackTarget) {
          attackingPositions.push(attackerPosition);
        }
      }
    }

    return attackingPositions;
  }

  /**
   * Update map renderer for collision detection
   * @param mapRenderer - New map renderer instance
   */
  public setMapRenderer(mapRenderer: MapRenderer): void {
    this.mapRenderer = mapRenderer;
  }

  /**
   * Update configuration
   * @param config - New configuration options
   */
  public updateConfig(config: Partial<AttackRangeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): AttackRangeConfig {
    return { ...this.config };
  }

  /**
   * Calculate threat range for a unit (positions they can attack from their current location)
   * @param unit - Unit to calculate threat range for
   * @param weapon - Weapon being used
   * @param mapData - Map data for bounds checking (optional)
   * @returns Array of positions the unit can threaten
   */
  public calculateThreatRange(unit: Unit, weapon: Weapon, mapData?: MapData): Position[] {
    return this.calculateAttackRange(unit, weapon, mapData).validPositions;
  }

  /**
   * Check if a position is threatened by a unit
   * @param position - Position to check
   * @param unit - Unit that might threaten the position
   * @param weapon - Weapon being used
   * @param mapData - Map data for bounds checking (optional)
   * @returns True if position is threatened
   */
  public isPositionThreatened(
    position: Position,
    unit: Unit,
    weapon: Weapon,
    mapData?: MapData
  ): boolean {
    const threatRange = this.calculateThreatRange(unit, weapon, mapData);
    return threatRange.some(pos => pos.x === position.x && pos.y === position.y);
  }
}
