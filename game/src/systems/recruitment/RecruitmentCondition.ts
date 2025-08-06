/**
 * Base class and concrete implementations for recruitment conditions
 * Defines the logic for determining when an enemy character can be recruited
 */

import {
    RecruitmentCondition,
    RecruitmentConditionType,
    RecruitmentContext,
    RecruitmentTypeValidators
} from '../../types/recruitment';
import { Unit } from '../../types/gameplay';

/**
 * Abstract base class for all recruitment conditions
 * Provides common functionality and enforces the interface contract
 */
export abstract class BaseRecruitmentCondition implements RecruitmentCondition {
    public readonly id: string;
    public readonly type: RecruitmentConditionType;
    public readonly description: string;
    public readonly parameters: Record<string, any>;

    constructor(
        id: string,
        type: RecruitmentConditionType,
        description: string,
        parameters: Record<string, any> = {}
    ) {
        this.id = id;
        this.type = type;
        this.description = description;

        // Validate parameters before assignment
        if (parameters === null || parameters === undefined || typeof parameters !== 'object') {
            throw new Error(`Invalid parameters for condition ${id}: parameters must be an object`);
        }

        this.parameters = { ...parameters };

        // Validate parameters during construction
        this.validateParameters();
    }

    /**
     * Abstract method that must be implemented by concrete condition classes
     * @param context The recruitment context to evaluate
     * @returns true if the condition is satisfied
     */
    abstract checkCondition(context: RecruitmentContext): boolean;

    /**
     * Validate the parameters for this condition type
     * Should be overridden by concrete classes to provide specific validation
     */
    protected validateParameters(): void {
        if (this.parameters === null || this.parameters === undefined || typeof this.parameters !== 'object') {
            throw new Error(`Invalid parameters for condition ${this.id}: parameters must be an object`);
        }
    }

    /**
     * Get a human-readable description of the current condition state
     * @param context Optional context for dynamic descriptions
     * @returns Formatted description string
     */
    public getFormattedDescription(context?: RecruitmentContext): string {
        return this.description;
    }

    /**
     * Check if the condition is properly configured
     * @returns true if the condition is valid
     */
    public isValid(): boolean {
        try {
            this.validateParameters();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a deep copy of this condition
     * @returns A new instance with the same configuration
     */
    public clone(): RecruitmentCondition {
        const ConditionClass = this.constructor as new (
            id: string,
            type: RecruitmentConditionType,
            description: string,
            parameters: Record<string, any>
        ) => RecruitmentCondition;

        return new ConditionClass(this.id, this.type, this.description, { ...this.parameters });
    }
}

/**
 * Condition that requires a specific character to perform the attack
 * Used when only certain characters can recruit specific enemies
 */
export class SpecificAttackerCondition extends BaseRecruitmentCondition {
    constructor(id: string, description: string, attackerId: string) {
        super(id, RecruitmentConditionType.SPECIFIC_ATTACKER, description, { attackerId });
    }

    protected validateParameters(): void {
        super.validateParameters();

        if (!this.parameters.attackerId || typeof this.parameters.attackerId !== 'string') {
            throw new Error(`SpecificAttackerCondition ${this.id}: attackerId must be a non-empty string`);
        }
    }

    checkCondition(context: RecruitmentContext): boolean {
        if (!RecruitmentTypeValidators.isValidRecruitmentContext(context)) {
            return false;
        }

        return context.attacker.id === this.parameters.attackerId;
    }

    public getFormattedDescription(context?: RecruitmentContext): string {
        const attackerName = context?.alliedUnits.find(unit => unit.id === this.parameters.attackerId)?.name
            || this.parameters.attackerId;
        return `${attackerName}で攻撃して撃破する`;
    }
}

/**
 * Condition that requires the target's HP to be below a certain threshold
 * Commonly used to ensure enemies are weakened before recruitment
 */
export class HPThresholdCondition extends BaseRecruitmentCondition {
    constructor(id: string, description: string, threshold: number) {
        super(id, RecruitmentConditionType.HP_THRESHOLD, description, { threshold });
    }

    protected validateParameters(): void {
        super.validateParameters();

        const threshold = this.parameters.threshold;
        if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
            throw new Error(`HPThresholdCondition ${this.id}: threshold must be a number between 0 and 1`);
        }
    }

    checkCondition(context: RecruitmentContext): boolean {
        if (!RecruitmentTypeValidators.isValidRecruitmentContext(context)) {
            return false;
        }

        const target = context.target;
        if (!target.stats?.maxHP || target.stats.maxHP <= 0) {
            return false;
        }

        const hpPercentage = target.currentHP / target.stats.maxHP;
        return hpPercentage <= this.parameters.threshold;
    }

    public getFormattedDescription(context?: RecruitmentContext): string {
        const percentage = Math.round(this.parameters.threshold * 100);
        return `HPが${percentage}%以下の状態で撃破する`;
    }
}

/**
 * Condition that requires a specific type of damage to be dealt
 * Used for thematic recruitment requirements (e.g., magic vs physical)
 */
export class DamageTypeCondition extends BaseRecruitmentCondition {
    constructor(id: string, description: string, damageType: string) {
        super(id, RecruitmentConditionType.DAMAGE_TYPE, description, { damageType });
    }

