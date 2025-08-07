/**
 * BattleStateManager - Manages battle state changes and post-battle processing
 *
 * This class handles:
 * - Applying damage to characters and updating HP
 * - Managing unit defeated states and action invalidation
 * - Granting experience points to attackers
 * - Recording battle results and statistics
 * - Updating game state after battles complete
 */

import { Unit, GameplayError, GameplayErrorResult } from '../types/gameplay';
import { BattleResult, BattleStatistics, StatusEffect, BattleUnit } from '../types/battle';

export interface ExperienceConfig {
  /** Base experience for landing an attack */
  attackHitExperience: number;
  /** Base experience for defeating an enemy */
  defeatExperience: number;
  /** Experience multiplier based on level difference */
  levelDifferenceMultiplier: number;
  /** Maximum experience that can be gained from a single battle */
  maxExperiencePerBattle: number;
  /** Experience for supporting allies (healing, buffs) */
  supportExperience: number;
}

export interface BattleStateConfig {
  /** Whether to automatically mark units as acted when defeated */
  autoMarkDefeatedAsActed: boolean;
  /** Whether to clear status effects when unit is defeated */
  clearStatusEffectsOnDefeat: boolean;
  /** Whether to grant experience for overkill damage */
  grantOverkillExperience: boolean;
  /** Minimum damage required to grant experience */
  minimumDamageForExperience: number;
}

export interface BattleStateSummary {
  /** Total battles processed */
  totalBattles: number;
  /** Total damage dealt across all battles */
  totalDamageDealt: number;
  /** Total experience granted */
  totalExperienceGranted: number;
  /** Number of units defeated */
  unitsDefeated: number;
  /** Number of critical hits landed */
  criticalHits: number;
  /** Average damage per battle */
  averageDamagePerBattle: number;
}

export class BattleStateManager {
  private eventEmitter?: Phaser.Events.EventEmitter;
  private experienceConfig: ExperienceConfig;
  private battleConfig: BattleStateConfig;
  private battleHistory: BattleResult[];
  private battleStatsSummary: BattleStateSummary;

  // Default configurations
  private static readonly DEFAULT_EXPERIENCE_CONFIG: ExperienceConfig = {
    attackHitExperience: 10,
    defeatExperience: 50,
    levelDifferenceMultiplier: 0.1,
    maxExperiencePerBattle: 200,
    supportExperience: 15,
  };

  private static readonly DEFAULT_BATTLE_CONFIG: BattleStateConfig = {
    autoMarkDefeatedAsActed: true,
    clearStatusEffectsOnDefeat: true,
    grantOverkillExperience: false,
    minimumDamageForExperience: 1,
  };

  constructor(
    eventEmitter?: Phaser.Events.EventEmitter,
    experienceConfig?: Partial<ExperienceConfig>,
    battleConfig?: Partial<BattleStateConfig>
  ) {
    this.eventEmitter = eventEmitter;
    this.experienceConfig = {
      ...BattleStateManager.DEFAULT_EXPERIENCE_CONFIG,
      ...experienceConfig,
    };
    this.battleConfig = { ...BattleStateManager.DEFAULT_BATTLE_CONFIG, ...battleConfig };
    this.battleHistory = [];
    this.battleStatsSummary = this.createInitialStatsSummary();
  }

  /**
   * Create initial battle statistics summary
   */
  private createInitialStatsSummary(): BattleStatsSummary {
    return {
      totalBattles: 0,
      totalDamageDealt: 0,
      totalExperienceGranted: 0,
      unitsDefeated: 0,
      criticalHits: 0,
      averageDamagePerBattle: 0,
    };
  }

  /**
   * Apply damage to a character and update their current HP
   *
   * @param target Unit receiving damage
   * @param damage Amount of damage to apply
   * @param source Optional source of damage (for tracking)
   * @returns GameplayErrorResult indicating success or failure
   */
  applyDamage(target: Unit, damage: number, source?: string): GameplayErrorResult {
    try {
      // Validate inputs
      if (!target) {
        return {
          success: false,
          error: GameplayError.UNIT_NOT_FOUND,
          message: 'Target unit is null or undefined',
        };
      }

      if (typeof damage !== 'number' || damage < 0) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Damage must be a non-negative number',
        };
      }

