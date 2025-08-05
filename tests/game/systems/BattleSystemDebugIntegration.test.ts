import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { BattleDebugManager } from '../../../game/src/debug/BattleDebugManager';
import { BattleConsoleCommands } from '../../../game/src/debug/BattleConsoleCommands';
import { Unit } from '../../../game/src/types/battle';
import { MapData } from '../../../game/src/types/gameplay';

// Mock Phaser Scene
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            removeAll: jest.fn(),
            add: jest.fn(),
            destroy: jest.fn(),
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
    },
    time: {
        delayedCall: jest.fn(),
    },
    tweens: {
        add: jest.fn(),
    },
    events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
    },
} as any;

// Mock other dependencies
jest.mock('../../../game/src/systems/AttackRangeCalculator');
jest.mock('../../../game/src/systems/TargetSelector');
jest.mock('../../../game/src/systems/DamageCalculator');
jest.mock('../../../game/src/systems/BattleAnimator');
jest.mock('../../../game/src/systems/BattleStateManager');
jest.mock('../../../game/src/systems/BattleErrorHandler');
jest.mock('../../../game/src/systems/BattlePerformanceManager');
jest.mock('../../../game/src/systems/BattlePerformanceMonitor');
jest.mock('../../../game/src/systems/BattleResourceManager');
jest.mock('../../../game/src/systems/BattleEffectPool');

