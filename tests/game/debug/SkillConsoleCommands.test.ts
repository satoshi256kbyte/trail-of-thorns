/**
 * SkillConsoleCommands テストスイート
 * 
 * スキルシステム専用コンソールコマンドのテスト
 */

import { SkillConsoleCommands } from '../../../game/src/debug/SkillConsoleCommands';
import { SkillDebugManager } from '../../../game/src/debug/SkillDebugManager';
import { SkillSystem } from '../../../game/src/systems/skills/SkillSystem';
import { SkillSystemConfig } from '../../../game/src/config/GameConfig';

// モックオブジェクト
const mockSkillSystem = {
    useSkill: jest.fn(),
    getAvailableSkills: jest.fn(),
    getSkillStatistics: jest.fn(),
    getSystemState: jest.fn(),
    reset: jest.fn()
} as any;

const mockDebugManager = {
    enableDebugMode: jest.fn(),
    disableDebugMode: jest.fn(),
    getStatistics: jest.fn(),
    analyzeSkillBalance: jest.fn(),
    executeSkillTest: jest.fn(),
    resetStatistics: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    getLogHistory: jest.fn()
} as any;

const mockConfig: SkillSystemConfig = {
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

describe('SkillConsoleCommands', () => {
    let consoleCommands: SkillConsoleCommands;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleCommands = new SkillConsoleCommands(mockSkillSystem, mockDebugManager, mockConfig);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('コンソールコマンドが正しく初期化される', () => {
            expect(consoleCommands).toBeDefined();
        });

        test('利用可能なコマンド一覧を取得できる', () => {
            const commands = consoleCommands.getAvailableCommands();
            expect(Array.isArray(commands)).toBe(true);
            expect(commands.length).toBeGreaterThan(0);
            expect(commands).toContain('help');
            expect(commands).toContain('use');
            expect(commands).toContain('list');
        });

        test('特定のコマンドを取得できる', () => {
            const helpCommand = consoleCommands.getCommand('help');
            expect(helpCommand).toBeDefined();
            expect(helpCommand!.name).toBe('help');
            expect(helpCommand!.description).toContain('Show available commands');
        });
    });

    describe('ヘルプコマンド', () => {
        test('ヘルプコマンドが全コマンドを表示する', async () => {
            await consoleCommands.executeCommand('help');

            expect(consoleSpy).toHaveBeenCalledWith('Available skill commands:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('help'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('use'));
        });

        test('特定のコマンドのヘルプを表示する', async () => {
            await consoleCommands.executeCommand('help use');

            expect(consoleSpy).toHaveBeenCalledWith('Command: use');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Description:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
        });

        test('存在しないコマンドのヘルプでエラーメッセージを表示する', async () => {
            await consoleCommands.executeCommand('help nonexistent');

            expect(consoleSpy).toHaveBeenCalledWith('Command \'nonexistent\' not found.');
        });
    });

    describe('スキル実行コマンド', () => {
        test('スキル実行コマンドが正しく動作する', async () => {
            const mockResult = {
                success: true,
                result: {
                    damage: 25,
                    healing: 0,
                    mpCost: 10
                },
                flowStats: {
                    executionTime: 50
                }
            };

            mockSkillSystem.useSkill.mockResolvedValue(mockResult);

            await consoleCommands.executeCommand('use fireball player1 5 3');

            expect(mockSkillSystem.useSkill).toHaveBeenCalledWith(
                'fireball',
                'player1',
                { x: 5, y: 3 },
                true
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                'Executing skill test: fireball by player1 at (5, 3)'
            );
        });

        test('パラメータ不足でエラーメッセージを表示する', async () => {
            await consoleCommands.executeCommand('use fireball');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Usage: skill use <skillId> <casterId> [targetX] [targetY]'
            );
        });

        test('スキル実行エラーを適切に処理する', async () => {
            mockSkillSystem.useSkill.mockRejectedValue(new Error('Skill not found'));

            await consoleCommands.executeCommand('use invalid player1');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Skill execution failed:')
            );
        });
    });

    describe('スキル条件チェックコマンド', () => {
        test('スキル条件チェックが正しく動作する', async () => {
            const mockSkills = [{
                skill: { id: 'fireball', name: 'Fireball' },
                usability: {
                    canUse: true,
                    reason: '',
                    mpCost: 10,
                    cooldownRemaining: 0
                },
                enabled: true
            }];

            mockSkillSystem.getAvailableSkills.mockReturnValue(mockSkills);

            await consoleCommands.executeCommand('check fireball player1');

            expect(mockSkillSystem.getAvailableSkills).toHaveBeenCalledWith('player1');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Checking skill conditions: fireball for player1'
            );
        });

        test('スキルが見つからない場合のエラー処理', async () => {
            mockSkillSystem.getAvailableSkills.mockReturnValue([]);

            await consoleCommands.executeCommand('check nonexistent player1');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Skill \'nonexistent\' not found or not available for player1'
            );
        });
    });

    describe('スキル一覧コマンド', () => {
        test('キャラクターのスキル一覧を表示する', async () => {
            const mockSkills = [
                {
                    skill: {
                        id: 'fireball',
                        name: 'Fireball',
                        skillType: 'attack',
                        usageCondition: { mpCost: 10 }
                    },
                    enabled: true
                },
                {
                    skill: {
                        id: 'heal',
                        name: 'Heal',
                        skillType: 'heal',
                        usageCondition: { mpCost: 15 }
                    },
                    enabled: false
                }
            ];

            mockSkillSystem.getAvailableSkills.mockReturnValue(mockSkills);

            await consoleCommands.executeCommand('list player1');

            expect(mockSkillSystem.getAvailableSkills).toHaveBeenCalledWith('player1');
            expect(consoleSpy).toHaveBeenCalledWith('Skills available for player1:');
        });

        test('フィルター付きスキル一覧を表示する', async () => {
            const mockSkills = [
                {
                    skill: {
                        id: 'fireball',
                        name: 'Fireball',
                        skillType: 'attack',
                        usageCondition: { mpCost: 10 }
                    },
                    enabled: true
                }
            ];

            mockSkillSystem.getAvailableSkills.mockReturnValue(mockSkills);

            await consoleCommands.executeCommand('list player1 attack');

            expect(consoleSpy).toHaveBeenCalledWith('Skills available for player1:');
        });
    });

    describe('統計情報コマンド', () => {
        test('特定スキルの統計を表示する', async () => {
            const mockStats = {
                executionCount: 10,
                successCount: 9,
                averageExecutionTime: 45.5,
                averageDamage: 25.3,
                averageHealing: 0,
                lastExecutionTime: new Date(),
                casterStats: new Map()
            };

            mockDebugManager.getStatistics.mockReturnValue(mockStats);

            await consoleCommands.executeCommand('stats fireball');

            expect(mockDebugManager.getStatistics).toHaveBeenCalledWith('fireball');
            expect(consoleSpy).toHaveBeenCalledWith('Usage Statistics:', expect.any(Object));
        });

        test('統計がない場合のメッセージを表示する', async () => {
            mockDebugManager.getStatistics.mockReturnValue(null);

            await consoleCommands.executeCommand('info nonexistent');

            expect(consoleSpy).toHaveBeenCalledWith(
                'No usage statistics available for this skill.'
            );
        });
    });

    describe('バランス分析コマンド', () => {
        test('バランス分析が正しく動作する', async () => {
            const mockBalanceData = {
                skillId: 'fireball',
                balanceScore: 75,
                usageFrequency: 50,
                effectivenessRate: 0.9,
                recommendedDamageRange: { min: 20, max: 30 },
                recommendedMPCost: 12,
                recommendedCooldown: 2
            };

            mockDebugManager.analyzeSkillBalance.mockReturnValue(mockBalanceData);

            await consoleCommands.executeCommand('balance fireball');

            expect(mockDebugManager.analyzeSkillBalance).toHaveBeenCalledWith('fireball');
            expect(consoleSpy).toHaveBeenCalledWith('Balance Analysis Result:', expect.any(Object));
        });

        test('データ不足の場合のメッセージを表示する', async () => {
            mockDebugManager.analyzeSkillBalance.mockReturnValue(null);

            await consoleCommands.executeCommand('balance fireball');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Insufficient data for balance analysis. Use the skill more to gather statistics.'
            );
        });
    });

    describe('テストシナリオコマンド', () => {
        test('テストシナリオが正しく実行される', async () => {
            const mockResult = {
                scenarioName: 'basic-attack-skill',
                success: true,
                executionTime: 125.5,
                validation: { passed: true, issues: [] }
            };

            mockDebugManager.executeSkillTest.mockResolvedValue(mockResult);

            await consoleCommands.executeCommand('test basic-attack-skill');

            expect(mockDebugManager.executeSkillTest).toHaveBeenCalledWith('basic-attack-skill');
            expect(consoleSpy).toHaveBeenCalledWith('Test Result:', expect.any(Object));
        });

        test('テスト失敗時の処理', async () => {
            const mockResult = {
                scenarioName: 'basic-attack-skill',
                success: false,
                executionTime: 125.5,
                validation: {
                    passed: false,
                    issues: ['Expected damage: 25, got: 20']
                }
            };

            mockDebugManager.executeSkillTest.mockResolvedValue(mockResult);

            await consoleCommands.executeCommand('test basic-attack-skill');

            expect(consoleSpy).toHaveBeenCalledWith('Validation Issues:');
        });
    });

    describe('設定変更コマンド', () => {
        test('設定変更が正しく動作する', async () => {
            await consoleCommands.executeCommand('config globalDamageMultiplier 1.5');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Modifying skill config: globalDamageMultiplier = 1.5'
            );
        });

        test('利用可能な設定一覧を表示する', async () => {
            await consoleCommands.executeCommand('config');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Available settings: globalDamageMultiplier, globalHealingMultiplier, globalMPCostMultiplier'
            );
        });
    });

    describe('シミュレーションコマンド', () => {
        test('スキル効果シミュレーションが実行される', async () => {
            await consoleCommands.executeCommand('simulate fireball 100');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Simulating fireball for 100 iterations...'
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                'Simulation Results:', expect.any(Object)
            );
        });

        test('無効な反復回数でエラーメッセージを表示する', async () => {
            await consoleCommands.executeCommand('simulate fireball invalid');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Invalid iteration count. Must be a positive number.'
            );
        });
    });

    describe('デバッグモード切り替えコマンド', () => {
        test('デバッグモードを有効にする', async () => {
            await consoleCommands.executeCommand('debug on');

            expect(mockDebugManager.enableDebugMode).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Skill debug mode enabled.');
        });

        test('デバッグモードを無効にする', async () => {
            await consoleCommands.executeCommand('debug off');

            expect(mockDebugManager.disableDebugMode).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Skill debug mode disabled.');
        });
    });

    describe('統計リセットコマンド', () => {
        test('統計リセットが正しく動作する', async () => {
            await consoleCommands.executeCommand('reset');

            expect(mockDebugManager.resetStatistics).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Skill statistics have been reset.');
        });
    });

    describe('パフォーマンス測定コマンド', () => {
        test('パフォーマンス測定が実行される', async () => {
            await consoleCommands.executeCommand('perf fireball 50');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Measuring performance for fireball (50 iterations)...'
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                'Performance Results:', expect.any(Object)
            );
        });

        test('デフォルト反復回数でパフォーマンス測定を実行する', async () => {
            await consoleCommands.executeCommand('perf fireball');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Measuring performance for fireball (10 iterations)...'
            );
        });
    });

    describe('エラーハンドリング', () => {
        test('存在しないコマンドで警告メッセージを表示する', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await consoleCommands.executeCommand('nonexistent');

            expect(warnSpy).toHaveBeenCalledWith(
                'Unknown skill command: nonexistent. Type \'skill help\' for available commands.'
            );

            warnSpy.mockRestore();
        });

        test('コマンド実行エラーを適切に処理する', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            // useコマンドでエラーを発生させる
            mockSkillSystem.useSkill.mockRejectedValue(new Error('Test error'));

            await consoleCommands.executeCommand('use fireball player1');

            expect(errorSpy).toHaveBeenCalledWith(
                'Error executing skill command \'use\':', 'Test error'
            );

            errorSpy.mockRestore();
        });
    });
});