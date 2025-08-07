/**
 * TargetSelector - Manages attack target selection and validation
 * Handles target identification, selection processing, area attack targets, and selection cancellation
 */

import { Position, Unit, MapData } from '../types/gameplay';
import {
  Weapon,
  TargetSelectionResult,
  BattleError,
  BattleErrorDetails,
  BattleContext,
} from '../types/battle';
import { AttackRangeCalculator } from './AttackRangeCalculator';

/**
 * Configuration for target selection
 */
export interface TargetSelectionConfig {
  allowFriendlyFire: boolean; // Whether friendly units can be targeted
  requireLineOfSight: boolean; // Whether line of sight is required for targeting
  highlightAreaTargets: boolean; // Whether to highlight area of effect targets
  maxTargetsPerAttack: number; // Maximum number of targets for multi-target attacks
}

/**
 * Target validation result
 */
export interface TargetValidationResult {
  isValid: boolean;
  error?: BattleError;
  message?: string;
  suggestedTargets?: Unit[];
}

/**
 * Selection state for tracking current target selection
 */
export interface SelectionState {
  attacker: Unit | null;
  weapon: Weapon | null;
  selectedTarget: Unit | null;
  validTargets: Unit[];
  areaTargets: Unit[];
  attackRange: Position[];
  isSelectionActive: boolean;
}

/**
 * TargetSelector class for managing attack target selection
 * Provides comprehensive target selection and validation functionality
 */
export class TargetSelector {
  private attackRangeCalculator: AttackRangeCalculator;
  private config: TargetSelectionConfig;
  private selectionState: SelectionState;
  private allUnits: Unit[] = [];
  private mapData: MapData | null = null;

  /**
   * Creates a new TargetSelector instance
   * @param attackRangeCalculator - Attack range calculator for range validation
   * @param config - Configuration for target selection behavior
   */
  constructor(
    attackRangeCalculator: AttackRangeCalculator,
    config?: Partial<TargetSelectionConfig>
  ) {
    this.attackRangeCalculator = attackRangeCalculator;
    this.config = {
      allowFriendlyFire: false,
      requireLineOfSight: true,
      highlightAreaTargets: true,
      maxTargetsPerAttack: 10,
      ...config,
    };

    this.selectionState = {
      attacker: null,
      weapon: null,
      selectedTarget: null,
      validTargets: [],
      areaTargets: [],
      attackRange: [],
      isSelectionActive: false,
    };
  }

  /**
   * Initialize target selection for an attacker with their weapon
   * @param attacker - The attacking unit
   * @param weapon - The weapon being used
   * @param allUnits - All units on the battlefield
   * @param mapData - Map data for validation (optional)
   * @returns Target selection result
   */
  public initializeSelection(
    attacker: Unit,
    weapon: Weapon,
    allUnits: Unit[],
    mapData?: MapData
  ): TargetSelectionResult {
    // Validate inputs
    const validation = this.validateAttacker(attacker, weapon);
    if (!validation.isValid) {
      throw new Error(`${validation.error}: ${validation.message}`);
    }

    // Store references
    this.allUnits = allUnits;
    this.mapData = mapData || null;

    // Calculate attack range
    const rangeResult = this.attackRangeCalculator.calculateAttackRange(attacker, weapon, mapData);

    // Get valid targets within range
    const validTargets = this.getValidTargets(attacker, rangeResult.validPositions);

    // Update selection state
    this.selectionState = {
      attacker,
      weapon,
      selectedTarget: null,
      validTargets,
      areaTargets: [],
      attackRange: rangeResult.validPositions,
      isSelectionActive: true,
    };

    return {
      validTargets,
      selectedTarget: undefined,
      areaTargets: [],
      attackRange: rangeResult.validPositions,
    };
  }

  /**
   * Get all valid targets within attack range
   * @param attacker - The attacking unit
   * @param attackRange - Array of positions within attack range
   * @returns Array of valid target units
   */
  public getValidTargets(attacker: Unit, attackRange: Position[]): Unit[] {
    const validTargets: Unit[] = [];

    // Check each unit to see if it's a valid target
    for (const unit of this.allUnits) {
      // Skip the attacker itself
      if (unit.id === attacker.id) {
        continue;
      }

      // Check if unit is within attack range
      const isInRange = attackRange.some(
        pos => pos.x === unit.position.x && pos.y === unit.position.y
      );

      if (!isInRange) {
        continue;
      }

      // Validate target based on configuration and game rules
      const validation = this.validateTarget(attacker, unit);
      if (validation.isValid) {
        validTargets.push(unit);
      }
    }

    return validTargets;
  }

