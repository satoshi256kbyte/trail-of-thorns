/**
 * ExperienceConsoleCommands テストスイート
 * 
 * 経験値コンソールコマンドの機能をテストします:
 * - コマンド登録・実行
 * - 経験値操作コマンド
 * - バランス調整コマンド
 * - シミュレーション・統計コマンド
 */

import { ExperienceConsoleCommands } from '../../../game/src/debug/ExperienceConsoleCommands';
import { ExperienceSystem } from '../../../game/src/systems/experience/ExperienceSystem';
import { ExperienceDebugManager } from '../../../game/src/debug/ExperienceDebugManager';
import { ExperienceAction, ExperienceSource } from '../../../game/src/types/experience';

// モック設定
jest.mock('../../../game/src/config/GameConfig');

describe('ExperienceConsoleCommands', () => {
    let mockExperienceSystem: jest.Mocked<ExperienceSystem>;
    let mockDebugManager: jest.Mocked<ExperienceDebugManager>;
    let consoleCommands: ExperienceConsoleCommands;

    beforeEach(() => {
        // ExperienceSystemのモック
        mockExperienceSystem = {
            getSystemState: jest.fn().mockReturnValue({
                isInitialized: true,
                experienceTableLoaded: true,
                growthRatesLoaded: true,
                activeCharacters: new Set(['test-character']),
                pendingLevelUps: new Map(),
                experienceMultiplier: 1.0,
                config: {
                    enableExperienceGain: true,
                    experienceMultiplier: 1.0,
                    maxLevel: 20,
                    debugMode: true,
                    autoLevelUp: true,
                    showExperiencePopups: true,
                    experienceAnimationSpeed: 1.0,
                    levelUpAnimationDuration: 3000
                }
            }),
            getExperienceInfo: jest.fn().mockReturnValue({
                characterId: 'test-character',
                currentExperience: 100,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            }),
            awardExperience: jest.fn().mockReturnValue({
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                }
            }),
            checkAndProcessLevelUp: jest.fn().mockReturnValue({
                characterId: 'test-character',
                oldLevel: 5,
                newLevel: 6,
                statGrowth: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
                newExperienceRequired: 200,
                oldStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3, skill: 12, luck: 8 },
                newStats: { maxHP: 105, maxMP: 53, attack: 22, defense: 16, speed: 11, movement: 3, skill: 14, luck: 9 },
                levelsGained: 1,
                timestamp: Date.now()
            }),
            setExperienceMultiplier: jest.fn(),
            registerCharacter: jest.fn(),
            unregisterCharacter: jest.fn().mockReturnValue(true)
        } as any;

        // ExperienceDebugManagerのモック
        mockDebugManager = {
            runExperienceSimulation: jest.fn().mockResolvedValue({
                characterId: 'test-character',
                initialLevel: 5,
                finalLevel: 6,
                totalExperienceGained: 100,
                levelUpsCount: 1,
                statGrowthTotal: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
                simulationDuration: 1000
            }),
            exportDebugData: jest.fn().mockReturnValue({
                statistics: {
                    totalExperienceGained: 500,
                    totalLevelUps: 5,
                    sessionStartTime: Date.now() - 60000,
                    sessionDuration: 60000,
                    experienceBySource: {},
                    experienceByAction: {},
                    averageStatGrowth: { hp: 3, mp: 2, attack: 1, defense: 1, speed: 1, skill: 1, luck: 1 }
                },
                balanceStatistics: {},
                simulationResults: [],
                performanceMetrics: {},
                logHistory: []
            }),
            generateBalanceStatistics: jest.fn().mockReturnValue({
                averageExperiencePerAction: {},
                averageLevelUpTime: 10000,
                statGrowthDistribution: {},
                experienceSourceEfficiency: {},
                levelProgressionCurve: []
            }),
            getPerformanceStatistics: jest.fn().mockReturnValue({
                'experience-calculation': { average: 5, min: 1, max: 10, count: 100 },
                'level-up-processing': { average: 15, min: 5, max: 30, count: 10 }
            }),
            clearDebugData: jest.fn(),
            toggleDebugDisplay: jest.fn()
        } as any;

        // グローバルオブジェクトをクリア
        delete (window as any).experienceCommands;
        delete (window as any).exp;

        consoleCommands = new ExperienceConsoleCommands(mockExperienceSystem, mockDebugManager);
    });

    afterEach(() => {
        consoleCommands.disable();
        jest.clearAllMocks();
    });

    describe('コマンド登録', () => {
        test('グローバルオブジェクトにコマンドが登録される', () => {
            expect((window as any).experienceCommands).toBeDefined();
            expect((window as any).exp).toBeDefined();
        });

        test('基本コマンドが登録される', () => {
            const commands = (window as any).experienceCommands;

            expect(commands.help).toBeInstanceOf(Function);
            expect(commands.status).toBeInstanceOf(Function);
            expect(commands.addExp).toBeInstanceOf(Function);
            expect(commands.setLevel).toBeInstanceOf(Function);
            expect(commands.levelUp).toBeInstanceOf(Function);
        });

        test('テストコマンドが登録される', () => {
            const commands = (window as any).experienceCommands;

            expect(commands.testAttack).toBeInstanceOf(Function);
            expect(commands.testDefeat).toBeInstanceOf(Function);
            expect(commands.testHeal).toBeInstanceOf(Function);
            expect(commands.testSupport).toBeInstanceOf(Function);
        });

        test('バランス調整コマンドが登録される', () => {
            const commands = (window as any).experienceCommands;

            expect(commands.setMultiplier).toBeInstanceOf(Function);
            expect(commands.setBaseExp).toBeInstanceOf(Function);
            expect(commands.setMaxLevelCap).toBeInstanceOf(Function);
        });

        test('シミュレーション・統計コマンドが登録される', () => {
            const commands = (window as any).experienceCommands;

            expect(commands.simulate).toBeInstanceOf(Function);
            expect(commands.stats).toBeInstanceOf(Function);
            expect(commands.balance).toBeInstanceOf(Function);
            expect(commands.performance).toBeInstanceOf(Function);
        });
    });

    describe('基本コマンド', () => {
        test('helpコマンドがヘルプを表示する', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = (window as any).experienceCommands.help();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Help displayed');
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('statusコマンドがシステム状態を表示する', () => {
            const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

            const result = (window as any).experienceCommands.status();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Status displayed');
            expect(result.data).toBeDefined();
            expect(consoleTableSpy).toHaveBeenCalled();

            consoleTableSpy.mockRestore();
        });
    });

    describe('経験値操作コマンド', () => {
        test('addExpコマンドが経験値を追加する', () => {
            const result = (window as any).experienceCommands.addExp('test-character', 50);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Added');
            expect(result.message).toContain('test-character');
            expect(mockExperienceSystem.awardExperience).toHaveBeenCalled();
        });

        test('addExpコマンドが無効なパラメータを拒否する', () => {
            const result1 = (window as any).experienceCommands.addExp('', 50);
            const result2 = (window as any).experienceCommands.addExp('test-character', -10);

            expect(result1.success).toBe(false);
            expect(result2.success).toBe(false);
        });

        test('levelUpコマンドが強制レベルアップを実行する', () => {
            const result = (window as any).experienceCommands.levelUp('test-character');

            expect(result.success).toBe(true);
            expect(result.message).toContain('leveled up');
            expect(mockExperienceSystem.checkAndProcessLevelUp).toHaveBeenCalledWith('test-character');
        });

        test('levelUpコマンドがレベルアップ不可時にエラーを返す', () => {
            mockExperienceSystem.checkAndProcessLevelUp.mockReturnValue(null);

            const result = (window as any).experienceCommands.levelUp('test-character');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot level up');
        });
    });

    describe('経験値獲得テストコマンド', () => {
        test('testAttackコマンドが攻撃経験値をテストする', () => {
            const result = (window as any).experienceCommands.testAttack('test-character', 5);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Tested attack 5 times');
            expect(result.data.totalExp).toBeGreaterThan(0);
            expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(5);
        });

        test('testHealコマンドが回復経験値をテストする', () => {
            const result = (window as any).experienceCommands.testHeal('test-character', 3);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Tested heal 3 times');
            expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(3);
        });

        test('testSupportコマンドが支援経験値をテストする', () => {
            const result = (window as any).experienceCommands.testSupport('test-character', 2);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Tested support 2 times');
            expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(2);
        });
    });

    describe('バランス調整コマンド', () => {
        test('setMultiplierコマンドが経験値倍率を設定する', () => {
            const result = (window as any).experienceCommands.setMultiplier(2.0);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Experience multiplier set to 2');
            expect(mockExperienceSystem.setExperienceMultiplier).toHaveBeenCalledWith(2.0, 'Console command');
        });

        test('setMultiplierコマンドが負の値を拒否する', () => {
            const result = (window as any).experienceCommands.setMultiplier(-1.0);

            expect(result.success).toBe(false);
            expect(result.message).toContain('cannot be negative');
        });
    });

    describe('シミュレーションコマンド', () => {
        test('simulateコマンドがシミュレーションを実行する', async () => {
            const result = await (window as any).experienceCommands.simulate('test-character', 'attack', 10);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Simulation completed');
            expect(result.data).toBeDefined();
            expect(mockDebugManager.runExperienceSimulation).toHaveBeenCalled();
        });

        test('simulateコマンドが無効なアクションを拒否する', async () => {
            const result = await (window as any).experienceCommands.simulate('test-character', 'invalid', 10);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Unknown action');
        });

        test('simulateLevelingコマンドがレベリングシミュレーションを実行する', async () => {
            const result = await (window as any).experienceCommands.simulateLeveling('test-character', 10);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Leveling simulation completed');
            expect(mockDebugManager.runExperienceSimulation).toHaveBeenCalled();
        });

        test('simulateLevelingコマンドが既に目標レベル以上の場合にエラーを返す', async () => {
            mockExperienceSystem.getExperienceInfo.mockReturnValue({
                characterId: 'test-character',
                currentExperience: 100,
                currentLevel: 15,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            });

            const result = await (window as any).experienceCommands.simulateLeveling('test-character', 10);

            expect(result.success).toBe(false);
            expect(result.message).toContain('already at or above target level');
        });
    });

    describe('統計・デバッグコマンド', () => {
        test('statsコマンドが統計情報を表示する', () => {
            const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

            const result = (window as any).experienceCommands.stats();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Statistics displayed');
            expect(result.data).toBeDefined();
            expect(consoleTableSpy).toHaveBeenCalled();
            expect(mockDebugManager.exportDebugData).toHaveBeenCalled();

            consoleTableSpy.mockRestore();
        });

        test('balanceコマンドがバランス統計を表示する', () => {
            const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

            const result = (window as any).experienceCommands.balance();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Balance statistics displayed');
            expect(consoleTableSpy).toHaveBeenCalled();
            expect(mockDebugManager.generateBalanceStatistics).toHaveBeenCalled();

            consoleTableSpy.mockRestore();
        });

        test('performanceコマンドがパフォーマンス統計を表示する', () => {
            const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

            const result = (window as any).experienceCommands.performance();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Performance statistics displayed');
            expect(consoleTableSpy).toHaveBeenCalled();
            expect(mockDebugManager.getPerformanceStatistics).toHaveBeenCalled();

            consoleTableSpy.mockRestore();
        });

        test('debugコマンドがデバッグ表示を切り替える', () => {
            const result1 = (window as any).experienceCommands.debug(true);
            const result2 = (window as any).experienceCommands.debug();

            expect(result1.success).toBe(true);
            expect(result1.message).toContain('enabled');

            expect(result2.success).toBe(true);
            expect(result2.message).toContain('toggled');
            expect(mockDebugManager.toggleDebugDisplay).toHaveBeenCalled();
        });

        test('clearコマンドがデバッグデータをクリアする', () => {
            const result = (window as any).experienceCommands.clear();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Debug data cleared');
            expect(mockDebugManager.clearDebugData).toHaveBeenCalled();
        });

        test('exportコマンドがデバッグデータをエクスポートする', () => {
            // DOM要素のモック
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };
            jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

            // URL.createObjectURLのモック
            const mockUrl = 'blob:mock-url';
            jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
            jest.spyOn(URL, 'revokeObjectURL').mockImplementation();

            const result = (window as any).experienceCommands.export();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Debug data exported to file');
            expect(mockLink.click).toHaveBeenCalled();
            expect(mockDebugManager.exportDebugData).toHaveBeenCalled();
        });
    });

    describe('リセット・復元コマンド', () => {
        test('resetコマンドがキャラクターをリセットする', () => {
            const result = (window as any).experienceCommands.reset('test-character');

            expect(result.success).toBe(true);
            expect(result.message).toContain('reset to level 1');
            expect(mockExperienceSystem.unregisterCharacter).toHaveBeenCalledWith('test-character');
            expect(mockExperienceSystem.registerCharacter).toHaveBeenCalled();
        });

        test('resetAllコマンドが全キャラクターをリセットする', () => {
            const result = (window as any).experienceCommands.resetAll();

            expect(result.success).toBe(true);
            expect(result.message).toContain('Reset 1 characters');
        });

        test('backupコマンドがキャラクターをバックアップする', () => {
            // localStorageのモック
            const mockSetItem = jest.fn();
            Object.defineProperty(window, 'localStorage', {
                value: { setItem: mockSetItem },
                writable: true
            });

            const result = (window as any).experienceCommands.backup('test-character');

            expect(result.success).toBe(true);
            expect(result.message).toContain('backed up');
            expect(mockSetItem).toHaveBeenCalled();
        });
    });

    describe('エラーハンドリング', () => {
        test('システムエラー時にエラーメッセージを返す', () => {
            mockExperienceSystem.getExperienceInfo.mockImplementation(() => {
                throw new Error('System error');
            });

            const result = (window as any).experienceCommands.addExp('test-character', 50);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error');
        });

        test('無効なパラメータでエラーメッセージを返す', () => {
            const result = (window as any).experienceCommands.setLevel('test-character', -1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('must be between');
        });
    });

    describe('コマンド無効化', () => {
        test('disableメソッドがコマンドを削除する', () => {
            expect((window as any).experienceCommands).toBeDefined();
            expect((window as any).exp).toBeDefined();

            consoleCommands.disable();

            expect((window as any).experienceCommands).toBeUndefined();
            expect((window as any).exp).toBeUndefined();
        });
    });
});