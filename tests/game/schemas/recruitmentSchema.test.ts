/**
 * Unit tests for recruitment schema validation
 */

import {
    JSONSchemaValidator,
    SchemaValidationError,
    RecruitmentDataValidator,
    characterSchema,
    stageSchema,
    recruitmentConditionSchema,
    recruitmentDataSchema
} from '../../../game/src/schemas/recruitmentSchema';
import { RecruitmentConditionType } from '../../../game/src/types/recruitment';

describe('JSONSchemaValidator', () => {
    describe('validate', () => {
        test('should validate valid object schema', () => {
            const validData = {
                name: 'Test',
                age: 25,
                active: true
            };

            const schema = {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                    active: { type: 'boolean' }
                },
                additionalProperties: false
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, schema);
            }).not.toThrow();
        });

        test('should throw error for missing required property', () => {
            const invalidData = {
                name: 'Test'
                // Missing required 'age' property
            };

            const schema = {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                }
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, schema);
            }).toThrow(SchemaValidationError);
        });

        test('should throw error for wrong data type', () => {
            const invalidData = {
                name: 'Test',
                age: 'twenty-five' // Should be number
            };

            const schema = {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                }
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, schema);
            }).toThrow(SchemaValidationError);
        });

        test('should validate array schema', () => {
            const validData = ['item1', 'item2', 'item3'];

            const schema = {
                type: 'array',
                minItems: 1,
                maxItems: 5,
                items: { type: 'string' }
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, schema);
            }).not.toThrow();
        });

        test('should throw error for array with too few items', () => {
            const invalidData: string[] = [];

            const schema = {
                type: 'array',
                minItems: 1,
                items: { type: 'string' }
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, schema);
            }).toThrow(SchemaValidationError);
        });

        test('should validate string with pattern', () => {
            const validData = 'test_123';

            const schema = {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$'
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, schema);
            }).not.toThrow();
        });

        test('should throw error for string not matching pattern', () => {
            const invalidData = 'test@123';

            const schema = {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$'
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, schema);
            }).toThrow(SchemaValidationError);
        });

        test('should validate enum values', () => {
            const validData = 'option2';

            const schema = {
                type: 'string',
                enum: ['option1', 'option2', 'option3']
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, schema);
            }).not.toThrow();
        });

        test('should throw error for invalid enum value', () => {
            const invalidData = 'invalid_option';

            const schema = {
                type: 'string',
                enum: ['option1', 'option2', 'option3']
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, schema);
            }).toThrow(SchemaValidationError);
        });

        test('should validate oneOf schema', () => {
            const validData = null;

            const schema = {
                oneOf: [
                    { type: 'null' },
                    { type: 'string' }
                ]
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, schema);
            }).not.toThrow();
        });
    });
});