      // Validate target has valid HP values
      if (typeof target.currentHP !== 'number' || typeof target.stats?.maxHP !== 'number') {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Target unit has invalid HP values',
        };
      }

      // Store previous HP for event data
      const previousHP = target.currentHP;

      // Apply damage (ensure HP doesn't go below 0)
      const actualDamage = Math.min(damage, target.currentHP);
      target.currentHP = Math.max(0, target.currentHP - damage);

      // Calculate if this was overkill damage
      const overkillDamage = damage - actualDamage;
      const wasDefeated = target.currentHP === 0;

      // Update battle statistics if target is a BattleUnit
      if (this.isBattleUnit(target)) {
        target.battleStats.totalDamageReceived += actualDamage;
      }

      // Emit damage applied event
      this.eventEmitter?.emit('damage-applied', {
        target: target,
        damage: actualDamage,
        overkillDamage: overkillDamage,
        previousHP: previousHP,
        currentHP: target.currentHP,
        wasDefeated: wasDefeated,
        source: source,
      });

      // Handle unit defeat if HP reached 0
      if (wasDefeated && previousHP > 0) {
        const defeatResult = this.handleUnitDefeated(target);
        if (!defeatResult.success) {
          return defeatResult;
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to apply damage',
        details: error,
      };
    }
  }

  /**
   * Handle unit defeated state processing and action invalidation
   *
   * @param unit Unit that was defeated
   * @returns GameplayErrorResult indicating success or failure
   */
  handleUnitDefeated(unit: Unit): GameplayErrorResult {
    try {
      // Validate unit
      if (!unit) {
        return {
          success: false,
          error: GameplayError.UNIT_NOT_FOUND,
          message: 'Unit is null or undefined',
        };
      }

      // Ensure unit is actually defeated (HP = 0)
      if (unit.currentHP > 0) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Unit is not defeated (HP > 0)',
        };
      }

      // Mark unit as having acted (can't act when defeated)
      if (this.battleConfig.autoMarkDefeatedAsActed) {
        unit.hasActed = true;
        unit.hasMoved = true;
      }

      // Clear status effects if configured to do so
      if (this.battleConfig.clearStatusEffectsOnDefeat && this.isBattleUnit(unit)) {
        unit.statusEffects = [];
      }

      // Update battle statistics
      if (this.isBattleUnit(unit)) {
        unit.canAttack = false;
        unit.attacksRemaining = 0;
      }

      // Update summary statistics
      this.battleStatsSummary.unitsDefeated++;

      // Emit unit defeated event
      this.eventEmitter?.emit('unit-defeated', {
        unit: unit,
        faction: unit.faction,
        wasPlayer: unit.faction === 'player',
        position: unit.position,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to handle unit defeat',
        details: error,
      };
    }
  }

  /**
   * Grant experience points to a unit based on battle actions
   *
   * @param unit Unit to grant experience to
   * @param baseAmount Base experience amount
   * @param battleResult Optional battle result for context
   * @returns GameplayErrorResult indicating success or failure
   */
  grantExperience(
    unit: Unit,
    baseAmount: number,
    battleResult?: BattleResult
  ): GameplayErrorResult {
    try {
      // Validate inputs
      if (!unit) {
        return {
          success: false,
          error: GameplayError.UNIT_NOT_FOUND,
          message: 'Unit is null or undefined',
        };
      }

      if (typeof baseAmount !== 'number' || baseAmount < 0 || !Number.isFinite(baseAmount)) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Base experience amount must be a non-negative finite number',
        };
      }

      // Only grant experience to living player units
      if (unit.currentHP <= 0) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Cannot grant experience to defeated unit',
        };
      }

      if (unit.faction !== 'player') {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Experience can only be granted to player units',
        };
      }

      // Calculate final experience amount
      let finalExperience = baseAmount;

      // Apply level difference multiplier if battle result is provided
      if (battleResult) {
        const levelDifference = battleResult.target.stats.maxHP - unit.stats.maxHP; // Using maxHP as level proxy
        const levelMultiplier =
          1 + levelDifference * this.experienceConfig.levelDifferenceMultiplier;
        finalExperience = Math.floor(finalExperience * Math.max(0.1, levelMultiplier));

        // Add bonus experience for critical hits
        if (battleResult.isCritical) {
          finalExperience = Math.floor(finalExperience * 1.5);
        }

        // Add bonus experience for defeating enemies
        if (battleResult.targetDefeated) {
          finalExperience += this.experienceConfig.defeatExperience;
        }
      }

      // Cap experience at maximum per battle
      finalExperience = Math.min(finalExperience, this.experienceConfig.maxExperiencePerBattle);

      // Initialize experience tracking if not present
      if (!unit.hasOwnProperty('experience')) {
        (unit as any).experience = 0;
      }

      // Grant experience
      const previousExperience = (unit as any).experience || 0;
      (unit as any).experience = previousExperience + finalExperience;

      // Update battle statistics
      if (this.isBattleUnit(unit)) {
        unit.battleStats.experienceGained += finalExperience;
      }

      // Update summary statistics
      this.battleStatsSummary.totalExperienceGranted += finalExperience;

      // Check for level up (simplified level system)
      const newLevel = Math.floor(((unit as any).experience || 0) / 100) + 1;
      const oldLevel = Math.floor(previousExperience / 100) + 1;
      const leveledUp = newLevel > oldLevel;

      // Emit experience granted event
      this.eventEmitter?.emit('experience-granted', {
        unit: unit,
        experienceGained: finalExperience,
        totalExperience: (unit as any).experience,
        previousExperience: previousExperience,
        leveledUp: leveledUp,
        newLevel: newLevel,
        battleResult: battleResult,
      });

      // Handle level up if it occurred
      if (leveledUp) {
        this.handleLevelUp(unit, newLevel, oldLevel);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to grant experience',
        details: error,
      };
    }
  }

  /**
   * Handle level up processing
   *
   * @param unit Unit that leveled up
   * @param newLevel New level
   * @param oldLevel Previous level
   */
  private handleLevelUp(unit: Unit, newLevel: number, oldLevel: number): void {
    try {
      // Calculate stat increases (simplified growth system)
      const levelsGained = newLevel - oldLevel;
      const statIncrease = levelsGained * 5; // 5 points per level

      // Increase stats
      unit.stats.maxHP += statIncrease;
      unit.stats.maxMP += Math.floor(statIncrease * 0.5);
      unit.stats.attack += Math.floor(statIncrease * 0.3);
      unit.stats.defense += Math.floor(statIncrease * 0.3);
      unit.stats.speed += Math.floor(statIncrease * 0.2);

      // Heal unit on level up
      unit.currentHP = unit.stats.maxHP;
      unit.currentMP = unit.stats.maxMP;

      // Emit level up event
      this.eventEmitter?.emit('unit-level-up', {
        unit: unit,
        newLevel: newLevel,
        oldLevel: oldLevel,
        levelsGained: levelsGained,
        statIncrease: statIncrease,
      });
    } catch (error) {
      console.error('Error handling level up:', error);
    }
  }

  /**
   * Record battle result and update statistics
   *
   * @param result Battle result to record
   * @returns GameplayErrorResult indicating success or failure
   */
  recordBattleResult(result: BattleResult): GameplayErrorResult {
    try {
      // Validate battle result
      if (!result) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Battle result is null or undefined',
        };
      }

      // Validate required fields
      if (!result.attacker || !result.target || typeof result.finalDamage !== 'number') {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Battle result is missing required fields',
        };
      }

      // Add timestamp if not present
      if (!result.timestamp) {
        result.timestamp = Date.now();
      }

      // Store battle result in history
      this.battleHistory.push({ ...result });

      // Update attacker battle statistics
      if (this.isBattleUnit(result.attacker)) {
        const attackerStats = result.attacker.battleStats;
        attackerStats.totalDamageDealt += result.finalDamage;
        attackerStats.battlesParticipated++;

        if (result.isCritical) {
          attackerStats.criticalHitsLanded++;
        }

        if (!result.isEvaded) {
          attackerStats.attacksLanded++;
        } else {
          attackerStats.attacksMissed++;
        }

        if (result.targetDefeated) {
          attackerStats.unitsDefeated++;
        }
      }

      // Update target battle statistics
      if (this.isBattleUnit(result.target)) {
        const targetStats = result.target.battleStats;
        // Note: totalDamageReceived is updated in applyDamage, not here

        if (result.isCritical) {
          targetStats.criticalHitsReceived++;
        }

        if (result.isEvaded) {
          targetStats.attacksEvaded++;
        }
      }

      // Update summary statistics
      this.battleStatsSummary.totalBattles++;
      this.battleStatsSummary.totalDamageDealt += result.finalDamage;

      if (result.isCritical) {
        this.battleStatsSummary.criticalHits++;
      }

      // Recalculate average damage
      this.battleStatsSummary.averageDamagePerBattle =
        this.battleStatsSummary.totalDamageDealt / this.battleStatsSummary.totalBattles;

      // Emit battle result recorded event
      this.eventEmitter?.emit('battle-result-recorded', {
        result: result,
        battleCount: this.battleHistory.length,
        summary: { ...this.battleStatsSummary },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to record battle result',
        details: error,
      };
    }
  }

  /**
   * Update game state after battle completion
   *
   * @param battleResult Battle result that just completed
   * @param allUnits All units in the current battle
   * @returns GameplayErrorResult indicating success or failure
   */
  updatePostBattle(battleResult: BattleResult, allUnits: Unit[]): GameplayErrorResult {
    try {
      // Validate inputs
      if (!battleResult) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Battle result is required',
        };
      }

      if (!Array.isArray(allUnits)) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'All units array is required',
        };
      }

      // Process status effects for all units
      const statusResult = this.processStatusEffects(allUnits);
      if (!statusResult.success) {
        return statusResult;
      }

      // Check for victory/defeat conditions
      const conditionResult = this.checkBattleConditions(allUnits);
      if (!conditionResult.success) {
        return conditionResult;
      }

      // Update unit action states based on battle outcome
      const actionResult = this.updateUnitActionStates(allUnits);
      if (!actionResult.success) {
        return actionResult;
      }

      // Clean up defeated units
      const cleanupResult = this.cleanupDefeatedUnits(allUnits);
      if (!cleanupResult.success) {
        return cleanupResult;
      }

      // Emit post-battle update event
      this.eventEmitter?.emit('post-battle-update-complete', {
        battleResult: battleResult,
        livingPlayerUnits: allUnits.filter(u => u.faction === 'player' && u.currentHP > 0).length,
        livingEnemyUnits: allUnits.filter(u => u.faction === 'enemy' && u.currentHP > 0).length,
        battleSummary: { ...this.battleStatsSummary },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to update post-battle state',
        details: error,
      };
    }
  }

  /**
   * Process status effects for all units (reduce duration, apply effects)
   *
   * @param units All units to process
   * @returns GameplayErrorResult indicating success or failure
   */
  private processStatusEffects(units: Unit[]): GameplayErrorResult {
    try {
      for (const unit of units) {
        if (!this.isBattleUnit(unit)) continue;

        const battleUnit = unit as BattleUnit;
        const effectsToRemove: number[] = [];

        // Process each status effect
        for (let i = 0; i < battleUnit.statusEffects.length; i++) {
          const effect = battleUnit.statusEffects[i];

          // Apply effect (simplified implementation)
          switch (effect.type) {
            case 'poison':
              this.applyDamage(unit, effect.power, `Poison (${effect.source})`);
              break;
            case 'heal':
              unit.currentHP = Math.min(unit.stats.maxHP, unit.currentHP + effect.power);
              break;
            // Add other effect types as needed
          }

          // Reduce duration
          effect.duration--;

          // Mark for removal if expired
          if (effect.duration <= 0) {
            effectsToRemove.push(i);
          }
        }

        // Remove expired effects (in reverse order to maintain indices)
        for (let i = effectsToRemove.length - 1; i >= 0; i--) {
          battleUnit.statusEffects.splice(effectsToRemove[i], 1);
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to process status effects',
        details: error,
      };
    }
  }

  /**
   * Check battle victory/defeat conditions
   *
   * @param units All units in battle
   * @returns GameplayErrorResult indicating success or failure
   */
  private checkBattleConditions(units: Unit[]): GameplayErrorResult {
    try {
      const livingPlayerUnits = units.filter(u => u.faction === 'player' && u.currentHP > 0);
      const livingEnemyUnits = units.filter(u => u.faction === 'enemy' && u.currentHP > 0);

      // Check for defeat condition (all player units defeated)
      if (livingPlayerUnits.length === 0) {
        this.eventEmitter?.emit('battle-defeat-condition-met', {
          reason: 'all_player_units_defeated',
          remainingEnemies: livingEnemyUnits.length,
        });
      }

      // Check for victory condition (all enemy units defeated)
      if (livingEnemyUnits.length === 0) {
        this.eventEmitter?.emit('battle-victory-condition-met', {
          reason: 'all_enemy_units_defeated',
          survivingPlayers: livingPlayerUnits.length,
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to check battle conditions',
        details: error,
      };
    }
  }

  /**
   * Update unit action states after battle
   *
   * @param units All units to update
   * @returns GameplayErrorResult indicating success or failure
   */
  private updateUnitActionStates(units: Unit[]): GameplayErrorResult {
    try {
      for (const unit of units) {
        // Reset attack availability for battle units
        if (this.isBattleUnit(unit)) {
          const battleUnit = unit as BattleUnit;

          // Reset attacks remaining if unit is alive
          if (unit.currentHP > 0) {
            battleUnit.attacksRemaining = 1; // Default to 1 attack per turn
            battleUnit.canAttack = true;
          } else {
            battleUnit.attacksRemaining = 0;
            battleUnit.canAttack = false;
          }
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to update unit action states',
        details: error,
      };
    }
  }

  /**
   * Clean up defeated units (remove from active play, update sprites, etc.)
   *
   * @param units All units to check for cleanup
   * @returns GameplayErrorResult indicating success or failure
   */
  private cleanupDefeatedUnits(units: Unit[]): GameplayErrorResult {
    try {
      const defeatedUnits = units.filter(u => u.currentHP <= 0);

      for (const unit of defeatedUnits) {
        // Update sprite appearance for defeated units
        if (unit.sprite) {
          unit.sprite.setAlpha(0.3); // Make defeated units semi-transparent
          unit.sprite.setTint(0x666666); // Gray tint for defeated units
        }

        // Emit unit cleanup event
        this.eventEmitter?.emit('unit-cleanup', {
          unit: unit,
          wasPlayer: unit.faction === 'player',
          position: unit.position,
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to cleanup defeated units',
        details: error,
      };
    }
  }

  /**
   * Type guard to check if a unit is a BattleUnit
   *
   * @param unit Unit to check
   * @returns True if unit is a BattleUnit
   */
  private isBattleUnit(unit: Unit): unit is BattleUnit {
    return (
      unit &&
      typeof (unit as any).battleStats === 'object' &&
      typeof (unit as any).canAttack === 'boolean' &&
      typeof (unit as any).attacksRemaining === 'number' &&
      Array.isArray((unit as any).statusEffects)
    );
  }

  /**
   * Get battle history
   *
   * @returns Array of all recorded battle results
   */
  getBattleHistory(): BattleResult[] {
    return [...this.battleHistory];
  }

  /**
   * Get battle statistics summary
   *
   * @returns Current battle statistics summary
   */
  getBattleStatsSummary(): BattleStatsSummary {
    return { ...this.battleStatsSummary };
  }

  /**
   * Get recent battle results
   *
   * @param count Number of recent battles to return
   * @returns Array of recent battle results
   */
  getRecentBattles(count: number = 10): BattleResult[] {
    return this.battleHistory.slice(-count);
  }

  /**
   * Clear battle history and reset statistics
   */
  clearBattleHistory(): void {
    this.battleHistory = [];
    this.battleStatsSummary = this.createInitialStatsSummary();

    this.eventEmitter?.emit('battle-history-cleared');
  }

  /**
   * Get experience configuration
   *
   * @returns Current experience configuration
   */
  getExperienceConfig(): ExperienceConfig {
    return { ...this.experienceConfig };
  }

  /**
   * Update experience configuration
   *
   * @param newConfig New experience configuration
   */
  updateExperienceConfig(newConfig: Partial<ExperienceConfig>): void {
    this.experienceConfig = { ...this.experienceConfig, ...newConfig };

    this.eventEmitter?.emit('experience-config-updated', {
      config: this.experienceConfig,
    });
  }

  /**
   * Get battle configuration
   *
   * @returns Current battle configuration
   */
  getBattleConfig(): BattleStateConfig {
    return { ...this.battleConfig };
  }

  /**
   * Update battle configuration
   *
   * @param newConfig New battle configuration
   */
  updateBattleConfig(newConfig: Partial<BattleStateConfig>): void {
    this.battleConfig = { ...this.battleConfig, ...newConfig };

    this.eventEmitter?.emit('battle-config-updated', {
      config: this.battleConfig,
    });
  }

  /**
   * Reset all battle state and statistics
   */
  reset(): void {
    this.battleHistory = [];
    this.battleStatsSummary = this.createInitialStatsSummary();

    this.eventEmitter?.emit('battle-state-manager-reset');
  }

  /**
   * Destroy and cleanup resources
   */
  destroy(): void {
    this.battleHistory = [];
    this.battleStatsSummary = this.createInitialStatsSummary();

    this.eventEmitter?.emit('battle-state-manager-destroyed');
  }
}
