/**
 * JobPersistenceManager テストスイート
 * 
 * 職業システムのデータ永続化機能をテストします。
 */

import { JobPersistenceManager, JobPersistenceError } from '../JobPersistenceManager';
import { SaveDataManager } from '../../SaveDataManager';
import { CharacterJobData, RoseEssenceData, RoseEssenceTransaction, JobHistoryEntry } from '../../../types/job';

// SaveDataManagerのモック
class MockSaveDataManager {
    private currentSaveData: any = null;

    async initialize() {
        return { success: true };
    }

    getCurrentSaveData() {
        return this.currentSaveData || {
            jobSystem: {
                characterJobs: {},
                roseEssenceData: {
                    currentAmount: 0,
                    totalEarned: 0,
                    totalSpent: 0,
                    sources: {},
                    costs: {
                        rankUp: {
                            warrior: { 2: 10, 3: 20, 4: 40, 5: 80 }
                        },
                        jobChange: 5,
                        skillUnlock: 3
                    }
                },
                roseEssenceTransactions: []
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

describe('JobPersistenceManager', () => {
    let persistenceManager: JobPersistenceManager;
    let mockSaveDataManager: MockSaveDataManager;

    beforeEach(async () => {
        mockSaveDataManager = new MockSaveDataManager();
        persistenceManager = new JobPersistenceManager(mockSaveDataManager as any);
        await persistenceManager.initialize();
    });

    afterEach(() => {
        persistenceManager.destroy();
    });

    describe('初期化', () => {
        test('正常に初期化される', async () => {
            const newPersistenceManager = new JobPersistenceManager(mockSaveDataManager as any);
            const result = await newPersistenceManager.initialize();

            expect(result.success).toBe(true);
            expect(result.message).toContain('initialized successfully');

            newPersistenceManager.destroy();
        });
    });

    describe('キャラクター職業データの保存・読み込み', () => {
        test('職業データを保存できる', async () => {
            const characterJobData = new Map<string, CharacterJobData>();
            characterJobData.set('character1', {
                characterId: 'character1',
                currentJobId: 'warrior',
                currentRank: 2,
                jobHistory: [],
                jobExperience: new Map(),
                learnedJobSkills: new Map()
            });

            const result = await persistenceManager.saveCharacterJobData(characterJobData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('職業データを読み込める', async () => {
            // まずデータを保存
            const characterJobData = new Map<string, CharacterJobData>();
            characterJobData.set('character1', {
                characterId: 'character1',
                currentJobId: 'warrior',
                currentRank: 2,
                jobHistory: [{
                    jobId: 'warrior',
                    rank: 1,
                    changedAt: new Date(),
                    roseEssenceUsed: 10
                }],
                jobExperience: new Map([['warrior', 100]]),
                learnedJobSkills: new Map([['warrior', ['slash', 'guard']]])
            });

            await persistenceManager.saveCharacterJobData(characterJobData);

            // データを読み込み
            const loadResult = await persistenceManager.loadCharacterJobData();

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.size).toBe(1);

            const loadedData = loadResult.data!.get('character1');
            expect(loadedData).toBeDefined();
            expect(loadedData!.currentJobId).toBe('warrior');
            expect(loadedData!.currentRank).toBe(2);
            expect(loadedData!.jobHistory).toHaveLength(1);
        });
    });

    describe('薔薇の力データの保存・読み込み', () => {
        test('薔薇の力データを保存できる', async () => {
            const roseEssenceData: RoseEssenceData = {
                currentAmount: 50,
                totalEarned: 100,
                totalSpent: 50,
                sources: {},
                costs: {
                    rankUp: {
                        warrior: { 2: 10, 3: 20, 4: 40, 5: 80 }
                    },
                    jobChange: 5,
                    skillUnlock: 3
                }
            };

            const transactions: RoseEssenceTransaction[] = [{
                id: 'transaction1',
                type: 'gain',
                amount: 10,
                source: 'boss_defeat',
                timestamp: new Date(),
                description: 'Boss defeated'
            }];

            const result = await persistenceManager.saveRoseEssenceData(roseEssenceData, transactions);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('薔薇の力データを読み込める', async () => {
            const roseEssenceData: RoseEssenceData = {
                currentAmount: 50,
                totalEarned: 100,
                totalSpent: 50,
                sources: {},
                costs: {
                    rankUp: {
                        warrior: { 2: 10, 3: 20, 4: 40, 5: 80 }
                    },
                    jobChange: 5,
                    skillUnlock: 3
                }
            };

            const transactions: RoseEssenceTransaction[] = [{
                id: 'transaction1',
                type: 'gain',
                amount: 10,
                source: 'boss_defeat',
                timestamp: new Date(),
                description: 'Boss defeated'
            }];

            await persistenceManager.saveRoseEssenceData(roseEssenceData, transactions);

            const loadResult = await persistenceManager.loadRoseEssenceData();

            expect(loadResult.success).toBe(true);
            expect(loadResult.data).toBeDefined();
            expect(loadResult.data!.roseEssenceData.currentAmount).toBe(50);
            expect(loadResult.data!.transactions).toHaveLength(1);
        });
    });

    describe('履歴の保存', () => {
        test('職業変更履歴を保存できる', async () => {
            // 初期データを設定
            const characterJobData = new Map<string, CharacterJobData>();
            characterJobData.set('character1', {
                characterId: 'character1',
                currentJobId: 'warrior',
                currentRank: 1,
                jobHistory: [],
                jobExperience: new Map(),
                learnedJobSkills: new Map()
            });

            await persistenceManager.saveCharacterJobData(characterJobData);

            // 履歴エントリを追加
            const historyEntry: JobHistoryEntry = {
                jobId: 'mage',
                rank: 1,
                changedAt: new Date(),
                roseEssenceUsed: 0
            };

            const result = await persistenceManager.saveJobChangeHistory('character1', historyEntry);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('ランクアップ履歴を保存できる', async () => {
            // 初期データを設定
            const characterJobData = new Map<string, CharacterJobData>();
            characterJobData.set('character1', {
                characterId: 'character1',
                currentJobId: 'warrior',
                currentRank: 1,
                jobHistory: [],
                jobExperience: new Map(),
                learnedJobSkills: new Map()
            });

            await persistenceManager.saveCharacterJobData(characterJobData);

            const result = await persistenceManager.saveRankUpHistory('character1', 1, 2, 10);

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved successfully');
        });
    });

    describe('データ整合性', () => {
        test('データ整合性を検証できる', async () => {
            const result = await persistenceManager.validateDataIntegrity();

            expect(result.success).toBe(true);
            expect(result.message).toContain('validation passed');
        });
    });

    describe('エラーハンドリング', () => {
        test('初期化前の操作でエラーが発生する', async () => {
            const uninitializedManager = new JobPersistenceManager(mockSaveDataManager as any);

            const result = await uninitializedManager.saveCharacterJobData(new Map());

            expect(result.success).toBe(false);
            expect(result.error).toBe(JobPersistenceError.NOT_INITIALIZED);

            uninitializedManager.destroy();
        });
    });
});