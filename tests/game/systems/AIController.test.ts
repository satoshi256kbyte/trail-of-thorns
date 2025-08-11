/**
 * AIController Unit Tests
 */

import { AIController } from '../../../game/src/systems/AIController';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
    AIThinkingTimeoutError,
} from '../../../game/src/types/ai';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';

// Mock implementation of AIController for testing
class MockAIController extends AIController {
    private mockDecision: AIAction = {
        type: AIActionType.WAIT,
        priority: 10,
        reasoning: 'Mock decision',
    };

    private mockThinkingTime: number = 100;

    protected async makeDecision(context: AIContext): Promise<AIAction> {
        // Simulate thinking time
        await new Promise(resolve => setTimeout(resolve, this.mockThinkingTime));
        return this.mockDecision;
    }

    public evaluatePosition(position: Position, context: AIContext): number {
        return 50; // Mock evaluation
    }

    public getPriority(context: AIContext): number {
        return this.currentUnit.stats.speed;
    }

    // Test helpers
    public setMockDecision(decision: AIAction): void {
        this.mockDecision = decision;
    }

    public setMockThinkingTime(time: number): void {
        this.mockThinkingTime = time;
    }

    // Expose protected methods for testing
    public testGetValidActions(context: AIContext): AIAction[] {
        return this.getValidActions(context);
    }

    public testEvaluateAttackTarget(target: Unit, context: AIContext): number {
        return this.evaluateAttackTarget(target, context);
    }

    public testCalculateDistance(pos1: Position, pos2: Position): number {
        return this.calculateDistance(pos1, pos2);
    }

    public testApplyRandomFactor(baseScore: number): number {
        return this.applyRandomFactor(baseScore);
    }

    public testShouldMakeMistake(): boolean {
        return this.shouldMakeMistake();
    }
}

// Mock personality implementation
class MockPersonality implements AIPersonality {
    constructor(
        public aggressiveness: number = 0.5,
        public defensiveness: number = 0.5,
        public supportiveness: number = 0.5,
        public tacticalness: number = 0.5,
        public riskTolerance: number = 0.5
    ) { }

    getActionModifier(actionType: AIActionType): number {
        switch (actionType) {
            case AIActionType.ATTACK:
                return this.aggressiveness;
            case AIActionType.MOVE:
                return this.tacticalness;
            default:
                return 1.0;
        }
    }

    shouldTakeRisk(riskLevel: number): boolean {
        return riskLevel <= this.riskTolerance;
    }

    getPriorityModifier(target: Unit): number {
        return 1.0;
    }
}

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
        ...overrides,
    };
}

