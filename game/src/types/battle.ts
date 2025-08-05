/**
 * Battle system type definitions for the SRPG
 * Contains all interfaces, enums, and types related to combat mechanics
 */

import { Unit, Position } from './gameplay';

/**
 * Element types for attribute system
 */
export enum Element {
    NONE = 'none',
    FIRE = 'fire',
    WATER = 'water',
    EARTH = 'earth',
    AIR = 'air',
    LIGHT = 'light',
    DARK = 'dark'
}

/**
 * Weapon types defining different attack patterns and ranges
 */
export enum WeaponType {
    SWORD = 'sword',
    BOW = 'bow',
    STAFF = 'staff',
    SPEAR = 'spear',
    AXE = 'axe',
    DAGGER = 'dagger'
}

/**
 * Damage types for different kinds of attacks
 */
export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    CRITICAL = 'critical',
    HEALING = 'healing'
}

/**
 * Battle error types for error handling
 */
export enum BattleError {
    INVALID_ATTACKER = 'INVALID_ATTACKER',
    INVALID_TARGET = 'INVALID_TARGET',
    OUT_OF_RANGE = 'OUT_OF_RANGE',
    ALREADY_ACTED = 'ALREADY_ACTED',
    INSUFFICIENT_MP = 'INSUFFICIENT_MP',
    WEAPON_BROKEN = 'WEAPON_BROKEN',
    TARGET_UNREACHABLE = 'TARGET_UNREACHABLE',
    NO_WEAPON_EQUIPPED = 'NO_WEAPON_EQUIPPED',
    INVALID_WEAPON_TYPE = 'INVALID_WEAPON_TYPE',
    BATTLE_SYSTEM_ERROR = 'BATTLE_SYSTEM_ERROR',
    ANIMATION_FAILED = 'ANIMATION_FAILED',
    DAMAGE_CALCULATION_ERROR = 'DAMAGE_CALCULATION_ERROR'
}

/**
 * Range pattern types for different attack patterns
 */
export interface RangePattern {
    type: 'single' | 'line' | 'area' | 'cross' | 'custom';
    range: number;
    pattern: Position[];
    areaOfEffect?: number; // For area attacks
}

/**
 * Weapon effect for special abilities
 */
export interface WeaponEffect {
    type: 'poison' | 'burn' | 'freeze' | 'stun' | 'heal' | 'buff' | 'debuff';
    chance: number; // Probability of effect triggering (0-100)
    duration: number; // Duration in turns
    power: number; // Effect strength
    description: string;
}

/**
 * Weapon data structure
 */
export interface Weapon {
    id: string;
    name: string;
    type: WeaponType;
    attackPower: number;
    range: number;
    rangePattern: RangePattern;
    element: Element;
    criticalRate: number; // Critical hit chance (0-100)
    accuracy: number; // Hit chance (0-100)
    specialEffects: WeaponEffect[];
    durability?: number; // Optional durability system
    maxDurability?: number;
    description: string;
}

/**
 * Damage modifier for various effects
 */
export interface DamageModifier {
    type: 'elemental' | 'critical' | 'terrain' | 'status' | 'weapon' | 'skill';
    multiplier: number;
    description: string;
    source?: string; // Source of the modifier (weapon name, skill name, etc.)
}

/**
 * Critical hit calculation result
 */
export interface CriticalResult {
    isCritical: boolean;
    multiplier: number;
    chance: number;
    roll: number; // The random roll that determined the result
}

/**
 * Evasion calculation result
 */
export interface EvasionResult {
    isEvaded: boolean;
    chance: number;
    roll: number; // The random roll that determined the result
}

/**
 * Complete battle result containing all combat information
 */
export interface BattleResult {
    attacker: Unit;
    target: Unit;
    weapon: Weapon;
    baseDamage: number;
    finalDamage: number;
    modifiers: DamageModifier[];
    isCritical: boolean;
    isEvaded: boolean;
    experienceGained: number;
    targetDefeated: boolean;
    effectsApplied: WeaponEffect[];
    timestamp: number; // When the battle occurred
}

