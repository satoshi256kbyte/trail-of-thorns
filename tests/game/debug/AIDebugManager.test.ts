/**
 * AIDebugManager Unit Tests
 * 
 * Tests for AI debugging and development support tools
 */

import * as Phaser from 'phaser';
import { AIDebugManager, AIDebugConfig } from '../../../game/src/debug/AIDebugManager';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIDebugInfo,
    AIPerformanceMetrics,
} from '../../../game/src/types/ai';
import { Unit } from '../../../game/src/types/gameplay';

// Mock Phaser scene
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

describe('AIDebugManager', () => {
    let scene: MockScene;
    let debugManager: AIDebugManager;
    let mockUnit: Unit;
    let mockActions: AIAction[];

    beforeEach(() => {
        // Create mock scene
        scene = new MockScene();

        // Mock scene methods and properties
        scene.add = {
            container: jest.fn().mockReturnValue({
                setScrollFactor: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis(),
                add: jest.fn(),
                destroy: jest.fn(),
                removeAll: jest.fn(),
            }),
            text: jest.fn().mockReturnValue({
                setScrollFactor: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setText: jest.fn(),
                destroy: jest.fn(),
                setOrigin: jest.fn().mockReturnThis(),
            }),
            graphics: jest.fn().mockReturnValue({
                setDepth: jest.fn().mockReturnThis(),
                fillStyle: jest.fn().mockReturnThis(),
                lineStyle: jest.fn().mockReturnThis(),
                fillRoundedRect: jest.fn().mockReturnThis(),
                strokeRoundedRect: jest.fn().mockReturnThis(),
                fillCircle: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                strokePath: jest.fn(),
                destroy: jest.fn(),
            }),
        } as any;

        scene.time = {
            now: 1000,
            addEvent: jest.fn().mockReturnValue({
                destroy: jest.fn(),
            }),
        } as any;

        scene.events = {
            emit: jest.fn(),
        } as any;

        // Create debug manager
        debugManager = new AIDebugManager(scene);

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

        // Create mock actions
        mockActions = [
            {
                type: AIActionType.MOVE,
                priority: 30,
                position: { x: 6, y: 5 },
                reasoning: 'Move closer to target',
            },
            {
                type: AIActionType.ATTACK,
                priority: 50,
                target: mockUnit,
                reasoning: 'Attack nearest enemy',
            },
            {
                type: AIActionType.WAIT,
                priority: 10,
                reasoning: 'Wait and observe',
            },
        ];
    });

    afterEach(() => {
        debugManager.disableDebugMode();
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            const config = debugManager.getConfig();

            expect(config.enableThinkingLogs).toBe(true);
            expect(config.showActionEvaluations).toBe(true);
            expect(config.showVisualDebug).toBe(true);
            expect(config.showPerformanceMetrics).toBe(true);
            expect(config.enableConsoleOutput).toBe(true);
        });

        test('should initialize with custom configuration', () => {
            const customConfig: Partial<AIDebugConfig> = {
                enableThinkingLogs: false,
                showActionEvaluations: false,
                textColor: '#ff0000',
                maxLogEntries: 500,
            };

            const customDebugManager = new AIDebugManager(scene, customConfig);
            const config = customDebugManager.getConfig();

            expect(config.enableThinkingLogs).toBe(false);
            expect(config.showActionEvaluations).toBe(false);
            expect(config.textColor).toBe('#ff0000');
            expect(config.maxLogEntries).toBe(500);
        });
    });

    describe('Debug Mode Control', () => {
        test('should enable debug mode', () => {
            debugManager.enableDebugMode();

            expect(scene.events.emit).toHaveBeenCalledWith('ai-debug-mode-enabled');
            expect(scene.add.container).toHaveBeenCalled();
        });

        test('should disable debug mode', () => {
            debugManager.enableDebugMode();
            debugManager.disableDebugMode();

            expect(scene.events.emit).toHaveBeenCalledWith('ai-debug-mode-disabled');
        });

        test('should toggle debug mode', () => {
            // Initially disabled
            debugManager.toggleDebugMode();
            expect(scene.events.emit).toHaveBeenCalledWith('ai-debug-mode-enabled');

            // Now enabled, should disable
            debugManager.toggleDebugMode();
            expect(scene.events.emit).toHaveBeenCalledWith('ai-debug-mode-disabled');
        });

        test('should not enable debug mode twice', () => {
            debugManager.enableDebugMode();
            const firstCallCount = (scene.events.emit as jest.Mock).mock.calls.length;

            debugManager.enableDebugMode();
            const secondCallCount = (scene.events.emit as jest.Mock).mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount);
        });
    });

    describe('Thinking Process Logging', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should log thinking process', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.logThinkingProcess(mockUnit, mockActions);

            const logs = debugManager.getDebugLogs();
            expect(logs).toHaveLength(1);

            const log = logs[0];
            expect(log.characterId).toBe('test-unit');
            expect(log.thinkingLog).toContain('AI Test Unit thinking process started');
            expect(log.thinkingLog).toContain('Evaluating 3 candidate actions:');
            expect(log.actionEvaluations).toHaveLength(3);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[AI Debug] Test Unit thinking:',
                expect.any(Array)
            );

            consoleSpy.mockRestore();
        });

        test('should not log when thinking logs disabled', () => {
            debugManager.updateConfig({ enableThinkingLogs: false });

            debugManager.logThinkingProcess(mockUnit, mockActions);

            const logs = debugManager.getDebugLogs();
            expect(logs).toHaveLength(0);
        });

        test('should not log when debug mode disabled', () => {
            debugManager.disableDebugMode();

            debugManager.logThinkingProcess(mockUnit, mockActions);

            const logs = debugManager.getDebugLogs();
            expect(logs).toHaveLength(0);
        });
    });

    describe('Action Selection Logging', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should log action selection', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const selectedAction = mockActions[1]; // Attack action
            const reasoning = 'Best damage potential';

            // First log thinking process to create a log entry
            debugManager.logThinkingProcess(mockUnit, mockActions);

            // Then log action selection
            debugManager.logActionSelection(selectedAction, reasoning);

            const logs = debugManager.getDebugLogs();
            expect(logs).toHaveLength(1);

            const log = logs[0];
            expect(log.thinkingLog).toContain('Action selected: attack - Best damage potential');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[AI Debug] Action selected: attack - Best damage potential'
            );

            consoleSpy.mockRestore();
        });

        test('should update action statistics', () => {
            const attackAction: AIAction = {
                type: AIActionType.ATTACK,
                priority: 50,
                reasoning: 'Test attack',
            };

            debugManager.logActionSelection(attackAction, 'Test reasoning');

            const stats = debugManager.getDebugStatistics();
            expect(stats.actionTypeDistribution[AIActionType.ATTACK]).toBe(1);
        });
    });

    describe('Performance Metrics Logging', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should log performance metrics', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const metrics: AIPerformanceMetrics = {
                averageThinkingTime: 500,
                maxThinkingTime: 1000,
                minThinkingTime: 200,
                totalDecisions: 10,
                timeoutCount: 1,
                errorCount: 0,
                memoryUsage: 25.5,
                actionTypeDistribution: {
                    [AIActionType.MOVE]: 4,
                    [AIActionType.ATTACK]: 3,
                    [AIActionType.SKILL]: 2,
                    [AIActionType.WAIT]: 1,
                },
            };

            debugManager.logPerformanceMetrics(metrics);

            const stats = debugManager.getDebugStatistics();
            expect(stats.totalDecisions).toBe(10);
            expect(stats.averageThinkingTime).toBe(500);
            expect(stats.maxThinkingTime).toBe(1000);
            expect(stats.timeoutCount).toBe(1);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[AI Debug] Performance metrics updated:',
                metrics
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Visual Debug Features', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should show thinking visualization', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.showThinkingVisualization(mockUnit);

            expect(scene.add.container).toHaveBeenCalled();
            expect(scene.add.graphics).toHaveBeenCalled();
            expect(scene.add.text).toHaveBeenCalled();

            expect(consoleSpy).toHaveBeenCalledWith(
                '[AI Debug] Showing thinking visualization for Test Unit'
            );

            consoleSpy.mockRestore();
        });

        test('should show action evaluations', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.showActionEvaluation(mockActions);

            expect(scene.add.container).toHaveBeenCalled();
            expect(scene.add.graphics).toHaveBeenCalled();
            expect(scene.add.text).toHaveBeenCalled();

            expect(consoleSpy).toHaveBeenCalledWith(
                '[AI Debug] Showing evaluation for 3 actions'
            );

            consoleSpy.mockRestore();
        });

        test('should not show visual debug when disabled', () => {
            debugManager.updateConfig({ showVisualDebug: false });

            debugManager.showThinkingVisualization(mockUnit);

            // Should not create visual elements
            expect(scene.add.graphics).not.toHaveBeenCalled();
        });
    });

    describe('Debug Information Management', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should limit log entries', () => {
            debugManager.updateConfig({ maxLogEntries: 2 });

            // Add 3 log entries
            for (let i = 0; i < 3; i++) {
                const unit = { ...mockUnit, id: `unit-${i}` };
                debugManager.logThinkingProcess(unit, mockActions);
            }

            const logs = debugManager.getDebugLogs();
            expect(logs).toHaveLength(2);
            expect(logs[0].characterId).toBe('unit-1');
            expect(logs[1].characterId).toBe('unit-2');
        });

        test('should clear debug information', () => {
            debugManager.logThinkingProcess(mockUnit, mockActions);
            debugManager.showThinkingVisualization(mockUnit);

            expect(debugManager.getDebugLogs()).toHaveLength(1);

            debugManager.clearDebugInfo();

            expect(debugManager.getDebugLogs()).toHaveLength(0);

            const stats = debugManager.getDebugStatistics();
            expect(stats.totalDecisions).toBe(0);
        });

        test('should get recent debug logs', () => {
            // Add multiple log entries
            for (let i = 0; i < 5; i++) {
                const unit = { ...mockUnit, id: `unit-${i}` };
                debugManager.logThinkingProcess(unit, mockActions);
            }

            const recentLogs = debugManager.getDebugLogs(3);
            expect(recentLogs).toHaveLength(3);
            expect(recentLogs[0].characterId).toBe('unit-2');
            expect(recentLogs[2].characterId).toBe('unit-4');
        });
    });

    describe('Debug Report Generation', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should generate comprehensive debug report', () => {
            // Add some test data
            debugManager.logThinkingProcess(mockUnit, mockActions);
            debugManager.logActionSelection(mockActions[1], 'Test selection');

            const metrics: AIPerformanceMetrics = {
                averageThinkingTime: 750,
                maxThinkingTime: 1200,
                minThinkingTime: 300,
                totalDecisions: 5,
                timeoutCount: 1,
                errorCount: 0,
                memoryUsage: 30.2,
                actionTypeDistribution: {
                    [AIActionType.ATTACK]: 3,
                    [AIActionType.MOVE]: 2,
                },
            };
            debugManager.logPerformanceMetrics(metrics);

            const report = debugManager.generateDebugReport();

            expect(report).toContain('=== AI Debug Report ===');
            expect(report).toContain('【Performance Metrics】');
            expect(report).toContain('Total Decisions: 5');
            expect(report).toContain('Average Thinking Time: 750.00ms');
            expect(report).toContain('【Action Type Distribution】');
            expect(report).toContain('attack: 3 (60.0%)');
            expect(report).toContain('【Recent Debug Logs】');
            expect(report).toContain('Character: test-unit');
        });
    });

    describe('Configuration Updates', () => {
        test('should update configuration', () => {
            const newConfig: Partial<AIDebugConfig> = {
                enableThinkingLogs: false,
                textColor: '#ff00ff',
                maxLogEntries: 2000,
            };

            debugManager.updateConfig(newConfig);

            const config = debugManager.getConfig();
            expect(config.enableThinkingLogs).toBe(false);
            expect(config.textColor).toBe('#ff00ff');
            expect(config.maxLogEntries).toBe(2000);

            // Other settings should remain unchanged
            expect(config.showActionEvaluations).toBe(true);
            expect(config.showVisualDebug).toBe(true);
        });
    });

    describe('Update Loop', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should handle update loop', () => {
            const time = 2000;
            const delta = 16.67;

            // Should not throw errors
            expect(() => {
                debugManager.update(time, delta);
            }).not.toThrow();
        });

        test('should not update when disabled', () => {
            debugManager.disableDebugMode();

            const time = 2000;
            const delta = 16.67;

            // Should not throw errors and should exit early
            expect(() => {
                debugManager.update(time, delta);
            }).not.toThrow();
        });
    });
});