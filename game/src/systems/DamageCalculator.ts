/**
 * DamageCalculator - Comprehensive damage calculation system for battle mechanics
 * Handles base damage calculation, elemental modifiers, critical hits, evasion, and final damage computation
 */

import { Unit } from '../types/gameplay';
import {
  Weapon,
  Element,
  DamageModifier,
  CriticalResult,
  EvasionResult,
  BattleError,
  BattleUtils,
} from '../types/battle';
import { EquipmentManager } from './EquipmentManager';

/**
 * Configuration for damage calculations
 */
export interface DamageCalculationConfig {
  baseDamageFormula: 'linear' | 'square_root' | 'logarithmic'; // Formula for base damage calculation
  criticalMultiplier: number; // Default critical hit multiplier
  minimumDamage: number; // Minimum damage guaranteed per attack
  maximumDamage: number; // Maximum damage cap
  enableVariance: boolean; // Whether to add random variance to damage
  variancePercentage: number; // Percentage of variance (0-100)
  defenseEffectiveness: number; // How much defense reduces damage (0-1)
  levelDifferenceBonus: number; // Bonus per level difference
}

/**
 * Damage calculation context for detailed calculations
 */
export interface DamageCalculationContext {
  attacker: Unit;
  target: Unit;
  weapon: Weapon;
  baseDamage: number;
  modifiers: DamageModifier[];
  isCritical: boolean;
  isEvaded: boolean;
  finalDamage: number;
  calculationSteps: string[]; // Step-by-step calculation log
}

/**
 * DamageCalculator class for comprehensive damage calculations
 * Provides all damage-related calculations for the battle system
 */
export class DamageCalculator {
  private config: DamageCalculationConfig;
  private equipmentManager: EquipmentManager;

  /**
   * Creates a new DamageCalculator instance
   * @param config - Configuration for damage calculations
   */
  constructor(config?: Partial<DamageCalculationConfig>) {
    this.config = {
      baseDamageFormula: 'linear',
      criticalMultiplier: 1.5,
      minimumDamage: 1,
      maximumDamage: 9999,
      enableVariance: true,
      variancePercentage: 10,
      defenseEffectiveness: 0.5,
      levelDifferenceBonus: 0.05,
      ...config,
    };
    this.equipmentManager = new EquipmentManager();
  }

  /**
   * Calculate base damage based on attacker's attack power and target's defense
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   * @returns Base damage value before modifiers
   */
  public calculateBaseDamage(attacker: Unit, target: Unit, weapon: Weapon): number {
    // Validate inputs
    this.validateCalculationInputs(attacker, target, weapon);

    // Get effective stats with equipment bonuses
    const attackerStats = this.equipmentManager.getEffectiveStats(attacker);
    const targetStats = this.equipmentManager.getEffectiveStats(target);

    // Get effective attack power (weapon + unit stats + equipment bonuses)
    const effectiveAttack = weapon.attackPower + attackerStats.attack;

    // Get effective defense (unit stats + equipment bonuses)
    const effectiveDefense = targetStats.defense;

    // Calculate base damage using configured formula
    let baseDamage: number;

    switch (this.config.baseDamageFormula) {
      case 'linear':
        baseDamage = effectiveAttack - effectiveDefense * this.config.defenseEffectiveness;
        break;

      case 'square_root':
        // Square root formula for more balanced scaling
        baseDamage = Math.sqrt(
          effectiveAttack * effectiveAttack -
            effectiveDefense * effectiveDefense * this.config.defenseEffectiveness
        );
        break;

      case 'logarithmic':
        // Logarithmic formula for diminishing returns
        const attackLog = Math.log(effectiveAttack + 1);
        const defenseLog = Math.log(effectiveDefense + 1);
        baseDamage = attackLog * 10 - defenseLog * 5 * this.config.defenseEffectiveness;
        break;

      default:
        baseDamage = effectiveAttack - effectiveDefense * this.config.defenseEffectiveness;
    }

    // Apply level difference bonus
    const levelDifference = this.calculateLevelDifference(attacker, target);
    const levelBonus = levelDifference * this.config.levelDifferenceBonus * effectiveAttack;
    baseDamage += levelBonus;

    // Add variance if enabled
    if (this.config.enableVariance) {
      const variance = this.calculateVariance(baseDamage);
      baseDamage += variance;
    }

    // Ensure minimum damage
    baseDamage = Math.max(this.config.minimumDamage, baseDamage);

    // Apply maximum damage cap
    baseDamage = Math.min(this.config.maximumDamage, baseDamage);

    return Math.floor(baseDamage);
  }

