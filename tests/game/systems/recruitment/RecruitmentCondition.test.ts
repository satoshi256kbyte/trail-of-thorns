/**
 * Unit tests for RecruitmentCondition classes
 * Tests the base class and all concrete condition implementations
 */

import {
    BaseRecruitmentCondition,
    SpecificAttackerCondition,
    HPThresholdCondition,
    DamageTypeCondition,
    TurnLimitCondition,
    RecruitmentConditionFactory,
    RecruitmentConditionUtils
} from '../../../../game/src/systems/recruitment/RecruitmentCondition';

import {
    RecruitmentConditionType,
    RecruitmentContext,
    RecruitmentCondition
} from '../../../../game/src/types/recruitment';

import { Unit } from '../../../../game/src/types/gameplay';

// Mock unit factory for testing
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    ...overrides
});

// Mock recruitment context factory
const createMockContext = (overrides: Partial<RecruitmentContext> = {}): RecruitmentContext => ({
    attacker: createMockUnit({ id: 'attacker', name: 'Attacker' }),
    target: createMockUnit({ id: 'target', name: 'Target', faction: 'enemy' }),
    damage: 25,
    turn: 1,
    alliedUnits: [createMockUnit({ id: 'attacker', name: 'Attacker' })],
    enemyUnits: [createMockUnit({ id: 'target', name: 'Target', faction: 'enemy' })],
    npcUnits: [],
    ...overrides
});

describe('BaseRecruitmentCondition', () => {
    // Create a concrete test implementation
    class TestCondition extends BaseRecruitmentCondition {
        checkCondition(context: RecruitmentContext): boolean {
            return context.damage > 0;
        }
    }

    describe('constructor', () => {
        test('should create condition with valid parameters', () => {
            const condition = new TestCondition(
                'test-1',
                RecruitmentConditionType.SPECIFIC_ATTACKER,
                'Test condition',
                { testParam: 'value' }
            );

            expect(condition.id).toBe('test-1');
            expect(condition.type).toBe(RecruitmentConditionType.SPECIFIC_ATTACKER);
            expect(condition.description).toBe('Test condition');
            expect(condition.parameters).toEqual({ testParam: 'value' });
        });

        test('should throw error with invalid parameters', () => {
            expect(() => {
                new TestCondition(
                    'test-1',
                    RecruitmentConditionType.SPECIFIC_ATTACKER,
                    'Test condition',
                    null as any
                );
            }).toThrow('Invalid parameters for condition test-1');
        });
    });

    describe('getFormattedDescription', () => {
        test('should return basic description by default', () => {
            const condition = new TestCondition(
                'test-1',
                RecruitmentConditionType.SPECIFIC_ATTACKER,
                'Test condition'
            );

            expect(condition.getFormattedDescription()).toBe('Test condition');
        });
    });

    describe('isValid', () => {
        test('should return true for valid condition', () => {
            const condition = new TestCondition(
                'test-1',
                RecruitmentConditionType.SPECIFIC_ATTACKER,
                'Test condition'
            );

            expect(condition.isValid()).toBe(true);
        });
    });

    describe('clone', () => {
        test('should create deep copy of condition', () => {
            const original = new TestCondition(
                'test-1',
                RecruitmentConditionType.SPECIFIC_ATTACKER,
                'Test condition',
                { testParam: 'value' }
            );

            const cloned = original.clone();

            expect(cloned).not.toBe(original);
            expect(cloned.id).toBe(original.id);
            expect(cloned.type).toBe(original.type);
            expect(cloned.description).toBe(original.description);
            expect(cloned.parameters).toEqual(original.parameters);
            expect(cloned.parameters).not.toBe(original.parameters);
        });
    });
});