/**
 * Battle context for error handling and state management
 */
export interface BattleContext {
    attacker: Unit;
    target?: Unit;
    weapon?: Weapon;
    position?: Position;
    phase: 'range_calculation' | 'target_selection' | 'damage_calculation' | 'animation' | 'result';
    errorDetails?: string;
}

/**
 * Battle error details for comprehensive error reporting
 */
export interface BattleErrorDetails {
    error: BattleError;
    message: string;
    context: BattleContext;
    timestamp: number;
    recoverable: boolean; // Whether the error can be recovered from
    suggestedAction?: string; // Suggested action for recovery
}

/**
 * Attack range calculation result
 */
export interface AttackRangeResult {
    validPositions: Position[];
    blockedPositions: Position[];
    weapon: Weapon;
    attacker: Unit;
}

/**
 * Target selection result
 */
export interface TargetSelectionResult {
    validTargets: Unit[];
    selectedTarget?: Unit;
    areaTargets: Unit[]; // For area of effect attacks
    attackRange: Position[];
}

/**
 * Battle animation configuration
 */
export interface BattleAnimationConfig {
    attackAnimationDuration: number; // milliseconds
    damageEffectDuration: number; // milliseconds
    hpBarAnimationDuration: number; // milliseconds
    defeatAnimationDuration: number; // milliseconds
    effectDisplayDuration: number; // milliseconds
    enableParticleEffects: boolean;
    enableScreenShake: boolean;
    animationSpeed: number; // multiplier for all animations
}

/**
 * Battle statistics for tracking and analysis
 */
export interface BattleStatistics {
    totalDamageDealt: number;
    totalDamageReceived: number;
    criticalHitsLanded: number;
    criticalHitsReceived: number;
    attacksLanded: number;
    attacksMissed: number;
    attacksEvaded: number;
    unitsDefeated: number;
    experienceGained: number;
    battlesParticipated: number;
}

/**
 * Status effect for ongoing battle effects
 */
export interface StatusEffect {
    id: string;
    type: WeaponEffect['type'];
    name: string;
    description: string;
    duration: number; // Remaining turns
    power: number;
    source: string; // What caused this effect
    stackable: boolean; // Whether multiple instances can exist
}

/**
 * Extended unit interface with battle-specific properties
 */
export interface BattleUnit extends Unit {
    weapon?: Weapon;
    statusEffects: StatusEffect[];
    battleStats: BattleStatistics;
    canAttack: boolean;
    attacksRemaining: number; // For units that can attack multiple times
}

/**
 * Type guards and validation functions for battle system
 */
export class BattleTypeValidators {
    /**
     * Validates weapon structure
     */
    static isValidWeapon(weapon: any): weapon is Weapon {
        return (
            typeof weapon === 'object' &&
            weapon !== null &&
            typeof weapon.id === 'string' &&
            typeof weapon.name === 'string' &&
            Object.values(WeaponType).includes(weapon.type) &&
            typeof weapon.attackPower === 'number' &&
            typeof weapon.range === 'number' &&
            typeof weapon.criticalRate === 'number' &&
            typeof weapon.accuracy === 'number' &&
            Object.values(Element).includes(weapon.element) &&
            Array.isArray(weapon.specialEffects) &&
            weapon.attackPower >= 0 &&
            weapon.range > 0 &&
            weapon.criticalRate >= 0 &&
            weapon.criticalRate <= 100 &&
            weapon.accuracy >= 0 &&
            weapon.accuracy <= 100 &&
            weapon.specialEffects.every((effect: any) => this.isValidWeaponEffect(effect))
        );
    }

    /**
     * Validates weapon effect structure
     */
    static isValidWeaponEffect(effect: any): effect is WeaponEffect {
        const validTypes = ['poison', 'burn', 'freeze', 'stun', 'heal', 'buff', 'debuff'];
        return (
            typeof effect === 'object' &&
            effect !== null &&
            validTypes.includes(effect.type) &&
            typeof effect.chance === 'number' &&
            typeof effect.duration === 'number' &&
            typeof effect.power === 'number' &&
            typeof effect.description === 'string' &&
            effect.chance >= 0 &&
            effect.chance <= 100 &&
            effect.duration > 0 &&
            effect.power >= 0
        );
    }