  /**
   * Apply elemental modifier based on attack and target elements
   * @param damage - Base damage to modify
   * @param attackElement - Element of the attack
   * @param targetElement - Element of the target
   * @returns Modified damage with elemental effectiveness
   */
  public applyElementalModifier(
    damage: number,
    attackElement: Element,
    targetElement: Element
  ): number {
    // Get elemental multiplier
    const multiplier = BattleUtils.getElementalMultiplier(attackElement, targetElement);

    // Apply multiplier
    const modifiedDamage = damage * multiplier;

    return Math.floor(modifiedDamage);
  }

  /**
   * Calculate critical hit chance and determine if attack is critical
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   * @returns Critical hit calculation result
   */
  public calculateCritical(attacker: Unit, target: Unit, weapon: Weapon): CriticalResult {
    // Get effective stats with equipment bonuses
    const attackerStats = this.equipmentManager.getEffectiveStats(attacker);
    const targetStats = this.equipmentManager.getEffectiveStats(target);

    // Create temporary units with effective stats for calculation
    const tempAttacker = { ...attacker, stats: attackerStats };
    const tempTarget = { ...target, stats: targetStats };

    // Calculate critical chance using utility function
    const criticalChance = BattleUtils.calculateCriticalChance(tempAttacker, weapon, tempTarget);

    // Roll for critical hit
    const roll = BattleUtils.randomInt(1, 100);
    const isCritical = roll <= criticalChance;

    // Determine critical multiplier
    let multiplier = 1.0;
    if (isCritical) {
      // Use weapon-specific multiplier if available, otherwise use config default
      multiplier = this.config.criticalMultiplier;

      // Add small bonus based on speed difference for critical hits
      const speedDifference = attackerStats.speed - targetStats.speed;
      if (speedDifference > 0) {
        multiplier += speedDifference * 0.01; // 1% per speed point difference
      }
    }

    return {
      isCritical,
      multiplier,
      chance: criticalChance,
      roll,
    };
  }

  /**
   * Calculate evasion chance and determine if attack is evaded
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   * @returns Evasion calculation result
   */
  public calculateEvasion(attacker: Unit, target: Unit, weapon: Weapon): EvasionResult {
    // Get effective stats with equipment bonuses
    const attackerStats = this.equipmentManager.getEffectiveStats(attacker);
    const targetStats = this.equipmentManager.getEffectiveStats(target);

    // Create temporary units with effective stats for calculation
    const tempAttacker = { ...attacker, stats: attackerStats };
    const tempTarget = { ...target, stats: targetStats };

    // Calculate evasion chance using utility function
    const evasionChance = BattleUtils.calculateEvasionChance(tempAttacker, tempTarget, weapon);

    // Roll for evasion
    const roll = BattleUtils.randomInt(1, 100);
    const isEvaded = roll <= evasionChance;

    return {
      isEvaded,
      chance: evasionChance,
      roll,
    };
  }