  /**
   * Select a specific target for attack
   * @param target - The unit to target
   * @returns True if selection was successful
   */
  public selectTarget(target: Unit): boolean {
    // Validate that selection is active
    if (!this.selectionState.isSelectionActive) {
      throw new Error(`${BattleError.INVALID_TARGET}: No active target selection`);
    }

    // Validate that the target is valid
    const isValidTarget = this.selectionState.validTargets.some(
      validTarget => validTarget.id === target.id
    );

    if (!isValidTarget) {
      throw new Error(`${BattleError.INVALID_TARGET}: Target is not valid for attack`);
    }

    // Update selection state
    this.selectionState.selectedTarget = target;

    // Calculate area targets if weapon has area of effect
    if (this.selectionState.weapon?.rangePattern?.areaOfEffect) {
      this.selectionState.areaTargets = this.getAreaTargets(
        target.position,
        this.selectionState.weapon
      );
    } else {
      this.selectionState.areaTargets = [target];
    }

    return true;
  }

  /**
   * Get all targets affected by an area attack
   * @param centerPosition - Center position of the area attack
   * @param weapon - Weapon being used for the attack
   * @returns Array of units affected by the area attack
   */
  public getAreaTargets(centerPosition: Position, weapon: Weapon): Unit[] {
    const areaTargets: Unit[] = [];

    // Get area of effect positions
    const aoePositions = this.attackRangeCalculator.calculateAreaOfEffect(
      centerPosition,
      weapon,
      this.mapData || undefined
    );

    // Find all units within the area of effect
    for (const unit of this.allUnits) {
      // Skip the attacker
      if (this.selectionState.attacker && unit.id === this.selectionState.attacker.id) {
        continue;
      }

      // Check if unit is within area of effect
      const isInAoe = aoePositions.some(
        pos => pos.x === unit.position.x && pos.y === unit.position.y
      );

      if (isInAoe) {
        // Validate target (considering friendly fire settings)
        const validation = this.validateTarget(this.selectionState.attacker!, unit);
        if (validation.isValid || this.config.allowFriendlyFire) {
          areaTargets.push(unit);
        }
      }
    }

    // Limit number of targets if configured
    return areaTargets.slice(0, this.config.maxTargetsPerAttack);
  }

  /**
   * Clear current target selection and reset state
   */
  public clearSelection(): void {
    this.selectionState = {
      attacker: null,
      weapon: null,
      selectedTarget: null,
      validTargets: [],
      areaTargets: [],
      attackRange: [],
      isSelectionActive: false,
    };
  }

  /**
   * Get current selection state
   * @returns Current selection state
   */
  public getSelectionState(): SelectionState {
    return { ...this.selectionState };
  }

  /**
   * Get current target selection result
   * @returns Current target selection result
   */
  public getCurrentSelection(): TargetSelectionResult {
    return {
      validTargets: [...this.selectionState.validTargets],
      selectedTarget: this.selectionState.selectedTarget || undefined,
      areaTargets: [...this.selectionState.areaTargets],
      attackRange: [...this.selectionState.attackRange],
    };
  }

  /**
   * Check if a specific unit can be targeted by the current attacker
   * @param target - Unit to check
   * @returns True if unit can be targeted
   */
  public canTargetUnit(target: Unit): boolean {
    if (!this.selectionState.isSelectionActive || !this.selectionState.attacker) {
      return false;
    }

    return this.selectionState.validTargets.some(validTarget => validTarget.id === target.id);
  }

  /**
   * Get the optimal target based on various criteria
   * @param criteria - Criteria for target selection ('nearest', 'weakest', 'strongest', 'random')
   * @returns Optimal target unit or null if no valid targets
   */
  public getOptimalTarget(
    criteria: 'nearest' | 'weakest' | 'strongest' | 'random' = 'nearest'
  ): Unit | null {
    if (this.selectionState.validTargets.length === 0) {
      return null;
    }

    const attacker = this.selectionState.attacker!;

    switch (criteria) {
      case 'nearest':
        return this.getNearestTarget(attacker, this.selectionState.validTargets);

      case 'weakest':
        return this.selectionState.validTargets.reduce((weakest, current) =>
          current.currentHP < weakest.currentHP ? current : weakest
        );

      case 'strongest':
        return this.selectionState.validTargets.reduce((strongest, current) =>
          current.currentHP > strongest.currentHP ? current : strongest
        );

      case 'random':
        const randomIndex = Math.floor(Math.random() * this.selectionState.validTargets.length);
        return this.selectionState.validTargets[randomIndex];

      default:
        return this.selectionState.validTargets[0];
    }
  }

