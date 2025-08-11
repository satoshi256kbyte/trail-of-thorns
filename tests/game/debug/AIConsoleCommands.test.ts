/**
 * AIConsoleCommands Unit Tests
 * 
 * Tests for AI console command system
 */

import { AIConsoleCommands, AICommandResult } from '../../../game/src/debug/AIConsoleCommands';
import { AIDebugManager } from '../../../game/src/debug/AIDebugManager';
import { AIController } from '../../../game/src/systems/AIController';
import {
    AIActionType,
    AIPersonalityType,
    DifficultyLevel,
} from '../../../game/src/types/ai';
import { Unit } from '../../../game/src/types/gameplay';

// Mock dependencies
jest.mock('../../../game/src/debug/AIDebugManager');
jest.mock('../../../game/src/systems/AIController');

describe('AIConsoleCommands', () => {
    let consoleCommands: AIConsoleCommands;
    let mockDebugManager: jest.Mocked<AIDebugManager>;
    let mockAIController: jest.Mocked<AIController>;
    let mockUnit: Unit;

    beforeEach(() => {
        // Create mock debug manager
        mockDebugManager = {
            enableDebugMode: jest.fn(),
            disableDebugMode: jest.fn(),
            toggleDebugMode: jest.fn(),
            clearDebugInfo: jest.fn(),
            logActionSelection: jest.fn(),
            getDebugStatistics: jest.fn().mockReturnValue({
                totalDecisions: 100,
                averageThinkingTime: 500,
                maxThinkingTime: 1200,
                minThinkingTime: 200,
                timeoutCount: 5,
                errorCount: 2,
                actionTypeDistribution: {
                    [AIActionType.MOVE]: 40,
                    [AIActionType.ATTACK]: 35,
                    [AIActionType.SKILL]: 20,
                    [AIActionType.WAIT]: 5,
                },
                personalityDistribution: {
                    [AIPersonalityType.AGGRESSIVE]: 30,
                    [AIPersonalityType.DEFENSIVE]: 25,
                    [AIPersonalityType.SUPPORT]: 25,
                    [AIPersonalityType.TACTICAL]: 20,
                },
                difficultyLevelUsage: {
                    [DifficultyLevel.EASY]: 10,
                    [DifficultyLevel.NORMAL]: 50,
                    [DifficultyLevel.HARD]: 30,
                    [DifficultyLevel.EXPERT]: 10,
                },
            }),
            showThinkingVisualization: jest.fn(),
            updateConfig: jest.fn(),
            generateDebugReport: jest.fn().mockReturnValue('Mock debug report'),
        } as any;

        // Create mock AI controller
        mockAIController = {
            currentUnit: mockUnit,
        } as any;

        // Create mock unit
        mockUnit = {
            id: 'test-unit',
            name: 'Test Unit',
            position: { x: 5, y: 5 },
            stats: {
                level: 1,
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3,
                agility: 10,
                luck: 5,
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
        };

        // Create console commands instance
        consoleCommands = new AIConsoleCommands(mockDebugManager);

        // Mock console.log to avoid test output
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleCommands.destroy();
        jest.restoreAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize console commands', () => {
            expect((window as any).aiDebug).toBeDefined();
            expect(typeof (window as any).aiDebug.help).toBe('function');
            expect(typeof (window as any).aiDebug.enable).toBe('function');
            expect(typeof (window as any).aiDebug.getStats).toBe('function');
        });

        test('should initialize without debug manager', () => {
            const commandsWithoutDebugManager = new AIConsoleCommands();
            expect(commandsWithoutDebugManager).toBeDefined();
            commandsWithoutDebugManager.destroy();
        });
    });

    describe('Debug Control Commands', () => {
        test('should enable debug mode', () => {
            const result = (window as any).aiDebug.enable(true);

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI debug mode enabled');
            expect(mockDebugManager.enableDebugMode).toHaveBeenCalled();
        });

        test('should disable debug mode', () => {
            const result = (window as any).aiDebug.enable(false);

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI debug mode disabled');
            expect(mockDebugManager.disableDebugMode).toHaveBeenCalled();
        });

        test('should toggle debug mode', () => {
            const result = (window as any).aiDebug.toggle();

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI debug mode toggled');
            expect(mockDebugManager.toggleDebugMode).toHaveBeenCalled();
        });

        test('should clear debug info', () => {
            const result = (window as any).aiDebug.clear();

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI debug information cleared');
            expect(mockDebugManager.clearDebugInfo).toHaveBeenCalled();
        });

        test('should handle missing debug manager', () => {
            const commandsWithoutDebugManager = new AIConsoleCommands();

            const result = (window as any).aiDebug.enable(true);

            expect(result.success).toBe(false);
            expect(result.message).toBe('AI Debug Manager not available');

            commandsWithoutDebugManager.destroy();
        });
    });

    describe('AI Behavior Control Commands', () => {
        beforeEach(() => {
            consoleCommands.registerAIController('test-unit', mockAIController);
        });

        test('should set difficulty level', () => {
            const result = (window as any).aiDebug.setDifficulty(3);

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI difficulty set to level 3');
            expect(result.data.level).toBe(3);
        });

        test('should reject invalid difficulty level', () => {
            const result = (window as any).aiDebug.setDifficulty(6);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Difficulty level must be between 1 and 5');
        });

        test('should force move action', () => {
            // First create a mock unit
            (window as any).aiDebug.createMockUnit('test-unit', { name: 'Test Unit' });

            const result = (window as any).aiDebug.forceAction('test-unit', 'move', 3, 4);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Forced move action for test-unit');
            expect(result.data.type).toBe(AIActionType.MOVE);
            expect(result.data.position).toEqual({ x: 3, y: 4 });
        });

        test('should force attack action', () => {
            // Create mock units
            (window as any).aiDebug.createMockUnit('attacker', { name: 'Attacker' });
            (window as any).aiDebug.createMockUnit('target', { name: 'Target' });

            // Register AI controller for the attacker
            consoleCommands.registerAIController('attacker', mockAIController);

            const result = (window as any).aiDebug.forceAction('attacker', 'attack', 'target');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Forced attack action for attacker');
            expect(result.data.type).toBe(AIActionType.ATTACK);
        });

        test('should force wait action', () => {
            (window as any).aiDebug.createMockUnit('test-unit', { name: 'Test Unit' });

            const result = (window as any).aiDebug.forceAction('test-unit', 'wait');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Forced wait action for test-unit');
            expect(result.data.type).toBe(AIActionType.WAIT);
        });

        test('should reject unknown action type', () => {
            (window as any).aiDebug.createMockUnit('test-unit', { name: 'Test Unit' });

            const result = (window as any).aiDebug.forceAction('test-unit', 'unknown');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Unknown action type');
        });

        test('should show thinking visualization', () => {
            (window as any).aiDebug.createMockUnit('test-unit', { name: 'Test Unit' });

            const result = (window as any).aiDebug.showThinking('test-unit');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Showing thinking visualization for test-unit');
            expect(mockDebugManager.showThinkingVisualization).toHaveBeenCalled();
        });
    });

    describe('Statistics and Analysis Commands', () => {
        test('should get AI statistics', () => {
            const result = (window as any).aiDebug.getStats();

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI statistics retrieved');
            expect(result.data.totalDecisions).toBe(100);
            expect(result.data.averageThinkingTime).toBe(500);
            expect(mockDebugManager.getDebugStatistics).toHaveBeenCalled();
        });

        test('should get performance metrics', () => {
            const result = (window as any).aiDebug.getPerformance();

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI performance metrics retrieved');
            expect(result.data.averageThinkingTime).toBe(500);
            expect(result.data.successRate).toBe('98.00%'); // (100-2)/100 * 100
        });

        test('should analyze personalities', () => {
            const result = (window as any).aiDebug.analyzePersonalities();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Personality analysis completed');
            expect(result.data.distribution).toBeDefined();
            expect(result.data.mostUsed).toBe(AIPersonalityType.AGGRESSIVE);
            expect(result.data.recommendations).toBeInstanceOf(Array);
        });

        test('should analyze difficulty', () => {
            const result = (window as any).aiDebug.analyzeDifficulty();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Difficulty analysis completed');
            expect(result.data.levelUsage).toBeDefined();
            expect(result.data.averageThinkingTime).toBe(500);
            expect(result.data.timeoutRate).toBe('5.00%');
            expect(result.data.errorRate).toBe('2.00%');
        });
    });

    describe('Testing and Simulation Commands', () => {
        test('should create mock unit', () => {
            const result = (window as any).aiDebug.createMockUnit('test-unit', {
                name: 'Test Unit',
                attack: 30,
                defense: 20,
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe("Mock AI unit 'test-unit' created");
            expect(result.data.name).toBe('Test Unit');
            expect(result.data.stats.attack).toBe(30);
            expect(result.data.stats.defense).toBe(20);
        });

        test('should create test scenario', () => {
            const result = (window as any).aiDebug.createScenario('test-scenario', {
                characterCount: 6,
                personalityTypes: [AIPersonalityType.AGGRESSIVE, AIPersonalityType.DEFENSIVE],
                difficultyLevel: DifficultyLevel.HARD,
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe("Test scenario 'test-scenario' created");
            expect(result.data.characterCount).toBe(6);
            expect(result.data.difficultyLevel).toBe(DifficultyLevel.HARD);
        });

        test('should run test scenario', () => {
            // First create a scenario
            (window as any).aiDebug.createScenario('test-scenario');

            const result = (window as any).aiDebug.runTest('test-scenario', {
                iterations: 50,
                logResults: true,
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe("Test scenario 'test-scenario' completed");
            expect(result.data.iterations).toBe(50);
            expect(result.data.averageDecisionTime).toBeGreaterThan(0);
        });

        test('should simulate AI decisions', () => {
            (window as any).aiDebug.createMockUnit('test-unit');

            const result = (window as any).aiDebug.simulateDecision('test-unit', 200);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Decision simulation completed for test-unit');
            expect(result.data.iterations).toBe(200);
            expect(result.data.actionDistribution).toBeDefined();
        });
    });

    describe('Configuration Commands', () => {
        test('should set thinking time limit', () => {
            const result = (window as any).aiDebug.setThinkingTimeLimit(1500);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Thinking time limit set to 1500ms');
        });

        test('should reject invalid thinking time limit', () => {
            const result = (window as any).aiDebug.setThinkingTimeLimit(50);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Thinking time limit must be between 100ms and 10000ms');
        });

        test('should set random factor', () => {
            const result = (window as any).aiDebug.setRandomFactor(0.3);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Random factor set to 0.3');
        });

        test('should reject invalid random factor', () => {
            const result = (window as any).aiDebug.setRandomFactor(1.5);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Random factor must be between 0 and 1');
        });
    });

    describe('Visualization Control Commands', () => {
        test('should enable action evaluations display', () => {
            const result = (window as any).aiDebug.showActionEvaluations(true);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Action evaluations display enabled');
            expect(mockDebugManager.updateConfig).toHaveBeenCalledWith({
                showActionEvaluations: true,
            });
        });

        test('should enable thinking visualization', () => {
            const result = (window as any).aiDebug.showThinkingVisualization(true);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Thinking visualization enabled');
            expect(mockDebugManager.updateConfig).toHaveBeenCalledWith({
                showVisualDebug: true,
            });
        });

        test('should enable performance metrics display', () => {
            const result = (window as any).aiDebug.showPerformanceMetrics(true);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Performance metrics display enabled');
            expect(mockDebugManager.updateConfig).toHaveBeenCalledWith({
                showPerformanceMetrics: true,
            });
        });
    });

    describe('Utility Commands', () => {
        test('should list units', () => {
            (window as any).aiDebug.createMockUnit('unit1', { name: 'Unit 1', faction: 'player' });
            (window as any).aiDebug.createMockUnit('unit2', { name: 'Unit 2', faction: 'enemy' });

            const result = (window as any).aiDebug.listUnits();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Found 2 units');
            expect(result.data).toHaveLength(2);
            expect(result.data[0].name).toBe('Unit 1');
            expect(result.data[1].name).toBe('Unit 2');
        });

        test('should list scenarios', () => {
            (window as any).aiDebug.createScenario('scenario1');
            (window as any).aiDebug.createScenario('scenario2', { characterCount: 8 });

            const result = (window as any).aiDebug.listScenarios();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Found 2 test scenarios');
            expect(result.data).toHaveLength(2);
        });

        test('should reset all AI', () => {
            const result = (window as any).aiDebug.resetAI();

            expect(result.success).toBe(true);
            expect(result.message).toBe('All AI controllers reset');
        });

        test('should generate debug report', () => {
            const result = (window as any).aiDebug.generateReport();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Debug report generated and logged to console');
            expect(result.data).toBe('Mock debug report');
            expect(mockDebugManager.generateDebugReport).toHaveBeenCalled();
        });

        test('should show help', () => {
            const result = (window as any).aiDebug.help();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Help information displayed in console');
            expect(result.data).toContain('=== AI Debug Console Commands ===');
        });
    });

    describe('AI Controller Management', () => {
        test('should register AI controller', () => {
            const consoleSpy = jest.spyOn(console, 'log');

            consoleCommands.registerAIController('test-unit', mockAIController);

            expect(consoleSpy).toHaveBeenCalledWith(
                'AI Console Commands: Registered controller for test-unit'
            );
        });

        test('should unregister AI controller', () => {
            const consoleSpy = jest.spyOn(console, 'log');

            consoleCommands.registerAIController('test-unit', mockAIController);
            consoleCommands.unregisterAIController('test-unit');

            expect(consoleSpy).toHaveBeenCalledWith(
                'AI Console Commands: Unregistered controller for test-unit'
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle missing units gracefully', () => {
            const result = (window as any).aiDebug.forceAction('nonexistent', 'move', 1, 1);

            expect(result.success).toBe(false);
            expect(result.message).toBe("AI controller for character 'nonexistent' not found");
        });

        test('should handle missing scenarios gracefully', () => {
            const result = (window as any).aiDebug.runTest('nonexistent');

            expect(result.success).toBe(false);
            expect(result.message).toBe("Test scenario 'nonexistent' not found");
        });

        test('should handle missing debug manager gracefully', () => {
            const commandsWithoutDebugManager = new AIConsoleCommands();

            const result = (window as any).aiDebug.getStats();

            expect(result.success).toBe(false);
            expect(result.message).toBe('AI Debug Manager not available');

            commandsWithoutDebugManager.destroy();
        });
    });

    describe('Cleanup', () => {
        test('should destroy console commands', () => {
            consoleCommands.destroy();

            expect((window as any).aiDebug).toBeUndefined();
        });

        test('should handle destroy when window is undefined', () => {
            const originalWindow = global.window;
            delete (global as any).window;

            expect(() => {
                consoleCommands.destroy();
            }).not.toThrow();

            global.window = originalWindow;
        });
    });
});