  /**
   * Calculate final damage with all modifiers applied
   * @param baseDamage - Base damage before modifiers
   * @param modifiers - Array of damage modifiers to apply
   * @returns Final damage value
   */
  public calculateFinalDamage(baseDamage: number, modifiers: DamageModifier[]): number {
    let finalDamage = baseDamage;

    // Apply each modifier
    for (const modifier of modifiers) {
      switch (modifier.type) {
        case 'critical':
        case 'elemental':
        case 'weapon':
        case 'skill':
          // Multiplicative modifiers
          finalDamage *= modifier.multiplier;
          break;

        case 'terrain':
        case 'status':
          // Additive modifiers (can be negative)
          if (modifier.multiplier >= 1) {
            finalDamage *= modifier.multiplier;
          } else {
            // Treat as additive for values less than 1
            finalDamage += baseDamage * (modifier.multiplier - 1);
          }
          break;

        default:
          // Default to multiplicative
          finalDamage *= modifier.multiplier;
      }
    }

    // Ensure minimum damage
    finalDamage = Math.max(this.config.minimumDamage, finalDamage);

    // Apply maximum damage cap
    finalDamage = Math.min(this.config.maximumDamage, finalDamage);

    return Math.floor(finalDamage);
  }

  /**
   * Perform complete damage calculation with all steps
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   * @param additionalModifiers - Additional modifiers to apply (optional)
   * @returns Complete damage calculation context
   */
  public performCompleteCalculation(
    attacker: Unit,
    target: Unit,
    weapon: Weapon,
    additionalModifiers: DamageModifier[] = []
  ): DamageCalculationContext {
    const calculationSteps: string[] = [];
    const modifiers: DamageModifier[] = [...additionalModifiers];

    // Step 1: Calculate base damage
    const baseDamage = this.calculateBaseDamage(attacker, target, weapon);
    calculationSteps.push(
      `Base damage: ${baseDamage} (Attack: ${weapon.attackPower + attacker.stats.attack}, Defense: ${target.stats.defense})`
    );

    // Step 2: Check for evasion
    const evasionResult = this.calculateEvasion(attacker, target, weapon);
    calculationSteps.push(
      `Evasion check: ${evasionResult.isEvaded ? 'EVADED' : 'HIT'} (${evasionResult.chance}% chance, rolled ${evasionResult.roll})`
    );

    // If evaded, return zero damage
    if (evasionResult.isEvaded) {
      return {
        attacker,
        target,
        weapon,
        baseDamage,
        modifiers,
        isCritical: false,
        isEvaded: true,
        finalDamage: 0,
        calculationSteps,
      };
    }

    // Step 3: Check for critical hit
    const criticalResult = this.calculateCritical(attacker, target, weapon);
    calculationSteps.push(
      `Critical check: ${criticalResult.isCritical ? 'CRITICAL' : 'NORMAL'} (${criticalResult.chance}% chance, rolled ${criticalResult.roll})`
    );

    // Add critical modifier if applicable
    if (criticalResult.isCritical) {
      modifiers.push({
        type: 'critical',
        multiplier: criticalResult.multiplier,
        description: `Critical hit (${criticalResult.multiplier}x)`,
        source: 'critical_calculation',
      });
    }

    // Step 4: Apply elemental modifier
    const elementalDamage = this.applyElementalModifier(baseDamage, weapon.element, Element.NONE); // Assuming target has no element for now
    if (elementalDamage !== baseDamage) {
      const elementalMultiplier = elementalDamage / baseDamage;
      modifiers.push({
        type: 'elemental',
        multiplier: elementalMultiplier,
        description: `Elemental effectiveness (${weapon.element} vs target)`,
        source: 'elemental_calculation',
      });
      calculationSteps.push(
        `Elemental modifier: ${elementalMultiplier}x (${weapon.element} element)`
      );
    }

    // Step 5: Apply equipment modifiers
    const equipmentModifiers = this.equipmentManager.getEquipmentDamageModifiers(
      attacker,
      target,
      weapon.element
    );
    modifiers.push(...equipmentModifiers);

    equipmentModifiers.forEach(modifier => {
      calculationSteps.push(
        `Equipment modifier: ${modifier.description} (${modifier.multiplier}x)`
      );
    });

    // Step 6: Calculate final damage
    const finalDamage = this.calculateFinalDamage(baseDamage, modifiers);
    calculationSteps.push(`Final damage: ${finalDamage} (after all modifiers)`);

    return {
      attacker,
      target,
      weapon,
      baseDamage,
      modifiers,
      isCritical: criticalResult.isCritical,
      isEvaded: false,
      finalDamage,
      calculationSteps,
    };
  }

