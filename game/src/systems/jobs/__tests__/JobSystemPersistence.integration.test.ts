/**
 * JobSystem Persistence Integration Test
 * 
 * 職業システムのデータ永続化統合テスト
 */

import { JobSystem } from '../JobSystem';
import { SaveDataManager } from '../../SaveDataManager';

// 簡単なモック
const mockSaveDataManager = {
    initialize: jest.fn().mockResolvedValue({ success: true }),
    getCurrentSaveData: jest.fn().mockReturnValue({
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
    }),
    saveToSlot: jest.fn().mockReturnValue({ success: true }),
    on: jest.fn()
};

describe('JobSystem Persistence Integration', () => {
    let jobSystem: JobSystem;

    beforeEach(async () => {
        jobSystem = new JobSystem({ autoSaveEnabled: false });
        jobSystem.setSaveDataManager(mockSaveDataManager);
        await jobSystem.initialize();
    });

    afterEach(() => {
        jobSystem.destroy();
    });

    test('職業システムが永続化マネージャーと統合される', async () => {
        // 永続化マネージャーが初期化されることを確認
        expect(mockSaveDataManager.initialize).toHaveBeenCalled();
    });

    test('職業データの保存が呼び出される', async () => {
        // 職業データを保存
        await jobSystem.saveJobData();

        // セーブマネージャーが呼び出されることを確認
        expect(mockSaveDataManager.saveToSlot).toHaveBeenCalled();
    });

    test('データ整合性検証が実行される', async () => {
        // データ整合性を検証
        const isValid = await jobSystem.validateDataIntegrity();

        // 検証が実行されることを確認
        expect(typeof isValid).toBe('boolean');
    });
});