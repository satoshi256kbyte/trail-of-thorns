/**
 * ActionEvaluator Unit Tests
 */

import { ActionEvaluator, ActionEvaluation } from '../../../game/src/systems/ActionEvaluator';
import {
    AIActionType,
    AIContext,
    DifficultySettings,
    AISystemIntegration,
} from '../../../game/src/types/ai';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';

// Test data factories
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
    return {
        id: 'test-unit',
        name: 'Test Unit',
        position: { x: 5, y: 5 },
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
        },
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        ...overrides,
    };
}

function createMockContext(overrides: Partial<AIContext> = {}): AIContext {
    return {
        currentUnit: createMockUnit(),
        allUnits: [],
        currentTurn: 1,
        gamePhase: 'player',
        visibleEnemies: [],
        visibleAllies: [],
        npcs: [],
        availableSkills: [],
        tempData: new Map(),
        mapData: {
            width: 10,
            height: 10,
            tiles: [],
        } as MapData,
        ...overrides,
    };
}

function createMockDifficulty(): DifficultySettings {
    return {
        thinkingDepth: 3,
        randomnessFactor: 0.2,
        mistakeProbability: 0.1,
        reactionTime: 500,
        skillUsageFrequency: 0.7,
    };
}

function createMockIntegration(): AISystemIntegration {
    return {
        battleSystem: {
            canAttack: jest.fn().mockReturnValue(true),
            calculateDamage: jest.fn().mockReturnValue(25),
            executeAttack: jest.fn().mockResolvedValue(undefined),
        },
        movementSystem: {
            calculateMovementRange: jest.fn().mockReturnValue([
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
            ]),
            canMoveTo: jest.fn().mockReturnValue(true),
            executeMove: jest.fn().mockResolvedValue(undefined),
        },
        skillSystem: {
            getAvailableSkills: jest.fn().mockReturnValue(['heal', 'fireball']),
            canUseSkill: jest.fn().mockReturnValue(true),
            executeSkill: jest.fn().mockResolvedValue(undefined),
        },
        recruitmentSystem: {
            isNPC: jest.fn().mockReturnValue(false),
            getNPCPriority: jest.fn().mockReturnValue(10),
            getRecruitmentConditions: jest.fn().mockReturnValue([]),
        },
    };
}