  /**
   * Calculate damage variance for more dynamic combat
   * @param baseDamage - Base damage to add variance to
   * @returns Variance amount to add/subtract
   */
  private calculateVariance(baseDamage: number): number {
    if (!this.config.enableVariance || this.config.variancePercentage <= 0) {
      return 0;
    }

    const maxVariance = baseDamage * (this.config.variancePercentage / 100);
    const variance = (Math.random() - 0.5) * 2 * maxVariance; // -maxVariance to +maxVariance

    return variance;
  }

  /**
   * Calculate level difference between attacker and target
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @returns Level difference (positive if attacker is higher level)
   */
  private calculateLevelDifference(attacker: Unit, target: Unit): number {
    // Get effective stats with equipment bonuses
    const attackerStats = this.equipmentManager.getEffectiveStats(attacker);
    const targetStats = this.equipmentManager.getEffectiveStats(target);

    // For now, use speed as a proxy for level since we don't have explicit levels
    // In a full implementation, this would use actual character levels
    return attackerStats.speed - targetStats.speed;
  }

  /**
   * Validate inputs for damage calculation
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   */
  private validateCalculationInputs(attacker: Unit, target: Unit, weapon: Weapon): void {
    if (!attacker) {
      throw new Error(`${BattleError.INVALID_ATTACKER}: Attacker is null or undefined`);
    }

    if (!target) {
      throw new Error(`${BattleError.INVALID_TARGET}: Target is null or undefined`);
    }

    if (!weapon) {
      throw new Error(`${BattleError.NO_WEAPON_EQUIPPED}: Weapon is null or undefined`);
    }

    if (attacker.currentHP <= 0) {
      throw new Error(`${BattleError.INVALID_ATTACKER}: Attacker is defeated`);
    }

    if (target.currentHP <= 0) {
      throw new Error(`${BattleError.INVALID_TARGET}: Target is already defeated`);
    }

    if (weapon.attackPower < 0) {
      throw new Error(`${BattleError.INVALID_WEAPON_TYPE}: Weapon has negative attack power`);
    }
  }

  /**
   * Create a damage modifier for specific effects
   * @param type - Type of modifier
   * @param multiplier - Damage multiplier
   * @param description - Description of the modifier
   * @param source - Source of the modifier (optional)
   * @returns Damage modifier object
   */
  public createDamageModifier(
    type: DamageModifier['type'],
    multiplier: number,
    description: string,
    source?: string
  ): DamageModifier {
    return {
      type,
      multiplier,
      description,
      source,
    };
  }

  /**
   * Calculate damage reduction from defense
   * @param defense - Defense value
   * @param attackPower - Attack power value
   * @returns Damage reduction percentage (0-1)
   */
  public calculateDefenseReduction(defense: number, attackPower: number): number {
    // Use a formula that prevents defense from completely negating damage
    const reduction = defense / (defense + attackPower + 100);
    return Math.min(0.9, reduction); // Cap at 90% reduction
  }