describe('SpecificAttackerCondition', () => {
    describe('constructor', () => {
        test('should create condition with valid attacker ID', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'protagonist'
            );

            expect(condition.id).toBe('specific-1');
            expect(condition.type).toBe(RecruitmentConditionType.SPECIFIC_ATTACKER);
            expect(condition.parameters.attackerId).toBe('protagonist');
        });

        test('should throw error with invalid attacker ID', () => {
            expect(() => {
                new SpecificAttackerCondition('specific-1', 'Test', '');
            }).toThrow('SpecificAttackerCondition specific-1: attackerId must be a non-empty string');

            expect(() => {
                new SpecificAttackerCondition('specific-1', 'Test', null as any);
            }).toThrow('SpecificAttackerCondition specific-1: attackerId must be a non-empty string');
        });
    });

    describe('checkCondition', () => {
        test('should return true when attacker matches', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'protagonist'
            );

            const context = createMockContext({
                attacker: createMockUnit({ id: 'protagonist', name: 'Protagonist' })
            });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return false when attacker does not match', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'protagonist'
            );

            const context = createMockContext({
                attacker: createMockUnit({ id: 'other-character', name: 'Other' })
            });

            expect(condition.checkCondition(context)).toBe(false);
        });

        test('should return false with invalid context', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'protagonist'
            );

            expect(condition.checkCondition(null as any)).toBe(false);
        });
    });

    describe('getFormattedDescription', () => {
        test('should return formatted description with character name', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'protagonist'
            );

            const context = createMockContext({
                alliedUnits: [createMockUnit({ id: 'protagonist', name: '主人公' })]
            });

            expect(condition.getFormattedDescription(context)).toBe('主人公で攻撃して撃破する');
        });

        test('should use ID when character name not found', () => {
            const condition = new SpecificAttackerCondition(
                'specific-1',
                'Must be attacked by protagonist',
                'unknown-character'
            );

            const context = createMockContext();

            expect(condition.getFormattedDescription(context)).toBe('unknown-characterで攻撃して撃破する');
        });
    });
});

describe('HPThresholdCondition', () => {
    describe('constructor', () => {
        test('should create condition with valid threshold', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            expect(condition.id).toBe('hp-1');
            expect(condition.type).toBe(RecruitmentConditionType.HP_THRESHOLD);
            expect(condition.parameters.threshold).toBe(0.3);
        });

        test('should throw error with invalid threshold', () => {
            expect(() => {
                new HPThresholdCondition('hp-1', 'Test', -0.1);
            }).toThrow('HPThresholdCondition hp-1: threshold must be a number between 0 and 1');

            expect(() => {
                new HPThresholdCondition('hp-1', 'Test', 1.5);
            }).toThrow('HPThresholdCondition hp-1: threshold must be a number between 0 and 1');

            expect(() => {
                new HPThresholdCondition('hp-1', 'Test', 'invalid' as any);
            }).toThrow('HPThresholdCondition hp-1: threshold must be a number between 0 and 1');
        });
    });

    describe('checkCondition', () => {
        test('should return true when HP is below threshold', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            const context = createMockContext({
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25 // 25% HP
                })
            });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return false when HP is above threshold', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            const context = createMockContext({
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 50 // 50% HP
                })
            });

            expect(condition.checkCondition(context)).toBe(false);
        });

        test('should return true when HP equals threshold', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            const context = createMockContext({
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 30 // Exactly 30% HP
                })
            });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return false with invalid target stats', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            const context = createMockContext({
                target: createMockUnit({
                    stats: { maxHP: 0, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25
                })
            });

            expect(condition.checkCondition(context)).toBe(false);
        });
    });

    describe('getFormattedDescription', () => {
        test('should return formatted description with percentage', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 30%',
                0.3
            );

            expect(condition.getFormattedDescription()).toBe('HPが30%以下の状態で撃破する');
        });

        test('should handle decimal thresholds correctly', () => {
            const condition = new HPThresholdCondition(
                'hp-1',
                'HP must be below 25%',
                0.25
            );

            expect(condition.getFormattedDescription()).toBe('HPが25%以下の状態で撃破する');
        });
    });
});

