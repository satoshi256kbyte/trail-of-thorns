/**
 * ExperiencePersistenceManager テストスイート
 * 
 * データ永続化とセーブ・ロード連携機能のテスト
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ExperiencePersistenceManager } from '../../../../game/src/systems/experience/ExperiencePersistenceManager';
import { SaveDataManager } from '../../../../game/src/systems/SaveDataManager';
import {
    ExperienceInfo,
    ExperiencePersistenceError,
    NewCharacterExperienceSettings,
    ExperienceRecoveryOptions,
    GrowthRates
} from '../../../../game/src/types/experience';

// モック設定
jest.mock('../../../../game/src/systems/SaveDataManager');

describe('ExperiencePersistenceManager', () => {
    let persistenceManager: ExperiencePersistenceManager;
    let mockSaveDataManager: jest.Mocked<SaveDataManager>;

    beforeEach(() => {
        // SaveDataManagerのモックを作成
        mockSaveDataManager = new SaveDataManager() as jest.Mocked<SaveDataManager>;

        // モックメソッドの設定
        mockSaveDataManager.initialize = jest.fn().mockResolvedValue({ success: true });
        mockSaveDataManager.saveCharacterExperienceData = jest.fn().mockReturnValue({ success: true });
        mockSaveDataManager.loadCharacterExperienceData = jest.fn().mockReturnValue({
            success: true,
            data: new Map()
        });
        mockSaveDataManager.saveChapterProgress = jest.fn().mockReturnValue({ success: true });
        mockSaveDataManager.initializeNewCharacter = jest.fn().mockReturnValue({
            success: true,
            data: {
                characterId: 'test-char',
                currentLevel: 1,
                currentExperience: 0,
                totalExperience: 0,
                lastLevelUpTimestamp: Date.now()
            }
        });
        mockSaveDataManager.recoverCorruptedSaveData = jest.fn().mockReturnValue({
            success: true,
            data: {
                characterExperience: {}
            }
        });

        persistenceManager = new ExperiencePersistenceManager(mockSaveDataManager);
    });

    afterEach(() => {
        persistenceManager.destroy();
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('正常に初期化される', async () => {
            const result = await persistenceManager.initialize();

            expect(result.success).toBe(true);
            expect(mockSaveDataManager.initialize).toHaveBeenCalled();
        });

        test('SaveDataManagerの初期化失敗時にエラーを返す', async () => {
            mockSaveDataManager.initialize.mockResolvedValue({ success: false, message: 'Init failed' });

            const result = await persistenceManager.initialize();

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.SAVE_SYSTEM_UNAVAILABLE);
        });
    });

    describe('キャラクター経験値データの保存', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('経験値データを正常に保存する', async () => {
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 150,
                totalExperience: 150,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            const result = await persistenceManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(true);
            expect(mockSaveDataManager.saveCharacterExperienceData).toHaveBeenCalledWith(experienceMap);
        });

        test('SaveDataManagerの保存失敗時にエラーを返す', async () => {
            mockSaveDataManager.saveCharacterExperienceData.mockReturnValue({
                success: false,
                message: 'Save failed'
            });

            const experienceMap = new Map<string, ExperienceInfo>();
            const result = await persistenceManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.SAVE_FAILED);
        });

        test('初期化前の保存試行でエラーを返す', async () => {
            const uninitializedManager = new ExperiencePersistenceManager(mockSaveDataManager);
            const experienceMap = new Map<string, ExperienceInfo>();

            const result = await uninitializedManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.NOT_INITIALIZED);

            uninitializedManager.destroy();
        });
    });

    describe('章進行時の経験値情報継続管理', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('章進行と経験値データを同時に保存する', async () => {
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 3,
                currentExperience: 75,
                totalExperience: 75,
                experienceToNextLevel: 25,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            const result = await persistenceManager.saveChapterProgressWithExperience(
                'chapter_1',
                5,
                experienceMap,
                false
            );

            expect(result.success).toBe(true);
            expect(mockSaveDataManager.saveCharacterExperienceData).toHaveBeenCalledWith(experienceMap);
            expect(mockSaveDataManager.saveChapterProgress).toHaveBeenCalledWith('chapter_1', 5, false);
        });

        test('章完了時の特別処理を実行する', async () => {
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 10,
                currentExperience: 500,
                totalExperience: 500,
                experienceToNextLevel: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.83
            });

            const result = await persistenceManager.saveChapterProgressWithExperience(
                'chapter_1',
                24,
                experienceMap,
                true // 章完了
            );

            expect(result.success).toBe(true);
            expect(mockSaveDataManager.saveChapterProgress).toHaveBeenCalledWith('chapter_1', 24, true);
        });

        test('経験値保存失敗時にエラーを返す', async () => {
            mockSaveDataManager.saveCharacterExperienceData.mockReturnValue({
                success: false,
                message: 'Experience save failed'
            });

            const experienceMap = new Map<string, ExperienceInfo>();
            const result = await persistenceManager.saveChapterProgressWithExperience(
                'chapter_1',
                5,
                experienceMap
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.SAVE_FAILED);
        });
    });

    describe('経験値情報復元機能', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('経験値データを正常に読み込む', async () => {
            const mockExperienceMap = new Map<string, ExperienceInfo>();
            mockExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 7,
                currentExperience: 200,
                totalExperience: 200,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.8
            });

            mockSaveDataManager.loadCharacterExperienceData.mockReturnValue({
                success: true,
                data: mockExperienceMap
            });

            const result = await persistenceManager.loadCharacterExperienceData();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockExperienceMap);
            expect(mockSaveDataManager.loadCharacterExperienceData).toHaveBeenCalled();
        });

        test('読み込み失敗時にバックアップからの復旧を試行する', async () => {
            mockSaveDataManager.loadCharacterExperienceData.mockReturnValue({
                success: false,
                message: 'Load failed'
            });

            // バックアップデータを事前に作成
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 150,
                totalExperience: 150,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            await persistenceManager.saveCharacterExperienceData(experienceMap);

            const result = await persistenceManager.loadCharacterExperienceData();

            // バックアップからの復旧が試行される
            expect(result.success).toBe(true);
        });

        test('データ検証失敗時に修復を試行する', async () => {
            const invalidExperienceMap = new Map<string, ExperienceInfo>();
            invalidExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: -1, // 無効なレベル
                currentExperience: -50, // 無効な経験値
                totalExperience: 0,
                experienceToNextLevel: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0
            });

            mockSaveDataManager.loadCharacterExperienceData.mockReturnValue({
                success: true,
                data: invalidExperienceMap
            });

            const result = await persistenceManager.loadCharacterExperienceData();

            // 修復されたデータが返される
            expect(result.success).toBe(true);
            if (result.data) {
                const repairedData = result.data.get('char1');
                expect(repairedData?.currentLevel).toBeGreaterThanOrEqual(1);
                expect(repairedData?.currentExperience).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('新規仲間キャラクターの初期化', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('新規キャラクターの経験値を正常に初期化する', async () => {
            const settings: NewCharacterExperienceSettings = {
                characterId: 'new_ally',
                initialLevel: 3,
                initialExperience: 75,
                baseGrowthRates: {
                    hp: 60,
                    mp: 40,
                    attack: 50,
                    defense: 45,
                    speed: 55,
                    skill: 50,
                    luck: 35
                },
                joinChapter: 'chapter_2',
                joinStage: 5,
                isTemporary: false
            };

            const result = await persistenceManager.initializeNewCharacterExperience(settings);

            expect(result.success).toBe(true);
            expect(result.data?.characterId).toBe('new_ally');
            expect(result.data?.currentLevel).toBe(3);
            expect(result.data?.currentExperience).toBe(75);
            expect(mockSaveDataManager.initializeNewCharacter).toHaveBeenCalled();
        });

        test('一時的なキャラクターを初期化する', async () => {
            const settings: NewCharacterExperienceSettings = {
                characterId: 'temp_ally',
                initialLevel: 1,
                initialExperience: 0,
                joinChapter: 'chapter_1',
                joinStage: 10,
                isTemporary: true
            };

            const result = await persistenceManager.initializeNewCharacterExperience(settings);

            expect(result.success).toBe(true);
            expect(result.data?.characterId).toBe('temp_ally');
        });

        test('SaveDataManagerの初期化失敗時にエラーを返す', async () => {
            mockSaveDataManager.initializeNewCharacter.mockReturnValue({
                success: false,
                message: 'Character init failed'
            });

            const settings: NewCharacterExperienceSettings = {
                characterId: 'failed_ally',
                initialLevel: 1,
                initialExperience: 0,
                joinChapter: 'chapter_1',
                joinStage: 1
            };

            const result = await persistenceManager.initializeNewCharacterExperience(settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.INITIALIZATION_FAILED);
        });
    });

    describe('セーブデータ破損時のエラー回復処理', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('バックアップからの復旧を実行する', async () => {
            // バックアップデータを事前に作成
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 8,
                currentExperience: 300,
                totalExperience: 300,
                experienceToNextLevel: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            await persistenceManager.saveCharacterExperienceData(experienceMap);

            const recoveryOptions: ExperienceRecoveryOptions = {
                useBackup: true,
                useSaveDataRecovery: false,
                resetCorruptedData: false,
                useDefaultValues: false,
                preserveProgress: true,
                attemptPartialRecovery: false,
                notifyUser: true
            };

            const result = await persistenceManager.recoverCorruptedExperienceData(recoveryOptions);

            expect(result.success).toBe(true);
            expect(result.data?.size).toBe(1);
            expect(result.data?.get('char1')?.currentLevel).toBe(8);
        });

        test('SaveDataManagerの復旧機能を使用する', async () => {
            const mockRecoveredSaveData = {
                characterExperience: {
                    'char1': {
                        characterId: 'char1',
                        currentLevel: 6,
                        currentExperience: 180,
                        totalExperience: 180,
                        lastLevelUpTimestamp: Date.now()
                    }
                }
            };

            mockSaveDataManager.recoverCorruptedSaveData.mockReturnValue({
                success: true,
                data: mockRecoveredSaveData
            });

            const recoveryOptions: ExperienceRecoveryOptions = {
                useBackup: false,
                useSaveDataRecovery: true,
                resetCorruptedData: true,
                useDefaultValues: false,
                preserveProgress: true,
                attemptPartialRecovery: false,
                notifyUser: true
            };

            const result = await persistenceManager.recoverCorruptedExperienceData(recoveryOptions);

            expect(result.success).toBe(true);
            expect(result.data?.size).toBe(1);
            expect(result.data?.get('char1')?.currentLevel).toBe(6);
            expect(mockSaveDataManager.recoverCorruptedSaveData).toHaveBeenCalled();
        });

        test('デフォルト値での復旧を実行する', async () => {
            const recoveryOptions: ExperienceRecoveryOptions = {
                useBackup: false,
                useSaveDataRecovery: false,
                resetCorruptedData: false,
                useDefaultValues: true,
                preserveProgress: false,
                attemptPartialRecovery: false,
                notifyUser: false
            };

            const result = await persistenceManager.recoverCorruptedExperienceData(recoveryOptions);

            expect(result.success).toBe(true);
            expect(result.data?.size).toBeGreaterThan(0);

            // デフォルトキャラクターが作成される
            const defaultChar = result.data?.get('player_1');
            expect(defaultChar?.currentLevel).toBe(1);
            expect(defaultChar?.currentExperience).toBe(0);
        });

        test('全ての復旧方法が失敗した場合にエラーを返す', async () => {
            mockSaveDataManager.recoverCorruptedSaveData.mockReturnValue({
                success: false,
                message: 'Recovery failed'
            });

            const recoveryOptions: ExperienceRecoveryOptions = {
                useBackup: false,
                useSaveDataRecovery: true,
                resetCorruptedData: false,
                useDefaultValues: false,
                preserveProgress: false,
                attemptPartialRecovery: false,
                notifyUser: false
            };

            const result = await persistenceManager.recoverCorruptedExperienceData(recoveryOptions);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.RECOVERY_FAILED);
        });
    });

    describe('データ検証', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('正常なデータの検証が成功する', async () => {
            const validExperienceMap = new Map<string, ExperienceInfo>();
            validExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 150,
                totalExperience: 150,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            const result = await persistenceManager.validateExperienceData(validExperienceMap);

            expect(result.success).toBe(true);
        });

        test('無効なレベルでの検証が失敗する', async () => {
            const invalidExperienceMap = new Map<string, ExperienceInfo>();
            invalidExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 0, // 無効なレベル
                currentExperience: 100,
                totalExperience: 100,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            });

            const result = await persistenceManager.validateExperienceData(invalidExperienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.VALIDATION_FAILED);
        });

        test('無効な経験値での検証が失敗する', async () => {
            const invalidExperienceMap = new Map<string, ExperienceInfo>();
            invalidExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 3,
                currentExperience: -50, // 無効な経験値
                totalExperience: 100,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.5
            });

            const result = await persistenceManager.validateExperienceData(invalidExperienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.VALIDATION_FAILED);
        });

        test('総経験値と現在経験値の不整合での検証が失敗する', async () => {
            const invalidExperienceMap = new Map<string, ExperienceInfo>();
            invalidExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 200,
                totalExperience: 150, // 現在経験値より少ない総経験値
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.8
            });

            const result = await persistenceManager.validateExperienceData(invalidExperienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(ExperiencePersistenceError.VALIDATION_FAILED);
        });
    });

    describe('イベント処理', () => {
        beforeEach(async () => {
            await persistenceManager.initialize();
        });

        test('経験値データ保存時にイベントが発行される', async () => {
            const eventSpy = jest.fn();
            persistenceManager.on('experience-data-saved', eventSpy);

            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 3,
                currentExperience: 75,
                totalExperience: 75,
                experienceToNextLevel: 25,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            await persistenceManager.saveCharacterExperienceData(experienceMap);

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                characterCount: 1,
                timestamp: expect.any(Number)
            }));
        });

        test('経験値データ読み込み時にイベントが発行される', async () => {
            const eventSpy = jest.fn();
            persistenceManager.on('experience-data-loaded', eventSpy);

            const mockExperienceMap = new Map<string, ExperienceInfo>();
            mockExperienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 150,
                totalExperience: 150,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            mockSaveDataManager.loadCharacterExperienceData.mockReturnValue({
                success: true,
                data: mockExperienceMap
            });

            await persistenceManager.loadCharacterExperienceData();

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                characterCount: 1,
                timestamp: expect.any(Number)
            }));
        });

        test('新規キャラクター初期化時にイベントが発行される', async () => {
            const eventSpy = jest.fn();
            persistenceManager.on('new-character-experience-initialized', eventSpy);

            const settings: NewCharacterExperienceSettings = {
                characterId: 'new_char',
                initialLevel: 2,
                initialExperience: 25,
                joinChapter: 'chapter_1',
                joinStage: 3
            };

            await persistenceManager.initializeNewCharacterExperience(settings);

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                characterId: 'new_char',
                initialLevel: 2,
                initialExperience: 25,
                timestamp: expect.any(Number)
            }));
        });
    });

    describe('デバッグ機能', () => {
        test('デバッグ情報を取得できる', async () => {
            await persistenceManager.initialize();

            const debugInfo = persistenceManager.getDebugInfo();

            expect(debugInfo).toHaveProperty('isInitialized', true);
            expect(debugInfo).toHaveProperty('config');
            expect(debugInfo).toHaveProperty('backupCount');
            expect(debugInfo).toHaveProperty('lastBackupTimestamp');
            expect(debugInfo).toHaveProperty('saveDataManager', 'connected');
        });
    });
});