describe('RecruitmentDataValidator', () => {
    describe('validateConditionParameters', () => {
        test('should validate specific_attacker condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                parameters: { attackerId: 'protagonist' }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should throw error for specific_attacker without attackerId', () => {
            const invalidCondition = {
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                parameters: {}
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(invalidCondition);
            }).toThrow(SchemaValidationError);
        });

        test('should validate hp_threshold condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.HP_THRESHOLD,
                parameters: { threshold: 0.3 }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should throw error for invalid hp_threshold', () => {
            const invalidCondition = {
                type: RecruitmentConditionType.HP_THRESHOLD,
                parameters: { threshold: 1.5 }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(invalidCondition);
            }).toThrow(SchemaValidationError);
        });

        test('should validate turn_limit condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.TURN_LIMIT,
                parameters: { maxTurn: 5 }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should throw error for invalid turn_limit', () => {
            const invalidCondition = {
                type: RecruitmentConditionType.TURN_LIMIT,
                parameters: { maxTurn: -1 }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(invalidCondition);
            }).toThrow(SchemaValidationError);
        });

        test('should validate element_match condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.ELEMENT_MATCH,
                parameters: { requiredElement: 'fire' }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should validate ally_present condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.ALLY_PRESENT,
                parameters: { requiredAllyId: 'ally_mage' }
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should validate no_critical condition', () => {
            const validCondition = {
                type: RecruitmentConditionType.NO_CRITICAL,
                parameters: {}
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(validCondition);
            }).not.toThrow();
        });

        test('should throw error for unknown condition type', () => {
            const invalidCondition = {
                type: 'unknown_type',
                parameters: {}
            };

            expect(() => {
                RecruitmentDataValidator.validateConditionParameters(invalidCondition);
            }).toThrow(SchemaValidationError);
        });
    });

    describe('validateCharacterRecruitmentConsistency', () => {
        test('should validate consistent recruitable character', () => {
            const validCharacter = {
                id: 'enemy_knight',
                isRecruitable: true,
                recruitmentData: {
                    priority: 70,
                    description: 'Test recruitment',
                    conditions: [
                        {
                            id: 'test_condition',
                            type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                            description: 'Must be attacked by protagonist',
                            parameters: { attackerId: 'protagonist' }
                        }
                    ]
                }
            };

            expect(() => {
                RecruitmentDataValidator.validateCharacterRecruitmentConsistency(validCharacter);
            }).not.toThrow();
        });

        test('should throw error for recruitable character without data', () => {
            const invalidCharacter = {
                id: 'enemy_knight',
                isRecruitable: true,
                recruitmentData: null
            };

            expect(() => {
                RecruitmentDataValidator.validateCharacterRecruitmentConsistency(invalidCharacter);
            }).toThrow(SchemaValidationError);
        });

        test('should throw error for non-recruitable character with data', () => {
            const invalidCharacter = {
                id: 'enemy_knight',
                isRecruitable: false,
                recruitmentData: {
                    priority: 70,
                    description: 'Test recruitment',
                    conditions: []
                }
            };

            expect(() => {
                RecruitmentDataValidator.validateCharacterRecruitmentConsistency(invalidCharacter);
            }).toThrow(SchemaValidationError);
        });
    });

    describe('validateStageRecruitmentConsistency', () => {
        test('should validate consistent stage and character data', () => {
            const characters = [
                {
                    id: 'protagonist',
                    isRecruitable: false
                },
                {
                    id: 'enemy_knight',
                    isRecruitable: true
                }
            ];

            const stage = {
                id: 'stage-001',
                playerUnits: [
                    { characterId: 'protagonist', startPosition: { x: 1, y: 4 } }
                ],
                enemyUnits: [
                    { characterId: 'enemy_knight', startPosition: { x: 8, y: 4 } }
                ],
                recruitableCharacters: [
                    { characterId: 'enemy_knight', isActive: true, stageSpecificConditions: [] }
                ]
            };

            expect(() => {
                RecruitmentDataValidator.validateStageRecruitmentConsistency(stage, characters);
            }).not.toThrow();
        });

        test('should throw error for unknown character reference', () => {
            const characters = [
                { id: 'protagonist', isRecruitable: false }
            ];

            const stage = {
                id: 'stage-001',
                playerUnits: [
                    { characterId: 'unknown_character', startPosition: { x: 1, y: 4 } }
                ],
                enemyUnits: [],
                recruitableCharacters: []
            };

            expect(() => {
                RecruitmentDataValidator.validateStageRecruitmentConsistency(stage, characters);
            }).toThrow(SchemaValidationError);
        });

        test('should throw error for non-recruitable character listed as recruitable', () => {
            const characters = [
                { id: 'enemy_knight', isRecruitable: false }
            ];

            const stage = {
                id: 'stage-001',
                playerUnits: [],
                enemyUnits: [
                    { characterId: 'enemy_knight', startPosition: { x: 8, y: 4 } }
                ],
                recruitableCharacters: [
                    { characterId: 'enemy_knight', isActive: true, stageSpecificConditions: [] }
                ]
            };

            expect(() => {
                RecruitmentDataValidator.validateStageRecruitmentConsistency(stage, characters);
            }).toThrow(SchemaValidationError);
        });
    });
});