    /**
     * Validates range pattern structure
     */
    static isValidRangePattern(pattern: any): pattern is RangePattern {
        const validTypes = ['single', 'line', 'area', 'cross', 'custom'];
        return (
            typeof pattern === 'object' &&
            pattern !== null &&
            validTypes.includes(pattern.type) &&
            typeof pattern.range === 'number' &&
            Array.isArray(pattern.pattern) &&
            pattern.range > 0 &&
            pattern.pattern.length > 0 && // Pattern must have at least one position
            pattern.pattern.every((pos: any) =>
                typeof pos === 'object' &&
                pos !== null &&
                typeof pos.x === 'number' &&
                typeof pos.y === 'number'
            ) &&
            (pattern.areaOfEffect === undefined ||
                (typeof pattern.areaOfEffect === 'number' && pattern.areaOfEffect >= 0))
        );
    }

    /**
     * Validates damage modifier structure
     */
    static isValidDamageModifier(modifier: any): modifier is DamageModifier {
        const validTypes = ['elemental', 'critical', 'terrain', 'status', 'weapon', 'skill'];
        return (
            typeof modifier === 'object' &&
            modifier !== null &&
            validTypes.includes(modifier.type) &&
            typeof modifier.multiplier === 'number' &&
            typeof modifier.description === 'string' &&
            modifier.multiplier >= 0 &&
            (modifier.source === undefined || typeof modifier.source === 'string')
        );
    }

    /**
     * Validates battle result structure
     */
    static isValidBattleResult(result: any): result is BattleResult {
        return (
            typeof result === 'object' &&
            result !== null &&
            typeof result.attacker === 'object' &&
            typeof result.target === 'object' &&
            this.isValidWeapon(result.weapon) &&
            typeof result.baseDamage === 'number' &&
            typeof result.finalDamage === 'number' &&
            Array.isArray(result.modifiers) &&
            typeof result.isCritical === 'boolean' &&
            typeof result.isEvaded === 'boolean' &&
            typeof result.experienceGained === 'number' &&
            typeof result.targetDefeated === 'boolean' &&
            Array.isArray(result.effectsApplied) &&
            typeof result.timestamp === 'number' &&
            result.baseDamage >= 0 &&
            result.finalDamage >= 0 &&
            result.experienceGained >= 0 &&
            result.modifiers.every((mod: any) => this.isValidDamageModifier(mod)) &&
            result.effectsApplied.every((effect: any) => this.isValidWeaponEffect(effect))
        );
    }

    /**
     * Validates status effect structure
     */
    static isValidStatusEffect(effect: any): effect is StatusEffect {
        const validTypes = ['poison', 'burn', 'freeze', 'stun', 'heal', 'buff', 'debuff'];
        return (
            typeof effect === 'object' &&
            effect !== null &&
            typeof effect.id === 'string' &&
            validTypes.includes(effect.type) &&
            typeof effect.name === 'string' &&
            typeof effect.description === 'string' &&
            typeof effect.duration === 'number' &&
            typeof effect.power === 'number' &&
            typeof effect.source === 'string' &&
            typeof effect.stackable === 'boolean' &&
            effect.duration >= 0 &&
            effect.power >= 0
        );
    }

    /**
     * Validates battle unit structure
     */
    static isValidBattleUnit(unit: any): unit is BattleUnit {
        return (
            typeof unit === 'object' &&
            unit !== null &&
            typeof unit.id === 'string' &&
            typeof unit.name === 'string' &&
            (unit.weapon === undefined || this.isValidWeapon(unit.weapon)) &&
            Array.isArray(unit.statusEffects) &&
            typeof unit.battleStats === 'object' &&
            typeof unit.canAttack === 'boolean' &&
            typeof unit.attacksRemaining === 'number' &&
            unit.statusEffects.every((effect: any) => this.isValidStatusEffect(effect)) &&
            unit.attacksRemaining >= 0
        );
    }
}

