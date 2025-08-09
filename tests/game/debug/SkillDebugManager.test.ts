/**
 * SkillDebugManager テストスイート
 * 
 * スキルシステムのデバッグ機能とバランス調整ツールのテスト
 */

import { SkillDebugManager } from '../../../game/src/debug/SkillDebugManager';
import { SkillSystemConfig } from '../../../game/src/config/GameConfig';
import {
    SkillExecutionContext,
    SkillResult,
    SkillUsabilityResult,
    SkillTestScenario,
    SkillBalanceData
} from '../../../game/src/types/skill';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeCircle: jest.fn().mockReturnThis(),
            fillStyle: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis()
        }),
        text: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis()
        })
    },
    time: {
        addEvent: jest.fn(),
        delayedCall: jest.fn()
    },
    input: {
        keyboard: {
            on: jest.fn()
        }
    },
    events: {
        emit: jest.fn()
    }
} as any;

const mockSystemConfig: SkillSystemConfig = {
    enableSkillSystem: true,
    enableSkillAnimations: true,
    enableSkillSounds: true,
    enableSkillDebug: true,
    showConditionCheckDebug: false,
    showExecutionDebug: false,
    showEffectCalculationDebug: false,
    showSkillStatistics: false,
    enableDetailedLogging: true,
    animationConfig: {
        castAnimationDuration: 1000,
        effectAnimationDuration: 800,
        hitAnimationDuration: 600,
        skillUIDisplayDuration: 3000,
        animationSpeed: 1.0,
        enableParticleEffects: true,
        enableScreenEffects: true
    },
    balanceSettings: {
        globalSkillDamageMultiplier: 1.0,
        globalSkillHealingMultiplier: 1.0,
        globalMPCostMultiplier: 1.0,
        globalCooldownMultiplier: 1.0,
        skillCriticalChanceBonus: 5,
        maxSkillUsagePerTurn: 3
    },
    debugColors: {
        skillRange: 0x00ffff,
        skillAreaOfEffect: 0xff00ff,
        validTargets: 0x00ff00,
        invalidTargets: 0xff0000,
        skillExecution: 0xffff00,
        skillSuccess: 0x00ff88,
        skillFailure: 0xff8800,
        mpCost: 0x8888ff,
        cooldown: 0xff8888
    },
    consoleCommands: {
        enableCommands: true,
        commandPrefix: 'skill',
        enableTesting: true,
        enableBalanceAdjustment: true,
        enableSimulation: true
    },
    testingConfig: {
        enableTestingMode: true,
        autoExecuteSkills: false,
        logAllExecutions: true,
        generateStatistics: true,
        testSkillCombinations: false
    }
};