    protected validateParameters(): void {
        super.validateParameters();

        if (!this.parameters.damageType || typeof this.parameters.damageType !== 'string') {
            throw new Error(`DamageTypeCondition ${this.id}: damageType must be a non-empty string`);
        }
    }

    checkCondition(context: RecruitmentContext): boolean {
        if (!RecruitmentTypeValidators.isValidRecruitmentContext(context)) {
            return false;
        }

        // Check if battle result contains damage type information
        if (!context.battleResult?.damageType) {
            return false;
        }

        return context.battleResult.damageType === this.parameters.damageType;
    }

    public getFormattedDescription(context?: RecruitmentContext): string {
        const damageTypeNames: Record<string, string> = {
            'physical': '物理攻撃',
            'magical': '魔法攻撃',
            'fire': '炎属性攻撃',
            'ice': '氷属性攻撃',
            'lightning': '雷属性攻撃',
            'holy': '聖属性攻撃',
            'dark': '闇属性攻撃'
        };

        const typeName = damageTypeNames[this.parameters.damageType] || this.parameters.damageType;
        return `${typeName}で撃破する`;
    }
}

/**
 * Condition that requires recruitment to happen within a certain number of turns
 * Creates urgency and strategic timing requirements
 */
export class TurnLimitCondition extends BaseRecruitmentCondition {
    constructor(id: string, description: string, maxTurn: number) {
        super(id, RecruitmentConditionType.TURN_LIMIT, description, { maxTurn });
    }

    protected validateParameters(): void {
        super.validateParameters();

        const maxTurn = this.parameters.maxTurn;
        if (typeof maxTurn !== 'number' || maxTurn < 1 || !Number.isInteger(maxTurn)) {
            throw new Error(`TurnLimitCondition ${this.id}: maxTurn must be a positive integer`);
        }
    }

    checkCondition(context: RecruitmentContext): boolean {
        if (!RecruitmentTypeValidators.isValidRecruitmentContext(context)) {
            return false;
        }

        return context.turn <= this.parameters.maxTurn;
    }

    public getFormattedDescription(context?: RecruitmentContext): string {
        const remainingTurns = context ? Math.max(0, this.parameters.maxTurn - context.turn + 1) : this.parameters.maxTurn;
        return `${this.parameters.maxTurn}ターン以内に撃破する (残り${remainingTurns}ターン)`;
    }
}

/**
 * Factory class for creating recruitment conditions
 * Provides a centralized way to create and validate conditions
 */
export class RecruitmentConditionFactory {
    /**
     * Create a recruitment condition from configuration data
     * @param config Configuration object containing condition parameters
     * @returns A new recruitment condition instance
     */
    static createCondition(config: {
        id: string;
        type: RecruitmentConditionType;
        description: string;
        parameters: Record<string, any>;
    }): RecruitmentCondition {
        const { id, type, description, parameters } = config;

        switch (type) {
            case RecruitmentConditionType.SPECIFIC_ATTACKER:
                return new SpecificAttackerCondition(id, description, parameters.attackerId);

            case RecruitmentConditionType.HP_THRESHOLD:
                return new HPThresholdCondition(id, description, parameters.threshold);

            case RecruitmentConditionType.DAMAGE_TYPE:
                return new DamageTypeCondition(id, description, parameters.damageType);

            case RecruitmentConditionType.TURN_LIMIT:
                return new TurnLimitCondition(id, description, parameters.maxTurn);

            default:
                throw new Error(`Unsupported recruitment condition type: ${type}`);
        }
    }

    /**
     * Create multiple conditions from an array of configurations
     * @param configs Array of condition configurations
     * @returns Array of recruitment condition instances
     */
    static createConditions(configs: Array<{
        id: string;
        type: RecruitmentConditionType;
        description: string;
        parameters: Record<string, any>;
    }>): RecruitmentCondition[] {
        return configs.map(config => this.createCondition(config));
    }