function createMockConfig(): AIControllerConfig {
    return {
        thinkingTimeLimit: 2000,
        enableAILogging: false,
        npcPriorityMultiplier: 20,
        maxSearchDepth: 3,
        enableTacticalAI: true,
        randomFactor: 0.1,
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

describe('AIController', () => {
    let aiController: MockAIController;
    let mockUnit: Unit;
    let mockPersonality: MockPersonality;
    let mockDifficulty: DifficultySettings;
    let mockConfig: AIControllerConfig;
    let mockIntegration: AISystemIntegration;

    beforeEach(() => {
        mockUnit = createMockUnit();
        mockPersonality = new MockPersonality();
        mockDifficulty = createMockDifficulty();
        mockConfig = createMockConfig();
        mockIntegration = createMockIntegration();

        aiController = new MockAIController(
            mockUnit,
            mockPersonality,
            mockDifficulty,
            mockConfig,
            mockIntegration
        );
    });

    describe('Constructor', () => {
        test('should initialize with provided parameters', () => {
            expect(aiController.currentUnit).toBe(mockUnit);
            expect(aiController.aiPersonality).toBe(mockPersonality);
            expect(aiController.isCurrentlyThinking).toBe(false);
            expect(aiController.lastThinkingTime).toBe(0);
        });

        test('should initialize performance metrics', () => {
            const metrics = aiController.metrics;
            expect(metrics.totalDecisions).toBe(0);
            expect(metrics.averageThinkingTime).toBe(0);
            expect(metrics.errorCount).toBe(0);
        });
    });

    describe('decideAction', () => {
        test('should return a decision within time limit', async () => {
            const context = createMockContext();
            aiController.setMockThinkingTime(100);

            const decision = await aiController.decideAction(context);

            expect(decision).toBeDefined();
            expect(decision.type).toBe(AIActionType.WAIT);
            expect(decision.reasoning).toBe('Mock decision');
        });

        test('should handle timeout and return fallback action', async () => {
            const context = createMockContext();
            aiController.setMockThinkingTime(3000); // Longer than timeout

            const decision = await aiController.decideAction(context);

            expect(decision).toBeDefined();
            expect(decision.type).toBe(AIActionType.WAIT);
            expect(decision.reasoning).toContain('timeout');
        });

        test('should update performance metrics after decision', async () => {
            const context = createMockContext();

            await aiController.decideAction(context);

            const metrics = aiController.metrics;
            expect(metrics.totalDecisions).toBe(1);
            expect(metrics.averageThinkingTime).toBeGreaterThan(0);
        });

        test('should track thinking state correctly', async () => {
            const context = createMockContext();

            expect(aiController.isCurrentlyThinking).toBe(false);

            const decisionPromise = aiController.decideAction(context);

            // Note: This test is timing-dependent and might be flaky
            // In a real implementation, you might want to use more sophisticated mocking

            await decisionPromise;

            expect(aiController.isCurrentlyThinking).toBe(false);
            expect(aiController.lastThinkingTime).toBeGreaterThan(0);
        });
    });

    describe('getValidActions', () => {
        test('should always include wait action', () => {
            const context = createMockContext();

            const actions = aiController.testGetValidActions(context);

            const waitAction = actions.find(action => action.type === AIActionType.WAIT);
            expect(waitAction).toBeDefined();
        });

        test('should include movement actions when movement system is available', () => {
            const context = createMockContext({
                mapData: { width: 10, height: 10, tiles: [] } as MapData,
            });

            const actions = aiController.testGetValidActions(context);

            const moveActions = actions.filter(action => action.type === AIActionType.MOVE);
            expect(moveActions.length).toBeGreaterThan(0);
        });

        test('should include attack actions when enemies are visible', () => {
            const enemy = createMockUnit({ id: 'enemy', faction: 'enemy' });
            const context = createMockContext({
                visibleEnemies: [enemy],
            });

            const actions = aiController.testGetValidActions(context);

            const attackActions = actions.filter(action => action.type === AIActionType.ATTACK);
            expect(attackActions.length).toBeGreaterThan(0);
        });

        test('should include skill actions when skills are available', () => {
            const enemy = createMockUnit({ id: 'enemy', faction: 'enemy' });
            const context = createMockContext({
                visibleEnemies: [enemy],
                availableSkills: ['fireball'],
            });

            const actions = aiController.testGetValidActions(context);

            const skillActions = actions.filter(action => action.type === AIActionType.SKILL);
            expect(skillActions.length).toBeGreaterThan(0);
        });
    });

    describe('evaluateAttackTarget', () => {
        test('should give higher priority to NPCs', () => {
            const normalEnemy = createMockUnit({ id: 'normal', faction: 'enemy' });
            const npcEnemy = createMockUnit({ id: 'npc', faction: 'enemy' });
            const context = createMockContext();

            // Mock NPC detection
            (mockIntegration.recruitmentSystem!.isNPC as jest.Mock)
                .mockImplementation((unit: Unit) => unit.id === 'npc');

            const normalPriority = aiController.testEvaluateAttackTarget(normalEnemy, context);
            const npcPriority = aiController.testEvaluateAttackTarget(npcEnemy, context);

            expect(npcPriority).toBeGreaterThan(normalPriority);
        });

        test('should give higher priority to low health enemies', () => {
            const healthyEnemy = createMockUnit({
                id: 'healthy',
                faction: 'enemy',
                currentHP: 100,
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const injuredEnemy = createMockUnit({
                id: 'injured',
                faction: 'enemy',
                currentHP: 20,
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const context = createMockContext();

            const healthyPriority = aiController.testEvaluateAttackTarget(healthyEnemy, context);
            const injuredPriority = aiController.testEvaluateAttackTarget(injuredEnemy, context);

            expect(injuredPriority).toBeGreaterThan(healthyPriority);
        });

        test('should consider distance in priority calculation', () => {
            const nearEnemy = createMockUnit({
                id: 'near',
                faction: 'enemy',
                position: { x: 6, y: 5 } // Distance 1 from unit at (5,5)
            });
            const farEnemy = createMockUnit({
                id: 'far',
                faction: 'enemy',
                position: { x: 10, y: 10 } // Distance 10 from unit at (5,5)
            });
            const context = createMockContext();

            const nearPriority = aiController.testEvaluateAttackTarget(nearEnemy, context);
            const farPriority = aiController.testEvaluateAttackTarget(farEnemy, context);

            expect(nearPriority).toBeGreaterThan(farPriority);
        });
    });

    describe('calculateDistance', () => {
        test('should calculate Manhattan distance correctly', () => {
            const pos1 = { x: 0, y: 0 };
            const pos2 = { x: 3, y: 4 };

            const distance = aiController.testCalculateDistance(pos1, pos2);

            expect(distance).toBe(7); // |3-0| + |4-0| = 7
        });

        test('should handle same position', () => {
            const pos = { x: 5, y: 5 };

            const distance = aiController.testCalculateDistance(pos, pos);

            expect(distance).toBe(0);
        });

        test('should handle negative coordinates', () => {
            const pos1 = { x: -2, y: -3 };
            const pos2 = { x: 1, y: 2 };

            const distance = aiController.testCalculateDistance(pos1, pos2);

            expect(distance).toBe(8); // |1-(-2)| + |2-(-3)| = 3 + 5 = 8
        });
    });

    describe('applyRandomFactor', () => {
        test('should modify score within expected range', () => {
            const baseScore = 50;
            const modifiedScore = aiController.testApplyRandomFactor(baseScore);

            // The random factor should not change the score too dramatically
            expect(modifiedScore).toBeGreaterThan(baseScore * 0.8);
            expect(modifiedScore).toBeLessThan(baseScore * 1.2);
        });

        test('should return different values on multiple calls', () => {
            const baseScore = 50;
            const scores = [];

            for (let i = 0; i < 10; i++) {
                scores.push(aiController.testApplyRandomFactor(baseScore));
            }

            // Not all scores should be identical (very low probability)
            const uniqueScores = new Set(scores);
            expect(uniqueScores.size).toBeGreaterThan(1);
        });
    });

    describe('shouldMakeMistake', () => {
        test('should respect mistake probability', () => {
            // Set high mistake probability
            mockDifficulty.mistakeProbability = 0.9;

            let mistakes = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                if (aiController.testShouldMakeMistake()) {
                    mistakes++;
                }
            }

            // Should make mistakes roughly 90% of the time (with some variance)
            expect(mistakes).toBeGreaterThan(trials * 0.7);
            expect(mistakes).toBeLessThan(trials);
        });

        test('should rarely make mistakes with low probability', () => {
            // Set low mistake probability
            mockDifficulty.mistakeProbability = 0.1;

            let mistakes = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                if (aiController.testShouldMakeMistake()) {
                    mistakes++;
                }
            }

            // Should make mistakes roughly 10% of the time (with some variance)
            expect(mistakes).toBeLessThan(trials * 0.3);
        });
    });

    describe('Error Handling', () => {
        test('should handle decision errors gracefully', async () => {
            const context = createMockContext();

            // Create a controller that throws an error
            const errorController = new (class extends MockAIController {
                protected async makeDecision(context: AIContext): Promise<AIAction> {
                    throw new Error('Test error');
                }
            })(mockUnit, mockPersonality, mockDifficulty, mockConfig, mockIntegration);

            const decision = await errorController.decideAction(context);

            expect(decision).toBeDefined();
            expect(decision.type).toBe(AIActionType.WAIT);
            expect(decision.reasoning).toContain('error');
        });

        test('should handle AI-specific errors', async () => {
            const context = createMockContext();

            // Create a controller that throws an AI error
            const errorController = new (class extends MockAIController {
                protected async makeDecision(context: AIContext): Promise<AIAction> {
                    throw new AIThinkingTimeoutError('Test timeout');
                }
            })(mockUnit, mockPersonality, mockDifficulty, mockConfig, mockIntegration);

            const decision = await errorController.decideAction(context);

            expect(decision).toBeDefined();
            expect(decision.type).toBe(AIActionType.WAIT);
            expect(decision.reasoning).toContain('timeout');
        });
    });

    describe('Performance Metrics', () => {
        test('should track decision count', async () => {
            const context = createMockContext();

            await aiController.decideAction(context);
            await aiController.decideAction(context);
            await aiController.decideAction(context);

            const metrics = aiController.metrics;
            expect(metrics.totalDecisions).toBe(3);
        });

        test('should track action type distribution', async () => {
            const context = createMockContext();

            aiController.setMockDecision({
                type: AIActionType.ATTACK,
                priority: 10,
                reasoning: 'Attack decision',
            });

            await aiController.decideAction(context);

            const metrics = aiController.metrics;
            expect(metrics.actionTypeDistribution[AIActionType.ATTACK]).toBe(1);
        });

        test('should track thinking times', async () => {
            const context = createMockContext();
            aiController.setMockThinkingTime(200);

            await aiController.decideAction(context);

            const metrics = aiController.metrics;
            expect(metrics.averageThinkingTime).toBeGreaterThan(0);
            expect(metrics.maxThinkingTime).toBeGreaterThan(0);
            expect(metrics.minThinkingTime).toBeGreaterThan(0);
        });
    });
});