describe('SkillDebugManager', () => {
    let debugManager: SkillDebugManager;

    beforeEach(() => {
        debugManager = new SkillDebugManager(mockScene, mockSystemConfig);
    });

    afterEach(() => {
        debugManager.destroy();
    });

    describe('初期化', () => {
        test('デバッグマネージャーが正しく初期化される', () => {
            expect(debugManager).toBeDefined();
        });

        test('デフォルト設定が適用される', () => {
            const config = (debugManager as any).config;
            expect(config.enableDetailedLogging).toBe(true);
            expect(config.enableSkillVisualization).toBe(true);
            expect(config.enablePerformanceMonitoring).toBe(true);
            expect(config.enableStatisticsCollection).toBe(true);
        });
    });

    describe('デバッグモード', () => {
        test('デバッグモードを有効にできる', () => {
            debugManager.enableDebugMode();
            expect((debugManager as any).isEnabled).toBe(true);
        });

        test('デバッグモードを無効にできる', () => {
            debugManager.enableDebugMode();
            debugManager.disableDebugMode();
            expect((debugManager as any).isEnabled).toBe(false);
        });

        test('デバッグモード有効時にイベントが発火される', () => {
            const eventSpy = jest.spyOn(debugManager, 'emit');
            debugManager.enableDebugMode();
            expect(eventSpy).toHaveBeenCalledWith('debug-mode-enabled');
        });
    });

    describe('スキル実行ログ', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('スキル実行をログに記録できる', () => {
            const context: SkillExecutionContext = {
                caster: 'test-caster',
                skillId: 'test-skill',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result: SkillResult = {
                success: true,
                damage: 25,
                healing: 0,
                mpCost: 10,
                effects: [],
                targetResults: [],
                executionTime: performance.now()
            };

            debugManager.logSkillExecution(context, result, 50);

            const stats = debugManager.getStatistics('test-skill') as any;
            expect(stats).toBeDefined();
            expect(stats.executionCount).toBe(1);
            expect(stats.successCount).toBe(1);
        });

        test('スキル条件チェックをログに記録できる', () => {
            const usability: SkillUsabilityResult = {
                canUse: false,
                reason: 'insufficient_mp',
                mpCost: 15,
                cooldownRemaining: 0
            };

            debugManager.logSkillConditionCheck('test-skill', 'test-caster', usability);

            const logs = debugManager.getLogHistory('debug', 10);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[logs.length - 1].message).toContain('Skill condition check logged');
        });

        test('スキル効果計算をログに記録できる', () => {
            const calculation = {
                baseDamage: 20,
                multiplier: 1.2,
                finalDamage: 24
            };

            debugManager.logSkillEffectCalculation('test-skill', calculation);

            const logs = debugManager.getLogHistory('debug', 10);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[logs.length - 1].message).toContain('Skill effect calculation logged');
        });
    });

    describe('スキルテスト', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('基本攻撃スキルテストを実行できる', async () => {
            const result = await debugManager.executeSkillTest('basic-attack-skill');

            expect(result).toBeDefined();
            expect(result.scenarioName).toBe('basic-attack-skill');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.executionTime).toBe('number');
        });

        test('回復スキルテストを実行できる', async () => {
            const result = await debugManager.executeSkillTest('heal-skill');

            expect(result).toBeDefined();
            expect(result.scenarioName).toBe('heal-skill');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.executionTime).toBe('number');
        });

        test('存在しないテストシナリオでエラーが発生する', async () => {
            await expect(debugManager.executeSkillTest('non-existent-scenario'))
                .rejects.toThrow('Test scenario \'non-existent-scenario\' not found');
        });
    });

    describe('バランス分析', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();

            // テスト用の統計データを作成
            const context: SkillExecutionContext = {
                caster: 'test-caster',
                skillId: 'test-skill',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result: SkillResult = {
                success: true,
                damage: 25,
                healing: 0,
                mpCost: 10,
                effects: [],
                targetResults: [],
                executionTime: performance.now()
            };

            // 複数回実行して統計を蓄積
            for (let i = 0; i < 10; i++) {
                debugManager.logSkillExecution(context, result, 50);
            }
        });

        test('スキルバランス分析を実行できる', () => {
            const balanceData = debugManager.analyzeSkillBalance('test-skill');

            expect(balanceData).toBeDefined();
            expect(balanceData!.skillId).toBe('test-skill');
            expect(typeof balanceData!.balanceScore).toBe('number');
            expect(balanceData!.balanceScore).toBeGreaterThanOrEqual(0);
            expect(balanceData!.balanceScore).toBeLessThanOrEqual(100);
        });

        test('統計データがないスキルでnullが返される', () => {
            const balanceData = debugManager.analyzeSkillBalance('non-existent-skill');
            expect(balanceData).toBeNull();
        });

        test('バランスデータが正しく計算される', () => {
            const balanceData = debugManager.analyzeSkillBalance('test-skill');

            expect(balanceData).toBeDefined();
            expect(balanceData!.usageFrequency).toBe(10);
            expect(balanceData!.effectivenessRate).toBe(1.0); // 100% success rate
            expect(balanceData!.recommendedDamageRange).toBeDefined();
            expect(balanceData!.recommendedMPCost).toBeGreaterThan(0);
        });
    });

    describe('統計情報', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('統計情報を取得できる', () => {
            // テストデータを追加
            const context: SkillExecutionContext = {
                caster: 'test-caster',
                skillId: 'test-skill',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result: SkillResult = {
                success: true,
                damage: 25,
                healing: 0,
                mpCost: 10,
                effects: [],
                targetResults: [],
                executionTime: performance.now()
            };

            debugManager.logSkillExecution(context, result, 50);

            const stats = debugManager.getStatistics('test-skill') as any;
            expect(stats).toBeDefined();
            expect(stats.skillId).toBe('test-skill');
            expect(stats.executionCount).toBe(1);
            expect(stats.successCount).toBe(1);
            expect(stats.averageDamage).toBe(25);
        });

        test('全統計情報を取得できる', () => {
            const allStats = debugManager.getStatistics() as Map<string, any>;
            expect(allStats).toBeInstanceOf(Map);
        });

        test('パフォーマンスメトリクスを取得できる', () => {
            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics).toBeInstanceOf(Map);
        });

        test('ログ履歴を取得できる', () => {
            debugManager.logSkillConditionCheck('test-skill', 'test-caster', {
                canUse: true,
                reason: '',
                mpCost: 10,
                cooldownRemaining: 0
            });

            const logs = debugManager.getLogHistory();
            expect(Array.isArray(logs)).toBe(true);
        });

        test('ログレベルでフィルタリングできる', () => {
            const logs = debugManager.getLogHistory('info', 5);
            expect(Array.isArray(logs)).toBe(true);
            expect(logs.length).toBeLessThanOrEqual(5);
        });
    });

    describe('統計リセット', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();

            // テストデータを追加
            const context: SkillExecutionContext = {
                caster: 'test-caster',
                skillId: 'test-skill',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result: SkillResult = {
                success: true,
                damage: 25,
                healing: 0,
                mpCost: 10,
                effects: [],
                targetResults: [],
                executionTime: performance.now()
            };

            debugManager.logSkillExecution(context, result, 50);
        });

        test('統計をリセットできる', () => {
            // リセット前に統計があることを確認
            const statsBefore = debugManager.getStatistics() as Map<string, any>;
            expect(statsBefore.size).toBeGreaterThan(0);

            // リセット実行
            debugManager.resetStatistics();

            // リセット後に統計がクリアされることを確認
            const statsAfter = debugManager.getStatistics() as Map<string, any>;
            expect(statsAfter.size).toBe(0);

            const logs = debugManager.getLogHistory();
            expect(logs.length).toBe(0);
        });
    });

    describe('エラーハンドリング', () => {
        test('無効なテストシナリオでエラーが適切に処理される', async () => {
            await expect(debugManager.executeSkillTest('invalid-scenario'))
                .rejects.toThrow();
        });

        test('統計データがない場合の処理', () => {
            const balanceData = debugManager.analyzeSkillBalance('non-existent-skill');
            expect(balanceData).toBeNull();
        });

        test('デバッグモードが無効な場合のログ処理', () => {
            // デバッグモードを無効にする
            debugManager.disableDebugMode();

            const context: SkillExecutionContext = {
                caster: 'test-caster',
                skillId: 'test-skill',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result: SkillResult = {
                success: true,
                damage: 25,
                healing: 0,
                mpCost: 10,
                effects: [],
                targetResults: [],
                executionTime: performance.now()
            };

            // ログが記録されないことを確認
            debugManager.logSkillExecution(context, result, 50);
            const stats = debugManager.getStatistics('test-skill');
            expect(stats).toBeNull();
        });
    });

    describe('リソース管理', () => {
        test('destroyメソッドでリソースが適切にクリーンアップされる', () => {
            debugManager.enableDebugMode();

            const eventSpy = jest.spyOn(debugManager, 'removeAllListeners');

            debugManager.destroy();

            expect(eventSpy).toHaveBeenCalled();
            expect((debugManager as any).isEnabled).toBe(false);
        });
    });
});