  /**
   * Calculate healing amount (for healing weapons/skills)
   * @param healer - The healing unit
   * @param target - The target unit
   * @param weapon - The healing weapon/item
   * @returns Healing amount
   */
  public calculateHealing(healer: Unit, target: Unit, weapon: Weapon): number {
    // Get effective stats with equipment bonuses
    const healerStats = this.equipmentManager.getEffectiveStats(healer);
    const targetStats = this.equipmentManager.getEffectiveStats(target);

    // Base healing from weapon power and healer's attack
    const baseHealing = weapon.attackPower + healerStats.attack * 0.5;

    // Add variance if enabled
    let finalHealing = baseHealing;
    if (this.config.enableVariance) {
      const variance = this.calculateVariance(baseHealing);
      finalHealing += variance;
    }

    // Ensure positive healing
    finalHealing = Math.max(1, finalHealing);

    // Cap healing to not exceed target's max HP
    const maxHealingNeeded = targetStats.maxHP - target.currentHP;
    finalHealing = Math.min(finalHealing, maxHealingNeeded);

    return Math.floor(finalHealing);
  }

  /**
   * Get damage preview without performing actual calculation
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param weapon - The weapon being used
   * @returns Estimated damage range
   */
  public getDamagePreview(
    attacker: Unit,
    target: Unit,
    weapon: Weapon
  ): { min: number; max: number; average: number } {
    // Temporarily disable variance for consistent preview
    const originalVariance = this.config.enableVariance;
    this.config.enableVariance = false;

    try {
      // Calculate base damage
      const baseDamage = this.calculateBaseDamage(attacker, target, weapon);

      // Calculate critical multiplier
      const criticalResult = this.calculateCritical(attacker, target, weapon);

      // Apply equipment modifiers for more accurate preview
      const equipmentModifiers = this.equipmentManager.getEquipmentDamageModifiers(
        attacker,
        target,
        weapon.element
      );
      let equipmentMultiplier = 1.0;
      equipmentModifiers.forEach(modifier => {
        equipmentMultiplier *= modifier.multiplier;
      });

      // Estimate damage range
      const adjustedBaseDamage = baseDamage * equipmentMultiplier;
      const minDamage = Math.max(this.config.minimumDamage, Math.floor(adjustedBaseDamage * 0.9));
      const maxDamage = Math.floor(adjustedBaseDamage * criticalResult.multiplier);
      const averageDamage = Math.floor((minDamage + maxDamage) / 2);

      return {
        min: minDamage,
        max: maxDamage,
        average: averageDamage,
      };
    } finally {
      // Restore original variance setting
      this.config.enableVariance = originalVariance;
    }
  }

  /**
   * Update configuration
   * @param config - New configuration options
   */
  public updateConfig(config: Partial<DamageCalculationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): DamageCalculationConfig {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  public resetConfig(): void {
    this.config = {
      baseDamageFormula: 'linear',
      criticalMultiplier: 1.5,
      minimumDamage: 1,
      maximumDamage: 9999,
      enableVariance: true,
      variancePercentage: 10,
      defenseEffectiveness: 0.5,
      levelDifferenceBonus: 0.05,
    };
  }

  /**
   * Get detailed calculation breakdown for debugging
   * @param context - Damage calculation context
   * @returns Formatted calculation breakdown
   */
  public getCalculationBreakdown(context: DamageCalculationContext): string {
    const lines: string[] = [];

    lines.push('=== Damage Calculation Breakdown ===');
    lines.push(`Attacker: ${context.attacker.name} (ATK: ${context.attacker.stats.attack})`);
    lines.push(`Target: ${context.target.name} (DEF: ${context.target.stats.defense})`);
    lines.push(`Weapon: ${context.weapon.name} (Power: ${context.weapon.attackPower})`);
    lines.push('');

    lines.push('Calculation Steps:');
    context.calculationSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });

    lines.push('');
    lines.push('Applied Modifiers:');
    context.modifiers.forEach(modifier => {
      lines.push(`- ${modifier.description}: ${modifier.multiplier}x`);
    });

    lines.push('');
    lines.push(`Final Result: ${context.finalDamage} damage`);
    lines.push(`Critical: ${context.isCritical ? 'Yes' : 'No'}`);
    lines.push(`Evaded: ${context.isEvaded ? 'Yes' : 'No'}`);

    return lines.join('\n');
  }
}