/**
 * Utility functions for battle calculations
 */
export class BattleUtils {
    /**
     * Calculate elemental effectiveness multiplier
     */
    static getElementalMultiplier(attackElement: Element, targetElement: Element): number {
        // Define elemental effectiveness chart
        const effectiveness: Record<Element, Record<Element, number>> = {
            [Element.NONE]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 1.0, [Element.WATER]: 1.0,
                [Element.EARTH]: 1.0, [Element.AIR]: 1.0, [Element.LIGHT]: 1.0, [Element.DARK]: 1.0
            },
            [Element.FIRE]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 0.5, [Element.WATER]: 0.5,
                [Element.EARTH]: 1.5, [Element.AIR]: 1.5, [Element.LIGHT]: 1.0, [Element.DARK]: 1.0
            },
            [Element.WATER]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 1.5, [Element.WATER]: 0.5,
                [Element.EARTH]: 0.5, [Element.AIR]: 1.0, [Element.LIGHT]: 1.0, [Element.DARK]: 1.0
            },
            [Element.EARTH]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 0.5, [Element.WATER]: 1.5,
                [Element.EARTH]: 0.5, [Element.AIR]: 0.5, [Element.LIGHT]: 1.0, [Element.DARK]: 1.0
            },
            [Element.AIR]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 0.5, [Element.WATER]: 1.0,
                [Element.EARTH]: 1.5, [Element.AIR]: 0.5, [Element.LIGHT]: 1.0, [Element.DARK]: 1.0
            },
            [Element.LIGHT]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 1.0, [Element.WATER]: 1.0,
                [Element.EARTH]: 1.0, [Element.AIR]: 1.0, [Element.LIGHT]: 0.5, [Element.DARK]: 1.5
            },
            [Element.DARK]: {
                [Element.NONE]: 1.0, [Element.FIRE]: 1.0, [Element.WATER]: 1.0,
                [Element.EARTH]: 1.0, [Element.AIR]: 1.0, [Element.LIGHT]: 1.5, [Element.DARK]: 0.5
            }
        };

        return effectiveness[attackElement]?.[targetElement] ?? 1.0;
    }

    /**
     * Generate a random number between min and max (inclusive)
     */
    static randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Calculate critical hit chance based on attacker and target stats
     */
    static calculateCriticalChance(attacker: Unit, weapon: Weapon, target: Unit): number {
        // Base critical rate from weapon
        let criticalChance = weapon.criticalRate;

        // Add speed difference bonus (faster units have higher crit chance)
        const speedDifference = attacker.stats.speed - target.stats.speed;
        criticalChance += Math.max(0, speedDifference * 0.5);

        // Cap at 95% to prevent guaranteed crits
        return Math.min(95, Math.max(5, criticalChance));
    }

    /**
     * Calculate evasion chance based on target stats
     */
    static calculateEvasionChance(attacker: Unit, target: Unit, weapon: Weapon): number {
        // Base hit chance from weapon accuracy
        const baseHitChance = weapon.accuracy;

        // Speed difference affects evasion (faster targets are harder to hit)
        const speedDifference = target.stats.speed - attacker.stats.speed;
        const evasionBonus = Math.max(0, speedDifference * 0.3);

        // Calculate final evasion chance
        const evasionChance = 100 - baseHitChance + evasionBonus;

        // Cap evasion between 5% and 95%
        return Math.min(95, Math.max(5, evasionChance));
    }

    /**
     * Create a deep copy of a battle result
     */
    static cloneBattleResult(result: BattleResult): BattleResult {
        return {
            ...result,
            attacker: { ...result.attacker },
            target: { ...result.target },
            weapon: { ...result.weapon },
            modifiers: result.modifiers.map(mod => ({ ...mod })),
            effectsApplied: result.effectsApplied.map(effect => ({ ...effect }))
        };
    }
}