describe('DamageTypeCondition', () => {
    describe('constructor', () => {
        test('should create condition with valid damage type', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use magic damage',
                'magical'
            );

            expect(condition.id).toBe('damage-1');
            expect(condition.type).toBe(RecruitmentConditionType.DAMAGE_TYPE);
            expect(condition.parameters.damageType).toBe('magical');
        });

        test('should throw error with invalid damage type', () => {
            expect(() => {
                new DamageTypeCondition('damage-1', 'Test', '');
            }).toThrow('DamageTypeCondition damage-1: damageType must be a non-empty string');

            expect(() => {
                new DamageTypeCondition('damage-1', 'Test', null as any);
            }).toThrow('DamageTypeCondition damage-1: damageType must be a non-empty string');
        });
    });

    describe('checkCondition', () => {
        test('should return true when damage type matches', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use magic damage',
                'magical'
            );

            const context = createMockContext({
                battleResult: { damageType: 'magical' } as any
            });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return false when damage type does not match', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use magic damage',
                'magical'
            );

            const context = createMockContext({
                battleResult: { damageType: 'physical' } as any
            });

            expect(condition.checkCondition(context)).toBe(false);
        });

        test('should return false when battle result is missing', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use magic damage',
                'magical'
            );

            const context = createMockContext(); // No battleResult

            expect(condition.checkCondition(context)).toBe(false);
        });

        test('should return false when damage type is missing from battle result', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use magic damage',
                'magical'
            );

            const context = createMockContext({
                battleResult: {} as any // No damageType
            });

            expect(condition.checkCondition(context)).toBe(false);
        });
    });

    describe('getFormattedDescription', () => {
        test('should return formatted description for known damage types', () => {
            const testCases = [
                { type: 'physical', expected: '物理攻撃で撃破する' },
                { type: 'magical', expected: '魔法攻撃で撃破する' },
                { type: 'fire', expected: '炎属性攻撃で撃破する' },
                { type: 'ice', expected: '氷属性攻撃で撃破する' },
                { type: 'lightning', expected: '雷属性攻撃で撃破する' },
                { type: 'holy', expected: '聖属性攻撃で撃破する' },
                { type: 'dark', expected: '闇属性攻撃で撃破する' }
            ];

            testCases.forEach(({ type, expected }) => {
                const condition = new DamageTypeCondition('damage-1', 'Test', type);
                expect(condition.getFormattedDescription()).toBe(expected);
            });
        });

        test('should use raw type name for unknown damage types', () => {
            const condition = new DamageTypeCondition(
                'damage-1',
                'Must use custom damage',
                'custom-type'
            );

            expect(condition.getFormattedDescription()).toBe('custom-typeで撃破する');
        });
    });
});

describe('TurnLimitCondition', () => {
    describe('constructor', () => {
        test('should create condition with valid turn limit', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            expect(condition.id).toBe('turn-1');
            expect(condition.type).toBe(RecruitmentConditionType.TURN_LIMIT);
            expect(condition.parameters.maxTurn).toBe(5);
        });

        test('should throw error with invalid turn limit', () => {
            expect(() => {
                new TurnLimitCondition('turn-1', 'Test', 0);
            }).toThrow('TurnLimitCondition turn-1: maxTurn must be a positive integer');

            expect(() => {
                new TurnLimitCondition('turn-1', 'Test', -1);
            }).toThrow('TurnLimitCondition turn-1: maxTurn must be a positive integer');

            expect(() => {
                new TurnLimitCondition('turn-1', 'Test', 1.5);
            }).toThrow('TurnLimitCondition turn-1: maxTurn must be a positive integer');

            expect(() => {
                new TurnLimitCondition('turn-1', 'Test', 'invalid' as any);
            }).toThrow('TurnLimitCondition turn-1: maxTurn must be a positive integer');
        });
    });

    describe('checkCondition', () => {
        test('should return true when current turn is within limit', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            const context = createMockContext({ turn: 3 });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return true when current turn equals limit', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            const context = createMockContext({ turn: 5 });

            expect(condition.checkCondition(context)).toBe(true);
        });

        test('should return false when current turn exceeds limit', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            const context = createMockContext({ turn: 6 });

            expect(condition.checkCondition(context)).toBe(false);
        });
    });

    describe('getFormattedDescription', () => {
        test('should return formatted description with remaining turns', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            const context = createMockContext({ turn: 3 });

            expect(condition.getFormattedDescription(context)).toBe('5ターン以内に撃破する (残り3ターン)');
        });

        test('should show 0 remaining turns when limit exceeded', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            const context = createMockContext({ turn: 7 });

            expect(condition.getFormattedDescription(context)).toBe('5ターン以内に撃破する (残り0ターン)');
        });

        test('should show max turns when no context provided', () => {
            const condition = new TurnLimitCondition(
                'turn-1',
                'Must recruit within 5 turns',
                5
            );

            expect(condition.getFormattedDescription()).toBe('5ターン以内に撃破する (残り5ターン)');
        });
    });
});