    /**
     * Validate a condition configuration before creation
     * @param config Configuration to validate
     * @returns true if the configuration is valid
     */
    static validateConditionConfig(config: any): boolean {
        if (!config || typeof config !== 'object') {
            return false;
        }

        const { id, type, description, parameters } = config;

        if (typeof id !== 'string' || !id.trim()) {
            return false;
        }

        if (!Object.values(RecruitmentConditionType).includes(type)) {
            return false;
        }

        if (typeof description !== 'string' || !description.trim()) {
            return false;
        }

        if (parameters === null || parameters === undefined || typeof parameters !== 'object') {
            return false;
        }

        // Type-specific validation
        switch (type) {
            case RecruitmentConditionType.SPECIFIC_ATTACKER:
                return typeof parameters.attackerId === 'string' && parameters.attackerId.trim().length > 0;

            case RecruitmentConditionType.HP_THRESHOLD:
                return typeof parameters.threshold === 'number' &&
                    parameters.threshold >= 0 &&
                    parameters.threshold <= 1;

            case RecruitmentConditionType.DAMAGE_TYPE:
                return typeof parameters.damageType === 'string' && parameters.damageType.trim().length > 0;

            case RecruitmentConditionType.TURN_LIMIT:
                return typeof parameters.maxTurn === 'number' &&
                    parameters.maxTurn >= 1 &&
                    Number.isInteger(parameters.maxTurn);

            default:
                return false;
        }
    }

    /**
     * Get the supported condition types
     * @returns Array of supported condition types
     */
    static getSupportedTypes(): RecruitmentConditionType[] {
        return [
            RecruitmentConditionType.SPECIFIC_ATTACKER,
            RecruitmentConditionType.HP_THRESHOLD,
            RecruitmentConditionType.DAMAGE_TYPE,
            RecruitmentConditionType.TURN_LIMIT
        ];
    }
}

/**
 * Utility class for working with recruitment conditions
 */
export class RecruitmentConditionUtils {
    /**
     * Check if all conditions in a list are satisfied
     * @param conditions Array of conditions to check
     * @param context Recruitment context
     * @returns Array of boolean results for each condition
     */
    static checkAllConditions(
        conditions: RecruitmentCondition[],
        context: RecruitmentContext
    ): boolean[] {
        return conditions.map(condition => {
            try {
                return condition.checkCondition(context);
            } catch (error) {
                console.error(`Error checking condition ${condition.id}:`, error);
                return false;
            }
        });
    }

    /**
     * Get a summary of condition states
     * @param conditions Array of conditions
     * @param context Recruitment context
     * @returns Summary object with condition states
     */
    static getConditionSummary(
        conditions: RecruitmentCondition[],
        context: RecruitmentContext
    ): {
        total: number;
        satisfied: number;
        remaining: number;
        percentage: number;
        allSatisfied: boolean;
        results: boolean[];
    } {
        const results = this.checkAllConditions(conditions, context);
        const satisfied = results.filter(result => result).length;
        const total = conditions.length;
        const remaining = total - satisfied;
        const percentage = total > 0 ? Math.round((satisfied / total) * 100) : 0;
        const allSatisfied = satisfied === total && total > 0;

        return {
            total,
            satisfied,
            remaining,
            percentage,
            allSatisfied,
            results
        };
    }

    /**
     * Find conditions that are not yet satisfied
     * @param conditions Array of conditions
     * @param context Recruitment context
     * @returns Array of unsatisfied conditions
     */
    static getUnsatisfiedConditions(
        conditions: RecruitmentCondition[],
        context: RecruitmentContext
    ): RecruitmentCondition[] {
        const results = this.checkAllConditions(conditions, context);
        return conditions.filter((_, index) => !results[index]);
    }

    /**
     * Get formatted descriptions for all conditions
     * @param conditions Array of conditions
     * @param context Optional context for dynamic descriptions
     * @returns Array of formatted description strings
     */
    static getFormattedDescriptions(
        conditions: RecruitmentCondition[],
        context?: RecruitmentContext
    ): string[] {
        return conditions.map(condition => condition.getFormattedDescription(context));
    }

    /**
     * Validate that all conditions in an array are properly configured
     * @param conditions Array of conditions to validate
     * @returns true if all conditions are valid
     */
    static validateConditions(conditions: RecruitmentCondition[]): boolean {
        return conditions.every(condition => condition.isValid());
    }

    /**
     * Sort conditions by priority (specific types first, then by complexity)
     * @param conditions Array of conditions to sort
     * @returns Sorted array of conditions
     */
    static sortConditionsByPriority(conditions: RecruitmentCondition[]): RecruitmentCondition[] {
        const priorityOrder: Record<RecruitmentConditionType, number> = {
            [RecruitmentConditionType.TURN_LIMIT]: 1,
            [RecruitmentConditionType.SPECIFIC_ATTACKER]: 2,
            [RecruitmentConditionType.HP_THRESHOLD]: 3,
            [RecruitmentConditionType.DAMAGE_TYPE]: 4,
            [RecruitmentConditionType.ALLY_PRESENT]: 5,
            [RecruitmentConditionType.WEAPON_TYPE]: 6,
            [RecruitmentConditionType.NO_CRITICAL]: 7,
            [RecruitmentConditionType.ELEMENT_MATCH]: 8
        };

        return [...conditions].sort((a, b) => {
            const priorityA = priorityOrder[a.type] || 999;
            const priorityB = priorityOrder[b.type] || 999;
            return priorityA - priorityB;
        });
    }
}