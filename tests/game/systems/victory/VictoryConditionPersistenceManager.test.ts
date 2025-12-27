/**
 * VictoryConditionPersistenceManager テスト
 * 
 * データ永続化とセーブ・ロード連携機能のテスト
 * 要件: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { VictoryConditionPersistenceManager, VictoryPersistenceError } from '../../../../game/src/systems/victory/VictoryConditionPersistenceManager';
import { ClearRating } from '../../../../game/src/types/reward';

// SaveDataManagerのモック
class MockSaveDataManager {
    private currentSaveData: any = null;

    async initialize() {
        return { success: true };
    }

    getCurrentSaveData() {
        return this.currentSaveData || {
            victoryConditionSystem: {
                stageClearData: {},
                roseEssenceData: {
                    totalAmount: 0,
                    earnedFromBosses: {},
                    lastUpdatedAt: Date.now()
                },
                rewardHistory: [],
                previousStageStates: []
            },
            lastSavedAt: Date.now()
        };
    }

    saveToSlot(slotId: number, saveData: any) {
        this.currentSaveData = saveData;
        return { success: true };
    }

    on() { }
}

describe('VictoryConditionPersistenceManager', () => {
    let persistenceManager: VictoryConditionPersistenceManager;
    let mockSaveDataManager: MockSaveDataManager;

    beforeEach(async () => {
        mockSaveDataManager = new MockSaveDataManager();
        persistenceManager = new VictoryConditionPersistenceManager(mockSaveDataManager as any, {
            logPersistenceOperations: false
        });
        await persistenceManager.initialize();
    });

    afterEach(() => {
        persistenceManager.destroy();
    });

    describe('初期化', () => {
        test('システムを正常に初期化できる', async () => {
            const newPersistenceManager = new VictoryConditionPersistenceManager(mockSaveDataManager as any);
            const result = await newPersistenceManager.initialize();

            expect(result.success).toBe(true);
            expect(result.message).toContain('initialized successfully');

            newPersistenceManager.destroy();
        });
    });

    describe('ステージクリア状態の保存・読み込み', () => {
        test('ステージクリアデータを保存できる', async () => {
            const stageClearData = {
                stageId: 'stage-1',
                stageName: 'Test Stage',
                clearedAt: Date.now(),
                clearRating: 'S' as ClearRating,
                turnsUsed: 10,
                unitsLost: 0,
                bossesDefeated: 1,
                recruitmentSuccesses: 2
            };

            const result = await persistenceManager.saveStageClearData(stageClearData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('ステージクリアデータを読み込める', async () => {
            // まずデータを保存
            const stageClearData = {
                stageId: 'stage-1',
                stageName: 'Test Stage',
                clearedAt: Date.now(),
                clearRating: 'A' as ClearRating,
                turnsUsed: 15,
                unitsLost: 1,
                bossesDefeated: 1,
                recruitmentSuccesses: 1
            };

            await persistenceManager.saveStageClearData(stageClearData);

            // データを読み込み
            const loadResult = await persistenceManager.loadStageClearData('stage-1');

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.stageId).toBe('stage-1');
            expect(loadResult.data!.clearRating).toBe('A');
            expect(loadResult.data!.turnsUsed).toBe(15);
        });

        test('存在しないステージのクリアデータを読み込むとnullを返す', async () => {
            const loadResult = await persistenceManager.loadStageClearData('nonexistent-stage');

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeNull();
        });
    });

    describe('薔薇の力データの保存・読み込み', () => {
        test('薔薇の力データを保存できる', async () => {
            const roseEssenceData = {
                totalAmount: 50,
                earnedFromBosses: {
                    'boss-1': 30,
                    'boss-2': 20
                },
                lastUpdatedAt: Date.now()
            };

            const result = await persistenceManager.saveRoseEssenceData(roseEssenceData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('薔薇の力データを読み込める', async () => {
            const roseEssenceData = {
                totalAmount: 50,
                earnedFromBosses: {
                    'boss-1': 30,
                    'boss-2': 20
                },
                lastUpdatedAt: Date.now()
            };

            await persistenceManager.saveRoseEssenceData(roseEssenceData);

            const loadResult = await persistenceManager.loadRoseEssenceData();

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.totalAmount).toBe(50);
            expect(loadResult.data!.earnedFromBosses['boss-1']).toBe(30);
        });
    });

    describe('報酬情報の保存・読み込み', () => {
        test('報酬データを保存できる', async () => {
            const rewardData = {
                stageId: 'stage-1',
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                distributedAt: Date.now()
            };

            const result = await persistenceManager.saveRewardData(rewardData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('報酬履歴を読み込める', async () => {
            const rewardData1 = {
                stageId: 'stage-1',
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                distributedAt: Date.now()
            };

            const rewardData2 = {
                stageId: 'stage-2',
                rewards: {
                    experience: 150,
                    gold: 600,
                    items: [],
                    roseEssence: 15
                },
                distributedAt: Date.now()
            };

            await persistenceManager.saveRewardData(rewardData1);
            await persistenceManager.saveRewardData(rewardData2);

            const loadResult = await persistenceManager.loadRewardHistory();

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.length).toBe(2);
        });

        test('特定ステージの報酬履歴をフィルタリングできる', async () => {
            const rewardData1 = {
                stageId: 'stage-1',
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                distributedAt: Date.now()
            };

            const rewardData2 = {
                stageId: 'stage-2',
                rewards: {
                    experience: 150,
                    gold: 600,
                    items: [],
                    roseEssence: 15
                },
                distributedAt: Date.now()
            };

            await persistenceManager.saveRewardData(rewardData1);
            await persistenceManager.saveRewardData(rewardData2);

            const loadResult = await persistenceManager.loadRewardHistory('stage-1');

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.length).toBe(1);
            expect(loadResult.data![0].stageId).toBe('stage-1');
        });
    });

    describe('前ステージ状態の保存・読み込み', () => {
        test('前ステージ状態を保存できる', async () => {
            const stageState = {
                stageId: 'stage-1',
                performance: {
                    turnsUsed: 10,
                    unitsLost: 0,
                    bossesDefeated: 1,
                    recruitmentSuccesses: 2,
                    clearRating: 'S' as ClearRating
                },
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                completedAt: Date.now()
            };

            const result = await persistenceManager.savePreviousStageState(stageState);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('前ステージ状態を読み込める', async () => {
            const stageState = {
                stageId: 'stage-1',
                performance: {
                    turnsUsed: 10,
                    unitsLost: 0,
                    bossesDefeated: 1,
                    recruitmentSuccesses: 2,
                    clearRating: 'S' as ClearRating
                },
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                completedAt: Date.now()
            };

            await persistenceManager.savePreviousStageState(stageState);

            const loadResult = await persistenceManager.loadPreviousStageState();

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.stageId).toBe('stage-1');
        });

        test('特定ステージの前ステージ状態を読み込める', async () => {
            const stageState1 = {
                stageId: 'stage-1',
                performance: {
                    turnsUsed: 10,
                    unitsLost: 0,
                    bossesDefeated: 1,
                    recruitmentSuccesses: 2,
                    clearRating: 'S' as ClearRating
                },
                rewards: {
                    experience: 100,
                    gold: 500,
                    items: [],
                    roseEssence: 10
                },
                completedAt: Date.now()
            };

            const stageState2 = {
                stageId: 'stage-2',
                performance: {
                    turnsUsed: 15,
                    unitsLost: 1,
                    bossesDefeated: 1,
                    recruitmentSuccesses: 1,
                    clearRating: 'A' as ClearRating
                },
                rewards: {
                    experience: 150,
                    gold: 600,
                    items: [],
                    roseEssence: 15
                },
                completedAt: Date.now()
            };

            await persistenceManager.savePreviousStageState(stageState1);
            await persistenceManager.savePreviousStageState(stageState2);

            const loadResult = await persistenceManager.loadPreviousStageState('stage-1');

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.stageId).toBe('stage-1');
        });
    });

    describe('データ整合性チェック', () => {
        test('データ整合性を検証できる', async () => {
            const result = await persistenceManager.validateDataIntegrity();

            expect(result.success).toBe(true);
            expect(result.message).toContain('validation passed');
        });

        test('無効なステージクリアデータを検出できる', async () => {
            // 無効なデータを保存
            const invalidStageClearData = {
                stageId: 'stage-1',
                stageName: 'Test Stage',
                clearedAt: Date.now(),
                clearRating: 'X' as any, // 無効な評価
                turnsUsed: -1, // 無効な値
                unitsLost: -1, // 無効な値
                bossesDefeated: -1, // 無効な値
                recruitmentSuccesses: 0
            };

            await persistenceManager.saveStageClearData(invalidStageClearData);

            const result = await persistenceManager.validateDataIntegrity();

            expect(result.success).toBe(false);
            expect(result.error).toBe(VictoryPersistenceError.VALIDATION_FAILED);
        });

        test('無効な薔薇の力データを検出できる', async () => {
            // 無効なデータを保存
            const invalidRoseEssenceData = {
                totalAmount: -10, // 無効な値
                earnedFromBosses: {
                    'boss-1': -5 // 無効な値
                },
                lastUpdatedAt: Date.now()
            };

            await persistenceManager.saveRoseEssenceData(invalidRoseEssenceData);

            const result = await persistenceManager.validateDataIntegrity();

            expect(result.success).toBe(false);
            expect(result.error).toBe(VictoryPersistenceError.VALIDATION_FAILED);
        });
    });

    describe('エラーハンドリング', () => {
        test('初期化前の操作でエラーが発生する', async () => {
            const uninitializedManager = new VictoryConditionPersistenceManager(mockSaveDataManager as any);

            const stageClearData = {
                stageId: 'stage-1',
                stageName: 'Test Stage',
                clearedAt: Date.now(),
                clearRating: 'S' as ClearRating,
                turnsUsed: 10,
                unitsLost: 0,
                bossesDefeated: 1,
                recruitmentSuccesses: 2
            };

            const result = await uninitializedManager.saveStageClearData(stageClearData);

            expect(result.success).toBe(false);
            expect(result.error).toBe(VictoryPersistenceError.NOT_INITIALIZED);

            uninitializedManager.destroy();
        });
    });
});