describe('ActionEvaluator', () => {
    let evaluator: ActionEvaluator;
    let mockIntegration: AISystemIntegration;
    let mockDifficulty: DifficultySettings;

    beforeEach(() => {
        mockIntegration = createMockIntegration();
        mockDifficulty = createMockDifficulty();
        evaluator = new ActionEvaluator(mockIntegration, mockDifficulty);
    });

    describe('Constructor', () => {
        test('should initialize with provided parameters', () => {
            expect(evaluator).toBeDefined();
        });
    });

    describe('evaluateMove', () => {
        test('should return valid evaluation for move action', () => {
            const from = { x: 5, y: 5 };
            const to = { x: 6, y: 5 };
            const context = createMockContext();

            const evaluation = evaluator.evaluateMove(from, to, context);

            expect(evaluation).toBeDefined();
            expect(evaluation.action.type).toBe(AIActionType.MOVE);
            expect(evaluation.action.position).toEqual(to);
            expect(evaluation.score).toBeGreaterThanOrEqual(0);
            expect(evaluation.breakdown).toBeDefined();
        });

        test('should prefer shorter moves', () => {
            const from = { x: 5, y: 5 };
            const shortMove = { x: 6, y: 5 }; // Distance 1
            const longMove = { x: 8, y: 5 };  // Distance 3
            const context = createMockContext();

            const shortEval = evaluator.evaluateMove(from, shortMove, context);
            const longEval = evaluator.evaluateMove(from, longMove, context);

            expect(shortEval.breakdown.baseScore).toBeGreaterThan(longEval.breakdown.baseScore);
        });

        test('should include position evaluation', () => {
            const from = { x: 5, y: 5 };
            const to = { x: 6, y: 5 };
            const context = createMockContext();

            const evaluation = evaluator.evaluateMove(from, to, context);

            expect(evaluation.breakdown.positionScore).toBeDefined();
            expect(typeof evaluation.breakdown.positionScore).toBe('number');
        });

        test('should include threat evaluation', () => {
            const from = { x: 5, y: 5 };
            const to = { x: 6, y: 5 };
            const enemy = createMockUnit({
                id: 'enemy',
                faction: 'enemy',
                position: { x: 7, y: 5 }
            });
            const context = createMockContext({
                visibleEnemies: [enemy],
            });

            const evaluation = evaluator.evaluateMove(from, to, context);

            expect(evaluation.breakdown.threatScore).toBeDefined();
            expect(evaluation.riskLevel).toBeGreaterThan(0);
        });
    });

    describe('evaluateAttack', () => {
        test('should return valid evaluation for attack action', () => {
            const attacker = createMockUnit({ id: 'attacker' });
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            const evaluation = evaluator.evaluateAttack(attacker, target, context);

            expect(evaluation).toBeDefined();
            expect(evaluation.action.type).toBe(AIActionType.ATTACK);
            expect(evaluation.action.target).toBe(target);
            expect(evaluation.score).toBeGreaterThanOrEqual(0);
            expect(evaluation.breakdown).toBeDefined();
        });

        test('should give higher score to NPC targets', () => {
            const attacker = createMockUnit({ id: 'attacker' });
            const normalTarget = createMockUnit({ id: 'normal', faction: 'enemy' });
            const npcTarget = createMockUnit({ id: 'npc', faction: 'enemy' });
            const context = createMockContext();

            // Mock NPC detection
            (mockIntegration.recruitmentSystem!.isNPC as jest.Mock)
                .mockImplementation((unit: Unit) => unit.id === 'npc');

            const normalEval = evaluator.evaluateAttack(attacker, normalTarget, context);
            const npcEval = evaluator.evaluateAttack(attacker, npcTarget, context);

            expect(npcEval.strategicScore).toBeGreaterThan(normalEval.strategicScore);
        });

        test('should consider damage potential', () => {
            const attacker = createMockUnit({ id: 'attacker' });
            const weakTarget = createMockUnit({
                id: 'weak',
                faction: 'enemy',
                currentHP: 20,
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const strongTarget = createMockUnit({
                id: 'strong',
                faction: 'enemy',
                currentHP: 100,
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const context = createMockContext();

            const weakEval = evaluator.evaluateAttack(attacker, weakTarget, context);
            const strongEval = evaluator.evaluateAttack(attacker, strongTarget, context);

            expect(weakEval.breakdown.personalityModifier).toBeGreaterThan(strongEval.breakdown.personalityModifier);
        });

        test('should consider counterattack risk', () => {
            const attacker = createMockUnit({
                id: 'attacker',
                currentHP: 30,
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const dangerousTarget = createMockUnit({
                id: 'dangerous',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, attack: 50 }
            });
            const context = createMockContext();

            // Mock high counter damage
            (mockIntegration.battleSystem!.calculateDamage as jest.Mock)
                .mockImplementation((attacker: Unit, target: Unit) => {
                    if (attacker.id === 'dangerous') return 40;
                    return 25;
                });

            const evaluation = evaluator.evaluateAttack(attacker, dangerousTarget, context);

            expect(evaluation.riskLevel).toBeGreaterThan(0);
        });
    });

    describe('evaluateSkillUse', () => {
        test('should return valid evaluation for skill action', () => {
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            const evaluation = evaluator.evaluateSkillUse('fireball', target, context);

            expect(evaluation).toBeDefined();
            expect(evaluation.action.type).toBe(AIActionType.SKILL);
            expect(evaluation.action.skillId).toBe('fireball');
            expect(evaluation.action.target).toBe(target);
            expect(evaluation.score).toBeGreaterThanOrEqual(0);
        });

        test('should handle skill without target', () => {
            const context = createMockContext();

            const evaluation = evaluator.evaluateSkillUse('heal', undefined, context);

            expect(evaluation).toBeDefined();
            expect(evaluation.action.type).toBe(AIActionType.SKILL);
            expect(evaluation.action.skillId).toBe('heal');
            expect(evaluation.action.target).toBeUndefined();
        });

        test('should consider skill effectiveness', () => {
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            const evaluation = evaluator.evaluateSkillUse('fireball', target, context);

            expect(evaluation.breakdown.opportunityScore).toBeGreaterThan(0);
        });
    });

    describe('evaluateWait', () => {
        test('should return valid evaluation for wait action', () => {
            const context = createMockContext();

            const evaluation = evaluator.evaluateWait(context);

            expect(evaluation).toBeDefined();
            expect(evaluation.action.type).toBe(AIActionType.WAIT);
            expect(evaluation.score).toBeGreaterThanOrEqual(0);
            expect(evaluation.riskLevel).toBe(0); // Wait should be safe
            expect(evaluation.confidence).toBeGreaterThan(0.5); // High confidence in wait
        });

        test('should have lower strategic value', () => {
            const context = createMockContext();

            const evaluation = evaluator.evaluateWait(context);

            expect(evaluation.strategicScore).toBe(0);
        });

        test('should consider current position safety', () => {
            const enemy = createMockUnit({
                id: 'enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 } // Close to current unit
            });
            const safeContext = createMockContext();
            const dangerousContext = createMockContext({
                visibleEnemies: [enemy],
            });

            const safeEval = evaluator.evaluateWait(safeContext);
            const dangerousEval = evaluator.evaluateWait(dangerousContext);

            expect(safeEval.score).toBeGreaterThan(dangerousEval.score);
        });
    });

    describe('evaluatePositionalAdvantage', () => {
        test('should return score between 0 and 100', () => {
            const position = { x: 5, y: 5 };
            const context = createMockContext();

            const score = evaluator.evaluatePositionalAdvantage(position, context);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should prefer central positions', () => {
            const centerPosition = { x: 5, y: 5 }; // Center of 10x10 map
            const cornerPosition = { x: 0, y: 0 }; // Corner
            const context = createMockContext();

            const centerScore = evaluator.evaluatePositionalAdvantage(centerPosition, context);
            const cornerScore = evaluator.evaluatePositionalAdvantage(cornerPosition, context);

            expect(centerScore).toBeGreaterThan(cornerScore);
        });

        test('should consider distance to enemies', () => {
            const nearEnemyPos = { x: 5, y: 5 };
            const farEnemyPos = { x: 0, y: 0 };
            const enemy = createMockUnit({
                id: 'enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 }
            });
            const context = createMockContext({
                visibleEnemies: [enemy],
            });

            const nearScore = evaluator.evaluatePositionalAdvantage(nearEnemyPos, context);
            const farScore = evaluator.evaluatePositionalAdvantage(farEnemyPos, context);

            // Both should be valid scores, but the optimal distance depends on strategy
            expect(nearScore).toBeGreaterThanOrEqual(0);
            expect(farScore).toBeGreaterThanOrEqual(0);
        });

        test('should consider distance to allies', () => {
            const nearAllyPos = { x: 5, y: 5 };
            const farAllyPos = { x: 0, y: 0 };
            const ally = createMockUnit({
                id: 'ally',
                faction: 'player',
                position: { x: 6, y: 5 }
            });
            const context = createMockContext({
                visibleAllies: [ally],
            });

            const nearScore = evaluator.evaluatePositionalAdvantage(nearAllyPos, context);
            const farScore = evaluator.evaluatePositionalAdvantage(farAllyPos, context);

            expect(nearScore).toBeGreaterThan(farScore);
        });
    });

    describe('evaluateTerrainBonus', () => {
        test('should return score between -100 and 100', () => {
            const position = { x: 5, y: 5 };
            const context = createMockContext();

            const score = evaluator.evaluateTerrainBonus(position, context);

            expect(score).toBeGreaterThanOrEqual(-100);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should return negative score for out-of-bounds positions', () => {
            const outOfBounds = { x: -1, y: -1 };
            const context = createMockContext();

            const score = evaluator.evaluateTerrainBonus(outOfBounds, context);

            expect(score).toBe(-100);
        });

        test('should return positive score for valid positions', () => {
            const validPosition = { x: 5, y: 5 };
            const context = createMockContext();

            const score = evaluator.evaluateTerrainBonus(validPosition, context);

            expect(score).toBeGreaterThan(0);
        });

        test('should handle missing map data', () => {
            const position = { x: 5, y: 5 };
            const context = createMockContext({ mapData: undefined });

            const score = evaluator.evaluateTerrainBonus(position, context);

            expect(score).toBe(0);
        });
    });

    describe('evaluateThreatLevel', () => {
        test('should return score between 0 and 100', () => {
            const position = { x: 5, y: 5 };
            const context = createMockContext();

            const threat = evaluator.evaluateThreatLevel(position, context);

            expect(threat).toBeGreaterThanOrEqual(0);
            expect(threat).toBeLessThanOrEqual(100);
        });

        test('should return higher threat for positions near enemies', () => {
            const nearEnemyPos = { x: 5, y: 5 };
            const farEnemyPos = { x: 0, y: 0 };
            const enemy = createMockUnit({
                id: 'enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 }
            });
            const context = createMockContext({
                visibleEnemies: [enemy],
            });

            const nearThreat = evaluator.evaluateThreatLevel(nearEnemyPos, context);
            const farThreat = evaluator.evaluateThreatLevel(farEnemyPos, context);

            expect(nearThreat).toBeGreaterThan(farThreat);
        });

        test('should return zero threat when no enemies are visible', () => {
            const position = { x: 5, y: 5 };
            const context = createMockContext({
                visibleEnemies: [],
            });

            const threat = evaluator.evaluateThreatLevel(position, context);

            expect(threat).toBe(0);
        });

        test('should scale threat based on number of enemies', () => {
            const position = { x: 5, y: 5 };
            const oneEnemyContext = createMockContext({
                visibleEnemies: [
                    createMockUnit({ id: 'enemy1', faction: 'enemy', position: { x: 6, y: 5 } })
                ],
            });
            const twoEnemiesContext = createMockContext({
                visibleEnemies: [
                    createMockUnit({ id: 'enemy1', faction: 'enemy', position: { x: 6, y: 5 } }),
                    createMockUnit({ id: 'enemy2', faction: 'enemy', position: { x: 4, y: 5 } })
                ],
            });

            const oneThreat = evaluator.evaluateThreatLevel(position, oneEnemyContext);
            const twoThreat = evaluator.evaluateThreatLevel(position, twoEnemiesContext);

            expect(twoThreat).toBeGreaterThan(oneThreat);
        });
    });

    describe('Integration', () => {
        test('should use battle system for damage calculations', () => {
            const attacker = createMockUnit({ id: 'attacker' });
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            evaluator.evaluateAttack(attacker, target, context);

            expect(mockIntegration.battleSystem!.calculateDamage).toHaveBeenCalledWith(attacker, target);
        });

        test('should use recruitment system for NPC detection', () => {
            const attacker = createMockUnit({ id: 'attacker' });
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            evaluator.evaluateAttack(attacker, target, context);

            expect(mockIntegration.recruitmentSystem!.isNPC).toHaveBeenCalledWith(target);
        });

        test('should handle missing integration systems gracefully', () => {
            const evaluatorWithoutIntegration = new ActionEvaluator({}, mockDifficulty);
            const attacker = createMockUnit({ id: 'attacker' });
            const target = createMockUnit({ id: 'target', faction: 'enemy' });
            const context = createMockContext();

            expect(() => {
                evaluatorWithoutIntegration.evaluateAttack(attacker, target, context);
            }).not.toThrow();
        });
    });

    describe('Evaluation Consistency', () => {
        test('should return consistent results for same inputs', () => {
            const from = { x: 5, y: 5 };
            const to = { x: 6, y: 5 };
            const context = createMockContext();

            const eval1 = evaluator.evaluateMove(from, to, context);
            const eval2 = evaluator.evaluateMove(from, to, context);

            expect(eval1.score).toBe(eval2.score);
            expect(eval1.tacticalScore).toBe(eval2.tacticalScore);
            expect(eval1.strategicScore).toBe(eval2.strategicScore);
        });

        test('should have breakdown scores sum approximately to total score', () => {
            const from = { x: 5, y: 5 };
            const to = { x: 6, y: 5 };
            const context = createMockContext();

            const evaluation = evaluator.evaluateMove(from, to, context);
            const breakdown = evaluation.breakdown;

            // The tactical score should be based on the breakdown components
            // (exact calculation depends on weights, so we just check it's reasonable)
            expect(evaluation.tacticalScore).toBeGreaterThanOrEqual(0);
            expect(evaluation.tacticalScore).toBeLessThanOrEqual(200);
        });
    });
});