describe('BattleSystem Debug Integration', () => {
    let battleSystem: BattleSystem;
    let mockUnits: Unit[];
    let mockMapData: MapData;
    let originalWindow: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock window object
        originalWindow = global.window;
        global.window = { ...global.window } as any;

        battleSystem = new BattleSystem(mockScene);

        mockUnits = [
            {
                id: 'player1',
                name: 'Hero',
                position: { x: 0, y: 0 },
                stats: {
                    level: 5,
                    maxHP: 100,
                    maxMP: 50,
                    attack: 30,
                    defense: 20,
                    speed: 15,
                    movement: 3,
                },
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false,
                weapon: {
                    id: 'sword1',
                    name: 'Iron Sword',
                    type: 'sword',
                    attackPower: 25,
                    range: 1,
                    rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                    element: 'none',
                    criticalRate: 5,
                    accuracy: 90,
                    specialEffects: [],
                },
            },
            {
                id: 'enemy1',
                name: 'Goblin',
                position: { x: 2, y: 0 },
                stats: {
                    level: 3,
                    maxHP: 60,
                    maxMP: 20,
                    attack: 20,
                    defense: 15,
                    speed: 10,
                    movement: 2,
                },
                currentHP: 60,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
                weapon: {
                    id: 'club1',
                    name: 'Wooden Club',
                    type: 'club',
                    attackPower: 18,
                    range: 1,
                    rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                    element: 'none',
                    criticalRate: 3,
                    accuracy: 85,
                    specialEffects: [],
                },
            },
        ];

        mockMapData = {
            width: 10,
            height: 10,
            tiles: Array(10).fill(null).map(() =>
                Array(10).fill({ type: 'grass', movementCost: 1, isPassable: true })
            ),
            units: mockUnits,
        };

        battleSystem.initialize(mockUnits, mockMapData);
    });

    afterEach(() => {
        battleSystem.destroy();
        global.window = originalWindow;
    });

    describe('Debug Manager Integration', () => {
        test('should have debug manager initialized', () => {
            const debugManager = battleSystem.getDebugManager();
            expect(debugManager).toBeInstanceOf(BattleDebugManager);
        });

        test('should have console commands initialized', () => {
            const consoleCommands = battleSystem.getConsoleCommands();
            expect(consoleCommands).toBeInstanceOf(BattleConsoleCommands);
            expect((global.window as any).battleCommands).toBeDefined();
        });

        test('should enable/disable debug mode', () => {
            const debugManager = battleSystem.getDebugManager();
            const updateSpy = jest.spyOn(debugManager, 'updateDisplayOptions');

            battleSystem.setDebugMode(true);

            expect(updateSpy).toHaveBeenCalledWith({
                logToConsole: true,
                logToScreen: true,
                enableDetailedLogging: true,
                showAttackRange: true,
                showDamageCalculation: true,
                showBattleStatistics: true,
            });
        });

        test('should generate debug report', () => {
            const debugManager = battleSystem.getDebugManager();
            const reportSpy = jest.spyOn(debugManager, 'generateDebugReport').mockReturnValue('Test report');

            const report = battleSystem.generateDebugReport();

            expect(reportSpy).toHaveBeenCalled();
            expect(report).toBe('Test report');
        });

        test('should get battle statistics', () => {
            const debugManager = battleSystem.getDebugManager();
            const balanceTool = debugManager.getBalanceTool();
            const statsSpy = jest.spyOn(balanceTool, 'getStatistics').mockReturnValue({
                totalBattles: 5,
                totalDamageDealt: 250,
                totalDamageReceived: 0,
                criticalHits: 1,
                missedAttacks: 0,
                averageDamage: 50,
                criticalHitRate: 20,
                hitRate: 100,
                averageBattleDuration: 1200,
                unitsDefeated: 1,
                experienceGained: 75,
            });

            const stats = battleSystem.getBattleStatistics();

            expect(statsSpy).toHaveBeenCalled();
            expect(stats.totalBattles).toBe(5);
            expect(stats.averageDamage).toBe(50);
        });

        test('should reset debug data', () => {
            const debugManager = battleSystem.getDebugManager();
            const clearSpy = jest.spyOn(debugManager, 'clearDebugInfo');
            const balanceTool = debugManager.getBalanceTool();
            const resetSpy = jest.spyOn(balanceTool, 'resetStatistics');

            battleSystem.resetDebugData();

            expect(clearSpy).toHaveBeenCalled();
            expect(resetSpy).toHaveBeenCalled();
        });
    });

    describe('Debug Logging During Battle Flow', () => {
        test('should log debug information during attack initiation', async () => {
            const debugManager = battleSystem.getDebugManager();
            const logStartSpy = jest.spyOn(debugManager, 'logBattlePhaseStart');
            const logEndSpy = jest.spyOn(debugManager, 'logBattlePhaseEnd');

            try {
                await battleSystem.initiateAttack(mockUnits[0]);
            } catch (error) {
                // Expected to fail due to mocked dependencies
            }

            expect(logStartSpy).toHaveBeenCalledWith('range_calculation', mockUnits[0]);
            expect(logEndSpy).toHaveBeenCalled();
        });

        test('should log debug information during target selection', async () => {
            const debugManager = battleSystem.getDebugManager();
            const logStartSpy = jest.spyOn(debugManager, 'logBattlePhaseStart');
            const logEndSpy = jest.spyOn(debugManager, 'logBattlePhaseEnd');

            // Set up battle system state for target selection
            battleSystem['state'].phase = 'target_selection';
            battleSystem['state'].currentAttacker = mockUnits[0];
            battleSystem['state'].currentWeapon = mockUnits[0].weapon;

            try {
                await battleSystem.selectTarget(mockUnits[1]);
            } catch (error) {
                // Expected to fail due to mocked dependencies
            }

            expect(logStartSpy).toHaveBeenCalledWith('target_selection', mockUnits[0], mockUnits[1]);
            expect(logEndSpy).toHaveBeenCalled();
        });

        test('should show attack range debug visualization', () => {
            const debugManager = battleSystem.getDebugManager();
            const showRangeSpy = jest.spyOn(debugManager, 'showAttackRangeDebug');

            battleSystem.showAttackRange(mockUnits[0], mockUnits[0].weapon, [
                { x: 1, y: 0 }, { x: 0, y: 1 }
            ]);

            expect(showRangeSpy).toHaveBeenCalledWith(
                mockUnits[0].position,
                [{ x: 1, y: 0 }, { x: 0, y: 1 }],
                expect.any(Array),
                expect.any(Array)
            );
        });
    });

    describe('Console Commands Integration', () => {
        test('should access console commands through battle system', () => {
            const consoleCommands = battleSystem.getConsoleCommands();
            expect(consoleCommands).toBeDefined();

            // Test that console commands are available on window
            expect((global.window as any).battleCommands).toBeDefined();
            expect(typeof (global.window as any).battleCommands.help).toBe('function');
        });

        test('should create mock units through console commands', () => {
            const result = (global.window as any).battleCommands.createMockUnit('testUnit', {
                name: 'Test Unit',
                attack: 40,
                defense: 25,
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Test Unit');
            expect(result.data.stats.attack).toBe(40);
            expect(result.data.stats.defense).toBe(25);
        });

        test('should test battles through console commands', () => {
            (global.window as any).battleCommands.createMockUnit('attacker', { attack: 30 });
            (global.window as any).battleCommands.createMockUnit('target', { defense: 20 });

            const result = (global.window as any).battleCommands.testBattle('attacker', 'target');

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('attacker');
            expect(result.data).toHaveProperty('target');
            expect(result.data).toHaveProperty('baseDamage');
        });

        test('should simulate battles through console commands', () => {
            (global.window as any).battleCommands.createMockUnit('hero', { attack: 35 });
            (global.window as any).battleCommands.createMockUnit('enemy', { defense: 18 });

            const result = (global.window as any).battleCommands.simulateBattle('hero', 'enemy', 100);

            expect(result.success).toBe(true);
            expect(result.data.simulationCount).toBe(100);
            expect(result.data.statistics).toHaveProperty('averageDamage');
        });

        test('should control debug settings through console commands', () => {
            const debugManager = battleSystem.getDebugManager();
            const updateSpy = jest.spyOn(debugManager, 'updateDisplayOptions');

            (global.window as any).battleCommands.enableDebug(true);

            expect(updateSpy).toHaveBeenCalledWith({
                logToConsole: true,
                logToScreen: true,
                enableDetailedLogging: true,
            });
        });
    });

    describe('Performance Monitoring Integration', () => {
        test('should record performance metrics during debug logging', () => {
            const debugManager = battleSystem.getDebugManager();

            const timestamp1 = debugManager.logBattlePhaseStart('range_calculation', mockUnits[0]);
            setTimeout(() => {
                debugManager.logBattlePhaseEnd(timestamp1);
            }, 10);

            const timestamp2 = debugManager.logBattlePhaseStart('damage_calculation', mockUnits[0], mockUnits[1]);
            setTimeout(() => {
                debugManager.logBattlePhaseEnd(timestamp2);
            }, 15);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.rangeCalculationTime).toHaveLength(1);
            expect(metrics.damageCalculationTime).toHaveLength(1);
        });

        test('should include performance data in debug report', () => {
            const debugManager = battleSystem.getDebugManager();

            // Add some performance data
            const timestamp = debugManager.logBattlePhaseStart('animation', mockUnits[0]);
            debugManager.logBattlePhaseEnd(timestamp);

            const report = debugManager.generateDebugReport();
            expect(report).toContain('パフォーマンスメトリクス');
            expect(report).toContain('アニメーション: 平均');
        });
    });

    describe('Error Handling with Debug Integration', () => {
        test('should log errors in debug system', () => {
            const debugManager = battleSystem.getDebugManager();
            const logEndSpy = jest.spyOn(debugManager, 'logBattlePhaseEnd');

            const timestamp = debugManager.logBattlePhaseStart('damage_calculation', mockUnits[0], mockUnits[1]);
            debugManager.logBattlePhaseEnd(timestamp, undefined, undefined, 'Test error message');

            expect(logEndSpy).toHaveBeenCalledWith(
                timestamp,
                undefined,
                undefined,
                'Test error message'
            );
        });

        test('should handle debug system errors gracefully', () => {
            const debugManager = battleSystem.getDebugManager();

            // Mock an error in debug logging
            jest.spyOn(debugManager, 'logBattlePhaseStart').mockImplementation(() => {
                throw new Error('Debug system error');
            });

            // Battle system should still function even if debug logging fails
            expect(() => {
                battleSystem.showAttackRange(mockUnits[0], mockUnits[0].weapon);
            }).not.toThrow();
        });
    });

    describe('Cleanup and Resource Management', () => {
        test('should clean up debug systems on destroy', () => {
            const debugManager = battleSystem.getDebugManager();
            const consoleCommands = battleSystem.getConsoleCommands();

            const clearSpy = jest.spyOn(debugManager, 'clearDebugInfo');
            const destroySpy = jest.spyOn(consoleCommands, 'destroy');

            battleSystem.destroy();

            expect(clearSpy).toHaveBeenCalled();
            expect(destroySpy).toHaveBeenCalled();
            expect((global.window as any).battleCommands).toBeUndefined();
        });

        test('should handle missing debug systems gracefully', () => {
            // Create battle system without debug systems
            const battleSystemWithoutDebug = new BattleSystem(mockScene);
            battleSystemWithoutDebug['debugManager'] = null as any;
            battleSystemWithoutDebug['consoleCommands'] = null as any;

            expect(() => {
                battleSystemWithoutDebug.destroy();
            }).not.toThrow();
        });
    });

    describe('Configuration Integration', () => {
        test('should update battle system configuration through console commands', () => {
            const result = (global.window as any).battleCommands.setDamageMultiplier(1.5);
            expect(result.success).toBe(true);

            const configResult = (global.window as any).battleCommands.getConfig();
            expect(configResult.data.damageMultiplier).toBe(1.5);
        });

        test('should reflect configuration changes in debug display', () => {
            const debugManager = battleSystem.getDebugManager();
            const updateSpy = jest.spyOn(debugManager, 'updateDisplayOptions');

            (global.window as any).battleCommands.showAttackRangeDebug(false);

            expect(updateSpy).toHaveBeenCalledWith({
                showAttackRange: false,
            });
        });
    });
});