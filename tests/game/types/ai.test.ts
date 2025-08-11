/**
 * AI型定義のユニットテスト
 * 型の妥当性検証とタイプガード関数のテスト
 */

import {
    ActionType,
    BehaviorResult,
    AIError,
    AIPersonalityType,
    DifficultyLevel,
    AIAction,
    AIContext,
    AIPersonality,
    DifficultySettings,
    AIEvaluationMetrics,
    AIThinkingState,
    AIPerformanceStats,
    BehaviorNode,
    ActionEvaluator,
    AIErrorInfo,
    AIRecoveryAction,
    AIDebugInfo,
    AIConfigOptions,
    isAIAction,
    isAIContext,
    isAIPersonality,
    isDifficultySettings
} from '../../../game/src/types/ai';
import { Unit } from '../../../game/src/types/gameplay';
import { Position } from '../../../game/src/types/movement';
import { Skill } from '../../../game/src/types/skill';

describe('AI Types', () => {
    // ========================================
    // 列挙型のテスト
    // ========================================

    describe('Enums', () => {
        test('ActionType should have all required values', () => {
            expect(ActionType.MOVE).toBe('move');
            expect(ActionType.ATTACK).toBe('attack');
            expect(ActionType.SKILL).toBe('skill');
            expect(ActionType.WAIT).toBe('wait');
            expect(ActionType.DEFEND).toBe('defend');
        });

        test('BehaviorResult should have all required values', () => {
            expect(BehaviorResult.SUCCESS).toBe('success');
            expect(BehaviorResult.FAILURE).toBe('failure');
            expect(BehaviorResult.RUNNING).toBe('running');
        });

        test('AIError should have all required values', () => {
            expect(AIError.THINKING_TIMEOUT).toBe('thinking_timeout');
            expect(AIError.INVALID_ACTION).toBe('invalid_action');
            expect(AIError.DATA_CORRUPTION).toBe('data_corruption');
            expect(AIError.MEMORY_SHORTAGE).toBe('memory_shortage');
            expect(AIError.UNEXPECTED_ERROR).toBe('unexpected_error');
        });

        test('AIPersonalityType should have all required values', () => {
            expect(AIPersonalityType.AGGRESSIVE).toBe('aggressive');
            expect(AIPersonalityType.DEFENSIVE).toBe('defensive');
            expect(AIPersonalityType.SUPPORT).toBe('support');
            expect(AIPersonalityType.TACTICAL).toBe('tactical');
            expect(AIPersonalityType.BALANCED).toBe('balanced');
        });

        test('DifficultyLevel should have all required values', () => {
            expect(DifficultyLevel.EASY).toBe(1);
            expect(DifficultyLevel.NORMAL).toBe(2);
            expect(DifficultyLevel.HARD).toBe(3);
            expect(DifficultyLevel.EXPERT).toBe(4);
            expect(DifficultyLevel.MASTER).toBe(5);
        });
    });

    // ========================================
    // モックデータの作成
    // ========================================

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

    const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
        id: 'test-skill',
        name: 'Test Skill',
        type: 'attack',
        mpCost: 10,
        range: 1,
        area: 1,
        power: 50,
        accuracy: 90,
        cooldown: 0,
        description: 'Test skill',
        ...overrides
    });

    const createMockAIAction = (overrides: Partial<AIAction> = {}): AIAction => ({
        type: ActionType.ATTACK,
        character: createMockUnit(),
        priority: 50,
        evaluationScore: 75,
        ...overrides
    });

    const createMockAIContext = (overrides: Partial<AIContext> = {}): AIContext => ({
        currentCharacter: createMockUnit(),
        gameState: {},
        visibleEnemies: [createMockUnit({ faction: 'enemy' })],
        visibleAllies: [createMockUnit({ faction: 'player' })],
        npcs: [],
        availableSkills: [createMockSkill()],
        terrainData: {},
        turnNumber: 1,
        difficultySettings: {
            level: DifficultyLevel.NORMAL,
            thinkingDepth: 3,
            randomnessFactor: 0.2,
            mistakeProbability: 0.1,
            reactionTime: 1000,
            skillUsageFrequency: 0.5,
            thinkingTimeLimit: 2000
        },
        actionHistory: [],
        ...overrides
    });

    const createMockAIPersonality = (overrides: Partial<AIPersonality> = {}): AIPersonality => ({
        type: AIPersonalityType.BALANCED,
        aggressiveness: 0.5,
        defensiveness: 0.5,
        supportiveness: 0.5,
        tacticalness: 0.5,
        riskTolerance: 0.5,
        getActionModifier: jest.fn().mockReturnValue(1.0),
        shouldTakeRisk: jest.fn().mockReturnValue(true),
        getPriorityModifier: jest.fn().mockReturnValue(1.0),
        ...overrides
    });

    const createMockDifficultySettings = (overrides: Partial<DifficultySettings> = {}): DifficultySettings => ({
        level: DifficultyLevel.NORMAL,
        thinkingDepth: 3,
        randomnessFactor: 0.2,
        mistakeProbability: 0.1,
        reactionTime: 1000,
        skillUsageFrequency: 0.5,
        thinkingTimeLimit: 2000,
        ...overrides
    });

    // ========================================
    // 型ガード関数のテスト
    // ========================================

    describe('Type Guards', () => {
        describe('isAIAction', () => {
            test('should return true for valid AIAction', () => {
                const validAction = createMockAIAction();
                expect(isAIAction(validAction)).toBe(true);
            });

            test('should return false for invalid objects', () => {
                expect(isAIAction(null)).toBe(false);
                expect(isAIAction(undefined)).toBe(false);
                expect(isAIAction({})).toBe(false);
                expect(isAIAction({ type: 'invalid' })).toBe(false);
                expect(isAIAction({ type: ActionType.MOVE })).toBe(false); // missing required fields
            });

            test('should return false for objects missing required fields', () => {
                const incompleteAction = {
                    type: ActionType.MOVE,
                    character: createMockUnit()
                    // missing priority and evaluationScore
                };
                expect(isAIAction(incompleteAction)).toBe(false);
            });
        });

        describe('isAIContext', () => {
            test('should return true for valid AIContext', () => {
                const validContext = createMockAIContext();
                expect(isAIContext(validContext)).toBe(true);
            });

            test('should return false for invalid objects', () => {
                expect(isAIContext(null)).toBe(false);
                expect(isAIContext(undefined)).toBe(false);
                expect(isAIContext({})).toBe(false);
            });

            test('should return false for objects with invalid array fields', () => {
                const invalidContext = {
                    currentCharacter: createMockUnit(),
                    visibleEnemies: 'not an array',
                    visibleAllies: [],
                    npcs: [],
                    turnNumber: 1
                };
                expect(isAIContext(invalidContext)).toBe(false);
            });
        });

        describe('isAIPersonality', () => {
            test('should return true for valid AIPersonality', () => {
                const validPersonality = createMockAIPersonality();
                expect(isAIPersonality(validPersonality)).toBe(true);
            });

            test('should return false for invalid objects', () => {
                expect(isAIPersonality(null)).toBe(false);
                expect(isAIPersonality(undefined)).toBe(false);
                expect(isAIPersonality({})).toBe(false);
            });

            test('should return false for objects with invalid personality type', () => {
                const invalidPersonality = {
                    type: 'invalid_type',
                    aggressiveness: 0.5,
                    defensiveness: 0.5,
                    supportiveness: 0.5,
                    tacticalness: 0.5,
                    riskTolerance: 0.5
                };
                expect(isAIPersonality(invalidPersonality)).toBe(false);
            });

            test('should return false for objects with non-numeric personality values', () => {
                const invalidPersonality = {
                    type: AIPersonalityType.BALANCED,
                    aggressiveness: 'not a number',
                    defensiveness: 0.5,
                    supportiveness: 0.5,
                    tacticalness: 0.5,
                    riskTolerance: 0.5
                };
                expect(isAIPersonality(invalidPersonality)).toBe(false);
            });
        });

        describe('isDifficultySettings', () => {
            test('should return true for valid DifficultySettings', () => {
                const validSettings = createMockDifficultySettings();
                expect(isDifficultySettings(validSettings)).toBe(true);
            });

            test('should return false for invalid objects', () => {
                expect(isDifficultySettings(null)).toBe(false);
                expect(isDifficultySettings(undefined)).toBe(false);
                expect(isDifficultySettings({})).toBe(false);
            });

            test('should return false for objects with invalid difficulty level', () => {
                const invalidSettings = {
                    level: 999, // invalid level
                    thinkingDepth: 3,
                    randomnessFactor: 0.2,
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.5,
                    thinkingTimeLimit: 2000
                };
                expect(isDifficultySettings(invalidSettings)).toBe(false);
            });

            test('should return false for objects with non-numeric values', () => {
                const invalidSettings = {
                    level: DifficultyLevel.NORMAL,
                    thinkingDepth: 'not a number',
                    randomnessFactor: 0.2,
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.5,
                    thinkingTimeLimit: 2000
                };
                expect(isDifficultySettings(invalidSettings)).toBe(false);
            });
        });
    });

    // ========================================
    // インターフェースの構造テスト
    // ========================================

    describe('Interface Structure', () => {
        test('AIAction should have all required properties', () => {
            const action = createMockAIAction({
                type: ActionType.SKILL,
                target: createMockUnit({ faction: 'enemy' }),
                targetPosition: { x: 5, y: 5 },
                skill: createMockSkill(),
                reasoning: 'Test reasoning',
                estimatedDuration: 1500
            });

            expect(action.type).toBe(ActionType.SKILL);
            expect(action.character).toBeDefined();
            expect(action.target).toBeDefined();
            expect(action.targetPosition).toEqual({ x: 5, y: 5 });
            expect(action.skill).toBeDefined();
            expect(action.priority).toBeGreaterThanOrEqual(0);
            expect(action.evaluationScore).toBeGreaterThanOrEqual(0);
            expect(action.reasoning).toBe('Test reasoning');
            expect(action.estimatedDuration).toBe(1500);
        });

        test('AIContext should have all required properties', () => {
            const context = createMockAIContext({
                turnNumber: 5,
                actionHistory: [createMockAIAction()]
            });

            expect(context.currentCharacter).toBeDefined();
            expect(context.gameState).toBeDefined();
            expect(Array.isArray(context.visibleEnemies)).toBe(true);
            expect(Array.isArray(context.visibleAllies)).toBe(true);
            expect(Array.isArray(context.npcs)).toBe(true);
            expect(Array.isArray(context.availableSkills)).toBe(true);
            expect(context.terrainData).toBeDefined();
            expect(context.turnNumber).toBe(5);
            expect(context.difficultySettings).toBeDefined();
            expect(Array.isArray(context.actionHistory)).toBe(true);
        });

        test('AIPersonality should have all required methods', () => {
            const personality = createMockAIPersonality();

            expect(typeof personality.getActionModifier).toBe('function');
            expect(typeof personality.shouldTakeRisk).toBe('function');
            expect(typeof personality.getPriorityModifier).toBe('function');

            // Test method calls
            expect(personality.getActionModifier(ActionType.ATTACK)).toBeDefined();
            expect(personality.shouldTakeRisk(0.5)).toBeDefined();
            expect(personality.getPriorityModifier(createMockUnit())).toBeDefined();
        });

        test('DifficultySettings should have valid ranges', () => {
            const settings = createMockDifficultySettings({
                level: DifficultyLevel.HARD,
                thinkingDepth: 4,
                randomnessFactor: 0.3,
                mistakeProbability: 0.05,
                reactionTime: 800,
                skillUsageFrequency: 0.7,
                thinkingTimeLimit: 1500
            });

            expect(settings.level).toBeGreaterThanOrEqual(1);
            expect(settings.level).toBeLessThanOrEqual(5);
            expect(settings.thinkingDepth).toBeGreaterThanOrEqual(1);
            expect(settings.thinkingDepth).toBeLessThanOrEqual(5);
            expect(settings.randomnessFactor).toBeGreaterThanOrEqual(0);
            expect(settings.randomnessFactor).toBeLessThanOrEqual(1);
            expect(settings.mistakeProbability).toBeGreaterThanOrEqual(0);
            expect(settings.mistakeProbability).toBeLessThanOrEqual(1);
            expect(settings.skillUsageFrequency).toBeGreaterThanOrEqual(0);
            expect(settings.skillUsageFrequency).toBeLessThanOrEqual(1);
        });
    });

    // ========================================
    // 複合型のテスト
    // ========================================

    describe('Complex Types', () => {
        test('AIEvaluationMetrics should have valid score ranges', () => {
            const metrics: AIEvaluationMetrics = {
                positionalAdvantage: 0.8,
                threatLevel: 0.3,
                terrainBonus: 0.6,
                teamworkScore: 0.7,
                objectiveScore: 0.9
            };

            Object.values(metrics).forEach(score => {
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(1);
            });
        });

        test('AIThinkingState should track thinking progress', () => {
            const thinkingState: AIThinkingState = {
                startTime: Date.now(),
                currentPhase: 'evaluating',
                candidateActions: [createMockAIAction()],
                bestAction: createMockAIAction(),
                progress: 0.6,
                debugInfo: ['Analyzing enemy positions', 'Calculating movement options']
            };

            expect(thinkingState.startTime).toBeGreaterThan(0);
            expect(['analyzing', 'evaluating', 'deciding', 'validating']).toContain(thinkingState.currentPhase);
            expect(Array.isArray(thinkingState.candidateActions)).toBe(true);
            expect(thinkingState.progress).toBeGreaterThanOrEqual(0);
            expect(thinkingState.progress).toBeLessThanOrEqual(1);
            expect(Array.isArray(thinkingState.debugInfo)).toBe(true);
        });

        test('AIPerformanceStats should track performance metrics', () => {
            const stats: AIPerformanceStats = {
                averageThinkingTime: 1200,
                maxThinkingTime: 1800,
                timeoutCount: 2,
                totalActions: 50,
                successfulActions: 47,
                errorCount: 3,
                memoryUsage: 1024 * 1024 // 1MB
            };

            expect(stats.averageThinkingTime).toBeGreaterThan(0);
            expect(stats.maxThinkingTime).toBeGreaterThanOrEqual(stats.averageThinkingTime);
            expect(stats.timeoutCount).toBeGreaterThanOrEqual(0);
            expect(stats.totalActions).toBeGreaterThan(0);
            expect(stats.successfulActions).toBeLessThanOrEqual(stats.totalActions);
            expect(stats.errorCount).toBeGreaterThanOrEqual(0);
            expect(stats.memoryUsage).toBeGreaterThan(0);
        });

        test('BehaviorNode should have proper structure', () => {
            const mockExecute = jest.fn().mockReturnValue(BehaviorResult.SUCCESS);
            const mockCondition = jest.fn().mockReturnValue(true);

            const node: BehaviorNode = {
                id: 'test-node',
                name: 'Test Node',
                execute: mockExecute,
                children: [],
                condition: mockCondition
            };

            expect(node.id).toBe('test-node');
            expect(node.name).toBe('Test Node');
            expect(typeof node.execute).toBe('function');
            expect(Array.isArray(node.children)).toBe(true);
            expect(typeof node.condition).toBe('function');

            // Test method execution
            const context = createMockAIContext();
            expect(node.execute(context)).toBe(BehaviorResult.SUCCESS);
            expect(node.condition!(context)).toBe(true);
        });

        test('AIErrorInfo should contain error details', () => {
            const errorInfo: AIErrorInfo = {
                type: AIError.THINKING_TIMEOUT,
                message: 'AI thinking exceeded time limit',
                timestamp: Date.now(),
                character: createMockUnit(),
                context: createMockAIContext(),
                stackTrace: 'Error stack trace'
            };

            expect(Object.values(AIError)).toContain(errorInfo.type);
            expect(typeof errorInfo.message).toBe('string');
            expect(errorInfo.timestamp).toBeGreaterThan(0);
            expect(errorInfo.character).toBeDefined();
            expect(errorInfo.context).toBeDefined();
            expect(typeof errorInfo.stackTrace).toBe('string');
        });

        test('AIRecoveryAction should provide recovery options', () => {
            const recoveryAction: AIRecoveryAction = {
                type: 'fallback',
                action: createMockAIAction({ type: ActionType.WAIT }),
                description: 'Fallback to wait action due to timeout'
            };

            expect(['fallback', 'retry', 'reset']).toContain(recoveryAction.type);
            expect(recoveryAction.action).toBeDefined();
            expect(typeof recoveryAction.description).toBe('string');
        });

        test('AIDebugInfo should provide debugging information', () => {
            const debugInfo: AIDebugInfo = {
                characterId: 'enemy-001',
                thinkingLog: ['Started thinking', 'Analyzing options', 'Selected action'],
                actionEvaluations: [
                    {
                        action: createMockAIAction(),
                        score: 85,
                        reasoning: 'High damage potential'
                    }
                ],
                performance: {
                    thinkingTime: 1200,
                    memoryUsage: 512 * 1024,
                    cpuUsage: 0.15
                },
                visualization: {
                    movementRange: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
                    attackRange: [{ x: 3, y: 1 }],
                    threatMap: [{ position: { x: 0, y: 0 }, threat: 0.8 }]
                }
            };

            expect(typeof debugInfo.characterId).toBe('string');
            expect(Array.isArray(debugInfo.thinkingLog)).toBe(true);
            expect(Array.isArray(debugInfo.actionEvaluations)).toBe(true);
            expect(debugInfo.performance).toBeDefined();
            expect(debugInfo.visualization).toBeDefined();
        });

        test('AIConfigOptions should have valid configuration', () => {
            const config: AIConfigOptions = {
                debugMode: true,
                logLevel: 'debug',
                thinkingTimeLimit: 2000,
                enableParallelProcessing: true,
                enableCaching: true,
                enableStatistics: true
            };

            expect(typeof config.debugMode).toBe('boolean');
            expect(['error', 'warn', 'info', 'debug']).toContain(config.logLevel);
            expect(config.thinkingTimeLimit).toBeGreaterThan(0);
            expect(typeof config.enableParallelProcessing).toBe('boolean');
            expect(typeof config.enableCaching).toBe('boolean');
            expect(typeof config.enableStatistics).toBe('boolean');
        });
    });

    // ========================================
    // エッジケースのテスト
    // ========================================

    describe('Edge Cases', () => {
        test('should handle boundary values for personality traits', () => {
            const extremePersonality = createMockAIPersonality({
                aggressiveness: 0,
                defensiveness: 1,
                supportiveness: 0.5,
                tacticalness: 1,
                riskTolerance: 0
            });

            expect(extremePersonality.aggressiveness).toBe(0);
            expect(extremePersonality.defensiveness).toBe(1);
            expect(extremePersonality.riskTolerance).toBe(0);
        });

        test('should handle empty arrays in AIContext', () => {
            const emptyContext = createMockAIContext({
                visibleEnemies: [],
                visibleAllies: [],
                npcs: [],
                availableSkills: [],
                actionHistory: []
            });

            expect(isAIContext(emptyContext)).toBe(true);
            expect(emptyContext.visibleEnemies).toHaveLength(0);
            expect(emptyContext.visibleAllies).toHaveLength(0);
            expect(emptyContext.npcs).toHaveLength(0);
            expect(emptyContext.availableSkills).toHaveLength(0);
            expect(emptyContext.actionHistory).toHaveLength(0);
        });

        test('should handle maximum difficulty settings', () => {
            const maxDifficulty = createMockDifficultySettings({
                level: DifficultyLevel.MASTER,
                thinkingDepth: 5,
                randomnessFactor: 0,
                mistakeProbability: 0,
                reactionTime: 100,
                skillUsageFrequency: 1,
                thinkingTimeLimit: 5000
            });

            expect(isDifficultySettings(maxDifficulty)).toBe(true);
            expect(maxDifficulty.level).toBe(DifficultyLevel.MASTER);
            expect(maxDifficulty.thinkingDepth).toBe(5);
            expect(maxDifficulty.randomnessFactor).toBe(0);
            expect(maxDifficulty.mistakeProbability).toBe(0);
            expect(maxDifficulty.skillUsageFrequency).toBe(1);
        });
    });
});