describe('RecruitmentConditionFactory', () => {
    describe('createCondition', () => {
        test('should create SpecificAttackerCondition', () => {
            const config = {
                id: 'test-1',
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                description: 'Test condition',
                parameters: { attackerId: 'protagonist' }
            };

            const condition = RecruitmentConditionFactory.createCondition(config);

            expect(condition).toBeInstanceOf(SpecificAttackerCondition);
            expect(condition.id).toBe('test-1');
            expect(condition.parameters.attackerId).toBe('protagonist');
        });

        test('should create HPThresholdCondition', () => {
            const config = {
                id: 'test-2',
                type: RecruitmentConditionType.HP_THRESHOLD,
                description: 'HP condition',
                parameters: { threshold: 0.3 }
            };

            const condition = RecruitmentConditionFactory.createCondition(config);

            expect(condition).toBeInstanceOf(HPThresholdCondition);
            expect(condition.parameters.threshold).toBe(0.3);
        });

        test('should create DamageTypeCondition', () => {
            const config = {
                id: 'test-3',
                type: RecruitmentConditionType.DAMAGE_TYPE,
                description: 'Damage condition',
                parameters: { damageType: 'magical' }
            };

            const condition = RecruitmentConditionFactory.createCondition(config);

            expect(condition).toBeInstanceOf(DamageTypeCondition);
            expect(condition.parameters.damageType).toBe('magical');
        });

        test('should create TurnLimitCondition', () => {
            const config = {
                id: 'test-4',
                type: RecruitmentConditionType.TURN_LIMIT,
                description: 'Turn condition',
                parameters: { maxTurn: 5 }
            };

            const condition = RecruitmentConditionFactory.createCondition(config);

            expect(condition).toBeInstanceOf(TurnLimitCondition);
            expect(condition.parameters.maxTurn).toBe(5);
        });

        test('should throw error for unsupported condition type', () => {
            const config = {
                id: 'test-5',
                type: 'unsupported' as any,
                description: 'Unsupported condition',
                parameters: {}
            };

            expect(() => {
                RecruitmentConditionFactory.createCondition(config);
            }).toThrow('Unsupported recruitment condition type: unsupported');
        });
    });

    describe('createConditions', () => {
        test('should create multiple conditions from array', () => {
            const configs = [
                {
                    id: 'test-1',
                    type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                    description: 'Attacker condition',
                    parameters: { attackerId: 'protagonist' }
                },
                {
                    id: 'test-2',
                    type: RecruitmentConditionType.HP_THRESHOLD,
                    description: 'HP condition',
                    parameters: { threshold: 0.3 }
                }
            ];

            const conditions = RecruitmentConditionFactory.createConditions(configs);

            expect(conditions).toHaveLength(2);
            expect(conditions[0]).toBeInstanceOf(SpecificAttackerCondition);
            expect(conditions[1]).toBeInstanceOf(HPThresholdCondition);
        });
    });

    describe('validateConditionConfig', () => {
        test('should validate valid configurations', () => {
            const validConfigs = [
                {
                    id: 'test-1',
                    type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                    description: 'Test',
                    parameters: { attackerId: 'protagonist' }
                },
                {
                    id: 'test-2',
                    type: RecruitmentConditionType.HP_THRESHOLD,
                    description: 'Test',
                    parameters: { threshold: 0.5 }
                },
                {
                    id: 'test-3',
                    type: RecruitmentConditionType.DAMAGE_TYPE,
                    description: 'Test',
                    parameters: { damageType: 'magical' }
                },
                {
                    id: 'test-4',
                    type: RecruitmentConditionType.TURN_LIMIT,
                    description: 'Test',
                    parameters: { maxTurn: 5 }
                }
            ];

            validConfigs.forEach(config => {
                expect(RecruitmentConditionFactory.validateConditionConfig(config)).toBe(true);
            });
        });

        test('should reject invalid configurations', () => {
            const invalidConfigs = [
                null,
                {},
                { id: '', type: RecruitmentConditionType.SPECIFIC_ATTACKER, description: 'Test', parameters: {} },
                { id: 'test', type: 'invalid', description: 'Test', parameters: {} },
                { id: 'test', type: RecruitmentConditionType.SPECIFIC_ATTACKER, description: '', parameters: {} },
                { id: 'test', type: RecruitmentConditionType.SPECIFIC_ATTACKER, description: 'Test', parameters: null },
                { id: 'test', type: RecruitmentConditionType.SPECIFIC_ATTACKER, description: 'Test', parameters: { attackerId: '' } },
                { id: 'test', type: RecruitmentConditionType.HP_THRESHOLD, description: 'Test', parameters: { threshold: -0.1 } },
                { id: 'test', type: RecruitmentConditionType.DAMAGE_TYPE, description: 'Test', parameters: { damageType: '' } },
                { id: 'test', type: RecruitmentConditionType.TURN_LIMIT, description: 'Test', parameters: { maxTurn: 0 } }
            ];

            invalidConfigs.forEach(config => {
                expect(RecruitmentConditionFactory.validateConditionConfig(config)).toBe(false);
            });
        });
    });

    describe('getSupportedTypes', () => {
        test('should return all supported condition types', () => {
            const supportedTypes = RecruitmentConditionFactory.getSupportedTypes();

            expect(supportedTypes).toContain(RecruitmentConditionType.SPECIFIC_ATTACKER);
            expect(supportedTypes).toContain(RecruitmentConditionType.HP_THRESHOLD);
            expect(supportedTypes).toContain(RecruitmentConditionType.DAMAGE_TYPE);
            expect(supportedTypes).toContain(RecruitmentConditionType.TURN_LIMIT);
            expect(supportedTypes).toHaveLength(4);
        });
    });
});

