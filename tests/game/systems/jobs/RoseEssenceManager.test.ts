/**
 * RoseEssenceManager のユニットテスト
 * 
 * 薔薇の力管理システムの全機能をテストします。
 * 要件4.1-4.5の実装を検証します。
 */

import { RoseEssenceManager, BossType } from '../../../../game/src/systems/jobs/RoseEssenceManager';
import {
    RoseEssenceSource,
    RoseEssenceSourceType,
    RoseEssenceData
} from '../../../../game/src/types/job';

describe('RoseEssenceManager', () => {
    let manager: RoseEssenceManager;

    beforeEach(() => {
        manager = new RoseEssenceManager();
    });

    describe('初期化', () => {
        test('デフォルト値で初期化される', () => {
            expect(manager.getCurrentRoseEssence()).toBe(0);
            expect(manager.getEssenceHistory()).toHaveLength(0);
        });

        test('初期データで初期化される', () => {
            const initialData: Partial<RoseEssenceData> = {
                currentAmount: 50,
                totalEarned: 100,
                totalSpent: 50
            };

            const managerWithData = new RoseEssenceManager(initialData);
            expect(managerWithData.getCurrentRoseEssence()).toBe(50);
        });
    });

    describe('薔薇の力獲得 (要件4.1, 4.2)', () => {
        test('基本的な薔薇の力獲得', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001',
                bossId: 'minor_boss_001'
            };

            const gained = manager.addRoseEssence(10, source);

            expect(gained).toBe(10);
            expect(manager.getCurrentRoseEssence()).toBe(10);
        });

        test('ボス撃破時の薔薇の力獲得（難易度修正あり）', () => {
            const source: RoseEssenceSource = {
                type: BossType.MAJOR_BOSS,
                sourceId: 'major_boss_001',
                bossId: 'major_boss_001'
            };

            // MAJOR_BOSSの難易度修正は1.2倍
            const gained = manager.addRoseEssence(10, source);
            expect(gained).toBe(12); // 10 * 1.2 = 12
        });

        test('初回撃破ボーナス', () => {
            const source: RoseEssenceSource = {
                type: BossType.MINOR_BOSS,
                sourceId: 'minor_boss_001',
                bossId: 'minor_boss_001'
            };

            // 初回撃破ボーナス込み
            const gained = manager.addRoseEssence(5, source, true);
            expect(gained).toBe(7); // 5 * 1.0 + 2(初回ボーナス) = 7
        });

        test('負の値での獲得はエラー', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            expect(() => {
                manager.addRoseEssence(-5, source);
            }).toThrow('獲得量は正の値である必要があります');
        });

        test('獲得履歴が記録される', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001',
                bossId: 'test_boss'
            };

            manager.addRoseEssence(10, source);

            const history = manager.getEssenceHistory();
            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('gain');
            expect(history[0].amount).toBe(10);
            expect(history[0].source).toEqual(source);
        });
    });

    describe('薔薇の力消費 (要件4.4)', () => {
        beforeEach(() => {
            // テスト用に薔薇の力を事前に獲得
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'setup_boss'
            };
            manager.addRoseEssence(50, source);
        });

        test('基本的な薔薇の力消費', () => {
            const success = manager.consumeRoseEssence(20, 'rank_up', 'character_001');

            expect(success).toBe(true);
            expect(manager.getCurrentRoseEssence()).toBe(30);
        });

        test('消費履歴が記録される', () => {
            manager.consumeRoseEssence(15, 'job_change', 'character_002');

            const history = manager.getEssenceHistory();
            const spendTransaction = history.find(t => t.type === 'spend');

            expect(spendTransaction).toBeDefined();
            expect(spendTransaction!.amount).toBe(15);
            expect(spendTransaction!.source).toBe('job_change');
            expect(spendTransaction!.characterId).toBe('character_002');
        });

        test('負の値での消費はエラー', () => {
            expect(() => {
                manager.consumeRoseEssence(-10, 'test');
            }).toThrow('消費量は正の値である必要があります');
        });
    });

    describe('薔薇の力不足チェック (要件4.5)', () => {
        beforeEach(() => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'setup_boss'
            };
            manager.addRoseEssence(30, source);
        });

        test('十分な薔薇の力がある場合', () => {
            expect(manager.hasEnoughEssence(25)).toBe(true);
            expect(manager.hasEnoughEssence(30)).toBe(true);
        });

        test('薔薇の力が不足している場合', () => {
            expect(manager.hasEnoughEssence(35)).toBe(false);
            expect(manager.hasEnoughEssence(100)).toBe(false);
        });

        test('薔薇の力不足時は消費が失敗する', () => {
            const success = manager.consumeRoseEssence(40, 'rank_up');

            expect(success).toBe(false);
            expect(manager.getCurrentRoseEssence()).toBe(30); // 変化なし
        });
    });

    describe('薔薇の力残量管理 (要件4.3)', () => {
        test('残量が正確に表示される', () => {
            expect(manager.getCurrentRoseEssence()).toBe(0);

            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            manager.addRoseEssence(25, source);
            expect(manager.getCurrentRoseEssence()).toBe(25);

            manager.consumeRoseEssence(10, 'rank_up');
            expect(manager.getCurrentRoseEssence()).toBe(15);
        });

        test('複数回の獲得・消費後の残量', () => {
            const source1: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };
            const source2: RoseEssenceSource = {
                type: RoseEssenceSourceType.STAGE_CLEAR,
                sourceId: 'stage_001'
            };

            manager.addRoseEssence(20, source1);
            manager.addRoseEssence(15, source2);
            manager.consumeRoseEssence(12, 'rank_up');
            manager.consumeRoseEssence(8, 'job_change');

            expect(manager.getCurrentRoseEssence()).toBe(15); // 20 + 15 - 12 - 8 = 15
        });
    });

    describe('薔薇の力獲得予測 (要件4.5)', () => {
        test('マイナーボスの獲得予測', () => {
            const predicted = manager.predictEssenceGain(BossType.MINOR_BOSS);
            expect(predicted).toBe(5); // baseAmount: 5, difficultyMultiplier: 1.0
        });

        test('メジャーボスの獲得予測（初回ボーナス込み）', () => {
            const predicted = manager.predictEssenceGain(BossType.MAJOR_BOSS, true);
            expect(predicted).toBe(17); // (10 * 1.2) + 5 = 17
        });

        test('チャプターボスの獲得予測（難易度修正あり）', () => {
            const predicted = manager.predictEssenceGain(BossType.CHAPTER_BOSS, false, 1.5);
            expect(predicted).toBe(45); // 20 * 1.5 * 1.5 = 45
        });

        test('ファイナルボスの獲得予測（初回ボーナス・難易度修正込み）', () => {
            const predicted = manager.predictEssenceGain(BossType.FINAL_BOSS, true, 1.2);
            expect(predicted).toBe(145); // (50 * 2.0 * 1.2) + 25 = 145
        });
    });

    describe('取引履歴管理 (要件4.3)', () => {
        test('履歴が時系列順で記録される', () => {
            const source1: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };
            const source2: RoseEssenceSource = {
                type: RoseEssenceSourceType.STAGE_CLEAR,
                sourceId: 'stage_001'
            };

            manager.addRoseEssence(10, source1);
            manager.addRoseEssence(5, source2);
            manager.consumeRoseEssence(3, 'rank_up');

            const history = manager.getEssenceHistory();
            expect(history).toHaveLength(3);

            // 新しい順（最新が最初）
            expect(history[0].type).toBe('spend');
            expect(history[1].type).toBe('gain');
            expect(history[2].type).toBe('gain');
        });

        test('履歴の制限取得', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            // 5回の取引を実行
            for (let i = 0; i < 5; i++) {
                manager.addRoseEssence(10, source);
            }

            const limitedHistory = manager.getEssenceHistory(3);
            expect(limitedHistory).toHaveLength(3);
        });

        test('履歴の詳細情報', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001',
                bossId: 'test_boss'
            };

            manager.addRoseEssence(15, source);

            const history = manager.getEssenceHistory();
            const transaction = history[0];

            expect(transaction.id).toBeDefined();
            expect(transaction.timestamp).toBeInstanceOf(Date);
            expect(transaction.description).toContain('test_boss');
            expect(transaction.description).toContain('15');
        });
    });

    describe('統計情報', () => {
        beforeEach(() => {
            const source1: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };
            const source2: RoseEssenceSource = {
                type: RoseEssenceSourceType.STAGE_CLEAR,
                sourceId: 'stage_001'
            };

            manager.addRoseEssence(20, source1);
            manager.addRoseEssence(10, source2);
            manager.consumeRoseEssence(15, 'rank_up');
            manager.consumeRoseEssence(5, 'job_change');
        });

        test('基本統計情報', () => {
            const stats = manager.getEssenceStatistics();

            expect(stats.current).toBe(10); // 20 + 10 - 15 - 5 = 10
            expect(stats.totalEarned).toBe(30);
            expect(stats.totalSpent).toBe(20);
            expect(stats.transactionCount).toBe(4);
        });

        test('平均値の計算', () => {
            const stats = manager.getEssenceStatistics();

            expect(stats.averageGain).toBe(15); // (20 + 10) / 2 = 15
            expect(stats.averageSpend).toBe(10); // (15 + 5) / 2 = 10
        });

        test('特定の獲得源からの総獲得量', () => {
            const bossTotal = manager.getTotalEssenceFromSource(RoseEssenceSourceType.BOSS_DEFEAT);
            const stageTotal = manager.getTotalEssenceFromSource(RoseEssenceSourceType.STAGE_CLEAR);

            expect(bossTotal).toBe(20);
            expect(stageTotal).toBe(10);
        });

        test('特定の用途での総消費量', () => {
            const rankUpTotal = manager.getTotalEssenceSpentOn('rank_up');
            const jobChangeTotal = manager.getTotalEssenceSpentOn('job_change');

            expect(rankUpTotal).toBe(15);
            expect(jobChangeTotal).toBe(5);
        });
    });

    describe('データのエクスポート・インポート', () => {
        test('データのエクスポート', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            manager.addRoseEssence(25, source);
            manager.consumeRoseEssence(10, 'rank_up');

            const exportedData = manager.exportData();

            expect(exportedData.currentAmount).toBe(15);
            expect(exportedData.totalEarned).toBe(25);
            expect(exportedData.totalSpent).toBe(10);
            expect(exportedData.sources).toBeDefined();
            expect(exportedData.costs).toBeDefined();
        });

        test('データのインポート', () => {
            const importData: RoseEssenceData = {
                currentAmount: 100,
                totalEarned: 150,
                totalSpent: 50,
                sources: {
                    [BossType.MINOR_BOSS]: {
                        baseAmount: 8,
                        difficultyMultiplier: 1.1,
                        firstTimeBonus: 3
                    }
                },
                costs: {
                    rankUp: {
                        warrior: { 2: 12, 3: 24 }
                    },
                    jobChange: 6,
                    skillUnlock: 4
                }
            };

            manager.importData(importData);

            expect(manager.getCurrentRoseEssence()).toBe(100);

            // カスタム設定での予測テスト
            const predicted = manager.predictEssenceGain(BossType.MINOR_BOSS);
            expect(predicted).toBe(8); // カスタム baseAmount: 8
        });
    });

    describe('デバッグ機能', () => {
        test('履歴のクリア', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            manager.addRoseEssence(10, source);
            expect(manager.getEssenceHistory()).toHaveLength(1);

            manager.clearHistory();
            expect(manager.getEssenceHistory()).toHaveLength(0);
            expect(manager.getCurrentRoseEssence()).toBe(10); // 残量は維持
        });

        test('完全リセット', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            manager.addRoseEssence(20, source);
            manager.consumeRoseEssence(5, 'rank_up');

            manager.reset();

            expect(manager.getCurrentRoseEssence()).toBe(0);
            expect(manager.getEssenceHistory()).toHaveLength(0);

            const stats = manager.getEssenceStatistics();
            expect(stats.totalEarned).toBe(0);
            expect(stats.totalSpent).toBe(0);
        });
    });

    describe('エラーハンドリング', () => {
        test('不正な獲得量でのエラー', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: 'boss_001'
            };

            expect(() => manager.addRoseEssence(0, source)).toThrow();
            expect(() => manager.addRoseEssence(-5, source)).toThrow();
        });

        test('不正な消費量でのエラー', () => {
            expect(() => manager.consumeRoseEssence(0, 'test')).toThrow();
            expect(() => manager.consumeRoseEssence(-10, 'test')).toThrow();
        });

        test('未知のボスタイプでの予測', () => {
            // コンソール警告をモック
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const predicted = manager.predictEssenceGain('unknown_boss' as BossType);

            expect(predicted).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('未知のボスタイプです: unknown_boss');

            consoleSpy.mockRestore();
        });
    });
});