describe('Schema Definitions', () => {
    describe('recruitmentConditionSchema', () => {
        test('should validate valid recruitment condition', () => {
            const validCondition = {
                id: 'test_condition',
                type: 'specific_attacker',
                description: 'Must be attacked by protagonist',
                parameters: { attackerId: 'protagonist' }
            };

            expect(() => {
                JSONSchemaValidator.validate(validCondition, recruitmentConditionSchema);
            }).not.toThrow();
        });

        test('should reject condition with invalid type', () => {
            const invalidCondition = {
                id: 'test_condition',
                type: 'invalid_type',
                description: 'Invalid condition',
                parameters: {}
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidCondition, recruitmentConditionSchema);
            }).toThrow(SchemaValidationError);
        });
    });

    describe('recruitmentDataSchema', () => {
        test('should validate valid recruitment data', () => {
            const validData = {
                priority: 70,
                description: 'Test recruitment',
                conditions: [
                    {
                        id: 'test_condition',
                        type: 'specific_attacker',
                        description: 'Must be attacked by protagonist',
                        parameters: { attackerId: 'protagonist' }
                    }
                ],
                rewards: [
                    {
                        type: 'experience',
                        amount: 100,
                        target: 'recruiter',
                        description: 'Experience reward'
                    }
                ]
            };

            expect(() => {
                JSONSchemaValidator.validate(validData, recruitmentDataSchema);
            }).not.toThrow();
        });

        test('should reject data with invalid priority', () => {
            const invalidData = {
                priority: 150, // Invalid: > 100
                description: 'Test recruitment',
                conditions: [
                    {
                        id: 'test_condition',
                        type: 'specific_attacker',
                        description: 'Must be attacked by protagonist',
                        parameters: { attackerId: 'protagonist' }
                    }
                ]
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidData, recruitmentDataSchema);
            }).toThrow(SchemaValidationError);
        });
    });

    describe('characterSchema', () => {
        test('should validate valid character', () => {
            const validCharacter = {
                id: 'enemy_knight',
                name: 'Enemy Knight',
                description: 'Test enemy knight',
                faction: 'enemy',
                baseStats: {
                    maxHP: 80,
                    maxMP: 30,
                    attack: 18,
                    defense: 20,
                    speed: 8,
                    movement: 2
                },
                jobClass: 'knight',
                level: 2,
                isRecruitable: true,
                recruitmentData: {
                    priority: 70,
                    description: 'Test recruitment',
                    conditions: [
                        {
                            id: 'test_condition',
                            type: 'specific_attacker',
                            description: 'Must be attacked by protagonist',
                            parameters: { attackerId: 'protagonist' }
                        }
                    ]
                }
            };

            expect(() => {
                JSONSchemaValidator.validate(validCharacter, characterSchema);
            }).not.toThrow();
        });

        test('should reject character with invalid stats', () => {
            const invalidCharacter = {
                id: 'enemy_knight',
                name: 'Enemy Knight',
                description: 'Test enemy knight',
                faction: 'enemy',
                baseStats: {
                    maxHP: -10, // Invalid: negative HP
                    maxMP: 30,
                    attack: 18,
                    defense: 20,
                    speed: 8,
                    movement: 2
                },
                jobClass: 'knight',
                level: 2,
                isRecruitable: false,
                recruitmentData: null
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidCharacter, characterSchema);
            }).toThrow(SchemaValidationError);
        });
    });

    describe('stageSchema', () => {
        test('should validate valid stage', () => {
            const validStage = {
                id: 'stage-001',
                name: 'Test Stage',
                description: 'Test stage description',
                isUnlocked: true,
                difficulty: 1,
                order: 1,
                mapData: {
                    width: 10,
                    height: 8,
                    tileset: 'test'
                },
                playerUnits: [
                    {
                        characterId: 'protagonist',
                        startPosition: { x: 1, y: 4 }
                    }
                ],
                enemyUnits: [
                    {
                        characterId: 'enemy_knight',
                        startPosition: { x: 8, y: 4 }
                    }
                ],
                recruitableCharacters: [
                    {
                        characterId: 'enemy_knight',
                        isActive: true,
                        stageSpecificConditions: []
                    }
                ],
                victoryConditions: [
                    {
                        type: 'defeat_all_enemies',
                        description: 'Defeat all enemies'
                    }
                ],
                defeatConditions: [
                    {
                        type: 'all_allies_defeated',
                        description: 'All allies defeated'
                    }
                ]
            };

            expect(() => {
                JSONSchemaValidator.validate(validStage, stageSchema);
            }).not.toThrow();
        });

        test('should reject stage with invalid map size', () => {
            const invalidStage = {
                id: 'stage-001',
                name: 'Test Stage',
                description: 'Test stage description',
                isUnlocked: true,
                difficulty: 1,
                order: 1,
                mapData: {
                    width: 5, // Invalid: too small
                    height: 3, // Invalid: too small
                    tileset: 'test'
                },
                playerUnits: [],
                enemyUnits: [],
                recruitableCharacters: [],
                victoryConditions: [
                    {
                        type: 'defeat_all_enemies',
                        description: 'Defeat all enemies'
                    }
                ],
                defeatConditions: [
                    {
                        type: 'all_allies_defeated',
                        description: 'All allies defeated'
                    }
                ]
            };

            expect(() => {
                JSONSchemaValidator.validate(invalidStage, stageSchema);
            }).toThrow(SchemaValidationError);
        });
    });
});