describe('RecruitmentConditionUtils', () => {
    const createTestConditions = (): RecruitmentCondition[] => [
        new SpecificAttackerCondition('test-1', 'Attacker condition', 'protagonist'),
        new HPThresholdCondition('test-2', 'HP condition', 0.3),
        new TurnLimitCondition('test-3', 'Turn condition', 5)
    ];

    describe('checkAllConditions', () => {
        test('should check all conditions and return results', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                attacker: createMockUnit({ id: 'protagonist' }),
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25
                }),
                turn: 3
            });

            const results = RecruitmentConditionUtils.checkAllConditions(conditions, context);

            expect(results).toEqual([true, true, true]);
        });

        test('should handle condition errors gracefully', () => {
            const conditions = createTestConditions();
            const invalidContext = null as any;

            const results = RecruitmentConditionUtils.checkAllConditions(conditions, invalidContext);

            expect(results).toEqual([false, false, false]);
        });
    });

    describe('getConditionSummary', () => {
        test('should return correct summary for all satisfied conditions', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                attacker: createMockUnit({ id: 'protagonist' }),
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25
                }),
                turn: 3
            });

            const summary = RecruitmentConditionUtils.getConditionSummary(conditions, context);

            expect(summary.total).toBe(3);
            expect(summary.satisfied).toBe(3);
            expect(summary.remaining).toBe(0);
            expect(summary.percentage).toBe(100);
            expect(summary.allSatisfied).toBe(true);
            expect(summary.results).toEqual([true, true, true]);
        });

        test('should return correct summary for partially satisfied conditions', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                attacker: createMockUnit({ id: 'other-character' }), // Wrong attacker
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25
                }),
                turn: 3
            });

            const summary = RecruitmentConditionUtils.getConditionSummary(conditions, context);

            expect(summary.total).toBe(3);
            expect(summary.satisfied).toBe(2);
            expect(summary.remaining).toBe(1);
            expect(summary.percentage).toBe(67);
            expect(summary.allSatisfied).toBe(false);
            expect(summary.results).toEqual([false, true, true]);
        });

        test('should handle empty conditions array', () => {
            const conditions: RecruitmentCondition[] = [];
            const context = createMockContext();

            const summary = RecruitmentConditionUtils.getConditionSummary(conditions, context);

            expect(summary.total).toBe(0);
            expect(summary.satisfied).toBe(0);
            expect(summary.remaining).toBe(0);
            expect(summary.percentage).toBe(0);
            expect(summary.allSatisfied).toBe(false);
            expect(summary.results).toEqual([]);
        });
    });

    describe('getUnsatisfiedConditions', () => {
        test('should return only unsatisfied conditions', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                attacker: createMockUnit({ id: 'other-character' }), // Wrong attacker
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 80 // High HP
                }),
                turn: 3
            });

            const unsatisfied = RecruitmentConditionUtils.getUnsatisfiedConditions(conditions, context);

            expect(unsatisfied).toHaveLength(2);
            expect(unsatisfied[0].id).toBe('test-1'); // SpecificAttackerCondition
            expect(unsatisfied[1].id).toBe('test-2'); // HPThresholdCondition
        });

        test('should return empty array when all conditions satisfied', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                attacker: createMockUnit({ id: 'protagonist' }),
                target: createMockUnit({
                    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                    currentHP: 25
                }),
                turn: 3
            });

            const unsatisfied = RecruitmentConditionUtils.getUnsatisfiedConditions(conditions, context);

            expect(unsatisfied).toHaveLength(0);
        });
    });

    describe('getFormattedDescriptions', () => {
        test('should return formatted descriptions for all conditions', () => {
            const conditions = createTestConditions();
            const context = createMockContext({
                alliedUnits: [createMockUnit({ id: 'protagonist', name: '主人公' })],
                turn: 3
            });

            const descriptions = RecruitmentConditionUtils.getFormattedDescriptions(conditions, context);

            expect(descriptions).toHaveLength(3);
            expect(descriptions[0]).toBe('主人公で攻撃して撃破する');
            expect(descriptions[1]).toBe('HPが30%以下の状態で撃破する');
            expect(descriptions[2]).toBe('5ターン以内に撃破する (残り3ターン)');
        });
    });

    describe('validateConditions', () => {
        test('should return true for all valid conditions', () => {
            const conditions = createTestConditions();

            expect(RecruitmentConditionUtils.validateConditions(conditions)).toBe(true);
        });

        test('should return false if any condition is invalid', () => {
            const conditions = [
                new SpecificAttackerCondition('test-1', 'Valid condition', 'protagonist'),
                // Create an invalid condition by modifying parameters after construction
                (() => {
                    const invalid = new HPThresholdCondition('test-2', 'Invalid condition', 0.3);
                    (invalid as any).parameters.threshold = -1; // Make it invalid
                    return invalid;
                })()
            ];

            expect(RecruitmentConditionUtils.validateConditions(conditions)).toBe(false);
        });
    });

    describe('sortConditionsByPriority', () => {
        test('should sort conditions by priority order', () => {
            const conditions = [
                new HPThresholdCondition('hp-1', 'HP condition', 0.3),
                new TurnLimitCondition('turn-1', 'Turn condition', 5),
                new SpecificAttackerCondition('attacker-1', 'Attacker condition', 'protagonist'),
                new DamageTypeCondition('damage-1', 'Damage condition', 'magical')
            ];

            const sorted = RecruitmentConditionUtils.sortConditionsByPriority(conditions);

            expect(sorted[0].type).toBe(RecruitmentConditionType.TURN_LIMIT);
            expect(sorted[1].type).toBe(RecruitmentConditionType.SPECIFIC_ATTACKER);
            expect(sorted[2].type).toBe(RecruitmentConditionType.HP_THRESHOLD);
            expect(sorted[3].type).toBe(RecruitmentConditionType.DAMAGE_TYPE);
        });

        test('should not modify original array', () => {
            const conditions = [
                new HPThresholdCondition('hp-1', 'HP condition', 0.3),
                new TurnLimitCondition('turn-1', 'Turn condition', 5)
            ];

            const originalOrder = conditions.map(c => c.type);
            const sorted = RecruitmentConditionUtils.sortConditionsByPriority(conditions);

            expect(conditions.map(c => c.type)).toEqual(originalOrder);
            expect(sorted).not.toBe(conditions);
        });
    });
});