  /**
   * Get the nearest target to the attacker
   * @param attacker - The attacking unit
   * @param targets - Array of potential targets
   * @returns Nearest target unit
   */
  private getNearestTarget(attacker: Unit, targets: Unit[]): Unit {
    return targets.reduce((nearest, current) => {
      const nearestDistance = this.calculateDistance(attacker.position, nearest.position);
      const currentDistance = this.calculateDistance(attacker.position, current.position);
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  /**
   * Calculate Manhattan distance between two positions
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns Manhattan distance
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Validate that an attacker and weapon are valid for target selection
   * @param attacker - The attacking unit
   * @param weapon - The weapon being used
   * @returns Validation result
   */
  private validateAttacker(attacker: Unit, weapon: Weapon): TargetValidationResult {
    // Check if attacker exists and is valid
    if (!attacker) {
      return {
        isValid: false,
        error: BattleError.INVALID_ATTACKER,
        message: 'Attacker is null or undefined',
      };
    }

    // Check if attacker is alive
    if (attacker.currentHP <= 0) {
      return {
        isValid: false,
        error: BattleError.INVALID_ATTACKER,
        message: 'Attacker is defeated and cannot attack',
      };
    }

    // Check if attacker has already acted (if applicable)
    if (attacker.hasActed) {
      return {
        isValid: false,
        error: BattleError.ALREADY_ACTED,
        message: 'Attacker has already acted this turn',
      };
    }

    // Check if weapon exists and is valid
    if (!weapon) {
      return {
        isValid: false,
        error: BattleError.NO_WEAPON_EQUIPPED,
        message: 'No weapon equipped for attack',
      };
    }

    // Check weapon durability if applicable
    if (weapon.durability !== undefined && weapon.durability <= 0) {
      return {
        isValid: false,
        error: BattleError.WEAPON_BROKEN,
        message: 'Weapon is broken and cannot be used',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate that a target is valid for attack
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @returns Validation result
   */
  private validateTarget(attacker: Unit, target: Unit): TargetValidationResult {
    // Check if target exists
    if (!target) {
      return {
        isValid: false,
        error: BattleError.INVALID_TARGET,
        message: 'Target is null or undefined',
      };
    }

    // Check if target is alive
    if (target.currentHP <= 0) {
      return {
        isValid: false,
        error: BattleError.INVALID_TARGET,
        message: 'Target is already defeated',
      };
    }

    // Check faction targeting rules
    if (!this.config.allowFriendlyFire && attacker.faction === target.faction) {
      return {
        isValid: false,
        error: BattleError.INVALID_TARGET,
        message: 'Cannot target friendly units',
      };
    }

    // Check line of sight if required
    if (this.config.requireLineOfSight) {
      const isBlocked = this.attackRangeCalculator.isAttackBlocked(
        attacker.position,
        target.position
      );

      if (isBlocked) {
        return {
          isValid: false,
          error: BattleError.TARGET_UNREACHABLE,
          message: 'Target is blocked by obstacles',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Get all units that can be targeted from a specific position
   * @param position - Position to check from
   * @param weapon - Weapon being used
   * @param faction - Faction of the attacker
   * @returns Array of targetable units
   */
  public getTargetableUnitsFromPosition(
    position: Position,
    weapon: Weapon,
    faction: 'player' | 'enemy'
  ): Unit[] {
    // Create temporary attacker for range calculation
    const tempAttacker: Unit = {
      id: 'temp',
      name: 'temp',
      position,
      stats: { maxHP: 1, maxMP: 1, attack: 1, defense: 1, speed: 1, movement: 1 },
      currentHP: 1,
      currentMP: 1,
      faction,
      hasActed: false,
      hasMoved: false,
    };

    // Calculate attack range from position
    const rangeResult = this.attackRangeCalculator.calculateAttackRange(
      tempAttacker,
      weapon,
      this.mapData || undefined
    );

    // Get valid targets within range
    return this.getValidTargets(tempAttacker, rangeResult.validPositions);
  }

  /**
   * Check if any valid targets exist for the current selection
   * @returns True if valid targets exist
   */
  public hasValidTargets(): boolean {
    return this.selectionState.validTargets.length > 0;
  }

  /**
   * Get number of valid targets
   * @returns Number of valid targets
   */
  public getValidTargetCount(): number {
    return this.selectionState.validTargets.length;
  }

  /**
   * Update configuration
   * @param config - New configuration options
   */
  public updateConfig(config: Partial<TargetSelectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): TargetSelectionConfig {
    return { ...this.config };
  }

  /**
   * Create battle error details for error reporting
   * @param error - Battle error type
   * @param message - Error message
   * @param context - Additional context
   * @returns Battle error details
   */
  private createErrorDetails(
    error: BattleError,
    message: string,
    context?: Partial<BattleContext>
  ): BattleErrorDetails {
    const battleContext: BattleContext = {
      attacker: this.selectionState.attacker!,
      target: this.selectionState.selectedTarget || undefined,
      weapon: this.selectionState.weapon || undefined,
      phase: 'target_selection',
      ...context,
    };

    return {
      error,
      message,
      context: battleContext,
      timestamp: Date.now(),
      recoverable: true,
      suggestedAction: this.getSuggestedAction(error),
    };
  }

  /**
   * Get suggested action for error recovery
   * @param error - Battle error type
   * @returns Suggested action string
   */
  private getSuggestedAction(error: BattleError): string {
    switch (error) {
      case BattleError.INVALID_TARGET:
        return 'Select a different target or clear selection';
      case BattleError.TARGET_UNREACHABLE:
        return 'Move to a position with clear line of sight';
      case BattleError.ALREADY_ACTED:
        return 'End turn or select a different unit';
      case BattleError.NO_WEAPON_EQUIPPED:
        return 'Equip a weapon before attacking';
      case BattleError.WEAPON_BROKEN:
        return 'Repair or replace the weapon';
      default:
        return 'Clear selection and try again';
    }
  }
}
