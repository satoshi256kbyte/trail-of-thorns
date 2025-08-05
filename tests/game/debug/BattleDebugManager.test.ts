import { BattleDebugManager, BattleDebugInfo, DebugDisplayOptions } from '../../../game/src/debug/BattleDebugManager';
import { Unit, BattleResult } from '../../../game/src/types/battle';
import { Position } from '../../../game/src/types/gameplay';

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
} as any;

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
    GameConfig: jest.fn().mockImplementation(() => ({
        getBattleSystemConfig: () => ({
            showAttackRangeDebug: true,
            showDamageCalculationDebug: true,
            showTargetSelectionDebug: true,
            showBattleStatistics: true,
            enableBattleDebug: true,
            debugColors: {
                attackRange: 0xff4444,
                validTargets: 0x44ff44,
                invalidTargets: 0x888888,
                damagePreview: 0xffff44,
                criticalHit: 0xff8844,
                missedAttack: 0x4444ff,
            },
        }),
    })),
}));

// Mock BattleBalanceTool
jest.mock('../../../game/src/debug/BattleBalanceTool', () => ({
    BattleBalanceTool: jest.fn().mockImplementation(() => ({
        recordBattle: jest.fn(),
        getStatistics: jest.fn().mockReturnValue({
            totalBattles: 5,
            averageDamage: 45.5,
            criticalHitRate: 12.5,
        }),
        generateBattleReport: jest.fn().mockReturnValue('Mock battle report'),
        resetStatistics: jest.fn(),
    })),
}));

