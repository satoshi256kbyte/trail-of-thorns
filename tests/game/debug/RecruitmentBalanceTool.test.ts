/**
 * Tests for RecruitmentBalanceTool
 */

import { RecruitmentBalanceTool } from '../../../game/src/debug/RecruitmentBalanceTool';
import { RecruitmentDebugManager } from '../../../game/src/debug/RecruitmentDebugManager';
import { Unit } from '../../../game/src/types/gameplay';
import {
    RecruitableCharacter,
    RecruitmentCondition,
    RecruitmentConditionType,
    RecruitmentStatus,
    RecruitmentContext,
    RecruitmentResult
} from '../../../game/src/types/recruitment';

// Mock dependencies
jest.mock('../../../game/src/debug/RecruitmentDebugManager');

describe('RecruitmentBalanceTool', () => {
    let balanceTool: RecruitmentBalanceTool;
    let mockDebugManager: jest.Mocked<RecruitmentDebugManager>;
    let mockAttacker: Unit;
    let mockTarget: Unit;
    let mockCondition: RecruitmentCondition;
    let mockCharacter: RecruitableCharacter;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        // Mock console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();

        // Mock RecruitmentDebugManager
        mockDebugManager = {
            startDebugSession: jest.fn(),
            endDebugSession: jest.fn(),
            simulateRecruitment: jest.fn()
        } as any;

        (RecruitmentDebugManager.getInstance as jest.Mock).mockReturnValue(mockDebugManager);

        balanceTool = RecruitmentBalanceTool.getInstance();
        balanceTool.clearResults();

        // Create mock data
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
            currentHP: 80,
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

        mockCharacter = {
            characterId: 'target_1',
            conditions: [mockCondition],
            recruitmentStatus: RecruitmentStatus.AVAILABLE,
            priority: 100,
            description: 'Test recruitable character'
        };
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        jest.clearAllMocks();
        balanceTool.clearResults();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = RecruitmentBalanceTool.getInstance();
            const instance2 = RecruitmentBalanceTool.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Test Configuration Management', () => {
        it('should have default test configurations', () => {
            // Test that default configurations are loaded
            expect(() => balanceTool.clearResults()).not.toThrow();
        });

        it('should allow adding custom test configurations', () => {
            const customConfig = {
                testName: 'Custom Test',
                iterations: 50,
                damageRange: { min: 10, max: 90 },
                turnRange: { min: 1, max: 15 },
                hpThresholds: [0.1, 0.2, 0.3],
                targetSuccessRate: { min: 15, max: 65 },
                performanceThreshold: 8
            };

            balanceTool.addTestConfiguration('custom', customConfig);
            expect(consoleSpy).toHaveBeenCalledWith('Added test configuration: custom');
        });
    });

    describe('Balance Testing', () => {
        beforeEach(() => {
            // Mock debug manager methods
            mockDebugManager.startDebugSession.mockReturnValue('test_session');
            mockDebugManager.endDebugSession.mockReturnValue({
                sessionId: 'test_session',
                startTime: Date.now() - 1000,
                endTime: Date.now(),
                totalAttempts: 10,
                successfulAttempts: 5,
                failedAttempts: 5,
                averageEvaluationTime: 2.5,
                conditionResults: [],
                errors: []
            });
        });

        it('should run balance test with standard configuration', async () => {
            // Mock simulation results - mix of success and failure
            let callCount = 0;
            mockDebugManager.simulateRecruitment.mockImplementation(() => {
                callCount++;
                return {
                    success: callCount % 2 === 0, // Alternate success/failure
                    conditionsMet: [callCount % 2 === 0],
                    nextAction: callCount % 2 === 0 ? 'convert_to_npc' : 'continue_battle'
                };
            });

            const result = await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            expect(result).toBeDefined();
            expect(result.testName).toBe('Standard Balance Test');
            expect(result.characterId).toBe('target_1');
            expect(result.successRate).toBe(50); // 50% success rate from mock
            expect(result.isBalanced).toBeDefined();
            expect(result.performanceAcceptable).toBeDefined();
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });

        it('should handle test configuration not found', async () => {
            await expect(balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'nonexistent'
            )).rejects.toThrow('Test configuration not found: nonexistent');
        });

        it('should generate appropriate recommendations for low success rate', async () => {
            // Mock low success rate
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: false,
                conditionsMet: [false],
                nextAction: 'continue_battle'
            });

            const result = await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            expect(result.successRate).toBe(0);
            expect(result.isBalanced).toBe(false);
            expect(result.recommendations.some(rec =>
                rec.includes('Success rate too low')
            )).toBe(true);
        });

        it('should generate appropriate recommendations for high success rate', async () => {
            // Mock high success rate
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            const result = await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            expect(result.successRate).toBe(100);
            expect(result.isBalanced).toBe(false); // Too high for standard config
            expect(result.recommendations.some(rec =>
                rec.includes('Success rate too high')
            )).toBe(true);
        });

        it('should track condition effectiveness', async () => {
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            const effectiveness = balanceTool.getConditionEffectivenessAnalysis();
            expect(effectiveness.has(RecruitmentConditionType.HP_THRESHOLD)).toBe(true);

            const hpThresholdData = effectiveness.get(RecruitmentConditionType.HP_THRESHOLD);
            expect(hpThresholdData!.totalTests).toBeGreaterThan(0);
        });

        it('should handle performance testing', async () => {
            // Mock slow simulation
            mockDebugManager.simulateRecruitment.mockImplementation(() => {
                // Simulate slow execution
                return {
                    success: true,
                    conditionsMet: [true],
                    nextAction: 'convert_to_npc'
                };
            });

            const result = await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'performance'
            );

            expect(result.performanceAcceptable).toBeDefined();
        });
    });

    describe('Comprehensive Analysis', () => {
        it('should run comprehensive analysis', async () => {
            const characters = [mockCharacter];
            const testUnits = {
                attacker: mockAttacker,
                targets: [mockTarget]
            };

            // Mock consistent results
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            mockDebugManager.startDebugSession.mockReturnValue('comprehensive_test');
            mockDebugManager.endDebugSession.mockReturnValue({
                sessionId: 'comprehensive_test',
                startTime: Date.now() - 2000,
                endTime: Date.now(),
                totalAttempts: 200,
                successfulAttempts: 120,
                failedAttempts: 80,
                averageEvaluationTime: 3.0,
                conditionResults: [],
                errors: []
            });

            const report = await balanceTool.runComprehensiveAnalysis(
                characters,
                testUnits,
                ['standard']
            );

            expect(report).toBeDefined();
            expect(report.totalCharactersTested).toBe(1);
            expect(report.characterResults).toHaveLength(1);
            expect(report.globalRecommendations).toBeDefined();
            expect(report.configurationSuggestions).toBeDefined();
            expect(report.testDate).toBeInstanceOf(Date);
        });

        it('should handle missing target units', async () => {
            const characters = [mockCharacter];
            const testUnits = {
                attacker: mockAttacker,
                targets: [] // No targets
            };

            const report = await balanceTool.runComprehensiveAnalysis(
                characters,
                testUnits
            );

            expect(report.totalCharactersTested).toBe(1);
            expect(report.characterResults).toHaveLength(0); // No results due to missing targets
        });

        it('should generate global recommendations', async () => {
            const characters = [mockCharacter];
            const testUnits = {
                attacker: mockAttacker,
                targets: [mockTarget]
            };

            // Mock low success rate for global recommendations
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: false,
                conditionsMet: [false],
                nextAction: 'continue_battle'
            });

            mockDebugManager.startDebugSession.mockReturnValue('global_test');
            mockDebugManager.endDebugSession.mockReturnValue({
                sessionId: 'global_test',
                startTime: Date.now() - 1000,
                endTime: Date.now(),
                totalAttempts: 100,
                successfulAttempts: 10,
                failedAttempts: 90,
                averageEvaluationTime: 2.0,
                conditionResults: [],
                errors: []
            });

            const report = await balanceTool.runComprehensiveAnalysis(
                characters,
                testUnits,
                ['standard']
            );

            expect(report.globalRecommendations.length).toBeGreaterThan(0);
            expect(report.globalRecommendations.some(rec =>
                rec.includes('success rates are too low')
            )).toBe(true);
        });
    });

    describe('Condition Effectiveness Analysis', () => {
        it('should track condition effectiveness', () => {
            const effectiveness = balanceTool.getConditionEffectivenessAnalysis();

            expect(effectiveness).toBeInstanceOf(Map);
            expect(effectiveness.size).toBeGreaterThan(0);

            // Check that all condition types are tracked
            const conditionTypes = Object.values(RecruitmentConditionType);
            for (const type of conditionTypes) {
                expect(effectiveness.has(type)).toBe(true);
            }
        });

        it('should calculate effectiveness scores', async () => {
            // Run a test to generate effectiveness data
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            const effectiveness = balanceTool.getConditionEffectivenessAnalysis();
            const hpThresholdData = effectiveness.get(RecruitmentConditionType.HP_THRESHOLD);

            expect(hpThresholdData!.effectivenessScore).toBeGreaterThan(0);
            expect(hpThresholdData!.totalTests).toBeGreaterThan(0);
        });
    });

    describe('Data Management', () => {
        it('should export results as JSON', async () => {
            // Run a test to generate data
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            const exportData = balanceTool.exportResults();
            const parsed = JSON.parse(exportData);

            expect(parsed.exportDate).toBeDefined();
            expect(parsed.testResults).toBeDefined();
            expect(parsed.conditionEffectiveness).toBeDefined();
            expect(parsed.testConfigurations).toBeDefined();
        });

        it('should clear results', async () => {
            // Run a test to generate data
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            );

            balanceTool.clearResults();

            const exportData = balanceTool.exportResults();
            const parsed = JSON.parse(exportData);

            expect(parsed.testResults).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle simulation errors gracefully', async () => {
            mockDebugManager.simulateRecruitment.mockImplementation(() => {
                throw new Error('Simulation error');
            });

            // Should not throw, but handle the error internally
            await expect(balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            )).resolves.toBeDefined();
        });

        it('should handle debug manager session errors', async () => {
            mockDebugManager.startDebugSession.mockImplementation(() => {
                throw new Error('Session error');
            });

            await expect(balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'standard'
            )).rejects.toThrow();
        });
    });

    describe('Configuration Suggestions', () => {
        it('should generate configuration suggestions based on results', async () => {
            const characters = [mockCharacter];
            const testUnits = {
                attacker: mockAttacker,
                targets: [mockTarget]
            };

            // Mock slow performance to trigger suggestions
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            mockDebugManager.endDebugSession.mockReturnValue({
                sessionId: 'config_test',
                startTime: Date.now() - 5000,
                endTime: Date.now(),
                totalAttempts: 100,
                successfulAttempts: 80,
                failedAttempts: 20,
                averageEvaluationTime: 10.0, // Slow performance
                conditionResults: [],
                errors: []
            });

            const report = await balanceTool.runComprehensiveAnalysis(
                characters,
                testUnits,
                ['standard']
            );

            expect(Object.keys(report.configurationSuggestions).length).toBeGreaterThan(0);
        });
    });

    describe('Progress Reporting', () => {
        it('should report progress for long tests', async () => {
            // Mock a long test
            mockDebugManager.simulateRecruitment.mockReturnValue({
                success: true,
                conditionsMet: [true],
                nextAction: 'convert_to_npc'
            });

            await balanceTool.runBalanceTest(
                mockCharacter,
                mockAttacker,
                mockTarget,
                'performance' // Uses 1000 iterations
            );

            // Should have logged progress messages
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Balance test completed')
            );
        });
    });
});