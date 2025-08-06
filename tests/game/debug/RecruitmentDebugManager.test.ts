/**
 * Tests for RecruitmentDebugManager
 */

import { RecruitmentDebugManager } from '../../../game/src/debug/RecruitmentDebugManager';
import { Unit } from '../../../game/src/types/gameplay';
import {
    RecruitmentCondition,
    RecruitmentContext,
    RecruitmentResult,
    RecruitmentConditionType,
    NPCState
} from '../../../game/src/types/recruitment';

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
    GameConfig: jest.fn().mockImplementation(() => ({
        getRecruitmentSystemConfig: () => ({
            enableRecruitmentDebug: true,
            enableDetailedLogging: true,
            showConditionCheckDebug: true,
            showNPCStateDebug: true,
            showRecruitmentStatistics: true,
            debugColors: {
                recruitableTarget: 0x00ff88,
                conditionMet: 0x44ff44,
                conditionNotMet: 0xff4444,
                npcState: 0x8844ff,
                recruitmentSuccess: 0x44ff88,
                recruitmentFailure: 0xff8844
            },
            consoleCommands: {
                enableCommands: true,
                commandPrefix: 'recruitment',
                enableSimulation: true,
                enableBalanceTesting: true
            }
        })
    }))
}));

describe('RecruitmentDebugManager', () => {
    let debugManager: RecruitmentDebugManager;
    let mockAttacker: Unit;
    let mockTarget: Unit;
    let mockCondition: RecruitmentCondition;
    let mockContext: RecruitmentContext;

    beforeEach(() => {
        debugManager = RecruitmentDebugManager.getInstance();
        debugManager.clearDebugData();

        mockAttacker = {
            id: 'attacker_1',
            name: 'Test Attacker',
            position: { x: 0, y: 0 },
            stats: { maxHP: 100, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        } as Unit;

        mockTarget = {
            id: 'target_1',
            name: 'Test Target',
            position: { x: 5, y: 5 },
            stats: { maxHP: 80, attack: 18, defense: 20, speed: 8, movement: 2 },
            currentHP: 24, // 30% HP
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        } as Unit;

        mockCondition = {
            id: 'test_condition',
            type: RecruitmentConditionType.HP_THRESHOLD,
            description: 'Target HP must be below 30%',
            parameters: { threshold: 0.3 },
            checkCondition: (context: RecruitmentContext) =>
                (context.target.currentHP / context.target.stats.maxHP) <= 0.3
        };

        mockContext = {
            attacker: mockAttacker,
            target: mockTarget,
            damage: 50,
            turn: 1,
            alliedUnits: [mockAttacker],
            enemyUnits: [mockTarget],
            npcUnits: []
        };
    });

    afterEach(() => {
        debugManager.clearDebugData();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = RecruitmentDebugManager.getInstance();
            const instance2 = RecruitmentDebugManager.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Debug Mode Control', () => {
        it('should enable debug mode', () => {
            debugManager.enableDebug();
            // Debug mode is controlled internally, we can test through other methods
            expect(() => debugManager.enableDebug()).not.toThrow();
        });

        it('should disable debug mode', () => {
            debugManager.disableDebug();
            expect(() => debugManager.disableDebug()).not.toThrow();
        });

        it('should enable detailed logging', () => {
            debugManager.enableDetailedLogging();
            expect(() => debugManager.enableDetailedLogging()).not.toThrow();
        });

        it('should disable detailed logging', () => {
            debugManager.disableDetailedLogging();
            expect(() => debugManager.disableDetailedLogging()).not.toThrow();
        });
    });

    describe('Debug Sessions', () => {
        it('should start a debug session', () => {
            const sessionId = debugManager.startDebugSession('test_session');
            expect(sessionId).toBe('test_session');
        });

        it('should generate session ID if not provided', () => {
            const sessionId = debugManager.startDebugSession();
            expect(sessionId).toMatch(/^debug_session_\d+$/);
        });

        it('should end a debug session', () => {
            const sessionId = debugManager.startDebugSession('test_session');
            const session = debugManager.endDebugSession();

            expect(session).toBeDefined();
            expect(session!.sessionId).toBe('test_session');
            expect(session!.endTime).toBeDefined();
        });

        it('should return null when ending non-existent session', () => {
            const session = debugManager.endDebugSession();
            expect(session).toBeNull();
        });

        it('should track session statistics', () => {
            debugManager.startDebugSession('stats_test');

            // Simulate some recruitment attempts
            const result: RecruitmentResult = {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            };

            debugManager.logRecruitmentAttempt(mockContext, result);

            const session = debugManager.endDebugSession();
            expect(session!.totalAttempts).toBe(1);
            expect(session!.successfulAttempts).toBe(1);
            expect(session!.failedAttempts).toBe(0);
        });
    });

    describe('Condition Evaluation Logging', () => {
        it('should log condition evaluation', () => {
            debugManager.logConditionEvaluation(
                mockCondition,
                mockContext,
                true,
                5,
                undefined
            );

            const history = debugManager.getConditionEvaluationHistory();
            expect(history).toHaveLength(1);
            expect(history[0].conditionId).toBe('test_condition');
            expect(history[0].result).toBe(true);
            expect(history[0].evaluationTime).toBe(5);
        });

        it('should log condition evaluation with error', () => {
            const errorMessage = 'Test error';
            debugManager.logConditionEvaluation(
                mockCondition,
                mockContext,
                false,
                10,
                errorMessage
            );

            const history = debugManager.getConditionEvaluationHistory();
            expect(history).toHaveLength(1);
            expect(history[0].result).toBe(false);
            expect(history[0].errorMessage).toBe(errorMessage);
        });
    });

    describe('Recruitment Attempt Logging', () => {
        it('should log successful recruitment attempt', () => {
            const result: RecruitmentResult = {
                success: true,
                conditionsMet: [true, true],
                nextAction: 'convert_to_npc'
            };

            debugManager.logRecruitmentAttempt(mockContext, result, 'test_stage');

            const stats = debugManager.getStatistics();
            expect(stats.totalAttempts).toBe(1);
            expect(stats.successfulRecruitments).toBe(1);
            expect(stats.failedRecruitments).toBe(0);
            expect(stats.recruitmentsByStage['test_stage']).toBe(1);
        });

        it('should log failed recruitment attempt', () => {
            const result: RecruitmentResult = {
                success: false,
                conditionsMet: [true, false],
                nextAction: 'continue_battle'
            };

            debugManager.logRecruitmentAttempt(mockContext, result);

            const stats = debugManager.getStatistics();
            expect(stats.totalAttempts).toBe(1);
            expect(stats.successfulRecruitments).toBe(0);
            expect(stats.failedRecruitments).toBe(1);
        });

        it('should calculate average conditions met', () => {
            const result1: RecruitmentResult = {
                success: true,
                conditionsMet: [true, true],
                nextAction: 'convert_to_npc'
            };

            const result2: RecruitmentResult = {
                success: false,
                conditionsMet: [true, false],
                nextAction: 'continue_battle'
            };

            debugManager.logRecruitmentAttempt(mockContext, result1);
            debugManager.logRecruitmentAttempt(mockContext, result2);

            const stats = debugManager.getStatistics();
            expect(stats.averageConditionsMet).toBe(75); // (100% + 50%) / 2
        });
    });

    describe('NPC State Logging', () => {
        it('should log NPC creation', () => {
            const npcState: NPCState = {
                convertedAt: Date.now(),
                remainingHP: 50,
                isProtected: false,
                visualState: {
                    indicatorVisible: true,
                    indicatorType: 'crown',
                    tintColor: 0x00ff00,
                    glowEffect: true,
                    animationSpeed: 0.8
                },
                originalFaction: 'enemy',
                recruitmentId: 'test_recruitment'
            };

            debugManager.logNPCStateChange(mockTarget, null, npcState, 'Test creation');

            // Should not throw and should be logged internally
            expect(() => debugManager.logNPCStateChange(mockTarget, null, npcState, 'Test creation')).not.toThrow();
        });

        it('should log NPC removal', () => {
            const npcState: NPCState = {
                convertedAt: Date.now() - 1000,
                remainingHP: 0,
                isProtected: false,
                visualState: {
                    indicatorVisible: true,
                    indicatorType: 'crown',
                    tintColor: 0x00ff00,
                    glowEffect: true,
                    animationSpeed: 0.8
                },
                originalFaction: 'enemy',
                recruitmentId: 'test_recruitment'
            };

            debugManager.logNPCStateChange(mockTarget, npcState, null, 'Test removal');

            const stats = debugManager.getStatistics();
            expect(stats.npcsLost).toBe(1);
        });

        it('should log NPC survival', () => {
            const npcState: NPCState = {
                convertedAt: Date.now() - 2000,
                remainingHP: 30,
                isProtected: true,
                visualState: {
                    indicatorVisible: true,
                    indicatorType: 'crown',
                    tintColor: 0x00ff00,
                    glowEffect: true,
                    animationSpeed: 0.8
                },
                originalFaction: 'enemy',
                recruitmentId: 'test_recruitment'
            };

            debugManager.logNPCSurvival(mockTarget, npcState);

            const stats = debugManager.getStatistics();
            expect(stats.npcsSaved).toBe(1);
        });
    });

    describe('Recruitment Simulation', () => {
        it('should simulate recruitment successfully', () => {
            const conditions = [mockCondition];

            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                conditions,
                50,
                1
            );

            expect(result.success).toBe(true);
            expect(result.conditionsMet).toEqual([true]);
            expect(result.nextAction).toBe('convert_to_npc');
        });

        it('should simulate recruitment failure', () => {
            // Set target HP to high value to fail HP threshold condition
            mockTarget.currentHP = 80;

            const conditions = [mockCondition];

            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                conditions,
                50,
                1
            );

            expect(result.success).toBe(false);
            expect(result.conditionsMet).toEqual([false]);
            expect(result.nextAction).toBe('continue_battle');
        });

        it('should handle condition evaluation errors', () => {
            const errorCondition: RecruitmentCondition = {
                id: 'error_condition',
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                description: 'Error condition',
                parameters: {},
                checkCondition: () => {
                    throw new Error('Test error');
                }
            };

            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                [errorCondition],
                50,
                1
            );

            expect(result.success).toBe(false);
            expect(result.conditionsMet).toEqual([false]);
        });
    });

    describe('Statistics and Reporting', () => {
        it('should provide accurate statistics', () => {
            // Simulate some data
            const successResult: RecruitmentResult = {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            };

            const failResult: RecruitmentResult = {
                success: false,
                conditionsMet: [false],
                nextAction: 'continue_battle'
            };

            debugManager.logRecruitmentAttempt(mockContext, successResult);
            debugManager.logRecruitmentAttempt(mockContext, failResult);

            const stats = debugManager.getStatistics();
            expect(stats.totalAttempts).toBe(2);
            expect(stats.successfulRecruitments).toBe(1);
            expect(stats.failedRecruitments).toBe(1);
        });

        it('should generate debug report', () => {
            // Add some test data
            debugManager.logRecruitmentAttempt(mockContext, {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            const report = debugManager.generateDebugReport();
            expect(report).toContain('Recruitment System Debug Report');
            expect(report).toContain('Total Attempts: 1');
            expect(report).toContain('Successful Recruitments: 1');
        });

        it('should export debug data as JSON', () => {
            debugManager.logRecruitmentAttempt(mockContext, {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            const exportData = debugManager.exportDebugData();
            const parsed = JSON.parse(exportData);

            expect(parsed.statistics).toBeDefined();
            expect(parsed.sessions).toBeDefined();
            expect(parsed.conditionHistory).toBeDefined();
            expect(parsed.exportTime).toBeDefined();
        });
    });

    describe('Data Management', () => {
        it('should clear debug data', () => {
            // Add some data
            debugManager.logRecruitmentAttempt(mockContext, {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            debugManager.clearDebugData();

            const stats = debugManager.getStatistics();
            expect(stats.totalAttempts).toBe(0);
            expect(stats.successfulRecruitments).toBe(0);
            expect(stats.failedRecruitments).toBe(0);

            const history = debugManager.getConditionEvaluationHistory();
            expect(history).toHaveLength(0);

            const sessions = debugManager.getDebugSessions();
            expect(sessions).toHaveLength(0);
        });

        it('should maintain data integrity across operations', () => {
            const sessionId = debugManager.startDebugSession('integrity_test');

            debugManager.logRecruitmentAttempt(mockContext, {
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            debugManager.logConditionEvaluation(mockCondition, mockContext, true, 5);

            const session = debugManager.endDebugSession();
            const stats = debugManager.getStatistics();
            const history = debugManager.getConditionEvaluationHistory();

            expect(session!.totalAttempts).toBe(1);
            expect(stats.totalAttempts).toBe(1);
            expect(history).toHaveLength(1);
        });
    });

    describe('Configuration Updates', () => {
        it('should update from configuration', () => {
            expect(() => debugManager.updateFromConfig()).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty conditions array', () => {
            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                [],
                50,
                1
            );

            expect(result.success).toBe(true); // No conditions to fail
            expect(result.conditionsMet).toEqual([]);
        });

        it('should handle zero damage', () => {
            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                [mockCondition],
                0,
                1
            );

            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });

        it('should handle high turn numbers', () => {
            const result = debugManager.simulateRecruitment(
                mockAttacker,
                mockTarget,
                [mockCondition],
                50,
                999
            );

            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });
    });
});