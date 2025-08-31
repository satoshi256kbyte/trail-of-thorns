/**
 * 薔薇の力システム統合テスト
 * 
 * RoseEssenceManagerと他のシステムとの統合をテストします。
 */

import { RoseEssenceManager, BossType } from '../../game/src/systems/jobs/RoseEssenceManager';
import { RoseEssenceDebugManager } from '../../game/src/debug/RoseEssenceDebugManager';
import { RoseEssenceConsoleCommands } from '../../game/src/debug/RoseEssenceConsoleCommands';
import {
    RoseEssenceSource,
    RoseEssenceSourceType,
    RoseEssenceData
} from '../../game/src/types/job';

describe('RoseEssenceSystem Integration', () => {
    let roseEssenceManager: RoseEssenceManager;
    let debugManager: RoseEssenceDebugManager;
    let consoleCommands: RoseEssenceConsoleCommands;

    beforeEach(() => {
        roseEssenceManager = new RoseEssenceManager();
        debugManager = new RoseEssenceDebugManager(roseEssenceManager);
        consoleCommands = new RoseEssenceConsoleCommands(roseEssenceManager);
    });

    describe('デバッグマネージャー統合', () => {
        test('デバッグモードの有効化', () => {
            // デバッグモードを有効化（開発環境でのみ動作）
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.enableDebugMode();

            expect(consoleSpy).toHaveBeenCalledWith('薔薇の力デバッグモードが有効になりました');

            process.env.NODE_ENV = originalEnv;
            consoleSpy.mockRestore();
        });

        test('テストシナリオの実行', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            debugManager.enableDebugMode();

            // 基本フローテストシナリオを実行
            debugManager.runTestScenario('basic_flow');

            // 薔薇の力が獲得されていることを確認
            expect(roseEssenceManager.getCurrentRoseEssence()).toBeGreaterThan(0);

            // 履歴が記録されていることを確認
            const history = roseEssenceManager.getEssenceHistory();
            expect(history.length).toBeGreaterThan(0);

            process.env.NODE_ENV = originalEnv;
        });

        test('パフォーマンステストの実行', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            debugManager.enableDebugMode();

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.runPerformanceTest();

            // パフォーマンステストが実行されたことを確認
            expect(consoleSpy).toHaveBeenCalledWith('=== パフォーマンステスト開始 ===');
            expect(roseEssenceManager.getEssenceStatistics().transactionCount).toBe(1500); // 1000 gain + 500 spend

            process.env.NODE_ENV = originalEnv;
            consoleSpy.mockRestore();
        });
    });

    describe('コンソールコマンド統合', () => {
        test('コンソールコマンドの機能テスト', () => {
            // コンソールコマンドクラスが正常に動作することを確認
            expect(consoleCommands).toBeDefined();

            // registerCommandsメソッドが存在することを確認
            expect(typeof consoleCommands.registerCommands).toBe('function');

            // Node.js環境ではwindowが存在しないため、実際の登録はスキップされるが
            // エラーが発生しないことを確認
            expect(() => {
                consoleCommands.registerCommands();
            }).not.toThrow();
        });
    });

    describe('データの永続化統合', () => {
        test('データのエクスポートとインポート', () => {
            // 初期データを設定
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'test_boss',
                bossId: 'integration_test_boss'
            };

            roseEssenceManager.addRoseEssence(50, source);
            roseEssenceManager.consumeRoseEssence(20, 'rank_up', 'test_character');

            // データをエクスポート
            const exportedData = roseEssenceManager.exportData();

            // 新しいマネージャーを作成してインポート
            const newManager = new RoseEssenceManager();
            newManager.importData(exportedData);

            // データが正しくインポートされたことを確認
            expect(newManager.getCurrentRoseEssence()).toBe(30);
            expect(newManager.getEssenceStatistics().totalEarned).toBe(50);
            expect(newManager.getEssenceStatistics().totalSpent).toBe(20);
        });

        test('カスタム設定のインポート', () => {
            const customData: RoseEssenceData = {
                currentAmount: 100,
                totalEarned: 200,
                totalSpent: 100,
                sources: {
                    [BossType.MINOR_BOSS]: {
                        baseAmount: 15,
                        difficultyMultiplier: 1.5,
                        firstTimeBonus: 5
                    }
                },
                costs: {
                    rankUp: {
                        warrior: { 2: 15, 3: 30 }
                    },
                    jobChange: 8,
                    skillUnlock: 5
                }
            };

            roseEssenceManager.importData(customData);

            // カスタム設定が適用されたことを確認
            const predicted = roseEssenceManager.predictEssenceGain(BossType.MINOR_BOSS, true);
            expect(predicted).toBe(27); // (15 * 1.5) + 5 = 27

            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(100);
        });
    });

    describe('エラーハンドリング統合', () => {
        test('不正なデータでのエラー処理', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'error_test'
            };

            // 負の値での獲得試行
            expect(() => {
                roseEssenceManager.addRoseEssence(-10, source);
            }).toThrow('獲得量は正の値である必要があります');

            // 負の値での消費試行
            expect(() => {
                roseEssenceManager.consumeRoseEssence(-5, 'test');
            }).toThrow('消費量は正の値である必要があります');
        });

        test('薔薇の力不足時のエラー処理', () => {
            // 薔薇の力を少量獲得
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.STAGE_CLEAR,
                sourceId: 'small_stage'
            };
            roseEssenceManager.addRoseEssence(5, source);

            // 大量消費を試行
            const success = roseEssenceManager.consumeRoseEssence(100, 'expensive_rank_up');

            expect(success).toBe(false);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(5); // 変化なし
        });
    });

    describe('複数システム連携シミュレーション', () => {
        test('戦闘システム連携シミュレーション', () => {
            // 戦闘開始前の状態
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(0);

            // ボス戦勝利をシミュレーション
            const bossSource: RoseEssenceSource = {
                type: BossType.MAJOR_BOSS,
                sourceId: 'chapter_1_boss',
                bossId: 'demon_lord_001'
            };

            const predicted = roseEssenceManager.predictEssenceGain(BossType.MAJOR_BOSS, true);
            const gained = roseEssenceManager.addRoseEssence(predicted, bossSource, true);

            // 薔薇の力が獲得されたことを確認
            expect(gained).toBeGreaterThan(0);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(gained);

            // 履歴に記録されたことを確認
            const history = roseEssenceManager.getEssenceHistory(1);
            expect(history[0].type).toBe('gain');
            expect(history[0].description).toContain('major_boss');
        });

        test('職業システム連携シミュレーション', () => {
            // 薔薇の力を事前に獲得
            const source: RoseEssenceSource = {
                type: BossType.CHAPTER_BOSS,
                sourceId: 'chapter_boss',
                bossId: 'chapter_final_boss'
            };
            const gained = roseEssenceManager.addRoseEssence(50, source);

            // ランクアップ実行をシミュレーション
            const rankUpCost = 20;
            const success = roseEssenceManager.consumeRoseEssence(
                rankUpCost,
                'rank_up',
                'hero_character_001'
            );

            expect(success).toBe(true);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(gained - rankUpCost);

            // 履歴に記録されたことを確認
            const history = roseEssenceManager.getEssenceHistory();
            const spendTransaction = history.find(t => t.type === 'spend');
            expect(spendTransaction).toBeDefined();
            expect(spendTransaction!.characterId).toBe('hero_character_001');
            expect(spendTransaction!.description).toContain('ランクアップ');
        });

        test('複数キャラクターのランクアップシミュレーション', () => {
            // 大量の薔薇の力を獲得
            const source: RoseEssenceSource = {
                type: BossType.FINAL_BOSS,
                sourceId: 'final_boss',
                bossId: 'ultimate_demon_lord'
            };
            const finalBossGain = roseEssenceManager.predictEssenceGain(BossType.FINAL_BOSS, true);
            roseEssenceManager.addRoseEssence(finalBossGain, source, true);

            const initialAmount = roseEssenceManager.getCurrentRoseEssence();

            // 複数キャラクターのランクアップ
            const characters = ['warrior_001', 'mage_001', 'archer_001'];
            const rankUpCosts = [20, 25, 15];
            let totalSpent = 0;

            characters.forEach((characterId, index) => {
                const cost = rankUpCosts[index];
                const success = roseEssenceManager.consumeRoseEssence(
                    cost,
                    'rank_up',
                    characterId
                );
                expect(success).toBe(true);
                totalSpent += cost;
            });

            // 最終的な薔薇の力が正しいことを確認
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(initialAmount - totalSpent);

            // 各キャラクターの履歴が記録されたことを確認
            const history = roseEssenceManager.getEssenceHistory();
            const spendTransactions = history.filter(t => t.type === 'spend');
            expect(spendTransactions).toHaveLength(3);

            characters.forEach(characterId => {
                const transaction = spendTransactions.find(t => t.characterId === characterId);
                expect(transaction).toBeDefined();
            });
        });
    });

    describe('統計情報の統合', () => {
        test('複雑なシナリオでの統計情報', () => {
            // 複数の獲得源から薔薇の力を獲得（実際の獲得量を計算）
            const sources = [
                { type: BossType.MINOR_BOSS, baseAmount: 5 },
                { type: BossType.MAJOR_BOSS, baseAmount: 10 },
                { type: RoseEssenceSourceType.STAGE_CLEAR, baseAmount: 1 },
                { type: RoseEssenceSourceType.SPECIAL_EVENT, baseAmount: 3 }
            ];

            let totalEarned = 0;
            sources.forEach((sourceInfo, index) => {
                const source: RoseEssenceSource = {
                    type: sourceInfo.type,
                    sourceId: `source_${index}`,
                    bossId: sourceInfo.type.includes('boss') ? `boss_${index}` : undefined,
                    stageId: sourceInfo.type === RoseEssenceSourceType.STAGE_CLEAR ? `stage_${index}` : undefined,
                    eventId: sourceInfo.type === RoseEssenceSourceType.SPECIAL_EVENT ? `event_${index}` : undefined
                };

                // 実際の獲得量を計算（難易度修正を考慮）
                let actualAmount = sourceInfo.baseAmount;
                if (sourceInfo.type === BossType.MAJOR_BOSS) {
                    actualAmount = Math.floor(sourceInfo.baseAmount * 1.2); // 難易度修正
                }

                const gained = roseEssenceManager.addRoseEssence(actualAmount, source);
                totalEarned += gained;
            });

            // 複数の用途で消費
            const consumptions = [
                { amount: 10, purpose: 'rank_up', characterId: 'char_001' },
                { amount: 5, purpose: 'job_change', characterId: 'char_002' },
                { amount: 3, purpose: 'skill_unlock', characterId: 'char_003' }
            ];

            consumptions.forEach(consumption => {
                roseEssenceManager.consumeRoseEssence(
                    consumption.amount,
                    consumption.purpose,
                    consumption.characterId
                );
            });

            // 統計情報を確認
            const stats = roseEssenceManager.getEssenceStatistics();
            const totalSpent = consumptions.reduce((sum, c) => sum + c.amount, 0);

            expect(stats.totalEarned).toBe(totalEarned);
            expect(stats.totalSpent).toBe(totalSpent);
            expect(stats.current).toBe(totalEarned - totalSpent);
            expect(stats.transactionCount).toBe(sources.length + consumptions.length);

            // 特定の獲得源からの総獲得量を確認
            const bossTotal = roseEssenceManager.getTotalEssenceFromSource(BossType.MINOR_BOSS) +
                roseEssenceManager.getTotalEssenceFromSource(BossType.MAJOR_BOSS);
            expect(bossTotal).toBeGreaterThan(0); // 実際の獲得量をチェック

            // 特定の用途での総消費量を確認
            const rankUpTotal = roseEssenceManager.getTotalEssenceSpentOn('rank_up');
            expect(rankUpTotal).toBe(10);
        });
    });
});