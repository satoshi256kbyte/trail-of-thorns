/**
 * JSON スキーマ定義 - 職業システム
 * 
 * 職業データの検証とバリデーションに使用するスキーマ定義
 */

import { JobCategory, TraitEffectType } from '../types/job';

/**
 * 能力値修正のスキーマ
 */
export const statModifiersSchema = {
    type: 'object',
    properties: {
        hp: { type: 'number' },
        mp: { type: 'number' },
        attack: { type: 'number' },
        defense: { type: 'number' },
        speed: { type: 'number' },
        skill: { type: 'number' },
        luck: { type: 'number' },
    },
    required: ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'],
    additionalProperties: false,
};

/**
 * 成長率修正のスキーマ
 */
export const growthRateModifiersSchema = {
    type: 'object',
    properties: {
        hp: { type: 'number', minimum: 0, maximum: 100 },
        mp: { type: 'number', minimum: 0, maximum: 100 },
        attack: { type: 'number', minimum: 0, maximum: 100 },
        defense: { type: 'number', minimum: 0, maximum: 100 },
        speed: { type: 'number', minimum: 0, maximum: 100 },
        skill: { type: 'number', minimum: 0, maximum: 100 },
        luck: { type: 'number', minimum: 0, maximum: 100 },
    },
    required: ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'],
    additionalProperties: false,
};

/**
 * ランクアップ要件のスキーマ
 */
export const rankUpRequirementsSchema = {
    type: 'object',
    properties: {
        roseEssenceCost: { type: 'number', minimum: 0 },
        levelRequirement: { type: 'number', minimum: 1 },
        prerequisiteSkills: {
            type: 'array',
            items: { type: 'string' },
        },
        completedStages: {
            type: 'array',
            items: { type: 'string' },
        },
        defeatedBosses: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    required: ['roseEssenceCost', 'levelRequirement', 'prerequisiteSkills'],
    additionalProperties: false,
};

/**
 * 職業特性効果のスキーマ
 */
export const traitEffectSchema = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: Object.values(TraitEffectType),
        },
        value: { type: 'number' },
        target: { type: 'string' },
        condition: { type: 'string' },
    },
    required: ['type', 'value'],
    additionalProperties: false,
};

/**
 * 職業特性のスキーマ
 */
export const jobTraitSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        effect: traitEffectSchema,
    },
    required: ['id', 'name', 'description', 'effect'],
    additionalProperties: false,
};

/**
 * スプライト修正のスキーマ
 */
export const spriteModificationSchema = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['color', 'overlay', 'replace'],
        },
        target: { type: 'string', minLength: 1 },
        value: { type: 'string', minLength: 1 },
    },
    required: ['type', 'target', 'value'],
    additionalProperties: false,
};

/**
 * カラースキームのスキーマ
 */
export const colorSchemeSchema = {
    type: 'object',
    properties: {
        primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
    },
    required: ['primary', 'secondary', 'accent'],
    additionalProperties: false,
};

/**
 * 職業視覚表現のスキーマ
 */
export const jobVisualSchema = {
    type: 'object',
    properties: {
        iconPath: { type: 'string', minLength: 1 },
        spriteModifications: {
            type: 'array',
            items: spriteModificationSchema,
        },
        colorScheme: colorSchemeSchema,
    },
    required: ['iconPath', 'spriteModifications', 'colorScheme'],
    additionalProperties: false,
};

/**
 * 職業データのメインスキーマ
 */
export const jobDataSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        category: {
            type: 'string',
            enum: Object.values(JobCategory),
        },
        maxRank: { type: 'number', minimum: 1, maximum: 10 },
        statModifiers: {
            type: 'object',
            patternProperties: {
                '^[1-9][0-9]*$': statModifiersSchema,
            },
            additionalProperties: false,
        },
        availableSkills: {
            type: 'object',
            patternProperties: {
                '^[1-9][0-9]*$': {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            additionalProperties: false,
        },
        rankUpRequirements: {
            type: 'object',
            patternProperties: {
                '^[2-9][0-9]*$': rankUpRequirementsSchema,
            },
            additionalProperties: false,
        },
        growthRateModifiers: {
            type: 'object',
            patternProperties: {
                '^[1-9][0-9]*$': growthRateModifiersSchema,
            },
            additionalProperties: false,
        },
        jobTraits: {
            type: 'array',
            items: jobTraitSchema,
        },
        visual: jobVisualSchema,
    },
    required: [
        'id',
        'name',
        'description',
        'category',
        'maxRank',
        'statModifiers',
        'availableSkills',
        'rankUpRequirements',
        'growthRateModifiers',
        'jobTraits',
        'visual',
    ],
    additionalProperties: false,
};

/**
 * 薔薇の力データのスキーマ
 */
export const roseEssenceDataSchema = {
    type: 'object',
    properties: {
        currentAmount: { type: 'number', minimum: 0 },
        totalEarned: { type: 'number', minimum: 0 },
        totalSpent: { type: 'number', minimum: 0 },
        sources: {
            type: 'object',
            patternProperties: {
                '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                    type: 'object',
                    properties: {
                        baseAmount: { type: 'number', minimum: 0 },
                        difficultyMultiplier: { type: 'number', minimum: 0.1, maximum: 5.0 },
                        firstTimeBonus: { type: 'number', minimum: 0 },
                    },
                    required: ['baseAmount', 'difficultyMultiplier', 'firstTimeBonus'],
                    additionalProperties: false,
                },
            },
            additionalProperties: false,
        },
        costs: {
            type: 'object',
            properties: {
                rankUp: {
                    type: 'object',
                    patternProperties: {
                        '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                            type: 'object',
                            patternProperties: {
                                '^[1-9][0-9]*$': { type: 'number', minimum: 0 },
                            },
                            additionalProperties: false,
                        },
                    },
                    additionalProperties: false,
                },
                jobChange: { type: 'number', minimum: 0 },
                skillUnlock: { type: 'number', minimum: 0 },
            },
            required: ['rankUp', 'jobChange', 'skillUnlock'],
            additionalProperties: false,
        },
    },
    required: ['currentAmount', 'totalEarned', 'totalSpent', 'sources', 'costs'],
    additionalProperties: false,
};

/**
 * 職業テーブルデータのスキーマ（複数の職業データを含む）
 */
export const jobTableSchema = {
    type: 'object',
    properties: {
        version: { type: 'string' },
        jobs: {
            type: 'array',
            items: jobDataSchema,
            minItems: 1,
        },
        roseEssenceConfig: roseEssenceDataSchema,
    },
    required: ['version', 'jobs', 'roseEssenceConfig'],
    additionalProperties: false,
};

/**
 * スキーマ検証用のヘルパー関数
 */
export const validateJobData = (data: unknown): boolean => {
    // 実際の検証ロジックは後で実装
    // ここでは型チェックのみ
    return typeof data === 'object' && data !== null;
};

export const validateRoseEssenceData = (data: unknown): boolean => {
    // 実際の検証ロジックは後で実装
    // ここでは型チェックのみ
    return typeof data === 'object' && data !== null;
};

export const validateJobTable = (data: unknown): boolean => {
    // 実際の検証ロジックは後で実装
    // ここでは型チェックのみ
    return typeof data === 'object' && data !== null;
};