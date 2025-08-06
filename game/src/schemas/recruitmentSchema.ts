/**
 * JSON schema definitions and validation functions for recruitment system data
 */

import { RecruitmentConditionType, RecruitmentTypeValidators } from '../types/recruitment';

/**
 * JSON schema for recruitment condition
 */
export const recruitmentConditionSchema = {
    type: 'object',
    required: ['id', 'type', 'description', 'parameters'],
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        type: {
            type: 'string',
            enum: Object.values(RecruitmentConditionType)
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 200
        },
        parameters: {
            type: 'object',
            additionalProperties: true
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for recruitment reward
 */
export const recruitmentRewardSchema = {
    type: 'object',
    required: ['type', 'amount', 'description'],
    properties: {
        type: {
            type: 'string',
            enum: ['experience', 'item', 'gold', 'skill_point']
        },
        amount: {
            type: 'number',
            minimum: 0
        },
        target: {
            type: 'string',
            enum: ['recruiter', 'party', 'recruited']
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for recruitment data
 */
export const recruitmentDataSchema = {
    type: 'object',
    required: ['priority', 'description', 'conditions'],
    properties: {
        priority: {
            type: 'number',
            minimum: 0,
            maximum: 100
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 300
        },
        conditions: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: recruitmentConditionSchema
        },
        rewards: {
            type: 'array',
            items: recruitmentRewardSchema
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for character data
 */
export const characterSchema = {
    type: 'object',
    required: ['id', 'name', 'description', 'faction', 'baseStats', 'jobClass', 'level', 'isRecruitable'],
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 50
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 200
        },
        faction: {
            type: 'string',
            enum: ['player', 'enemy', 'neutral']
        },
        baseStats: {
            type: 'object',
            required: ['maxHP', 'maxMP', 'attack', 'defense', 'speed', 'movement'],
            properties: {
                maxHP: { type: 'number', minimum: 1, maximum: 9999 },
                maxMP: { type: 'number', minimum: 0, maximum: 999 },
                attack: { type: 'number', minimum: 1, maximum: 999 },
                defense: { type: 'number', minimum: 0, maximum: 999 },
                speed: { type: 'number', minimum: 1, maximum: 99 },
                movement: { type: 'number', minimum: 1, maximum: 10 }
            },
            additionalProperties: false
        },
        jobClass: {
            type: 'string',
            minLength: 1,
            maxLength: 30
        },
        level: {
            type: 'number',
            minimum: 1,
            maximum: 99
        },
        isRecruitable: {
            type: 'boolean'
        },
        recruitmentData: {
            oneOf: [
                { type: 'null' },
                recruitmentDataSchema
            ]
        },
        isBoss: {
            type: 'boolean'
        },
        roseEssenceReward: {
            type: 'number',
            minimum: 0,
            maximum: 10
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for characters file
 */
export const charactersFileSchema = {
    type: 'object',
    required: ['characters'],
    properties: {
        characters: {
            type: 'array',
            minItems: 1,
            items: characterSchema
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for stage unit placement
 */
export const stageUnitSchema = {
    type: 'object',
    required: ['characterId', 'startPosition'],
    properties: {
        characterId: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        startPosition: {
            type: 'object',
            required: ['x', 'y'],
            properties: {
                x: { type: 'number', minimum: 0 },
                y: { type: 'number', minimum: 0 }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for recruitable character in stage
 */
export const stageRecruitableCharacterSchema = {
    type: 'object',
    required: ['characterId', 'isActive'],
    properties: {
        characterId: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        isActive: {
            type: 'boolean'
        },
        stageSpecificConditions: {
            type: 'array',
            items: recruitmentConditionSchema
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for victory/defeat conditions
 */
export const conditionSchema = {
    type: 'object',
    required: ['type', 'description'],
    properties: {
        type: {
            type: 'string',
            enum: [
                'defeat_all_enemies',
                'defeat_boss',
                'reach_destination',
                'survive_turns',
                'all_allies_defeated',
                'turn_limit_exceeded'
            ]
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },
        parameters: {
            type: 'object',
            additionalProperties: true
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for stage data
 */
export const stageSchema = {
    type: 'object',
    required: [
        'id', 'name', 'description', 'isUnlocked', 'difficulty', 'order',
        'mapData', 'playerUnits', 'enemyUnits', 'recruitableCharacters',
        'victoryConditions', 'defeatConditions'
    ],
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 50
        },
        description: {
            type: 'string',
            minLength: 1,
            maxLength: 200
        },
        isUnlocked: {
            type: 'boolean'
        },
        thumbnail: {
            type: 'string'
        },
        difficulty: {
            type: 'number',
            minimum: 1,
            maximum: 10
        },
        order: {
            type: 'number',
            minimum: 1
        },
        mapData: {
            type: 'object',
            required: ['width', 'height', 'tileset'],
            properties: {
                width: { type: 'number', minimum: 8, maximum: 50 },
                height: { type: 'number', minimum: 6, maximum: 40 },
                tileset: { type: 'string', minLength: 1 }
            },
            additionalProperties: false
        },
        playerUnits: {
            type: 'array',
            items: stageUnitSchema
        },
        enemyUnits: {
            type: 'array',
            items: stageUnitSchema
        },
        recruitableCharacters: {
            type: 'array',
            items: stageRecruitableCharacterSchema
        },
        victoryConditions: {
            type: 'array',
            minItems: 1,
            items: conditionSchema
        },
        defeatConditions: {
            type: 'array',
            minItems: 1,
            items: conditionSchema
        }
    },
    additionalProperties: false
};

/**
 * JSON schema for stages file
 */
export const stagesFileSchema = {
    type: 'object',
    required: ['stages'],
    properties: {
        stages: {
            type: 'array',
            minItems: 1,
            items: stageSchema
        }
    },
    additionalProperties: false
};

/**
 * Validation error class for schema validation
 */
export class SchemaValidationError extends Error {
    constructor(
        message: string,
        public path?: string,
        public value?: any
    ) {
        super(message);
        this.name = 'SchemaValidationError';
    }
}

/**
 * Simple JSON schema validator
 */
export class JSONSchemaValidator {
    /**
     * Validate data against a schema
     */
    static validate(data: any, schema: any, path: string = ''): void {
        if (schema.oneOf) {
            this.validateOneOf(data, schema, path);
        } else if (schema.enum) {
            this.validateEnum(data, schema, path);
        } else if (schema.type === 'object') {
            this.validateObject(data, schema, path);
        } else if (schema.type === 'array') {
            this.validateArray(data, schema, path);
        } else if (schema.type === 'string') {
            this.validateString(data, schema, path);
        } else if (schema.type === 'number') {
            this.validateNumber(data, schema, path);
        } else if (schema.type === 'boolean') {
            this.validateBoolean(data, schema, path);
        }
    }

    private static validateObject(data: any, schema: any, path: string): void {
        if (typeof data !== 'object' || data === null) {
            throw new SchemaValidationError(`Expected object at ${path}`, path, data);
        }

        // Check required properties
        if (schema.required) {
            for (const prop of schema.required) {
                if (!(prop in data)) {
                    throw new SchemaValidationError(
                        `Missing required property '${prop}' at ${path}`,
                        `${path}.${prop}`,
                        data
                    );
                }
            }
        }

        // Validate properties
        if (schema.properties) {
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                if (prop in data) {
                    const propPath = path ? `${path}.${prop}` : prop;
                    this.validate(data[prop], propSchema, propPath);
                }
            }
        }

        // Check for additional properties
        if (schema.additionalProperties === false) {
            const allowedProps = new Set(Object.keys(schema.properties || {}));
            for (const prop of Object.keys(data)) {
                if (!allowedProps.has(prop)) {
                    throw new SchemaValidationError(
                        `Additional property '${prop}' not allowed at ${path}`,
                        `${path}.${prop}`,
                        data[prop]
                    );
                }
            }
        }
    }

    private static validateArray(data: any, schema: any, path: string): void {
        if (!Array.isArray(data)) {
            throw new SchemaValidationError(`Expected array at ${path}`, path, data);
        }

        if (schema.minItems !== undefined && data.length < schema.minItems) {
            throw new SchemaValidationError(
                `Array at ${path} must have at least ${schema.minItems} items`,
                path,
                data
            );
        }

        if (schema.maxItems !== undefined && data.length > schema.maxItems) {
            throw new SchemaValidationError(
                `Array at ${path} must have at most ${schema.maxItems} items`,
                path,
                data
            );
        }

        if (schema.items) {
            data.forEach((item, index) => {
                const itemPath = `${path}[${index}]`;
                this.validate(item, schema.items, itemPath);
            });
        }
    }

    private static validateString(data: any, schema: any, path: string): void {
        if (typeof data !== 'string') {
            throw new SchemaValidationError(`Expected string at ${path}`, path, data);
        }

        if (schema.minLength !== undefined && data.length < schema.minLength) {
            throw new SchemaValidationError(
                `String at ${path} must be at least ${schema.minLength} characters`,
                path,
                data
            );
        }

        if (schema.maxLength !== undefined && data.length > schema.maxLength) {
            throw new SchemaValidationError(
                `String at ${path} must be at most ${schema.maxLength} characters`,
                path,
                data
            );
        }

        if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
            throw new SchemaValidationError(
                `String at ${path} does not match pattern ${schema.pattern}`,
                path,
                data
            );
        }

        if (schema.enum && !schema.enum.includes(data)) {
            throw new SchemaValidationError(
                `Value at ${path} must be one of: ${schema.enum.join(', ')}`,
                path,
                data
            );
        }
    }

    private static validateNumber(data: any, schema: any, path: string): void {
        if (typeof data !== 'number') {
            throw new SchemaValidationError(`Expected number at ${path}`, path, data);
        }

        if (schema.minimum !== undefined && data < schema.minimum) {
            throw new SchemaValidationError(
                `Number at ${path} must be at least ${schema.minimum}`,
                path,
                data
            );
        }

        if (schema.maximum !== undefined && data > schema.maximum) {
            throw new SchemaValidationError(
                `Number at ${path} must be at most ${schema.maximum}`,
                path,
                data
            );
        }
    }

    private static validateBoolean(data: any, schema: any, path: string): void {
        if (typeof data !== 'boolean') {
            throw new SchemaValidationError(`Expected boolean at ${path}`, path, data);
        }
    }

    private static validateOneOf(data: any, schema: any, path: string): void {
        const errors: SchemaValidationError[] = [];

        for (const subSchema of schema.oneOf) {
            try {
                this.validate(data, subSchema, path);
                return; // If validation succeeds, we're done
            } catch (error) {
                if (error instanceof SchemaValidationError) {
                    errors.push(error);
                }
            }
        }

        throw new SchemaValidationError(
            `Value at ${path} does not match any of the allowed schemas`,
            path,
            data
        );
    }

    private static validateEnum(data: any, schema: any, path: string): void {
        if (!schema.enum.includes(data)) {
            throw new SchemaValidationError(
                `Value at ${path} must be one of: ${schema.enum.join(', ')}`,
                path,
                data
            );
        }
    }
}

/**
 * Recruitment-specific validation functions
 */
export class RecruitmentDataValidator {
    /**
     * Validate recruitment condition parameters based on type
     */
    static validateConditionParameters(condition: any): void {
        const { type, parameters } = condition;

        switch (type) {
            case RecruitmentConditionType.SPECIFIC_ATTACKER:
                if (!parameters.attackerId || typeof parameters.attackerId !== 'string') {
                    throw new SchemaValidationError(
                        'specific_attacker condition requires attackerId parameter',
                        'parameters.attackerId',
                        parameters.attackerId
                    );
                }
                break;

            case RecruitmentConditionType.HP_THRESHOLD:
                if (typeof parameters.threshold !== 'number' ||
                    parameters.threshold <= 0 || parameters.threshold > 1) {
                    throw new SchemaValidationError(
                        'hp_threshold condition requires threshold parameter between 0 and 1',
                        'parameters.threshold',
                        parameters.threshold
                    );
                }
                break;

            case RecruitmentConditionType.TURN_LIMIT:
                if (typeof parameters.maxTurn !== 'number' || parameters.maxTurn < 1) {
                    throw new SchemaValidationError(
                        'turn_limit condition requires positive maxTurn parameter',
                        'parameters.maxTurn',
                        parameters.maxTurn
                    );
                }
                break;

            case RecruitmentConditionType.ELEMENT_MATCH:
                if (!parameters.requiredElement || typeof parameters.requiredElement !== 'string') {
                    throw new SchemaValidationError(
                        'element_match condition requires requiredElement parameter',
                        'parameters.requiredElement',
                        parameters.requiredElement
                    );
                }
                break;

            case RecruitmentConditionType.ALLY_PRESENT:
                if (!parameters.requiredAllyId || typeof parameters.requiredAllyId !== 'string') {
                    throw new SchemaValidationError(
                        'ally_present condition requires requiredAllyId parameter',
                        'parameters.requiredAllyId',
                        parameters.requiredAllyId
                    );
                }
                break;

            case RecruitmentConditionType.WEAPON_TYPE:
                if (!parameters.weaponType || typeof parameters.weaponType !== 'string') {
                    throw new SchemaValidationError(
                        'weapon_type condition requires weaponType parameter',
                        'parameters.weaponType',
                        parameters.weaponType
                    );
                }
                break;

            case RecruitmentConditionType.DAMAGE_TYPE:
                if (!parameters.damageType || typeof parameters.damageType !== 'string') {
                    throw new SchemaValidationError(
                        'damage_type condition requires damageType parameter',
                        'parameters.damageType',
                        parameters.damageType
                    );
                }
                break;

            case RecruitmentConditionType.NO_CRITICAL:
                // No parameters required for this condition
                break;

            default:
                throw new SchemaValidationError(
                    `Unknown recruitment condition type: ${type}`,
                    'type',
                    type
                );
        }
    }

    /**
     * Validate character recruitment data consistency
     */
    static validateCharacterRecruitmentConsistency(character: any): void {
        if (character.isRecruitable && !character.recruitmentData) {
            throw new SchemaValidationError(
                `Character ${character.id} is marked as recruitable but has no recruitment data`,
                'recruitmentData',
                character.recruitmentData
            );
        }

        if (!character.isRecruitable && character.recruitmentData) {
            throw new SchemaValidationError(
                `Character ${character.id} is not recruitable but has recruitment data`,
                'isRecruitable',
                character.isRecruitable
            );
        }

        if (character.recruitmentData) {
            // Validate each condition's parameters
            character.recruitmentData.conditions.forEach((condition: any, index: number) => {
                try {
                    this.validateConditionParameters(condition);
                } catch (error) {
                    if (error instanceof SchemaValidationError) {
                        throw new SchemaValidationError(
                            `Invalid condition at index ${index}: ${error.message}`,
                            `recruitmentData.conditions[${index}]`,
                            condition
                        );
                    }
                    throw error;
                }
            });
        }
    }

    /**
     * Validate stage recruitment data consistency
     */
    static validateStageRecruitmentConsistency(stage: any, characters: any[]): void {
        const characterIds = new Set(characters.map(c => c.id));
        const recruitableCharacterIds = new Set(
            characters.filter(c => c.isRecruitable).map(c => c.id)
        );

        // Validate player units exist
        stage.playerUnits.forEach((unit: any, index: number) => {
            if (!characterIds.has(unit.characterId)) {
                throw new SchemaValidationError(
                    `Player unit at index ${index} references unknown character: ${unit.characterId}`,
                    `playerUnits[${index}].characterId`,
                    unit.characterId
                );
            }
        });

        // Validate enemy units exist
        stage.enemyUnits.forEach((unit: any, index: number) => {
            if (!characterIds.has(unit.characterId)) {
                throw new SchemaValidationError(
                    `Enemy unit at index ${index} references unknown character: ${unit.characterId}`,
                    `enemyUnits[${index}].characterId`,
                    unit.characterId
                );
            }
        });

        // Validate recruitable characters
        stage.recruitableCharacters.forEach((recruitable: any, index: number) => {
            if (!characterIds.has(recruitable.characterId)) {
                throw new SchemaValidationError(
                    `Recruitable character at index ${index} references unknown character: ${recruitable.characterId}`,
                    `recruitableCharacters[${index}].characterId`,
                    recruitable.characterId
                );
            }

            if (!recruitableCharacterIds.has(recruitable.characterId)) {
                throw new SchemaValidationError(
                    `Character ${recruitable.characterId} is listed as recruitable in stage but is not marked as recruitable in character data`,
                    `recruitableCharacters[${index}].characterId`,
                    recruitable.characterId
                );
            }

            // Validate stage-specific conditions
            if (recruitable.stageSpecificConditions) {
                recruitable.stageSpecificConditions.forEach((condition: any, condIndex: number) => {
                    try {
                        this.validateConditionParameters(condition);
                    } catch (error) {
                        if (error instanceof SchemaValidationError) {
                            throw new SchemaValidationError(
                                `Invalid stage-specific condition at recruitableCharacters[${index}].stageSpecificConditions[${condIndex}]: ${error.message}`,
                                `recruitableCharacters[${index}].stageSpecificConditions[${condIndex}]`,
                                condition
                            );
                        }
                        throw error;
                    }
                });
            }
        });
    }
}