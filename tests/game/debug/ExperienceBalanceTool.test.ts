/**
 * ExperienceBalanceTool テストスイート
 * 
 * 経験値バランス調整ツールの機能をテストします:
 * - バランス設定管理
 * - バランステスト実行
 * - レベル進行分析
 * - A/Bテスト機能
 */

import { ExperienceBalanceTool } from '../../../game/src/debug/ExperienceBalanceTool';
import { ExperienceSystem } from '../../../game/src/systems/experience/ExperienceSystem';
import { ExperienceDebugManager } from '../../../game/src/debug/ExperienceDebugManager';
import { ExperienceAction, ExperienceSource } from '../../../game/src/types/experience';

// モック設定
jest.mock('../../../game/src/config/GameConfig');

describe('ExperienceBalanceTool', () => {
    let mockExperienceSystem: jest.Mocked<ExperienceSystem>;
    let mockDebugManager: jest.Mocked<ExperienceDebugManager>;
    let balanceTool: ExperienceBalanceTool;

    beforeEach(() => {
        // ExperienceSystemのモック
        mockExperienceSystem = {
            on: jest.fn(),
            setExperienceMultiplier: jest.fn(),
            getExperienceInfo: jest.fn().mockReturnValue({
                characterId: 'test-character',
                currentExperience: 100,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            })
        } as any;

        // ExperienceDebugManagerのモック
        mockDebugManager = {
            runExperienceSimulation: jest.fn().mockResolvedValue({
                characterId: 'test-character',
                initialLevel: 5,
                finalLevel: 7,
                totalExperienceGained: 200,
                levelUpsCount: 2,
                statGrowthTotal: { hp: 10, mp: 6, attack: 4, defense: 2, speed: 2, skill: 4, luck: 2 },
                simulationDuration: 5000
            })
        } as any;

        balanceTool = new ExperienceBalanceTool(mockExperienceSystem, mockDebugManager);
    });

    afterEach(() => {
        balanceTool.destroy();
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('バランスツールが正しく初期化される', () => {
            expect(mockExperienceSystem.on).toHaveBeenCalledWith('experience-awarded', expect.any(Function));
            expect(mockExperienceSystem.on).toHaveBeenCalledWith('level-up-processed', expect.any(Function));
        });

        test('デフォルトバランス設定が作成される', () => {
            // デフォルト設定が適用できることを確認
            const result = balanceTool.applyBalanceConfiguration('default');
            expect(result).toBe(true);
        });

        test('複数のプリセット設定が利用可能である', () => {
            expect(balanceTool.applyBalanceConfiguration('default')).toBe(true);
            expect(balanceTool.applyBalanceConfiguration('fast-growth')).toBe(true);
            expect(balanceTool.applyBalanceConfiguration('balanced')).toBe(true);
        });
    });

    describe('バランス設定管理', () => {
        test('カスタムバランス設定を作成できる', () => {
            const result = balanceTool.createCustomConfiguration(
                'test-config',
                'Test configuration',
                {
                    experienceMultiplier: 1.5,
                    baseExperienceValues: {
                        [ExperienceAction.ATTACK]: 8,
                        [ExperienceAction.DEFEAT]: 25,
                        [ExperienceAction.HEAL]: 12,
                        [ExperienceAction.SUPPORT]: 10,
                        [ExperienceAction.SKILL_CAST]: 15,
                        [ExperienceAction.BUFF_APPLY]: 8,
                        [ExperienceAction.DEBUFF_APPLY]: 9
                    }
                }
            );

            expect(result).toBe(true);
        });

        test('バランス設定を適用できる', () => {
            balanceTool.createCustomConfiguration('test-config', 'Test', {
                experienceMultiplier: 2.0
            });

            const result = balanceTool.applyBalanceConfiguration('test-config');

            expect(result).toBe(true);
            expect(mockExperienceSystem.setExperienceMultiplier).toHaveBeenCalledWith(2.0, 'Balance configuration: test-config');
        });

        test('存在しない設定の適用が失敗する', () => {
            const result = balanceTool.applyBalanceConfiguration('non-existent');
            expect(result).toBe(false);
        });

        test('バランス設定をエクスポートできる', () => {
            const exported = balanceTool.exportBalanceConfiguration('default');

            expect(exported).toBeDefined();
            expect(typeof exported).toBe('string');

            const parsed = JSON.parse(exported!);
            expect(parsed.name).toBe('default');
            expect(parsed.experienceMultiplier).toBeDefined();
            expect(parsed.baseExperienceValues).toBeDefined();
        });

        test('バランス設定をインポートできる', () => {
            const configJson = JSON.stringify({
                name: 'imported-config',
                description: 'Imported configuration',
                experienceMultiplier: 1.2,
                baseExperienceValues: {
                    [ExperienceAction.ATTACK]: 6,
                    [ExperienceAction.DEFEAT]: 22,
                    [ExperienceAction.HEAL]: 11,
                    [ExperienceAction.SUPPORT]: 9,
                    [ExperienceAction.SKILL_CAST]: 13,
                    [ExperienceAction.BUFF_APPLY]: 7,
                    [ExperienceAction.DEBUFF_APPLY]: 8
                },
                levelRequirements: [0, 100, 220, 360, 520, 700],
                maxLevel: 20,
                growthRateModifiers: {
                    hp: 1.0, mp: 1.0, attack: 1.0, defense: 1.0, speed: 1.0, skill: 1.0, luck: 1.0
                }
            });

            const result = balanceTool.importBalanceConfiguration(configJson);
            expect(result).toBe(true);

            // インポートした設定を適用できることを確認
            const applyResult = balanceTool.applyBalanceConfiguration('imported-config');
            expect(applyResult).toBe(true);
        });

        test('無効なJSON設定のインポートが失敗する', () => {
            const result = balanceTool.importBalanceConfiguration('invalid json');
            expect(result).toBe(false);
        });
    });

    describe('バランステスト', () => {
        test('基本的なバランステストを実行できる', async () => {
            const result = await balanceTool.runBalanceTest('default', 1000, ['test-character']);

            expect(result).toBeDefined();
            expect(result.configurationName).toBe('default');
            expect(result.testDuration).toBeGreaterThan(0);
            expect(result.playerSatisfactionScore).toBeGreaterThanOrEqual(0);
            expect(result.playerSatisfactionScore).toBeLessThanOrEqual(100);
            expect(Array.isArray(result.recommendations)).toBe(true);
        });

        test('複数キャラクターでのバランステストを実行できる', async () => {
            const result = await balanceTool.runBalanceTest(
                'default',
                1000,
                ['character-1', 'character-2', 'character-3']
            );

            expect(result).toBeDefined();
            expect(mockDebugManager.runExperienceSimulation).toHaveBeenCalledTimes(3);
        });

        test('存在しない設定でのテストが失敗する', async () => {
            await expect(balanceTool.runBalanceTest('non-existent', 1000, ['test-character']))
                .rejects.toThrow("Configuration 'non-existent' not found");
        });

        test('テスト結果に適切な統計情報が含まれる', async () => {
            const result = await balanceTool.runBalanceTest('default', 1000, ['test-character']);

            expect(result.levelDistribution).toBeDefined();
            expect(result.experienceEfficiency).toBeDefined();
            expect(result.statGrowthBalance).toBeDefined();
            expect(typeof result.averageLevelUpTime).toBe('number');
        });
    });

    describe('レベル進行分析', () => {
        test('レベル進行曲線を分析できる', () => {
            const analysis = balanceTool.analyzeLevelProgression();

            expect(analysis).toBeDefined();
            expect(Array.isArray(analysis.currentCurve)).toBe(true);
            expect(Array.isArray(analysis.recommendedCurve)).toBe(true);
            expect(Array.isArray(analysis.difficultySpikes)).toBe(true);
            expect(Array.isArray(analysis.plateauPoints)).toBe(true);
            expect(typeof analysis.balanceScore).toBe('number');
            expect(Array.isArray(analysis.suggestions)).toBe(true);
        });

        test('バランススコアが適切な範囲内である', () => {
            const analysis = balanceTool.analyzeLevelProgression();

            expect(analysis.balanceScore).toBeGreaterThanOrEqual(0);
            expect(analysis.balanceScore).toBeLessThanOrEqual(100);
        });

        test('難易度スパイクが検出される', () => {
            // 急激な変化を持つカスタム設定を作成
            balanceTool.createCustomConfiguration('spike-test', 'Spike test', {
                levelRequirements: [0, 100, 200, 1000, 1100, 1200] // レベル4で急激な増加
            });
            balanceTool.applyBalanceConfiguration('spike-test');

            const analysis = balanceTool.analyzeLevelProgression();

            // 難易度スパイクが検出されることを確認
            expect(analysis.difficultySpikes.length).toBeGreaterThan(0);
        });
    });

    describe('成長率最適化', () => {
        test('成長率最適化を実行できる', () => {
            const optimization = balanceTool.optimizeGrowthRates('test-character');

            expect(optimization).toBeDefined();
            expect(optimization.characterId).toBe('test-character');
            expect(optimization.currentRates).toBeDefined();
            expect(optimization.optimizedRates).toBeDefined();
            expect(typeof optimization.expectedImprovement).toBe('number');
            expect(Array.isArray(optimization.balanceImpact)).toBe(true);
        });

        test('最適化された成長率が妥当な範囲内である', () => {
            const optimization = balanceTool.optimizeGrowthRates('test-character');

            Object.values(optimization.optimizedRates).forEach(rate => {
                expect(rate).toBeGreaterThanOrEqual(0);
                expect(rate).toBeLessThanOrEqual(100);
            });
        });

        test('改善予測が計算される', () => {
            const optimization = balanceTool.optimizeGrowthRates('test-character');

            expect(typeof optimization.expectedImprovement).toBe('number');
            expect(optimization.expectedImprovement).toBeGreaterThanOrEqual(-100);
            expect(optimization.expectedImprovement).toBeLessThanOrEqual(100);
        });
    });

    describe('A/Bテスト', () => {
        test('A/Bテストを実行できる', async () => {
            const result = await balanceTool.runABTest(
                'default',
                'fast-growth',
                2000,
                ['test-character']
            );

            expect(result).toBeDefined();
            expect(result.configA).toBeDefined();
            expect(result.configB).toBeDefined();
            expect(result.winner).toBeDefined();
            expect(typeof result.confidence).toBe('number');
            expect(Array.isArray(result.analysis)).toBe(true);
        });

        test('A/Bテストの勝者が適切に決定される', async () => {
            const result = await balanceTool.runABTest('default', 'fast-growth', 1000, ['test-character']);

            expect(['default', 'fast-growth', 'tie']).toContain(result.winner);
        });

        test('A/Bテストの信頼度が適切な範囲内である', async () => {
            const result = await balanceTool.runABTest('default', 'fast-growth', 1000, ['test-character']);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });

        test('A/Bテストの分析結果が生成される', async () => {
            const result = await balanceTool.runABTest('default', 'fast-growth', 1000, ['test-character']);

            expect(result.analysis.length).toBeGreaterThan(0);
            result.analysis.forEach(item => {
                expect(typeof item).toBe('string');
            });
        });
    });

    describe('バランスレポート', () => {
        test('包括的なバランスレポートを生成できる', async () => {
            // テスト結果を作成するためにバランステストを実行
            await balanceTool.runBalanceTest('default', 500, ['test-character']);

            const report = balanceTool.generateBalanceReport();

            expect(report).toBeDefined();
            expect(typeof report.currentConfiguration).toBe('string');
            expect(typeof report.overallBalance).toBe('number');
            expect(report.levelProgression).toBeDefined();
            expect(Array.isArray(report.testResults)).toBe(true);
            expect(Array.isArray(report.recommendations)).toBe(true);
        });

        test('全体的なバランススコアが計算される', async () => {
            await balanceTool.runBalanceTest('default', 500, ['test-character']);

            const report = balanceTool.generateBalanceReport();

            expect(report.overallBalance).toBeGreaterThanOrEqual(0);
            expect(report.overallBalance).toBeLessThanOrEqual(100);
        });

        test('総合的な推奨事項が生成される', async () => {
            await balanceTool.runBalanceTest('default', 500, ['test-character']);

            const report = balanceTool.generateBalanceReport();

            expect(Array.isArray(report.recommendations)).toBe(true);
        });
    });

    describe('データ収集', () => {
        test('経験値獲得イベントが記録される', () => {
            // イベントリスナーを取得
            const experienceAwardedListener = mockExperienceSystem.on.mock.calls
                .find(call => call[0] === 'experience-awarded')?.[1];

            expect(experienceAwardedListener).toBeDefined();

            // イベントデータをシミュレート
            const eventData = {
                characterId: 'test-character',
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                },
                result: {
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
                }
            };

            // イベントを発火（エラーが発生しないことを確認）
            expect(() => experienceAwardedListener(eventData)).not.toThrow();
        });

        test('レベルアップイベントが記録される', () => {
            // イベントリスナーを取得
            const levelUpListener = mockExperienceSystem.on.mock.calls
                .find(call => call[0] === 'level-up-processed')?.[1];

            expect(levelUpListener).toBeDefined();

            // イベントデータをシミュレート
            const eventData = {
                characterId: 'test-character',
                result: {
                    characterId: 'test-character',
                    oldLevel: 5,
                    newLevel: 6,
                    statGrowth: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
                    newExperienceRequired: 200,
                    oldStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3, skill: 12, luck: 8 },
                    newStats: { maxHP: 105, maxMP: 53, attack: 22, defense: 16, speed: 11, movement: 3, skill: 14, luck: 9 },
                    levelsGained: 1,
                    timestamp: Date.now()
                }
            };

            // イベントを発火（エラーが発生しないことを確認）
            expect(() => levelUpListener(eventData)).not.toThrow();
        });
    });

    describe('エラーハンドリング', () => {
        test('シミュレーションエラー時の処理', async () => {
            mockDebugManager.runExperienceSimulation.mockRejectedValue(new Error('Simulation failed'));

            // エラーが発生してもテストが継続されることを確認
            const result = await balanceTool.runBalanceTest('default', 500, ['test-character']);

            expect(result).toBeDefined();
            expect(result.levelUpsCount).toBe(0);
        });

        test('無効な設定データの処理', () => {
            const invalidConfig = JSON.stringify({
                name: '', // 無効な名前
                experienceMultiplier: -1 // 無効な倍率
            });

            const result = balanceTool.importBalanceConfiguration(invalidConfig);
            expect(result).toBe(false);
        });
    });

    describe('リソース管理', () => {
        test('destroyメソッドがリソースを正しく解放する', () => {
            balanceTool.destroy();

            // 内部データがクリアされることを確認（間接的なテスト）
            const report = balanceTool.generateBalanceReport();
            expect(report.testResults).toHaveLength(0);
        });
    });
});