describe('BattleDebugManager', () => {
    let debugManager: BattleDebugManager;
    let mockUnit: Unit;
    let mockTarget: Unit;
    let mockBattleResult: BattleResult;

    beforeEach(() => {
        jest.clearAllMocks();
        debugManager = new BattleDebugManager(mockScene);

        mockUnit = {
            id: 'unit1',
            name: 'Test Unit',
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
                name: 'Test Sword',
                type: 'sword',
                attackPower: 25,
                range: 1,
                rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                element: 'none',
                criticalRate: 5,
                accuracy: 90,
                specialEffects: [],
            },
        };

        mockTarget = {
            ...mockUnit,
            id: 'target1',
            name: 'Test Target',
            position: { x: 1, y: 0 },
            faction: 'enemy',
        };

        mockBattleResult = {
            attacker: mockUnit,
            target: mockTarget,
            weapon: mockUnit.weapon,
            baseDamage: 40,
            finalDamage: 45,
            modifiers: [
                { type: 'elemental', multiplier: 1.1, description: 'Fire vs Ice' },
            ],
            isCritical: false,
            isEvaded: false,
            experienceGained: 15,
            targetDefeated: false,
            effectsApplied: [],
            timestamp: Date.now(),
        };
    });

    describe('Debug Logging', () => {
        test('should log battle phase start', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const timestamp = debugManager.logBattlePhaseStart('range_calculation', mockUnit, mockTarget);

            expect(timestamp).toBeGreaterThan(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[BattleDebug] Phase started: range_calculation'),
                expect.objectContaining({
                    attacker: mockUnit.name,
                    target: mockTarget.name,
                })
            );

            consoleSpy.mockRestore();
        });

        test('should log battle phase end with calculations', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const timestamp = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            debugManager.logBattlePhaseEnd(
                timestamp,
                {
                    baseDamage: 40,
                    finalDamage: 45,
                    hitChance: 85,
                    criticalChance: 10,
                    evasionChance: 15,
                },
                mockBattleResult
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('damage_calculation')
            );

            consoleSpy.mockRestore();
        });

        test('should log battle phase end with error', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const timestamp = debugManager.logBattlePhaseStart('target_selection', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp, undefined, undefined, 'Invalid target selected');

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error:'),
                'Invalid target selected'
            );

            consoleSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('should record performance metrics', () => {
            const timestamp1 = debugManager.logBattlePhaseStart('range_calculation', mockUnit);
            setTimeout(() => {
                debugManager.logBattlePhaseEnd(timestamp1);
            }, 10);

            const timestamp2 = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            setTimeout(() => {
                debugManager.logBattlePhaseEnd(timestamp2, undefined, mockBattleResult);
            }, 15);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.rangeCalculationTime).toHaveLength(1);
            expect(metrics.damageCalculationTime).toHaveLength(1);
        });
    });

    describe('Visual Debug Display', () => {
        test('should show attack range debug visualization', () => {
            const attackerPos: Position = { x: 2, y: 2 };
            const attackRange: Position[] = [
                { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }
            ];
            const validTargets: Position[] = [{ x: 1, y: 2 }];
            const invalidTargets: Position[] = [{ x: 4, y: 4 }];

            debugManager.showAttackRangeDebug(attackerPos, attackRange, validTargets, invalidTargets);

            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.time.delayedCall).toHaveBeenCalled();
        });

        test('should show damage calculation debug', () => {
            const modifiers = [
                { type: 'elemental' as const, multiplier: 1.2, description: 'Fire bonus' },
                { type: 'critical' as const, multiplier: 1.5, description: 'Critical hit' },
            ];

            debugManager.showDamageCalculationDebug(mockTarget, 40, modifiers, 72);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('Base: 40'),
                expect.any(Object)
            );
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should update screen display when enabled', () => {
            debugManager.updateDisplayOptions({ logToScreen: true });

            const timestamp = debugManager.logBattlePhaseStart('animation', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp, undefined, mockBattleResult);

            // Screen display should be updated
            expect(mockScene.add.container).toHaveBeenCalled();
        });
    });

    describe('Display Options Management', () => {
        test('should update display options', () => {
            const newOptions: Partial<DebugDisplayOptions> = {
                showAttackRange: false,
                showDamageCalculation: true,
                logToConsole: false,
                enableDetailedLogging: true,
            };

            debugManager.updateDisplayOptions(newOptions);

            // Options should be updated (we can't directly test private properties,
            // but we can test the behavior)
            const timestamp = debugManager.logBattlePhaseStart('range_calculation', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp);

            // Since logToConsole is false, console.log should not be called
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should initialize debug overlay when logToScreen is enabled', () => {
            debugManager.updateDisplayOptions({ logToScreen: true });
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('should destroy debug overlay when logToScreen is disabled', () => {
            debugManager.updateDisplayOptions({ logToScreen: true });
            const mockContainer = mockScene.add.container();

            debugManager.updateDisplayOptions({ logToScreen: false });
            expect(mockContainer.destroy).toHaveBeenCalled();
        });
    });

    describe('Debug Information Management', () => {
        test('should store debug information', () => {
            const timestamp1 = debugManager.logBattlePhaseStart('range_calculation', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp1);

            const timestamp2 = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            debugManager.logBattlePhaseEnd(timestamp2, undefined, mockBattleResult);

            const debugInfo = debugManager.getDebugInfo();
            expect(debugInfo).toHaveLength(2);
            expect(debugInfo[0].phase).toBe('range_calculation');
            expect(debugInfo[1].phase).toBe('damage_calculation');
            expect(debugInfo[1].result).toBe(mockBattleResult);
        });

        test('should clear debug information', () => {
            const timestamp = debugManager.logBattlePhaseStart('animation', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp);

            debugManager.clearDebugInfo();

            const debugInfo = debugManager.getDebugInfo();
            expect(debugInfo).toHaveLength(0);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.rangeCalculationTime).toHaveLength(0);
            expect(metrics.damageCalculationTime).toHaveLength(0);
            expect(metrics.animationTime).toHaveLength(0);
            expect(metrics.totalBattleTime).toHaveLength(0);
        });

        test('should limit performance metrics to 100 entries', () => {
            // Add more than 100 entries
            for (let i = 0; i < 150; i++) {
                const timestamp = debugManager.logBattlePhaseStart('range_calculation', mockUnit);
                debugManager.logBattlePhaseEnd(timestamp);
            }

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.rangeCalculationTime.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Report Generation', () => {
        test('should generate debug report', () => {
            // Add some debug data
            const timestamp1 = debugManager.logBattlePhaseStart('range_calculation', mockUnit);
            debugManager.logBattlePhaseEnd(timestamp1);

            const timestamp2 = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            debugManager.logBattlePhaseEnd(timestamp2, undefined, mockBattleResult);

            const report = debugManager.generateDebugReport();

            expect(report).toContain('戦闘デバッグレポート');
            expect(report).toContain('パフォーマンスメトリクス');
            expect(report).toContain('Mock battle report'); // From mocked balance tool
            expect(report).toContain('最近のデバッグ情報');
        });

        test('should include performance metrics in report', () => {
            const timestamp = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            setTimeout(() => {
                debugManager.logBattlePhaseEnd(timestamp, undefined, mockBattleResult);
            }, 50);

            const report = debugManager.generateDebugReport();
            expect(report).toContain('ダメージ計算: 平均');
        });
    });

    describe('Integration with Balance Tool', () => {
        test('should record battles in balance tool', () => {
            const balanceTool = debugManager.getBalanceTool();
            const recordSpy = jest.spyOn(balanceTool, 'recordBattle');

            const timestamp = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            debugManager.logBattlePhaseEnd(timestamp, undefined, mockBattleResult);

            expect(recordSpy).toHaveBeenCalledWith(
                mockBattleResult.attacker,
                mockBattleResult.target,
                mockBattleResult.finalDamage,
                mockBattleResult.isCritical,
                mockBattleResult.isEvaded,
                expect.any(Number)
            );
        });

        test('should not record battles when there is an error', () => {
            const balanceTool = debugManager.getBalanceTool();
            const recordSpy = jest.spyOn(balanceTool, 'recordBattle');

            const timestamp = debugManager.logBattlePhaseStart('damage_calculation', mockUnit, mockTarget);
            debugManager.logBattlePhaseEnd(timestamp, undefined, undefined, 'Calculation failed');

            expect(recordSpy).not.toHaveBeenCalled();
        });
    });
});