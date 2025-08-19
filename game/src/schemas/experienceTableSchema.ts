/**
 * 経験値テーブルJSONのスキーマ定義
 * データ構造の検証とタイプセーフティを提供
 */

export interface ExperienceTableSchema {
    version: string;
    levelRequirements: number[];
    experienceGains: ExperienceGainsSchema;
    maxLevel: number;
    defaultGrowthRates: GrowthRatesSchema;
    characterGrowthRates: Record<string, GrowthRatesSchema>;
    statLimits: StatLimitsSchema;
    experienceMultipliers: ExperienceMultipliersSchema;
}

export interface ExperienceGainsSchema {
    attackHit: number;
    enemyDefeat: number;
    allySupport: number;
    healing: number;
    skillUse: number;
    criticalHit: number;
    counterAttack: number;
}

export interface GrowthRatesSchema {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    skill: number;
    luck: number;
}

export interface StatLimitsSchema {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    skill: number;
    luck: number;
}

export interface ExperienceMultipliersSchema {
    easy: number;
    normal: number;
    hard: number;
    expert: number;
}

/**
 * JSON Schema定義（バリデーション用）
 */
export const EXPERIENCE_TABLE_JSON_SCHEMA = {
    type: 'object',
    required: [
        'version',
        'levelRequirements',
        'experienceGains',
        'maxLevel',
        'defaultGrowthRates',
        'characterGrowthRates',
        'statLimits',
        'experienceMultipliers'
    ],
    properties: {
        version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$'
        },
        levelRequirements: {
            type: 'array',
            items: {
                type: 'number',
                minimum: 0
            },
            minItems: 2
        },
        experienceGains: {
            type: 'object',
            required: ['attackHit', 'enemyDefeat', 'allySupport', 'healing'],
            properties: {
                attackHit: { type: 'number', minimum: 0 },
                enemyDefeat: { type: 'number', minimum: 0 },
                allySupport: { type: 'number', minimum: 0 },
                healing: { type: 'number', minimum: 0 },
                skillUse: { type: 'number', minimum: 0 },
                criticalHit: { type: 'number', minimum: 0 },
                counterAttack: { type: 'number', minimum: 0 }
            },
            additionalProperties: false
        },
        maxLevel: {
            type: 'number',
            minimum: 1,
            maximum: 999
        },
        defaultGrowthRates: {
            $ref: '#/definitions/growthRates'
        },
        characterGrowthRates: {
            type: 'object',
            patternProperties: {
                '^[a-zA-Z][a-zA-Z0-9_]*$': {
                    $ref: '#/definitions/growthRates'
                }
            },
            additionalProperties: false
        },
        statLimits: {
            $ref: '#/definitions/statLimits'
        },
        experienceMultipliers: {
            type: 'object',
            required: ['easy', 'normal', 'hard', 'expert'],
            properties: {
                easy: { type: 'number', minimum: 0.1, maximum: 10.0 },
                normal: { type: 'number', minimum: 0.1, maximum: 10.0 },
                hard: { type: 'number', minimum: 0.1, maximum: 10.0 },
                expert: { type: 'number', minimum: 0.1, maximum: 10.0 }
            },
            additionalProperties: false
        }
    },
    definitions: {
        growthRates: {
            type: 'object',
            required: ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'],
            properties: {
                hp: { type: 'number', minimum: 0, maximum: 100 },
                mp: { type: 'number', minimum: 0, maximum: 100 },
                attack: { type: 'number', minimum: 0, maximum: 100 },
                defense: { type: 'number', minimum: 0, maximum: 100 },
                speed: { type: 'number', minimum: 0, maximum: 100 },
                skill: { type: 'number', minimum: 0, maximum: 100 },
                luck: { type: 'number', minimum: 0, maximum: 100 }
            },
            additionalProperties: false
        },
        statLimits: {
            type: 'object',
            required: ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'],
            properties: {
                hp: { type: 'number', minimum: 1, maximum: 9999 },
                mp: { type: 'number', minimum: 1, maximum: 9999 },
                attack: { type: 'number', minimum: 1, maximum: 999 },
                defense: { type: 'number', minimum: 1, maximum: 999 },
                speed: { type: 'number', minimum: 1, maximum: 999 },
                skill: { type: 'number', minimum: 1, maximum: 999 },
                luck: { type: 'number', minimum: 1, maximum: 999 }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
} as const;

/**
 * バリデーションエラーの種類
 */
export enum ExperienceTableValidationError {
    INVALID_SCHEMA = 'INVALID_SCHEMA',
    INVALID_VERSION = 'INVALID_VERSION',
    INVALID_LEVEL_REQUIREMENTS = 'INVALID_LEVEL_REQUIREMENTS',
    INVALID_EXPERIENCE_GAINS = 'INVALID_EXPERIENCE_GAINS',
    INVALID_GROWTH_RATES = 'INVALID_GROWTH_RATES',
    INVALID_STAT_LIMITS = 'INVALID_STAT_LIMITS',
    INVALID_MULTIPLIERS = 'INVALID_MULTIPLIERS',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: ExperienceTableValidationError;
    message: string;
    path?: string;
    value?: any;
}

export interface ValidationWarning {
    message: string;
    path?: string;
    suggestion?: string;
}